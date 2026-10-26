# Handoff Report: Explorer M2-2 — Root Redirection & Module Switcher Specification

**Agent**: `explorer_m2_2`  
**Milestone**: M2 — Portal Selection Hub & Navigation  
**Working Directory**: `c:/Users/aaaaa/OneDrive - Piatec/TI_CODIGOS/T.I/orçamento RBT/.agents/teamwork/explorer_m2_2`  
**Target Files**:
1. `src/app/page.tsx` (Root Redirection Gateway)
2. `src/components/layout/dashboard-shell.tsx` (Orçamentos Shell with "Trocar Módulo" Switcher)

---

## 1. Observation

### 1.1 Existing Root Redirection (`src/app/page.tsx`)
Direct inspection of `src/app/page.tsx` (lines 1 to 13):
```tsx
import { redirect } from 'next/navigation';
import { getServerSession } from '@/lib/session';

export default async function HomePage() {
  const session = await getServerSession();

  if (!session) {
    redirect('/login');
  }

  redirect('/dashboard');
}
```
*Current Behavior*: Any authenticated user is hard-redirected to `/dashboard` regardless of whether they have permissions for Orçamentos, Medição Diária, or both. Medição-only users are incorrectly sent to the Orçamentos dashboard.

### 1.2 Auth & Session Structure (`src/lib/session.ts` & `src/lib/auth.ts`)
- In `src/lib/auth.ts` (lines 11-21):
```ts
export interface AuthUser {
  id: string;
  name: string;
  nome?: string | null;
  email: string;
  role: UserRole;
  ativo: boolean;
  telefone?: string | null;
  acessoOrcamento: boolean;
  acessoMedicao: boolean;
}
```
- In `src/lib/session.ts` (lines 231-248):
`getServerSession()` returns `Promise<{ user: AuthUser } | null>`.
Both boolean flags (`acessoOrcamento` and `acessoMedicao`) are already populated and defensively normalized for all active sessions.

### 1.3 Existing Dashboard Shell (`src/components/layout/dashboard-shell.tsx`)
Direct inspection revealed:
- Lines 21-26: `UserSession` interface does not yet declare module access properties:
```tsx
interface UserSession {
  id: string;
  name: string;
  email: string;
  role: string;
}
```
- Lines 71-153: Desktop Fixed Sidebar (`<aside className="hidden md:flex md:w-64 ...">`) contains navigation items (`/dashboard`, `/dashboard/usuarios`) and a bottom user card with `LogoutButton`. There is no shortcut to return to `/portal`.
- Lines 158-233: Mobile Drawer has identical navigation items and no module switcher.
- Lines 239-285: Top Header Bar (`<header className="sticky top-0 z-30 ...">`) has mobile hamburger menu on the left, corporate title in the middle, and user badge + `LogoutButton` on the right. There is no module switcher button.

### 1.4 Test Suite Oracles (`scripts/verify-portal-unified.ts`)
- **Suite 1.2 (Feature 3: Institutional Selection Hub & Root Redirection Contract)**:
  - Line 239-260: `resolveRootDestination(claims)` defines the exact triage oracle:
    - Unauthenticated (`!claims`) -> `/login` (307)
    - Dual access (`acessoOrcamento && acessoMedicao`) -> `/portal` (307)
    - Orçamentos only (`acessoOrcamento && !acessoMedicao`) -> `/dashboard` (307)
    - Medição only (`!acessoOrcamento && acessoMedicao`) -> `/medicao` (307)
    - Zero access (`!acessoOrcamento && !acessoMedicao`) -> `/login?error=no_modules` (307)
  - Tests 1.2.2 to 1.2.6 verify each of these branches.
- **Suite 1.3 (Feature 4: Bidirectional Module Switcher Contract)**:
  - Line 267-272: `shouldRenderModuleSwitcher(claims)` defines that the switcher must render **if and only if** `acessoOrcamento === true && acessoMedicao === true`.
  - Single-module or zero-module users must NOT see the switcher.

### 1.5 Baseline Verification Run
- Command: `npx tsx scripts/verify-portal-unified.ts --tier=1` -> Exit code 0 (28/28 tests passed).
- Command: `npx tsc --noEmit` -> Exit code 0 (zero TypeScript errors).

---

## 2. Logic Chain

