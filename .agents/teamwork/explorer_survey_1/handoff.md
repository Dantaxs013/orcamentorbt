# Handoff Report: Survey Explorer 1 — Orçamentos Codebase, Auth & Database Survey

**Working Directory**: `c:/Users/aaaaa/OneDrive - Piatec/TI_CODIGOS/T.I/orçamento RBT/.agents/teamwork/explorer_survey_1`  
**Date**: 2026-10-20T18:46:00Z  
**Target Project**: Orçamentos RBT (`c:\Users\aaaaa\OneDrive - Piatec\TI_CODIGOS\T.I\orçamento RBT`)  
**Mission**: Comprehensive survey of framework, project layout, authentication system, database models, existing dashboard/API routes, and email integration to inform the unified RBT portal integration.

---

## 1. Observation

### 1.1 Framework, Configuration & Structure
* **`package.json` (`c:\Users\aaaaa\OneDrive - Piatec\TI_CODIGOS\T.I\orçamento RBT\package.json`)**:
  - `name`: `"rbt-orcamentos"` (line 2)
  - Next.js: `"next": "^14.2.15"` (line 25), runtime compiler `Next.js 14.2.35`
  - React: `"react": "^18.3.1"`, `"react-dom": "^18.3.1"` (lines 27-28)
  - Prisma: `"@prisma/client": "^5.21.1"`, `"prisma": "^5.21.1"` (lines 20, 40)
  - Key Dependencies:
    - `"@react-pdf/renderer": "^3.4.4"` (line 21)
    - `"bcryptjs": "^2.4.3"` (line 22)
    - `"clsx": "^2.1.1"` (line 23)
    - `"lucide-react": "^0.453.0"` (line 24)
    - `"nodemailer": "^6.9.15"` (line 26)
    - `"tailwind-merge": "^2.5.4"` (line 29)
    - `"zod": "^3.23.8"` (line 30)
  - Dev Dependencies: `"tailwindcss": "^3.4.14"`, `"tsx": "^4.19.1"`, `"typescript": "^5.6.3"` (lines 41-43)
  - Scripts: `"test": "tsx scripts/verify-security-routes.ts"`, `"build": "next build"` (lines 7, 10)
* **`tsconfig.json` (`c:\Users\aaaaa\OneDrive - Piatec\TI_CODIGOS\T.I\orçamento RBT\tsconfig.json`)**:
  - Target: `"es2020"` (line 3)
  - Path alias: `"@/*": ["./src/*"]` (line 22)
  - Strict mode: `"strict": true` (line 7)
* **`tailwind.config.ts` (`c:\Users\aaaaa\OneDrive - Piatec\TI_CODIGOS\T.I\orçamento RBT\tailwind.config.ts`)**:
  - Content paths: `./src/pages/**/*.{js,ts,jsx,tsx,mdx}`, `./src/components/**/*.{js,ts,jsx,tsx,mdx}`, `./src/app/**/*.{js,ts,jsx,tsx,mdx}` (lines 5-7)
  - RBT Theme Colors (lines 12-33):
    - `rbt.red`: `'#BA1A1A'`
    - `rbt['red-hover']`: `'#991B1B'`
    - `rbt['red-light']`: `'#FEF2F2'`
    - `rbt['red-border']`: `'#FECACA'`
    - `rbt.black`: `'#111827'`
    - `rbt.dark`: `'#0A0F1D'`
    - `rbt.navy`: `'#1E3A5F'`
    - `rbt.steel`: `'#2D4B73'`
    - `rbt.accent`: `'#BA1A1A'`
    - `rbt.gold`: `'#D97706'`
    - Tonal scale: `rbt[50]` (`#F0F4F8`) through `rbt[900]` (`#102A43`)
* **`next.config.mjs` (`c:\Users\aaaaa\OneDrive - Piatec\TI_CODIGOS\T.I\orçamento RBT\next.config.mjs`)**:
  - `poweredByHeader: false` (line 4)
  - `headers()` applied to `'/(.*)'` (lines 8-36): `Content-Security-Policy`, `X-Frame-Options: 'DENY'`, `X-Content-Type-Options: 'nosniff'`, `Referrer-Policy: 'strict-origin-when-cross-origin'`, `Permissions-Policy`, `Strict-Transport-Security: 'max-age=63072000; includeSubDomains; preload'`
