'use client';

import React, { useState, useMemo } from 'react';
import {
  Sparkles,
  FileSearch,
  HardHat,
  Send,
  CheckCircle2,
  XCircle,
  Ban,
  Search,
  SearchX,
  X,
  RotateCcw,
  SlidersHorizontal,
} from 'lucide-react';
import { OrcamentoItem } from './kanban-card';
import { KanbanColumn, ColumnDefinition } from './kanban-column';

export type { OrcamentoItem } from './kanban-card';
export type { ColumnDefinition } from './kanban-column';

interface KanbanBoardProps {
  initialOrcamentos: OrcamentoItem[];
}

export const KANBAN_COLUMNS: ColumnDefinition[] = [
  {
    key: 'NOVO',
    title: 'Novo',
    subtitle: 'Triagem e Magic Link',
    statuses: ['NOVO', 'AGUARDANDO_CLIENTE'],
    color: 'border-amber-400 bg-amber-500/10 text-amber-700',
    badge: 'bg-amber-100 text-amber-800 border-amber-200',
    borderAccent: 'border-l-amber-500',
    dotColor: 'bg-amber-500',
    emptyIcon: Sparkles,
    emptyTitle: 'Nenhuma solicitação pendente',
    emptySubtitle: 'Novas solicitações e links pendentes aparecerão aqui.',
    category: 'EM_ANDAMENTO',
  },
  {
    key: 'EM_ANALISE',
    title: 'Em Análise',
    subtitle: 'Cálculo de custos e engenharia',
    statuses: ['EM_ANALISE', 'AGUARDANDO_ANALISE'],
    color: 'border-blue-500 bg-blue-500/10 text-blue-700',
    badge: 'bg-blue-100 text-blue-800 border-blue-200',
    borderAccent: 'border-l-blue-500',
    dotColor: 'bg-blue-500',
    emptyIcon: FileSearch,
    emptyTitle: 'Nenhum orçamento em análise',
    emptySubtitle: 'Solicitações com dados técnicos aguardando cálculo.',
    category: 'EM_ANDAMENTO',
  },
  {
    key: 'VISITA_TECNICA',
    title: 'Visita Técnica',
    subtitle: 'Vistoria e sondagem no canteiro',
    statuses: ['VISITA_TECNICA'],
    color: 'border-purple-500 bg-purple-500/10 text-purple-700',
    badge: 'bg-purple-100 text-purple-800 border-purple-200',
    borderAccent: 'border-l-purple-500',
    dotColor: 'bg-purple-500',
    emptyIcon: HardHat,
    emptyTitle: 'Nenhuma visita técnica agendada',
    emptySubtitle: 'Obras e laudos que necessitam de inspeção presencial.',
    category: 'EM_ANDAMENTO',
  },
  {
    key: 'PROPOSTA_ENVIADA',
    title: 'Proposta Enviada',
    subtitle: 'PDF despachado para o cliente',
    statuses: ['PROPOSTA_ENVIADA'],
    color: 'border-teal-500 bg-teal-500/10 text-teal-700',
    badge: 'bg-teal-100 text-teal-800 border-teal-200',
    borderAccent: 'border-l-teal-500',
    dotColor: 'bg-teal-500',
    emptyIcon: Send,
    emptyTitle: 'Nenhuma proposta em negociação',
    emptySubtitle: 'Orçamentos formalizados aguardando aceite do cliente.',
    category: 'EM_ANDAMENTO',
  },
  {
    key: 'APROVADO',
    title: 'Aprovado',
    subtitle: 'Contrato fechado com sucesso',
    statuses: ['APROVADO'],
    color: 'border-emerald-600 bg-emerald-500/10 text-emerald-700',
    badge: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    borderAccent: 'border-l-emerald-600',
    dotColor: 'bg-emerald-600',
    emptyIcon: CheckCircle2,
    emptyTitle: 'Nenhum orçamento aprovado',
    emptySubtitle: 'Propostas aprovadas convertidas para início de obra.',
    category: 'CONCLUIDOS',
  },
  {
    key: 'REJEITADO',
    title: 'Rejeitado',
    subtitle: 'Proposta declinada pelo cliente',
    statuses: ['REJEITADO'],
    color: 'border-rose-500 bg-rose-500/10 text-rose-700',
    badge: 'bg-rose-100 text-rose-800 border-rose-200',
    borderAccent: 'border-l-rose-500',
    dotColor: 'bg-rose-500',
    emptyIcon: XCircle,
    emptyTitle: 'Nenhum orçamento rejeitado',
    emptySubtitle: 'Propostas recusadas ou sem viabilidade comercial.',
    category: 'CONCLUIDOS',
  },
  {
    key: 'CANCELADO',
    title: 'Cancelado',
    subtitle: 'Cancelamento ou duplicidade',
    statuses: ['CANCELADO'],
    color: 'border-slate-400 bg-slate-500/10 text-slate-700',
    badge: 'bg-slate-200 text-slate-800 border-slate-300',
    borderAccent: 'border-l-slate-400',
    dotColor: 'bg-slate-400',
    emptyIcon: Ban,
    emptyTitle: 'Nenhum orçamento cancelado',
    emptySubtitle: 'Solicitações canceladas ou descartadas por duplicidade.',
    category: 'CONCLUIDOS',
  },
];

