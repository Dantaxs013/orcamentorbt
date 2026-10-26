# Task Assignment: Explorer M4-1 — Medição Diária Pages, Layout & Shell Architecture

Read PROJECT.md at `c:/Users/aaaaa/OneDrive - Piatec/TI_CODIGOS/T.I/orçamento RBT/PROJECT.md`,
ORIGINAL_REQUEST.md at `c:/Users/aaaaa/OneDrive - Piatec/TI_CODIGOS/T.I/orçamento RBT/.agents/teamwork/ORIGINAL_REQUEST.md`,
and the survey blueprint at `c:/Users/aaaaa/OneDrive - Piatec/TI_CODIGOS/T.I/orçamento RBT/.agents/teamwork/explorer_survey_2/handoff.md`.

Your mission:
Formulate the exact blueprint for transplanting Medição Diária pages and components from `..\Medicaodiaria` into `orçamento RBT`:
1. Pages to establish under `src/app/medicao/`:
   - `src/app/medicao/page.tsx` (Dashboard Medição)
   - `src/app/medicao/layout.tsx` (layout mounting `MedicaoShell`)
   - `src/app/medicao/apontador/rdp/page.tsx`, `novo/page.tsx`, `[id]/page.tsx`
   - `src/app/medicao/apontador/estacas/page.tsx`
   - `src/app/medicao/engenheiro/validacao/page.tsx`
   - `src/app/medicao/engenheiro/obras/page.tsx`
   - `src/app/medicao/engenheiro/medicoes/page.tsx`, `[id]/page.tsx`
   - `src/app/medicao/admin/contratos/page.tsx`
   - `src/app/medicao/admin/usuarios/page.tsx`
2. Navigation Shell:
   - `src/components/medicao/layout/medicao-shell.tsx` (adapted from Medicaodiaria dashboard-shell with links prefixed `/medicao`, and a "Trocar Módulo" shortcut to `/portal`).
3. Component paths:
   - Map all components into `src/components/medicao/` (rdp, engenheiro, estacas, obras, admin).
4. Asset:
   - Copy `public/logo-rbt.svg` from Medicaodiaria if not already present.
5. Preservation: Confirm Orçamentos pages and Kanban (`src/app/dashboard/*`, `src/components/orcamentos/*`) remain untouched.

Output your report to:
`c:/Users/aaaaa/OneDrive - Piatec/TI_CODIGOS/T.I/orçamento RBT/.agents/teamwork/explorer_m4_1/handoff.md`.
