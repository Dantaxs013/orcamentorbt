# Handoff Report — Survey of Medição Diária & Unified Portal Blueprint

- **Author**: `survey_explorer_2`
- **Working Directory**: `c:/Users/aaaaa/OneDrive - Piatec/TI_CODIGOS/T.I/orçamento RBT/.agents/teamwork/explorer_survey_2`
- **Date**: 2026-10-20
- **Recipient**: Parent Agent (`e65a3c02-8d0d-46b7-ac87-62b0077928ce`)

---

## 1. Observation

### 1.1 Directory Structure & File Inventory
A thorough inspection of `..\Medicaodiaria` and `..\orçamento RBT` was executed using `list_dir`, `find_by_name`, `view_file`, and `grep_search`.

1. **Medicaodiaria Root Files**:
   - `package.json` (49 lines)
   - `prisma/schema.prisma` (411 lines)
   - `prisma/seed.ts` (365 lines)
   - `src/middleware.ts` (162 lines)
   - `tailwind.config.ts` (41 lines)
   - `next.config.mjs` (61 lines)
   - `tsconfig.json` (28 lines)
   - `public/logo-rbt.svg`

2. **Medicaodiaria App Directory (`src/app`)**:
   - `(auth)/login/page.tsx`
   - `(dashboard)/layout.tsx`
   - `(dashboard)/dashboard/page.tsx`
   - `(dashboard)/admin/contratos/page.tsx`
   - `(dashboard)/admin/usuarios/page.tsx`
   - `(dashboard)/apontador/estacas/page.tsx`
   - `(dashboard)/apontador/rdp/page.tsx`
   - `(dashboard)/apontador/rdp/novo/page.tsx`
   - `(dashboard)/apontador/rdp/[id]/page.tsx`
   - `(dashboard)/engenheiro/obras/page.tsx`
   - `(dashboard)/engenheiro/validacao/page.tsx`
   - `(dashboard)/engenheiro/medicoes/page.tsx`
   - `(dashboard)/engenheiro/medicoes/[id]/page.tsx`

3. **Medicaodiaria API Routes (`src/app/api`)**:
   - Auth: `/api/auth/login`, `/api/auth/logout`, `/api/auth/me`
   - Produção/RDP: `/api/rdp`, `/api/rdp/[id]`, `/api/rdp/[id]/aprovar`, `/api/rdp/[id]/pdf`
   - Estacas: `/api/estacas`, `/api/estacas/[id]`
   - Obras: `/api/obras`
   - Contratos: `/api/contratos`
   - Medições: `/api/medicoes`, `/api/medicoes/[id]`, `/api/medicoes/[id]/excel`
   - Marca: `/api/marca/pdf`
   - Saúde: `/api/health`
   - Admin Usuários: `/api/admin/usuarios`, `/api/admin/usuarios/[id]`

4. **Medicaodiaria Components (`src/components`)**:
   - `admin/gestao-usuarios-client.tsx`
   - `engenheiro/validacao-client.tsx`
   - `estacas/gestao-estacas-client.tsx`
   - `layout/dashboard-shell.tsx`
   - `obras/nova-obra-modal.tsx`
   - `rdp/rdp-form-client.tsx`, `rdp/rdp-header-form.tsx`, `rdp/rdp-local-draft.tsx`, `rdp/rdp-production-grid.tsx`, `rdp/rdp-signatures.tsx`, `rdp/rdp-totals-bar.tsx`, `rdp/rdp-view-actions.tsx`
   - `ui/logout-button.tsx`, `ui/rbt-logo.tsx`

5. **Medicaodiaria Core Libs (`src/lib`)**:
   - `calculations/rdp-math.ts`: Live calculation engine for 25 rows, net depth calculation (`comprimentoUtil = max(0, comprimento - arrasamento)`), Brazilian currency/number parsing, and RDP submission validation.
   - `validations/`: `auth.schema.ts`, `contrato.schema.ts`, `medicao.schema.ts`, `rdp.schema.ts`, `index.ts`.
   - `types/enums.ts`: Enums `Role`, `StatusRelatorio`, `StatusMedicao`, `StatusContrato`, `CondicaoClimatica`, `TipoEmenda`, `TipoNotificacao`.
   - `rate-limiter.ts`, `security-headers.ts`, `session.ts`, `token-utils.ts`, `email.ts`, `db.ts`, `auth.ts`.

