# Handoff Report: Unified Portal Architecture, Hub UI & Modular Permissions (Survey Explorer 3)

**Agent**: Survey Explorer 3 (Integration Architecture, UI Hub & Permissions)  
**Date**: 2026-10-20T18:48:00Z  
**Target Scope**: Requirements R1, R2, R4 & Acceptance Criteria (Portal Unificado RBT Fundações)  
**Status**: Hard Handoff (Investigation & Survey Complete)

---

## 1. Observation

### 1.1 Existing Layouts, Shells & Design Tokens
- **File**: `orçamento RBT/tailwind.config.ts` (lines 15–28) & `Medicaodiaria/tailwind.config.ts` (lines 14–27)
  Both repositories define identical corporate color tokens for RBT Fundações:
  - Vermelho Oficial: `#BA1A1A` (`rbt-red`), Hover: `#991B1B` (`rbt-red-hover`), Light: `#FEF2F2` (`rbt-red-light`), Border: `#FECACA` (`rbt-red-border`).
  - Preto Grafite: `#111827` (`rbt-black`), Dark: `#0A0F1D` (`rbt-dark`).
  - Azul Corporativo / Steel: `#1E3A5F` (`rbt-navy`), `#2D4B73` (`rbt-steel`).
  - Fundo neutro: `#F0F4F8` / `bg-slate-100`, textos: `text-slate-900`.
- **File**: `src/components/ui/rbt-logo.tsx` (lines 10–78)
  Available in both applications, renders the official SVG logo with structural bracket in `#BA1A1A`, text "RBT" in `#BA1A1A` and subtitle ("FUNDAÇÕES", "ORÇAMENTOS", "ENGENHARIA") in black `#000000`. Supports sizes `sm`, `md`, `lg`, `xl` and boxed wrapper.
- **File**: `src/components/ui/logout-button.tsx` (lines 13–54)
  Client component performing POST to `/api/auth/logout`, clearing session cookie, and pushing `router.push('/login')`.
- **File**: `src/components/layout/dashboard-shell.tsx` (lines 71–306)
  In Orçamentos: Fixed sidebar on left (`#111827`), sticky header (`h-16 bg-white border-b border-slate-200`), responsive mobile drawer with backdrop blur, and user profile card.
  In Medicaodiaria: Identical shell structure with role-based navigation tabs (`getNavItems(user.role)`).
- **File**: `src/app/page.tsx` (lines 1–13)
  Currently executes:
  ```ts
  const session = await getServerSession();
  if (!session) redirect('/login');
  redirect('/dashboard');
  ```
  Points directly to `/dashboard` instead of a modular hub.

### 1.2 Prisma Schema & User Access Model
- **File**: `orçamento RBT/prisma/schema.prisma` (lines 10–25)
  ```prisma
  model User {
    id           String      @id @default(uuid())
    name         String
    email        String      @unique
    passwordHash String
    role         String      @default("ORCAMENTISTA")
    ativo        Boolean     @default(true)
    createdAt    DateTime    @default(now())
    updatedAt    DateTime    @updatedAt

    sessions     Session[]
    orcamentos   Orcamento[]
    logs         StatusLog[]

    @@map("users")
  }
  ```
  `acessoOrcamento` and `acessoMedicao` are currently absent from the `User` model.
- **File**: `Medicaodiaria/prisma/schema.prisma` (lines 68–92)
  Medicaodiaria has `role` default `APONTADOR`, roles `APONTADOR`, `ENGENHEIRO`, `ADMINISTRADOR`.
- **File**: `orçamento RBT/prisma/seed.ts` (lines 12–45)
  Seeds `admin@rbt.com.br` (`ADMIN`) and `orcamentista@rbt.com.br` (`ORCAMENTISTA`).
- **File**: `Medicaodiaria/prisma/seed.ts` (lines 16–80)
  Seeds `apontador@rbtfundacoes.com.br` (`APONTADOR`), `engenheiro@rbtfundacoes.com.br` (`ENGENHEIRO`), and `admin@rbtfundacoes.com.br` (`ADMINISTRADOR`).

