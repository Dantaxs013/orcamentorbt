# Task Assignment: Explorer M2-1 — Portal Hub (/portal) UI & Component Specification

Read PROJECT.md at `c:/Users/aaaaa/OneDrive - Piatec/TI_CODIGOS/T.I/orçamento RBT/PROJECT.md`
and ORIGINAL_REQUEST.md at `c:/Users/aaaaa/OneDrive - Piatec/TI_CODIGOS/T.I/orçamento RBT/.agents/teamwork/ORIGINAL_REQUEST.md`.

Your mission for Milestone M2 (Portal Selection Hub & Navigation):
1. Specify the complete, exact implementation of `src/app/portal/page.tsx`:
   - Server Component that verifies session using `getServerSession()`.
   - Institutional Topbar with `RBTLogo`, user profile badge, and `LogoutButton`.
   - Friendly unauthorized alert when `searchParams.unauthorized` is set.
   - Selection cards for "Gestão de Orçamentos" (accent `#BA1A1A`) and "Medição Diária (RDP)" (accent `#111827`).
   - Check `user.acessoOrcamento` and `user.acessoMedicao` to render active "Clique para acessar" button or disabled "Acesso não habilitado" state.
2. Formulate drop-in JSX and CSS code matching the official RBT palette.
3. Write your report to:
   `c:/Users/aaaaa/OneDrive - Piatec/TI_CODIGOS/T.I/orçamento RBT/.agents/teamwork/explorer_m2_1/handoff.md`.
## 2026-10-20T19:34:55Z
You are explorer_m2_1.
Your working directory is: c:/Users/aaaaa/OneDrive - Piatec/TI_CODIGOS/T.I/orçamento RBT/.agents/teamwork/explorer_m2_1
Read DISPATCH.md in your working directory, PROJECT.md at c:/Users/aaaaa/OneDrive - Piatec/TI_CODIGOS/T.I/orçamento RBT/PROJECT.md, and ORIGINAL_REQUEST.md at c:/Users/aaaaa/OneDrive - Piatec/TI_CODIGOS/T.I/orçamento RBT/.agents/teamwork/ORIGINAL_REQUEST.md.

Formulate the complete, exact implementation of src/app/portal/page.tsx:
- Server component reading getServerSession().
- Institutional Topbar with RBTLogo, user identification, and LogoutButton.
- Warning alert when searchParams.unauthorized is present.
- Selection cards for "Gestão de Orçamentos" (#BA1A1A) and "Medição Diária (RDP)" (#111827).
- Active vs disabled card states based on user.acessoOrcamento and user.acessoMedicao.
Output your handoff report to c:/Users/aaaaa/OneDrive - Piatec/TI_CODIGOS/T.I/orçamento RBT/.agents/teamwork/explorer_m2_1/handoff.md and notify with send_message when complete.
