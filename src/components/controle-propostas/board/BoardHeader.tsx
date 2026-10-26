'use client';

import React from 'react';
import { Search, Plus, Wallet, RefreshCw, CheckCircle2, FileText, Eye, EyeOff } from 'lucide-react';
import { useValuesVisibility } from '@/lib/ValuesVisibilityContext';
import { STATUS_CONFIGS } from '@/lib/proposals-types';

interface BoardHeaderProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedTechLead: string;
  onTechLeadChange: (lead: string) => void;
  selectedCommLead: string;
  onCommLeadChange: (lead: string) => void;
  selectedStatusFilter: string;
  onStatusFilterChange: (status: string) => void;
  techLeadsList: string[];
  commLeadsList: string[];
  totalValue: number;
  totalCount: number;
  isSaving: boolean;
  onNewProposal: () => void;
  onOpenReport?: () => void;
  onSyncCalendar?: () => void;
}

export function BoardHeader({
  searchQuery,
  onSearchChange,
  selectedTechLead,
  onTechLeadChange,
  selectedCommLead,
  onCommLeadChange,
  selectedStatusFilter,
  onStatusFilterChange,
  techLeadsList,
  commLeadsList,
  totalValue,
  totalCount,
  isSaving,
  onNewProposal,
  onOpenReport,
  onSyncCalendar,
}: BoardHeaderProps) {
  const { hideValues, toggleHideValues, formatCurrency } = useValuesVisibility();

  return (
    <div className="bg-white border-b border-slate-200 px-6 py-5 space-y-4 shadow-2xs">
      {/* Top Banner Header RBT Fundações */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          {/* Icon Box */}
          <div className="w-10 h-10 rounded-lg bg-slate-100 text-slate-900 flex items-center justify-center shrink-0 border border-[#DDE5F0]">
            <Wallet className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                Propostas Ativas
              </h1>
              {/* Autosave Status */}
              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                {isSaving ? (
                  <>
                    <RefreshCw className="w-3 h-3 text-amber-600 animate-spin" />
                    <span>Salvando...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    <span>Autosave Ativo</span>
                  </>
                )}
              </div>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Consulte, edite ou crie novas propostas comerciais da RBT Fundações.
            </p>
          </div>
        </div>

        {/* Action Buttons: "Total Filtrado", "Olho (Ocultar/Exibir Valores)", "Sincronizar Teams" & "+ Nova Proposta" */}
        <div className="flex items-center gap-3">
          <div className="text-right hidden md:block">
            <div className="text-[10px] uppercase font-bold text-slate-400">Total Filtrado</div>
            <div className="text-xs font-bold text-emerald-700">
              {formatCurrency(totalValue)} ({totalCount})
            </div>
          </div>

          {/* Botão de Olho para Ocultar/Exibir Valores (Privacidade) */}
          <button
            type="button"
            onClick={toggleHideValues}
            className={`p-2 rounded-lg border transition-all flex items-center justify-center shadow-2xs ${
              hideValues
                ? 'bg-amber-50 border-amber-300 text-amber-700 hover:bg-amber-100'
                : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-100 hover:text-black'
            }`}
            title={hideValues ? 'Exibir valores monetários' : 'Ocultar valores monetários (Privacidade)'}
          >
            {hideValues ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>

          {onSyncCalendar && (
            <button
              onClick={onSyncCalendar}
              className="flex items-center gap-2 px-3.5 py-2 bg-white hover:bg-slate-100 border border-slate-300 text-slate-800 font-extrabold rounded-lg text-xs shadow-2xs transition-all"
              title="Sincronizar prazos de propostas com seu calendário no Teams ou Outlook"
            >
              <FileText className="w-4 h-4 text-slate-900" />
              <span>Sincronizar Teams</span>
            </button>
          )}

          <button
            onClick={onNewProposal}
            className="flex items-center gap-2 px-4 py-2 bg-[#EAF2FB] hover:bg-[#D4E5F9] border border-[#2563EB] text-black font-extrabold rounded-lg text-xs shadow-2xs transition-all"
          >
            <Plus className="w-4 h-4 text-[#2563EB]" />
            <span>Nova Proposta</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-3 pt-2">
        {/* Search Bar */}
        <div className="relative flex-1 min-w-[280px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Buscar por nome, código, cliente ou motivo..."
            className="w-full pl-9 pr-4 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#BA1A1A] text-slate-800 placeholder:text-slate-400 font-bold"
          />
        </div>

        {/* Status Dropdown Filter */}
        <div className="flex items-center gap-1.5">
          <select
            value={selectedStatusFilter}
            onChange={(e) => onStatusFilterChange(e.target.value)}
            className="px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#BA1A1A] cursor-pointer font-bold"
          >
            <option value="ALL">Todos os Status</option>
            {Object.entries(STATUS_CONFIGS).map(([key, cfg]) => (
              <option key={key} value={key}>
                {cfg.label}
              </option>
            ))}
          </select>
        </div>

        {/* Tech Lead Filter */}
        <select
          value={selectedTechLead}
          onChange={(e) => onTechLeadChange(e.target.value)}
          className="px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#BA1A1A] cursor-pointer font-bold"
        >
          <option value="ALL">Resp. Técnica (Todos)</option>
          {techLeadsList.map((lead) => (
            <option key={lead} value={lead}>
              {lead}
            </option>
          ))}
        </select>

        {/* Comm Lead Filter */}
        <select
          value={selectedCommLead}
          onChange={(e) => onCommLeadChange(e.target.value)}
          className="px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#BA1A1A] cursor-pointer font-bold"
        >
          <option value="ALL">Resp. Comercial (Todos)</option>
          {commLeadsList.map((lead) => (
            <option key={lead} value={lead}>
              {lead}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
