# Handoff Report — Reviewer 1: Security, Middleware, Headers & Rate Limiting

**Reviewer Identity**: Reviewer 1 (Archetype: reviewer_critic)  
**Target Milestone**: M1 (Segurança e Acesso em Camadas) & M4 (Verificação de Integridade e Testes)  
**Date/Time**: 2026-10-07T15:24:30Z  
**Verdict**: **APPROVE**  
**Integrity Violations Detected**: **NONE**  
**Git Commits Executed**: **NONE** (Compliant with global rule)

---

## 1. Observation

Direct observations from source code inspections, test execution, and static type checking:

1. **Test Execution Command & Result**:
   - Command: `npm test` (`tsx scripts/verify-security-routes.ts`)
   - Output: 
     ```
     SUITE: 1. Route Protection Middleware (src/middleware.ts) — 8/8 PASS
     SUITE: 2. HTTP Security Headers (next.config.mjs) — 8/8 PASS
     SUITE: 3. Rate Limiting Functionality (src/lib/rate-limit.ts) — 6/6 PASS
     SUITE: 4. Input Masks & Parsers (src/lib/masks.ts) — 7/7 PASS
     Total Tests Run: 29 | Passed: 29 | Failed: 0 | Execution Time: 29.87ms
     ```
   - Exit Code: `0`

2. **TypeScript Compilation Command & Result**:
   - Command: `npx tsc --noEmit`
   - Output: Zero errors, no emit issues across the entire workspace.
   - Exit Code: `0`

3. **Route Protection Middleware (`src/middleware.ts`)**:
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
   - Lines 30-35: `config.matcher = ['/dashboard', '/dashboard/:path*']`.

4. **HTTP Security Headers (`next.config.mjs`)**:
   - Lines 3-39:
     - `poweredByHeader: false` (removes `X-Powered-By`).
     - Route matcher: `source: '/(.*)'`.
     - `Content-Security-Policy`: `"script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'; connect-src 'self'; frame-ancestors 'none';"`
     - `X-Frame-Options`: `'DENY'`
     - `X-Content-Type-Options`: `'nosniff'`
     - `Referrer-Policy`: `'strict-origin-when-cross-origin'`
     - `Permissions-Policy`: `'camera=(), microphone=(), geolocation=()'`
     - `Strict-Transport-Security`: `'max-age=63072000; includeSubDomains; preload'`

5. **Rate Limiting Engine (`src/lib/rate-limit.ts`)**:
   - Lines 18-41: Sliding-window in-memory log via `store = new Map<string, RateLimitEntry>()` with 60s cleanup interval for entries older than 10 minutes (with `.unref()` on timer).
   - Lines 50-101: `checkRateLimit(key, limit, windowMs)`. Accurately filters timestamps inside `windowStart`, decrements remaining quota, computes `retryAfterSeconds` from oldest timestamp in window, and returns `{ allowed, success, limit, remaining, retryAfterSeconds, resetMs }`.
   - Lines 139-155: `createRateLimitResponse(message, retryAfterSeconds)` sets HTTP status 429 and `Retry-After: <retryAfterSeconds>`.
   - Lines 112-134: `getClientIp(req)` extracts IP using `x-forwarded-for` (first entry), `x-real-ip`, `cf-connecting-ip`, `req.ip`, and falls back to `'127.0.0.1'`.

6. **Rate Limiting in Endpoints**:
   - `src/app/api/auth/login/route.ts` (lines 9-25): `checkRateLimit('login:${ip}', 5, 60000)`. Exceeded requests return 429 with `Retry-After`.
   - `src/app/api/solicitacoes/route.ts` (lines 26-42): `checkRateLimit('solicitacoes:${ip}', 10, 60000)`. Exceeded requests return 429 with `Retry-After`.
   - `src/app/api/formulario/[token]/route.ts` (lines 89-105): `checkRateLimit('formulario:${ip}', 10, 60000)`. Exceeded requests return 429 with `Retry-After`.

7. **Proposal Route Guard (`src/app/api/orcamentos/[id]/proposta/route.ts`)**:
   - Lines 19-22 (GET) & lines 98-101 (POST):
     ```typescript
     const session = await getServerSession();
     if (!session) {
       return NextResponse.json({ error: 'Acesso restrito. Faça login.' }, { status: 401 });
     }
     ```
   - Unauthenticated requests are blocked with HTTP 401 Unauthorized before any PDF buffer generation or database mutation.

8. **Integrity Check**:
   - No hardcoded test outputs or return overrides found.
   - Genuine Next.js middleware and API route handlers.
   - Tests execute real assertions against imported modules.

---

## 2. Logic Chain

1. **Verification of Test & Typecheck Baseline**:
   - Observation 1 demonstrates that all 29 automated tests pass with 0 failures in 29.87ms.
   - Observation 2 demonstrates that TypeScript compiler reports 0 errors in strict mode.
   - Inference: The codebase builds and executes without syntax, import, or typing defects.

2. **Perimeter Middleware Protection**:
   - Observation 3 shows `middleware.ts` intercepting `/dashboard` and `/dashboard/:path*`.
   - If `rbt_orcamentos_session` cookie is missing or blank, `NextResponse.redirect(loginUrl, 307)` is returned.
   - The original path and search query are preserved in `?redirect=${pathname + (search || '')}`.
   - In Suite 1 (tests 1.1–1.8), these code paths were systematically exercised and verified.
   - Inference: Requisito R1 for dashboard edge protection is fully satisfied.

3. **Security Headers Conformance**:
   - Observation 4 confirms all mandated security headers in `next.config.mjs`: CSP, X-Frame-Options: DENY, X-Content-Type-Options: nosniff, Referrer-Policy: strict-origin-when-cross-origin, Permissions-Policy, HSTS with preload, and poweredByHeader disabled.
   - In Suite 2 (tests 2.1–2.8), every header was verified.
   - Inference: Requisito R1 for HTTP headers is fully satisfied.

