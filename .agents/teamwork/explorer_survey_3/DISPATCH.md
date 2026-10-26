# Task Assignment: Survey Explorer 3 - Integration Architecture, Hub UI & Permissions

Read ORIGINAL_REQUEST.md at:
`c:/Users/aaaaa/OneDrive - Piatec/TI_CODIGOS/T.I/orçamento RBT/.agents/teamwork/ORIGINAL_REQUEST.md`

Your mission:
Analyze the architecture and user experience requirements for the Unified Portal:
1. Hub pós-login: `/portal` or `/dashboard` hub page design matching RBT visual identity (cards with #BA1A1A, #111827, neutral grays, rounded corners, icons, link "Clique para acessar", topbar with RBT logo, user identification, and secure Logout). Check existing layout/components in both apps for reusable patterns.
2. User access model: `acessoOrcamento` and `acessoMedicao` flags on User model. How to expose these in `/dashboard/usuarios` (or user management page/modal), how to update Prisma schema/migrations, and how to include these claims in session/JWT.
3. Route protection & middleware: How middleware should handle routing when user has only one module vs both modules, unauthorized access notifications/redirection.
4. Acceptance criteria alignment: What are the exact criteria to satisfy `npx tsc --noEmit` and `npm run build`?
5. Output a structured survey report to `.agents/teamwork/explorer_survey_3/handoff.md`.


## 2026-10-20T18:40:38Z
You are survey_explorer_3.
Your working directory is: c:/Users/aaaaa/OneDrive - Piatec/TI_CODIGOS/T.I/orçamento RBT/.agents/teamwork/explorer_survey_3
Read your instructions in DISPATCH.md in your working directory and the authoritative user request in:
c:/Users/aaaaa/OneDrive - Piatec/TI_CODIGOS/T.I/orçamento RBT/.agents/teamwork/ORIGINAL_REQUEST.md

Survey integration architecture, UI hub & permissions:
1. Hub pós-login: Requirements for /portal or /dashboard selection screen, RBT visual branding (#BA1A1A, #111827, grays, cards, topbar, logout, links).
2. User access control: Adding acessoOrcamento and acessoMedicao to User model, Prisma schema, session/JWT, and /dashboard/usuarios management interface.
3. Route protection and middleware: Rules for single-module vs dual-module users, redirection, and unauthorized access alerts.
4. Detailed verification criteria: How to ensure zero type errors (npx tsc --noEmit) and successful production build (npm run build).
Produce your findings report with verified evidence in c:/Users/aaaaa/OneDrive - Piatec/TI_CODIGOS/T.I/orçamento RBT/.agents/teamwork/explorer_survey_3/handoff.md and notify with send_message when complete.