* **Root Layout & Navigation**:
  - `src/app/layout.tsx`: Mounts `ToastProvider` globally inside `<body>` with styling `min-h-screen bg-slate-100 text-slate-900` (lines 17-19).
  - `src/app/page.tsx`: Root route calls `getServerSession()`. If not authenticated -> `redirect('/login')`; if authenticated -> `redirect('/dashboard')` (lines 5-11).
  - `src/components/layout/dashboard-shell.tsx`: 307 lines. Implements responsive sidebar (`#111827`), brand header with `RBTLogo`, user profile badge with role formatting, quick logout button, top nav header, and footer attribution. Currently defines `navItems = [{ href: '/dashboard', label: 'Orçamentos', icon: LayoutDashboard }, { href: '/dashboard/usuarios', label: 'Equipe & Usuários', icon: Users }]` (lines 34-37).

---

### 1.2 Authentication System & Access Control
* **Authentication Architecture**:
  - Custom session-based system (no NextAuth dependency; implemented directly with Node `crypto`, `bcryptjs`, and Prisma).
  - File: `src/lib/auth.ts`:
    - Roles: `type UserRole = 'ADMIN' | 'ORCAMENTISTA'` (line 3)
    - Interface `AuthUser`: `{ id: string; name: string; email: string; role: UserRole; ativo: boolean; }` (lines 5-11)
    - Password hashing: `bcrypt.hash(password, 10)` (lines 16-19)
    - Password verification: `bcrypt.compare(password, hash)` (lines 24-27)
* **Session Lifecycle (`src/lib/session.ts`)**:
  - Cookie name: `rbt_orcamentos_session` (line 6)
  - Session TTL: 12 hours (`SESSION_DURATION_SECONDS = 12 * 60 * 60`, line 7)
  - Token Generation: `crypto.randomBytes(32).toString('hex')` (line 20)
  - Storage: SHA-256 hash `tokenHash = crypto.createHash('sha256').update(token).digest('hex')` stored in SQLite `sessions` table (lines 9-11, 24-32)
  - Cookie flags: `Path=/; HttpOnly; SameSite=Lax; Max-Age=43200` (+ `Secure` in production) (lines 110-114)
  - Session verification: `validateSession(rawToken)` looks up `tokenHash` in `prisma.session`, validates expiration date and `user.ativo`, returns `{ session, user }` (lines 40-89).
  - Server Component helper: `getServerSession()` reads `cookies().get(SESSION_COOKIE_NAME)` and validates against the database (lines 119-132).
* **Edge Route Protection Middleware (`src/middleware.ts`)**:
  - Matcher: `['/dashboard', '/dashboard/:path*']` (lines 30-35)
  - Logic: Checks `request.cookies.get('rbt_orcamentos_session')?.value`. If absent or whitespace, redirects to `/login?redirect=${pathname}${search}` with status 307 (lines 14-25).
* **Login & Logout Flows**:
  - Login Page: `src/app/(auth)/login/page.tsx` (178 lines). Visual RBT branding, corporate inputs with auto-complete protection, error alerts, submit button with loading state. Submits to `POST /api/auth/login`.
  - Login API: `src/app/api/auth/login/route.ts` (82 lines). Rate-limited to 5 requests per 60s per IP. Finds user by lowercase email, checks `user.ativo`, verifies bcrypt hash, calls `createSession()`, returns JSON `{ success: true, user, redirectUrl: '/dashboard' }` with `Set-Cookie` header.
  - Logout API: `src/app/api/auth/logout/route.ts` (14 lines). Deletes session from SQLite database via `destroySession(token)` and deletes browser cookie `rbt_orcamentos_session`.

---

### 1.3 Database & Models
* **Database Provider & Connection**:
  - Provider: SQLite (`prisma/schema.prisma:6`)
  - Connection String: `DATABASE_URL="file:./dev.db"` (`.env:1`)
  - Database file: `prisma/dev.db` exists in the filesystem (135,168 bytes).
  - Migration management: Managed via `prisma db push` and `prisma/seed.ts` (there is no `prisma/migrations` folder).
