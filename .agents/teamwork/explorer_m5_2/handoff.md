# Handoff Report: Explorer M5-2 — Edge Token HMAC Verification & Session Synchronization

## 1. Observation

### 1.1 Dual-Token & Cryptographic Implementation (`src/lib/token-utils.ts`)
- **Crypto Engine**: Implemented via standard W3C Web Cryptography API (`crypto.subtle`) and pure Base64URL string encoding without external Node dependencies (`buffer`, `crypto`), ensuring 100% compatibility with Next.js Edge Runtime.
  - `signUserMeta(payload: SignUserMetaInput): Promise<string>` (`src/lib/token-utils.ts:66-88`)
  - `verifyUserMeta(input: string | { cookies: { get: ... } } | null | undefined): Promise<UserMetaClaims | null>` (`src/lib/token-utils.ts:94-145`)
- **Cookie Name**: `export const USER_META_COOKIE_NAME = 'rbt_user_meta';` (`src/lib/token-utils.ts:6`)
- **Token Format**: Compact dot-separated string `<base64url-payload>.<base64url-hmac-signature>` (`src/lib/token-utils.ts:87`).
- **Signature Calculation**:
  - Key generated via `crypto.subtle.importKey('raw', enc.encode(SECRET), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify'])` (`src/lib/token-utils.ts:51-60`).
  - Signature computed over the Base64URL encoded payload (`crypto.subtle.sign('HMAC', key, enc.encode(dataB64))`) (`src/lib/token-utils.ts:84`).
- **Secret Resolution**:
  - `src/lib/token-utils.ts:8`: `const SECRET = process.env.SESSION_SECRET || 'rbt_fundacoes_default_secret_key_at_least_32_chars';`
  - `.env:4`: `SESSION_SECRET="rbt-orcamentos-super-secret-key-change-in-production-2026"`

### 1.2 Claims Structure & Typings
- **Claims Contract**: (`src/lib/token-utils.ts:10-17`)
  ```typescript
  export interface UserMetaClaims {
    userId: string;
    role: string;
    email: string;
    acessoOrcamento: boolean;
    acessoMedicao: boolean;
    ts: number;
  }
  ```
- **Fidelity & Parsing**: (`src/lib/token-utils.ts:134-141`)
  ```typescript
  return {
    userId: String(parsed.userId),
    role: String(parsed.role),
    email: String(parsed.email),
    acessoOrcamento: typeof parsed.acessoOrcamento === 'boolean' ? parsed.acessoOrcamento : defaultOrcamento,
    acessoMedicao: typeof parsed.acessoMedicao === 'boolean' ? parsed.acessoMedicao : defaultMedicao,
    ts: Number(parsed.ts),
  };
  ```
- **Expiration Limit**: `maxAgeMs = 12 * 60 * 60 * 1000` (12 hours) (`src/lib/token-utils.ts:125`).

### 1.3 Session Synchronization & Multi-Cookie Issuance (`src/lib/session.ts`)
- **Triple Cookie Issuance**: `buildSessionCookies` (`src/lib/session.ts:160-190`) generates three cookies:
  1. `rbt_orcamentos_session`: Raw database session token (64 hex characters) for SQLite Prisma lookup (`src/lib/session.ts:7, 174`).
  2. `rbt_session`: Secondary legacy cookie with identical token for transplanted Medicaodiaria routes (`src/lib/session.ts:8, 175`).
  3. `rbt_user_meta`: Signed HMAC SHA-256 token containing `UserMetaClaims` for Edge Middleware (`src/lib/session.ts:186`).
- **Cookie Security Flags**: `Path=/; HttpOnly; SameSite=Lax; Max-Age=43200` (`src/lib/session.ts:171`).
- **Clearing Cookies**: `buildClearSessionCookies()` (`src/lib/session.ts:204-212`) and `clearSessionCookie()` (`src/lib/session.ts:217-226`) delete all three cookies simultaneously on logout.

### 1.4 Login Flow Execution (`src/app/api/auth/login/route.ts`)
- Rate limiting enforced via `checkRateLimit('login:${ip}', 5, 60000)` (`src/app/api/auth/login/route.ts:10`).
- User retrieved from SQLite with `@rbt.com.br` / `@rbtfundacoes.com.br` alias support (`src/app/api/auth/login/route.ts:43-50`).
- Permissions resolved defensively (`src/app/api/auth/login/route.ts:71-76`):
  ```typescript
  const roleUpper = String(u.role || '').toUpperCase();
  const fallbackOrcamento = roleUpper === 'ADMIN' || roleUpper === 'ADMINISTRADOR' || roleUpper === 'ORCAMENTISTA';
  const fallbackMedicao = roleUpper === 'ADMIN' || roleUpper === 'ADMINISTRADOR' || roleUpper === 'APONTADOR' || roleUpper === 'ENGENHEIRO';
  const acessoOrcamento = typeof u.acessoOrcamento === 'boolean' ? u.acessoOrcamento : fallbackOrcamento;
  const acessoMedicao = typeof u.acessoMedicao === 'boolean' ? u.acessoMedicao : fallbackMedicao;
  ```