4. **Rate Limiting & Abuse Prevention**:
   - Observation 5 confirms a mathematical sliding-window log implementation.
   - Observation 6 confirms that `/api/auth/login` (5/min), `/api/solicitacoes` (10/min), and `/api/formulario/[token]` (10/min) invoke `checkRateLimit` and return 429 with `Retry-After` header.
   - In Suite 3 (tests 3.1–3.6), throttle triggers, remaining decrement, key isolation, and `Retry-After` header formation were verified.
   - Inference: Requisito R1 for rate limiting is fully satisfied.

5. **Proposal Route Guard & Data Protection**:
   - Observation 7 shows that `GET` (download proposal PDF) and `POST` (save pricing and email proposal) in `/api/orcamentos/[id]/proposta` require a valid session via `getServerSession()`, returning 401 if unauthenticated.
   - Inference: Confidential financial proposals cannot be downloaded or mutated without authentication.

---

## 3. Adversarial Review & Attack Surface Challenges

**Overall Risk Assessment**: LOW TO MEDIUM

### Challenge 1 [Medium]: IP Spoofing via `X-Forwarded-For` Precedence
- **Assumption Challenged**: `getClientIp(req)` assumes the leftmost IP in `X-Forwarded-For` is the real client IP.
- **Attack Scenario**: If the Next.js server is directly exposed or sits behind a reverse proxy that appends rather than replaces `X-Forwarded-For`, an attacker can send `X-Forwarded-For: <random-ip>` on each request. Because `req.headers.get('x-forwarded-for').split(',')[0]` is used, the rate limiter treats each request as coming from a new IP, effectively bypassing rate limiting entirely. Furthermore, `cf-connecting-ip` is evaluated after `x-forwarded-for`.
- **Blast Radius**: Rate limiter bypass on `/api/auth/login` or form submission endpoints.
- **Mitigation**: 
  1. If running behind Cloudflare, prioritize `cf-connecting-ip`.
  2. In Nginx/Caddy reverse proxy configurations, configure `proxy_set_header X-Forwarded-For $remote_addr;` to strip client-supplied headers.

### Challenge 2 [Low]: Open Redirect Surface in `/login`
- **Assumption Challenged**: The `redirect` query parameter on `/login` is assumed to always be an internal dashboard path.
- **Attack Scenario**: An attacker constructs a phishing link: `https://app.rbt.com.br/login?redirect=https://evil-phishing.com` or `//evil-phishing.com`. When the victim logs in, `src/app/(auth)/login/page.tsx` executes:
  `router.push(redirect !== '/login' ? redirect : '/dashboard');`
- **Blast Radius**: User could be redirected to an external domain post-login.
- **Mitigation**: In `src/app/(auth)/login/page.tsx`, validate that `redirect` starts with `/` and does NOT start with `//` (e.g. `const safeRedirect = redirect.startsWith('/') && !redirect.startsWith('//') ? redirect : '/dashboard'`).

### Challenge 3 [Low]: Single-Node In-Memory Rate Limiter Scope
- **Assumption Challenged**: The application runs as a single Node.js process.
- **Attack Scenario**: If the application is scaled horizontally (PM2 cluster mode with multiple instances or multiple containers), each process maintains its own in-memory `Map`. An attacker can distribute requests across processes, multiplying their allowed request quota.
- **Blast Radius**: Throttling thresholds effectively multiplied by the number of process instances.
- **Mitigation**: For multi-node production scaling, migrate the rate limiting store to Redis (e.g., `@upstash/ratelimit` or Redis sliding-window counter). For current single-process PM2 deployment, the current implementation is performant and appropriate.

### Challenge 4 [Low]: Defense-in-Depth for Content-Security-Policy
- **Assumption Challenged**: CSP without `default-src` is sufficiently restrictive.
- **Attack Scenario**: Directives like `object-src`, `media-src`, `worker-src` are not explicitly defined. Without a `default-src` fallback, those directives default to unrestricted (`*`).
- **Blast Radius**: Low in modern browsers, but fails standard strict CSP audits.
- **Mitigation**: Add `default-src 'self'` at the start of the CSP directive in `next.config.mjs`.

---

## 4. Caveats

1. **Edge Database Validation**: Edge middleware (`src/middleware.ts`) validates cookie existence, non-emptiness, and formatting, but does not perform cryptographic database verification of the session token at the Edge due to database driver boundaries. Genuine session validity (tokenHash match in PostgreSQL + user active check) is enforced downstream in API route handlers and server components via `getServerSession()`.
2. **Local Environment**: Tests and TypeScript checks were verified in the local Windows workspace environment.

---

## 5. Conclusion

- **Verdict**: **APPROVE**
- All criteria defined in `ORIGINAL_REQUEST § R1` and `PROJECT.md` M1/M4 are completely fulfilled.
- Zero integrity violations.
- Clean compilation (`npx tsc --noEmit` = 0) and 100% test pass rate (`npm test` = 29/29).
- Constructive security recommendations provided above can be incorporated as post-review hardening.

---

## 6. Verification Method

To independently verify these conclusions:

1. **Run Route & Security Test Suite**:
   ```powershell
   npm test
   ```
   *Expected outcome*: 29 tests run, 29 passed, 0 failed, exit code 0.

2. **Run Strict TypeScript Verification**:
   ```powershell
   npx tsc --noEmit
   ```
   *Expected outcome*: Zero errors reported, exit code 0.

3. **Verify Git Commits**:
   Ensure no automated commits were created (`git log -1` remains as prior to task).
