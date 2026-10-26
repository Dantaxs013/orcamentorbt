# Handoff Report: User Management UI Enhancements for /dashboard/usuarios

## 1. Observation

### 1.1 Existing Source File Locations and Structures
- **Client Component**: `src/components/usuarios/usuarios-client.tsx` (676 lines).
  - Lines 23-33: `Usuario` interface does NOT include `acessoOrcamento` or `acessoMedicao`:
    ```typescript
    interface Usuario {
      id: string;
      name: string;
      email: string;
      role: string;
      ativo: boolean;
      createdAt: string | Date;
      _count?: {
        orcamentos: number;
      };
    }
    ```
  - Lines 54-59: `createForm` state does NOT contain module fields:
    ```typescript
    const [createForm, setCreateForm] = useState({
      name: '',
      email: '',
      password: '',
      role: 'ORCAMENTISTA' as 'ADMIN' | 'ORCAMENTISTA',
    });
    ```
  - Lines 78-119: `handleCreateUser` does NOT send `acessoOrcamento` or `acessoMedicao`, and does NOT validate that at least 1 module is selected.
  - Lines 307-316: `<table>` header defines 6 columns without module visibility:
    ```tsx
    <th className="py-3 px-4 sm:px-6">Usuário</th>
    <th className="py-3 px-4">Função / Perfil</th>
    <th className="py-3 px-4 text-center">Status</th>
    <th className="py-3 px-4 text-center">Orçamentos Vinculados</th>
    <th className="py-3 px-4 text-right">Cadastrado em</th>
    {isGestor && <th className="py-3 px-4 sm:px-6 text-right">Ações</th>}
    ```
  - Lines 359-478: Table body allows inline `<select>` for `role` and inline toggle button for `ativo`, but lacks an **Edit User Modal** and has no display or editing of module permissions.
  - Lines 488-645: `showCreateModal` renders inputs for Name, Email, Password, and Role radio options, but completely lacks module selection checkboxes.

- **Server Page**: `src/app/dashboard/usuarios/page.tsx` (38 lines).
  - Lines 15-28: Prisma `select` clause in `UsuariosPage`:
    ```typescript
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        ativo: true,
        createdAt: true,
        _count: {
          select: {
            orcamentos: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    ```
    `acessoOrcamento` and `acessoMedicao` are missing from the `select` projection, so `initialUsers` loaded on the server cannot reflect module permissions.

- **Prisma Schema**: `prisma/schema.prisma`.
  - Lines 79-80: User model already possesses the required fields from Milestone 1:
    ```prisma
    acessoOrcamento Boolean     @default(true)
    acessoMedicao   Boolean     @default(false)
    ```

- **Institutional Design Tokens**: `src/app/portal/page.tsx` (lines 240-365).
  - **Orçamentos**: Icon `<Calculator className="w-... h-..." />`, Primary Red `#BA1A1A`, badge styling `bg-red-50 text-[#BA1A1A] border-red-200`.
  - **Medição Diária (RDP)**: Icon `<HardHat className="w-... h-..." />`, Dark Graphite `#111827`, badge styling `bg-slate-100 text-slate-800 border-slate-300`.

- **Typecheck Baseline**:
  - Running `npx tsc --noEmit` yielded 1 pre-existing error in `src/app/layout.tsx(13,13)` (`Cannot find namespace 'React'`), while all other files in `src/components/usuarios/` and the proposed enhancements compiled with zero type errors.

---

## 2. Logic Chain

1. **Prisma Select Dependency**:
   - Because `UsuariosPage` (`src/app/dashboard/usuarios/page.tsx:15`) fetches users for SSR, adding `acessoOrcamento: true` and `acessoMedicao: true` to its `select` clause is necessary to pass accurate initial module states to `UsuariosClient`.

2. **Frontend Type Alignment**:
   - In `src/components/usuarios/usuarios-client.tsx`, updating `Usuario` to `{ ..., acessoOrcamento: boolean; acessoMedicao: boolean; }` ensures strict TypeScript type safety across table rendering, state mutations, and API callbacks.

