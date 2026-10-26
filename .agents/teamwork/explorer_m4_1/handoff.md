# Handoff Report — Blueprint for Medição Diária Pages, Layout & Shell Architecture

- **Author**: `explorer_m4_1`
- **Working Directory**: `c:/Users/aaaaa/OneDrive - Piatec/TI_CODIGOS/T.I/orçamento RBT/.agents/teamwork/explorer_m4_1`
- **Target File**: `c:/Users/aaaaa/OneDrive - Piatec/TI_CODIGOS/T.I/orçamento RBT/.agents/teamwork/explorer_m4_1/handoff.md`
- **Date**: 2026-10-20
- **Recipient**: Parent Agent (`e65a3c02-8d0d-46b7-ac87-62b0077928ce`)
- **Status**: Complete Blueprint for Milestone M4 Integration

---

## 1. Observation

A systematic forensic comparison of `..\Medicaodiaria` (source) and `orçamento RBT` (destination) was conducted across routes, layouts, client components, business logic, public assets, and database schemas.

### 1.1 Source Pages Inventory in `Medicaodiaria/src/app/(dashboard)`
Direct file inspection via `find_by_name` and `view_file` identified the following 12 core files:
1. `(dashboard)/layout.tsx` (16 lines): mounts `<DashboardShell user={session.user}>{children}</DashboardShell>` with `getServerSession()`.
2. `(dashboard)/dashboard/page.tsx` (754 lines): operational dashboard with KPIs (Canteiros, Estacas Cravadas, RDPs, Soldas/Emendas, Contratos), profile distribution (W150/W310), approval progress bars, obras grid, recent RDPs table, and quick action cards. Contains internal links:
   - Line 203: `href="/apontador/rdp/novo"`
   - Line 212: `href="/engenheiro/validacao"`
   - Line 226: `href="/engenheiro/obras"`
   - Line 536: `href="/apontador/rdp/novo"`
   - Line 558: `href="/engenheiro/obras"`
   - Line 606: `href="/engenheiro/obras"`
   - Line 630: `href="/apontador/rdp"`
   - Line 686: `href={'/apontador/rdp/${rdp.id}'}`
   - Line 706: `href="/apontador/rdp/novo"`
   - Line 717: `href="/engenheiro/validacao"`
   - Line 728: `href="/engenheiro/medicoes"`
   - Line 739: `href="/api/marca/pdf"`
3. `(dashboard)/apontador/rdp/page.tsx` (175 lines): list of active obras and recent RDPs for Apontador role.
   - Line 66: `href="/apontador/rdp/novo"`
   - Line 128: `href={'/apontador/rdp/${rdp.id}'}`
   - Line 4: `import { stripFinancialData } from '@/lib/auth';`
4. `(dashboard)/apontador/rdp/novo/page.tsx` (71 lines): renders `<RdpFormClient obras={obras} currentUser={...} initialEstacas={estacas} />`.
   - Line 6: `import { RdpFormClient } from '@/components/rdp/rdp-form-client';`
5. `(dashboard)/apontador/rdp/[id]/page.tsx` (298 lines): dual-mode view (interactive `<RdpFormClient>` for editable statuses `RASCUNHO` / `REJEITADO`; read-only summary with `<RdpTotalsBar>`, `<RdpProductionGrid>`, and `<RdpViewActions>` for `SUBMETIDO` / `APROVADO`).
   - Line 67: `redirect('/apontador/rdp');`
   - Line 187: `href={session.user.role === 'APONTADOR' ? '/apontador/rdp' : '/engenheiro/validacao'}`
   - Imports from `@/components/rdp/*` and `@/lib/calculations/rdp-math`.
6. `(dashboard)/apontador/estacas/page.tsx` (48 lines): project staves management mounting `<GestaoEstacasClient>`.
   - Line 5: `import { GestaoEstacasClient } from '@/components/estacas/gestao-estacas-client';`