### 1.3 User Management Component & APIs
- **File**: `src/components/usuarios/usuarios-client.tsx` (lines 45–149, 488–644)
  Currently handles listing, filtering, creating and deleting users.
  - Table headers (line 309): "Usuário", "Função / Perfil", "Status", "Orçamentos Vinculados", "Cadastrado em", "Ações".
  - Create User Form (lines 515–617): Has inputs for `name`, `email`, `password`, and radio buttons for `role` (`ORCAMENTISTA` vs `ADMIN`). It does NOT have selectors/checkboxes for `acessoOrcamento` or `acessoMedicao`.
- **File**: `src/app/api/usuarios/route.ts` (lines 46–141) & `src/app/api/usuarios/[id]/route.ts` (lines 16–92)
  - `POST /api/usuarios`: Only accepts `{ name, email, password, role }`.
  - `PATCH /api/usuarios/[id]`: Only accepts `{ role, ativo, name, password }`.

### 1.4 Authentication, Session Storage & Edge Middleware
- **File**: `src/lib/auth.ts` (lines 5–11)
  ```ts
  export interface AuthUser {
    id: string;
    name: string;
    email: string;
    role: UserRole;
    ativo: boolean;
  }
  ```
- **File**: `src/lib/session.ts` (lines 40–89)
  `validateSession` reads SQLite database:
  ```ts
  select: { id: true, name: true, email: true, role: true, ativo: true }
  ```
- **File**: `src/middleware.ts` (lines 10–28)
  Currently only inspects existence of cookie `rbt_orcamentos_session`:
  ```ts
  if (pathname.startsWith('/dashboard')) {
    const sessionToken = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    if (!sessionToken || sessionToken.trim() === '') {
      const loginUrl = new URL('/login', request.url);
      ...
      return NextResponse.redirect(loginUrl, 307);
    }
  }
  ```
- **File**: `Medicaodiaria/src/lib/token-utils.ts` (lines 21–77) & `Medicaodiaria/src/middleware.ts` (lines 59–69, 103–139)
  Medicaodiaria implements a two-cookie architecture:
  1. `rbt_session` (opaque session ID in SQLite)
  2. `rbt_user_meta` (compact HMAC SHA-256 signed payload containing claims: `{ userId, role, email, ts }`)
  In Next.js Edge Middleware, `verifyUserMeta` uses Web Crypto API (`crypto.subtle`) to decode and verify claims synchronously in < 1ms without touching SQLite or Prisma.

### 1.5 Package Dependencies & Build Baselines
- **Tool Verification**:
  1. `npx tsc --noEmit` in `orçamento RBT`: Exit code 0 (zero errors).
  2. `npx tsc --noEmit` in `Medicaodiaria`: Exit code 0 (zero errors).
  3. `npm run build` in `orçamento RBT` (task-98): Exit code 0 (all 14 routes compiled cleanly).
  4. `npm run build` in `Medicaodiaria` (task-104): Exit code 0 (all 25 routes compiled cleanly).
- **Dependency Gap**:
  - `Medicaodiaria/package.json` contains `exceljs: ^4.4.0` (used in `/api/medicoes/[id]/excel` for generating spreadsheet downloads).
  - `orçamento RBT/package.json` does NOT currently have `exceljs` installed.

---

## 2. Logic Chain

1. **Premise 1 (R1 Hub UI Requirement)**:
   The user requested a dedicated post-login selection screen (`/portal` or `/dashboard`) matching the RBT visual standard: white cards, rounded corners, soft shadows, circular icon containers with `#BA1A1A` and `#111827`, link "Clique para acessar", topbar with RBT logo, user profile and Logout.
2. **Inference from 1.1**:
   Because `src/app/page.tsx` currently hard-redirects to `/dashboard` (which is the Orçamentos Kanban board), moving the modular hub to `/portal` cleanly separates the system gateway from individual modules. Root `/` can inspect the user session: if the user has dual-module access, redirect to `/portal`; if the user has single-module access, redirect straight to their authorized module (`/dashboard` or `/medicao`).
