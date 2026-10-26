# Milestone M3 Verification Protocol & Test Specification Report

## 1. Observation

### 1.1 Existing Verification Harness (`scripts/verify-portal-unified.ts`)
- **Suite 1.4: Feature 5: User Management & Permission API Contract** (`scripts/verify-portal-unified.ts:640-696`):
  ```typescript
  640: suite('1.4 Feature 5: User Management & Permission API Contract');
  642: await test('1.4.1 Valid user creation payload with both modules selected is accepted', () => {
  643:   const payload = {
  644:     name: 'Diretoria RBT', email: 'diretoria@rbt.com.br', password: 'StrongPassword123!',
  645:     role: 'ADMIN', acessoOrcamento: true, acessoMedicao: true,
  646:   };
  647:   const validation = validateUserPermissionsSchema(payload);
  648:   assertEqual(validation.success, true, 'Dual module payload must be valid');
  649:   assertEqual(validation.errors.length, 0, 'No validation errors expected');
  650: });
  656: await test('1.4.2 Valid user creation payload with only one module selected is accepted', () => { ... });
  678: await test('1.4.3 Invalid payload with zero modules selected is rejected with explicit error message', () => { ... });
  ```
  - Observation: Tests in Suite 1.4 test the oracle function `validateUserPermissionsSchema(payload)` (`scripts/verify-portal-unified.ts:279-308`). They do not directly test HTTP API handlers (`/api/usuarios` and `/api/usuarios/[id]`) or database write/read persistence.
  
- **Suite 2.3: Boundary Permission Matrix & API Stress** (`scripts/verify-portal-unified.ts:981-1046`):
  ```typescript
  981: suite('2.3 Boundary Permission Matrix & API Stress');
  983: await test('2.3.1 Full Cartesian product of permission flags evaluated against access barriers', async () => {
  984:   const matrix = [
  985:     { orc: false, med: false, validForCreation: false },
  986:     { orc: true, med: false, validForCreation: true },
  987:     { orc: false, med: true, validForCreation: true },
  988:     { orc: true, med: true, validForCreation: true },
  989:   ];
  ...
  1003: await test('2.3.2 Fuzzing non-boolean values in module flags forces boolean coercion safely', () => { ... });
  ```
  - Observation: Suite 2.3 verifies the Cartesian product `[F, F] -> invalid`, `[T, F] -> valid`, `[F, T] -> valid`, `[T, T] -> valid` and truthy/falsy coercion for `validateUserPermissionsSchema`. It does not cover PATCH edge cases (such as partial update transitions that result in `[F, F]`).

### 1.2 Prisma Schema & Session (`prisma/schema.prisma` and `src/lib/session.ts`)
- In `prisma/schema.prisma:70-82`:
  ```prisma
  model User {
    id              String      @id @default(uuid())
    name            String
    nome            String?
    email           String      @unique
    passwordHash    String
    role            String      @default("ORCAMENTISTA")
    telefone        String?
    ativo           Boolean     @default(true)
    acessoOrcamento Boolean     @default(true)
    acessoMedicao   Boolean     @default(false)
    createdAt       DateTime    @default(now())
    updatedAt       DateTime    @updatedAt
  ...
  ```
  - The database schema already contains `acessoOrcamento` and `acessoMedicao` on the `User` model with defaults.
- In `src/lib/session.ts:63-64`:
  ```typescript
  63: acessoOrcamento: true,
  64: acessoMedicao: true,
  ```
  - Session validation already reads `acessoOrcamento` and `acessoMedicao` from the database when creating user session claims.

### 1.3 Current Implementation Deficits in User Management API
- **`src/app/api/usuarios/route.ts`**:
  - `GET /api/usuarios` (`lines 18-33`): `select` clause does not include `acessoOrcamento` or `acessoMedicao`. The frontend therefore cannot display user module permissions.
  - `POST /api/usuarios` (`lines 62-63`):
    ```typescript
    const { name, email, password, role } = body;
    ```
    `acessoOrcamento` and `acessoMedicao` are completely ignored, not validated, and not written to `prisma.user.create`.