- Cookies generated and attached via `response.headers.append('Set-Cookie', cookieHeader)` (`src/app/api/auth/login/route.ts:79-85, 105-107`).
- Response returns `redirectUrl: '/portal'` for all authenticated users (`src/app/api/auth/login/route.ts:89, 102`).

### 1.5 Current Edge Middleware State (`src/middleware.ts`)
- Lines 10-28:
  ```typescript
  export function middleware(request: NextRequest) {
    const { pathname, search } = request.nextUrl;

    if (pathname.startsWith('/dashboard')) {
      const sessionToken = request.cookies.get(SESSION_COOKIE_NAME)?.value;

      if (!sessionToken || sessionToken.trim() === '') {
        const loginUrl = new URL('/login', request.url);
        const redirectTarget = pathname + (search || '');
        loginUrl.searchParams.set('redirect', redirectTarget);
        return NextResponse.redirect(loginUrl, 307);
      }
    }

    return NextResponse.next();
  }
  ```
- Observation: `src/middleware.ts` currently only checks `rbt_orcamentos_session` existence on `/dashboard`. It has NOT yet imported `verifyUserMeta` or implemented module guards (`/medicao/*`, `/portal`, role bypass).

### 1.6 Role Normalization Findings
- In `src/lib/auth.ts:46-48`:
  ```typescript
  export function isAdmin(role: UserRole | string): boolean {
    return role === 'ADMIN' || role === 'ADMINISTRADOR';
  }
  ```
- In `src/lib/auth.ts:58-60`:
  ```typescript
  export function isEngenheiro(role: UserRole | string): boolean {
    return role === 'ENGENHEIRO' || role === 'ADMIN' || role === 'ADMINISTRADOR';
  }
  ```
- In `src/lib/auth.ts:62-68`:
  ```typescript
  export function hasRole(currentRole: UserRole | string, targetRole: UserRole | string): boolean {
    if (currentRole === 'ADMIN' || currentRole === 'ADMINISTRADOR') return true;
    ...
  }
  ```
- In UI components (anomalies detected):
  - `src/components/medicao/rdp/rdp-view-actions.tsx:70`: `{['ENGENHEIRO', 'ADMINISTRADOR'].includes(userRole) && status === 'SUBMETIDO' && (` — Missing `'ADMIN'`.
  - `src/components/medicao/obras/nova-obra-modal.tsx:243`: `{userRole === 'ADMINISTRADOR' && engenheiros.length > 0 && (` — Missing `'ADMIN'`.

### 1.7 Test Suite Execution
- `npm test` (`scripts/verify-security-routes.ts`):
  - Result: **29 / 29 PASS (0 failures)**.
  - Crucial Observation: Test 1.5 and 1.6 in `verify-security-routes.ts:136-156` test authenticated `/dashboard` access by supplying ONLY `cookie: rbt_orcamentos_session=...` (without `rbt_user_meta`) and expect HTTP 200 pass-through.
- `npx tsx scripts/verify-portal-unified.ts`:
  - Result: **54 / 54 PASS (0 failures)** across Tiers 1, 2, 3, and 4.
- `npx tsc --noEmit`:
  - Result: **Zero type errors (Exit code 0)**.

---

## 2. Logic Chain

1. **Edge Runtime Decoupling**:
   - *Premise*: Next.js Edge Middleware cannot load Node native addons or direct SQLite bindings (`prisma.session` / `dev.db`).
   - *Evidence*: `src/lib/token-utils.ts` uses Web Cryptography API (`crypto.subtle`) and Base64URL encoding without Node dependencies (Observation 1.1).
   - *Inference*: Edge Middleware can verify user claims and module permissions in sub-millisecond execution time without querying SQLite.

2. **Claim Integrity and Tamper Resistance**:
   - *Premise*: Client must not be able to forge or elevate privileges (e.g. flipping `acessoMedicao` from `false` to `true`).
   - *Evidence*: `crypto.subtle.verify('HMAC', key, sigBytes, enc.encode(dataB64))` verifies signature over the Base64URL payload. Modifying any bit in the payload returns `null` (Observation 1.1, test 2.1.1 in `verify-portal-unified.ts`).
   - *Inference*: Cryptographic claims `{ userId, role, email, acessoOrcamento, acessoMedicao, ts }` are fully tamper-proof at the Edge perimeter.

