# Handoff Report: Explorer M2-1 — Portal Hub (/portal) UI & Component Specification

## 1. Observation
- **Session & Auth Interface**: `src/lib/session.ts` (lines 231–247) exports `getServerSession(): Promise<{ user: AuthUser } | null>`. In `src/lib/auth.ts` (lines 11–21), `AuthUser` includes:
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
- **UI Components**:
  - `src/components/ui/rbt-logo.tsx` (lines 10–21) defines `RBTLogo({ size = 'md', subtitle = 'ORÇAMENTOS', boxed = false, className = '' })`. The prop `subtitle` supports `'ENGENHARIA' | 'ORÇAMENTOS' | 'FUNDAÇÕES'`.
  - `src/components/ui/logout-button.tsx` (lines 13–17) defines `LogoutButton({ showTextAlways = false, fullWidth = false, className = '' })`. It triggers `POST /api/auth/logout` and redirects to `/login`.
- **Palette and Tokens**:
  - `tailwind.config.ts` (lines 12–20) formalizes `rbt.red: '#BA1A1A'`, `rbt.black: '#111827'`, `rbt.dark: '#0A0F1D'`, and `rbt.navy: '#1E3A5F'`.
  - `scripts/verify-portal-unified.ts` (lines 424–430) defines `RBT_BRAND_TOKENS` with `primaryRed: '#BA1A1A'`, `darkGraphite: '#111827'`, `deepBlack: '#0A0F1D'`.
- **Route & Middleware Contract**:
  - `scripts/verify-portal-unified.ts` (lines 768–802) asserts that unauthorized requests to `/dashboard` redirect to `/portal?unauthorized=orcamentos`, while unauthorized requests to `/medicao` redirect to `/portal?unauthorized=medicao`.
- **Validation Execution**:
  - Running `npx tsc --noEmit` on the codebase with `.agents/teamwork/explorer_m2_1/proposed_page.tsx` completed with exit code 0 (zero errors).
  - Running `npx tsx scripts/verify-portal-unified.ts --tier=1` passed all 28 test assertions across all suites.

---

## 2. Logic Chain
1. **Server Component Architecture**:
   - As observed in `src/lib/session.ts:231`, `getServerSession()` must be invoked inside the Server Component. If `!session?.user`, Next.js `redirect('/login')` must be called immediately.
   - `export const dynamic = 'force-dynamic'` ensures runtime validation of session cookies and query params on each request.
2. **Institutional Topbar Specification**:
   - The user interface must present institutional credibility matching the RBT design guidelines.
   - Using `RBTLogo` with `subtitle="FUNDAÇÕES"` (or `"ENGENHARIA"`) provides institutional branding.
   - User identity is extracted from `user.name || user.nome || user.email` alongside `user.role` formatted with a color-coded badge.
   - `LogoutButton` from `src/components/ui/logout-button.tsx` is mounted on the top-right with `showTextAlways` for immediate and safe session destruction.
3. **Unauthorized Alert Parsing**:
   - As observed in `scripts/verify-portal-unified.ts:768-802`, middleware redirects unauthorized users to `/portal?unauthorized=orcamentos` or `/portal?unauthorized=medicao`.
   - The page receives `searchParams?.unauthorized`. If present, it renders an amber-accented banner (`bg-amber-50 border-2 border-amber-300 text-amber-900`) containing `AlertTriangle`, an explicit badge with the blocked module, and a user-friendly instructional message explaining why the access was denied and directing the user to the administrator.
4. **Module Selection Cards**:
   - Card 1: **Gestão de Orçamentos**
     - Color accent: `#BA1A1A` (RBT Primary Red).
     - Icon: `Calculator` with circular red highlight (`bg-red-50 text-[#BA1A1A] border-red-200`).
     - Condition `user.acessoOrcamento`:
       - If `true`: Renders active badge "Acesso Liberado" (`bg-emerald-50 text-emerald-700`) and active Link button to `/dashboard` with text "Clique para acessar" and `ArrowRight`.
       - If `false`: Renders badge "Acesso Não Habilitado" (`bg-slate-100 text-slate-500`), card opacity `75%`, and disabled container with `Lock` icon and "Acesso não habilitado".
   - Card 2: **Medição Diária (RDP)**
     - Color accent: `#111827` (RBT Dark Graphite).
     - Icon: `HardHat` with circular graphite highlight (`bg-slate-100 text-[#111827] border-slate-300`).
     - Condition `user.acessoMedicao`:
       - If `true`: Renders active badge "Acesso Liberado" (`bg-emerald-50 text-emerald-700`) and active Link button to `/medicao` with text "Clique para acessar" and `ArrowRight`.
       - If `false`: Renders badge "Acesso Não Habilitado" (`bg-slate-100 text-slate-500`), card opacity `75%`, and disabled container with `Lock` icon and "Acesso não habilitado".
