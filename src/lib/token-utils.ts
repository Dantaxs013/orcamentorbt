/**
 * Utilitários criptográficos de tokens para Next.js Edge Runtime e Node.js
 * Utiliza W3C Web Cryptography API (crypto.subtle) e codificação Base64URL pura sem dependências externas.
 */

export const USER_META_COOKIE_NAME = 'rbt_user_meta';

const SECRET = process.env.SESSION_SECRET || 'rbt_fundacoes_default_secret_key_at_least_32_chars';

export interface UserMetaClaims {
  userId: string;
  role: string;
  email: string;
  acessoOrcamento: boolean;
  acessoMedicao: boolean;
  ts: number;
}

export interface SignUserMetaInput {
  userId: string;
  role: string;
  email: string;
  acessoOrcamento?: boolean;
  acessoMedicao?: boolean;
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function fromBase64Url(str: string): Uint8Array {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function getCryptoKey(): Promise<CryptoKey> {
  const enc = new TextEncoder();
  return crypto.subtle.importKey(
    'raw',
    enc.encode(SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );
}

/**
 * Assina payload do usuário gerando token compacto HMAC SHA-256 no formato:
 * <base64url-payload>.<base64url-hmac-signature>
 */
export async function signUserMeta(payload: SignUserMetaInput): Promise<string> {
  const enc = new TextEncoder();
  const roleUpper = String(payload.role || '').toUpperCase();
  const defaultOrcamento = roleUpper === 'ADMIN' || roleUpper === 'ADMINISTRADOR' || roleUpper === 'ORCAMENTISTA';
  const defaultMedicao = roleUpper === 'ADMIN' || roleUpper === 'ADMINISTRADOR' || roleUpper === 'APONTADOR' || roleUpper === 'ENGENHEIRO';

  const claims: UserMetaClaims = {
    userId: payload.userId,
    role: payload.role,
    email: payload.email,
    acessoOrcamento: typeof payload.acessoOrcamento === 'boolean' ? payload.acessoOrcamento : defaultOrcamento,
    acessoMedicao: typeof payload.acessoMedicao === 'boolean' ? payload.acessoMedicao : defaultMedicao,
    ts: Date.now(),
  };

  const jsonStr = JSON.stringify(claims);
  const dataB64 = toBase64Url(enc.encode(jsonStr));
  const key = await getCryptoKey();
  const signature = await crypto.subtle.sign('HMAC', key, enc.encode(dataB64));
  const sigB64 = toBase64Url(new Uint8Array(signature));

  return `${dataB64}.${sigB64}`;
}

/**
 * Valida o token assinado e retorna as claims de metadata do usuário ou null se adulterado/expirado.
 * Suporta tanto a passagem direta da string do token quanto o objeto NextRequest (ou qualquer objeto com cookies.get).
 */
export async function verifyUserMeta(
  input: string | { cookies: { get: (name: string) => { value: string } | undefined } } | null | undefined
): Promise<UserMetaClaims | null> {
  if (!input) return null;

  const token = typeof input === 'string' ? input : input.cookies?.get(USER_META_COOKIE_NAME)?.value;
  if (!token || typeof token !== 'string') return null;

  const parts = token.split('.');
  if (parts.length !== 2) return null;

  const [dataB64, sigB64] = parts;

  try {
    const enc = new TextEncoder();
    const dec = new TextDecoder();
    const key = await getCryptoKey();
    const sigBytes = fromBase64Url(sigB64);

    // Validação de Base64URL canônico contra maleabilidade de assinatura
    if (toBase64Url(sigBytes) !== sigB64) {
      return null;
    }

    const isValid = await crypto.subtle.verify(
      'HMAC',
      key,
      sigBytes as unknown as BufferSource,
      enc.encode(dataB64)
    );

    if (!isValid) return null;

    const jsonStr = dec.decode(fromBase64Url(dataB64));
    const parsed = JSON.parse(jsonStr);

    const now = Date.now();
    const maxAgeMs = 12 * 60 * 60 * 1000; // 12 horas
    const maxClockSkewMs = 60 * 1000; // 60 segundos tolerância de drift futuro

    // Validação estrita do timestamp: dentro da janela [now - 12h, now + 60s]
    if (
      !parsed.ts ||
      typeof parsed.ts !== 'number' ||
      Number.isNaN(parsed.ts) ||
      parsed.ts > now + maxClockSkewMs ||
      (now - parsed.ts) > maxAgeMs
    ) {
      return null;
    }

    const roleUpper = String(parsed.role || '').toUpperCase();
    const defaultOrcamento = roleUpper === 'ADMIN' || roleUpper === 'ADMINISTRADOR' || roleUpper === 'ORCAMENTISTA';
    const defaultMedicao = roleUpper === 'ADMIN' || roleUpper === 'ADMINISTRADOR' || roleUpper === 'APONTADOR' || roleUpper === 'ENGENHEIRO';

    return {
      userId: String(parsed.userId),
      role: String(parsed.role),
      email: String(parsed.email),
      acessoOrcamento: typeof parsed.acessoOrcamento === 'boolean' ? parsed.acessoOrcamento : defaultOrcamento,
      acessoMedicao: typeof parsed.acessoMedicao === 'boolean' ? parsed.acessoMedicao : defaultMedicao,
      ts: Number(parsed.ts),
    };
  } catch {
    return null;
  }
}