* **Models in `prisma/schema.prisma`**:
  1. `User` (`@@map("users")`, lines 10-25):
     ```prisma
     model User {
       id           String      @id @default(uuid())
       name         String
       email        String      @unique
       passwordHash String
       role         String      @default("ORCAMENTISTA")
       ativo        Boolean     @default(true)
       createdAt    DateTime    @default(now())
       updatedAt    DateTime    @updatedAt

       sessions     Session[]
       orcamentos   Orcamento[]
       logs         StatusLog[]

       @@map("users")
     }
     ```
     *Critical finding*: Fields `acessoOrcamento` and `acessoMedicao` do NOT exist yet on the `User` model.
  2. `Session` (`@@map("sessions")`, lines 27-41):
     ```prisma
     model Session {
       id        String   @id @default(uuid())
       userId    String
       tokenHash String   @unique
       expiresAt DateTime
       ipAddress String?
       userAgent String?
       createdAt DateTime @default(now())

       user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
       @@index([tokenHash])
       @@index([userId])
       @@map("sessions")
     }
     ```
  3. `Lead` (`@@map("leads")`, lines 43-56): Customer basic details.
  4. `Orcamento` (`@@map("orcamentos")`, lines 58-79): Protocol number (`numeroProtocolo`), status enum string, foreign keys to `Lead` and `User` (`orcamentistaId`).
  5. `MagicLink` (`@@map("magic_links")`, lines 81-92): Unique token, 7-day expiration, `used` flag.
  6. `RespostaFormulario` (`@@map("respostas_formulario")`, lines 94-130): Technical questionnaire details (foundation type, pile quantities, depth, soil report status).
  7. `PropostaComercial` (`@@map("propostas_comerciais")`, lines 132-152): Pricing breakdown (labor, materials, extras, BDI margin %, total value, payment terms, PDF path).
  8. `StatusLog` (`@@map("status_logs")`, lines 154-170): Audit history of budget status changes.
* **Seed Data (`prisma/seed.ts`)**:
  - Default password for seeded users: `Rbt@2026` (line 9).
  - Admin: `admin@rbt.com.br` (`role: 'ADMIN'`, lines 12-27).
  - Orcamentista: `orcamentista@rbt.com.br` (`role: 'ORCAMENTISTA'`, lines 30-45).

---

### 1.4 Existing Routes under `/dashboard`, API Endpoints & Email System
* **Routes under `/dashboard`**:
  - `GET /dashboard` (`src/app/dashboard/page.tsx`, 164 lines):
    - Server Component fetching all budgets with associated Lead, Orcamentista, MagicLink, RespostaFormulario, and PropostaComercial.
    - KPI Metrics cards: Total Geral, Link Pendente, Em Análise, Propostas Enviadas, Aprovados.
    - Quick link copy card: `LinkPublicoCard`.
    - Modal button: `NovaSolicitacaoModal`.
    - Kanban component: `<KanbanBoard initialOrcamentos={...} />` across 7 statuses (`NOVO`, `EM_ANALISE`, `VISITA_TECNICA`, `PROPOSTA_ENVIADA`, `APROVADO`, `REJEITADO`, `CANCELADO`).
  - `GET /dashboard/orcamentos/[id]` (`src/app/dashboard/orcamentos/[id]/page.tsx`, 62 lines):
    - Detail view for budget evaluation, viewing technical answers submitted by client, assigning orcamentista, calculating pricing proposal, generating PDF, and dispatching commercial proposal.
  - `GET /dashboard/usuarios` (`src/app/dashboard/usuarios/page.tsx`, 38 lines):
    - User management interface rendering `<UsuariosClient initialUsers={users} currentUser={session.user} />`.
    - User creation modal, inline active/inactive toggle, role change, password reset, and user deletion.
* **Other App Routes**:
  - `GET /` (`src/app/page.tsx`): Authenticated redirector (`/login` or `/dashboard`).
  - `GET /login` (`src/app/(auth)/login/page.tsx`): Login interface.
  - `GET /formulario` (`src/app/formulario/page.tsx`): Public request form.
  - `GET /formulario/[token]` (`src/app/formulario/[token]/page.tsx`): Magic Link response form.
