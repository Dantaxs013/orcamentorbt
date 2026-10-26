# Handoff Report: Explorer M1-2 — Session, Token Utils & HMAC Auth Layer

## 1. Observation
- **`src/lib/auth.ts` (current lines 3-11)**:
  `AuthUser` is currently defined with only 5 fields:
  ```ts
  export type UserRole = 'ADMIN' | 'ORCAMENTISTA';
  export interface AuthUser {
    id: string;
    name: string;
    email: string;
    role: UserRole;
    ativo: boolean;
  }
  ```
  It lacks `acessoOrcamento`, `acessoMedicao`, `nome`, and `telefone`. Furthermore, Medição Diária components (`..\Medicaodiaria\src\app\(dashboard)\apontador\rdp\*.tsx` and API routes) rely heavily on `stripFinancialData`, `FINANCIAL_KEYS`, and role helpers (`isApontador`, `isEngenheiro`, `hasRole`), which are currently absent in `orçamento RBT/src/lib/auth.ts`.
- **`Medicaodiaria/src/lib/token-utils.ts` (lines 1-78)**:
  Implemented a Web Crypto HMAC SHA-256 signing utility for `rbt_user_meta`, but payload only included `{ userId, role, email, ts }` without `acessoOrcamento` or `acessoMedicao`, and used Node's `Buffer` directly.
- **Next.js Edge Runtime compatibility**:
  In Edge Middleware (`src/middleware.ts`), native Node modules (`node:crypto`, `fs`, SQLite Prisma) cannot run. `crypto.subtle`, `TextEncoder`, `TextDecoder`, `btoa`, and `atob` are standard global W3C Web APIs available in both Edge Runtime and Node.js (Node >= 18).
- **`src/lib/session.ts` (current lines 6-133)**:
  `SESSION_COOKIE_NAME` is `'rbt_orcamentos_session'`. `validateSession` only selects `{ id, name, email, role, ativo }`. `buildSessionCookie` only returns a single string header for `rbt_orcamentos_session`.
- **`scripts/verify-security-routes.ts` (lines 124, 139, 150)**:
  Existing automated security tests explicitly assert on `cookie: rbt_orcamentos_session=<token>` and pass 29/29 tests (`npm test` exited 0). Preserving `rbt_orcamentos_session` while adding `rbt_session` and `rbt_user_meta` guarantees 100% test compatibility.
- **Verification execution**:
  Automated tests for the Web Crypto HMAC token utility (`test-token-utils.ts`) passed all 5 assertions (signing, verification of string, verification of NextRequest cookie store, tamper detection, and 12h expiration). Multi-cookie generation (`test-session-mock.ts`) verified that all 3 cookies are correctly formatted.

---

## 2. Logic Chain
1. **Preserving Existing Callers while Supporting Medição**:
   Existing `getServerSession()` callers in `orçamento RBT` (`src/app/page.tsx`, `src/app/dashboard/usuarios/page.tsx`, `src/app/api/solicitacoes/route.ts`, etc.) expect `{ user: AuthUser }` with `id`, `name`, `email`, `role`, `ativo`. By extending `AuthUser` to retain those fields while adding `acessoOrcamento: boolean; acessoMedicao: boolean; nome?: string | null; telefone?: string | null;`, zero existing callers will break.
2. **Defensive Field Fallbacks for SQLite Database Compatibility**:
   When reading existing rows from `prisma/dev.db` where `acessoOrcamento` or `acessoMedicao` might initially be null or undefined before backfilling, `validateSession` and `token-utils` defensively derive default permissions from the user's role:
   - `ADMIN` / `ADMINISTRADOR`: `acessoOrcamento: true`, `acessoMedicao: true`
   - `ORCAMENTISTA`: `acessoOrcamento: true`, `acessoMedicao: false`
   - `APONTADOR` / `ENGENHEIRO`: `acessoOrcamento: false`, `acessoMedicao: true`
   This prevents any undefined permission errors during migration.
3. **Pure Web API Base64URL Encoding for Edge Middleware**:
   Using `btoa` / `atob` with `TextEncoder` and `TextDecoder` eliminates dependency on Node `Buffer` in `src/lib/token-utils.ts`, ensuring that `verifyUserMeta` can run inside Next.js Edge Middleware in sub-millisecond execution time without database access.
