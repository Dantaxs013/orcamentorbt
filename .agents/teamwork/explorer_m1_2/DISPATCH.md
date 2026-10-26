# Task Assignment: Explorer M1-2 — Session, Token Utils & HMAC Auth Layer

Read PROJECT.md at `c:/Users/aaaaa/OneDrive - Piatec/TI_CODIGOS/T.I/orçamento RBT/PROJECT.md`
and ORIGINAL_REQUEST.md at `c:/Users/aaaaa/OneDrive - Piatec/TI_CODIGOS/T.I/orçamento RBT/.agents/teamwork/ORIGINAL_REQUEST.md`.

Your mission for Milestone M1 (Data & Auth Foundation):
1. Review `src/lib/auth.ts`, `src/lib/session.ts` in `orçamento RBT` and `Medicaodiaria/src/lib/token-utils.ts`.
2. Formulate the exact code changes for:
   - `src/lib/auth.ts`: Update `AuthUser` interface to include `acessoOrcamento: boolean; acessoMedicao: boolean; nome?: string | null; telefone?: string | null;`.
   - `src/lib/token-utils.ts`: Create token utilities using Web Crypto API (`crypto.subtle`) to sign and verify `rbt_user_meta` cookies with HMAC SHA-256 containing `{ userId, role, email, acessoOrcamento, acessoMedicao, ts }`.
   - `src/lib/session.ts`:
     - Update `validateSession` to select `acessoOrcamento` and `acessoMedicao`.
     - Update `createSession` and `buildSessionCookies` to issue both `rbt_orcamentos_session` and `rbt_user_meta`.
     - Update `destroySession` to clear both cookies.
     - Update `getServerSession()` to return the updated `AuthUser`.
   - `src/app/api/auth/me/route.ts`: Return the new access flags.
   - `src/app/api/auth/login/route.ts`: Return the new access flags and proper redirect target (`/portal` or specific module).
3. Ensure 100% backward compatibility for all existing callers of `getServerSession()`.
4. Write your report with exact code implementations to:
   `c:/Users/aaaaa/OneDrive - Piatec/TI_CODIGOS/T.I/orçamento RBT/.agents/teamwork/explorer_m1_2/handoff.md`.


## 2026-10-20T18:51:48Z
You are explorer_m1_2.
Your working directory is: c:/Users/aaaaa/OneDrive - Piatec/TI_CODIGOS/T.I/orçamento RBT/.agents/teamwork/explorer_m1_2
Read DISPATCH.md in your working directory, PROJECT.md at c:/Users/aaaaa/OneDrive - Piatec/TI_CODIGOS/T.I/orçamento RBT/PROJECT.md, and ORIGINAL_REQUEST.md at c:/Users/aaaaa/OneDrive - Piatec/TI_CODIGOS/T.I/orçamento RBT/.agents/teamwork/ORIGINAL_REQUEST.md.

Investigate Session, Token Utils & HMAC Auth Layer for Milestone M1:
1. Update AuthUser interface in src/lib/auth.ts to include acessoOrcamento, acessoMedicao, etc.
2. Specify src/lib/token-utils.ts using Web Crypto API to sign/verify rbt_user_meta HMAC tokens for Edge Middleware compatibility.
3. Update src/lib/session.ts (validateSession, createSession, buildSessionCookies, destroySession, getServerSession) to handle both session cookie and user meta cookie with full backward compatibility.
4. Update src/app/api/auth/login/route.ts and src/app/api/auth/me/route.ts.
5. Output your verified code recipes to c:/Users/aaaaa/OneDrive - Piatec/TI_CODIGOS/T.I/orçamento RBT/.agents/teamwork/explorer_m1_2/handoff.md and notify with send_message when complete.