type ViewMode = 'ALL' | 'EM_ANDAMENTO' | 'CONCLUIDOS';

export function KanbanBoard({ initialOrcamentos }: KanbanBoardProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('ALL');
  const [mobileActiveColumn, setMobileActiveColumn] = useState<string>('ALL');
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  // Filtragem de busca por múltiplos campos
  const filtered = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return initialOrcamentos;

    return initialOrcamentos.filter((orc) => {
      const matchProtocol = orc.numeroProtocolo?.toLowerCase().includes(term);
      const matchClient = orc.lead?.nome?.toLowerCase().includes(term);
      const matchEmail = orc.lead?.email?.toLowerCase().includes(term);
      const matchEmpresa = orc.lead?.empresa?.toLowerCase().includes(term);
      const matchServico = orc.respostaFormulario?.tipoServico
        ?.toLowerCase()
        .includes(term);
      const matchOrcamentista = orc.orcamentista?.name
        ?.toLowerCase()
        .includes(term);

      return (
        matchProtocol ||
        matchClient ||
        matchEmail ||
        matchEmpresa ||
        matchServico ||
        matchOrcamentista
      );
    });
  }, [initialOrcamentos, searchTerm]);

  // Contagens para abas de desktop
  const countAll = filtered.length;
  const countAndamento = useMemo(() => {
    const andamentoStatuses = KANBAN_COLUMNS.filter(
      (c) => c.category === 'EM_ANDAMENTO'
    ).flatMap((c) => c.statuses);
    return filtered.filter((o) => andamentoStatuses.includes(o.status)).length;
  }, [filtered]);

  const countConcluidos = useMemo(() => {
    const concluidosStatuses = KANBAN_COLUMNS.filter(
      (c) => c.category === 'CONCLUIDOS'
    ).flatMap((c) => c.statuses);
    return filtered.filter((o) => concluidosStatuses.includes(o.status)).length;
  }, [filtered]);

  // Colunas ativas com base no modo de visualização desktop
  const visibleColumns = useMemo(() => {
    if (viewMode === 'ALL') return KANBAN_COLUMNS;
    return KANBAN_COLUMNS.filter((col) => col.category === viewMode);
  }, [viewMode]);

  // Manipulador para cópia de link com feedback
  const handleCopyLink = (token: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const origin =
      typeof window !== 'undefined' ? window.location.origin : '';
    const url = `${origin}/formulario/${token}`;
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(url);
    }
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2000);
  };

  const handleClearFilters = () => {
    setSearchTerm('');
    setViewMode('ALL');
    setMobileActiveColumn('ALL');
  };

  return (
    <div className="space-y-4">
      {/* Top Filter and Controls Bar */}
      <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1 sm:max-w-md">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por protocolo, cliente, serviço ou engenheiro..."
              className="w-full pl-10 pr-9 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-600 focus:bg-white focus:border-red-600 transition"
              aria-label="Buscar orçamentos"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-200/60 transition cursor-pointer"
                title="Limpar busca"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Desktop View Mode Tabs */}
          <div className="hidden sm:flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200/80">
            <button
              type="button"
              onClick={() => setViewMode('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                viewMode === 'ALL'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              <span>Todos</span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-slate-200/70 text-slate-700">
                {countAll}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode('EM_ANDAMENTO')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                viewMode === 'EM_ANDAMENTO'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              <span>Em Andamento</span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-blue-100 text-blue-800">
                {countAndamento}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode('CONCLUIDOS')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                viewMode === 'CONCLUIDOS'
                  ? 'bg-white text-emerald-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              <span>Concluídos</span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-800">
                {countConcluidos}
              </span>
            </button>
          </div>

          {/* Results Summary & Clear button if filtered */}
          <div className="flex items-center justify-between sm:justify-end gap-2 text-xs text-slate-500">
            <span className="font-semibold text-slate-700 font-mono">
              {filtered.length}
            </span>{' '}
            <span>{filtered.length === 1 ? 'orçamento' : 'orçamentos'}</span>
            {(searchTerm || viewMode !== 'ALL' || mobileActiveColumn !== 'ALL') && (
              <button
                type="button"
                onClick={handleClearFilters}
                className="ml-2 inline-flex items-center gap-1 text-[11px] font-medium text-red-700 hover:text-red-800 hover:underline cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                Limpar filtros
              </button>
            )}
          </div>
        </div>

        {/* Mobile Column Carousel / Tab Switcher (Visible on small screens) */}
        <div className="sm:hidden pt-2 border-t border-slate-100">
          <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-500 mb-2">
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Colunas:</span>
          </div>
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none [scrollbar-width:none]">
            <button
              type="button"
              onClick={() => setMobileActiveColumn('ALL')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 transition flex items-center gap-1 cursor-pointer ${
                mobileActiveColumn === 'ALL'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <span>Todas</span>
              <span className="text-[10px] font-mono font-normal opacity-80">
                ({filtered.length})
              </span>
            </button>

            {KANBAN_COLUMNS.map((col) => {
              const colCount = filtered.filter((item) =>
                col.statuses.includes(item.status)
              ).length;
              const isActive = mobileActiveColumn === col.key;

              return (
                <button
                  key={col.key}
                  type="button"
                  onClick={() => setMobileActiveColumn(col.key)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 transition flex items-center gap-1.5 cursor-pointer ${
                    isActive
                      ? 'bg-red-700 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      isActive ? 'bg-white' : col.dotColor
                    }`}
                  />
                  <span>{col.title}</span>
                  <span className="text-[10px] font-mono font-normal opacity-80">
                    ({colCount})
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Global Empty Search State */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 sm:p-12 text-center shadow-sm flex flex-col items-center justify-center my-6">
          <div className="w-16 h-16 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center text-red-600 mb-4 shadow-sm">
            <SearchX className="w-8 h-8" />
          </div>
          <h3 className="text-base sm:text-lg font-bold text-slate-900">
            Nenhum orçamento encontrado
          </h3>
          <p className="text-xs sm:text-sm text-slate-500 max-w-md mt-1.5 mb-5 leading-relaxed">
            {searchTerm
              ? `Não foram encontrados resultados para a busca "${searchTerm}". Verifique a digitação ou remova os filtros ativos.`
              : 'Nenhum orçamento corresponde aos filtros selecionados no momento.'}
          </p>
          <button
            type="button"
            onClick={handleClearFilters}
            className="inline-flex items-center gap-2 px-4 py-2 bg-red-700 hover:bg-red-800 text-white rounded-xl text-xs sm:text-sm font-semibold shadow-sm transition active:scale-95 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600 focus-visible:ring-offset-2"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Limpar filtros</span>
          </button>
        </div>
      ) : (
        /* Kanban Columns Track */
        <div>
          {/* Mobile Single Column View (when a specific column is selected on mobile) */}
          {mobileActiveColumn !== 'ALL' ? (
            <div className="sm:hidden">
              {(() => {
                const targetCol = KANBAN_COLUMNS.find(
                  (c) => c.key === mobileActiveColumn
                );
                if (!targetCol) return null;
                const colItems = filtered.filter((item) =>
                  targetCol.statuses.includes(item.status)
                );
                return (
                  <div className="w-full">
                    <KanbanColumn
                      column={targetCol}
                      items={colItems}
                      copiedToken={copiedToken}
                      onCopyLink={handleCopyLink}
                    />
                  </div>
                );
              })()}
            </div>
          ) : null}

          {/* Desktop & Mobile "ALL" Horizontal Scroll Track */}
          <div
            className={`${
              mobileActiveColumn !== 'ALL' ? 'hidden sm:flex' : 'flex'
            } gap-4 items-start overflow-x-auto pb-4 pt-1 kanban-scroll scroll-smooth scrollbar-thin [scrollbar-width:thin]`}
          >
            {visibleColumns.map((col) => {
              const colItems = filtered.filter((item) =>
                col.statuses.includes(item.status)
              );

              return (
                <KanbanColumn
                  key={col.key}
                  column={col}
                  items={colItems}
                  copiedToken={copiedToken}
                  onCopyLink={handleCopyLink}
                />
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