- **`src/app/api/usuarios/[id]/route.ts`**:
  - `PATCH /api/usuarios/[id]` (`lines 32-66`):
    ```typescript
    const { role, ativo, name, password } = body;
    ```
    Neither `acessoOrcamento` nor `acessoMedicao` is processed or updated. There is no protection preventing an update that drops both modules to `false`.
- **`src/components/usuarios/usuarios-client.tsx`**:
  - Interface `Usuario` (`lines 23-33`) lacks `acessoOrcamento: boolean` and `acessoMedicao: boolean`.
  - Create form state `createForm` (`lines 54-59`) lacks module state.
  - Form UI modal (`lines 570-618`) has only role radio buttons (`ORCAMENTISTA` / `ADMIN`), no checkboxes for `acessoOrcamento` and `acessoMedicao`.
  - User table (`lines 306-350`) has no badge or column indicating module access.
  - No modal or UI action exists to edit module access for existing users.

### 1.4 Command Execution Baseline Results
1. `npx tsx scripts/verify-portal-unified.ts --tier=1`
   - Command result: Exited with code 0.
   - All 28 tests in Tier 1 passed (including Suite 1.4 tests 1.4.1, 1.4.2, 1.4.3). Total duration: 49.69ms.
2. `npx tsx scripts/verify-portal-unified.ts --tier=2`
   - Command result: Exited with code 0.
   - All 12 tests in Tier 2 passed (including Suite 2.3 tests 2.3.1, 2.3.2, 2.3.3). Total duration: 34.19ms.
3. `npm test` (`tsx scripts/verify-security-routes.ts`)
   - Command result: Exited with code 0.
   - All 29 security/route tests passed. Total duration: 34.76ms.
4. `npm run build` (`next build`)
   - Command result: Exited with code 0.
   - Successfully compiled 15 static and dynamic routes (including `/portal`, `/dashboard`, `/dashboard/usuarios`, `/api/usuarios`, `/api/usuarios/[id]`).
5. `npx tsc --noEmit`
   - Command result: Exited with code 1.
   - Diagnostic output: `Cannot find namespace 'React'` on `src/app/layout.tsx:13` and auto-generated `.next/types/app/**/*.ts`.
   - Cause: Next.js standalone `tsc` execution does not implicitly resolve React namespace without `@types/react` properly recognized in `tsconfig.json` (e.g. via `compilerOptions.types: ["node", "react", "react-dom"]` or `import type React from 'react'`). Note that `next build` internally handles this and passes typechecking.

---

## 2. Logic Chain

1. **Premise**: Requirement R2 (`ORIGINAL_REQUEST.md`) and Feature 5 (`PROJECT.md`) require multi-module user management:
   - Creation of users with single module (Orçamentos OR Medição) or dual modules (both).
   - Rejection of users with zero modules (at least one module is strictly mandatory).
   - Updating user module permissions via `PATCH /api/usuarios/[id]`.
   - Displaying and toggling module permissions in `/dashboard/usuarios` UI.

2. **Deduction from Observations 1.1 and 1.3**:
   - `scripts/verify-portal-unified.ts` already has the schema oracle `validateUserPermissionsSchema` in Suite 1.4 and 2.3.
   - However, the actual REST API endpoints (`src/app/api/usuarios/route.ts` and `src/app/api/usuarios/[id]/route.ts`) have not yet been wired to consume, validate, or store these fields in the database.
   - To achieve end-to-end integrity in Milestone M3, the verification protocol must verify both the schema validation layer AND the HTTP API routes and database state transitions.

3. **Deduction on PATCH State Invariant**:
   - When updating via `PATCH`, a user can pass:
     - Case A: Both `acessoOrcamento` and `acessoMedicao`. If both evaluate to `false`, the request must fail with HTTP 400.
     - Case B: Only one field (e.g., `{ acessoOrcamento: false }`). The backend MUST read the current user record from the database. If the omitted field (`acessoMedicao`) is already `false`, accepting this patch would produce a zero-module user! Therefore, the combined resulting state must be evaluated: `if (!newOrc && !newMed) -> reject with HTTP 400`.
     - Case C: Re-enabling or adding access (e.g. `{ acessoMedicao: true }`) must succeed with HTTP 200 and return the updated user.

