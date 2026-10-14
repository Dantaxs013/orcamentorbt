# Handoff Report: Survey — Security, Middleware & Architecture

**Agent**: Explorer 1 (`teamwork_preview_explorer_survey_1`)  
**Scope**: Next.js 14 codebase survey, security headers, middleware / route guards, authentication flows, rate limiting, and project integrity.  
**Target File**: `c:/Users/aaaaa/OneDrive - Piatec/TI_CODIGOS/T.I/orçamento RBT/.agents/teamwork/teamwork_preview_explorer_survey_1/handoff.md`  

---

## 1. Observation

### 1.1 Project Structure, Versions & Dependencies
- **File**: `package.json` (lines 18–43)
  - Next.js version: `"next": "^14.2.15"`
  - React version: `"react": "^18.3.1"`, `"react-dom": "^18.3.1"`
  - TypeScript version: `"typescript": "^5.6.3"`
  - ORM / Database: `"@prisma/client": "^5.21.1"`, `"prisma": "^5.21.1"`
  - PDF generation: `"@react-pdf/renderer": "^3.4.4"`
  - Security / Hashing: `"bcryptjs": "^2.4.3"`, `"@types/bcryptjs": "^2.4.6"`
  - Email: `"nodemailer": "^6.9.15"`, `"@types/nodemailer": "^6.4.16"`
  - Styling: `"tailwindcss": "^3.4.14"`, `"clsx": "^2.1.1"`, `"tailwind-merge": "^2.5.4"`
  - Validation: `"zod": "^3.23.8"`
  - Icons: `"lucide-react": "^0.453.0"`
  - Noticeable absences: No rate-limiting library (e.g. `lru-cache`, `rate-limiter-flexible`, `@upstash/ratelimit`), no JWT/jose libraries, no testing framework (Jest, Vitest, Playwright).
- **Directory Layout**:
  - `src/app/`: Next.js 14 App Router layout (`(auth)/login`, `dashboard`, `formulario/[token]`, `api/*`).
  - `src/components/`: `layout/dashboard-shell.tsx`, `orcamentos/*`, `ui/*`.
  - `src/lib/`: `auth.ts`, `session.ts`, `db.ts`, `email.ts`, `pdf/proposta-pdf.tsx`, `validations/orcamento.schema.ts`.
  - `prisma/`: `schema.prisma`, `seed.ts`.

### 1.2 Configuration & HTTP Security Headers
- **File**: `next.config.mjs` (lines 1–8 verbatim):
  ```javascript
  /** @type {import('next').NextConfig} */
  const nextConfig = {
    reactStrictMode: true,
    poweredByHeader: false,
  };

  export default nextConfig;
  ```
- **Observed Header State**:
  - `poweredByHeader: false` suppresses the `X-Powered-By: Next.js` header.
  - **Zero HTTP Security Headers** configured: No Content-Security-Policy (CSP), Strict-Transport-Security (HSTS), X-Frame-Options, X-Content-Type-Options, Referrer-Policy, or Permissions-Policy.

### 1.3 Middleware & Route Guards
- **File Search**:
  - Pattern search `*middleware*` across the repository revealed only internal node_modules templates.
  - Neither `src/middleware.ts` nor root `middleware.ts` exists.
- **Route Guarding Analysis**:
  - `src/app/dashboard/page.tsx` (lines 16–21):
    ```typescript
    export default async function DashboardPage() {
      const session = await getServerSession();
      if (!session) {
        redirect('/login');
      }
    ```
  - `src/app/dashboard/orcamentos/[id]/page.tsx` (lines 13–18):
    ```typescript
    export default async function DetalhesOrcamentoPage({ params }: PageProps) {
      const session = await getServerSession();
      if (!session) {
        redirect('/login');
      }
    ```
  - `src/app/page.tsx` (lines 4–12): Checks `getServerSession()`; redirects to `/login` if null or `/dashboard` if authenticated.
  - **Vulnerability in API Routes**:
    - `src/app/api/orcamentos/[id]/proposta/route.ts` (lines 18–35): The `GET` handler generates and returns the full proposal PDF with commercial values, lead details, and specifications, but **does NOT call `getServerSession()` or validate any token**. Anyone who knows or discovers an `orcamentoId` can download the confidential proposal PDF directly.
    - `POST` on `/api/orcamentos/[id]/proposta` and `PATCH` on `/api/orcamentos/[id]/status` enforce `getServerSession()`.
    - `POST` on `/api/solicitacoes` is open by design (to receive initial quote requests), but lacks rate limiting.
    - `GET` on `/api/solicitacoes` enforces `getServerSession()`.

