# Milestone M2 Verification Protocol & Visual Conformance Specification

**Agent**: `explorer_m2_3`  
**Milestone**: M2 (Portal Selection Hub & Navigation)  
**Target Artifacts**: `src/app/page.tsx`, `src/app/portal/page.tsx`, `src/components/layout/dashboard-shell.tsx`  
**Date**: 2026-10-20  

---

## 1. Observation

Direct examination of codebase artifacts, schemas, test suites, and build scripts yielded the following verified facts:

### 1.1 Existing Test Harness (`scripts/verify-portal-unified.ts`)
- **Suite 1.2 ("Institutional Selection Hub & Root Redirection Contract")** defines 6 granular unit assertions (lines 562–629):
  - **1.2.1**: Verifies RBT brand token constants in `RBT_BRAND_TOKENS`:
    * `primaryRed === '#BA1A1A'`
    * `darkGraphite === '#111827'`
    * `deepBlack === '#0A0F1D'`
    * `corporateNavy === '#1E3A5F'`
    * `lightBackground === '#F0F4F8'`
  - **1.2.2**: Root destination for unauthenticated visitor (`claims === null`) returns `{ destination: '/login', status: 307 }`.
  - **1.2.3**: Root destination for dual-module user (`acessoOrcamento: true, acessoMedicao: true`) returns `{ destination: '/portal', status: 307 }`.
  - **1.2.4**: Root destination for Orçamentos-only user (`acessoOrcamento: true, acessoMedicao: false`) returns `{ destination: '/dashboard', status: 307 }`.
  - **1.2.5**: Root destination for Medição-only user (`acessoOrcamento: false, acessoMedicao: true`) returns `{ destination: '/medicao', status: 307 }`.
  - **1.2.6**: Root destination for zero-access user (`acessoOrcamento: false, acessoMedicao: false`) redirects to `/login?error=no_modules`.
- **Suite 1.3 ("Bidirectional Module Switcher Contract")** defines test **1.3.1** (lines 630–639):
  - Verifies oracle `shouldRenderModuleSwitcher(claims)`:
    * `dual` (`true`, `true`) -> `true` (render switcher)
    * `orcamentos-only` (`true`, `false`) -> `false` (hide switcher)
    * `medicao-only` (`false`, `true`) -> `false` (hide switcher)
    * `zero-access` (`false`, `false`) -> `false` (hide switcher)
    * `null` -> `false` (hide switcher)
- **Suite 3.1 & 3.2** (lines 1053–1145): Full flow tests validating token minting -> root triage -> navigation -> module switching between `/dashboard` and `/medicao` with session preservation.
- **Suite 4.2 & 4.3** (lines 1290–1398): Persona tests validating "Lucas" (single-access, switcher hidden) and "Roberto" (dual-access, switcher active on `/portal` and `/dashboard`).

### 1.2 Tailwind Configuration (`tailwind.config.ts`)
- Exact color mapping configured under `theme.extend.colors.rbt` (lines 12–33):
  * `rbt.red`: `'#BA1A1A'`
  * `rbt['red-hover']`: `'#991B1B'`
  * `rbt['red-light']`: `'#FEF2F2'`
  * `rbt['red-border']`: `'#FECACA'`
  * `rbt.black`: `'#111827'`
  * `rbt.dark`: `'#0A0F1D'`
  * `rbt.navy`: `'#1E3A5F'`
  * `rbt.steel`: `'#2D4B73'`
  * `rbt['50']`: `'#F0F4F8'`
  * `rbt.accent`: `'#BA1A1A'`

### 1.3 Existing Shell & Brand Components
- **`src/components/ui/rbt-logo.tsx`**: Renders the official SVG logo with bracket in `#BA1A1A`, text `RBT` in `#BA1A1A`, and subtitle (`'FUNDAÇÕES' | 'ORÇAMENTOS' | 'ENGENHARIA'`) in `#000000`. Supports `size="sm" | "md" | "lg" | "xl"` and `boxed={boolean}`.
- **`src/components/ui/logout-button.tsx`**: Client component calling `POST /api/auth/logout`, clearing cookies and routing to `/login`.
- **`src/components/layout/dashboard-shell.tsx`**: Sidebar and topbar for `/dashboard`. Current `UserSession` interface (line 21) only defines `{ id, name, email, role }` and lacks `acessoOrcamento` and `acessoMedicao`.
- **`src/app/page.tsx`**: Currently unconditionally redirects all authenticated sessions to `/dashboard` without inspecting module permissions.