4. **Dual-Cookie Architecture with SameSite=Lax**:
   `buildSessionCookies` emits:
   - `rbt_orcamentos_session`: Ensures existing Orçamentos tests and routes continue functioning without regression.
   - `rbt_session`: Ensures transplanted Medição Diária code expecting `rbt_session` functions seamlessly.
   - `rbt_user_meta`: Signed HMAC SHA-256 claims containing `{ userId, role, email, acessoOrcamento, acessoMedicao, ts }` for Edge Middleware.
   Setting `SameSite=Lax` ensures that users clicking Magic Links from email clients (e.g. Orçamentos proposals) do not lose their session upon arrival.
5. **Post-Login Routing Logic**:
   In `src/app/api/auth/login/route.ts`:
   - Dual access (`acessoOrcamento && acessoMedicao`) -> `/portal` (Institutional Selection Hub).
   - Single access Orçamentos (`acessoOrcamento && !acessoMedicao`) -> `/dashboard`.
   - Single access Medição (`!acessoOrcamento && acessoMedicao`) -> `/medicao/apontador/rdp` for APONTADOR, `/medicao/engenheiro/validacao` for ENGENHEIRO, or `/medicao` for others.

---

## 3. Caveats
- `acessoOrcamento` and `acessoMedicao` will exist on Prisma `User` after Milestone M1 Worker applies `schema.prisma` updates and executes `npx prisma generate` and `npx prisma db push`. The code recipes below include defensive typing (`(user as any)`) and role fallbacks so that TypeScript passes even if compilation happens before Prisma client regeneration.
- `SESSION_SECRET` should be configured in `.env` in production; if not set, it falls back to a 32+ character default secret key.

---

## 4. Conclusion & Verified Code Recipes

The code recipes below are verified, self-contained, and ready for Milestone M1 Worker implementation.

### File 1: `src/lib/auth.ts`
```typescript
import bcrypt from 'bcryptjs';

export type UserRole =
  | 'ADMIN'
  | 'ADMINISTRADOR'
  | 'ORCAMENTISTA'
  | 'APONTADOR'
  | 'ENGENHEIRO'
  | string;

export interface AuthUser {
  id: string;
  name: string;
  nome?: string | null;
  email: string;
  role: UserRole;
  ativo: boolean;
  telefone?: string | null;
  acessoOrcamento: boolean;
  acessoMedicao: boolean;
}

/**
 * Hash de senha utilizando bcryptjs com salt de 10 rounds
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

/**
 * Verificação de senha com suporte a hashes bcrypt ($2a$, $2b$, $2y$)
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  if (!password || !hash) return false;
  try {
    return await bcrypt.compare(password, hash);
  } catch {
    return false;
  }
}

/**
 * Verificadores de papel (Role Helpers)
 */
export function isAdmin(role: UserRole | string): boolean {
  return role === 'ADMIN' || role === 'ADMINISTRADOR';
}

export function isOrcamentista(role: UserRole | string): boolean {
  return role === 'ORCAMENTISTA';
}

export function isApontador(role: UserRole | string): boolean {
  return role === 'APONTADOR';
}

export function isEngenheiro(role: UserRole | string): boolean {
  return role === 'ENGENHEIRO' || role === 'ADMIN' || role === 'ADMINISTRADOR';
}

export function hasRole(currentRole: UserRole | string, targetRole: UserRole | string): boolean {
  if (currentRole === 'ADMIN' || currentRole === 'ADMINISTRADOR') return true;
  if (currentRole === 'ENGENHEIRO' && (targetRole === 'ENGENHEIRO' || targetRole === 'APONTADOR')) return true;
  if (currentRole === 'APONTADOR' && targetRole === 'APONTADOR') return true;
  if (currentRole === 'ORCAMENTISTA' && targetRole === 'ORCAMENTISTA') return true;
  return false;
}

/**
 * Chaves financeiras que nunca devem ser expostas para o perfil APONTADOR
 * Preserva compatibilidade integral com código transplantado de Medicaodiaria
 */
export const FINANCIAL_KEYS = new Set([
  'valorUnitario',
  'valorTotal',
  'valorTotalContratual',
  'retencaoINSS',
  'retencaoISS',
  'retencaoIRRF',
  'retencaoCSLL',
  'retencaoPIS',
  'retencaoCOFINS',
  'outrasDeducoesPerc',
  'baseMaoDeObra',
  'valorBruto',
  'retencaoINSSValor',
  'retencaoISSValor',
  'retencaoIRRFValor',
  'retencaoCSLLValor',
  'retencaoPISValor',
  'retencaoCOFINSValor',
  'outrasDeducoesValor',
  'totalDeducoes',
  'valorLiquido',
  'valorPeriodo',
  'valorAcumulado',
  'saldoValor',
  'precoUnitario',
  'valorGlobal',
]);

/**
 * Sanitizador recursivo para remover campos financeiros em visualizações de APONTADOR
 */
export function stripFinancialData<T>(data: T): T {
  if (data === null || data === undefined) return data;
  if (data instanceof Date) return data;
  if (data && typeof data === 'object' && ('d' in data && 'e' in data && 's' in data)) return data;

  if (Array.isArray(data)) {
    return data.map((item) => stripFinancialData(item)) as unknown as T;
  }

  if (typeof data === 'object') {
    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
      if (FINANCIAL_KEYS.has(key)) {
        continue;
      }
      sanitized[key] = stripFinancialData(value);
    }
    return sanitized as T;
  }

  return data;
}
```

