# Task Assignment: Explorer M5-2 — Edge Token HMAC Verification & Session Synchronization

Read PROJECT.md at `c:/Users/aaaaa/OneDrive - Piatec/TI_CODIGOS/T.I/orçamento RBT/PROJECT.md`
and ORIGINAL_REQUEST.md at `c:/Users/aaaaa/OneDrive - Piatec/TI_CODIGOS/T.I/orçamento RBT/.agents/teamwork/ORIGINAL_REQUEST.md`.

Your mission:
Investigate session token handling and Edge verification:
1. Examine `src/lib/token-utils.ts`, `src/lib/session.ts`, and `src/lib/auth.ts`.
2. Verify how `rbt_user_meta` HMAC SHA-256 token is generated upon login (`/api/auth/login`) and verified in Edge middleware.
3. Verify claims: `{ userId, role, email, acessoOrcamento, acessoMedicao, ts }`.
4. Ensure fallback behavior: What happens if `rbt_user_meta` is absent or expired, but `rbt_orcamentos_session` or `rbt_session` cookie is present?
5. Ensure role normalization: Both `ADMIN` and `ADMINISTRADOR` receive full bypass privileges.

Output your report to:
`c:/Users/aaaaa/OneDrive - Piatec/TI_CODIGOS/T.I/orçamento RBT/.agents/teamwork/explorer_m5_2/handoff.md`.

## 2026-10-21T11:46:38Z
You are explorer_m5_2.
Your working directory is: c:/Users/aaaaa/OneDrive - Piatec/TI_CODIGOS/T.I/orçamento RBT/.agents/teamwork/explorer_m5_2
Read DISPATCH.md in your working directory, PROJECT.md at c:/Users/aaaaa/OneDrive - Piatec/TI_CODIGOS/T.I/orçamento RBT/PROJECT.md, and ORIGINAL_REQUEST.md at c:/Users/aaaaa/OneDrive - Piatec/TI_CODIGOS/T.I/orçamento RBT/.agents/teamwork/ORIGINAL_REQUEST.md.

Investigate session token handling and Edge verification:
1. Examine src/lib/token-utils.ts, src/lib/session.ts, and src/lib/auth.ts.
2. Verify rbt_user_meta HMAC SHA-256 token issuance and Edge verification.
3. Verify claims: { userId, role, email, acessoOrcamento, acessoMedicao, ts }.
4. Ensure fallback and role normalization (ADMIN and ADMINISTRADOR).

Deliver handoff report to c:/Users/aaaaa/OneDrive - Piatec/TI_CODIGOS/T.I/orçamento RBT/.agents/teamwork/explorer_m5_2/handoff.md and notify with send_message when complete.