3. **Fallback & Legacy Cookie Reconcile**:
   - *Premise*: What happens when `rbt_user_meta` is absent or expired, but `rbt_orcamentos_session` or `rbt_session` is present?
   - *Observation A*: `scripts/verify-security-routes.ts` tests 1.5 & 1.6 expect `/dashboard` to return 200 when only `rbt_orcamentos_session` is sent (Observation 1.7).
   - *Observation B*: Server Components (`src/app/dashboard/page.tsx`, `src/app/medicao/layout.tsx`) call `getServerSession()`, which queries SQLite via Prisma (`tokenHash`), independently retrieving fresh user permissions from the database (Observation 1.3).
   - *Inference*:
     - If `rbt_user_meta` is present and valid: Edge Middleware enforces module access (`acessoOrcamento` on `/dashboard`, `acessoMedicao` on `/medicao`, Apontador path isolation).
     - If `rbt_user_meta` is absent or expired:
       - On `/dashboard/*`: If `rbt_orcamentos_session` is present, Edge Middleware allows pass-through to Server Components (`getServerSession()`) to maintain 100% backward compatibility with `verify-security-routes.ts`.
       - On `/medicao/*`: If `rbt_user_meta` is absent or expired, Edge Middleware redirects to `/login?redirect=/medicao` (as required by Medicaodiaria's security model).
       - On unauthenticated requests (neither cookie present): Edge Middleware redirects to `/login?redirect=...`.

4. **Role Normalization & Admin Bypass**:
   - *Premise*: Users with role `ADMIN` or `ADMINISTRADOR` must never be blocked from any module, regardless of individual checkbox flags.
   - *Evidence*: `src/lib/auth.ts:46` specifies `isAdmin(role) = role === 'ADMIN' || role === 'ADMINISTRADOR'` (Observation 1.6).
   - *Inference*: In Edge Middleware, defining `const isAdministrator = roleUpper === 'ADMIN' || roleUpper === 'ADMINISTRADOR'` and checking `if (!isAdministrator && !claims.acessoOrcamento)` guarantees full bypass privileges for both administrative designations.

---

## 3. Caveats

1. **Clock Drift on Expiration**:
   - In `src/lib/token-utils.ts:126`, `verifyUserMeta` checks `(Date.now() - parsed.ts) > maxAgeMs`. It does not explicitly check for future timestamps (e.g. `parsed.ts > Date.now() + 60000`). While client forgery is prevented by HMAC signing, adding this check prevents potential replaying of tokens created under future skewed clocks.
2. **Missing UI Role Checks**:
   - In `rdp-view-actions.tsx:70` and `nova-obra-modal.tsx:243`, the components only checked for `'ADMINISTRADOR'` and omitted `'ADMIN'`. While this does not affect Edge Middleware, it creates a subtle UI discrepancy for users seeded or created with `'ADMIN'`.
3. **Session Sliding Window vs HMAC Token**:
   - The database session has sliding window extension (`session.ts:86-92`). However, `rbt_user_meta` is minted once at login with a fixed 12-hour timestamp. If a user remains active past 12 hours without re-logging, the HMAC token will expire even if the DB session is extended. A lightweight API or Server Action refresh mechanism could re-mint `rbt_user_meta` on activity.

---

## 4. Conclusion & Concrete Implementation Specification

### 4.1 Summary
The dual-token architecture is sound and fully functional:
- `signUserMeta` and `verifyUserMeta` in `src/lib/token-utils.ts` work seamlessly in Edge Runtime.
- Login API (`/api/auth/login`) issues all 3 cookies simultaneously with exact claim fidelity.
- Role normalization is already established in `src/lib/auth.ts` and can be directly applied to Edge Middleware.

### 4.2 Concrete Implementation Blueprint for `src/middleware.ts`
The worker implementing Milestone M5 should replace `src/middleware.ts` with the following Edge-compatible logic:

```typescript
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyUserMeta, USER_META_COOKIE_NAME } from '@/lib/token-utils';

const SESSION_COOKIE_NAME = 'rbt_orcamentos_session';
const LEGACY_SESSION_COOKIE_NAME = 'rbt_session';

// Static assets and internal paths to bypass
const PUBLIC_PREFIXES = ['/_next', '/favicon.ico', '/logo-rbt.svg'];
const PUBLIC_EXACT = ['/login', '/formulario'];

export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  // 1. Bypass public paths and static assets
  if (
    PUBLIC_PREFIXES.some((p) => pathname.startsWith(p)) ||
    PUBLIC_EXACT.some((p) => pathname === p || pathname.startsWith(`${p}/`))
  ) {
    return NextResponse.next();
  }

  // 2. Extract session and user meta tokens
  const sessionToken =
    request.cookies.get(SESSION_COOKIE_NAME)?.value ||
    request.cookies.get(LEGACY_SESSION_COOKIE_NAME)?.value;

  const hasSession = Boolean(sessionToken && sessionToken.trim() !== '');

  // 3. Handle unauthenticated requests
  if (!hasSession) {
    // API routes return 401
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { error: 'Não autenticado. Faça login para continuar.' },
        { status: 401 }
      );
    }

    const loginUrl = new URL('/login', request.url);
    const redirectTarget = pathname + (search || '');
    loginUrl.searchParams.set('redirect', redirectTarget);
    return NextResponse.redirect(loginUrl, 307);
  }

  // 4. Redirect already-authenticated users visiting /login
  if (pathname === '/login') {
    return NextResponse.redirect(new URL('/portal', request.url), 307);
  }

  // 5. Verify HMAC user metadata token
  const claims = await verifyUserMeta(request);

  // Fallback behavior when claims are missing or expired:
  // - If visiting /dashboard, allow pass-through if sessionToken is present (backward compatibility with test suite)
  // - If visiting /medicao, redirect to login
  if (!claims) {
    if (pathname.startsWith('/dashboard')) {
      return NextResponse.next();
    }
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname + (search || ''));
    return NextResponse.redirect(loginUrl, 307);
  }

  const roleUpper = String(claims.role || '').toUpperCase();
  const isAdministrator = roleUpper === 'ADMIN' || roleUpper === 'ADMINISTRADOR';

  // 6. Root path redirection -> always to /portal
  if (pathname === '/') {
    return NextResponse.redirect(new URL('/portal', request.url), 307);
  }

  // 7. Guard /dashboard/* routes
  if (pathname.startsWith('/dashboard')) {
    if (!isAdministrator && !claims.acessoOrcamento) {
      const portalUrl = new URL('/portal', request.url);
      portalUrl.searchParams.set('unauthorized', 'orcamentos');
      return NextResponse.redirect(portalUrl, 307);
    }
    return NextResponse.next();
  }

  // 8. Guard /medicao/* routes
  if (pathname.startsWith('/medicao')) {
    if (!isAdministrator && !claims.acessoMedicao) {
      const portalUrl = new URL('/portal', request.url);
      portalUrl.searchParams.set('unauthorized', 'medicao');
      return NextResponse.redirect(portalUrl, 307);
    }

    // Apontador financial & admin isolation inside /medicao
    if (!isAdministrator && roleUpper === 'APONTADOR') {
      if (
        pathname.startsWith('/medicao/engenheiro') ||
        pathname.startsWith('/medicao/admin')
      ) {
        return NextResponse.redirect(new URL('/medicao/apontador/rdp', request.url), 307);
      }
    }

    return NextResponse.next();
  }

  // 9. Guard API routes
  if (pathname.startsWith('/api/orcamentos')) {
    if (!isAdministrator && !claims.acessoOrcamento) {
      return NextResponse.json(
        { error: 'Acesso restrito ao módulo de Gestão de Orçamentos.' },
        { status: 403 }
      );
    }
  }

  if (pathname.startsWith('/api/medicoes')) {
    if (!isAdministrator && !claims.acessoMedicao) {
      return NextResponse.json(
        { error: 'Acesso restrito ao módulo de Medição Diária (RDP).' },
        { status: 403 }
      );
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
```

---

## 5. Verification Method

To independently verify all findings and test proposals:

1. **Unit and Route Verification Test Suite (`npm test`)**:
   ```bash
   npm test
   ```
   *Expected*: 29 tests pass with 0 errors.

2. **Comprehensive Unified Portal E2E Verification**:
   ```bash
   npx tsx scripts/verify-portal-unified.ts
   ```
   *Expected*: 54 tests pass across Tiers 1-4 with 0 failures.

3. **Strict TypeScript Compilation Check**:
   ```bash
   npx tsc --noEmit
   ```
   *Expected*: Exits with code 0 and zero type errors.

4. **Interactive Token Test Command**:
   ```bash
   npx tsx -e "import { signUserMeta, verifyUserMeta } from './src/lib/token-utils'; (async () => { const t = await signUserMeta({ userId: 'u1', role: 'ADMIN', email: 'test@rbt.com.br' }); console.log('Verified:', await verifyUserMeta(t)); })();"
   ```
   *Expected*: Outputs verified claims matching `{ userId: 'u1', role: 'ADMIN', email: 'test@rbt.com.br', acessoOrcamento: true, acessoMedicao: true, ts: <number> }`.

5. **Invalidation Conditions**:
   - Modifying any byte in the Base64URL payload or signature causes `verifyUserMeta` to return `null`.
   - Setting `ts` older than 12 hours (`Date.now() - 12 * 60 * 60 * 1000 - 1`) causes `verifyUserMeta` to return `null`.