### 1.4 Authentication Mechanism
- **File**: `src/lib/session.ts` (lines 1–133) & `src/lib/auth.ts` (lines 1–32)
  - Password hashing: `bcrypt.hash(password, salt)` with 10 rounds (`src/lib/auth.ts:18`).
  - Session generation: `crypto.randomBytes(32).toString('hex')` generates a 64-character raw hex token.
  - Session storage: `tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex')` stored in table `sessions` (`userId`, `tokenHash`, `expiresAt`, `ipAddress`, `userAgent`).
  - Cookie name: `rbt_orcamentos_session` (`src/lib/session.ts:6`).
  - Cookie duration: 12 hours (`12 * 60 * 60 = 43200` seconds).
  - Flags: `Path=/; HttpOnly; SameSite=Lax; Max-Age=43200; [Secure in production]` (`src/lib/session.ts:110–114`).
  - Session retrieval: `getServerSession()` reads the cookie via `cookies().get(SESSION_COOKIE_NAME)?.value` and validates against PostgreSQL using Prisma.

### 1.5 Magic Link Mechanism
- **Files**: `src/app/api/solicitacoes/route.ts` (lines 63–73), `src/app/api/formulario/[token]/route.ts` (lines 23–72, 95–190), `src/app/formulario/[token]/page.tsx`
  - Token creation: `crypto.randomUUID()` generates a UUID v4.
  - Expiration: 7 days (`Date.now() + 7 * 24 * 60 * 60 * 1000`).
  - Invalidation: `used = true` updated atomically in a Prisma `$transaction` once the technical form is submitted.
  - Re-use prevention: Both `GET` and `POST` in `/api/formulario/[token]` check `if (magicLink.used || magicLink.orcamento.respostaFormulario)` and block duplicate submissions with HTTP 409 or alreadySubmitted payload.

### 1.6 Rate Limiting
- **Global Assessment**:
  - There is **zero rate limiting** across all endpoints.
  - `POST /api/auth/login` (`src/app/api/auth/login/route.ts`): Vulnerable to brute-force credential attacks. Bcrypt comparison consumes ~70-100ms CPU per attempt, making it a high-risk vector for CPU exhaustion DoS.
  - `POST /api/solicitacoes` (`src/app/api/solicitacoes/route.ts`): Publicly exposed endpoint generating database records and sending emails via SMTP (`sendMagicLinkEmail`). An attacker can flood this endpoint, exhausting database connections and causing SMTP provider blacklisting.
  - `POST /api/formulario/[token]` and `GET /api/formulario/[token]`: Subject to token enumeration and submission spam.

### 1.7 TypeScript & Build Status
- **Command execution**: `npx tsc --noEmit`
- **Output**: Exited with code `0`. Zero type errors.

---

## 2. Logic Chain

1. **Absence of Perimeter Guard (Middleware)**:
   - *Observation*: Neither `src/middleware.ts` nor root `middleware.ts` exists. Protection is only performed via `getServerSession()` inside React Server Components (`/dashboard/page.tsx` and `/dashboard/orcamentos/[id]/page.tsx`).
   - *Reasoning*: Because protection is only applied at the page level, every unauthenticated request initiates the Next.js server-side component rendering pipeline, parses cookies, and contacts the database before redirecting. Furthermore, any new routes or API endpoints created under `/dashboard` without manual guard calls are left unprotected.
   - *Conclusion*: A Next.js `middleware.ts` interceptor is necessary to enforce perimeter defense, intercept requests targeting `/dashboard/:path*`, check for `rbt_orcamentos_session`, and immediately issue a 307/302 redirect to `/login?redirect=...`.

2. **Absence of Rate Limiting & Threat Exposure**:
   - *Observation*: None of the route handlers (`/api/auth/login`, `/api/solicitacoes`, `/api/formulario/[token]`) track request frequency or IP addresses.
   - *Reasoning*:
     - `/api/auth/login` uses computationally heavy bcrypt verification. Without rate limits, automated tools can execute thousands of guesses, stalling the Node.js event loop or guessing weak passwords.
     - `/api/solicitacoes` creates rows in `leads`, `orcamentos`, `magic_links`, `status_logs` and invokes `sendMagicLinkEmail`. Without rate limits, automated scripts can flood the corporate email service and the PostgreSQL database.
   - *Conclusion*: A lightweight, memory-efficient sliding-window or token-bucket rate limiter must be implemented (e.g. `src/lib/rate-limit.ts`) and applied to `/api/auth/login` (e.g. 5 attempts / 60s), `/api/solicitacoes` (e.g. 5 submissions / 60s per IP), and `/api/formulario/[token]` (e.g. 10 requests / 60s per IP), returning HTTP 429 with `Retry-After` header.

3. **HTTP Security Headers Deficiency**:
   - *Observation*: `next.config.mjs` contains only `reactStrictMode: true` and `poweredByHeader: false`.
   - *Reasoning*: Without explicit HTTP security headers, browsers will not enforce clickjacking defense (`X-Frame-Options`), MIME sniffing defense (`X-Content-Type-Options`), secure protocol upgrades (`Strict-Transport-Security`), or resource execution restrictions (`Content-Security-Policy`).
   - *Conclusion*: An `async headers()` configuration must be added to `next.config.mjs` to inject standard headers into all responses (`/:path*`), specifically:
     - `X-Frame-Options: DENY`
     - `X-Content-Type-Options: nosniff`
     - `Referrer-Policy: strict-origin-when-cross-origin`
     - `Permissions-Policy: camera=(), microphone=(), geolocation=()`
     - `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`
     - `Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self'; frame-ancestors 'none';`