7. `(dashboard)/engenheiro/validacao/page.tsx` (96 lines): engineer validation queue mounting `<ValidacaoClient initialRdps={rdps} />`.
   - Line 12: `if (!['ENGENHEIRO', 'ADMINISTRADOR'].includes(session.user.role)) redirect('/dashboard');`
   - Line 5: `import { ValidacaoClient } from '@/components/engenheiro/validacao-client';`
8. `(dashboard)/engenheiro/obras/page.tsx` (151 lines): construction sites list mounting `<NovaObraModal>`.
   - Line 11: `if (!['ENGENHEIRO', 'ADMINISTRADOR'].includes(session.user.role)) redirect('/dashboard');`
   - Line 130: `href={'/engenheiro/medicoes?contratoId=${obra.contratos[0].id}&obraId=${obra.id}'}`
   - Line 137: `href="/admin/contratos"`
   - Line 6: `import { NovaObraModal } from '@/components/obras/nova-obra-modal';`
9. `(dashboard)/engenheiro/medicoes/page.tsx` (109 lines): measurement bulletins list with status badges and Excel download button.
   - Line 25: `if (!['ENGENHEIRO', 'ADMINISTRADOR'].includes(session.user.role)) redirect('/dashboard');`
   - Line 90: `Link href={'/engenheiro/medicoes/${m.id}'}`
   - Line 94: `a href={'/api/medicoes/${m.id}/excel'}`
10. `(dashboard)/engenheiro/medicoes/[id]/page.tsx` (158 lines): itemized measurement detail with contract items, unit prices, deductions (INSS, ISS, IRRF, CSLL, PIS, COFINS), and submission form.
    - Line 13: `if (!['ENGENHEIRO', 'ADMINISTRADOR'].includes(session.user.role)) redirect('/dashboard');`
    - Line 28: `if (!medicao) redirect('/engenheiro/medicoes');`
    - Line 44: `a href={'/api/medicoes/${medicao.id}/excel'}`
    - Line 49: `form action={'/api/medicoes/${medicao.id}'}`
11. `(dashboard)/admin/contratos/page.tsx` (82 lines): contracts and PPU management.
12. `(dashboard)/admin/usuarios/page.tsx` (34 lines): Medição Diária user administration mounting `<GestaoUsuariosClient>`.
    - Line 8: `if (!session?.user || session.user.role !== 'ADMINISTRADOR') redirect('/dashboard');`
    - Line 4: `import { GestaoUsuariosClient } from '@/components/admin/gestao-usuarios-client';`

### 1.2 Source Components Inventory in `Medicaodiaria/src/components`
Direct file inspection identified 14 components:
1. `layout/dashboard-shell.tsx` (388 lines): Left desktop sidebar, mobile drawer, top header, footer. Role-based navigation items:
   - APONTADOR: `/dashboard` (Início), `/apontador/rdp` (Meus RDPs), `/apontador/estacas` (Estacas Principais)
   - ENGENHEIRO: `/dashboard` (Início), `/engenheiro/validacao` (Validar RDPs), `/engenheiro/obras` (Obras), `/apontador/estacas` (Estacas Principais), `/engenheiro/medicoes` (Medições)
   - ADMINISTRADOR: `/dashboard` (Início), `/admin/usuarios` (Usuários), `/engenheiro/obras` (Obras), `/apontador/estacas` (Estacas Principais), `/admin/contratos` (Contratos), `/engenheiro/medicoes` (Medições), `/engenheiro/validacao` (Validar RDPs)
2. `rdp/rdp-form-client.tsx` (464 lines): 25-row reactive form for RDP.
   - Lines 319, 336: `router.push('/apontador/rdp')`
   - Uses relative imports for header form, production grid, totals bar, local draft, signatures.
