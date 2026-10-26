# DISPATCH — Explorer M5-R2-2 (Middleware Legacy Fallback & Synchronous Hardening Blueprint)

## Mission
Formulate exact remediation blueprint for `src/middleware.ts` to eliminate the Edge Middleware legacy dashboard bypass and unverified synchronous payload evaluation reported by `challenger_m5_1`.

## Working Directory
`c:/Users/aaaaa/OneDrive - Piatec/TI_CODIGOS/T.I/orçamento RBT/.agents/teamwork/explorer_m5_r2_2`

## Mandatory Reference Documents
1. `c:/Users/aaaaa/OneDrive - Piatec/TI_CODIGOS/T.I/orçamento RBT/.agents/teamwork/ORIGINAL_REQUEST.md`
2. `c:/Users/aaaaa/OneDrive - Piatec/TI_CODIGOS/T.I/orçamento RBT/PROJECT.md`
3. `c:/Users/aaaaa/OneDrive - Piatec/TI_CODIGOS/T.I/orçamento RBT/.agents/teamwork/challenger_m5_1/handoff.md`
4. `src/middleware.ts`

## Investigation Scope
1. **Legacy Fallback Restriction**:
   - In `src/middleware.ts:277`, currently:
     `if (hasSession && !claims && request.nextUrl.pathname.startsWith('/dashboard'))`
   - If an attacker sends `rbt_orcamentos_session="forged"` with a tampered `rbt_user_meta`, `verifyUserMeta` returns `null`, but line 277 matches because `hasSession` is true. This grants status 200 pass-through instead of 307 redirect to `/login`.
   - Fix: Only apply legacy fallback if `!userMetaToken` (i.e. cookie completely absent). If `userMetaToken` was provided but invalid/tampered (`claims === null`), do NOT apply fallback; allow normal unauthenticated flow to redirect to `/login` with 307.
2. **Synchronous Evaluation Hardening**:
   - In `parsePayloadUnsafe`, add the future clock drift validation (`parsed.ts > now + 60_000`).
   - In `middleware(req)`, ensure `syncRes` does not grant elevated permissions to unverified claims from `parsePayloadUnsafe`.
   - Ensure `npm test` (`scripts/verify-security-routes.ts`) still passes 29/29 tests.

## Deliverable
Deliver your handoff report to `c:/Users/aaaaa/OneDrive - Piatec/TI_CODIGOS/T.I/orçamento RBT/.agents/teamwork/explorer_m5_r2_2/handoff.md` and notify with `send_message`.

## 2026-10-21T12:34:27Z
[Message] timestamp=2026-10-21T12:34:27Z sender=e65a3c02-8d0d-46b7-ac87-62b0077928ce priority=MESSAGE_PRIORITY_HIGH content=You are explorer_m5_r2_2.
Your working directory is: c:/Users/aaaaa/OneDrive - Piatec/TI_CODIGOS/T.I/orçamento RBT/.agents/teamwork/explorer_m5_r2_2
Read DISPATCH.md in your working directory, PROJECT.md at c:/Users/aaaaa/OneDrive - Piatec/TI_CODIGOS/T.I/orçamento RBT/PROJECT.md, ORIGINAL_REQUEST.md at c:/Users/aaaaa/OneDrive - Piatec/TI_CODIGOS/T.I/orçamento RBT/.agents/teamwork/ORIGINAL_REQUEST.md, and challenger_m5_1's report at c:/Users/aaaaa/OneDrive - Piatec/TI_CODIGOS/T.I/orçamento RBT/.agents/teamwork/challenger_m5_1/handoff.md.

Formulate the remediation blueprint for src/middleware.ts:
- Restrict /dashboard legacy fallback: ONLY activate if userMetaToken was completely absent. If userMetaToken was provided but verifyUserMeta failed (claims === null), do NOT apply fallback; allow normal unauthenticated flow to redirect to /login with 307.
- Harden synchronous evaluation so syncRes does not trust parsePayloadUnsafe to grant elevated access to unverified claims.
- Ensure npm test (scripts/verify-security-routes.ts) still passes 29/29 tests.
- Deliver your handoff report to c:/Users/aaaaa/OneDrive - Piatec/TI_CODIGOS/T.I/orçamento RBT/.agents/teamwork/explorer_m5_r2_2/handoff.md and notify with send_message when complete.