3. **Premise 2 (R2 User Permissions Model)**:
   Requirement R2 mandates:
   *"Adicionar checkboxes / seletores para definir quais módulos o usuário terá permissão de acessar: `acessoOrcamento` e `acessoMedicao`. Salvar e validar as permissões de acesso diretamente no banco de dados e na sessão do usuário."*
4. **Inference from 1.2 & 1.3**:
   Adding `acessoOrcamento Boolean @default(true)` and `acessoMedicao Boolean @default(false)` to `model User` in `prisma/schema.prisma` guarantees backwards compatibility for existing budget users while supporting granular module flags. Exposing these fields in `/api/usuarios` (`POST` and `PATCH`) and adding checkboxes to `usuarios-client.tsx` (with validation ensuring at least one module is checked) fulfills the management requirement.
5. **Premise 3 (R4 Route Protection & Middleware)**:
   Requirement R4 requires:
   *"Se o usuário tiver acesso a apenas 1 módulo, pode ser redirecionado diretamente para esse módulo ou visualizar apenas o card habilitado no portal. Se tentar acessar a rota de um módulo não liberado, exibir aviso amigável de acesso restrito e redirecionar para o portal."*
6. **Inference from 1.4**:
   Next.js Edge Middleware cannot execute SQLite queries directly via Prisma without edge incompatibilities. Adopting the HMAC SHA-256 token utility discovered in `Medicaodiaria/src/lib/token-utils.ts` and encoding `{ userId, role, email, acessoOrcamento, acessoMedicao }` into the `rbt_user_meta` cookie enables the middleware to evaluate module access instantly at the edge. If `acessoOrcamento === false` and the path is `/dashboard/*`, middleware returns HTTP 403 (for API) or redirects to `/portal?unauthorized=orcamentos` (for pages). The `/portal` page reads `?unauthorized=...` and displays a user-friendly alert modal/toast.
7. **Inference from 1.5 (Build Integrity)**:
   Because `Medicaodiaria` utilizes `exceljs: ^4.4.0` in its measurement export routes, porting Medição code into `orçamento RBT` without running `npm i exceljs` will break `npx tsc --noEmit` and `npm run build`. Adding `exceljs` is mandatory before or during the Medição route integration.

---

## 3. Caveats

1. **Role Nomenclature Harmony**:
   In Orçamentos, user roles are `'ADMIN' | 'ORCAMENTISTA'`. In Medição Diária, roles are `'APONTADOR' | 'ENGENHEIRO' | 'ADMINISTRADOR'`. For user administration, `'ADMIN'` and `'ADMINISTRADOR'` should be treated as equivalent super-admin roles, and `role` in Prisma remains a flexible `String` so no breaking schema collisions occur.
2. **Session Cookie Scope**:
   Using `rbt_session` / `rbt_orcamentos_session` with `Path=/` ensures the session applies across `/portal`, `/dashboard`, and `/medicao`.
3. **Database Unification Consideration**:
   While this survey focuses on architecture, UI hub, and permissions, Medição tables can be appended directly into `prisma/schema.prisma` in `orçamento RBT` because model names (`Obra`, `Contrato`, `RelatorioDiario`, `Medicao`, `EstacaPrincipal`) have zero name collision with Orçamentos models (`Lead`, `Orcamento`, `MagicLink`, `RespostaFormulario`, `PropostaComercial`, `StatusLog`).

---

## 4. Conclusion & Actionable Blueprint

### 4.1 Hub Pós-Login Design Blueprint (`/portal`)

#### Route Location
- Create `src/app/portal/page.tsx` (Server Component protected by session validation).
- Update `src/app/page.tsx` to route users based on session permissions:
  - Both modules active: `redirect('/portal')`.
  - Only Orçamentos: `redirect('/dashboard')`.
  - Only Medição: `redirect('/medicao')`.