3. `rdp/rdp-header-form.tsx` (215 lines): header inputs (Obra, Data, Turno, Máquina, Operador, Encarregado, Clima, Horários).
4. `rdp/rdp-local-draft.tsx` (186 lines): offline-first localStorage draft manager with restore toast.
5. `rdp/rdp-production-grid.tsx` (422 lines): 25-row grid with column calculation, profile selector (W150, W310), emendas, talas, and arrasamento.
6. `rdp/rdp-signatures.tsx` (112 lines): digital sign-off checkboxes for Apontador and Engenheiro.
7. `rdp/rdp-totals-bar.tsx` (115 lines): sticky live metrics summary bar.
8. `rdp/rdp-view-actions.tsx` (95 lines): print/PDF actions calling `/api/rdp/${rdpId}/pdf`.
9. `engenheiro/validacao-client.tsx` (552 lines): interactive queue with approval (`/api/rdp/${id}/aprovar`), rejection modal with justification, and preview modal.
10. `estacas/gestao-estacas-client.tsx` (589 lines): full CRUD for project staves interacting with `/api/estacas`.
11. `obras/nova-obra-modal.tsx` (320 lines): modal to create new construction site via `/api/obras`.
12. `admin/gestao-usuarios-client.tsx` (657 lines): user management for Medição interacting with `/api/admin/usuarios`.
13. `ui/rbt-logo.tsx`: verified already present in `orçamento RBT/src/components/ui/rbt-logo.tsx` with identical SVG markup.
14. `ui/logout-button.tsx`: verified already present in `orçamento RBT/src/components/ui/logout-button.tsx` with identical functionality.

### 1.3 Asset Verification
- Inspection of `orçamento RBT/public`: contains only `rbt-logo.png` (PNG). `logo-rbt.svg` is **not present**.
- Inspection of `Medicaodiaria/public`: contains `logo-rbt.svg` (SVG vector logo with red bracket `#BA1A1A` and black `ENGENHARIA`).

### 1.4 Destination State in `orçamento RBT`
- `prisma/schema.prisma`: verified lines 1–559. Fully merged with all Medição Diária models (`Obra`, `Contrato`, `ItemContrato`, `RelatorioDiario`, `LinhaProducao`, `Medicao`, `ItemMedicao`, `MedicaoRelatorioVinculo`, `Notificacao`, `AuditLog`, `RateLimitRecord`, `EstacaPrincipal`).
- `package.json`: verified lines 20–32. Includes `exceljs: ^4.4.0`, `@react-pdf/renderer: ^3.4.4`, `nodemailer: ^6.9.15`, `bcryptjs: ^2.4.3`.
- `src/app/portal/page.tsx`: verified lines 410–412. The Medição Diária card already links to `/medicao`.
- `src/app/dashboard/*`: verified lines 1–6. Preserves Orçamentos Kanban (`/dashboard`), budget detail (`/dashboard/orcamentos/[id]`), and user management (`/dashboard/usuarios`).
- `src/components/orcamentos/*` and `src/components/kanban/*`: verified untouched.

---

## 2. Logic Chain

1. **Isolation by Route Namespace**:
   Placing all Medição Diária pages under `src/app/medicao/` (e.g. `/medicao`, `/medicao/apontador/rdp`, `/medicao/engenheiro/validacao`) guarantees zero routing collisions with Orçamentos (`/dashboard/*`) and the unified hub (`/portal`).

2. **Isolation by Component Directory**:
   Placing all Medição Diária components under `src/components/medicao/` (rdp, engenheiro, estacas, obras, admin, layout) ensures completely disjoint file spaces from `src/components/orcamentos/`, `src/components/kanban/`, and `src/components/layout/dashboard-shell.tsx`.

3. **Prefixing Navigation in `MedicaoShell`**:
   The original `dashboard-shell.tsx` from Medicaodiaria used `/dashboard` as root and unqualified subpaths (`/apontador/rdp`, `/engenheiro/obras`). By prefixing all links with `/medicao` (e.g., `/medicao`, `/medicao/apontador/rdp`, `/medicao/engenheiro/obras`), the entire navigation tree remains strictly inside the Medição boundary.

