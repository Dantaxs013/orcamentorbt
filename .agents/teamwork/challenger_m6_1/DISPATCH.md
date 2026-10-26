# DISPATCH — Challenger M6-1 (Deep Project-Wide Adversarial Verification)

## Mission
Adversarially challenge the entire Portal Unificado system, testing boundary conditions, attack surfaces, security perimeters, and cryptographic resilience.

## Mandatory Reference Documents
1. `c:/Users/aaaaa/OneDrive - Piatec/TI_CODIGOS/T.I/orçamento RBT/.agents/teamwork/ORIGINAL_REQUEST.md`
2. `c:/Users/aaaaa/OneDrive - Piatec/TI_CODIGOS/T.I/orçamento RBT/PROJECT.md`
3. `c:/Users/aaaaa/OneDrive - Piatec/TI_CODIGOS/T.I/orçamento RBT/TEST_INFRA.md`
4. `c:/Users/aaaaa/OneDrive - Piatec/TI_CODIGOS/T.I/orçamento RBT/TEST_READY.md`

## Adversarial Tasks
1. Execute `npx tsx scripts/challenger-m5-adversarial.ts` (35 attack vectors).
2. Execute `npx tsx scripts/challenger-m5-boundary-stress.ts` (91 boundary tests).
3. Test User Priority rules:
   - Root `/` and `/login` always route to `/portal` for authenticated users.
   - `/portal` strictly filters unauthorized cards from DOM (0 DOM nodes, no disabled placeholders).
4. Test cross-module isolation:
   - Orçamentos database tables vs Medição Diária tables are completely decoupled.
   - Apontador role cannot access engineering or admin routes.
   - Unauthorized API access returns 401/403.
5. Determine explicit verdict: `APPROVE` or `REJECT`.
6. Deliver handoff report to `c:/Users/aaaaa/OneDrive - Piatec/TI_CODIGOS/T.I/orçamento RBT/.agents/teamwork/challenger_m6_1/handoff.md` and notify with `send_message`.


## 2026-10-21T13:17:34Z
You are challenger_m6_1.
Your working directory is: c:/Users/aaaaa/OneDrive - Piatec/TI_CODIGOS/T.I/orçamento RBT/.agents/teamwork/challenger_m6_1
Read DISPATCH.md in your working directory, PROJECT.md at c:/Users/aaaaa/OneDrive - Piatec/TI_CODIGOS/T.I/orçamento RBT/PROJECT.md, ORIGINAL_REQUEST.md at c:/Users/aaaaa/OneDrive - Piatec/TI_CODIGOS/T.I/orçamento RBT/.agents/teamwork/ORIGINAL_REQUEST.md, TEST_INFRA.md, and TEST_READY.md.

Adversarially challenge the entire Portal Unificado system:
1. Execute npx tsx scripts/challenger-m5-adversarial.ts (35 attack vectors).
2. Execute npx tsx scripts/challenger-m5-boundary-stress.ts (91 boundary tests).
3. Verify User Priority rules: root / and /login always route to /portal; /portal strictly omits unauthorized cards from DOM (0 DOM nodes).
4. Verify cross-module isolation and 401/403 API protections.
5. Determine explicit verdict: APPROVE or REJECT.
6. Deliver handoff report to c:/Users/aaaaa/OneDrive - Piatec/TI_CODIGOS/T.I/orçamento RBT/.agents/teamwork/challenger_m6_1/handoff.md and notify with send_message when complete.
