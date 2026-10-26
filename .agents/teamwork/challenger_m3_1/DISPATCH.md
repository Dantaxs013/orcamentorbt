# Task Assignment: Challenger M3-1 — Adversarial Validation & Permissions Testing

Read PROJECT.md at `c:/Users/aaaaa/OneDrive - Piatec/TI_CODIGOS/T.I/orçamento RBT/PROJECT.md`
and ORIGINAL_REQUEST.md at `c:/Users/aaaaa/OneDrive - Piatec/TI_CODIGOS/T.I/orçamento RBT/.agents/teamwork/ORIGINAL_REQUEST.md`.

Review Worker M3's implementation and handoff at:
`c:/Users/aaaaa/OneDrive - Piatec/TI_CODIGOS/T.I/orçamento RBT/.agents/teamwork/worker_m3/handoff.md`.

Your mission:
Empirically stress-test the user creation and update validation rules:
1. Write an adversarial stress test or harness that tests:
   - Creating a user with `{ acessoOrcamento: false, acessoMedicao: false }` -> must fail validation.
   - Creating a user with empty strings, malformed booleans, unexpected fields.
   - Updating an existing user via PATCH to `{ acessoOrcamento: false, acessoMedicao: false }` -> must return HTTP 400.
   - Attempting admin self-deactivation or self-demotion.
2. Confirm all adversarial attempts are properly rejected.
3. Determine verdict: **APPROVE** or **REJECT**.
4. Output your report to:
   `c:/Users/aaaaa/OneDrive - Piatec/TI_CODIGOS/T.I/orçamento RBT/.agents/teamwork/challenger_m3_1/handoff.md`.


## 2026-10-20T20:43:54Z
You are challenger_m3_1.
Your working directory is: c:/Users/aaaaa/OneDrive - Piatec/TI_CODIGOS/T.I/orçamento RBT/.agents/teamwork/challenger_m3_1
Read DISPATCH.md in your working directory, PROJECT.md at c:/Users/aaaaa/OneDrive - Piatec/TI_CODIGOS/T.I/orçamento RBT/PROJECT.md, ORIGINAL_REQUEST.md at c:/Users/aaaaa/OneDrive - Piatec/TI_CODIGOS/T.I/orçamento RBT/.agents/teamwork/ORIGINAL_REQUEST.md, and worker_m3's handoff.md at c:/Users/aaaaa/OneDrive - Piatec/TI_CODIGOS/T.I/orçamento RBT/.agents/teamwork/worker_m3/handoff.md.

Empirically challenge the validation and access rules for Milestone M3:
1. Write a verification or stress script testing rejection of zero-module payloads, malformed values, invalid PATCH attempts, and admin self-deactivation.
2. Verify all attempts are correctly blocked.
3. Determine verdict: APPROVE or REJECT.
4. Deliver handoff report to c:/Users/aaaaa/OneDrive - Piatec/TI_CODIGOS/T.I/orçamento RBT/.agents/teamwork/challenger_m3_1/handoff.md and notify with send_message when complete.
