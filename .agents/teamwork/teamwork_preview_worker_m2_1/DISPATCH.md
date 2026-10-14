# Dispatch: Worker 2 (Milestone 2 — Usability, Input Masks & Feedback: Toasts & Modals)

## Scope & Objective
Implement Milestone 2 (Requisito R2) of the Orçamento RBT project based on the survey report from Explorer 2 and architecture in PROJECT.md.

### 1. Mask Utilities (`src/lib/masks.ts`)
- Implement:
  - `formatCurrencyBRL(value: number | string): string`: format numbers/strings to Brazilian Real format (e.g. `12500.5` -> `R$ 12.500,50`). Also handle real-time keystroke masking (cents-based typing).
  - `parseCurrencyBRL(masked: string): number`: extract clean numeric value (e.g. `R$ 12.500,50` -> `12500.50`).
  - `formatPhoneBR(value: string): string`: mask Brazilian phones `(11) 99999-9999` or `(11) 9999-9999`.
  - `formatDimension(value: string): string`: format dimension values with metric guides (e.g., meters `m` or dimensions `L x C x P`).

### 2. Global Toast Notification System (`src/components/ui/toast-provider.tsx` & `src/app/layout.tsx`)
- Implement `ToastProvider` with React Context and `useToast()` hook.
- Support `toast.success(title, message)`, `toast.error(title, message)`, `toast.warning(title, message)`, `toast.info(title, message)`.
- Features: smooth entrance/exit animations, progress or auto-dismiss timer (4-5s), manual dismiss button, accessible ARIA live regions, polished styling matching RBT / Medicaodiaria standards.
- Mount `ToastProvider` in `src/app/layout.tsx`.

### 3. Reusable Confirmation Modal (`src/components/ui/confirm-modal.tsx`)
- Accessible dialog overlay for impactful/destructive operations.
- Props: `isOpen`, `title`, `description`, `confirmLabel`, `cancelLabel`, `variant` ('danger' | 'primary' | 'warning'), `isLoading`, `onConfirm`, `onCancel`.
- ESC key handling, backdrop click dismiss, accessible focus management, loading spinner state during async execution.

### 4. Integration into Views & Forms
- `src/components/orcamentos/detalhes-orcamento-client.tsx`:
  - Wire real-time `R$` currency masks into `custoMaoDeObra`, `custoMateriais`, `custosExtras`.
  - Update calculation engine so formatted inputs seamlessly sync with numeric state and calculations (BDI, subtotal, total).
  - Add confirmation modal before "Gerar PDF & Enviar por E-mail" showing recipient email and proposal total.
  - Add confirmation modal on irreversible or critical status updates (e.g. `REJEITADO`, `APROVADO`).
  - Replace or enhance top alert banners with rich `toast.success` and `toast.error` feedback.
- `src/components/orcamentos/nova-solicitacao-modal.tsx`:
  - Wire `formatPhoneBR` into the telephone/WhatsApp field.
  - Wire toast notifications on success and validation errors.
- `src/app/formulario/[token]/page.tsx`:
  - Wire phone mask into client phone input.
  - Add dimensional guidance / mask to engineering dimension fields.
  - Add confirmation modal prior to final submission.
  - Wire toast notifications on submission.

## Exclusive Write Ownership
- `src/lib/masks.ts`
- `src/components/ui/toast-provider.tsx`
- `src/components/ui/confirm-modal.tsx`
- `src/app/layout.tsx`
- `src/components/orcamentos/detalhes-orcamento-client.tsx`
- `src/components/orcamentos/nova-solicitacao-modal.tsx`
- `src/app/formulario/[token]/page.tsx`

## Mandatory Integrity Warning
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## Mandatory Constraints
- NEVER run `git commit` or any git commit command. All changes must remain uncommitted for the user.
- Run `npx tsc --noEmit` and ensure 0 errors.

## Output
Write your handoff report to:
`c:/Users/aaaaa/OneDrive - Piatec/TI_CODIGOS/T.I/orçamento RBT/.agents/teamwork/teamwork_preview_worker_m2_1/handoff.md`


## 2026-10-07T14:37:55Z
You are Worker 2 (Milestone 2 — Usability, Input Masks & Feedback: Toasts & Modals).

Tasks:
1. Implement real-time masking & parsing utilities in `src/lib/masks.ts` (monetary BRL R$, phone BR, and dimensions).
2. Create `src/components/ui/toast-provider.tsx` with React Context, `useToast()` hook, smooth animations, auto-dismiss, and mount it in `src/app/layout.tsx`.
3. Create reusable `src/components/ui/confirm-modal.tsx` with backdrop, ESC handling, loading state, and accessible styling.
4. Integrate into `src/components/orcamentos/detalhes-orcamento-client.tsx`:
   - Real-time R$ currency masks on cost fields (`custoMaoDeObra`, `custoMateriais`, `custosExtras`) while preserving numeric calculation of subtotal, BDI, and total.
   - Confirmation modal before sending proposal email with recipient & proposal summary.
   - Confirmation modal on critical status changes (e.g. `REJEITADO`, `APROVADO`).
   - Rich toast notifications for all operations.
5. Integrate phone mask and toasts into `src/components/orcamentos/nova-solicitacao-modal.tsx`.
6. Integrate phone mask, dimension guide, submission confirmation modal, and toasts into `src/app/formulario/[token]/page.tsx`.
7. Verify with `npx tsc --noEmit` and confirm 0 type errors.