### 2.1 Root Redirection Logic (`src/app/page.tsx`)
1. **Observation**: `scripts/verify-portal-unified.ts` Suite 1.2 requires 4 distinct destinations from `/`: `/login`, `/portal`, `/dashboard`, `/medicao`, plus `/login?error=no_modules`.
2. **Step 1**: In `src/app/page.tsx`, `getServerSession()` runs server-side on each request.
3. **Step 2**: If `!session || !session.user`, invoke `redirect('/login')`.
4. **Step 3**: Extract `session.user.acessoOrcamento` and `session.user.acessoMedicao`.
   - Dual-module access (`acessoOrcamento && acessoMedicao`): redirect to `/portal`.
   - Orçamentos-exclusive (`acessoOrcamento && !acessoMedicao`): redirect to `/dashboard` directly, optimizing workflow for users who only manage proposals.
   - Medição-exclusive (`!acessoOrcamento && acessoMedicao`): redirect to `/medicao` directly, optimizing workflow for field engineers and note-takers.
   - Defensive fallback (`!acessoOrcamento && !acessoMedicao`): redirect to `/login?error=no_modules`.
5. **Step 4**: Mark `src/app/page.tsx` with `export const dynamic = 'force-dynamic'` and `export const revalidate = 0` to prevent Next.js from prerendering or caching the redirect at build time.

### 2.2 Module Switcher Logic (`src/components/layout/dashboard-shell.tsx`)
1. **Observation**: In DISPATCH.md and PROJECT.md Feature 4, users with dual-module access must have a shortcut button labeled "Trocar Módulo" with `LayoutGrid` icon leading back to `/portal`.
2. **Step 1**: Extend `UserSession` interface:
   ```tsx
   interface UserSession {
     id: string;
     name: string;
     email: string;
     role: string;
     acessoOrcamento?: boolean;
     acessoMedicao?: boolean;
   }
   ```
   Making them optional preserves backwards compatibility if any mock or legacy caller omits them.
3. **Step 2**: Calculate `const hasDualAccess = Boolean(user.acessoOrcamento && user.acessoMedicao)`.
4. **Step 3**: Import `LayoutGrid` from `'lucide-react'`.
5. **Step 4 (Ergonomic Dual Placement)**:
   - **Top Header Bar**: Place a button on the right side next to the User Profile badge and Logout button:
     - Icon: `LayoutGrid` in RBT Red (`text-[#BA1A1A]`).
     - Label: "Trocar Módulo" (responsive: shows "Módulos" on mobile if space is tight).
     - Link: `/portal`.
     - Styling: `bg-slate-100 hover:bg-slate-200/80 border border-slate-200 text-slate-700 font-semibold text-xs px-3 py-1.5 rounded-xl shadow-sm`.
   - **Desktop Left Sidebar**: Place a dedicated section under the navigation list:
     - Section Title: `Portal Unificado` (uppercase tracking-wider, text-slate-400).
     - Button: Styled with `bg-slate-900/60 hover:bg-white/10 border border-slate-800`, red badge container for `LayoutGrid`, label "Trocar Módulo", and `ChevronRight`.
   - **Mobile Drawer**: Mirror the desktop sidebar entry with `onClick={() => setMobileOpen(false)}` to cleanly dismiss the drawer upon navigation.
6. **Step 5 (Single/Zero Module Suppression)**:
   When `hasDualAccess` is false, none of these elements are rendered, keeping the UI minimal and uncluttered for single-module users.
7. **Step 6 (Future Symmetry for Medição Shell in M4)**:
   The identical pattern will be applied to `src/components/medicao/layout/medicao-shell.tsx` when created in Milestone M4.

---

## 3. Caveats

1. **Client-side Login Redirection (`src/app/(auth)/login/page.tsx`)**:
   In `src/app/(auth)/login/page.tsx` line 11 and 43:
   `const redirect = searchParams.get('redirect') || '/dashboard';`
   If an unauthenticated Medição-only user navigates to `/login` directly without `?redirect=`, the login form currently defaults to `/dashboard`. When Milestone M5 updates middleware, `/dashboard` will redirect them to `/portal?unauthorized=orcamentos`. However, updating `/login/page.tsx` to use `data.redirectUrl || '/'` (returned by `/api/auth/login`) or `/` is recommended for future refinement.
2. **Read-Only Explorer Constraint**:
   Per Explorer instructions, no source files were directly edited in `src/`. All specifications are provided as complete drop-in proposed files and `.patch` files located in `.agents/teamwork/explorer_m2_2/`.

