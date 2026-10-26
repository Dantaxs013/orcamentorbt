# Task Assignment: Worker M3 — Implement User Management UI & Permissions API

Read PROJECT.md at `c:/Users/aaaaa/OneDrive - Piatec/TI_CODIGOS/T.I/orçamento RBT/PROJECT.md`
and ORIGINAL_REQUEST.md at `c:/Users/aaaaa/OneDrive - Piatec/TI_CODIGOS/T.I/orçamento RBT/.agents/teamwork/ORIGINAL_REQUEST.md`.

You are implementing Milestone M3 (User Management UI & Permissions API) using the verified findings and drop-in artifacts from:
- `explorer_m3_1`: `.agents/teamwork/explorer_m3_1/handoff.md`, `proposed_usuarios-client.tsx`, and `proposed_page.tsx`
- `explorer_m3_2`: `.agents/teamwork/explorer_m3_2/handoff.md` (Zod schemas and API endpoints)
- `explorer_m3_3`: `.agents/teamwork/explorer_m3_3/handoff.md`

## Files You Own Exclusively
- `src/lib/validations/usuario.schema.ts`
- `src/app/api/usuarios/route.ts`
- `src/app/api/usuarios/[id]/route.ts`
- `src/app/dashboard/usuarios/page.tsx`
- `src/components/usuarios/usuarios-client.tsx`

## Implementation Steps
1. Create `src/lib/validations/usuario.schema.ts` with Zod validation schemas for user creation and update per `explorer_m3_2/handoff.md`.
2. Update `src/app/api/usuarios/route.ts`:
   - `GET`: Select `acessoOrcamento` and `acessoMedicao` along with existing fields.
   - `POST`: Parse body with Zod schema, enforce `>= 1 module`, persist `acessoOrcamento` and `acessoMedicao` to Prisma.
3. Update `src/app/api/usuarios/[id]/route.ts`:
   - `PATCH`: Allow updating `acessoOrcamento` and `acessoMedicao`, enforce `>= 1 module`, guard logged-in admin against self-lockout / revoking all modules / demotion from Admin.
4. Update `src/app/dashboard/usuarios/page.tsx`:
   - Include `acessoOrcamento` and `acessoMedicao` in Prisma query select per `explorer_m3_1/proposed_page.tsx`.
5. Update `src/components/usuarios/usuarios-client.tsx`:
   - Deploy `proposed_usuarios-client.tsx` containing:
     - Table column "Módulos Habilitados" with Orçamentos and Medição badges.
     - Create User Modal with module selection checkboxes (`acessoOrcamento`, `acessoMedicao`) and validation requiring `>= 1 module`.
     - Edit User Modal with module toggles and admin self-protection guards.
6. Run verification:
   - `npx tsc --noEmit`
   - `npx tsx scripts/verify-portal-unified.ts --tier=1`
   - `npm test`
   - `npm run build`
7. Deliver completion handoff report to `.agents/teamwork/worker_m3/handoff.md`.

## Mandatory Integrity Warning
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.