#### Topbar Component
- Institutional sticky bar with:
  - `<RBTLogo size="md" subtitle="FUNDAÇÕES" />`
  - Subtitle: `Portal Unificado de Sistemas Corporativos`
  - User profile badge: Name, Email, Role indicator (`Gestor`, `Orçamentista`, `Engenheiro`, `Apontador`).
  - `<LogoutButton showTextAlways className="..." />`

#### Modular Selection Grid Layout
Container: `max-w-4xl mx-auto px-4 py-8 sm:py-12 flex flex-col items-center`.
Headline: `Selecione o Sistema Desejado`, subtext: `Acesse as ferramentas de engenharia, comercial ou produção de obras.`

**Card 1 — Gestão de Orçamentos**:
- White card (`bg-white rounded-3xl border border-slate-200/90 shadow-md hover:shadow-xl transition-all duration-300 p-7 sm:p-8 flex flex-col justify-between relative overflow-hidden group`).
- Top accent bar: `h-1.5 w-full bg-[#BA1A1A] absolute top-0 left-0`.
- Icon: Circular container (`w-16 h-16 rounded-2xl bg-red-50 text-[#BA1A1A] border border-red-100 flex items-center justify-center group-hover:bg-[#BA1A1A] group-hover:text-white transition-all duration-300`). Icon: `Calculator` or `LayoutDashboard`.
- Title: `Gestão de Orçamentos` (`text-xl font-bold text-slate-900`).
- Category pill: `Módulo Comercial & Engenharia` (`text-[11px] font-bold text-red-700 bg-red-50 px-2.5 py-0.5 rounded-full w-fit`).
- Description: `Qualificação técnica de leads, esteira Kanban de orçamentos, cálculo de custos e BDI, geração de propostas comerciais em PDF e auto-resposta.`
- Action Link:
  - If `acessoOrcamento === true`:
    `<Link href="/dashboard" className="mt-6 w-full py-3 px-4 bg-slate-50 hover:bg-[#BA1A1A] text-slate-700 hover:text-white rounded-xl font-bold text-xs sm:text-sm flex items-center justify-between transition-all group-hover:shadow-sm"><span>Clique para acessar</span><ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" /></Link>`
  - If `acessoOrcamento === false`:
    `<div className="mt-6 w-full py-3 px-4 bg-slate-100 text-slate-400 rounded-xl font-medium text-xs flex items-center justify-between cursor-not-allowed"><span>Acesso não habilitado</span><Lock className="w-4 h-4 text-slate-400" /></div>`

**Card 2 — Medição Diária (RDP)**:
- White card (`bg-white rounded-3xl border border-slate-200/90 shadow-md hover:shadow-xl transition-all duration-300 p-7 sm:p-8 flex flex-col justify-between relative overflow-hidden group`).
- Top accent bar: `h-1.5 w-full bg-[#111827] absolute top-0 left-0`.
- Icon: Circular container (`w-16 h-16 rounded-2xl bg-slate-100 text-[#111827] border border-slate-200 flex items-center justify-center group-hover:bg-[#111827] group-hover:text-white transition-all duration-300`). Icon: `ClipboardCheck` or `HardHat`.
- Title: `Medição Diária (RDP)` (`text-xl font-bold text-slate-900`).
- Category pill: `Módulo de Obras & Produção` (`text-[11px] font-bold text-slate-700 bg-slate-100 px-2.5 py-0.5 rounded-full w-fit`).
- Description: `Apontamento de campo, relatórios diários de produção (RDP), boletins de medição com retenções contratuais (INSS/ISS), controle de estacas cravadas e exportação Excel.`
- Action Link:
  - If `acessoMedicao === true`:
    `<Link href="/medicao" className="mt-6 w-full py-3 px-4 bg-slate-50 hover:bg-[#111827] text-slate-700 hover:text-white rounded-xl font-bold text-xs sm:text-sm flex items-center justify-between transition-all group-hover:shadow-sm"><span>Clique para acessar</span><ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" /></Link>`
  - If `acessoMedicao === false`:
    `<div className="mt-6 w-full py-3 px-4 bg-slate-100 text-slate-400 rounded-xl font-medium text-xs flex items-center justify-between cursor-not-allowed"><span>Acesso não habilitado</span><Lock className="w-4 h-4 text-slate-400" /></div>`