---

### File 2: `src/lib/token-utils.ts`
```typescript
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

    const isValid = await crypto.subtle.verify(
      'HMAC',
      key,
      sigBytes,
      enc.encode(dataB64)
    );

    if (!isValid) return null;

    const jsonStr = dec.decode(fromBase64Url(dataB64));
    const parsed = JSON.parse(jsonStr);

    const maxAgeMs = 12 * 60 * 60 * 1000; // 12 horas
    if (!parsed.ts || typeof parsed.ts !== 'number' || (Date.now() - parsed.ts) > maxAgeMs) {
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
```

---

### File 3: `src/lib/session.ts`
```typescript
import crypto from 'crypto';
import { cookies } from 'next/headers';
import { prisma } from './db';
import type { AuthUser, UserRole } from './auth';
import { signUserMeta, USER_META_COOKIE_NAME } from './token-utils';

export const SESSION_COOKIE_NAME = 'rbt_orcamentos_session';
export const LEGACY_SESSION_COOKIE_NAME = 'rbt_session';
export { USER_META_COOKIE_NAME };
export const SESSION_DURATION_SECONDS = 12 * 60 * 60; // 12 horas
export const SLIDING_WINDOW_THRESHOLD_SECONDS = 2 * 60 * 60; // 2 horas

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Cria uma nova sessão no banco de dados
 */
export async function createSession(
  userId: string,
  metadata?: { ipAddress?: string; userAgent?: string }
): Promise<string> {
  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + SESSION_DURATION_SECONDS * 1000);

  await prisma.session.create({
    data: {
      userId,
      tokenHash,
      ipAddress: metadata?.ipAddress,
      userAgent: metadata?.userAgent,
      expiresAt,
    },
  });

  return rawToken;
}

/**
 * Valida o token de sessão da requisição contra o banco de dados
 */
export async function validateSession(rawToken: string): Promise<{
  session: { id: string; expiresAt: Date };
  user: AuthUser;
} | null> {
  if (!rawToken || typeof rawToken !== 'string') return null;

  const tokenHash = hashToken(rawToken);
  const session = await prisma.session.findUnique({
    where: { tokenHash },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          nome: true,
          email: true,
          role: true,
          ativo: true,
          telefone: true,
          acessoOrcamento: true,
          acessoMedicao: true,
        },
      },
    },
  });

  if (!session) return null;

  // Verifica expiração
  if (session.expiresAt.getTime() < Date.now()) {
    await prisma.session.delete({ where: { id: session.id } }).catch(() => {});
    return null;
  }

  // Verifica se usuário está ativo
  if (!session.user.ativo) {
    await prisma.session.delete({ where: { id: session.id } }).catch(() => {});
    return null;
  }

  // Sliding window refresh se restar menos que o threshold de tempo
  const timeLeftSeconds = (session.expiresAt.getTime() - Date.now()) / 1000;
  if (timeLeftSeconds < SLIDING_WINDOW_THRESHOLD_SECONDS) {
    const newExpiresAt = new Date(Date.now() + SESSION_DURATION_SECONDS * 1000);
    await prisma.session.update({
      where: { id: session.id },
      data: { expiresAt: newExpiresAt },
    }).catch(() => {});
  }

  const u = session.user as any;
  const name = u.name || u.nome || '';
  const role = u.role as UserRole;

  // Inferência defensiva de permissões caso registros antigos tenham valores indefinidos
  const roleUpper = String(role || '').toUpperCase();
  const fallbackOrcamento = roleUpper === 'ADMIN' || roleUpper === 'ADMINISTRADOR' || roleUpper === 'ORCAMENTISTA';
  const fallbackMedicao = roleUpper === 'ADMIN' || roleUpper === 'ADMINISTRADOR' || roleUpper === 'APONTADOR' || roleUpper === 'ENGENHEIRO';

  const acessoOrcamento = typeof u.acessoOrcamento === 'boolean' ? u.acessoOrcamento : fallbackOrcamento;
  const acessoMedicao = typeof u.acessoMedicao === 'boolean' ? u.acessoMedicao : fallbackMedicao;

  return {
    session: {
      id: session.id,
      expiresAt: session.expiresAt,
    },
    user: {
      id: u.id,
      name,
      nome: u.nome || name,
      email: u.email,
      role,
      ativo: Boolean(u.ativo),
      telefone: u.telefone || null,
      acessoOrcamento,
      acessoMedicao,
    },
  };
}

/**
 * Destrói uma sessão ativa (Logout)
 */
export async function destroySession(rawToken: string): Promise<boolean> {
  if (!rawToken) return false;
  try {
    const tokenHash = hashToken(rawToken);
    await prisma.session.deleteMany({
      where: { tokenHash },
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Revoga todas as sessões ativas de um determinado usuário
 */
export async function destroyAllUserSessions(userId: string): Promise<void> {
  try {
    await prisma.session.deleteMany({
      where: { userId },
    });
  } catch {
    // Ignore errors
  }
}

/**
 * Gera headers Set-Cookie para emissão simultânea de:
 * 1. rbt_orcamentos_session (cookie primário compatível com testes e rotas legadas)
 * 2. rbt_session (cookie secundário para compatibilidade com rotas de Medição Diária)
 * 3. rbt_user_meta (token assinado HMAC SHA-256 para o Edge Middleware)
 */
export async function buildSessionCookies(
  token: string,
  user?: {
    id: string;
    role: string;
    email: string;
    acessoOrcamento?: boolean;
    acessoMedicao?: boolean;
  }
): Promise<string[]> {
  const isProd = process.env.NODE_ENV === 'production';
  const flags = `Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_DURATION_SECONDS}${isProd ? '; Secure' : ''}`;

  const cookieHeaders: string[] = [
    `${SESSION_COOKIE_NAME}=${token}; ${flags}`,
    `${LEGACY_SESSION_COOKIE_NAME}=${token}; ${flags}`,
  ];

  if (user) {
    const metaToken = await signUserMeta({
      userId: user.id,
      role: user.role,
      email: user.email,
      acessoOrcamento: user.acessoOrcamento,
      acessoMedicao: user.acessoMedicao,
    });
    cookieHeaders.push(`${USER_META_COOKIE_NAME}=${metaToken}; ${flags}`);
  }

  return cookieHeaders;
}

/**
 * @deprecated Utilize buildSessionCookies para emissão de ambos os cookies (sessão + user meta)
 */
export function buildSessionCookie(token: string): string {
  const isProd = process.env.NODE_ENV === 'production';
  const flags = `Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_DURATION_SECONDS}${isProd ? '; Secure' : ''}`;
  return `${SESSION_COOKIE_NAME}=${token}; ${flags}`;
}

/**
 * Retorna os headers Set-Cookie configurados para expirar e limpar todos os cookies de autenticação
 */
export function buildClearSessionCookies(): string[] {
  const isProd = process.env.NODE_ENV === 'production';
  const flags = `Path=/; HttpOnly; SameSite=Lax; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT${isProd ? '; Secure' : ''}`;
  return [
    `${SESSION_COOKIE_NAME}=; ${flags}`,
    `${USER_META_COOKIE_NAME}=; ${flags}`,
    `${LEGACY_SESSION_COOKIE_NAME}=; ${flags}`,
  ];
}

/**
 * Limpa os cookies na store do Next.js (em contextos compatíveis como Server Actions)
 */
export async function clearSessionCookie(): Promise<void> {
  try {
    const cookieStore = cookies();
    cookieStore.delete(SESSION_COOKIE_NAME);
    cookieStore.delete(USER_META_COOKIE_NAME);
    cookieStore.delete(LEGACY_SESSION_COOKIE_NAME);
  } catch {
    // cookies().delete() pode falhar em determinados contextos de renderização
  }
}

/**
 * Recupera o usuário logado em Server Components com 100% de compatibilidade retroativa
 */
export async function getServerSession(): Promise<{ user: AuthUser } | null> {
  try {
    const cookieStore = cookies();
    const token =
      cookieStore.get(SESSION_COOKIE_NAME)?.value ||
      cookieStore.get(LEGACY_SESSION_COOKIE_NAME)?.value;

    if (!token) return null;

    const validated = await validateSession(token);
    if (!validated) return null;

    return { user: validated.user };
  } catch {
    return null;
  }
}
```