4. **Bidirectional Module Switching**:
   Users with dual-module access (`user.acessoOrcamento && user.acessoMedicao`) need seamless navigation. `orçamento RBT/src/components/layout/dashboard-shell.tsx` already contains a "Trocar Módulo" shortcut to `/portal`. Mirroring this in `src/components/medicao/layout/medicao-shell.tsx` fulfills R1 and user requirements.

5. **Role Normalization (`ADMIN` vs `ADMINISTRADOR`)**:
   `orçamento RBT` uses `ADMIN` for administrative accounts, while `Medicaodiaria` used `ADMINISTRADOR`. To prevent unauthorized access redirects or missing navigation items, `MedicaoShell` and all page guards must check `['ADMIN', 'ADMINISTRADOR'].includes(role)`.

6. **Zero Regression for Orçamentos & Kanban**:
   Because no files under `src/app/dashboard/*`, `src/components/orcamentos/*`, `src/components/kanban/*`, or `src/lib/masks.ts` are touched, the Orçamentos Kanban and commercial proposal workflows remain 100% intact.

---

## 3. Caveats

1. **Supporting Libraries Required in M4**:
   Medição pages and components depend on:
   - `src/lib/calculations/rdp-math.ts` (live 25-row math calculation engine)
   - `src/types/enums.ts` (domain enums)
   - `src/lib/validations/` (`rdp.schema.ts`, `contrato.schema.ts`, `medicao.schema.ts`, `index.ts`)
   - `src/lib/email.ts` (add `notifyEngenheiroRdpSubmetido` and `notifyGestorMedicaoSubmetida` alongside existing Orçamentos email functions)
   These must be created/updated as part of M4 implementation.

2. **API Routes Required in M4**:
   Components call `/api/rdp`, `/api/estacas`, `/api/obras`, `/api/contratos`, `/api/medicoes`, and `/api/admin/usuarios`. These API routes have zero collisions with `/api/orcamentos` or `/api/usuarios`, but must be present for client-side fetches to resolve.

3. **Asset Migration**:
   `public/logo-rbt.svg` must be copied from `..\Medicaodiaria\public\logo-rbt.svg` into `orçamento RBT/public/logo-rbt.svg`.

---

## 4. Conclusion & Concrete Blueprint

### 4.1 Page Routes Blueprint (`src/app/medicao/`)

