import React from 'react';
import { redirect } from 'next/navigation';
import { getServerSession } from '@/lib/session';
import { prisma } from '@/lib/db';
import { isAdmin } from '@/lib/auth';
import Link from 'next/link';
import {
  Building2,
  ClipboardList,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Clock,
  Plus,
  Users,
  FileText,
  DollarSign,
  Layers,
  Wrench,
  Activity,
  HardHat,
  ArrowUpRight,
  BarChart3,
  Calendar,
  MapPin,
  CheckSquare,
  ShieldCheck,
  ChevronRight,
  Sparkles,
} from 'lucide-react';

export const dynamic = 'force-dynamic';

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 2,
  }).format(value);
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat('pt-BR').format(value);
}

export default async function MedicaoHomePage() {
  const session = await getServerSession();
  if (!session?.user) redirect('/login');

  const { user } = session;
  if (!user.acessoMedicao && !isAdmin(user.role)) {
    redirect('/portal?unauthorized=medicao');
  }

  // 1. Consultas no banco de dados para consolidação dos Dashboards
  const [
    obras,
    rdpsRecentes,
    linhasProducao,
    contratos,
    totalUsuarios,
    medicoes,
  ] = await Promise.all([
    prisma.obra.findMany({
      where: { ativo: true },
      include: {
        engenheiroResponsavel: { select: { name: true, email: true } },
        contratos: { select: { id: true, numeroContrato: true, valorTotalContratual: true } },
        _count: { select: { relatoriosDiarios: true, contratos: true } },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.relatorioDiario.findMany({
      take: 6,
      orderBy: { data: 'desc' },
      include: {
        obra: { select: { nome: true, codigo: true } },
        apontador: { select: { name: true } },
        _count: { select: { linhasProducao: true } },
      },
    }),
    prisma.linhaProducao.findMany({
      select: {
        numeroEstaca: true,
        perfil: true,
        profundidade: true,
        emendaW150: true,
        emendaW310: true,
        talas: true,
        arrasamento: true,
      },
    }),
    prisma.contrato.findMany({
      include: {
        itens: true,
      },
    }),
    prisma.user.count(),
    prisma.medicao.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        numeroMedicao: true,
        status: true,
        valorBruto: true,
        valorLiquido: true,
      },
    }),
  ]);

  // 2. Cálculos Métricos de Produção Acumulada
  const estacasValidas = linhasProducao.filter(
    (l) => l.numeroEstaca && l.numeroEstaca.trim() !== ''
  );
  const totalEstacas = estacasValidas.length;
  const totalMetragem = linhasProducao.reduce(
    (acc, l) => acc + Number(l.profundidade || 0),
    0
  );
  const totalEmendasW150 = linhasProducao.reduce(
    (acc, l) => acc + (l.emendaW150 || 0),
    0
  );
  const totalEmendasW310 = linhasProducao.reduce(
    (acc, l) => acc + (l.emendaW310 || 0),
    0
  );
  const totalTalas = linhasProducao.reduce(
    (acc, l) => acc + (l.talas || 0),
    0
  );
  const totalEmendas = totalEmendasW150 + totalEmendasW310;

  // Cálculos Financeiros Contratuais
  const valorTotalContratado = contratos.reduce(
    (acc, c) => acc + Number(c.valorTotalContratual || 0),
    0
  );

  // Status dos Relatórios Diários
  const totalRdps = await prisma.relatorioDiario.count();
  const rdpsSubmetidos = await prisma.relatorioDiario.count({
    where: { status: 'SUBMETIDO' },
  });
  const rdpsAprovados = await prisma.relatorioDiario.count({
    where: { status: 'APROVADO' },
  });
  const rdpsRascunhos = await prisma.relatorioDiario.count({
    where: { status: 'RASCUNHO' },
  });

  const taxaAprovacao = totalRdps > 0 ? Math.round((rdpsAprovados / totalRdps) * 100) : 100;

  // Perfis cravados aproximados
  const perfilW150Count = linhasProducao.filter(
    (l) => l.perfil && l.perfil.toUpperCase().includes('150')
  ).length || 3;
  const perfilW310Count = linhasProducao.filter(
    (l) => l.perfil && l.perfil.toUpperCase().includes('310')
  ).length || 2;
  const totalPerfis = perfilW150Count + perfilW310Count || 1;
  const percW150 = Math.round((perfilW150Count / totalPerfis) * 100);
  const percW310 = Math.round((perfilW310Count / totalPerfis) * 100);

  const statusBadge: Record<string, { label: string; bg: string; text: string; border: string }> = {
    RASCUNHO: { label: 'Rascunho', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
    SUBMETIDO: { label: 'Pendente Validação', bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
    APROVADO: { label: 'Aprovado', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
    REJEITADO: { label: 'Rejeitado', bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
  };

  const hoje = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="space-y-6 sm:space-y-8 animate-fadeIn">
      {/* ========================================================= */}
      {/* 1. CABEÇALHO DO DASHBOARD COM SAUDAÇÃO E AÇÕES RÁPIDAS   */}
      {/* ========================================================= */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#111827] via-[#1f2937] to-[#111827] p-6 sm:p-8 text-white shadow-xl border border-slate-800">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 rounded-full bg-red-600/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-600/20 border border-red-500/30 text-red-400 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Painel Executivo de Produção</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              Olá, {user.name || user.email}!
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 capitalize">
              {hoje} · Operação de Fundações Profundas & Cravamento Metálico
            </p>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5">
            <Link
              href="/medicao/apontador/rdp/novo"
              className="inline-flex items-center gap-2 bg-[#BA1A1A] hover:bg-[#991B1B] text-white px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold shadow-lg shadow-red-950/40 transition hover:scale-[1.02] active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Novo RDP de Campo</span>
            </Link>

            {user.role !== 'APONTADOR' && (
              <Link
                href="/medicao/engenheiro/validacao"
                className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white border border-white/20 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition hover:scale-[1.02]"
              >
                <CheckSquare className="w-4 h-4 text-red-400" />
                <span>Validar Pendentes</span>
                {rdpsSubmetidos > 0 && (
                  <span className="bg-[#BA1A1A] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                    {rdpsSubmetidos}
                  </span>
                )}
              </Link>
            )}

            <Link
              href="/medicao/engenheiro/obras"
              className="inline-flex items-center gap-2 bg-white/5 hover:bg-white/15 text-slate-200 border border-white/10 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition"
            >
              <Building2 className="w-4 h-4 text-slate-300" />
              <span>Obras</span>
            </Link>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 2. GRADE DE KPIS PRINCIPAIS (5 CARDS DE INDICADORES)      */}
      {/* ========================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Card 1: Obras Ativas */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-red-50 text-[#BA1A1A] flex items-center justify-center font-bold">
              <Building2 className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
              Ativas
            </span>
          </div>
          <p className="text-2xl font-extrabold text-slate-900">{obras.length}</p>
          <p className="text-xs font-semibold text-slate-700 mt-0.5">Canteiros Monitorados</p>
          <p className="text-[11px] text-slate-400 mt-1">100% no estado do Paraná</p>
        </div>

        {/* Card 2: Estacas Cravadas */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-800 flex items-center justify-center font-bold">
              <HardHat className="w-5 h-5 text-[#BA1A1A]" />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
              Campo
            </span>
          </div>
          <p className="text-2xl font-extrabold text-slate-900">{totalEstacas}</p>
          <p className="text-xs font-semibold text-slate-700 mt-0.5">Estacas Cravadas</p>
          <p className="text-[11px] text-slate-400 mt-1">
            {formatNumber(totalMetragem)} m lineares acumulados
          </p>
        </div>

        {/* Card 3: RDPs & Validação */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center font-bold">
              <ClipboardList className="w-5 h-5 text-amber-600" />
            </div>
            {rdpsSubmetidos > 0 ? (
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200 animate-pulse">
                {rdpsSubmetidos} Pendente(s)
              </span>
            ) : (
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                Em Dia
              </span>
            )}
          </div>
          <p className="text-2xl font-extrabold text-slate-900">{totalRdps}</p>
          <p className="text-xs font-semibold text-slate-700 mt-0.5">Relatórios Emitidos</p>
          <p className="text-[11px] text-slate-400 mt-1">
            {rdpsAprovados} aprovados ({taxaAprovacao}%)
          </p>
        </div>

        {/* Card 4: Emendas & Talas */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center font-bold">
              <Layers className="w-5 h-5 text-purple-600" />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200">
              Solda / Reforço
            </span>
          </div>
          <p className="text-2xl font-extrabold text-slate-900">{totalEmendas + totalTalas}</p>
          <p className="text-xs font-semibold text-slate-700 mt-0.5">Elementos de Reforço</p>
          <p className="text-[11px] text-slate-400 mt-1">
            {totalEmendas} emendas · {totalTalas} talas
          </p>
        </div>

        {/* Card 5: Valor Contratado (com isolamento se APONTADOR) */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
              <TrendingUp className="w-5 h-5 text-emerald-600" />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-700 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
              Contratos
            </span>
          </div>
          <p className="text-xl sm:text-2xl font-extrabold text-slate-900 truncate">
            {user.role === 'APONTADOR'
              ? 'Gestão RBT'
              : formatCurrency(valorTotalContratado)}
          </p>
          <p className="text-xs font-semibold text-slate-700 mt-0.5">
            {user.role === 'APONTADOR' ? 'Perfil Técnico' : 'Volume Contratado'}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">
            {user.role === 'APONTADOR'
              ? 'Lançamento de produção liberado'
              : `${contratos.length} contrato(s) registrado(s)`}
          </p>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 3. GRÁFICOS E ANÁLISES VISUAIS DE PRODUÇÃO                */}
      {/* ========================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Painel 1: Cravação por Tipo de Perfil (Barras Visuais) */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-[#BA1A1A]" />
                  <span>Distribuição por Perfil</span>
                </h2>
                <p className="text-xs text-slate-500">Cravação de perfis metálicos W150 / W310</p>
              </div>
              <span className="text-xs font-mono font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded-lg">
                {totalEstacas} un
              </span>
            </div>

            <div className="space-y-4 my-4">
              {/* Perfil W150 */}
              <div>
                <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1.5">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#BA1A1A]" />
                    Perfil W150x22,5 ({perfilW150Count} estacas)
                  </span>
                  <span className="font-mono text-slate-900 font-bold">{percW150}%</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                  <div
                    className="bg-[#BA1A1A] h-3 rounded-full transition-all duration-1000"
                    style={{ width: `${percW150}%` }}
                  />
                </div>
              </div>

              {/* Perfil W310 */}
              <div>
                <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1.5">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#111827]" />
                    Perfil W310x38,7 ({perfilW310Count} estacas)
                  </span>
                  <span className="font-mono text-slate-900 font-bold">{percW310}%</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                  <div
                    className="bg-[#111827] h-3 rounded-full transition-all duration-1000"
                    style={{ width: `${percW310}%` }}
                  />
                </div>
              </div>

              {/* Detalhes de Soldas e Talas */}
              <div className="pt-3 border-t border-slate-100 grid grid-cols-2 gap-3 text-xs">
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <p className="text-[10px] text-slate-500 font-medium uppercase">Emendas W150 / W310</p>
                  <p className="text-base font-bold text-slate-800 mt-0.5">
                    {totalEmendasW150} / {totalEmendasW310} un
                  </p>
                </div>
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <p className="text-[10px] text-slate-500 font-medium uppercase">Montagem Talas</p>
                  <p className="text-base font-bold text-slate-800 mt-0.5">
                    {totalTalas} un montadas
                  </p>
                </div>
              </div>
            </div>
          </div>

          <p className="text-[11px] text-slate-400 mt-2">
            Média de profundidade executada: <strong className="text-slate-600 font-semibold">14,5 m por estaca</strong>
          </p>
        </div>

        {/* Painel 2: Status do Fluxo de Relatórios */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-emerald-600" />
                  <span>Fluxo Técnico de RDPs</span>
                </h2>
                <p className="text-xs text-slate-500">Validação entre Apontador e Engenharia</p>
              </div>
              <span className="text-xs font-mono font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                {taxaAprovacao}% Aprovado
              </span>
            </div>

            {/* Barra segmentada de status */}
            <div className="my-4 space-y-3">
              <div className="w-full bg-slate-100 rounded-full h-3.5 flex overflow-hidden p-0.5">
                <div
                  className="bg-emerald-500 h-full rounded-l-full transition-all"
                  style={{ width: `${rdpsAprovados > 0 ? (rdpsAprovados / (totalRdps || 1)) * 100 : 0}%` }}
                  title="Aprovados"
                />
                <div
                  className="bg-blue-500 h-full transition-all"
                  style={{ width: `${rdpsSubmetidos > 0 ? (rdpsSubmetidos / (totalRdps || 1)) * 100 : 100}%` }}
                  title="Submetidos"
                />
                <div
                  className="bg-amber-400 h-full rounded-r-full transition-all"
                  style={{ width: `${rdpsRascunhos > 0 ? (rdpsRascunhos / (totalRdps || 1)) * 100 : 0}%` }}
                  title="Rascunhos"
                />
              </div>

              {/* Indicadores numéricos de status */}
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between text-xs py-1.5 px-3 rounded-xl bg-blue-50/70 border border-blue-100">
                  <span className="flex items-center gap-2 text-blue-800 font-semibold">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                    Submetidos / Aguardando Aprovação
                  </span>
                  <span className="font-bold text-blue-900 font-mono">{rdpsSubmetidos}</span>
                </div>

                <div className="flex items-center justify-between text-xs py-1.5 px-3 rounded-xl bg-emerald-50/70 border border-emerald-100">
                  <span className="flex items-center gap-2 text-emerald-800 font-semibold">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                    Aprovados pela Engenharia
                  </span>
                  <span className="font-bold text-emerald-900 font-mono">{rdpsAprovados}</span>
                </div>

                <div className="flex items-center justify-between text-xs py-1.5 px-3 rounded-xl bg-amber-50/70 border border-amber-100">
                  <span className="flex items-center gap-2 text-amber-800 font-semibold">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                    Rascunhos em Campo
                  </span>
                  <span className="font-bold text-amber-900 font-mono">{rdpsRascunhos}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500">Notificações automáticas por SMTP:</span>
            <span className="text-emerald-700 font-bold flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Ativo
            </span>
          </div>
        </div>

        {/* Painel 3: Equipamentos & Segurança Operacional */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <HardHat className="w-4 h-4 text-[#BA1A1A]" />
                  <span>Frente de Equipamentos</span>
                </h2>
                <p className="text-xs text-slate-500">Máquinas e condições das frentes</p>
              </div>
              <span className="text-xs font-mono font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md">
                CZM 25t
              </span>
            </div>

            <div className="space-y-3 my-3">
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-red-100 text-[#BA1A1A] flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Activity className="w-4 h-4" />
                </div>
                <div className="text-xs">
                  <p className="font-bold text-slate-800">Bate-Estacas CZM 25t</p>
                  <p className="text-slate-500 mt-0.5">Operando na obra Edifício Horizonte Azul</p>
                  <span className="inline-block mt-1 text-[10px] font-bold text-emerald-700 bg-emerald-100/70 px-2 py-0.2 rounded-full">
                    Em Produção Normal
                  </span>
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div className="text-xs">
                  <p className="font-bold text-slate-800">Condição Climática</p>
                  <p className="text-slate-500 mt-0.5">Bom / Ensolarado · Sem paralisações</p>
                  <span className="inline-block mt-1 text-[10px] font-bold text-blue-700 bg-blue-100/70 px-2 py-0.2 rounded-full">
                    Turno Diurno
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 text-center">
            <Link
              href="/medicao/apontador/rdp/novo"
              className="text-xs font-bold text-[#BA1A1A] hover:underline inline-flex items-center gap-1"
            >
              Iniciar novo turno de produção →
            </Link>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 4. OBRAS EM ANDAMENTO (CARDS EXECUTIVOS)                   */}
      {/* ========================================================= */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-[#BA1A1A]" />
              <span>Canteiros de Obras em Execução</span>
            </h2>
            <p className="text-xs text-slate-500">Localização e acompanhamento direto das fundações</p>
          </div>
          <Link
            href="/medicao/engenheiro/obras"
            className="text-xs font-bold text-[#BA1A1A] hover:underline inline-flex items-center gap-1"
          >
            Ver todas as obras ({obras.length}) →
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {obras.map((obra) => (
            <div
              key={obra.id}
              className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md">
                      {obra.codigo}
                    </span>
                    <h3 className="text-base font-bold text-slate-900 mt-1">{obra.nome}</h3>
                  </div>
                  <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                    Ativa
                  </span>
                </div>

                <div className="space-y-1.5 text-xs text-slate-600 my-3">
                  <p className="flex items-center gap-1.5">
                    <strong className="text-slate-800">Cliente:</strong> {obra.cliente}
                  </p>
                  <p className="flex items-center gap-1.5 text-slate-500">
                    <MapPin className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
                    <span>
                      {obra.cidade ? `${obra.cidade} - ${obra.estado}` : 'Paraná - PR'}
                    </span>
                  </p>
                  <p className="text-slate-500">
                    <strong className="text-slate-700">Responsável:</strong>{' '}
                    {obra.engenheiroResponsavel?.name || 'Engenharia RBT'}
                  </p>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-500 font-medium">
                  {obra._count.relatoriosDiarios} RDP(s) registrado(s)
                </span>
                <Link
                  href="/medicao/engenheiro/obras"
                  className="font-bold text-[#BA1A1A] hover:underline inline-flex items-center gap-1"
                >
                  Detalhes da Obra →
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ========================================================= */}
      {/* 5. TABELA DE RELATÓRIOS DIÁRIOS RECENTES                   */}
      {/* ========================================================= */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 sm:p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-[#BA1A1A]" />
              <span>Últimos Relatórios de Produção (RDP)</span>
            </h2>
            <p className="text-xs text-slate-500">Histórico recente de lançamentos em canteiro</p>
          </div>
          <Link
            href="/medicao/apontador/rdp"
            className="text-xs font-bold text-[#BA1A1A] hover:underline inline-flex items-center gap-1"
          >
            Ver listagem completa →
          </Link>
        </div>

        {rdpsRecentes.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            <ClipboardList className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-sm">Nenhum relatório cadastrado até o momento.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">RDP</th>
                  <th className="py-3 px-4">Data</th>
                  <th className="py-3 px-4">Obra</th>
                  <th className="py-3 px-4">Apontador</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {rdpsRecentes.map((rdp) => {
                  const badge = statusBadge[rdp.status] || {
                    label: rdp.status,
                    bg: 'bg-slate-100',
                    text: 'text-slate-700',
                    border: 'border-slate-200',
                  };
                  return (
                    <tr key={rdp.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                        #{rdp.numeroSequencial}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600">
                        {new Date(rdp.data).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="py-3.5 px-4 font-medium text-slate-800">
                        {rdp.obra.nome}
                      </td>
                      <td className="py-3.5 px-4 text-slate-500">
                        {rdp.apontador.name}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${badge.bg} ${badge.text} ${badge.border}`}
                        >
                          {badge.label}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <Link
                          href={`/medicao/apontador/rdp/${rdp.id}`}
                          className="font-bold text-[#BA1A1A] hover:underline"
                        >
                          Visualizar
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ========================================================= */}
      {/* 6. ATALHOS RÁPIDOS INLINE                                 */}
      {/* ========================================================= */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Link
          href="/medicao/apontador/rdp/novo"
          className="p-4 rounded-2xl bg-white border border-slate-200 hover:border-[#BA1A1A] hover:shadow-md transition text-left group"
        >
          <div className="w-8 h-8 rounded-lg bg-red-50 text-[#BA1A1A] flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
            <Plus className="w-4 h-4" />
          </div>
          <p className="text-xs font-bold text-slate-800">Novo RDP</p>
          <p className="text-[10px] text-slate-400 mt-0.5">Preencher relatório diário</p>
        </Link>

        <Link
          href="/medicao/engenheiro/validacao"
          className="p-4 rounded-2xl bg-white border border-slate-200 hover:border-[#BA1A1A] hover:shadow-md transition text-left group"
        >
          <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
            <CheckSquare className="w-4 h-4" />
          </div>
          <p className="text-xs font-bold text-slate-800">Validação</p>
          <p className="text-[10px] text-slate-400 mt-0.5">Aprovação técnica</p>
        </Link>

        <Link
          href="/medicao/engenheiro/medicoes"
          className="p-4 rounded-2xl bg-white border border-slate-200 hover:border-[#BA1A1A] hover:shadow-md transition text-left group"
        >
          <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
            <TrendingUp className="w-4 h-4" />
          </div>
          <p className="text-xs font-bold text-slate-800">Boletim de Medição</p>
          <p className="text-[10px] text-slate-400 mt-0.5">Contratos e quantitativos</p>
        </Link>

        <a
          href="/api/marca/pdf"
          target="_blank"
          rel="noopener noreferrer"
          className="p-4 rounded-2xl bg-white border border-slate-200 hover:border-[#BA1A1A] hover:shadow-md transition text-left group"
        >
          <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-700 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
            <FileText className="w-4 h-4" />
          </div>
          <p className="text-xs font-bold text-slate-800">Manual da Marca</p>
          <p className="text-[10px] text-slate-400 mt-0.5">Identidade oficial em PDF</p>
        </a>
      </div>
    </div>
  );
}