#### Module Switcher (Quick Toggle Between Modules)
- In both `src/components/layout/dashboard-shell.tsx` (Orçamentos) and Medição's shell:
  If user has dual access (`acessoOrcamento && acessoMedicao`), add a button in the topbar and sidebar:
  `<Link href="/portal" className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold"><LayoutGrid className="w-4 h-4 text-[#BA1A1A]" /><span>Trocar Módulo</span></Link>`

---

### 4.2 User Access Control Blueprint (Prisma, Session & `/dashboard/usuarios`)

#### 1. Prisma Model Update
In `prisma/schema.prisma`:
```prisma
model User {
  id              String      @id @default(uuid())
  name            String
  email           String      @unique
  passwordHash    String
  role            String      @default("ORCAMENTISTA")
  ativo           Boolean     @default(true)
  acessoOrcamento Boolean     @default(true)
  acessoMedicao   Boolean     @default(false)
  createdAt       DateTime    @default(now())
  updatedAt       DateTime    @updatedAt

  sessions        Session[]
  orcamentos      Orcamento[]
  logs            StatusLog[]

  @@map("users")
}
```

#### 2. Session & Signed Edge Meta Token
In `src/lib/token-utils.ts` (bring from Medicaodiaria):
```ts
export interface UserMetaClaims {
  userId: string;
  role: string;
  email: string;
  acessoOrcamento: boolean;
  acessoMedicao: boolean;
}
```
Update `createSession` and `buildSessionCookies` in `src/lib/session.ts` so that whenever a user logs in, both `rbt_orcamentos_session` and `rbt_user_meta` cookies are dispatched with strict `SameSite` and `HttpOnly` attributes.

#### 3. User Management Interface (`/dashboard/usuarios`)
In `src/components/usuarios/usuarios-client.tsx`:
1. **Table View**: Add column "Módulos Habilitados":
   - Badge `Orçamentos`: Green pill if `u.acessoOrcamento`, gray dashed pill if false.
   - Badge `Medição Diária`: Dark slate pill if `u.acessoMedicao`, gray dashed pill if false.
2. **Create User Modal**:
   - Add section: "Acesso aos Módulos do Sistema *"
   - Checkbox 1: `acessoOrcamento` (default checked)
   - Checkbox 2: `acessoMedicao` (default unchecked)
   - Form validation: Prevent submission if neither checkbox is checked.
3. **Inline Edit / Action**:
   - Provide toggle buttons in user row or modal to quickly grant/revoke `acessoOrcamento` and `acessoMedicao`.
   - Prevent the operating administrator from revoking both modules from their own session.
4. **Backend Routes**:
   - `POST /api/usuarios`: Read and validate `acessoOrcamento` and `acessoMedicao`, persist to Prisma.
   - `PATCH /api/usuarios/[id]`: Read boolean values for `acessoOrcamento` and `acessoMedicao`, execute `prisma.user.update`.

---

### 4.3 Route Protection & Middleware Strategy

#### Route Partitioning
1. **Public Routes**:
   - `/login`, `/api/auth/login`, `/api/auth/logout`, `/api/health`, `/api/marca/pdf`, `/formulario`, `/formulario/*`, `/api/formulario/*`, static files (`/_next/*`, `/rbt-logo.png`, `/favicon.ico`).
2. **Hub Route**:
   - `/portal` (requires authenticated user).
3. **Orçamentos Scope**:
   - Prefixes: `/dashboard`, `/api/orcamentos`, `/api/solicitacoes`, `/api/usuarios`.
   - Required Flag: `authUser.acessoOrcamento === true`.
4. **Medição Diária Scope**:
   - Prefixes: `/medicao`, `/api/medicoes`, `/api/rdp`, `/api/estacas`, `/api/contratos`, `/api/obras`.
   - Required Flag: `authUser.acessoMedicao === true`.