4. **Information Disclosure in PDF Endpoint**:
   - *Observation*: `GET /api/orcamentos/[id]/proposta` at lines 18–35 does not verify `getServerSession()`.
   - *Reasoning*: While UUIDs are hard to guess, an unprotected endpoint serving commercial quotes violates principle of least privilege and data privacy (LGPD / corporate confidentiality).
   - *Conclusion*: The endpoint must either require `getServerSession()` (for staff viewing from dashboard) or validate an authorized customer token.

---

## 3. Caveats

1. **Edge Runtime vs. Prisma in Next.js Middleware**:
   - In Next.js 14, `middleware.ts` runs strictly in the Edge runtime. Prisma Client cannot query PostgreSQL directly from the Edge runtime without driver adapters (e.g. `@prisma/adapter-pg` over WebSocket) or Prisma Accelerate.
   - Therefore, `middleware.ts` should perform **cookie presence and token format validation** as the perimeter gate (redirecting requests lacking `rbt_orcamentos_session`), while full database session verification and user deserialization continues safely in Node.js runtime inside Server Components / Route Handlers via `getServerSession()`.
2. **In-Memory Rate Limiting Scope**:
   - In multi-instance / serverless horizontal scaling, an in-memory rate limiter stores state per process instance. For single-process deployments (such as PM2, Docker single-container, or standalone Next.js server), an in-memory sliding window is 100% effective, zero-dependency, and avoids requiring an external Redis instance.
3. **External Network / Server MCP Execution**:
   - Investigation was conducted exclusively via local inspection tools. No server MCP operations or Git commits were made, complying with workspace rules.

---

## 4. Conclusion & Actionable Blueprint

### 4.1 Required Implementation Blueprint

#### Component A: Route Middleware (`src/middleware.ts`)
- **Location**: `src/middleware.ts`
- **Specification**:
  - Intercept `/dashboard/:path*`.
  - Check `request.cookies.get('rbt_orcamentos_session')?.value`.
  - If missing or empty, construct redirect response to `/login?redirect=${encodeURIComponent(pathname)}`.
  - Exclude Next.js static assets (`_next/static`, `_next/image`, `favicon.ico`, static files).
  - Also append security headers to the response if needed, or coordinate with `next.config.mjs`.

#### Component B: HTTP Security Headers (`next.config.mjs`)
- **Location**: `next.config.mjs`
- **Specification**:
  - Implement `async headers()` returning rules for source `/:path*`.
  - Headers:
    - `X-DNS-Prefetch-Control: on`
    - `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`
    - `X-Frame-Options: DENY`
    - `X-Content-Type-Options: nosniff`
    - `Referrer-Policy: strict-origin-when-cross-origin`
    - `Permissions-Policy: camera=(), microphone=(), geolocation=(), interest-cohort=()`
    - `Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self'; frame-ancestors 'none';`

#### Component C: In-Memory Rate Limiting Utility (`src/lib/rate-limit.ts`)
- **Location**: `src/lib/rate-limit.ts`
- **Specification**:
  - Sliding-window counter with automatic TTL purge.
  - Function: `rateLimit(key: string, limit: number, windowMs: number): { success: boolean; limit: number; remaining: number; resetMs: number }`.
  - IP extractor utility helper `getClientIp(req: NextRequest): string`.
  - Wire into:
    1. `src/app/api/auth/login/route.ts`: limit = 5 per 60s per IP (prevent brute-force).
    2. `src/app/api/solicitacoes/route.ts`: limit = 5 per 60s per IP (prevent quote spam & SMTP flooding).
    3. `src/app/api/formulario/[token]/route.ts`: limit = 10 per 60s per IP (prevent form submission abuse).

#### Component D: PDF Endpoint Protection
- **Location**: `src/app/api/orcamentos/[id]/proposta/route.ts`
- **Specification**: Ensure `GET` handler checks `getServerSession()` before rendering PDF, returning 401 if unauthorized.

---

## 5. Verification Method

To independently verify the current and resolved state:

1. **Verify Absence of Middleware (Current State)**:
   - Check file existence: `Test-Path "src/middleware.ts"` or `view_file` on `src/middleware.ts`. Fails because file does not exist.
   - When implemented, accessing `/dashboard` without `rbt_orcamentos_session` cookie must return HTTP 307 / redirect to `/login`.
2. **Verify Security Headers**:
   - Inspect `next.config.mjs`. Confirm presence of `headers()` returning `Content-Security-Policy`, `X-Frame-Options`, `X-Content-Type-Options`, `Strict-Transport-Security`.
3. **Verify Rate Limiting Behavior**:
   - Execute rapid POST requests against `/api/auth/login` (6+ consecutive requests within 60s).
   - The 6th request must respond with HTTP 429 Too Many Requests and include a `Retry-After` header.
4. **Verify TypeScript & Build Integrity**:
   - Execute `npx tsc --noEmit` from project root (`c:/Users/aaaaa/OneDrive - Piatec/TI_CODIGOS/T.I/orçamento RBT`). Must exit with code 0.
   - Execute `npm run build`. Next.js build compilation must complete successfully with all static and dynamic routes compiled.