---

### 1.2 Package Comparison (`package.json`)

| Package | Medicaodiaria Version | Orçamento RBT Version | Status / Impact |
|---|---|---|---|
| `next` | `^14.2.15` | `^14.2.15` | **Identical** |
| `react` | `^18.3.1` | `^18.3.1` | **Identical** |
| `react-dom` | `^18.3.1` | `^18.3.1` | **Identical** |
| `@prisma/client` | `^5.21.1` | `^5.21.1` | **Identical** |
| `prisma` | `^5.21.1` | `^5.21.1` | **Identical** |
| `bcryptjs` | `^2.4.3` | `^2.4.3` | **Identical** |
| `clsx` | `^2.1.1` | `^2.1.1` | **Identical** |
| `tailwind-merge` | `^2.5.4` | `^2.5.4` | **Identical** |
| `lucide-react` | `^0.453.0` | `^0.453.0` | **Identical** |
| `nodemailer` | `^6.9.15` | `^6.9.15` | **Identical** |
| `zod` | `^3.23.8` | `^3.23.8` | **Identical** |
| `tailwindcss` | `^3.4.14` | `^3.4.14` | **Identical** |
| `typescript` | `^5.6.3` | `^5.6.3` | **Identical** |
| `tsx` | `^4.19.1` | `^4.19.1` | **Identical** |
| `exceljs` | `^4.4.0` | *Missing* | **Must be installed** (used in `api/medicoes/[id]/excel/route.ts`) |
| `helmet` | `^7.1.0` | *Missing* | Optional (Next.js security headers in `next.config.mjs` already cover this) |
| `@react-pdf/renderer` | *Missing* | `^3.4.4` | Preserved in Orçamentos (no conflict) |

---

### 1.3 Data Flow & Database Models Comparison

1. **`orçamento RBT/prisma/schema.prisma` Models**:
   - `User` (`@@map("users")`), `Session` (`@@map("sessions")`), `Lead` (`@@map("leads")`), `Orcamento` (`@@map("orcamentos")`), `MagicLink` (`@@map("magic_links")`), `RespostaFormulario` (`@@map("respostas_formulario")`), `PropostaComercial` (`@@map("propostas_comerciais")`), `StatusLog` (`@@map("status_logs")`).

2. **`Medicaodiaria/prisma/schema.prisma` Models**:
   - `User`, `Session`, `Obra`, `Contrato`, `ItemContrato`, `RelatorioDiario`, `LinhaProducao`, `Medicao`, `ItemMedicao`, `MedicaoRelatorioVinculo`, `Notificacao`, `AuditLog`, `RateLimitRecord`, `EstacaPrincipal`.

3. **Collision Assessment**:
   - The business domain models of both applications are **100% disjoint**:
     - Orçamento domain: `Lead`, `Orcamento`, `MagicLink`, `RespostaFormulario`, `PropostaComercial`, `StatusLog`.
     - Medição domain: `Obra`, `Contrato`, `ItemContrato`, `RelatorioDiario`, `LinhaProducao`, `Medicao`, `ItemMedicao`, `MedicaoRelatorioVinculo`, `Notificacao`, `AuditLog`, `RateLimitRecord`, `EstacaPrincipal`.
   - The only intersecting models are `User` and `Session`.

4. **API Route Namespace Collisions**:
   - `orçamento RBT` API routes: `/api/orcamentos`, `/api/formulario`, `/api/solicitacoes`, `/api/usuarios`.
   - `Medicaodiaria` API routes: `/api/rdp`, `/api/estacas`, `/api/obras`, `/api/contratos`, `/api/medicoes`, `/api/marca/pdf`, `/api/admin/usuarios`, `/api/health`.
   - **Zero API collision!** Even for users, `orçamento RBT` uses `/api/usuarios`, whereas `Medicaodiaria` uses `/api/admin/usuarios`.

---

## 2. Logic Chain

1. **Premise 1**: Because both applications share the exact same major dependencies (Next.js 14, React 18, Prisma 5, Tailwind 3, TypeScript 5, Zod 3, Bcryptjs 2, Lucide-react 0.453), bundling their code into a single Next.js project will produce zero runtime or build dependency conflicts, provided `exceljs` is installed.
2. **Premise 2**: Because the domain tables (`Orcamento` vs `RelatorioDiario`/`Medicao`) have zero name overlapping and zero foreign key entanglements, merging the Prisma schemas preserves complete data isolation.
3. **Premise 3**: By augmenting the `User` model with two boolean flags:
   - `acessoOrcamento Boolean @default(true)`
   - `acessoMedicao Boolean @default(false)`
   and defining roles (`ADMIN`, `ORCAMENTISTA`, `ENGENHEIRO`, `APONTADOR`), user access can be managed centrally in `/dashboard/usuarios` and checked at the perimeter.