---

## 4. Conclusion & Proposed Code

### 4.1 Specification for `src/app/page.tsx`

#### Drop-in Replacement Code:
**File path**: `src/app/page.tsx`  
**Local artifact**: `.agents/teamwork/explorer_m2_2/proposed_page.tsx`  
**Patch artifact**: `.agents/teamwork/explorer_m2_2/page.patch`

```tsx
import { redirect } from 'next/navigation';
import { getServerSession } from '@/lib/session';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * Root Gateway Redirection ('/')
 *
 * Triages visitors based on authentication status and modular permissions:
 * 1. Unauthenticated: -> /login (preserves security perimeter)
 * 2. Dual-Module Access (Orçamentos + Medição): -> /portal (Institutional Selection Hub)
 * 3. Single Access Orçamentos: -> /dashboard (Direct to Commercial Pipeline)
 * 4. Single Access Medição: -> /medicao (Direct to Field Production RDP)
 * 5. Zero Module Access: -> /login?error=no_modules (Defensive fallback for misconfigured accounts)
 */
export default async function HomePage() {
  const session = await getServerSession();

  if (!session || !session.user) {
    redirect('/login');
  }

  const { acessoOrcamento, acessoMedicao } = session.user;

  // 1. Dual-Module Access: Hub Institucional de Seleção
  if (acessoOrcamento && acessoMedicao) {
    redirect('/portal');
  }

  // 2. Acesso Exclusivo: Gestão de Orçamentos
  if (acessoOrcamento && !acessoMedicao) {
    redirect('/dashboard');
  }

  // 3. Acesso Exclusivo: Medição Diária (RDP)
  if (!acessoOrcamento && acessoMedicao) {
    redirect('/medicao');
  }

  // 4. Sem Módulos Habilitados: Redireciona com aviso explícito
  redirect('/login?error=no_modules');
}
```

---

### 4.2 Specification for `src/components/layout/dashboard-shell.tsx`

#### Drop-in Replacement Code:
**File path**: `src/components/layout/dashboard-shell.tsx`  
**Local artifact**: `.agents/teamwork/explorer_m2_2/proposed_dashboard-shell.tsx`  
**Patch artifact**: `.agents/teamwork/explorer_m2_2/dashboard-shell.patch`

Key sections modified:
1. **Lucide Icons Import**:
```tsx
import {
  LayoutDashboard,
  PlusCircle,
  FileSpreadsheet,
  CheckCircle2,
  Menu,
  X,
  ShieldCheck,
  User as UserIcon,
  ChevronRight,
  Users,
  LayoutGrid,
} from 'lucide-react';
```

2. **UserSession Interface**:
```tsx
interface UserSession {
  id: string;
  name: string;
  email: string;
  role: string;
  acessoOrcamento?: boolean;
  acessoMedicao?: boolean;
}
```

3. **Component Logic**:
```tsx
export function DashboardShell({
  user,
  children,
}: {
  user: UserSession;
  children: React.ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  const hasDualAccess = Boolean(user.acessoOrcamento && user.acessoMedicao);
```

4. **Desktop Sidebar Switcher Block** (appended inside `<div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">` after `<nav>`):
```tsx
          {/* Module Switcher Shortcut (Dual-Access Users) */}
          {hasDualAccess && (
            <div className="pt-4 mt-4 border-t border-slate-800/80">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-3 pb-2">
                Portal Unificado
              </div>
              <Link
                href="/portal"
                className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-medium text-slate-300 hover:text-white hover:bg-white/10 transition border border-slate-800 hover:border-slate-700 bg-slate-900/60 group shadow-sm"
                title="Voltar ao Portal de Módulos RBT"
              >
                <div className="w-6 h-6 rounded-lg bg-red-600/20 border border-red-500/30 flex items-center justify-center flex-shrink-0 group-hover:bg-red-600/30 transition-colors">
                  <LayoutGrid className="w-3.5 h-3.5 text-red-400 group-hover:text-red-300" />
                </div>
                <span className="truncate">Trocar Módulo</span>
                <ChevronRight className="w-4 h-4 ml-auto text-slate-500 group-hover:text-white flex-shrink-0" />
              </Link>
            </div>
          )}
```