### 1.4 Test & Compiler Execution Results
- **TypeScript strict check**: `npx tsc --noEmit` exits with **code 0** (0 errors).
- **Harness Tier 1**: `npx tsx scripts/verify-portal-unified.ts --tier=1` exits with **code 0** (28/28 tests passed, 42.29ms).
- **Harness All Tiers**: `npx tsx scripts/verify-portal-unified.ts` exits with **code 0** (50/50 tests passed, 57.87ms).
- **Production Build**: `npm run build` exits with **code 0** (14/14 static pages generated, dynamic routes compiled).
  * *Note on Windows/OneDrive lock*: If Next.js throws `EINVAL: invalid argument, readlink` when cleaning `.next`, removing `.next` via PowerShell prior to build cleanly resolves the lock.

---

## 2. Logic Chain

From the observations above, the logical derivation of the M2 verification requirements proceeds as follows:

1. **Root Route (`src/app/page.tsx`) Triage Logic**:
   - *Observation 1.1 (Tests 1.2.2 - 1.2.6)* requires root `/` to inspect `session.user` and triage into 3 distinct paths:
     1. Unauthenticated -> `/login`
     2. Dual-module user (`acessoOrcamento && acessoMedicao`) -> `/portal`
     3. Orçamentos-only user (`acessoOrcamento && !acessoMedicao`) -> `/dashboard`
     4. Medição-only user (`!acessoOrcamento && acessoMedicao`) -> `/medicao`
     5. Zero-access user -> `/login?error=no_modules`
   - *Observation 1.3* shows current `src/app/page.tsx` unconditionally redirects to `/dashboard`.
   - *Inference*: The implementation in `src/app/page.tsx` must be updated to use `getServerSession()` from `@/lib/session` and mirror the oracle logic of `resolveRootDestination`.

2. **Institutional Selection Hub (`src/app/portal/page.tsx`) Visual & Access Logic**:
   - *Observation 1.1 (Test 1.2.1) & 1.2* specify the RBT corporate palette: `#BA1A1A` (primary red) and `#111827` (dark graphite).
   - *ORIGINAL_REQUEST.md R1 & PROJECT.md Feature 3* require two high-contrast selection cards:
     1. Card 1: **Gestão de Orçamentos** (accent `#BA1A1A`, link to `/dashboard`, active when `user.acessoOrcamento === true`).
     2. Card 2: **Medição Diária (RDP)** (accent `#111827`, link to `/medicao`, active when `user.acessoMedicao === true`).
   - Cards must display an active state ("Disponível" badge + "Clique para acessar" button) when permission is present, and a disabled state ("Acesso não habilitado" badge + disabled button) when permission is missing.
   - Topbar must present `RBTLogo` (`subtitle="FUNDAÇÕES"`), user identification badge with role, and `LogoutButton`.
   - An alert banner must render if `searchParams.unauthorized` is set (e.g., when a user is bounced back from an unauthorized route).

3. **Bidirectional Module Switcher (`src/components/layout/dashboard-shell.tsx`) Logic**:
   - *Observation 1.1 (Test 1.3.1)* requires `shouldRenderModuleSwitcher` to be `true` only for dual-module users (`user.acessoOrcamento && user.acessoMedicao`).
   - *Observation 1.3* shows `UserSession` in `DashboardShell` does not yet accept `acessoOrcamento` and `acessoMedicao`.
   - *Inference*: `UserSession` must be extended with `acessoOrcamento?: boolean; acessoMedicao?: boolean;`. In `DashboardShell`, a "Trocar Módulo" button/link with `LayoutGrid` icon leading to `/portal` must be conditionally rendered in the topbar and/or sidebar when both flags are truthy.

---

## 3. Caveats

1. **Authentication Provider**: The application uses custom database session cookies (`rbt_orcamentos_session`, `rbt_session`, and HMAC `rbt_user_meta`) managed via `@/lib/session` and `@/lib/auth`. NextAuth is NOT installed or configured. Server components must import `getServerSession` from `@/lib/session`.
2. **Medição Diária Routing Pre-condition**: Module 2 links to `/medicao`. Since full Medição Diária page migration occurs in Milestone M4, clicking this card prior to M4 may encounter a 404 or stub unless a lightweight placeholder or route exists. The card link itself and active badge state must still point to `/medicao`.
3. **Windows File System Locking on `.next`**: Due to OneDrive synchronization on Windows, Next.js build cleanups may occasionally fail with `EINVAL: invalid argument, readlink`. Purging `.next` with PowerShell prior to running `npm run build` completely avoids this transient filesystem issue.

---

## 4. Conclusion

The verification protocol for Milestone M2 is fully established with 4 mandatory quality gates:

1. **Gate 1 — Static Type Safety**: `npx tsc --noEmit` must execute with 0 errors.
2. **Gate 2 — Automated E2E Test Suite**: `npx tsx scripts/verify-portal-unified.ts --tier=1` (and all tiers) must pass 100% of tests.
3. **Gate 3 — Production Compilation**: `npm run build` must compile all routes including `/` and `/portal`.
4. **Gate 4 — Visual Token & UI Conformance**: The selection hub, topbar, cards, unauthorized banner, and module switcher must strictly adhere to the visual token specification defined below.

