# DISPATCH — Challenger M6-2 (Full Persona Lifecycle & Workload Stress)

## Mission
Stress-test realistic multi-tenant user personas, complex state transitions, and end-to-end business workflows across Orçamentos and Medição Diária.

## Mandatory Reference Documents
1. `c:/Users/aaaaa/OneDrive - Piatec/TI_CODIGOS/T.I/orçamento RBT/.agents/teamwork/ORIGINAL_REQUEST.md`
2. `c:/Users/aaaaa/OneDrive - Piatec/TI_CODIGOS/T.I/orçamento RBT/PROJECT.md`
3. `c:/Users/aaaaa/OneDrive - Piatec/TI_CODIGOS/T.I/orçamento RBT/TEST_INFRA.md`
4. `c:/Users/aaaaa/OneDrive - Piatec/TI_CODIGOS/T.I/orçamento RBT/TEST_READY.md`

## Persona & Workload Tasks
1. Execute `npx tsx scripts/verify-portal-unified.ts --tier=4` (Personas and Audit suite):
   - Persona 1: "Engenheiro Carlos" (Medição-only lifecycle: login -> /portal [only Medição card] -> /medicao -> RDP validation).
   - Persona 2: "Orçamentista Lucas" (Orçamento-only lifecycle: login -> /portal [only Orçamentos card] -> /dashboard -> Kanban).
   - Persona 3: "Diretoria Roberto" (Dual-module lifecycle: login -> /portal [both cards] -> module switching between Orçamentos & Medição).
2. Execute full suite: `npx tsx scripts/verify-portal-unified.ts` (all 54 tests across Tiers 1-4).
3. Validate domain calculations in `src/lib/calculations/rdp-math.ts` (net depth, length, totals, emendas).
4. Determine explicit verdict: `APPROVE` or `REJECT`.
5. Deliver handoff report to `c:/Users/aaaaa/OneDrive - Piatec/TI_CODIGOS/T.I/orçamento RBT/.agents/teamwork/challenger_m6_2/handoff.md` and notify with `send_message`.

## 2026-10-21T13:17:34Z
You are challenger_m6_2.
Your working directory is: c:/Users/aaaaa/OneDrive - Piatec/TI_CODIGOS/T.I/orçamento RBT/.agents/teamwork/challenger_m6_2
Read DISPATCH.md in your working directory, PROJECT.md at c:/Users/aaaaa/OneDrive - Piatec/TI_CODIGOS/T.I/orçamento RBT/PROJECT.md, ORIGINAL_REQUEST.md at c:/Users/aaaaa/OneDrive - Piatec/TI_CODIGOS/T.I/orçamento RBT/.agents/teamwork/ORIGINAL_REQUEST.md, TEST_INFRA.md, and TEST_READY.md.

Stress-test user personas and workload flows:
1. Execute npx tsx scripts/verify-portal-unified.ts --tier=4 (Personas and Audit suite: Engenheiro Carlos, Orçamentista Lucas, Diretoria Roberto).
2. Execute full suite: npx tsx scripts/verify-portal-unified.ts (54/54 tests across Tiers 1-4).
3. Validate domain calculations in src/lib/calculations/rdp-math.ts.
4. Determine explicit verdict: APPROVE or REJECT.
5. Deliver handoff report to c:/Users/aaaaa/OneDrive - Piatec/TI_CODIGOS/T.I/orçamento RBT/.agents/teamwork/challenger_m6_2/handoff.md and notify with send_message when complete.
