# Handoff Report: UI Layout, Kanban Board & Visual Polish (R3 Survey)

**Agent**: Explorer 3 (Survey - UI Layout, Kanban Board & Visual Polish)  
**Date**: 2026-10-07T14:27:00Z  
**Target Scope**: Requirement R3 (Refinamento Visual do Layout e Responsividade - Padrão Medicaodiaria)  
**Status**: Hard Handoff (Investigation Complete)

---

## 1. Observation

### 1.1 Styling Setup, Design Tokens and Typography
- **File**: `tailwind.config.ts` (lines 11–34)
  ```ts
  colors: {
    rbt: {
      red: '#BA1A1A',
      'red-hover': '#991B1B',
      'red-light': '#FEF2F2',
      'red-border': '#FECACA',
      black: '#111827',
      dark: '#0A0F1D',
      navy: '#1E3A5F',
      steel: '#2D4B73',
      50: '#F0F4F8',
      ...
    }
  }
  ```
  **Direct Observation**:
  - The `rbt` palette is defined, but throughout the codebase developers bypass these tokens using raw arbitrary classes:
    - In `src/components/orcamentos/kanban-board.tsx:130`: `focus:ring-[#BA1A1A]`
    - In `src/components/orcamentos/kanban-board.tsx:178`: `hover:border-[#BA1A1A]`
    - In `src/components/orcamentos/kanban-board.tsx:181`: `text-[#BA1A1A]`
    - In `src/components/layout/dashboard-shell.tsx:102`: `bg-[#BA1A1A]`
    - In `src/components/orcamentos/nova-solicitacao-modal.tsx:98`: `bg-[#BA1A1A] hover:bg-[#991B1B]`
    - In `src/components/orcamentos/detalhes-orcamento-client.tsx:405`: `border-[#BA1A1A]`
  - `tailwind.config.ts` line 37 has `plugins: []`. However, `src/components/orcamentos/nova-solicitacao-modal.tsx:105` uses `animate-in fade-in duration-200`, which are `tailwindcss-animate` classes that do NOT exist in Tailwind without the plugin, resulting in broken/ignored animations.
  - No `fontFamily` is configured in `tailwind.config.ts`.
- **File**: `src/app/globals.css` (lines 10–15)
  ```css
  body {
    color: rgb(var(--foreground-rgb));
    background: rgb(var(--background-rgb));
    min-height: 100vh;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  }
  ```
  **Direct Observation**:
  - Global CSS relies entirely on an unoptimized OS fallback font stack.
  - In `src/app/layout.tsx:16`, `body` hardcodes `bg-slate-100 text-slate-900`, overriding the CSS root variables (`--background-rgb: 240, 244, 248`, `--foreground-rgb: 16, 42, 67`).
  - No custom scrollbar rules exist in `globals.css`. On Windows OS browsers, the horizontal Kanban board and vertical columns show bulky 17px grey rectangular scrollbars.

### 1.2 Kanban Board: Missing Columns, Layout Constraints & Missing Badges
- **File**: `prisma/schema.prisma` (lines 15–23)
  ```prisma
  enum StatusOrcamento {
    NOVO
    AGUARDANDO_CLIENTE
    AGUARDANDO_ANALISE
    EM_ANALISE
    PROPOSTA_ENVIADA
    APROVADO
    REJEITADO
  }
  ```
- **File**: `src/components/orcamentos/kanban-board.tsx` (lines 57–93)
  ```tsx
  const COLUMNS = [
    { key: 'AGUARDANDO_CLIENTE', title: 'Aguardando Cliente', ... },
    { key: 'AGUARDANDO_ANALISE', title: 'Aguardando Análise', ... },
    { key: 'EM_ANALISE', title: 'Em Análise', ... },
    { key: 'PROPOSTA_ENVIADA', title: 'Proposta Enviada', ... },
    { key: 'APROVADO', title: 'Aprovado', ... },
  ];
  ```
  **Direct Observation**:
  - `NOVO` and `REJEITADO` are completely missing from `COLUMNS`.
  - When an orcamento is marked as `REJEITADO` (via `detalhes-orcamento-client.tsx:184`), it completely disappears from the Kanban board.
  - Column Grid layout in `kanban-board.tsx:141`:
    ```tsx
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-start overflow-x-auto pb-4">
    ```
    On standard desktop screens (1024px–1280px), `grid-cols-5` forces columns into `~160px–180px` width. The `overflow-x-auto` never activates because grid children shrink. Buttons like "Copiar Link" and protocol badges overflow or wrap awkwardly.
    On mobile viewports (<768px), `grid-cols-1` stacks columns vertically, requiring excessive scrolling.
- **File**: `src/components/orcamentos/kanban-board.tsx` (lines 178–253)
  **Direct Observation on Cards**:
  - The cards display only: Protocol (`numeroProtocolo`), formatted date (`createdAt`), client name (`lead.nome`), company (`lead.empresa`), and service or copy link.
  - Missing contextual badges (R3 requirement):
    - SLA / Aging indicator (e.g., "Hoje", "Há 2 dias", "Há 5 dias - Atenção").
    - Service category pill badge.
    - Assigned orçamentista tag (model relation `orc.orcamentista?.name` is included in dashboard queries but never rendered on cards).
    - Left-border color accent matching the column status.

