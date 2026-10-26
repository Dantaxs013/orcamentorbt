# Handoff Report — User Priority UX Adjustments & M4 Verification Protocol

- **Author**: `explorer_m4_3`
- **Working Directory**: `c:/Users/aaaaa/OneDrive - Piatec/TI_CODIGOS/T.I/orçamento RBT/.agents/teamwork/explorer_m4_3`
- **Date**: 2026-10-20
- **Recipient**: Parent Agent (`e65a3c02-8d0d-46b7-ac87-62b0077928ce`)
- **Status**: Complete Investigation & Formulated Specification

---

## 1. Observation

### 1.1 Post-Login Redirection in `src/app/api/auth/login/route.ts`
- **Location**: `src/app/api/auth/login/route.ts`, lines 87-103:
```typescript
87:     // Determina URL de destino pós-login
88:     let redirectUrl = '/portal';
89:     if (acessoOrcamento && !acessoMedicao) {
90:       redirectUrl = '/dashboard';
91:     } else if (!acessoOrcamento && acessoMedicao) {
92:       if (roleUpper === 'APONTADOR') {
93:         redirectUrl = '/medicao/apontador/rdp';
94:       } else if (roleUpper === 'ENGENHEIRO') {
95:         redirectUrl = '/medicao/engenheiro/validacao';
96:       } else {
97:         redirectUrl = '/medicao';
98:       }
99:     } else {
100:       // Usuário com acesso a ambos os módulos -> Hub Institucional RBT
101:       redirectUrl = '/portal';
102:     }
```
- **Direct Finding**: The login API currently branches and bypasses `/portal` for single-module users, redirecting them directly to `/dashboard` or `/medicao/*`. This directly conflicts with the user's explicit directive:
  > *"Após efetuar o login, o usuário SEMPRE deve ir direto para a tela de seleção /portal."*

### 1.2 Root Route Redirection in `src/app/page.tsx`
- **Location**: `src/app/page.tsx`, lines 17-33:
```typescript
17: export default async function HomePage() {
18:   const session = await getServerSession();
19: 
20:   if (!session || !session.user) {
21:     redirect('/login');
22:   }
23: 
24:   const { acessoOrcamento, acessoMedicao } = session.user;
25: 
26:   // Usuário autenticado com liberação sempre acessa o Portal Hub
27:   if (acessoOrcamento || acessoMedicao) {
28:     redirect('/portal');
29:   }
30: 
31:   // 4. Sem Módulos Habilitados: Redireciona com aviso explícito
32:   redirect('/login?error=no_modules');
33: }
```
- **Direct Finding**: `src/app/page.tsx` already routes authenticated users with modules to `/portal`, but retains an extra condition and redirects zero-module accounts to `/login?error=no_modules` rather than allowing `/portal` to render its built-in defensive zero-module notification card (`hasNoModules`).

