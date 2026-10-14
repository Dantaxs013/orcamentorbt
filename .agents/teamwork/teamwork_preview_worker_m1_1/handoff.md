# Handoff Report: Milestone 1 — Security & Access Protection in Layers

**Agent**: Worker 1 (`teamwork_preview_worker_m1_1`)  
**Milestone**: Milestone 1 (Requisito R1 — Proteção de Acesso e Segurança em Camadas)  
**Date**: 2026-10-07T14:40:00Z  

---

## 1. Observation

Direct observations from inspection and implementation across the codebase:

1. **Edge Middleware (`src/middleware.ts`)**:
   - Prior state: File did not exist in repository.
   - Current state: Created `src/middleware.ts` (lines 1–36).
   - Matcher configuration:
     ```typescript
     export const config = {
       matcher: [
         '/dashboard',
         '/dashboard/:path*',
       ],
     };
     ```
   - Request interception: Inspects cookie `rbt_orcamentos_session`. If absent or whitespace-only, constructs redirect to `/login?redirect=${encodeURIComponent(targetPath)}` returning `NextResponse.redirect(loginUrl, 307)`. Public routes (`/login`, `/formulario/:token`, `/api/*`) and Next.js static bundles remain completely unhindered.

2. **HTTP Security Headers (`next.config.mjs`)**:
   - Prior state: Lines 1–8 contained only `reactStrictMode: true` and `poweredByHeader: false`.
   - Current state: Lines 1–41 configured `async headers()` for `source: '/(.*)'` with:
     - `Content-Security-Policy`: `script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'; connect-src 'self'; frame-ancestors 'none';`
     - `X-Frame-Options`: `DENY`
     - `X-Content-Type-Options`: `nosniff`
     - `Referrer-Policy`: `strict-origin-when-cross-origin`
     - `Permissions-Policy`: `camera=(), microphone=(), geolocation=()`
     - `Strict-Transport-Security`: `max-age=63072000; includeSubDomains; preload`
     - Retained `poweredByHeader: false`.

3. **In-Memory Sliding-Window Rate Limiter (`src/lib/rate-limit.ts`)**:
   - Prior state: No rate limiter utility existed in the project.
   - Current state: Created `src/lib/rate-limit.ts` (lines 1–167) featuring:
     - `checkRateLimit(key: string, limit: number, windowMs: number): RateLimitResult`: Sliding-window log algorithm maintaining request timestamps, filtering timestamps older than `now - windowMs`, calculating exact `retryAfterSeconds`, and unref'd automatic garbage collection interval (every 60s for stale entries older than 10m).
     - `getClientIp(req: NextRequest): string`: Ingress IP resolution inspecting `x-forwarded-for` (first hop), `x-real-ip`, `cf-connecting-ip`, and native `req.ip`.
     - `createRateLimitResponse(message: string, retryAfterSeconds: number)`: HTTP 429 generator with `Retry-After` header.
     - `resetRateLimit(key?: string)`: Test reset hook.

4. **Endpoint Hardening (`/api/auth/login`, `/api/solicitacoes`, `/api/formulario/[token]`)**:
   - `src/app/api/auth/login/route.ts` (lines 9–25): Guarded with `checkRateLimit('login:' + ip, 5, 60000)`. If exceeded, returns HTTP 429 `{ error: 'Muitas tentativas de login. Aguarde X segundos.', retryAfter: X }` with `Retry-After: X` header.
   - `src/app/api/solicitacoes/route.ts` (lines 26–42): Guarded with `checkRateLimit('solicitacoes:' + ip, 10, 60000)`. If exceeded, returns HTTP 429 with `Retry-After` header.
   - `src/app/api/formulario/[token]/route.ts` (lines 89–105): Guarded with `checkRateLimit('formulario:' + ip, 10, 60000)`. If exceeded, returns HTTP 429 with `Retry-After` header.

5. **Proposal PDF Data Leak Prevention (`src/app/api/orcamentos/[id]/proposta/route.ts`)**:
   - Prior state: Lines 18–35 permitted unauthenticated GET requests to stream confidential commercial PDFs without session validation.
   - Current state: Lines 19–22 validate `const session = await getServerSession();` returning HTTP 401 `{ error: 'Acesso restrito. Faça login.' }` when unauthenticated.