| # | Route | Target File Path | Source File in Medicaodiaria | Role Access | Key Adjustments |
|---|-------|------------------|------------------------------|-------------|-----------------|
| 1 | `/medicao` | `src/app/medicao/page.tsx` | `src/app/(dashboard)/dashboard/page.tsx` | Any authenticated with `acessoMedicao` | Rewrite links to `/medicao/apontador/rdp/novo`, `/medicao/engenheiro/validacao`, `/medicao/engenheiro/obras`, `/medicao/engenheiro/medicoes`, `/medicao/apontador/rdp` |
| 2 | Layout | `src/app/medicao/layout.tsx` | `src/app/(dashboard)/layout.tsx` | Any authenticated with `acessoMedicao` | Mounts `MedicaoShell`. Redirects to `/portal?unauthorized=medicao` if `!session.user.acessoMedicao` |
| 3 | `/medicao/apontador/rdp` | `src/app/medicao/apontador/rdp/page.tsx` | `src/app/(dashboard)/apontador/rdp/page.tsx` | APONTADOR, ENGENHEIRO, ADMIN | Links to `/medicao/apontador/rdp/novo` and `/medicao/apontador/rdp/[id]` |
| 4 | `/medicao/apontador/rdp/novo` | `src/app/medicao/apontador/rdp/novo/page.tsx` | `src/app/(dashboard)/apontador/rdp/novo/page.tsx` | APONTADOR, ENGENHEIRO, ADMIN | Imports `RdpFormClient` from `@/components/medicao/rdp/rdp-form-client` |
| 5 | `/medicao/apontador/rdp/[id]` | `src/app/medicao/apontador/rdp/[id]/page.tsx` | `src/app/(dashboard)/apontador/rdp/[id]/page.tsx` | APONTADOR, ENGENHEIRO, ADMIN | Update back-links to `/medicao/apontador/rdp` and `/medicao/engenheiro/validacao`; import components from `@/components/medicao/rdp/*` |
| 6 | `/medicao/apontador/estacas` | `src/app/medicao/apontador/estacas/page.tsx` | `src/app/(dashboard)/apontador/estacas/page.tsx` | APONTADOR, ENGENHEIRO, ADMIN | Imports `GestaoEstacasClient` from `@/components/medicao/estacas/gestao-estacas-client` |
| 7 | `/medicao/engenheiro/validacao` | `src/app/medicao/engenheiro/validacao/page.tsx` | `src/app/(dashboard)/engenheiro/validacao/page.tsx` | ENGENHEIRO, ADMIN | Guard: `['ENGENHEIRO', 'ADMINISTRADOR', 'ADMIN'].includes(role)`. Imports `ValidacaoClient` from `@/components/medicao/engenheiro/validacao-client` |
| 8 | `/medicao/engenheiro/obras` | `src/app/medicao/engenheiro/obras/page.tsx` | `src/app/(dashboard)/engenheiro/obras/page.tsx` | ENGENHEIRO, ADMIN | Guard: `['ENGENHEIRO', 'ADMINISTRADOR', 'ADMIN'].includes(role)`. Links to `/medicao/engenheiro/medicoes`, `/medicao/admin/contratos`. Imports `NovaObraModal` from `@/components/medicao/obras/nova-obra-modal` |
| 9 | `/medicao/engenheiro/medicoes` | `src/app/medicao/engenheiro/medicoes/page.tsx` | `src/app/(dashboard)/engenheiro/medicoes/page.tsx` | ENGENHEIRO, ADMIN | Guard: `['ENGENHEIRO', 'ADMINISTRADOR', 'ADMIN'].includes(role)`. Links to `/medicao/engenheiro/medicoes/[id]` |
| 10 | `/medicao/engenheiro/medicoes/[id]` | `src/app/medicao/engenheiro/medicoes/[id]/page.tsx` | `src/app/(dashboard)/engenheiro/medicoes/[id]/page.tsx` | ENGENHEIRO, ADMIN | Guard: `['ENGENHEIRO', 'ADMINISTRADOR', 'ADMIN'].includes(role)`. Redirects if not found to `/medicao/engenheiro/medicoes` |
| 11 | `/medicao/admin/contratos` | `src/app/medicao/admin/contratos/page.tsx` | `src/app/(dashboard)/admin/contratos/page.tsx` | ADMIN, ENGENHEIRO | Session & role guard: `['ADMINISTRADOR', 'ADMIN', 'ENGENHEIRO'].includes(role)` |
| 12 | `/medicao/admin/usuarios` | `src/app/medicao/admin/usuarios/page.tsx` | `src/app/(dashboard)/admin/usuarios/page.tsx` | ADMIN | Guard: `['ADMINISTRADOR', 'ADMIN'].includes(role)`. Imports `GestaoUsuariosClient` from `@/components/medicao/admin/gestao-usuarios-client` |

---

### 4.2 Navigation Shell Blueprint (`src/components/medicao/layout/medicao-shell.tsx`)