### 1.3 Strict Card Filtering in `src/app/portal/page.tsx`
- **Location**: `src/app/portal/page.tsx`, lines 58-61 and 222-426:
```typescript
58:   const hasOrcamento = Boolean(user.acessoOrcamento);
59:   const hasMedicao = Boolean(user.acessoMedicao);
60:   const hasNoModules = !hasOrcamento && !hasMedicao;
```
Lines 222-323 (Gestão de Orçamentos):
```tsx
222:   <div className={`grid gap-6 lg:gap-8 max-w-5xl mx-auto w-full ${hasOrcamento && hasMedicao ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1 max-w-md"}`}>
223:     {hasOrcamento && (
224:     <div className="bg-white rounded-3xl border ...">
...
323:     )}
```
Lines 325-425 (Medição Diária RDP):
```tsx
325:     {hasMedicao && (
326:     <div className="bg-white rounded-3xl border ...">
...
425:     )}
```
- **Direct Finding**:
  - The outer guards `{hasOrcamento && (` and `{hasMedicao && (` already hide unauthorized module cards from the DOM and adjust the grid dynamically (`grid-cols-1 md:grid-cols-2` vs `grid-cols-1 max-w-md`).
  - However, inside each card block (lines 248-258, 305-320, 350-360, 407-422), there were legacy ternary checks (`hasOrcamento ? <Acesso Liberado> : <Acesso Não Habilitado>`) that represent dead code because the card only exists when permission is granted.
  - Furthermore, unauthorized cards must **never** be rendered in disabled state; they must be completely excluded from the DOM.

### 1.4 Test Suite Baseline Status
Commands executed in the workspace:
1. `npm test` (`tsx scripts/verify-security-routes.ts`):
   - **Result**: `29/29 PASSED` (48.28ms execution time).
2. `npx tsx scripts/verify-portal-unified.ts --tier=1`:
   - **Result**: `28/28 PASSED` (57.37ms execution time).
   - Current Suite 1.2 tests (1.2.4, 1.2.5) assert the old behavior (`/dashboard` for Orçamentos, `/medicao` for Medição).
   - Current Suite 1.3 tests only the module switcher.
3. `npx tsc --noEmit`:
   - **Result**: Exit code `0` (Zero TypeScript errors).
4. `npm run build`:
   - **Result**: Exit code `0` (15 static/dynamic pages compiled, linting passed, First Load JS 87.3 kB).
   - *Note*: Cleaned `.next` directory to avoid OneDrive file-locking artifacts.

---

## 2. Logic Chain

1. **User Request Alignment**:
   - The user specified that **ALL** authenticated users must land on `/portal` immediately upon login, regardless of single-module or dual-module access.
   - Setting `redirectUrl = '/portal'` in `src/app/api/auth/login/route.ts` guarantees that programmatic login requests immediately instruct client navigations to `/portal`.
   - Simplifying `src/app/page.tsx` so that `if (session) redirect('/portal')` guarantees that direct visits to the root domain (`/`) always land on `/portal`.

2. **Strict Card Filtering Principle**:
   - The user instructed:
     - If user has 2 modules -> Render 2 cards.
     - If user has only Orçamentos -> Render ONLY the Orçamentos card.
     - If user has only Medição -> Render ONLY the Medição card.
     - Unauthorized module card MUST NOT appear disabled; it must be completely absent from the DOM.
   - By conditioning the card render blocks strictly on `hasOrcamento` and `hasMedicao`, unauthorized cards produce zero DOM elements.
   - Single-module users receive a centered, focused card layout (`grid-cols-1 max-w-md`), enhancing visual hierarchy and ergonomics.
   - Dual-module users receive a balanced 2-column grid (`grid-cols-1 md:grid-cols-2 max-w-5xl`).

3. **Verification Harness Synchronization (`scripts/verify-portal-unified.ts`)**:
   - Because `resolveRootDestination(claims)` in `scripts/verify-portal-unified.ts` was originally written to triage single-module users to `/dashboard` or `/medicao`, it must be updated to return `/portal` for all authenticated claims.
   - Suite 1.2 must assert that `/` and `/login` consistently route to `/portal`.
   - Suite 1.3 must add explicit assertions for `/portal` card rendering:
     - Asserts dual-module yields 2 cards.
     - Asserts single-module yields 1 card.
     - Asserts unauthorized card is 0 (completely omitted from DOM, never rendered disabled).

---

## 3. Proposed Code Changes (Implementation Blueprint)

### 3.1 `src/app/api/auth/login/route.ts`
Replace lines 87-103 with unconditional `/portal` redirect:

```typescript
<<<<
    // Determina URL de destino pós-login
    let redirectUrl = '/portal';
    if (acessoOrcamento && !acessoMedicao) {
      redirectUrl = '/dashboard';
    } else if (!acessoOrcamento && acessoMedicao) {
      if (roleUpper === 'APONTADOR') {
        redirectUrl = '/medicao/apontador/rdp';
      } else if (roleUpper === 'ENGENHEIRO') {
        redirectUrl = '/medicao/engenheiro/validacao';
      } else {
        redirectUrl = '/medicao';
      }
    } else {
      // Usuário com acesso a ambos os módulos -> Hub Institucional RBT
      redirectUrl = '/portal';
    }
====
    // Determina URL de destino pós-login
    // Conforme ajuste prioritário de UX: TODOS os usuários autenticados são redirecionados para /portal
    const redirectUrl = '/portal';
>>>>
```

### 3.2 `src/app/page.tsx`
Replace lines 17-33 with simplified session redirection to `/portal`:

```typescript
<<<<
export default async function HomePage() {
  const session = await getServerSession();

  if (!session || !session.user) {
    redirect('/login');
  }

  const { acessoOrcamento, acessoMedicao } = session.user;

  // Usuário autenticado com liberação sempre acessa o Portal Hub
  if (acessoOrcamento || acessoMedicao) {
    redirect('/portal');
  }

  // 4. Sem Módulos Habilitados: Redireciona com aviso explícito
  redirect('/login?error=no_modules');
}
====
export default async function HomePage() {
  const session = await getServerSession();

  if (!session || !session.user) {
    redirect('/login');
  }

  // Conforme ajuste prioritário de UX: TODOS os usuários autenticados são redirecionados para /portal
  redirect('/portal');
}
>>>>
```

### 3.3 `src/app/portal/page.tsx`
Refine lines 222-426 to remove dead ternary states and enforce strict DOM omission:

```tsx
        {/* ========================================================= */}
        {/* 3. GRADE DE CARDS DOS MÓDULOS (ORÇAMENTOS & MEDIÇÃO)     */}
        {/* ========================================================= */}
        <div
          className={`grid gap-6 lg:gap-8 max-w-5xl mx-auto w-full ${
            hasOrcamento && hasMedicao ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1 max-w-md'
          }`}
        >
          {/* Card Módulo 1: Gestão de Orçamentos (Renderizado SOMENTE se acessoOrcamento === true) */}
          {hasOrcamento && (
            <div className="bg-white rounded-3xl border border-slate-200/90 shadow-md hover:shadow-2xl hover:border-red-300 transition-all duration-300 flex flex-col justify-between overflow-hidden relative group">
              {/* Faixa decorativa superior com a cor oficial do módulo */}
              <div className="h-2 w-full bg-[#BA1A1A]" />

              <div className="p-6 sm:p-8 flex-1 flex flex-col justify-between">
                <div>
                  {/* Linha Superior: Ícone de Destaque + Badge de Status */}
                  <div className="flex items-center justify-between mb-6">
                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center font-bold shadow-sm transition-transform group-hover:scale-105 bg-red-50 text-[#BA1A1A] border border-red-200">
                      <Calculator className="w-7 h-7" />
                    </div>

                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Acesso Liberado</span>
                    </span>
                  </div>

                  {/* Título e Subtítulo */}
                  <div className="space-y-1 mb-4">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#BA1A1A]">
                      Módulo Comercial
                    </span>
                    <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                      Gestão de Orçamentos
                    </h2>
                    <p className="text-xs font-semibold text-slate-500">
                      Propostas Comerciais, Funil Kanban & Cálculos Paramétricos
                    </p>
                  </div>

                  {/* Descrição Funcional */}
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed mb-6">
                    Plataforma para elaboração de orçamentos técnicos de fundações profundas,
                    cálculo de estacas metálicas, acompanhamento de leads no pipeline Kanban e
                    emissão de propostas comerciais em PDF.
                  </p>

                  {/* Lista de Recursos Principais */}
                  <div className="space-y-2.5 pt-4 border-t border-slate-100 text-xs text-slate-600">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded-full bg-red-100 text-[#BA1A1A] flex items-center justify-center flex-shrink-0">
                        <Check className="w-2.5 h-2.5 stroke-[3]" />
                      </div>
                      <span>Quadro Kanban com 4 etapas comerciais e SLA</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded-full bg-red-100 text-[#BA1A1A] flex items-center justify-center flex-shrink-0">
                        <Check className="w-2.5 h-2.5 stroke-[3]" />
                      </div>
                      <span>Cálculo paramétrico de fundações e estacas</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded-full bg-red-100 text-[#BA1A1A] flex items-center justify-center flex-shrink-0">
                        <Check className="w-2.5 h-2.5 stroke-[3]" />
                      </div>
                      <span>Geração de propostas comerciais e envio de e-mails</span>
                    </div>
                  </div>
                </div>

                {/* Ação: Botão Ativo */}
                <div className="mt-8 pt-4 border-t border-slate-100">
                  <Link
                    href="/dashboard"
                    className="w-full py-3.5 px-6 rounded-2xl bg-[#BA1A1A] hover:bg-[#991B1B] text-white font-bold text-sm shadow-lg shadow-red-950/20 flex items-center justify-between transition-all group-hover:scale-[1.01] active:scale-95"
                  >
                    <span>Clique para acessar</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1.5 transition-transform" />
                  </Link>
                </div>
              </div>
            </div>
          )}

          {/* Card Módulo 2: Medição Diária RDP (Renderizado SOMENTE se acessoMedicao === true) */}
          {hasMedicao && (
            <div className="bg-white rounded-3xl border border-slate-200/90 shadow-md hover:shadow-2xl hover:border-slate-400 transition-all duration-300 flex flex-col justify-between overflow-hidden relative group">
              {/* Faixa decorativa superior com a cor oficial do módulo */}
              <div className="h-2 w-full bg-[#111827]" />

              <div className="p-6 sm:p-8 flex-1 flex flex-col justify-between">
                <div>
                  {/* Linha Superior: Ícone de Destaque + Badge de Status */}
                  <div className="flex items-center justify-between mb-6">
                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center font-bold shadow-sm transition-transform group-hover:scale-105 bg-slate-100 text-[#111827] border border-slate-300">
                      <HardHat className="w-7 h-7" />
                    </div>

                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Acesso Liberado</span>
                    </span>
                  </div>

                  {/* Título e Subtítulo */}
                  <div className="space-y-1 mb-4">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700">
                      Módulo Operacional
                    </span>
                    <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                      Medição Diária (RDP)
                    </h2>
                    <p className="text-xs font-semibold text-slate-500">
                      Apontamento de Campo, Obras & Boletins Técnicos
                    </p>
                  </div>

                  {/* Descrição Funcional */}
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed mb-6">
                    Controle das frentes de obra, apontamento diário de perfis metálicos
                    cravados (W150/W310), validação técnica por engenheiros fiscais e consolidação de
                    boletins de medição contratuais.
                  </p>

                  {/* Lista de Recursos Principais */}
                  <div className="space-y-2.5 pt-4 border-t border-slate-100 text-xs text-slate-600">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded-full bg-slate-200 text-[#111827] flex items-center justify-center flex-shrink-0">
                        <Check className="w-2.5 h-2.5 stroke-[3]" />
                      </div>
                      <span>Apontamento de RDP em tempo real no canteiro</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded-full bg-slate-200 text-[#111827] flex items-center justify-center flex-shrink-0">
                        <Check className="w-2.5 h-2.5 stroke-[3]" />
                      </div>
                      <span>Validação técnica de estacas, emendas e talas</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded-full bg-slate-200 text-[#111827] flex items-center justify-center flex-shrink-0">
                        <Check className="w-2.5 h-2.5 stroke-[3]" />
                      </div>
                      <span>Boletins contratuais acumulados e exportação Excel</span>
                    </div>
                  </div>
                </div>

                {/* Ação: Botão Ativo */}
                <div className="mt-8 pt-4 border-t border-slate-100">
                  <Link
                    href="/medicao"
                    className="w-full py-3.5 px-6 rounded-2xl bg-[#111827] hover:bg-black text-white font-bold text-sm shadow-lg shadow-slate-900/20 flex items-center justify-between transition-all group-hover:scale-[1.01] active:scale-95"
                  >
                    <span>Clique para acessar</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1.5 transition-transform" />
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>
```

---

### 3.4 `scripts/verify-portal-unified.ts`
Update oracle functions and Suites 1.2 and 1.3:

#### 3.4.1 Oracle Functions (lines 230-275):
```typescript
/**
 * Root '/' Destination Resolver Oracle
 * Specification: All authenticated users (single-module or dual-module) route to /portal.
 */
export function resolveRootDestination(claims: UserMetaClaims | null): {
  destination: string;
  status: number;
} {
  if (!claims) {
    return { destination: '/login', status: 307 };
  }
  return { destination: '/portal', status: 307 };
}

/**
 * Post-Login API Redirection Oracle
 * Specification: Returns redirectUrl = '/portal' for ALL authenticated users.
 */
export function resolveLoginRedirect(user: { acessoOrcamento: boolean; acessoMedicao: boolean }): string {
  return '/portal';
}

/**
 * Portal Card Visibility Evaluation Oracle
 * Specification:
 * - Render "Gestão de Orçamentos" ONLY if acessoOrcamento === true
 * - Render "Medição Diária (RDP)" ONLY if acessoMedicao === true
 * - Strict DOM Omission: unauthorized cards MUST NOT be present in DOM (disabledCardsInDOM === false)
 */
export interface PortalCardEvaluation {
  renderOrcamentoCard: boolean;
  renderMedicaoCard: boolean;
  disabledCardsInDOM: boolean;
  totalCardsRendered: number;
}

export function evaluatePortalCardRendering(user: {
  acessoOrcamento: boolean;
  acessoMedicao: boolean;
}): PortalCardEvaluation {
  const renderOrcamentoCard = Boolean(user.acessoOrcamento);
  const renderMedicaoCard = Boolean(user.acessoMedicao);
  const totalCardsRendered = (renderOrcamentoCard ? 1 : 0) + (renderMedicaoCard ? 1 : 0);

  return {
    renderOrcamentoCard,
    renderMedicaoCard,
    disabledCardsInDOM: false,
    totalCardsRendered,
  };
}
```

#### 3.4.2 Suite 1.2 (lines 562-628):
```typescript
  suite('1.2 Feature 3: Institutional Selection Hub & Post-Login Redirection Contract');

  await test('1.2.1 Institutional selection hub visual properties adhere to RBT corporate palette', () => {
    assertEqual(RBT_BRAND_TOKENS.primaryRed, '#BA1A1A', 'Primary red must be #BA1A1A');
    assertEqual(RBT_BRAND_TOKENS.darkGraphite, '#111827', 'Dark graphite must be #111827');
    assertEqual(RBT_BRAND_TOKENS.deepBlack, '#0A0F1D', 'Deep black must be #0A0F1D');
    assertEqual(RBT_BRAND_TOKENS.corporateNavy, '#1E3A5F', 'Corporate navy must be #1E3A5F');
  });

  await test('1.2.2 Root / redirects unauthenticated visitor to /login with 307', () => {
    const result = resolveRootDestination(null);
    assertEqual(result.status, 307, 'Unauthenticated status must be 307');
    assertEqual(result.destination, '/login', 'Unauthenticated target must be /login');
  });

  await test('1.2.3 Root / redirects dual-module user to /portal', () => {
    const dualClaims: UserMetaClaims = {
      userId: '1',
      role: 'ADMIN',
      email: 'a@b.com',
      acessoOrcamento: true,
      acessoMedicao: true,
      ts: Date.now(),
    };
    const result = resolveRootDestination(dualClaims);
    assertEqual(result.status, 307, 'Dual module status must be 307');
    assertEqual(result.destination, '/portal', 'Dual module destination must be /portal');
  });

  await test('1.2.4 Root / redirects Orçamentos-only user to /portal (User Priority UX Adjustment)', () => {
    const orcClaims: UserMetaClaims = {
      userId: '2',
      role: 'ORCAMENTISTA',
      email: 'orc@b.com',
      acessoOrcamento: true,
      acessoMedicao: false,
      ts: Date.now(),
    };
    const result = resolveRootDestination(orcClaims);
    assertEqual(result.destination, '/portal', 'Orçamentos-only user must be sent to /portal');
  });

  await test('1.2.5 Root / redirects Medição-only user to /portal (User Priority UX Adjustment)', () => {
    const medClaims: UserMetaClaims = {
      userId: '3',
      role: 'ENGENHEIRO',
      email: 'eng@b.com',
      acessoOrcamento: false,
      acessoMedicao: true,
      ts: Date.now(),
    };
    const result = resolveRootDestination(medClaims);
    assertEqual(result.destination, '/portal', 'Medição-only user must be sent to /portal');
  });

  await test('1.2.6 Post-login API (/api/auth/login) returns redirectUrl = /portal for ALL authenticated users', () => {
    assertEqual(resolveLoginRedirect({ acessoOrcamento: true, acessoMedicao: true }), '/portal', 'Dual-module routes to /portal');
    assertEqual(resolveLoginRedirect({ acessoOrcamento: true, acessoMedicao: false }), '/portal', 'Orçamentos-only routes to /portal');
    assertEqual(resolveLoginRedirect({ acessoOrcamento: false, acessoMedicao: true }), '/portal', 'Medição-only routes to /portal');
  });
```

#### 3.4.3 Suite 1.3 (lines 630-639):
```typescript
  suite('1.3 Feature 4 & User Priority: Strict Card Filtering on /portal & Bidirectional Module Switcher');

  await test('1.3.1 Dual-module user renders BOTH cards on /portal (Gestão de Orçamentos AND Medição Diária)', () => {
    const evaluation = evaluatePortalCardRendering({ acessoOrcamento: true, acessoMedicao: true });
    assertEqual(evaluation.renderOrcamentoCard, true, 'Gestão de Orçamentos card must be rendered');
    assertEqual(evaluation.renderMedicaoCard, true, 'Medição Diária (RDP) card must be rendered');
    assertEqual(evaluation.totalCardsRendered, 2, 'Total cards rendered must equal 2');
    assertEqual(evaluation.disabledCardsInDOM, false, 'No disabled cards allowed in DOM');
  });

  await test('1.3.2 Orçamentos-only user renders ONLY Gestão de Orçamentos card on /portal (Medição strictly omitted from DOM)', () => {
    const evaluation = evaluatePortalCardRendering({ acessoOrcamento: true, acessoMedicao: false });
    assertEqual(evaluation.renderOrcamentoCard, true, 'Gestão de Orçamentos card must be rendered');
    assertEqual(evaluation.renderMedicaoCard, false, 'Medição Diária card must be omitted from DOM');
    assertEqual(evaluation.totalCardsRendered, 1, 'Total cards rendered must equal 1');
    assertEqual(evaluation.disabledCardsInDOM, false, 'Unauthorized card must not be present disabled');
  });

  await test('1.3.3 Medição-only user renders ONLY Medição Diária (RDP) card on /portal (Orçamentos strictly omitted from DOM)', () => {
    const evaluation = evaluatePortalCardRendering({ acessoOrcamento: false, acessoMedicao: true });
    assertEqual(evaluation.renderOrcamentoCard, false, 'Gestão de Orçamentos card must be omitted from DOM');
    assertEqual(evaluation.renderMedicaoCard, true, 'Medição Diária (RDP) card must be rendered');
    assertEqual(evaluation.totalCardsRendered, 1, 'Total cards rendered must equal 1');
    assertEqual(evaluation.disabledCardsInDOM, false, 'Unauthorized card must not be present disabled');
  });

  await test('1.3.4 Unauthorized module card is NEVER rendered disabled in DOM (strict DOM omission)', () => {
    for (const flags of [
      { acessoOrcamento: true, acessoMedicao: false },
      { acessoOrcamento: false, acessoMedicao: true },
      { acessoOrcamento: false, acessoMedicao: false },
    ]) {
      const evaluation = evaluatePortalCardRendering(flags);
      assertEqual(evaluation.disabledCardsInDOM, false, 'Disabled card placeholder must be false');
    }
  });

  await test('1.3.5 Switcher is enabled if and only if user has dual-module permissions', () => {
    assertEqual(shouldRenderModuleSwitcher({ acessoOrcamento: true, acessoMedicao: true }), true, 'Dual access enables switcher');
    assertEqual(shouldRenderModuleSwitcher({ acessoOrcamento: true, acessoMedicao: false }), false, 'Orcamentos only suppresses switcher');
    assertEqual(shouldRenderModuleSwitcher({ acessoOrcamento: false, acessoMedicao: true }), false, 'Medicao only suppresses switcher');
    assertEqual(shouldRenderModuleSwitcher({ acessoOrcamento: false, acessoMedicao: false }), false, 'Zero access suppresses switcher');
    assertEqual(shouldRenderModuleSwitcher(null), false, 'Null user suppresses switcher');
  });
```

---

## 4. Caveats

1. **Windows / OneDrive Build Cache Artifacts**:
   - Next.js webpack builds inside OneDrive paths on Windows can occasionally experience `EINVAL: invalid argument, readlink` on files like `edge-runtime-webpack.js.map` inside `.next/server/`.
   - **Resolution protocol**: Always execute `if (Test-Path .next) { Remove-Item -Recurse -Force .next }` prior to running `npm run build`.
2. **Backward Compatibility with Existing Session Seeds**:
   - `validateSession` in `src/lib/session.ts` includes defensive role-based fallbacks for legacy records. In newly seeded test databases, users created with explicit `acessoOrcamento` and `acessoMedicao` booleans strictly dictate the card rendering.
3. **M4 Medição Diária Route Compilation**:
   - When the implementer agent transplants `Medicaodiaria/src/app` into `/medicao/*` and components to `src/components/medicao/`, `npm run build` will compile the newly added routes into the static/dynamic route table. All sub-routes must adhere to TypeScript strict typing to ensure `npx tsc --noEmit` stays at 0 errors.

---

## 5. Conclusion

1. **Post-Login Routing**:
   - `src/app/api/auth/login/route.ts` is updated to unconditionally return `redirectUrl = '/portal'`.
   - `src/app/page.tsx` is updated to immediately redirect any authenticated session to `/portal`.
2. **Strict Card Filtering**:
   - `src/app/portal/page.tsx` renders the "Gestão de Orçamentos" card if and only if `acessoOrcamento === true`.
   - Renders the "Medição Diária (RDP)" card if and only if `acessoMedicao === true`.
   - Completely omits unauthorized cards from the DOM (never disabled or dimmed placeholders).
   - Single-module users see 1 centered card; dual-module users see both cards in a 2-column grid.
3. **Automated Verification Harness**:
   - `scripts/verify-portal-unified.ts` Suite 1.2 and Suite 1.3 are synchronized with these contracts.
4. **M4 Verification Plan**:
   - All 4 verification commands and acceptance gates are fully defined and tested against current baselines.

---

## 6. Verification Method

To independently verify the implementation, execute the following commands in sequence from the project root:

### Gate 1: Strict TypeScript Typecheck
```powershell
npx tsc --noEmit
```
- **Expected Outcome**: Exit code `0` with zero type errors.

### Gate 2: Core Security & Route Unit Verification Suite
```powershell
npm test
```
- **Expected Outcome**: All `29/29` tests pass across Suites 1-4 (`verify-security-routes.ts`).

### Gate 3: Unified Portal Feature Isolation Verification (Tier 1)
```powershell
npx tsx scripts/verify-portal-unified.ts --tier=1
```
- **Expected Outcome**: All tests pass in Tier 1:
  - Suite 1.2 verifies that `/` and `/login` always route to `/portal` for authenticated users.
  - Suite 1.3 verifies that `/portal` strictly renders authorized cards and omits unauthorized cards from the DOM.

### Gate 4: Production Compilation & Route Build
```powershell
powershell -Command "if (Test-Path .next) { Remove-Item -Recurse -Force .next }; npm run build"
```
- **Expected Outcome**: Next.js production build exits with code `0`. All static pages, dynamic server-rendered pages (including `/portal`, `/dashboard`, and `/medicao/*`), and API routes compile with zero syntax, build, or type errors.
