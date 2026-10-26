import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { getServerSession } from '@/lib/session';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { KanbanBoard } from '@/components/kanban/kanban-board';
import { NovaSolicitacaoModal } from '@/components/orcamentos/nova-solicitacao-modal';
import {
  FileText,
  Clock,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Inbox,
} from 'lucide-react';

export default async function DashboardPage() {
  const session = await getServerSession();

  if (!session) {
    redirect('/login');
  }

  // Busca orçamentos no banco com relações necessárias
  const orcamentos = await prisma.orcamento.findMany({
    include: {
      lead: {
        select: {
          nome: true,
          email: true,
          empresa: true,
          telefone: true,
        },
      },
      orcamentista: {
        select: {
          name: true,
        },
      },
      magicLink: {
        select: {
          token: true,
          used: true,
          expiresAt: true,
        },
      },
      respostaFormulario: {
        select: {
          tipoFundacao: true,
          quantidadeEstacas: true,
          submittedAt: true,
        },
      },
      propostaComercial: {
        select: {
          valorTotal: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  // Métricas
  const total = orcamentos.length;
  const aguardandoCliente = orcamentos.filter(
    (o) => o.status === 'AGUARDANDO_CLIENTE' || o.status === 'NOVO'
  ).length;
  const aguardandoAnalise = orcamentos.filter(
    (o) => o.status === 'AGUARDANDO_ANALISE' || o.status === 'EM_ANALISE'
  ).length;
  const propostasEnviadas = orcamentos.filter((o) => o.status === 'PROPOSTA_ENVIADA').length;
  const aprovados = orcamentos.filter((o) => o.status === 'APROVADO').length;

  return (
    <DashboardShell user={session.user}>
      <div className="space-y-6">
        {/* Page Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Painel de Orçamentos
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Controle técnico e comercial de solicitações de fundações e propostas em andamento.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <NovaSolicitacaoModal />
          </div>
        </div>


        {/* Metric Cards KPI */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
          <div className="bg-white p-4 rounded-xl border border-slate-200 border-l-4 border-l-slate-700 shadow-sm flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-700 flex-shrink-0">
              <Inbox className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase text-slate-500">Total Geral</p>
              <p className="text-xl font-bold text-slate-900 font-mono">{total}</p>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 border-l-4 border-l-amber-500 shadow-sm flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center text-amber-700 flex-shrink-0">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase text-amber-700">Link Pendente</p>
              <p className="text-xl font-bold text-amber-900 font-mono">{aguardandoCliente}</p>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 border-l-4 border-l-blue-600 shadow-sm flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-700 flex-shrink-0">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase text-blue-700">Em Análise</p>
              <p className="text-xl font-bold text-blue-900 font-mono">{aguardandoAnalise}</p>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 border-l-4 border-l-teal-600 shadow-sm flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-teal-50 flex items-center justify-center text-teal-700 flex-shrink-0">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase text-teal-700">Propostas</p>
              <p className="text-xl font-bold text-teal-900 font-mono">{propostasEnviadas}</p>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 border-l-4 border-l-emerald-600 shadow-sm flex items-center gap-3 col-span-2 lg:col-span-1">
            <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-700 flex-shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase text-emerald-700">Aprovados</p>
              <p className="text-xl font-bold text-emerald-900 font-mono">{aprovados}</p>
            </div>
          </div>
        </div>

        {/* Kanban Board */}
        <div>
          <KanbanBoard
            initialOrcamentos={orcamentos.map((o) => ({
              ...o,
              propostaComercial: o.propostaComercial
                ? { valorTotal: Number(o.propostaComercial.valorTotal) }
                : null,
            }))}
          />
        </div>
      </div>
    </DashboardShell>
  );
}