* **API Endpoints**:
  - `POST /api/auth/login` (`src/app/api/auth/login/route.ts`): Rate limited (5/min). Creates session, sets cookie.
  - `POST /api/auth/logout` (`src/app/api/auth/logout/route.ts`): Destroys session, deletes cookie.
  - `GET /api/auth/me` (`src/app/api/auth/me/route.ts`): Validates session and returns current user JSON.
  - `POST /api/solicitacoes` (`src/app/api/solicitacoes/route.ts`): Rate limited (10/min). Creates Lead, creates Orcamento (`AGUARDANDO_CLIENTE`), generates MagicLink token, dispatches MagicLink email.
  - `GET /api/solicitacoes` (`src/app/api/solicitacoes/route.ts`): Authenticated list of all budgets.
  - `POST /api/formulario/publico` (`src/app/api/formulario/publico/route.ts`): Rate limited (5/min). Direct public form submission.
  - `GET /api/formulario/[token]` (`src/app/api/formulario/[token]/route.ts`): Validates token and returns budget context.
  - `POST /api/formulario/[token]` (`src/app/api/formulario/[token]/route.ts`): Rate limited (5/min). Submits client technical data, marks MagicLink as used, updates status to `AGUARDANDO_ANALISE`.
  - `PATCH /api/orcamentos/[id]` (`src/app/api/orcamentos/[id]/route.ts`): Updates assigned `orcamentistaId`.
  - `DELETE /api/orcamentos/[id]` (`src/app/api/orcamentos/[id]/route.ts`): Deletes budget and orphaned lead.
  - `PATCH /api/orcamentos/[id]/status` (`src/app/api/orcamentos/[id]/status/route.ts`): Updates budget status and logs audit entry.
  - `GET /api/orcamentos/[id]/proposta` (`src/app/api/orcamentos/[id]/proposta/route.ts`): Session protected. Generates and streams PDF `application/pdf`.
  - `POST /api/orcamentos/[id]/proposta` (`src/app/api/orcamentos/[id]/proposta/route.ts`): Session protected. Upserts proposal pricing, generates PDF buffer, optionally sends email to client, logs status change.
  - `GET /api/usuarios` (`src/app/api/usuarios/route.ts`): Session protected. Returns user list with budget count.
  - `POST /api/usuarios` (`src/app/api/usuarios/route.ts`): ADMIN protected. Creates user with bcrypt hash and triggers `sendNovoUsuarioEmail`.
  - `PATCH /api/usuarios/[id]` (`src/app/api/usuarios/[id]/route.ts`): ADMIN protected. Updates user properties.
  - `DELETE /api/usuarios/[id]` (`src/app/api/usuarios/[id]/route.ts`): ADMIN protected. Deletes user account.
* **Email Sending Integration (`src/lib/email.ts`) — MUST STAY PRESERVED**:
  - File: `src/lib/email.ts` (365 lines).
  - Transporter configuration: Uses `nodemailer.createTransport` reading `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_SECURE`, `SMTP_FROM` from environment variables (lines 18-46).
  - Graceful Fallback: When SMTP credentials are unconfigured or contain dummy domains (`exemplo.com`), seamlessly logs formatted simulation console blocks without erroring (lines 24-27, 116-124, 197-206, 325-335).
  - Three vital email flows:
    1. `sendMagicLinkEmail({ to, clienteNome, protocolo, magicLinkUrl })` (lines 51-138): Sends technical form invitation.
    2. `sendPropostaEmail({ to, clienteNome, protocolo, valorTotal, pdfBuffer })` (lines 143-231): Sends commercial proposal with PDF buffer attached.
    3. `sendNovoUsuarioEmail({ to, nome, email, senhaTemporaria, perfil, loginUrl })` (lines 245-364): Sends welcome message to new users with credentials and embedded `rbt-logo.png` (`cid:rbt-logo`).
* **Sibling Project Comparison (`..\Medicaodiaria`)**:
  - Also uses Next.js 14.2.15, React 18.3.1, Prisma 5.21.1, Tailwind 3.4.14, TypeScript 5.6.3.
  - Also uses SQLite with a `User` model and `Session` model with `tokenHash: String @unique`.
  - Sibling package has `exceljs: ^4.4.0` and `helmet: ^7.1.0`.

---

### 1.5 Verification Command Results
* **Project Tests**:
  - Command: `npm test` (`tsx scripts/verify-security-routes.ts`)
  - Result: 29 tests run, 29 passed, 0 failed (execution time 30.3ms, exit code 0).
* **TypeScript Strict Typecheck**:
  - Command: `npx tsc --noEmit`
  - Result: Zero errors, exit code 0.
* **Next.js Production Build**:
  - Command: `npm run build`
  - Result: Compiled successfully, all 14 routes statically generated or dynamically rendered, zero build errors, exit code 0.

---

## 2. Logic Chain

1. **Premise**: The unified portal requirement mandates:
   - Hub screen `/portal` or `/dashboard` with selector cards for "Gestão de Orçamentos" and "Medição Diária (RDP)".
   - User access control per module: `acessoOrcamento` and `acessoMedicao` (allowing 1 or both).
   - Preserving the Orçamentos functionality and email integrations intact.
