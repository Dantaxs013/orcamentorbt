# Task Assignment: Explorer M5-1 — Edge Middleware Architecture & Route Protection Specification

Read PROJECT.md at `c:/Users/aaaaa/OneDrive - Piatec/TI_CODIGOS/T.I/orçamento RBT/PROJECT.md`,
ORIGINAL_REQUEST.md at `c:/Users/aaaaa/OneDrive - Piatec/TI_CODIGOS/T.I/orçamento RBT/.agents/teamwork/ORIGINAL_REQUEST.md`,
and the survey blueprint in `c:/Users/aaaaa/OneDrive - Piatec/TI_CODIGOS/T.I/orçamento RBT/.agents/teamwork/explorer_survey_3/handoff.md` (or relevant survey reports).

Your mission:
Formulate the exact Edge Middleware specification for `src/middleware.ts`:
1. Analyze existing `src/middleware.ts` and `Medicaodiaria/src/middleware.ts`.
2. Formulate rules for:
   - Public paths: `/login`, `/esqueci-senha`, `/formulario`, `/api/auth/login`, `/api/auth/logout`, `/_next`, `/favicon.ico`, `/logo-rbt.svg`.
   - `/portal`: Requires active authenticated session. If no session -> redirect to `/login?callbackUrl=/portal`.
   - `/dashboard/*`: Requires `acessoOrcamento === true` (or admin). If false -> redirect to `/portal?unauthorized=orcamentos`.
   - `/medicao/*`: Requires `acessoMedicao === true` (or admin). If false -> redirect to `/portal?unauthorized=medicao`.
   - Apontador restrictions inside `/medicao/*`: If role is `APONTADOR` attempting to access `/medicao/engenheiro/*` or `/medicao/admin/*`, redirect to `/medicao/apontador/rdp` or `/medicao`.
   - APIs: For `/api/orcamentos/*` or `/api/medicoes/*` without proper access, return HTTP 403 Forbidden with JSON error.
3. Edge Compatibility:
   - Ensure middleware executes in Edge runtime without Node-only packages (use `verifyUserMeta` from HMAC SHA-256 token or Web Crypto).
   - Set security headers on all responses.

Output your report to:
`c:/Users/aaaaa/OneDrive - Piatec/TI_CODIGOS/T.I/orçamento RBT/.agents/teamwork/explorer_m5_1/handoff.md`.

## 2026-10-21T11:54:55Z
**Sender**: `e65a3c02-8d0d-46b7-ac87-62b0077928ce`
**Context**: Checking status of Explorer M5-1 handoff report.
**Content**: Are you ready to deliver handoff.md for Milestone M5 Middleware Architecture?
**Action**: Finalize handoff.md in your working directory and notify with completion report.
