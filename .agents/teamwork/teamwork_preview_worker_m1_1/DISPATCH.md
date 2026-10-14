# Dispatch: Worker 1 (Milestone 1 — Security & Access Protection in Layers)

## Scope & Objective
Implement Milestone 1 (Requisito R1) of the Orçamento RBT project based on the survey report from Explorer 1.

### 1. Route Protection Middleware (`src/middleware.ts`)
- Create Next.js Edge Middleware intercepting `/dashboard/:path*`.
- Verify presence of session cookie `rbt_orcamentos_session`.
- If missing, redirect to `/login?redirect=${encodeURIComponent(pathname)}` with status 307.
- Ensure static assets (`_next/static`, `_next/image`, `favicon.ico`, etc.) and public routes (`/login`, `/formulario/:token*`, `/api/:path*`) are not blocked.

### 2. HTTP Security Headers (`next.config.mjs`)
- Configure `async headers()` returning robust security headers on `/(.*)`:
  - `Content-Security-Policy`: script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'; connect-src 'self'; frame-ancestors 'none';
  - `X-Frame-Options`: `DENY`
  - `X-Content-Type-Options`: `nosniff`
  - `Referrer-Policy`: `strict-origin-when-cross-origin`
  - `Permissions-Policy`: `camera=(), microphone=(), geolocation=()`
  - `Strict-Transport-Security`: `max-age=63072000; includeSubDomains; preload`
- Retain `poweredByHeader: false`.

### 3. Rate Limiting Utility & API Hardening (`src/lib/rate-limit.ts` and API routes)
- Implement sliding-window / token-bucket in-memory rate limiter with auto-cleanup of expired entries.
- Wire into:
  - `POST /api/auth/login`: Limit 5 requests per 60 seconds per IP. Return HTTP 429 with `{ error: 'Muitas tentativas de login. Aguarde X segundos.', retryAfter: X }` and header `Retry-After: X`.
  - `POST /api/solicitacoes`: Limit 10 requests per 60 seconds per IP. Return HTTP 429 when exceeded.
  - `POST /api/formulario/[token]`: Limit 10 requests per 60 seconds per IP. Return HTTP 429 when exceeded.
- Wire into `GET /api/orcamentos/[id]/proposta`:
  - Validate session (using `getServerSession` from `src/lib/auth.ts`). Return 401 if unauthenticated, preventing data leakage.

## Exclusive Write Ownership
- `src/middleware.ts`
- `next.config.mjs`
- `src/lib/rate-limit.ts`
- `src/app/api/auth/login/route.ts`
- `src/app/api/solicitacoes/route.ts`
- `src/app/api/formulario/[token]/route.ts`
- `src/app/api/orcamentos/[id]/proposta/route.ts`

## Mandatory Integrity Warning
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## Mandatory Constraints
- NEVER run `git commit` or any git commit command. All changes must remain uncommitted for the user.
- Run `npx tsc --noEmit` and ensure 0 errors.

## Output
Write your handoff report to:
`c:/Users/aaaaa/OneDrive - Piatec/TI_CODIGOS/T.I/orçamento RBT/.agents/teamwork/teamwork_preview_worker_m1_1/handoff.md`