---

## 5. Verification Method

### 5.1 Exact Verification Commands

```bash
# 1. Strict TypeScript check (zero errors allowed)
npx tsc --noEmit

# 2. Automated E2E Tier 1 test execution (Suite 1.2 & Suite 1.3 focus)
npx tsx scripts/verify-portal-unified.ts --tier=1

# 3. Full 4-Tier regression test execution (50 tests)
npx tsx scripts/verify-portal-unified.ts

# 4. Production Next.js build verification (with Windows cache cleanup if needed)
powershell -Command "if (Test-Path .next) { Remove-Item -Recurse -Force .next }; npm run build"
```

### 5.2 Visual Token & UI Conformance Matrix

| Element | Required Tokens & Classes | Expected Visual Result |
|---|---|---|
| **Palette — Primary Red** | `#BA1A1A` (`bg-[#BA1A1A]`, `text-[#BA1A1A]`, `hover:bg-[#991B1B]`) | Official RBT corporate red on logo bracket, Orçamentos card button, and active highlights. |
| **Palette — Dark Graphite** | `#111827` (`bg-[#111827]`, `text-[#111827]`, `hover:bg-slate-800`) | Official RBT graphite black on Medição Diária card button and sidebar header. |
| **Palette — Background Canvas**| `#F0F4F8` / `bg-slate-50` / `bg-slate-100` | Soft neutral backdrop for optimal card contrast. |
| **Institutional Topbar** | `<header className="... bg-white border-b border-slate-200 shadow-sm ...">` | White topbar containing `<RBTLogo size="md" subtitle="FUNDAÇÕES" />`, user info pill, and `<LogoutButton />`. |
| **Card 1: Gestão de Orçamentos** | `bg-white rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-xl` | Icon with `#BA1A1A` accent; status badge "Disponível" (green) or "Acesso não habilitado" (gray); button "Clique para acessar" pointing to `/dashboard`. |
| **Card 2: Medição Diária (RDP)** | `bg-white rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-xl` | Icon with `#111827` accent; status badge "Disponível" (green) or "Acesso não habilitado" (gray); button "Clique para acessar" pointing to `/medicao`. |
| **Unauthorized Alert Banner** | `bg-amber-50 border border-amber-300 text-amber-900 rounded-xl p-4` | Rendered only when `?unauthorized=orcamentos` or `?unauthorized=medicao`; displays clear explanation and icon. |
| **Responsive Grid Layout** | `grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto` | Single stacked column on mobile (< 640px), balanced 2-column layout on tablet/desktop (>= 768px). |
| **Module Switcher ("Trocar Módulo")** | Visible `if (user.acessoOrcamento && user.acessoMedicao)` | Shortcut with `LayoutGrid` icon leading back to `/portal` in `DashboardShell`. Hidden for single-module users. |

### 5.3 Automated Visual Token Scanner (Command-line Check)

To verify that the newly created portal file contains all mandatory brand tokens and classes without manual inspection, run:

```powershell
powershell -Command "
$portalFile = 'src/app/portal/page.tsx';
if (Test-Path $portalFile) {
  $content = Get-Content $portalFile -Raw;
  $tokens = @('#BA1A1A', '#111827', 'RBTLogo', 'LogoutButton', 'acessoOrcamento', 'acessoMedicao', 'unauthorized');
  foreach ($t in $tokens) {
    if ($content.Contains($t)) { Write-Host \"  [OK] Token/Identifier found: $t\" -ForegroundColor Green }
    else { Write-Host \"  [FAIL] Missing Token/Identifier: $t\" -ForegroundColor Red }
  }
} else {
  Write-Host \"Portal page not yet created.\" -ForegroundColor Yellow
}
"
```

### 5.4 Invalidation Conditions

The implementation of Milestone M2 shall be rejected if any of the following occur:
1. `npx tsc --noEmit` produces any TypeScript diagnostic error.
2. `npx tsx scripts/verify-portal-unified.ts --tier=1` fails any test in Suite 1.2 or Suite 1.3.
3. Unauthenticated requests to `/` or `/portal` do not redirect to `/login`.
4. Users with dual access visiting `/` are not redirected to `/portal`.
5. Users with single access visiting `/` are not redirected directly to their assigned module (`/dashboard` or `/medicao`).
6. The "Trocar Módulo" button is displayed to a user who only has access to one module.
7. Card buttons or badges do not use official RBT color hex codes (`#BA1A1A` and `#111827`).
8. `npm run build` fails to compile `src/app/portal/page.tsx` or `src/app/page.tsx`.