3. **"Módulos Habilitados" Table Column & Badges**:
   - In the table header (`<thead>`), inserting a 3rd column `<th className="py-3 px-4">Módulos Habilitados</th>` (increasing empty-state `colSpan` to 7) provides direct visibility into each user's permissions.
   - In `<tbody>`, rendering contextual badges:
     - If `user.acessoOrcamento`: Badge with `<Calculator />`, label "Orçamentos", styled with `bg-red-50 text-[#BA1A1A] border-red-200`.
     - If `user.acessoMedicao`: Badge with `<HardHat />`, label "Medição", styled with `bg-slate-100 text-slate-800 border-slate-300`.
     - If neither (defensive edge case): Badge with `<AlertCircle />`, label "Sem módulo", styled with `bg-amber-50 text-amber-700 border-amber-200`.
   - Badges flex-wrap cleanly, ensuring responsive presentation on mobile and wide displays.

4. **Create User Modal Ergonomics & Validation**:
   - Add `acessoOrcamento: true` (default checked) and `acessoMedicao: false` (default unchecked) to `createForm` state.
   - Insert an intuitive visual card-checkbox section with institutional icons (`Calculator` and `HardHat`), title "Módulos do Sistema Habilitados *", and helpful descriptions of each module's capabilities.
   - Validation Rule: If `!createForm.acessoOrcamento && !createForm.acessoMedicao`, render a highlighted warning banner (`AlertCircle` + "Selecione pelo menos um módulo para poder cadastrar o usuário") and disable the submit button. On form submission, block with `toast.warning('Módulo Obrigatório', ...)`.
   - Send `acessoOrcamento` and `acessoMedicao` in the `POST /api/usuarios` body.
   - On success, reset the form back to default state (`acessoOrcamento: true`, `acessoMedicao: false`).

5. **Edit User Modal & Active Admin Self-Revocation Protection**:
   - Add state: `editingUser: Usuario | null`, `savingEdit: boolean`, and `editForm` (`name`, `role`, `ativo`, `acessoOrcamento`, `acessoMedicao`, `password`).
   - Add an "Editar" button with `<Pencil className="w-3.5 h-3.5" />` in the Actions column of each user row (including the current admin row).
   - Self-Revocation Protection:
     - Identify if the active admin is editing their own record: `const isEditingSelf = editingUser?.id === currentUser.id;`
     - When `isEditingSelf === true`:
       - Display a prominent security notice: *"Você está editando a sua própria conta ativa. Para proteger sua sessão contra travamento acidental, a função de Gestor, o status ativo e a permissão do módulo Orçamentos estão fixados."*
       - `acessoOrcamento`: Input is disabled (`disabled={true}`), checked is forced to `true`, and note shows `🔒 Acesso obrigatório mantido`. (Prevents the admin from revoking access to the very budgeting system they are currently using to manage users).
       - `role`: Role selector is locked to `ADMIN` (cannot demote self).
       - `ativo`: Status buttons are locked to `Ativo` (cannot deactivate self).
       - `acessoMedicao`: Checkbox remains interactive, allowing the admin to grant or adjust Medição access for themselves safely.
     - When `isEditingSelf === false` (editing other users):
       - All fields (name, role, status, modules, password) are fully configurable.
       - Enforce validation that at least 1 module remains checked (`editForm.acessoOrcamento || editForm.acessoMedicao`). If both are unchecked, disable the submit button and show error guidance.
     - On submit, dispatch `PATCH /api/usuarios/${editingUser.id}` with the updated fields, update local state `users`, and display success notification.

---

## 3. Caveats

1. **Pre-existing Type Error in Root Layout**:
   - `src/app/layout.tsx(13,13)` lacks an explicit `import React from 'react';`, causing `tsc --noEmit` to report `Cannot find namespace 'React'`. This is completely independent of user management, but must be fixed when building the full project.
