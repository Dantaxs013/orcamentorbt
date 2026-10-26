# Project: Portal Unificado RBT Fundações

## Architecture
- **Framework**: Next.js 14.2.15 (App Router), React 18.3.1, TypeScript 5.6.3 (strict), Tailwind CSS 3.4.14 with RBT color palette (`#BA1A1A`, `#111827`, `#0A0F1D`, `#1E3A5F`).
- **Database**: SQLite via Prisma (`DATABASE_URL="file:./dev.db"`). Unified schema with disjoint business domains:
  - Orçamentos domain: `Lead`, `Orcamento`, `MagicLink`, `RespostaFormulario`, `PropostaComercial`, `StatusLog`.
  - Medição domain: `Obra`, `Contrato`, `ItemContrato`, `RelatorioDiario`, `LinhaProducao`, `Medicao`, `ItemMedicao`, `MedicaoRelatorioVinculo`, `Notificacao`, `AuditLog`, `RateLimitRecord`, `EstacaPrincipal`.
  - Shared identity & session: `User` (extended with `acessoOrcamento`, `acessoMedicao`) and `Session`.
- **Authentication & Edge Security**: Unified database-backed session + signed HMAC cookie (`rbt_user_meta`) allowing Edge Middleware to perform sub-millisecond module authorization checks without database trips.
- **Routing Boundaries**:
  - `/portal`: Post-login modular selection hub (RBT institutional branding, cards, user profile, logout).
  - `/dashboard/*`: Orçamentos management, Kanban pipeline, proposals, public lead forms, preserved email notifications.
  - `/medicao/*`: Medição Diária operational workflows (RDP apuntamento, validação de engenharia, medições, boletins, obras, estacas).
  - `/api/*`: Distinct, non-colliding REST API routes for both domains.

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Dependency & Schema Foundation | Install `exceljs`, extend `User` with `acessoOrcamento`/`acessoMedicao`, merge Medição models, run Prisma generate & db push | M1 | Survey |
| 2 | Unified Session & Token Auth | Extend `AuthUser`, update `validateSession` & `getServerSession`, implement HMAC `rbt_user_meta` cookies and seed data | M1 | Survey |
| 3 | Institutional Selection Hub | Create `/portal` with RBT cards (#BA1A1A, #111827), topbar, status badges, action links, and root `/` redirection | M2 | R1 |
| 4 | Bidirectional Module Switcher | Add "Trocar Módulo" shortcut in Orçamentos & Medição shells for users with dual-module access | M2 | R1 |
| 5 | User Management & Permission UI | Add module checkboxes in `/dashboard/usuarios` create/edit modals and update `/api/usuarios` routes | M3 | R2 |
| 6 | Medição Diária Code Migration | Transplant `Medicaodiaria/src/app` into `/medicao/*`, copy components to `src/components/medicao/`, copy API routes and math libs | M4 | R3 |
| 7 | Preservation of Orçamentos & Emails | Safeguard Orçamentos Kanban and `src/lib/email.ts` ensuring zero regressions to existing budget flows | M4 | R3 |
| 8 | Route Protection Middleware | Implement Edge Middleware checking `acessoOrcamento` on `/dashboard/*` and `acessoMedicao` on `/medicao/*` with friendly alert redirection | M5 | R4 |
| 9 | Verification & Integrity Audit | Strict typecheck (`npx tsc --noEmit`), production build (`npm run build`), automated route tests, and forensic integrity audit | M6 | Acceptance Criteria |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Data & Auth Foundation | Install `exceljs`, merge Prisma schema, update session/token helpers, update seed | none | DONE |
| M2 | Portal Selection Hub & Navigation | Build `/portal` page, institutional branding, root redirect, and module switchers | M1 | DONE |
| M3 | User Management & Permissions | Add module toggles in `/dashboard/usuarios` and update `/api/usuarios` endpoints | M1 | DONE |
| M4 | Medição Diária Integration | Migrate Medição pages to `/medicao/*`, components, APIs, and calculations; preserve Orçamentos & emails | M1 | DONE |
| M5 | Middleware & Access Enforcement | Implement Edge Middleware module guards, single-module direct routing, and unauthorized alerts | M2, M3, M4 | IN_PROGRESS |
| M6 | End-to-End Verification & Build | Execute `npx tsc --noEmit`, `npm run build`, route test verification script, and forensic audit | M5 | PLANNED |

## Interface Contracts
### Auth & Session ↔ Middleware / Components
- `AuthUser`: `{ id: string; name: string; email: string; role: string; ativo: boolean; acessoOrcamento: boolean; acessoMedicao: boolean; }`
- `UserMetaClaims`: `{ userId: string; role: string; email: string; acessoOrcamento: boolean; acessoMedicao: boolean; ts: number }`
- Edge Cookie: `rbt_user_meta` signed with HMAC SHA-256 using `SESSION_SECRET`.
- Verification helper: `verifyUserMeta(request: NextRequest): Promise<UserMetaClaims | null>`.

### User Management API (`/api/usuarios`)
- `POST /api/usuarios`: Body `{ name, email, password, role, acessoOrcamento, acessoMedicao }`. Validates at least one module is selected.
- `PATCH /api/usuarios/[id]`: Body `{ name?, role?, ativo?, password?, acessoOrcamento?, acessoMedicao? }`.

### Module Protection Rules
- `/dashboard/*` and `/api/orcamentos/*`: requires `acessoOrcamento === true`. If false -> redirect to `/portal?unauthorized=orcamentos` (or HTTP 403 for API).
- `/medicao/*` and `/api/medicoes/*`: requires `acessoMedicao === true`. If false -> redirect to `/portal?unauthorized=medicao` (or HTTP 403 for API).
- Root `/`: If authenticated with both -> `/portal`; if only orçamentos -> `/dashboard`; if only medição -> `/medicao`.

## Code Layout
- `src/app/portal/page.tsx`: Modular post-login landing hub.
- `src/app/medicao/`: Isolated routes for Medição Diária (apontador, engenheiro, admin).
- `src/app/medicao/layout.tsx`: Layout mounting `MedicaoShell`.
- `src/components/medicao/`: Medição specific UI components (RDP, estacas, obras, validação, medições).
- `src/components/medicao/layout/medicao-shell.tsx`: Dedicated sidebar & header navigation for Medição.
- `src/components/layout/dashboard-shell.tsx`: Orçamentos sidebar & header navigation (with module switcher).
- `src/components/usuarios/usuarios-client.tsx`: User management client with module checkboxes.
- `src/lib/session.ts` & `src/lib/token-utils.ts`: Dual-token session & Edge verification utilities.
- `src/lib/email.ts`: Consolidated email service (Orçamentos + Medição notifications preserved).
- `src/lib/calculations/rdp-math.ts`: RDP production math calculation engine.
- `src/middleware.ts`: Unified Edge route protection and permission gateway.
