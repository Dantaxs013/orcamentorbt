# Task Assignment: Explorer M3-2 — User Permissions API Specification

Read PROJECT.md at `c:/Users/aaaaa/OneDrive - Piatec/TI_CODIGOS/T.I/orçamento RBT/PROJECT.md`
and ORIGINAL_REQUEST.md at `c:/Users/aaaaa/OneDrive - Piatec/TI_CODIGOS/T.I/orçamento RBT/.agents/teamwork/ORIGINAL_REQUEST.md`.

Your mission for Milestone M3 (User Management UI & Permissions API):
1. Review `src/app/api/usuarios/route.ts` and `src/app/api/usuarios/[id]/route.ts`.
2. Formulate the exact API changes:
   - `GET /api/usuarios`: Include `acessoOrcamento` and `acessoMedicao` in the selected fields.
   - `POST /api/usuarios`:
     - Validate input: require `name`, `email`, `password`, `role`.
     - Read `acessoOrcamento` and `acessoMedicao` (with defensive defaults if omitted: role-based).
     - Validation rule: Reject request with HTTP 400 if both `acessoOrcamento` and `acessoMedicao` are false ("O usuário deve possuir acesso a pelo menos um módulo do sistema.").
     - Persist `acessoOrcamento` and `acessoMedicao` to Prisma.
   - `PATCH /api/usuarios/[id]`:
     - Allow updating `acessoOrcamento` and `acessoMedicao`.
     - Validation: If both flags are being set to false, reject with HTTP 400.
     - Self-protection: Prevent the logged-in admin from deactivating their own account or revoking all modules from themselves.
3. Formulate drop-in code recipes with full TypeScript types and Zod validation.
4. Write your report to:
   `c:/Users/aaaaa/OneDrive - Piatec/TI_CODIGOS/T.I/orçamento RBT/.agents/teamwork/explorer_m3_2/handoff.md`.

## 2026-10-20T20:08:19Z
You are explorer_m3_2.
Your working directory is: c:/Users/aaaaa/OneDrive - Piatec/TI_CODIGOS/T.I/orçamento RBT/.agents/teamwork/explorer_m3_2
Read DISPATCH.md in your working directory, PROJECT.md at c:/Users/aaaaa/OneDrive - Piatec/TI_CODIGOS/T.I/orçamento RBT/PROJECT.md, and ORIGINAL_REQUEST.md at c:/Users/aaaaa/OneDrive - Piatec/TI_CODIGOS/T.I/orçamento RBT/.agents/teamwork/ORIGINAL_REQUEST.md.

Formulate User Permissions API specification:
- GET /api/usuarios: return acessoOrcamento and acessoMedicao.
- POST /api/usuarios: read and validate acessoOrcamento and acessoMedicao, enforce >= 1 module, persist to Prisma.
- PATCH /api/usuarios/[id]: allow updating acessoOrcamento and acessoMedicao, enforce >= 1 module, guard current admin against self-lockout.
Output your handoff report to c:/Users/aaaaa/OneDrive - Piatec/TI_CODIGOS/T.I/orçamento RBT/.agents/teamwork/explorer_m3_2/handoff.md and notify with send_message when complete.