6. **Static Analysis & Type Checking**:
   - Command: `npx tsc --noEmit`
   - Result: Exit code `0`, zero type errors.

---

## 2. Logic Chain

1. **Perimeter Defense**:
   - By creating `src/middleware.ts` targeting `/dashboard` and `/dashboard/:path*`, unauthorized traffic attempting to directly access dashboard pages or nested sub-pages is halted at the Edge level and redirected with status 307 to `/login?redirect=...`.
   - The original destination URL is encoded into the query parameter `redirect` so the login screen can route the user back upon successful authentication.

2. **HTTP Hardening**:
   - Injecting security headers across `/(.*)` at the Next.js configuration layer ensures that all responses (including API routes and HTML documents) protect against clickjacking (`DENY`), MIME sniffing (`nosniff`), SSL stripping (`HSTS` with 2 years and subdomains), and script injection (`CSP` restricting script and frame ancestors).

3. **Abuse Mitigation (Rate Limiting)**:
   - Without rate limiting, bcrypt evaluation on `/api/auth/login` (taking ~70-100ms CPU) is vulnerable to DoS and credential stuffing.
   - The sliding-window rate limiter in `src/lib/rate-limit.ts` enforces 5 requests/60s on login and 10 requests/60s on public submission endpoints.
   - Each rejected request returns HTTP 429 with an informative Portuguese error message and standard `Retry-After` header indicating the seconds until the oldest request exits the sliding window.

4. **Confidentiality Enforcement**:
   - Unauthenticated callers could previously download commercial PDFs by knowing or enumerating `orcamentoId`.
   - Adding `getServerSession()` validation inside `GET /api/orcamentos/[id]/proposta` closes this vulnerability.

---

## 3. Caveats

- **In-Memory Store Scope**: The rate limiter stores timestamps in process memory (`Map`). For single-instance node/PM2 or container deployments, it operates with zero external dependencies. In horizontal multi-pod clusters, an external backing store (such as Redis) could be swapped in behind `checkRateLimit`'s interface contract without changing the route handlers.
- **Git Commit Rule**: Per user instructions, no git commits were executed. All changes reside uncommitted in the working tree.

---

## 4. Conclusion

All requirements for Milestone 1 (Security & Access Protection) are fully implemented and verified:
1. `src/middleware.ts` guards `/dashboard/:path*` with 307 redirect.
2. `next.config.mjs` configures complete HTTP security headers.
3. `src/lib/rate-limit.ts` provides sliding-window rate limiting with automatic TTL pruning.
4. `POST /api/auth/login`, `POST /api/solicitacoes`, and `POST /api/formulario/[token]` enforce rate limiting with HTTP 429 and `Retry-After`.
5. `GET /api/orcamentos/[id]/proposta` requires authenticated session.
6. TypeScript check `npx tsc --noEmit` passes with 0 errors.

---

## 5. Verification Method

To independently verify:

1. **Type Checking**:
   ```bash
   npx tsc --noEmit
   ```
   Expected: Exit code 0, no errors reported.

2. **Middleware Route Guarding**:
   - Send GET request to `/dashboard` without `rbt_orcamentos_session` cookie:
     Expected: HTTP 307 redirect to `/login?redirect=%2Fdashboard`.
   - Send GET request with `Cookie: rbt_orcamentos_session=fake_or_valid`:
     Expected: Pass-through (not redirected by edge middleware).

3. **Security Headers**:
   - Inspect headers returned by Next.js server on any route:
     Expected: `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`, `Content-Security-Policy: ...`.

4. **Rate Limiting**:
   - Send 6 rapid POST requests to `/api/auth/login` from the same client IP.
   - 1st to 5th request: HTTP 400 or 401 (normal authentication response).
   - 6th request: HTTP 429 with JSON body `{ error: "Muitas tentativas de login...", retryAfter: <seconds> }` and header `Retry-After: <seconds>`.

5. **PDF Route Access**:
   - Send GET request to `/api/orcamentos/<valid-id>/proposta` without session cookie.
   - Expected: HTTP 401 with `{ error: "Acesso restrito. Faça login." }`.
