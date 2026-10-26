# Task Assignment: Challenger M1-1 — Empirical Adversarial Token Verification

Read PROJECT.md at `c:/Users/aaaaa/OneDrive - Piatec/TI_CODIGOS/T.I/orçamento RBT/PROJECT.md`
and ORIGINAL_REQUEST.md at `c:/Users/aaaaa/OneDrive - Piatec/TI_CODIGOS/T.I/orçamento RBT/.agents/teamwork/ORIGINAL_REQUEST.md`.

Your mission:
Empirically challenge the new token and session implementation in `src/lib/token-utils.ts` and `src/lib/session.ts`:
1. Craft an adversarial script (e.g. in your working directory) testing:
   - Tampered payload (modifying `acessoOrcamento` from false to true).
   - Tampered signature (bit-flip in signature).
   - Expired token (> 12 hours).
   - Empty, null, malformed inputs, truncated strings.
   - Non-existent session tokens in `validateSession`.
2. Execute the challenge script and assert that all adversarial attacks are correctly rejected.
3. Determine your verdict: **APPROVE** or **REJECT**.
4. Write your handoff report to:
   `c:/Users/aaaaa/OneDrive - Piatec/TI_CODIGOS/T.I/orçamento RBT/.agents/teamwork/challenger_m1_1/handoff.md`.


## 2026-10-20T19:23:20Z
You are challenger_m1_1.
Your working directory is: c:/Users/aaaaa/OneDrive - Piatec/TI_CODIGOS/T.I/orçamento RBT/.agents/teamwork/challenger_m1_1
Read DISPATCH.md in your working directory, PROJECT.md at c:/Users/aaaaa/OneDrive - Piatec/TI_CODIGOS/T.I/orçamento RBT/PROJECT.md, and ORIGINAL_REQUEST.md at c:/Users/aaaaa/OneDrive - Piatec/TI_CODIGOS/T.I/orçamento RBT/.agents/teamwork/ORIGINAL_REQUEST.md.

Empirically challenge the new token and session implementation in src/lib/token-utils.ts and src/lib/session.ts:
1. Craft an adversarial script testing tampered payloads, bit-flip signatures, expired tokens, null/empty values, and invalid sessions.
2. Run tests and assert all attacks are rejected.
3. Determine verdict: APPROVE or REJECT.
4. Output your report to c:/Users/aaaaa/OneDrive - Piatec/TI_CODIGOS/T.I/orçamento RBT/.agents/teamwork/challenger_m1_1/handoff.md and notify with send_message when complete.