2. **API Endpoint Synchronization**:
   - The UI changes rely on `POST /api/usuarios` and `PATCH /api/usuarios/[id]` accepting and persisting `acessoOrcamento` and `acessoMedicao`, which is assigned to peer agent `explorer_m3_2`. The frontend code defensively handles missing or boolean-coerced properties.
3. **Session Refresh on Self-Update**:
   - If the active admin enables `acessoMedicao` on their own account via the Edit modal, their browser session cookie / HMAC token will reflect the update on the next login or when the session sliding-window/token refresh occurs.

---

## 4. Conclusion

The user management UI enhancements for `/dashboard/usuarios` have been fully formulated, designed to institutional standards, and verified with complete drop-in implementations created in:
- `c:/Users/aaaaa/OneDrive - Piatec/TI_CODIGOS/T.I/orçamento RBT/.agents/teamwork/explorer_m3_1/proposed_usuarios-client.tsx`
- `c:/Users/aaaaa/OneDrive - Piatec/TI_CODIGOS/T.I/orçamento RBT/.agents/teamwork/explorer_m3_1/proposed_page.tsx`

### Concrete Implementation Specification

#### File 1: `src/app/dashboard/usuarios/page.tsx`
Replace lines 15-28 with:
```typescript
  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      ativo: true,
      acessoOrcamento: true,
      acessoMedicao: true,
      createdAt: true,
      _count: {
        select: {
          orcamentos: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
```

#### File 2: `src/components/usuarios/usuarios-client.tsx`
Apply the drop-in enhancements from `proposed_usuarios-client.tsx`:
1. **Interface Update**: Add `acessoOrcamento: boolean; acessoMedicao: boolean;` to `Usuario`.
2. **Table Header & Column**: Insert `<th className="py-3 px-4">Módulos Habilitados</th>` and the cell rendering the `#BA1A1A` Orçamentos badge and `#111827` Medição badge.
3. **Create Modal Checkboxes**: Add the dual-card module selectors (`acessoOrcamento` default checked, `acessoMedicao` default unchecked) with inline warning banner when both are deselected.
4. **Edit Modal & Protection**: Add Edit User Modal with `isEditingSelf` guards locking `acessoOrcamento`, `role: ADMIN`, and `ativo: true`, while allowing dual-module toggles for other users with >= 1 module validation.

---

## 5. Verification Method

### 5.1 Independent Verification Commands
```bash
# 1. Typecheck the proposed implementations and existing project
npx tsc --noEmit

# 2. Run Tier 1 and Tier 2 verification suites for Portal & Permissions
npx tsx scripts/verify-portal-unified.ts --tier=1
npx tsx scripts/verify-portal-unified.ts --tier=2

# 3. Test production Next.js build once implementer applies changes
npm run build
```

### 5.2 Verification Checklist
- [x] `Usuario` interface has `acessoOrcamento: boolean` and `acessoMedicao: boolean`.
- [x] Table header contains "Módulos Habilitados" column and empty-state `colSpan` is updated to 7.
- [x] Orçamentos badge displays `<Calculator />` with brand red styling (`bg-red-50 text-[#BA1A1A] border-red-200`).
- [x] Medição badge displays `<HardHat />` with graphite styling (`bg-slate-100 text-slate-800 border-slate-300`).
- [x] Create User Modal defaults: `acessoOrcamento = true`, `acessoMedicao = false`.
- [x] Deselecting both modules in Create User Modal displays validation error and blocks submission.
- [x] Edit User Modal opens from "Editar" button in Actions column.
- [x] When active admin edits own profile, `acessoOrcamento` checkbox is disabled/locked, `role` is locked to ADMIN, and `ativo` is locked to true.
- [x] When active admin edits other profiles, module toggles are editable but at least 1 must remain active.
- [x] Files `proposed_usuarios-client.tsx` and `proposed_page.tsx` pass TypeScript checks without any errors.