4. **Deduction on Session & Token Reflection**:
   - When an active user's permissions are updated in the database, the user's active session HMAC token (`rbt_user_meta`) in cookie storage holds the claims minted at login.
   - The verification harness already models this transition in Suite 3.3.1 (`scripts/verify-portal-unified.ts:1148-1170`): revoking access and issuing updated tokens immediately enforces the new route barrier.
   - M3 verification must confirm that updated database records propagate correctly to session tokens upon next token issuance/validation.

---

## 3. Caveats

1. **Read-Only Scope**: In compliance with the Explorer archetype and project constraints, no modifications to source code files (`src/app/api/...`, `src/components/...`, `tsconfig.json`) were made during this investigation. Implementation must be performed by the developer agent.
2. **Database State in Automated Tests**: Direct tests hitting `prisma` against SQLite `dev.db` during CI/harness must avoid permanently mutating production seed accounts (e.g., test using transient test emails such as `test_m3_*@rbt.com.br` and cleanup afterward, or use mock/isolated request simulation).
3. **`tsc --noEmit` vs `next build`**: `next build` runs typechecking and passes 100%. `npx tsc --noEmit` requires `types: ["node", "react", "react-dom"]` in `tsconfig.json` or explicit React import to resolve `React.ReactNode` in standalone mode.

---

## 4. Conclusion & Milestone M3 Verification Protocol Specification

To thoroughly certify Milestone M3, the following 4-tier verification protocol is defined.

### 4.1 Test Matrix Specification for User Management

| Test ID | Test Scope | Input / Action | Expected Result | Verification Check |
|---|---|---|---|---|
| **M3-TC01** | User Creation Dual Modules | `POST /api/usuarios`<br>`{ name, email, password, role: 'ADMIN', acessoOrcamento: true, acessoMedicao: true }` | HTTP 201 Created | Response body contains `acessoOrcamento: true`, `acessoMedicao: true`. Database record has both `true`. |
| **M3-TC02** | User Creation Single Module (Orçamentos) | `POST /api/usuarios`<br>`{ name, email, password, role: 'ORCAMENTISTA', acessoOrcamento: true, acessoMedicao: false }` | HTTP 201 Created | Response body contains `acessoOrcamento: true`, `acessoMedicao: false`. Database record verified. |
| **M3-TC03** | User Creation Single Module (Medição) | `POST /api/usuarios`<br>`{ name, email, password, role: 'ENGENHEIRO', acessoOrcamento: false, acessoMedicao: true }` | HTTP 201 Created | Response body contains `acessoOrcamento: false`, `acessoMedicao: true`. Database record verified. |
| **M3-TC04** | User Creation Zero Modules (Explicit) | `POST /api/usuarios`<br>`{ name, email, password, role: 'ORCAMENTISTA', acessoOrcamento: false, acessoMedicao: false }` | HTTP 400 Bad Request | Error body: `"Pelo menos um módulo de acesso deve ser selecionado (Orçamentos ou Medição Diária)."`. 0 records created. |
| **M3-TC05** | User Creation Zero Modules (Falsy/Fuzzed) | `POST /api/usuarios`<br>`{ name, email, password, role: 'ORCAMENTISTA', acessoOrcamento: 0, acessoMedicao: "" }` | HTTP 400 Bad Request | Coerced to false/false; rejected with HTTP 400. |
| **M3-TC06** | User List GET with Permissions | `GET /api/usuarios` (authenticated as ADMIN) | HTTP 200 OK | Every item in `users[]` contains boolean `acessoOrcamento` and `acessoMedicao`. |
| **M3-TC07** | PATCH Upgrade to Dual Access | `PATCH /api/usuarios/[id]`<br>Existing: `[T, F]`<br>Payload: `{ acessoMedicao: true }` | HTTP 200 OK | Resulting state: `[T, T]`. Database updated. |
| **M3-TC08** | PATCH Switch Module Access | `PATCH /api/usuarios/[id]`<br>Existing: `[T, F]`<br>Payload: `{ acessoOrcamento: false, acessoMedicao: true }` | HTTP 200 OK | Resulting state: `[F, T]`. Database updated. |
| **M3-TC09** | PATCH Revocation to Zero (Explicit Dual) | `PATCH /api/usuarios/[id]`<br>Existing: `[T, T]`<br>Payload: `{ acessoOrcamento: false, acessoMedicao: false }` | HTTP 400 Bad Request | Rejected with 400. Database state remains unchanged. |
| **M3-TC10** | PATCH Revocation to Zero (Partial Single) | `PATCH /api/usuarios/[id]`<br>Existing: `[T, F]`<br>Payload: `{ acessoOrcamento: false }` (omitting medicao) | HTTP 400 Bad Request | Evaluates `existing.acessoMedicao === false` + `newOrc === false` -> 0 modules. Rejected with 400. State unchanged. |
| **M3-TC11** | PATCH Authorization Guard | `PATCH /api/usuarios/[id]` called by non-ADMIN | HTTP 403 Forbidden | Error: `"Apenas Gestores (ADMIN) possuem permissão para alterar usuários."`. |
| **M3-TC12** | UI Creation Checkbox Validation | `/dashboard/usuarios` create modal with 0 boxes checked | Client validation triggers | Form submit blocked; warning toast: `"Selecione pelo menos um módulo de acesso"`. |
| **M3-TC13** | UI Module Badges Render | `/dashboard/usuarios` table list | Visual Badges displayed | Users with dual modules show "Orçamentos & Medição"; single module users show their respective single module badge. |

