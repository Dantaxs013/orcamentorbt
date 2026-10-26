# Task Assignment: Challenger M2-2 — Empirical Module Switcher & Persona Navigation Test

Read PROJECT.md at `c:/Users/aaaaa/OneDrive - Piatec/TI_CODIGOS/T.I/orçamento RBT/PROJECT.md`
and ORIGINAL_REQUEST.md at `c:/Users/aaaaa/OneDrive - Piatec/TI_CODIGOS/T.I/orçamento RBT/.agents/teamwork/ORIGINAL_REQUEST.md`.

Your mission:
Empirically stress-test navigation flow and switcher visibility across all user personas:
1. Test Personas:
   - "Lucas" (Orçamentista): `acessoOrcamento: true, acessoMedicao: false` -> switcher MUST be hidden; root redirects to `/dashboard`.
   - "Carlos" (Apontador): `acessoOrcamento: false, acessoMedicao: true` -> switcher MUST be hidden; root redirects to `/medicao`.
   - "Roberto" (Diretoria/Admin): `acessoOrcamento: true, acessoMedicao: true` -> switcher MUST be visible; root redirects to `/portal`.
2. Verify that clicking "Trocar Módulo" links to `/portal`.
3. Verify that `/portal` displays Card 1 as enabled and Card 2 as disabled for Lucas, Card 1 as disabled and Card 2 as enabled for Carlos, and both cards enabled for Roberto.
4. Determine verdict: **APPROVE** or **REJECT**.
5. Write your report to:
   `c:/Users/aaaaa/OneDrive - Piatec/TI_CODIGOS/T.I/orçamento RBT/.agents/teamwork/challenger_m2_2/handoff.md`.


## 2026-10-20T19:49:44Z
You are challenger_m2_2.
Your working directory is: c:/Users/aaaaa/OneDrive - Piatec/TI_CODIGOS/T.I/orçamento RBT/.agents/teamwork/challenger_m2_2
Read DISPATCH.md in your working directory, PROJECT.md at c:/Users/aaaaa/OneDrive - Piatec/TI_CODIGOS/T.I/orçamento RBT/PROJECT.md, and ORIGINAL_REQUEST.md at c:/Users/aaaaa/OneDrive - Piatec/TI_CODIGOS/T.I/orçamento RBT/.agents/teamwork/ORIGINAL_REQUEST.md.

Empirically stress-test switcher visibility and user personas for Milestone M2:
1. Test Personas Lucas (orcamentos-only), Carlos (medicao-only), and Roberto (dual access).
2. Verify switcher visibility and link targets.
3. Verify Card states on /portal for each persona.
4. Determine verdict: APPROVE or REJECT.
5. Output your report to c:/Users/aaaaa/OneDrive - Piatec/TI_CODIGOS/T.I/orçamento RBT/.agents/teamwork/challenger_m2_2/handoff.md and notify with send_message when complete.
