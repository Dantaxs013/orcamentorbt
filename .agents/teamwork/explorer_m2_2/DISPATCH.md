# Task Assignment: Explorer M2-2 — Root Redirection & Module Switcher Specification

Read PROJECT.md at `c:/Users/aaaaa/OneDrive - Piatec/TI_CODIGOS/T.I/orçamento RBT/PROJECT.md`
and ORIGINAL_REQUEST.md at `c:/Users/aaaaa/OneDrive - Piatec/TI_CODIGOS/T.I/orçamento RBT/.agents/teamwork/ORIGINAL_REQUEST.md`.

Your mission for Milestone M2 (Portal Selection Hub & Navigation):
1. Specify the complete, exact implementation of `src/app/page.tsx`:
   - Session lookup via `getServerSession()`.
   - If unauthenticated -> redirect to `/login`.
   - If dual access (`acessoOrcamento && acessoMedicao`) -> redirect to `/portal`.
   - If single access Orçamentos -> redirect to `/dashboard`.
   - If single access Medição -> redirect to `/medicao`.
2. Specify the exact changes in `src/components/layout/dashboard-shell.tsx`:
   - When the user has dual-module access (`user.acessoOrcamento && user.acessoMedicao`), render a "Trocar Módulo" button in the topbar and/or sidebar with `LayoutGrid` icon leading back to `/portal`.
3. Write your report to:
   `c:/Users/aaaaa/OneDrive - Piatec/TI_CODIGOS/T.I/orçamento RBT/.agents/teamwork/explorer_m2_2/handoff.md`.


## 2026-10-20T19:34:55Z
You are explorer_m2_2.
Your working directory is: c:/Users/aaaaa/OneDrive - Piatec/TI_CODIGOS/T.I/orçamento RBT/.agents/teamwork/explorer_m2_2
Read DISPATCH.md in your working directory, PROJECT.md at c:/Users/aaaaa/OneDrive - Piatec/TI_CODIGOS/T.I/orçamento RBT/PROJECT.md, and ORIGINAL_REQUEST.md at c:/Users/aaaaa/OneDrive - Piatec/TI_CODIGOS/T.I/orçamento RBT/.agents/teamwork/ORIGINAL_REQUEST.md.

Formulate root redirection and module switcher:
- src/app/page.tsx: Triage authenticated users to /portal (dual access), /dashboard (orcamento only), or /medicao (medicao only).
- src/components/layout/dashboard-shell.tsx: Add "Trocar Módulo" button with LayoutGrid icon when user has dual-module access.
Output your handoff report to c:/Users/aaaaa/OneDrive - Piatec/TI_CODIGOS/T.I/orçamento RBT/.agents/teamwork/explorer_m2_2/handoff.md and notify with send_message when complete.
