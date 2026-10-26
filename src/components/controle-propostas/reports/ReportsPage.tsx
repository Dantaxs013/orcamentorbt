'use client';

import React, { useState, useMemo } from 'react';
import { Proposal, ProposalStatus, STATUS_CONFIGS, PROPOSAL_GROUPS_ORDER } from '@/lib/proposals-types';
import { formatDate } from '@/lib/proposals-utils';
import { useValuesVisibility } from '@/lib/ValuesVisibilityContext';
import {
  BarChart2,
  PieChart as PieChartIcon,
  CheckSquare,
  Square,
  Printer,
  Download,
  Filter,
  DollarSign,
  TrendingUp,
  Award,
  Layers,
  Building2,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

interface ReportsPageProps {
  proposals: Proposal[];
}

export function ReportsPage({ proposals }: ReportsPageProps) {
  const { formatCurrency } = useValuesVisibility();
  // State for user-selected proposal groups / tables
  const [selectedGroups, setSelectedGroups] = useState<Record<ProposalStatus, boolean>>({
    NEW: true,
    IN_PROGRESS: true,
    SENT: true,
    WON: true,
    DECLINED: true,
    LOST: true,
    IN_REVISION: true,
    HISTORY: false,
  });

  const [filterTechLead, setFilterTechLead] = useState('ALL');
  const [filterProjectType, setFilterProjectType] = useState('ALL');

  // Toggle single group checkbox
  const toggleGroup = (statusKey: ProposalStatus) => {
    setSelectedGroups((prev) => ({
      ...prev,
      [statusKey]: !prev[statusKey],
    }));
  };

  // Toggle all groups
  const toggleAll = (select: boolean) => {
    const next: Record<ProposalStatus, boolean> = { ...selectedGroups };
    Object.keys(next).forEach((key) => {
      next[key as ProposalStatus] = select;
    });
    setSelectedGroups(next);
  };

  // Unique tech leads & project types for filters
  const techLeads = useMemo(() => {
    const list = proposals.map((p) => p.techLead).filter(Boolean);
    return Array.from(new Set(list));
  }, [proposals]);

  const projectTypes = useMemo(() => {
    const list = proposals.map((p) => p.projectType || 'ONSHORE').filter(Boolean);
    return Array.from(new Set(list));
  }, [proposals]);

  // Filtered proposals based on selected groups and filter dropdowns
  const filteredProposals = useMemo(() => {
    return proposals.filter((p) => {
      if (!selectedGroups[p.status]) return false;
      if (filterTechLead !== 'ALL' && p.techLead !== filterTechLead) return false;
      if (filterProjectType !== 'ALL' && (p.projectType || 'ONSHORE') !== filterProjectType) return false;
      return true;
    });
  }, [proposals, selectedGroups, filterTechLead, filterProjectType]);

  // Financial Metrics
  const totalValue = useMemo(() => {
    return filteredProposals.reduce((sum, p) => sum + (p.value || 0), 0);
  }, [filteredProposals]);

  const averageValue = useMemo(() => {
    return filteredProposals.length > 0 ? totalValue / filteredProposals.length : 0;
  }, [filteredProposals, totalValue]);

  const wonProposals = useMemo(() => {
    return filteredProposals.filter((p) => p.status === 'WON');
  }, [filteredProposals]);

  const wonTotalValue = useMemo(() => {
    return wonProposals.reduce((sum, p) => sum + (p.value || 0), 0);
  }, [wonProposals]);

  // Data for Charts
  // Chart 1: Value by Status
  const statusChartData = useMemo(() => {
    return PROPOSAL_GROUPS_ORDER.filter((st) => selectedGroups[st]).map((st) => {
      const items = filteredProposals.filter((p) => p.status === st);
      const val = items.reduce((acc, curr) => acc + (curr.value || 0), 0);
      return {
        statusKey: st,
        label: STATUS_CONFIGS[st].label,
        count: items.length,
        value: val,
        percentage: totalValue > 0 ? (val / totalValue) * 100 : 0,
        badgeBg: STATUS_CONFIGS[st].badgeBg,
      };
    });
  }, [filteredProposals, selectedGroups, totalValue]);

  const maxStatusValue = useMemo(() => {
    return Math.max(...statusChartData.map((d) => d.value), 1);
  }, [statusChartData]);

  // Chart 2: Value by Project Type (ONSHORE, OFFSHORE, TERRAPLANAGEM, OUTROS)
  const projectTypeChartData = useMemo(() => {
    const map: Record<string, { count: number; value: number }> = {};
    filteredProposals.forEach((p) => {
      const typeKey = (p.projectType || 'ONSHORE').toUpperCase();
      if (!map[typeKey]) map[typeKey] = { count: 0, value: 0 };
      map[typeKey].count += 1;
      map[typeKey].value += p.value || 0;
    });

    return Object.entries(map).map(([typeKey, data]) => ({
      typeKey,
      count: data.count,
      value: data.value,
      percentage: totalValue > 0 ? (data.value / totalValue) * 100 : 0,
    }));
  }, [filteredProposals, totalValue]);

  // Handle Export to CSV
  const handleExportCSV = () => {
    const headers = [
      'Código',
      'Status',
      'Tipo de Projeto',
      'Cliente',
      'Contato Solicitante',
      'E-mails',
      'Valor (R$)',
      'Resp. Técnica',
      'Resp. Comercial',
      'Data Entrega',
    ];

    const rows = filteredProposals.map((p) => [
      `"${p.code || ''}"`,
      `"${STATUS_CONFIGS[p.status]?.label || p.status}"`,
      `"${p.projectType || 'ONSHORE'}"`,
      `"${p.clientName || ''}"`,
      `"${p.requesterName || ''}"`,
      `"${(p.requesterEmails || [p.requesterEmail]).join('; ')}"`,
      `"${p.value || 0}"`,
      `"${p.techLead || ''}"`,
      `"${p.commLead || ''}"`,
      `"${p.deliveryDate || ''}"`,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [headers.join(';'), ...rows.map((e) => e.join(';'))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Relatorio_Propostas_RBT Fundações_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-slate-50 space-y-8 select-none">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-[#BA1A1A] text-white flex items-center justify-center font-bold shadow-md">
            <BarChart2 className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-black">
              Relatórios Comerciais & Analytics — RBT Fundações
            </h1>
            <p className="text-xs text-slate-500 font-medium">
              Gere análises de dados customizadas selecionando as tabelas e filtros desejados.
            </p>
          </div>
        </div>

        {/* Print & Export Actions */}
        <div className="flex items-center gap-3 print:hidden">
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-slate-100 border border-slate-300 text-slate-800 text-xs font-extrabold rounded-xl shadow-2xs transition-all"
          >
            <Printer className="w-4 h-4 text-slate-900" />
            <span>Imprimir / Salvar PDF</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-4 py-2 bg-[#BA1A1A] hover:bg-[#093D75] text-white text-xs font-extrabold rounded-xl shadow-md transition-all"
          >
            <Download className="w-4 h-4" />
            <span>Exportar CSV / Excel</span>
          </button>
        </div>
      </div>

      {/* PAINEL DE SELEÇÃO DE TABELAS / GRUPOS E FILTROS */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4 print:hidden">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2 text-xs font-extrabold text-slate-900 uppercase tracking-wide">
            <Filter className="w-4 h-4" />
            <span>Selecione as Tabelas & Grupos para o Relatório:</span>
          </div>

          <div className="flex items-center gap-2 text-xs font-bold">
            <button
              onClick={() => toggleAll(true)}
              className="text-slate-900 hover:underline"
            >
              Marcar Todos
            </button>
            <span className="text-slate-300">|</span>
            <button
              onClick={() => toggleAll(false)}
              className="text-slate-500 hover:underline"
            >
              Desmarcar Todos
            </button>
          </div>
        </div>

        {/* Group Selector Checkboxes Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3">
          {PROPOSAL_GROUPS_ORDER.map((stKey) => {
            const cfg = STATUS_CONFIGS[stKey];
            const isChecked = selectedGroups[stKey];
            const count = proposals.filter((p) => p.status === stKey).length;

            return (
              <button
                key={stKey}
                type="button"
                onClick={() => toggleGroup(stKey)}
                className={`p-3 rounded-xl border flex items-center gap-2.5 transition-all text-left ${
                  isChecked
                    ? 'bg-[#EAF2FB] border-[#2563EB] text-slate-900 ring-2 ring-[#2563EB]/20 shadow-2xs'
                    : 'bg-slate-50 border-slate-200 text-slate-500 opacity-60 hover:opacity-100'
                }`}
              >
                {isChecked ? (
                  <CheckSquare className="w-4 h-4 text-[#2563EB] shrink-0" />
                ) : (
                  <Square className="w-4 h-4 text-slate-400 shrink-0" />
                )}
                <div className="min-w-0">
                  <div className="text-xs font-extrabold truncate">{cfg.label}</div>
                  <div className="text-[10px] font-bold text-slate-500">
                    {count} propostas
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Additional Filters */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-slate-100 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1">Filtrar por Responsável Técnico</label>
            <select
              value={filterTechLead}
              onChange={(e) => setFilterTechLead(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-bold text-black focus:ring-2 focus:ring-[#BA1A1A]"
            >
              <option value="ALL">Todos os Responsáveis Técnicos</option>
              {techLeads.map((tl) => (
                <option key={tl} value={tl}>
                  {tl}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Filtrar por Tipo de Projeto</label>
            <select
              value={filterProjectType}
              onChange={(e) => setFilterProjectType(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-bold text-black focus:ring-2 focus:ring-[#BA1A1A]"
            >
              <option value="ALL">Todos os Tipos de Projeto</option>
              {projectTypes.map((pt) => (
                <option key={pt} value={pt}>
                  {pt}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* EXECUTIVE SUMMARY METRIC CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Financeiro */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wide block">
              Valor Total Selecionado
            </span>
            <div className="text-2xl font-black text-slate-900 mt-1">
              {formatCurrency(totalValue)}
            </div>
            <span className="text-[11px] text-slate-400 font-bold mt-1 block">
              {filteredProposals.length} propostas incluídas
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-900 flex items-center justify-center font-bold">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>

        {/* Propostas Ganhas */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wide block">
              Propostas Ganhas
            </span>
            <div className="text-2xl font-black text-[#059669] mt-1">
              {formatCurrency(wonTotalValue)}
            </div>
            <span className="text-[11px] text-emerald-700 font-bold mt-1 block">
              {wonProposals.length} contratos fechados
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-[#059669] flex items-center justify-center font-bold">
            <Award className="w-6 h-6" />
          </div>
        </div>

        {/* Ticket Médio */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wide block">
              Ticket Médio por Proposta
            </span>
            <div className="text-2xl font-black text-slate-800 mt-1">
              {formatCurrency(averageValue)}
            </div>
            <span className="text-[11px] text-slate-400 font-bold mt-1 block">
              Média do pipeline ativo
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>

        {/* Taxa de Sucesso / Conversão */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wide block">
              Taxa de Conversão
            </span>
            <div className="text-2xl font-black text-purple-700 mt-1">
              {filteredProposals.length > 0
                ? `${((wonProposals.length / filteredProposals.length) * 100).toFixed(1)}%`
                : '0%'}
            </div>
            <span className="text-[11px] text-purple-600 font-bold mt-1 block">
              Proporção de Ganhas
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-700 flex items-center justify-center font-bold">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* PAINEL DE GRÁFICOS VISUAIS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* GRÁFICO 1: Distribuição de Valor por Status */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2 font-extrabold text-slate-900 text-sm uppercase">
              <BarChart2 className="w-5 h-5" />
              <span>Volume Comercial por Status (R$)</span>
            </div>
          </div>

          <div className="space-y-3.5 pt-2">
            {statusChartData.map((d) => {
              const barPercentage = Math.round((d.value / maxStatusValue) * 100);
              return (
                <div key={d.statusKey} className="space-y-1">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${d.badgeBg}`}>
                        {d.label}
                      </span>
                      <span className="text-slate-500">({d.count} propostas)</span>
                    </span>
                    <span className="font-extrabold text-black">
                      {formatCurrency(d.value)} <span className="text-slate-400 font-normal">({d.percentage.toFixed(1)}%)</span>
                    </span>
                  </div>

                  {/* Horizontal Bar */}
                  <div className="w-full h-3.5 bg-slate-100 rounded-full overflow-hidden flex">
                    <div
                      className="h-full bg-[#BA1A1A] transition-all duration-500 rounded-full"
                      style={{ width: `${Math.max(barPercentage, 2)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* GRÁFICO 2: Distribuição por Tipo de Projeto (ONSHORE, OFFSHORE, TERRAPLANAGEM) */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2 font-extrabold text-slate-900 text-sm uppercase">
              <PieChartIcon className="w-5 h-5" />
              <span>Distribuição por Tipo de Projeto (CPU)</span>
            </div>
          </div>

          <div className="space-y-3.5 pt-2">
            {projectTypeChartData.map((pt) => {
              const colors: Record<string, string> = {
                ONSHORE: 'bg-[#BA1A1A]',
                OFFSHORE: 'bg-teal-600',
                TERRAPLANAGEM: 'bg-amber-600',
              };
              const bgClass = colors[pt.typeKey] || 'bg-purple-600';

              return (
                <div key={pt.typeKey} className="space-y-1">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="flex items-center gap-2">
                      <span className={`w-3 h-3 rounded-full ${bgClass}`} />
                      <span className="font-extrabold text-black">{pt.typeKey}</span>
                      <span className="text-slate-500">({pt.count} propostas)</span>
                    </span>
                    <span className="font-extrabold text-black">
                      {formatCurrency(pt.value)} <span className="text-slate-400 font-normal">({pt.percentage.toFixed(1)}%)</span>
                    </span>
                  </div>

                  <div className="w-full h-3.5 bg-slate-100 rounded-full overflow-hidden flex">
                    <div
                      className={`h-full ${bgClass} transition-all duration-500 rounded-full`}
                      style={{ width: `${Math.max(pt.percentage, 2)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* TABELAS SELECIONADAS DETALHADAS */}
      <div className="space-y-6">
        <h2 className="text-base font-extrabold text-black flex items-center gap-2 uppercase tracking-wide">
          <Layers className="w-5 h-5 text-slate-900" />
          <span>Tabelas de Propostas Selecionadas para Exibição ({filteredProposals.length})</span>
        </h2>

        {PROPOSAL_GROUPS_ORDER.filter((st) => selectedGroups[st]).map((groupStatus) => {
          const groupProposals = filteredProposals.filter((p) => p.status === groupStatus);
          const cfg = STATUS_CONFIGS[groupStatus];
          const groupTotal = groupProposals.reduce((sum, p) => sum + (p.value || 0), 0);

          return (
            <div
              key={groupStatus}
              className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden"
            >
              {/* Group Header */}
              <div className="px-5 py-3.5 bg-[#EAF2FB] border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`px-2.5 py-1 rounded-lg text-xs font-extrabold ${cfg.badgeBg}`}>
                    {cfg.label}
                  </span>
                  <span className="text-xs font-bold text-slate-600">
                    ({groupProposals.length} propostas)
                  </span>
                </div>
                <div className="text-xs font-extrabold text-slate-900">
                  Subtotal: {formatCurrency(groupTotal)}
                </div>
              </div>

              {/* Group Table */}
              <div className="overflow-x-auto">
                {groupProposals.length === 0 ? (
                  <div className="p-4 text-center text-xs text-slate-400 italic">
                    Nenhuma proposta neste grupo com os filtros aplicados.
                  </div>
                ) : (
                  <table className="w-full text-left border-collapse text-xs min-w-[1200px]">
                    <thead>
                      <tr className="bg-slate-50 text-[11px] font-bold text-slate-600 uppercase border-b border-slate-200">
                        <th className="px-3 py-2">Código</th>
                        <th className="px-3 py-2">Tipo</th>
                        <th className="px-3 py-2">Cliente</th>
                        <th className="px-3 py-2">Contato</th>
                        <th className="px-3 py-2">E-mails</th>
                        <th className="px-3 py-2 text-right">Valor Total</th>
                        <th className="px-3 py-2">Resp. Técnica</th>
                        <th className="px-3 py-2">Resp. Comercial</th>
                        <th className="px-3 py-2">Data Entrega</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {groupProposals.map((p) => {
                        const emailList = p.requesterEmails || [p.requesterEmail];
                        return (
                          <tr key={p.id} className="hover:bg-slate-50/80">
                            <td className="px-3 py-2 font-mono font-bold text-slate-900">
                              {p.code}
                            </td>
                            <td className="px-3 py-2 font-bold uppercase text-slate-700">
                              {p.projectType || 'ONSHORE'}
                            </td>
                            <td className="px-3 py-2 font-extrabold text-black uppercase">
                              {p.clientName}
                            </td>
                            <td className="px-3 py-2 font-semibold text-slate-700">
                              {p.requesterName}
                            </td>
                            <td className="px-3 py-2 font-mono text-[11px] text-blue-700">
                              {emailList.join(', ')}
                            </td>
                            <td className="px-3 py-2 font-extrabold text-[#059669] text-right">
                              {formatCurrency(p.value)}
                            </td>
                            <td className="px-3 py-2 font-semibold text-slate-700">
                              {p.techLead}
                            </td>
                            <td className="px-3 py-2 font-semibold text-slate-700">
                              {p.commLead}
                            </td>
                            <td className="px-3 py-2 font-semibold text-slate-700">
                              {formatDate(p.deliveryDate)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