5. **Mobile Drawer Switcher Block** (appended inside `<nav className="p-3 space-y-1">` after navigation items):
```tsx
                {/* Mobile Module Switcher */}
                {hasDualAccess && (
                  <div className="pt-4 mt-4 border-t border-slate-800/80">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-3 pb-2">
                      Portal Unificado
                    </div>
                    <Link
                      href="/portal"
                      onClick={() => setMobileOpen(false)}
                      className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium text-slate-300 hover:text-white hover:bg-white/10 transition border border-slate-800 bg-slate-900/60"
                      title="Voltar ao Portal de Módulos RBT"
                    >
                      <div className="w-6 h-6 rounded-lg bg-red-600/20 border border-red-500/30 flex items-center justify-center flex-shrink-0">
                        <LayoutGrid className="w-3.5 h-3.5 text-red-400" />
                      </div>
                      <span>Trocar Módulo</span>
                    </Link>
                  </div>
                )}
```

6. **Top Header Bar Switcher** (placed inside `<div className="flex items-center gap-2 sm:gap-3">` before the User Profile badge):
```tsx
          {/* Right Side: Module Switcher (if dual access), User profile badge & Quick Logout */}
          <div className="flex items-center gap-2 sm:gap-3">
            {hasDualAccess && (
              <Link
                href="/portal"
                className="inline-flex items-center gap-1.5 sm:gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200/80 border border-slate-200 transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-[#BA1A1A]/20"
                title="Voltar à seleção de módulos do Portal Unificado"
              >
                <LayoutGrid className="w-3.5 h-3.5 text-[#BA1A1A] flex-shrink-0" />
                <span className="hidden sm:inline">Trocar Módulo</span>
                <span className="sm:hidden text-[11px]">Módulos</span>
              </Link>
            )}

            <div className="hidden sm:flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-full border border-slate-200 text-xs">
              <UserIcon className="w-3.5 h-3.5 text-slate-500" />
              <span className="font-semibold text-slate-700 truncate max-w-[140px]">
                {user.name || user.email}
              </span>
              <span
                className={`ml-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                  roleColors[user.role] || 'bg-slate-200 text-slate-800'
                }`}
              >
                {roleLabels[user.role] || user.role}
              </span>
            </div>

            <LogoutButton showTextAlways />
          </div>
```

---

## 5. Verification Method

### 5.1 Verification Commands
The implementing worker or reviewer can independently verify these changes using the following commands:

1. **TypeScript Strict Typecheck**:
   ```bash
   npx tsc --noEmit
   ```
   *Expected outcome*: 0 errors.

2. **Automated Tier 1 Test Suite**:
   ```bash
   npx tsx scripts/verify-portal-unified.ts --tier=1
   ```
   *Expected outcome*: 28 / 28 passed, specifically Suite 1.2 (tests 1.2.1 through 1.2.6) and Suite 1.3 (test 1.3.1).

3. **Full Production Next.js Build**:
   ```bash
   npm run build
   ```
   *Expected outcome*: Successful static compilation of all routes including `/`.

### 5.2 Manual Verification Matrix

| Test Scenario | User Permissions | Route Visited | Expected Redirection / UI |
|---|---|---|---|
| Unauthenticated Visitor | None (no cookies) | `/` | Redirects to `/login` |
| Diretoria / Admin | `acessoOrcamento: true`, `acessoMedicao: true` | `/` | Redirects to `/portal` |
| Orçamentista | `acessoOrcamento: true`, `acessoMedicao: false` | `/` | Redirects directly to `/dashboard` |
| Apontador / Engenheiro | `acessoOrcamento: false`, `acessoMedicao: true` | `/` | Redirects directly to `/medicao` |
| Revoked User | `acessoOrcamento: false`, `acessoMedicao: false` | `/` | Redirects to `/login?error=no_modules` |
| Dual-Access on Dashboard | `acessoOrcamento: true`, `acessoMedicao: true` | `/dashboard` | "Trocar Módulo" button is visible in Topbar and Sidebar with `LayoutGrid` icon leading to `/portal` |
| Single-Access on Dashboard | `acessoOrcamento: true`, `acessoMedicao: false` | `/dashboard` | "Trocar Módulo" button is suppressed / hidden |

### 5.3 Invalidation Conditions
This specification is invalidated if:
1. `AuthUser` in `src/lib/auth.ts` alters or removes `acessoOrcamento` or `acessoMedicao`.
2. The root destination contract in `scripts/verify-portal-unified.ts` changes its status codes or route names.
3. Next.js App Router deprecates server component `redirect()` in favor of client-only routing.