### 1.3 Empty States
- **File**: `src/components/orcamentos/kanban-board.tsx` (lines 167–171)
  ```tsx
  {colItems.length === 0 ? (
    <div className="h-28 rounded-xl border-2 border-dashed border-slate-200 flex items-center justify-center text-xs text-slate-400">
      Nenhum item
    </div>
  ) : ...}
  ```
  **Direct Observation**:
  - Unstyled dashed rectangle with plain text "Nenhum item".
  - When search filter (`searchTerm`) yields 0 results across all columns, every column renders this plain box. There is no global empty state message ("Nenhum resultado para '...' - Limpar busca").
- **File**: `src/components/orcamentos/detalhes-orcamento-client.tsx` (lines 368–372 and line 382)
  - Formulário técnico empty state is an unstyled grey box without an action button.
  - Audit trail (`orcamento.logs.map(...)`) renders empty whitespace if no logs exist, with no placeholder message.

### 1.4 Micro-Interactions, Focus Rings & Modals
- **File**: `src/components/orcamentos/kanban-board.tsx` (lines 178, 221)
  - Card hover uses `hover:shadow-md hover:border-[#BA1A1A] transition-all transform hover:-translate-y-0.5`. Lacks `active:scale-[0.99]` and `focus-within:ring-2`.
  - Buttons and link cards lack visible focus rings (`focus-visible:ring-2 focus-visible:ring-rbt-red focus-visible:ring-offset-2`).
- **File**: `src/components/orcamentos/nova-solicitacao-modal.tsx` (lines 104–107)
  - Modal container lacks `max-h-[90vh] overflow-y-auto`. On smaller mobile screens or when virtual keyboards pop up, form actions clip off-screen.

---

## 2. Logic Chain

1. **Premise 1 (R3 Core Mandate)**: R3 requires:
   *"Refinar os componentes de interface seguindo os padrões institucionais da RBT Fundações: enriquecer o quadro Kanban com badges contextuais, estados vazios estilizados, micro-interações suaves de hover e foco, tipografia equilibrada e adaptação fluida para dispositivos móveis e telas amplas."*
2. **Inference from 1.1**: Hardcoding `#BA1A1A` and `#111827` across 6+ files violates token hygiene and breaks theme maintainability. Adding `Inter` via `next/font/google` in `layout.tsx` and custom scrollbars in `globals.css` immediately elevates typography and visual polish to the Medicaodiaria corporate standard.
3. **Inference from 1.2**: Because `NOVO` and `REJEITADO` statuses exist in Prisma and can be selected by users, omitting them from `kanban-board.tsx` causes silent data invisibility. Adding a tab/filter or collapsible column for `REJEITADO` prevents UI data loss. Replacing rigid `grid-cols-5` with a responsive horizontal scroll track (`flex gap-4 min-w-0 overflow-x-auto` with `w-[300px] min-w-[280px]` columns) guarantees cards retain proper density across all desktop and laptop resolutions.
4. **Inference from 1.2 & 1.3**: Enriching Kanban cards with SLA time-elapsed badges, orçamentista tags, and color-coded status accents satisfies the "badges contextuais" requirement. Replacing plain "Nenhum item" dashed boxes with icon-accompanied empty states and adding a global zero-search result banner satisfies the "estados vazios estilizados" requirement.
5. **Inference from 1.4**: Adding standard focus-visible rings (`focus-visible:ring-2 focus-visible:ring-rbt-red focus-visible:ring-offset-2`) and active press feedback (`active:scale-[0.98]`) satisfies "micro-interações suaves de hover e foco" and satisfies accessibility standards. Adding `max-h-[90vh] overflow-y-auto` to the modal ensures mobile ergonomics.

---

## 3. Caveats

- **No Caveats on Architecture**: The project uses standard Next.js 14 App Router with Tailwind CSS 3.4.14 and Lucide React.
- **Dependencies Consideration**: Currently, `framer-motion` or `tailwindcss-animate` are NOT installed. All micro-interactions and transitions can and should be achieved with native Tailwind CSS transitions (`transition-all duration-200 ease-in-out hover:-translate-y-0.5 active:scale-[0.99]`) and standard CSS keyframes in `globals.css`, avoiding unnecessary external dependencies.
- **Sister Application Alignment**: The design patterns identified align directly with the Piatec sister application `Medicaodiaria`, which uses identical brand tokens (`#BA1A1A`, `#111827`, `#0A0F1D`).

---

## 4. Conclusion & Actionable Blueprint

### 4.1 Recommended Implementation Plan for Worker (Milestone 3 / R3)

#### Step 1: Design Tokens, Fonts & Global CSS
1. **`src/app/layout.tsx`**:
   - Import `Inter` from `next/font/google`:
     ```tsx
     import { Inter } from 'next/font/google';
     const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
     ```
   - Apply `className={`${inter.variable} font-sans antialiased min-h-screen bg-slate-100 text-slate-900`}`.