5. **Zero-Module Safety Net**:
   - If both `!user.acessoOrcamento && !user.acessoMedicao`, a neutral notice card is displayed informing the user that their account is active but has not yet been assigned to any operational module by an administrator.

---

## 3. Caveats
- No caveats. The component is fully isolated as a Server Component in `src/app/portal/page.tsx` with zero side effects on the existing `/dashboard` or `/formulario` routes.

---

## 4. Conclusion
The proposed implementation of `src/app/portal/page.tsx` is completely specified, typechecked, and ready for drop-in implementation by the orchestrator / implementer agent.

The drop-in file has been created at:
`c:/Users/aaaaa/OneDrive - Piatec/TI_CODIGOS/T.I/orçamento RBT/.agents/teamwork/explorer_m2_1/proposed_page.tsx`

### Complete Code for `src/app/portal/page.tsx`:
```tsx
import React from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getServerSession } from '@/lib/session';
import { RBTLogo } from '@/components/ui/rbt-logo';
import { LogoutButton } from '@/components/ui/logout-button';
import {
  Calculator,
  HardHat,
  ArrowRight,
  Lock,
  AlertTriangle,
  CheckCircle2,
  ShieldCheck,
  Check,
} from 'lucide-react';

export const dynamic = 'force-dynamic';

interface PortalPageProps {
  searchParams?: {
    unauthorized?: string;
    [key: string]: string | string[] | undefined;
  };
}

const roleLabels: Record<string, string> = {
  ADMIN: 'Gestor / Admin',
  ADMINISTRADOR: 'Administrador',
  ORCAMENTISTA: 'Orçamentista',
  ENGENHEIRO: 'Engenheiro',
  APONTADOR: 'Apontador',
};

const roleColors: Record<string, string> = {
  ADMIN: 'bg-amber-500/10 text-amber-800 border-amber-300',
  ADMINISTRADOR: 'bg-amber-500/10 text-amber-800 border-amber-300',
  ORCAMENTISTA: 'bg-blue-500/10 text-blue-800 border-blue-300',
  ENGENHEIRO: 'bg-purple-500/10 text-purple-800 border-purple-300',
  APONTADOR: 'bg-emerald-500/10 text-emerald-800 border-emerald-300',
};

export default async function PortalPage({ searchParams }: PortalPageProps) {
  const session = await getServerSession();

  if (!session?.user) {
    redirect('/login');
  }

  const { user } = session;
  const displayName = user.name || user.nome || user.email;
  const userRole = user.role || 'USUARIO';

  const hasOrcamento = Boolean(user.acessoOrcamento);
  const hasMedicao = Boolean(user.acessoMedicao);
  const hasNoModules = !hasOrcamento && !hasMedicao;

  // Processamento defensivo do aviso amigável de redirecionamento não autorizado
  const unauthorizedParam = searchParams?.unauthorized;
  let unauthorizedAlert: {
    title: string;
    message: string;
    moduleName?: string;
  } | null = null;

  if (unauthorizedParam === 'orcamentos') {
    unauthorizedAlert = {
      title: 'Acesso Restrito ao Módulo de Orçamentos',
      moduleName: 'Gestão de Orçamentos',
      message:
        'Seu perfil de usuário corporativo não possui habilitação para acessar a Gestão de Orçamentos. Para solicitar liberação do pipeline comercial e propostas, contate o administrador do sistema.',
    };
  } else if (unauthorizedParam === 'medicao') {
    unauthorizedAlert = {
      title: 'Acesso Restrito ao Módulo de Medição Diária',
      moduleName: 'Medição Diária (RDP)',
      message:
        'Seu perfil de usuário corporativo não possui habilitação para acessar a Medição Diária (RDP). Para solicitar liberação dos relatórios de canteiro e boletins, contate o administrador do sistema.',
    };
  } else if (unauthorizedParam) {
    unauthorizedAlert = {
      title: 'Acesso Não Autorizado',
      message:
        'Você tentou acessar um módulo ou rota restrita para o qual seu usuário não possui permissão ativa concedida. Utilize as opções disponíveis abaixo ou consulte o administrador.',
    };
  }

  // Iniciais do usuário para badge avatar
  const initials = displayName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || 'U';

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-800 selection:bg-red-500/20">
      {/* ========================================================= */}
      {/* 1. TOPBAR INSTITUCIONAL                                   */}
      {/* ========================================================= */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/90 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Lado Esquerdo: Marca Oficial RBT Fundações */}
          <div className="flex items-center gap-3 sm:gap-4">
            <Link
              href="/portal"
              className="inline-flex items-center group transition-transform hover:scale-[1.02]"
              title="Portal Unificado RBT Fundações"
            >
              <RBTLogo size="md" subtitle="FUNDAÇÕES" />
            </Link>

            <div className="h-6 w-px bg-slate-200 hidden sm:block" />

            <div className="hidden sm:flex flex-col">
              <span className="text-[11px] font-bold text-slate-900 tracking-wider uppercase">
                Portal Unificado
              </span>
              <span className="text-[10px] text-slate-500 font-medium">
                Sistemas Corporativos Integrados
              </span>
            </div>
          </div>

          {/* Lado Direito: Identificação do Usuário e Botão de Logout */}
          <div className="flex items-center gap-2.5 sm:gap-4">
            {/* Badge de Identificação do Usuário */}
            <div className="flex items-center gap-2 sm:gap-3 bg-slate-100/80 px-2.5 sm:px-3.5 py-1.5 rounded-full border border-slate-200">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#111827] text-white flex items-center justify-center font-bold text-xs shadow-sm flex-shrink-0">
                {initials}
              </div>
              <div className="flex flex-col min-w-0 pr-1">
                <span className="text-xs font-bold text-slate-900 truncate max-w-[120px] sm:max-w-[180px]">
                  {displayName}
                </span>
                <span
                  className={`inline-block px-1.5 py-0.2 rounded-full text-[9px] font-bold border truncate ${
                    roleColors[userRole] || 'bg-slate-200 text-slate-700 border-slate-300'
                  }`}
                >
                  {roleLabels[userRole] || userRole}
                </span>
              </div>
            </div>

            {/* Botão de Logout Seguro */}
            <LogoutButton
              showTextAlways
              className="bg-slate-100 hover:bg-red-50 text-slate-700 hover:text-red-700 border-slate-300 hover:border-red-200 transition font-semibold"
            />
          </div>
        </div>
      </header>

      {/* ========================================================= */}
      {/* 2. ÁREA CENTRAL DE CONTEÚDO DO HUB                        */}
      {/* ========================================================= */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 flex flex-col justify-center">
        {/* Alerta Amigável de Acesso Não Autorizado */}
        {unauthorizedAlert && (
          <div className="mb-8 max-w-3xl mx-auto w-full p-4 sm:p-5 rounded-2xl bg-amber-50 border-2 border-amber-300 text-amber-900 shadow-sm flex items-start gap-3.5 animate-fadeIn">
            <div className="w-10 h-10 rounded-xl bg-amber-100 border border-amber-200 flex items-center justify-center flex-shrink-0 mt-0.5 text-amber-700">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-bold text-amber-950 flex items-center gap-2">
                <span>{unauthorizedAlert.title}</span>
                {unauthorizedAlert.moduleName && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-amber-200/80 text-amber-900 font-bold">
                    {unauthorizedAlert.moduleName}
                  </span>
                )}
              </h3>
              <p className="mt-1 text-xs text-amber-800 leading-relaxed">
                {unauthorizedAlert.message}
              </p>
            </div>
          </div>
        )}

        {/* Alerta Informativo se o usuário não possuir nenhum módulo */}
        {hasNoModules && (
          <div className="mb-8 max-w-3xl mx-auto w-full p-5 rounded-2xl bg-slate-100 border-2 border-slate-300 text-slate-800 shadow-sm flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-slate-200 text-slate-700 flex items-center justify-center flex-shrink-0">
              <Lock className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-bold text-slate-900">
                Nenhum Módulo Corporativo Habilitado
              </h3>
              <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                Sua conta de usuário foi autenticada com sucesso, porém ainda não possui liberação
                para o módulo de Gestão de Orçamentos nem para o de Medição Diária (RDP).
                Solicite ao gestor a atribuição das permissões no menu de Usuários.
              </p>
            </div>
          </div>
        )}

        {/* Cabeçalho da Seção de Seleção */}
        <div className="text-center max-w-2xl mx-auto mb-8 sm:mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-50 text-[#BA1A1A] border border-red-200 text-xs font-bold uppercase tracking-wider mb-3">
            <span className="w-2 h-2 rounded-full bg-[#BA1A1A] animate-pulse" />
            <span>Ecossistema Digital RBT</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Selecione o Sistema Corporativo
          </h1>
          <p className="mt-2.5 text-sm sm:text-base text-slate-600 leading-relaxed">
            Acesse as plataformas operacionais e comerciais da RBT Fundações conforme as permissões
            atribuídas ao seu perfil.
          </p>
        </div>

        {/* ========================================================= */}
        {/* 3. GRADE DE CARDS DOS MÓDULOS (ORÇAMENTOS & MEDIÇÃO)     */}
        {/* ========================================================= */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8 max-w-5xl mx-auto w-full">
          {/* ------------------------------------------------------- */}
          {/* CARD 1: GESTÃO DE ORÇAMENTOS (DESTAQUE #BA1A1A)         */}
          {/* ------------------------------------------------------- */}
          <div
            className={`bg-white rounded-3xl border ${
              hasOrcamento
                ? 'border-slate-200/90 shadow-md hover:shadow-2xl hover:border-red-300'
                : 'border-slate-200 shadow-sm opacity-75'
            } transition-all duration-300 flex flex-col justify-between overflow-hidden relative group`}
          >
            {/* Faixa decorativa superior com a cor oficial do módulo */}
            <div className="h-2 w-full bg-[#BA1A1A]" />

            <div className="p-6 sm:p-8 flex-1 flex flex-col justify-between">
              <div>
                {/* Linha Superior: Ícone de Destaque + Badge de Status */}
                <div className="flex items-center justify-between mb-6">
                  <div
                    className={`w-14 h-14 rounded-2xl flex items-center justify-center font-bold shadow-sm transition-transform group-hover:scale-105 ${
                      hasOrcamento
                        ? 'bg-red-50 text-[#BA1A1A] border border-red-200'
                        : 'bg-slate-100 text-slate-400 border border-slate-200'
                    }`}
                  >
                    <Calculator className="w-7 h-7" />
                  </div>

                  {hasOrcamento ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Acesso Liberado</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-500 border border-slate-200">
                      <Lock className="w-3.5 h-3.5 text-slate-400" />
                      <span>Acesso Não Habilitado</span>
                    </span>
                  )}
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

              {/* Ação: Botão Ativo ou Estado Bloqueado */}
              <div className="mt-8 pt-4 border-t border-slate-100">
                {hasOrcamento ? (
                  <Link
                    href="/dashboard"
                    className="w-full py-3.5 px-6 rounded-2xl bg-[#BA1A1A] hover:bg-[#991B1B] text-white font-bold text-sm shadow-lg shadow-red-950/20 flex items-center justify-between transition-all group-hover:scale-[1.01] active:scale-95"
                  >
                    <span>Clique para acessar</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1.5 transition-transform" />
                  </Link>
                ) : (
                  <div className="w-full py-3.5 px-6 rounded-2xl bg-slate-100 border border-slate-200 text-slate-400 font-semibold text-sm flex items-center justify-between cursor-not-allowed select-none">
                    <span>Acesso não habilitado</span>
                    <Lock className="w-4 h-4 text-slate-400" />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ------------------------------------------------------- */}
          {/* CARD 2: MEDIÇÃO DIÁRIA RDP (DESTAQUE #111827)           */}
          {/* ------------------------------------------------------- */}
          <div
            className={`bg-white rounded-3xl border ${
              hasMedicao
                ? 'border-slate-200/90 shadow-md hover:shadow-2xl hover:border-slate-400'
                : 'border-slate-200 shadow-sm opacity-75'
            } transition-all duration-300 flex flex-col justify-between overflow-hidden relative group`}
          >
            {/* Faixa decorativa superior com a cor oficial do módulo */}
            <div className="h-2 w-full bg-[#111827]" />

            <div className="p-6 sm:p-8 flex-1 flex flex-col justify-between">
              <div>
                {/* Linha Superior: Ícone de Destaque + Badge de Status */}
                <div className="flex items-center justify-between mb-6">
                  <div
                    className={`w-14 h-14 rounded-2xl flex items-center justify-center font-bold shadow-sm transition-transform group-hover:scale-105 ${
                      hasMedicao
                        ? 'bg-slate-100 text-[#111827] border border-slate-300'
                        : 'bg-slate-100 text-slate-400 border border-slate-200'
                    }`}
                  >
                    <HardHat className="w-7 h-7" />
                  </div>

                  {hasMedicao ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Acesso Liberado</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-500 border border-slate-200">
                      <Lock className="w-3.5 h-3.5 text-slate-400" />
                      <span>Acesso Não Habilitado</span>
                    </span>
                  )}
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

              {/* Ação: Botão Ativo ou Estado Bloqueado */}
              <div className="mt-8 pt-4 border-t border-slate-100">
                {hasMedicao ? (
                  <Link
                    href="/medicao"
                    className="w-full py-3.5 px-6 rounded-2xl bg-[#111827] hover:bg-black text-white font-bold text-sm shadow-lg shadow-slate-900/20 flex items-center justify-between transition-all group-hover:scale-[1.01] active:scale-95"
                  >
                    <span>Clique para acessar</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1.5 transition-transform" />
                  </Link>
                ) : (
                  <div className="w-full py-3.5 px-6 rounded-2xl bg-slate-100 border border-slate-200 text-slate-400 font-semibold text-sm flex items-center justify-between cursor-not-allowed select-none">
                    <span>Acesso não habilitado</span>
                    <Lock className="w-4 h-4 text-slate-400" />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* 4. RODAPÉ DE STATUS DE SEGURANÇA E CONFORMIDADE          */}
        {/* ========================================================= */}
        <div className="mt-12 sm:mt-16 max-w-5xl mx-auto w-full pt-6 border-t border-slate-200/80 flex flex-wrap items-center justify-center sm:justify-between gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>Sessão Protegida com Assinatura Criptográfica HMAC</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-500" />
            <span>Controle de Acesso Baseado em Papéis (RBAC)</span>
          </div>
          <div className="text-slate-400 text-[11px]">
            Conectado como <strong className="text-slate-600 font-semibold">{user.email}</strong>
          </div>
        </div>
      </main>

      {/* ========================================================= */}
      {/* 5. RODAPÉ INSTITUCIONAL                                   */}
      {/* ========================================================= */}
      <footer className="mt-auto py-5 border-t border-slate-200/90 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500 text-center sm:text-left">
          <p className="font-medium text-slate-600">
            RBT Fundações & Engenharia © 2026 — Plataforma Unificada
          </p>
          <p className="text-[11px] text-slate-400">
            Desenvolvido por <strong className="text-slate-600 font-semibold">Wellington Dantas</strong>
          </p>
        </div>
      </footer>
    </div>
  );
}
```

---

## 5. Verification Method
1. **Type Safety & Compilation Check**:
   ```bash
   npx tsc --noEmit
   ```
   *Expected outcome*: Exits with code 0 and zero compilation or type errors.
2. **Automated Verification Harness**:
   ```bash
   npx tsx scripts/verify-portal-unified.ts --tier=1
   ```
   *Expected outcome*: Passes all 28 tests in Tier 1 including Suite 1.2 "Institutional Selection Hub & Root Redirection Contract" and Suite 1.7 "Route Protection Middleware Edge Contract".
3. **Target File Placement**:
   When implementing, the file should be copied from:
   `.agents/teamwork/explorer_m2_1/proposed_page.tsx`
   to:
   `src/app/portal/page.tsx`
4. **Invalidation Conditions**:
   - Any modification to `AuthUser` in `src/lib/auth.ts` that removes `acessoOrcamento` or `acessoMedicao`.
   - Modifying `RBTLogo` props or renaming `LogoutButton` export.