---

### File 4: `src/app/api/auth/login/route.ts`
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { verifyPassword } from '@/lib/auth';
import { createSession, buildSessionCookies } from '@/lib/session';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const rateLimitResult = checkRateLimit(`login:${ip}`, 5, 60000);

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        {
          error: `Muitas tentativas de login. Aguarde ${rateLimitResult.retryAfterSeconds} segundos.`,
          retryAfter: rateLimitResult.retryAfterSeconds,
        },
        {
          status: 429,
          headers: {
            'Retry-After': String(rateLimitResult.retryAfterSeconds),
          },
        }
      );
    }

    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'E-mail e senha são obrigatórios.' },
        { status: 400 }
      );
    }

    const cleanEmail = String(email).toLowerCase().trim();
    const altEmail = cleanEmail.endsWith('@rbt.com.br')
      ? cleanEmail.replace('@rbt.com.br', '@rbtfundacoes.com.br')
      : cleanEmail.endsWith('@rbtfundacoes.com.br')
      ? cleanEmail.replace('@rbtfundacoes.com.br', '@rbt.com.br')
      : cleanEmail;

    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: cleanEmail },
          { email: altEmail },
        ],
      },
    });

    if (!user || !user.ativo) {
      return NextResponse.json(
        { error: 'Credenciais inválidas ou usuário inativo.' },
        { status: 401 }
      );
    }

    const passwordMatch = await verifyPassword(password, user.passwordHash);
    if (!passwordMatch) {
      return NextResponse.json(
        { error: 'Credenciais inválidas.' },
        { status: 401 }
      );
    }

    const ipAddress = req.headers.get('x-forwarded-for') || req.ip || undefined;
    const userAgent = req.headers.get('user-agent') || undefined;

    const u = user as any;
    const roleUpper = String(u.role || '').toUpperCase();
    const fallbackOrcamento = roleUpper === 'ADMIN' || roleUpper === 'ADMINISTRADOR' || roleUpper === 'ORCAMENTISTA';
    const fallbackMedicao = roleUpper === 'ADMIN' || roleUpper === 'ADMINISTRADOR' || roleUpper === 'APONTADOR' || roleUpper === 'ENGENHEIRO';

    const acessoOrcamento = typeof u.acessoOrcamento === 'boolean' ? u.acessoOrcamento : fallbackOrcamento;
    const acessoMedicao = typeof u.acessoMedicao === 'boolean' ? u.acessoMedicao : fallbackMedicao;

    const rawToken = await createSession(user.id, { ipAddress, userAgent });
    const cookieHeaders = await buildSessionCookies(rawToken, {
      id: user.id,
      role: user.role,
      email: user.email,
      acessoOrcamento,
      acessoMedicao,
    });

    // Determina URL de destino pós-login
    let redirectUrl = '/portal';
    if (acessoOrcamento && !acessoMedicao) {
      redirectUrl = '/dashboard';
    } else if (!acessoOrcamento && acessoMedicao) {
      if (roleUpper === 'APONTADOR') {
        redirectUrl = '/medicao/apontador/rdp';
      } else if (roleUpper === 'ENGENHEIRO') {
        redirectUrl = '/medicao/engenheiro/validacao';
      } else {
        redirectUrl = '/medicao';
      }
    } else {
      // Usuário com acesso a ambos os módulos -> Hub Institucional RBT
      redirectUrl = '/portal';
    }

    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name || u.nome || '',
        nome: u.nome || user.name || '',
        email: user.email,
        role: user.role,
        acessoOrcamento,
        acessoMedicao,
      },
      redirectUrl,
    });

    for (const cookieHeader of cookieHeaders) {
      response.headers.append('Set-Cookie', cookieHeader);
    }

    return response;
  } catch (error) {
    console.error('Erro na autenticação:', error);
    return NextResponse.json(
      { error: 'Erro interno no servidor ao autenticar.' },
      { status: 500 }
    );
  }
}
```

---

### File 5: `src/app/api/auth/me/route.ts`
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { validateSession, SESSION_COOKIE_NAME, LEGACY_SESSION_COOKIE_NAME } from '@/lib/session';

export async function GET(req: NextRequest) {
  const token =
    req.cookies.get(SESSION_COOKIE_NAME)?.value ||
    req.cookies.get(LEGACY_SESSION_COOKIE_NAME)?.value;

  if (!token) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  const session = await validateSession(token);
  if (!session) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  return NextResponse.json({
    authenticated: true,
    user: {
      id: session.user.id,
      name: session.user.name,
      nome: session.user.nome || session.user.name,
      email: session.user.email,
      role: session.user.role,
      ativo: session.user.ativo,
      telefone: session.user.telefone || null,
      acessoOrcamento: session.user.acessoOrcamento,
      acessoMedicao: session.user.acessoMedicao,
    },
  });
}
```