4. **Premise 4**: Placing Medição Diária's dashboard and operational pages under `/medicao/*` (e.g., `/medicao`, `/medicao/apontador/rdp`, `/medicao/engenheiro/validacao`) isolates the UI routes completely from Orçamentos' Kanban (`/dashboard`, `/dashboard/orcamentos/[id]`).
5. **Premise 5**: Creating a Hub page at `/portal` gives users with access to both modules an entry screen with branded cards (#BA1A1A, #111827), while users with single-module access can be redirected directly to their designated module.
6. **Premise 6**: By keeping Medição's business API routes at `/api/rdp`, `/api/estacas`, `/api/obras`, `/api/contratos`, `/api/medicoes`, none of the existing client fetch calls in Medição components need to be altered, eliminating regression risk.

---

## 3. Caveats

1. **`exceljs` dependency**: `exceljs` must be added to `package.json` in `orçamento RBT` to support spreadsheet exports at `/api/medicoes/[id]/excel`.
2. **Database Migration**: Merging the models in `schema.prisma` requires running `npx prisma db push` (or migration) and updating `seed.ts` so default test accounts have proper module flags.
3. **Session Cookies & Middleware**:
   - `orçamento RBT` currently uses `rbt_orcamentos_session`.
   - `Medicaodiaria` uses `rbt_session` and `rbt_user_meta` (for Edge-runtime HMAC verification).
   - In the unified portal, session management should either be unified into a single session cookie or middleware should inspect the active session to enforce module access (`acessoOrcamento` and `acessoMedicao`).
4. **Apontador Role Isolation**: The Apontador role must remain strictly barred from viewing financial contracts and budget proposals, which must be verified in middleware and server components.

---

## 4. Conclusion & Migration Strategy

### Blueprint for Unified RBT Portal:

#### Phase A: Dependencies & Prisma Schema
1. Install `exceljs`:
   `npm install exceljs`
2. Merge Prisma Schema in `orçamento RBT/prisma/schema.prisma`:
   - Add fields to `model User`:
     - `nome String?`
     - `telefone String?`
     - `acessoOrcamento Boolean @default(true)`
     - `acessoMedicao Boolean @default(false)`
     - Relations to Medição (`obrasGerenciadas`, `relatoriosApontados`, `relatoriosRevisados`, `medicoesCriadas`, `medicoesAprovadas`, `notificacoes`, `auditorias`).
   - Append Medição models: `Obra`, `Contrato`, `ItemContrato`, `RelatorioDiario`, `LinhaProducao`, `Medicao`, `ItemMedicao`, `MedicaoRelatorioVinculo`, `Notificacao`, `AuditLog`, `RateLimitRecord`, `EstacaPrincipal`.
3. Generate client & push schema:
   `npx prisma generate` && `npx prisma db push`

#### Phase B: File Migration into Orçamento RBT
1. **Copy Domain Libs**:
   - Copy `Medicaodiaria/src/lib/calculations/rdp-math.ts` to `orçamento RBT/src/lib/calculations/rdp-math.ts`.
   - Copy `Medicaodiaria/src/lib/validations/*` to `orçamento RBT/src/lib/validations/`.
   - Copy `Medicaodiaria/src/types/enums.ts` to `orçamento RBT/src/types/enums.ts`.
   - Add email notifications from `Medicaodiaria/src/lib/email.ts` (`notifyEngenheiroRdpSubmetido`, `notifyGestorMedicaoSubmetida`) to `orçamento RBT/src/lib/email.ts`.
2. **Copy Components**:
   - Place Medição components in `src/components/medicao/`:
     - `rdp/*`
     - `engenheiro/*`
     - `estacas/*`
     - `obras/*`
     - `admin/*`
   - Create `src/components/medicao/layout/medicao-shell.tsx` (adapted from `dashboard-shell.tsx` of Medicaodiaria) with sidebar links prefixed with `/medicao` and a "Voltar ao Hub do Portal" button.
3. **Copy API Routes**:
   - Copy `Medicaodiaria/src/app/api/rdp` to `orçamento RBT/src/app/api/rdp`
   - Copy `Medicaodiaria/src/app/api/estacas` to `orçamento RBT/src/app/api/estacas`
   - Copy `Medicaodiaria/src/app/api/obras` to `orçamento RBT/src/app/api/obras`
   - Copy `Medicaodiaria/src/app/api/contratos` to `orçamento RBT/src/app/api/contratos`
   - Copy `Medicaodiaria/src/app/api/medicoes` to `orçamento RBT/src/app/api/medicoes`
   - Copy `Medicaodiaria/src/app/api/marca/pdf` to `orçamento RBT/src/app/api/marca/pdf`
   - Copy `Medicaodiaria/src/app/api/health` to `orçamento RBT/src/app/api/health`
   - Copy `Medicaodiaria/src/app/api/admin/usuarios` to `orçamento RBT/src/app/api/admin/usuarios`
4. **Copy Pages into `/medicao/*`**:
   - `src/app/medicao/page.tsx` (Dashboard Medição)
   - `src/app/medicao/layout.tsx` (Medição Shell layout)
   - `src/app/medicao/apontador/rdp/page.tsx`
   - `src/app/medicao/apontador/rdp/novo/page.tsx`
   - `src/app/medicao/apontador/rdp/[id]/page.tsx`
   - `src/app/medicao/apontador/estacas/page.tsx`
   - `src/app/medicao/engenheiro/validacao/page.tsx`
   - `src/app/medicao/engenheiro/obras/page.tsx`
   - `src/app/medicao/engenheiro/medicoes/page.tsx`
   - `src/app/medicao/engenheiro/medicoes/[id]/page.tsx`
   - `src/app/medicao/admin/contratos/page.tsx`
   - `src/app/medicao/admin/usuarios/page.tsx`
5. **Assets**:
   - Copy `Medicaodiaria/public/logo-rbt.svg` to `orçamento RBT/public/logo-rbt.svg`.

#### Phase C: Portal Hub & Access Control
1. **Hub Page (`/portal`)**:
   - Create `src/app/portal/page.tsx` with high-standard visual styling following RBT institutional palette (#BA1A1A, #111827):
     - Card 1: **Gestão de Orçamentos** (icon, description, link `/dashboard`).
     - Card 2: **Medição Diária (RDP)** (icon, description, link `/medicao`).
     - Institutional topbar with RBT logo, user name/role badge, and Logout button.
2. **User Management UI (`/dashboard/usuarios`)**:
   - Update `src/components/usuarios/usuarios-client.tsx` to include module checkboxes:
     - `acessoOrcamento` (Orçamentos)
     - `acessoMedicao` (Medição Diária)
   - Update `api/usuarios` to handle both flags in GET, POST, and PATCH.
3. **Unified Middleware Protection (`src/middleware.ts`)**:
   - Guard `/portal`, `/dashboard/:path*`, and `/medicao/:path*`.
   - Validate session and check module access:
     - Access to `/dashboard/*` requires `acessoOrcamento === true`. If not, redirect to `/portal?denied=orcamento`.
     - Access to `/medicao/*` requires `acessoMedicao === true`. If not, redirect to `/portal?denied=medicao`.
     - Role-based isolation for `APONTADOR` inside `/medicao`.

---

## 5. Verification Method

1. **Package Verification**:
   - Run `npm ls exceljs` in `orçamento RBT` to verify dependency resolution.
2. **Type Checking**:
   - Run `npx tsc --noEmit` in `orçamento RBT` to verify zero TypeScript errors.
3. **Production Build**:
   - Run `npm run build` to verify Next.js compiles all pages (`/portal`, `/dashboard`, `/medicao/*`, `/login`, etc.) and all API routes with zero compilation failures.
4. **Behavioral Route Inspection**:
   - Log in as user with `acessoOrcamento: true`, `acessoMedicao: false` -> verify access to `/dashboard` succeeds, and `/medicao` redirects to `/portal` with restricted access notice.
   - Log in as user with `acessoOrcamento: false`, `acessoMedicao: true` -> verify access to `/medicao` succeeds, and `/dashboard` redirects to `/portal`.
   - Log in as admin with both -> verify access to `/portal`, `/dashboard`, and `/medicao` works seamlessly.