Adapted from `Medicaodiaria/src/components/layout/dashboard-shell.tsx`:
1. **Navigation Items Table by Role**:
   - **APONTADOR**:
     - `/medicao` (Início, `LayoutDashboard`)
     - `/medicao/apontador/rdp` (Meus RDPs, `ClipboardList`)
     - `/medicao/apontador/estacas` (Estacas Principais, `Target`)
   - **ENGENHEIRO**:
     - `/medicao` (Início, `LayoutDashboard`)
     - `/medicao/engenheiro/validacao` (Validar RDPs, `CheckSquare`)
     - `/medicao/engenheiro/obras` (Obras, `Building2`)
     - `/medicao/apontador/estacas` (Estacas Principais, `Target`)
     - `/medicao/engenheiro/medicoes` (Medições, `TrendingUp`)
   - **ADMIN / ADMINISTRADOR**:
     - `/medicao` (Início, `LayoutDashboard`)
     - `/medicao/admin/usuarios` (Usuários, `Users`)
     - `/medicao/engenheiro/obras` (Obras, `Building2`)
     - `/medicao/apontador/estacas` (Estacas Principais, `Target`)
     - `/medicao/admin/contratos` (Contratos, `FileText`)
     - `/medicao/engenheiro/medicoes` (Medições, `TrendingUp`)
     - `/medicao/engenheiro/validacao` (Validar RDPs, `CheckSquare`)
2. **Active Link Matching**:
   ```typescript
   const isLinkActive = (href: string) => {
     if (href === '/medicao') {
       return pathname === '/medicao';
     }
     return pathname.startsWith(href);
   };
   ```
3. **Module Switcher ("Trocar Módulo")**:
   Integrated into desktop sidebar (below nav items), mobile drawer, and top header bar:
   ```tsx
   {Boolean(user.acessoOrcamento) && (
     <Link
       href="/portal"
       className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-medium text-slate-300 hover:text-white hover:bg-white/10 transition border border-slate-800 hover:border-slate-700 bg-slate-900/60 group shadow-sm"
       title="Voltar ao Portal de Módulos RBT"
     >
       <div className="w-6 h-6 rounded-lg bg-red-600/20 border border-red-500/30 flex items-center justify-center flex-shrink-0 group-hover:bg-red-600/30 transition-colors">
         <LayoutGrid className="w-3.5 h-3.5 text-red-400 group-hover:text-red-300" />
       </div>
       <span className="truncate">Trocar Módulo</span>
       <ChevronRight className="w-4 h-4 ml-auto text-slate-500 group-hover:text-white flex-shrink-0" />
     </Link>
   )}
   ```
4. **Header Context & Branding**:
   - Header title: `RBT Fundações / Controle de Produção & Medição Diária`
   - Brand logo: `<RBTLogo size="md" subtitle="ENGENHARIA" />` inside `<Link href="/medicao" ...>`
   - Roles badge handles: `APONTADOR`, `ENGENHEIRO`, `ADMIN`, `ADMINISTRADOR`.

---

### 4.3 Component Mapping Blueprint (`src/components/medicao/`)