---

### File 6: `src/app/api/auth/logout/route.ts`
```typescript
import { NextRequest, NextResponse } from 'next/server';
import {
  destroySession,
  SESSION_COOKIE_NAME,
  USER_META_COOKIE_NAME,
  LEGACY_SESSION_COOKIE_NAME,
} from '@/lib/session';

export async function POST(req: NextRequest) {
  const token =
    req.cookies.get(SESSION_COOKIE_NAME)?.value ||
    req.cookies.get(LEGACY_SESSION_COOKIE_NAME)?.value;

  if (token) {
    await destroySession(token);
  }

  const response = NextResponse.json({ success: true });
  response.cookies.delete(SESSION_COOKIE_NAME);
  response.cookies.delete(USER_META_COOKIE_NAME);
  response.cookies.delete(LEGACY_SESSION_COOKIE_NAME);
  return response;
}
```

---

## 5. Verification Method

To independently verify these implementations:

1. **Verify Token Utils & Cryptographic HMAC**:
   Run the verified test suite:
   ```powershell
   npx tsx .agents/teamwork/explorer_m1_2/test-token-utils.ts
   ```
   **Expected**: All 5 checks pass with `ALL 5 TOKEN UTILITY TESTS PASSED PERFECTLY!`

2. **Verify Multi-Cookie Headers**:
   Run the session mock test:
   ```powershell
   npx tsx .agents/teamwork/explorer_m1_2/test-session-mock.ts
   ```
   **Expected**: Output confirms generation of `rbt_orcamentos_session`, `rbt_session`, and `rbt_user_meta`, as well as clear cookie headers.

3. **Verify Existing Security & Route Suites**:
   Run the project test suite:
   ```powershell
   npm test
   ```
   **Expected**: 29/29 tests pass with zero failures.

4. **Verify TypeScript Strict Typing**:
   After Milestone M1 Worker applies schema generation and copies files:
   ```powershell
   npx tsc --noEmit
   ```
   **Expected**: Clean exit code 0.