#### Middleware Logic Flow (`src/middleware.ts`)
```ts
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Static asset & Next.js bypass
  if (isStaticOrNext(pathname)) return NextResponse.next();

  // 2. Decode HMAC token at the edge
  const userMeta = await getAndVerifyUserMeta(request);
  const isAuthenticated = Boolean(userMeta);

  // 3. Public path handling
  if (isPublicPath(pathname)) {
    if (pathname === '/login' && isAuthenticated) {
      // Redirect already logged in user to portal or specific module
      if (userMeta.acessoOrcamento && !userMeta.acessoMedicao) {
        return NextResponse.redirect(new URL('/dashboard', request.url));
      }
      if (!userMeta.acessoOrcamento && userMeta.acessoMedicao) {
        return NextResponse.redirect(new URL('/medicao', request.url));
      }
      return NextResponse.redirect(new URL('/portal', request.url));
    }
    return NextResponse.next();
  }

  // 4. Unauthenticated guard
  if (!isAuthenticated) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    }
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // 5. Orçamentos permission check
  if (pathname.startsWith('/dashboard') || isOrcamentosApi(pathname)) {
    if (!userMeta.acessoOrcamento) {
      if (pathname.startsWith('/api/')) {
        return NextResponse.json({ error: 'Acesso negado ao módulo de Orçamentos.' }, { status: 403 });
      }
      return NextResponse.redirect(new URL('/portal?unauthorized=orcamentos', request.url));
    }
  }

  // 6. Medição permission check
  if (pathname.startsWith('/medicao') || isMedicaoApi(pathname)) {
    if (!userMeta.acessoMedicao) {
      if (pathname.startsWith('/api/')) {
        return NextResponse.json({ error: 'Acesso negado ao módulo de Medição Diária.' }, { status: 403 });
      }
      return NextResponse.redirect(new URL('/portal?unauthorized=medicao', request.url));
    }
  }

  return NextResponse.next();
}
```

---

### 4.4 Verification Criteria for Implementation

| Verification Step | Command / Target | Success Condition |
|---|---|---|
| **Dependency Install** | `npm i exceljs` | `exceljs` added to `dependencies` in `package.json` |
| **Prisma Generation** | `npx prisma generate` | `@prisma/client` updated with `acessoOrcamento` & `acessoMedicao` |
| **Database Sync** | `npx prisma db push` | SQLite schema synchronized without breaking existing rows |
| **TypeScript Typecheck** | `npx tsc --noEmit` | Exit code 0, exactly 0 type errors |
| **Next.js Production Build** | `npm run build` | Exit code 0, all static & dynamic routes compiled |
| **Route Protection Test** | Automated test script (`scripts/verify-portal-routes.ts`) | 401 on unauth, 403/redirect to `/portal?unauthorized=...` on unauthorized module access |

---

## 5. Verification Method

To independently verify all findings in this survey:

1. **Verify TypeScript Baselines**:
   ```powershell
   # In Orçamentos workspace:
   npx tsc --noEmit
   # In Medicaodiaria workspace:
   cd ..\Medicaodiaria; npx tsc --noEmit; cd "..\orçamento RBT"
   ```
   *Expected Result*: Both commands exit with code 0.

2. **Verify Production Build Baseline**:
   ```powershell
   npm run build
   ```
   *Expected Result*: Compiles all 14 routes successfully with zero compile-time or tracing errors.

3. **Verify Dependencies Diff**:
   Inspect `package.json` vs `..\Medicaodiaria\package.json`: confirm `exceljs` is required by Medição's export routes.

4. **Verify Prisma Schema**:
   Inspect `prisma/schema.prisma` lines 10–25: confirm `acessoOrcamento` and `acessoMedicao` do not exist yet and can be added safely with defaults.

5. **Verify Edge Crypto Feasibility**:
   Inspect `..\Medicaodiaria\src\lib\token-utils.ts`: confirm `crypto.subtle` is 100% compatible with Next.js Edge Middleware without native Node bindings.
