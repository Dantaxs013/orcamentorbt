import { NextRequest, NextResponse } from 'next/server';

interface RateLimitEntry {
  timestamps: number[];
  lastUpdated: number;
}

export interface RateLimitResult {
  allowed: boolean;
  success: boolean; // Alias para allowed
  limit: number;
  remaining: number;
  retryAfterSeconds: number;
  resetMs: number;
}

// Armazenamento em memória (sliding-window log)
const store = new Map<string, RateLimitEntry>();

// Intervalo de limpeza automática a cada 60 segundos
const CLEANUP_INTERVAL_MS = 60 * 1000;
let cleanupInterval: NodeJS.Timeout | null = null;

function ensureCleanupScheduled() {
  if (cleanupInterval) return;
  if (typeof setInterval !== 'undefined') {
    cleanupInterval = setInterval(() => {
      const now = Date.now();
      for (const [key, entry] of store.entries()) {
        // Se a entrada não for atualizada há mais de 10 minutos, remove
        if (now - entry.lastUpdated > 10 * 60 * 1000) {
          store.delete(key);
        }
      }
    }, CLEANUP_INTERVAL_MS);

    if (typeof cleanupInterval.unref === 'function') {
      cleanupInterval.unref();
    }
  }
}

/**
 * Utilitário de Rate Limiting com Janela Deslizante (Sliding-Window Counter/Log).
 *
 * @param key Identificador único (ex: `login:192.168.0.1`)
 * @param limit Quantidade máxima de requisições na janela de tempo
 * @param windowMs Duração da janela em milissegundos (ex: 60000 para 60s)
 */
export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number = 60000
): RateLimitResult {
  ensureCleanupScheduled();

  const now = Date.now();
  const windowStart = now - windowMs;

  let entry = store.get(key);
  if (!entry) {
    entry = { timestamps: [], lastUpdated: now };
    store.set(key, entry);
  }

  // Remove timestamps fora da janela deslizante atual
  entry.timestamps = entry.timestamps.filter((ts) => ts > windowStart);
  entry.lastUpdated = now;

  const currentCount = entry.timestamps.length;

  if (currentCount >= limit) {
    // Janela esgotada. Calcular tempo até o timestamp mais antigo expirar
    const oldestTimestamp = entry.timestamps[0] || windowStart;
    const expiryTime = oldestTimestamp + windowMs;
    const retryAfterMs = Math.max(0, expiryTime - now);
    const retryAfterSeconds = Math.max(1, Math.ceil(retryAfterMs / 1000));

    return {
      allowed: false,
      success: false,
      limit,
      remaining: 0,
      retryAfterSeconds,
      resetMs: retryAfterMs,
    };
  }

  // Registra a requisição atual
  entry.timestamps.push(now);
  const remaining = Math.max(0, limit - entry.timestamps.length);

  return {
    allowed: true,
    success: true,
    limit,
    remaining,
    retryAfterSeconds: 0,
    resetMs: 0,
  };
}

/**
 * Alias compatível com o blueprint do relatório de inspeção
 */
export const rateLimit = checkRateLimit;

/**
 * Extrai o endereço de IP do cliente a partir da requisição Next.js,
 * inspecionando cabeçalhos de proxy reverso e propriedades nativas.
 */
export function getClientIp(req: NextRequest): string {
  const xForwardedFor = req.headers.get('x-forwarded-for');
  if (xForwardedFor) {
    const firstIp = xForwardedFor.split(',')[0].trim();
    if (firstIp) return firstIp;
  }

  const xRealIp = req.headers.get('x-real-ip');
  if (xRealIp && xRealIp.trim()) {
    return xRealIp.trim();
  }

  const cfConnectingIp = req.headers.get('cf-connecting-ip');
  if (cfConnectingIp && cfConnectingIp.trim()) {
    return cfConnectingIp.trim();
  }

  if (req.ip && req.ip.trim()) {
    return req.ip.trim();
  }

  return '127.0.0.1';
}

/**
 * Cria uma resposta HTTP 429 padronizada com mensagem informativa e cabeçalho Retry-After
 */
export function createRateLimitResponse(
  message: string,
  retryAfterSeconds: number
): NextResponse {
  return NextResponse.json(
    {
      error: message,
      retryAfter: retryAfterSeconds,
    },
    {
      status: 429,
      headers: {
        'Retry-After': String(retryAfterSeconds),
      },
    }
  );
}

/**
 * Limpa o histórico em memória (útil para testes automatizados)
 */
export function resetRateLimit(key?: string): void {
  if (key) {
    store.delete(key);
  } else {
    store.clear();
  }
}