### 4.2 Recommended Updates to `scripts/verify-portal-unified.ts`
To formalize these tests in the automated verification harness:
1. Extend **Suite 1.4** with tests 1.4.4 - 1.4.7:
   - `1.4.4 PATCH permission update schema accepts valid module expansion`: tests schema transition from single to dual.
   - `1.4.5 PATCH permission update schema rejects transition that reduces modules to zero`: tests validation when resulting state is `false && false`.
2. Extend **Suite 2.3** with test 2.3.4:
   - `2.3.4 PATCH partial payload boundary`: tests evaluation of partial payloads `{ acessoOrcamento?: boolean; acessoMedicao?: boolean }` against existing user state.

---

## 5. Verification Method

To independently verify the implementation of Milestone M3:

### Command Suite
```bash
# 1. Typecheck validation
npx tsc --noEmit
# Expected: Exit code 0 (after tsconfig compilerOptions.types adjustment)

# 2. Portal Unified Verification Harness (Tier 1 & Tier 2)
npx tsx scripts/verify-portal-unified.ts --tier=1
npx tsx scripts/verify-portal-unified.ts --tier=2
# Expected: All suites pass 100% with exit code 0

# 3. Security & Route Protection Baseline Tests
npm test
# Expected: 29/29 tests pass with exit code 0

# 4. Production Next.js Build
npm run build
# Expected: Compiles all 15+ pages with 0 errors, exit code 0
```

### Specific Files to Inspect Post-Implementation
- `src/app/api/usuarios/route.ts`: verify `GET` selects `acessoOrcamento` & `acessoMedicao`; verify `POST` validates `acessoOrcamento || acessoMedicao` and saves both to `prisma.user.create`.
- `src/app/api/usuarios/[id]/route.ts`: verify `PATCH` validates partial/full module updates and rejects transitions resulting in zero modules.
- `src/components/usuarios/usuarios-client.tsx`: verify create modal contains checkboxes for both modules, user table displays module badges, and edit action allows updating permissions.
- `scripts/verify-portal-unified.ts`: verify Suites 1.4 and 2.3 reflect the complete M3 test specification.

### Invalidation Conditions
- Any user can be created or updated to have `acessoOrcamento: false` and `acessoMedicao: false`.
- Any non-admin user can access `POST /api/usuarios` or `PATCH /api/usuarios/[id]`.
- `npm test`, `npx tsx scripts/verify-portal-unified.ts --tier=1`, or `npm run build` exits with non-zero code.