2. **Current State Observation**:
   - `User` table currently has `id`, `name`, `email`, `passwordHash`, `role` (`ADMIN` | `ORCAMENTISTA`), `ativo`.
   - `Session` holds `userId` and `tokenHash`.
   - `validateSession` in `src/lib/session.ts` selects only `id, name, email, role, ativo` and returns `AuthUser`.
   - `src/middleware.ts` only matches `/dashboard` and checks cookie presence; it does not check module-specific permissions or redirect between modules.
   - Root page `src/app/page.tsx` unconditionally redirects authenticated users to `/dashboard`.
   - `src/app/api/auth/login/route.ts` returns `redirectUrl: '/dashboard'`.
3. **Inference for Integration**:
   - Database schema extension is needed: Add `acessoOrcamento Boolean @default(true)` and `acessoMedicao Boolean @default(false)` to `User` in `prisma/schema.prisma`.
   - Session contracts must be updated: `AuthUser` in `src/lib/auth.ts` and `validateSession` / `getServerSession` in `src/lib/session.ts` must expose `acessoOrcamento` and `acessoMedicao`.
   - User management UI (`src/components/usuarios/usuarios-client.tsx`) and API endpoints (`POST /api/usuarios`, `PATCH /api/usuarios/[id]`) must support toggling `acessoOrcamento` and `acessoMedicao`.
   - Middleware and entry navigation (`src/middleware.ts`, `src/app/page.tsx`, and `/portal`) must enforce that users without `acessoOrcamento` cannot enter `/dashboard/*`, and users without `acessoMedicao` cannot enter `/medicao/*`.
   - Email sending logic in `src/lib/email.ts` operates independently via `nodemailer` and does not collide with Medicaodiaria; keeping `email.ts` untouched guarantees 100% preservation.

---

## 3. Caveats

1. **SQLite Database Concurrency**: Both Orçamentos and Medicaodiaria use SQLite (`dev.db`). When unifying the databases, schema migration must either merge the tables into a single Prisma schema or preserve isolated models cleanly.
2. **Medicaodiaria Role Enum**: Medicaodiaria uses roles (`APONTADOR`, `ENGENHEIRO`, `ADMINISTRADOR`), while Orçamentos uses (`ADMIN`, `ORCAMENTISTA`). A unified User model must support both or accommodate module-specific roles without collision.
3. **Session Cookie Scope**: Currently, `rbt_orcamentos_session` cookie name is hardcoded. Unifying the session for both modules will allow single sign-on (SSO) across the portal, Orçamentos, and Medição Diária.

---

## 4. Conclusion

The Orçamentos codebase is in **excellent health**:
- Zero TypeScript errors (`npx tsc --noEmit` PASS).
- 100% pass on security and routing verification test suite (`npm test` 29/29 PASS).
- Production build succeeds cleanly (`npm run build` PASS).
- Architecture is cleanly separated: custom token-hashed DB sessions, Edge middleware, modular components, and decoupled email notification service.

To implement the unified portal seamlessly:
1. Extend `User` model with `acessoOrcamento` and `acessoMedicao` (defaulting existing users to `acessoOrcamento: true`).
2. Update session validation to pass module flags to client and server components.
3. Introduce `/portal` as the modular post-login landing page following the official RBT palette (`#BA1A1A`, `#111827`, white).
4. Update middleware to guard `/dashboard/*` with `acessoOrcamento` and `/medicao/*` with `acessoMedicao`.
5. Maintain `src/lib/email.ts` without changes to safeguard email delivery.

---

## 5. Verification Method

To independently reproduce and verify all observations in this report:

1. **Verify Security & Route Protection Test Suite**:
   ```powershell
   npm test
   ```
   *Expected output*: 29 tests pass with 0 failures.

2. **Verify Strict TypeScript Types**:
   ```powershell
   npx tsc --noEmit
   ```
   *Expected output*: Exits with code 0 and no type errors.

3. **Verify Next.js Production Build**:
   ```powershell
   npm run build
   ```
   *Expected output*: Exits with code 0 and builds all 14 routes.

4. **Verify File Locations & Schemas**:
   - Inspect `package.json` for Next.js 14.2.15, Tailwind, Prisma, and dependencies.
   - Inspect `prisma/schema.prisma` lines 10-25 for current `User` fields.
   - Inspect `src/lib/session.ts` for cookie name `rbt_orcamentos_session` and token hash implementation.
   - Inspect `src/lib/email.ts` lines 18-46, 51-138, 143-231, and 245-364 for email sending functions.
   - Inspect `src/middleware.ts` lines 10-35 for current Edge route protection.