| Source in Medicaodiaria | Target in orçamento RBT | Description & Adjustments |
|-------------------------|--------------------------|---------------------------|
| `layout/dashboard-shell.tsx` | `src/components/medicao/layout/medicao-shell.tsx` | Renamed to `MedicaoShell`, prefixed links with `/medicao`, added `/portal` shortcut |
| `rdp/rdp-form-client.tsx` | `src/components/medicao/rdp/rdp-form-client.tsx` | Adjust `router.push('/apontador/rdp')` -> `router.push('/medicao/apontador/rdp')` (lines 319, 336) |
| `rdp/rdp-header-form.tsx` | `src/components/medicao/rdp/rdp-header-form.tsx` | Direct copy (pure UI) |
| `rdp/rdp-local-draft.tsx` | `src/components/medicao/rdp/rdp-local-draft.tsx` | Direct copy (uses `@/lib/calculations/rdp-math`) |
| `rdp/rdp-production-grid.tsx` | `src/components/medicao/rdp/rdp-production-grid.tsx` | Direct copy (uses `@/lib/calculations/rdp-math`) |
| `rdp/rdp-signatures.tsx` | `src/components/medicao/rdp/rdp-signatures.tsx` | Direct copy (pure UI) |
| `rdp/rdp-totals-bar.tsx` | `src/components/medicao/rdp/rdp-totals-bar.tsx` | Direct copy (uses `@/lib/calculations/rdp-math`) |
| `rdp/rdp-view-actions.tsx` | `src/components/medicao/rdp/rdp-view-actions.tsx` | Direct copy (calls `/api/rdp/${rdpId}/pdf`) |
| `engenheiro/validacao-client.tsx` | `src/components/medicao/engenheiro/validacao-client.tsx` | Direct copy (calls `/api/rdp/${id}/aprovar`) |
| `estacas/gestao-estacas-client.tsx` | `src/components/medicao/estacas/gestao-estacas-client.tsx` | Direct copy (calls `/api/estacas`) |
| `obras/nova-obra-modal.tsx` | `src/components/medicao/obras/nova-obra-modal.tsx` | Direct copy (calls `/api/obras`) |
| `admin/gestao-usuarios-client.tsx` | `src/components/medicao/admin/gestao-usuarios-client.tsx` | Direct copy (calls `/api/admin/usuarios`) |

---

### 4.4 Asset Migration Blueprint
- **Source**: `..\Medicaodiaria\public\logo-rbt.svg`
- **Destination**: `c:\Users\aaaaa\OneDrive - Piatec\TI_CODIGOS\T.I\orçamento RBT\public\logo-rbt.svg`
- **Confirmation**: `public/rbt-logo.png` is preserved without any alteration.

---

### 4.5 Preservation Confirmation Matrix

| Asset / Route | Location in orçamento RBT | Impact of Medição Migration | Status |
|---------------|---------------------------|-----------------------------|--------|
| Orçamentos Kanban | `src/app/dashboard/page.tsx` | Zero impact (distinct route) | **Preserved 100%** |
| Proposta & Orçamento Detail | `src/app/dashboard/orcamentos/[id]/page.tsx` | Zero impact (distinct route) | **Preserved 100%** |
| Usuários Orçamentos Client | `src/app/dashboard/usuarios/page.tsx` | Zero impact (distinct route) | **Preserved 100%** |
| Kanban Components | `src/components/kanban/*` | Zero impact (distinct folder) | **Preserved 100%** |
| Orçamentos Components | `src/components/orcamentos/*` | Zero impact (distinct folder) | **Preserved 100%** |
| Orçamentos Shell | `src/components/layout/dashboard-shell.tsx` | Zero impact (distinct component) | **Preserved 100%** |
| Orçamentos APIs | `src/app/api/orcamentos/*`, `src/app/api/solicitacoes/*` | Zero impact (distinct namespace) | **Preserved 100%** |
| Orçamentos Email Sender | `src/lib/email.ts` (`sendMagicLinkEmail`, `sendPropostaEmail`) | Zero impact (functions preserved intact) | **Preserved 100%** |
| Portal Hub Page | `src/app/portal/page.tsx` | Card already links to `/medicao` | **Preserved 100%** |

---

## 5. Verification Method

To independently verify this blueprint during implementation:

1. **File Existence & Integrity Check**:
   Confirm that all 12 target page files exist under `src/app/medicao/` and all 12 component files exist under `src/components/medicao/`.

2. **TypeScript Compilation Check**:
   ```powershell
   npx tsc --noEmit
   ```
   Must pass with 0 errors across the entire unified codebase.

3. **Next.js Production Build**:
   ```powershell
   npm run build
   ```
   Must compile all routes including `/portal`, `/dashboard`, `/dashboard/orcamentos/[id]`, `/medicao`, `/medicao/apontador/rdp`, `/medicao/engenheiro/validacao`, etc.

4. **Asset Verification**:
   Inspect `public/logo-rbt.svg` and verify it loads correctly at `/logo-rbt.svg`.