2. **`tailwind.config.ts`**:
   - Extend `fontFamily`:
     ```ts
     fontFamily: {
       sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
     },
     ```
   - Add animation utilities if needed.
3. **`src/app/globals.css`**:
   - Add sleek modern scrollbar styles for `.kanban-scroll`:
     ```css
     ::-webkit-scrollbar {
       width: 6px;
       height: 6px;
     }
     ::-webkit-scrollbar-track {
       background: transparent;
     }
     ::-webkit-scrollbar-thumb {
       background: #cbd5e1;
       border-radius: 9999px;
     }
     ::-webkit-scrollbar-thumb:hover {
       background: #94a3b8;
     }
     ```

#### Step 2: Kanban Board Component Refinement (`src/components/orcamentos/kanban-board.tsx`)
1. **Handle Missing Statuses**:
   - Add a 6th column or a view switcher for `REJEITADO` (`border-rose-400 bg-rose-500/10 text-rose-700`).
   - Group `NOVO` under `AGUARDANDO_CLIENTE` or display a pill if newly initialized.
2. **Fluid Horizontal Layout**:
   - Change `kanban-board.tsx:141` from `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5` to:
     ```tsx
     <div className="flex gap-4 items-start overflow-x-auto pb-4 pt-1 kanban-scroll scroll-smooth">
     ```
   - Each column:
     ```tsx
     <div className="w-[308px] min-w-[280px] sm:min-w-[308px] flex-shrink-0 bg-slate-50/90 rounded-2xl border border-slate-200/80 p-3.5 flex flex-col shadow-sm min-h-[520px]">
     ```
   - On mobile screens, add a quick column filter tab bar (`[Todos] [Aguardando Cliente (X)] [Aguardando Análise (Y)] ...`) so users on phones can jump directly to specific columns without endless vertical scrolling.
3. **Contextual Badges on Cards**:
   - Calculate elapsed days:
     - Today: `<span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>Hoje</span>`
     - 1–3 days: `<span className="text-[10px] text-slate-500 font-medium">Há Xd</span>`
     - > 3 days: `<span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">Há Xd</span>`
   - Add status accent strip:
     - Each card has `border-l-4` matching the column color (Amber, Blue, Purple, Emerald, Green).
   - Display orçamentista tag:
     - If `orc.orcamentista?.name`, render `<span className="text-[10px] text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">Eng. {orc.orcamentista.name}</span>`.
4. **Enhanced Empty States**:
   - Column empty state: replace plain text with an icon (`Inbox` or `Clock`), "Sem orçamentos", and subtext "Nenhum item nesta etapa".
   - Search empty state: if `filtered.length === 0`, display a centered card with `SearchX` icon, "Nenhum orçamento encontrado para '{searchTerm}'" and a "Limpar busca" button.
5. **Micro-interactions & Accessibility**:
   - Card container: `hover:-translate-y-1 hover:shadow-md hover:border-slate-300 transition-all duration-200 active:scale-[0.99] focus-within:ring-2 focus-within:ring-rbt-red focus-within:ring-offset-2`.
   - Copy Link button: add `focus-visible:ring-2 focus-visible:ring-rbt-red focus-visible:ring-offset-1 transition-transform active:scale-95`.

#### Step 3: Layout Shell & Modals
1. **`src/components/layout/dashboard-shell.tsx`**:
   - Expand main container from `max-w-7xl` to `max-w-[1600px]` for spacious desktop Kanban viewing.
   - Refine sticky header with subtle backdrop blur: `bg-white/95 backdrop-blur-md`.
2. **`src/components/orcamentos/nova-solicitacao-modal.tsx`**:
   - Add `max-h-[90vh] overflow-y-auto` to the modal card.
   - Replace arbitrary `focus:ring-[#BA1A1A]` with `focus:ring-rbt-red`.
   - Replace `animate-in fade-in` with clean CSS transition styles.
3. **`src/components/orcamentos/detalhes-orcamento-client.tsx`**:
   - Add styled empty state with icon for missing `respostaFormulario` and empty `logs`.
   - Unify token classes to `rbt-red`.

---

## 5. Verification Method

To independently verify the implementation:

1. **TypeScript Typecheck**:
   ```bash
   npx tsc --noEmit
   ```
   *Expected result*: Exits with code 0 (zero errors).
2. **Production Build Validation**:
   ```bash
   npm run build
   ```
   *Expected result*: Compiles all pages (`/dashboard`, `/dashboard/orcamentos/[id]`, `/formulario/[token]`, `/login`) successfully.
3. **UI & Layout Inspection**:
   - Open `/dashboard` on Desktop (1920x1080 and 1366x768): verify columns maintain minimum width of 280–300px, board scrolls horizontally without card content clipping, and scrollbars are sleek (thin 6px).
   - Open `/dashboard` on Mobile (375px / 390px viewport): verify mobile view allows switching between columns via tabs or snap scroll without endless vertical scrolling.
   - Open `/dashboard` with empty columns or search for "termo-inexistente": verify styled empty states render with icons and clear messaging.
   - Reject an orcamento in `/dashboard/orcamentos/[id]`: verify it remains visible in the Kanban board under the Rejected/Archived view.
