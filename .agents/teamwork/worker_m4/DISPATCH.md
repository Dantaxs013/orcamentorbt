## 2026-10-20T21:18:31Z
You are worker_m4.
Your working directory is: c:/Users/aaaaa/OneDrive - Piatec/TI_CODIGOS/T.I/orçamento RBT/.agents/teamwork/worker_m4
Read DISPATCH.md in your working directory, PROJECT.md at c:/Users/aaaaa/OneDrive - Piatec/TI_CODIGOS/T.I/orçamento RBT/PROJECT.md, ORIGINAL_REQUEST.md at c:/Users/aaaaa/OneDrive - Piatec/TI_CODIGOS/T.I/orçamento RBT/.agents/teamwork/ORIGINAL_REQUEST.md, and the 3 M4 Explorer blueprints:
- c:/Users/aaaaa/OneDrive - Piatec/TI_CODIGOS/T.I/orçamento RBT/.agents/teamwork/explorer_m4_1/handoff.md (Pages, Shell, Components)
- c:/Users/aaaaa/OneDrive - Piatec/TI_CODIGOS/T.I/orçamento RBT/.agents/teamwork/explorer_m4_2/handoff.md (APIs, Calculations, Schemas, Email)
- c:/Users/aaaaa/OneDrive - Piatec/TI_CODIGOS/T.I/orçamento RBT/.agents/teamwork/explorer_m4_3/handoff.md (User Priority UX Adjustments & Test Harness)

Implement Milestone M4 (Medição Diária Core Integration & User Priority UX Adjustments):
1. Apply User Priority UX adjustments:
   - src/app/api/auth/login/route.ts: set redirectUrl = '/portal' for ALL authenticated users.
   - src/app/page.tsx: redirect all authenticated sessions to /portal.
   - src/app/portal/page.tsx: strict card filtering with full DOM omission ({hasOrcamento && ...}, {hasMedicao && ...}).
2. Copy and transplant Medição Diária libs and types from ..\Medicaodiaria:
   - src/types/enums.ts
   - src/lib/calculations/rdp-math.ts
   - src/lib/security-headers.ts
   - src/lib/validations/ (rdp.schema.ts, contrato.schema.ts, medicao.schema.ts, auth.schema.ts, index.ts)
   - src/lib/email.ts: add notifyEngenheiroRdpSubmetido and notifyGestorMedicaoSubmetida while strictly preserving all existing Orçamentos emails.
3. Copy and map Medição Diária components into src/components/medicao/:
   - rdp/*, engenheiro/*, estacas/*, obras/*, admin/*
   - src/components/medicao/layout/medicao-shell.tsx (with links prefixed /medicao, and 'Trocar Módulo' link to /portal).
4. Establish pages under src/app/medicao/:
   - layout.tsx, page.tsx, apontador/*, engenheiro/*, admin/*
5. Copy API routes into src/app/api/:
   - rdp/*, estacas/*, obras/*, contratos/*, medicoes/*, marca/pdf/*, health/*, admin/usuarios/*
6. Copy public/logo-rbt.svg from ..\Medicaodiaria\public\logo-rbt.svg.
7. Update scripts/verify-portal-unified.ts per explorer_m4_3/handoff.md.
8. Execute verification:
   - npx tsc --noEmit (must exit code 0)
   - npm test (must pass 29/29)
   - npx tsx scripts/verify-portal-unified.ts --tier=1
   - npx tsx scripts/verify-portal-unified.ts --tier=2
   - Clean build: powershell -Command "if (Test-Path .next) { Remove-Item -Recurse -Force .next }; npm run build" (must exit code 0).

DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Deliver your completion handoff report to c:/Users/aaaaa/OneDrive - Piatec/TI_CODIGOS/T.I/orçamento RBT/.agents/teamwork/worker_m4/handoff.md and notify with send_message when complete.
