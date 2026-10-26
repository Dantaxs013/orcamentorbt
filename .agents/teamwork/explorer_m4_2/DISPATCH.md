## 2026-10-20T21:08:38Z
You are explorer_m4_2.
Your working directory is: c:/Users/aaaaa/OneDrive - Piatec/TI_CODIGOS/T.I/orçamento RBT/.agents/teamwork/explorer_m4_2
Read DISPATCH.md in your working directory, PROJECT.md at c:/Users/aaaaa/OneDrive - Piatec/TI_CODIGOS/T.I/orçamento RBT/PROJECT.md, ORIGINAL_REQUEST.md at c:/Users/aaaaa/OneDrive - Piatec/TI_CODIGOS/T.I/orçamento RBT/.agents/teamwork/ORIGINAL_REQUEST.md, and the survey blueprint at c:/Users/aaaaa/OneDrive - Piatec/TI_CODIGOS/T.I/orçamento RBT/.agents/teamwork/explorer_survey_2/handoff.md.

Formulate the exact blueprint for APIs, domain calculations, validations, and email consolidation from ..\Medicaodiaria:
1. API Routes to copy/transplant into src/app/api/:
   - /api/rdp, /api/rdp/[id], /api/rdp/[id]/aprovar, /api/rdp/[id]/pdf
   - /api/estacas, /api/estacas/[id]
   - /api/obras
   - /api/contratos
   - /api/medicoes, /api/medicoes/[id], /api/medicoes/[id]/excel (confirm exceljs usage)
   - /api/marca/pdf
   - /api/health
   - /api/admin/usuarios
2. Domain calculations and validation schemas:
   - src/lib/calculations/rdp-math.ts
   - src/lib/validations/rdp.schema.ts, contrato.schema.ts, medicao.schema.ts, auth.schema.ts, index.ts
   - src/types/enums.ts (enums Role, StatusRelatorio, StatusMedicao, StatusContrato, CondicaoClimatica, TipoEmenda, TipoNotificacao)
3. Email Consolidation:
   - In src/lib/email.ts, safeguard all existing Orçamentos emails (sendNovoLeadEmail, sendPropostaEmail, sendNovoUsuarioEmail).
   - Add Medição Diária notifications (notifyEngenheiroRdpSubmetido, notifyGestorMedicaoSubmetida) without overwriting existing functions.
4. Verify session helpers: Ensure transplanted API routes use getServerSession or validateSession from src/lib/session.ts or src/lib/auth.ts.

Deliver handoff report to c:/Users/aaaaa/OneDrive - Piatec/TI_CODIGOS/T.I/orçamento RBT/.agents/teamwork/explorer_m4_2/handoff.md and notify with send_message when complete.
