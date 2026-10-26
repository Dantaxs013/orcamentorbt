'use client';

import React, { useState } from 'react';
import { Proposal, ProposalStatus, STATUS_CONFIGS } from '@/lib/proposals-types';
import { BoardRow } from './BoardRow';
import { BoardFooterTotals } from './BoardFooterTotals';
import { ChevronDown, ChevronRight, Plus } from 'lucide-react';

interface BoardGroupProps {
  statusKey: ProposalStatus;
  proposals: Proposal[];
  onUpdateProposal: (id: string | number, field: keyof Proposal, value: any) => void;
  onDeleteProposal: (id: string | number) => void;
  onCreateRevision: (id: string | number) => void;
  onViewHistory: (proposal: Proposal) => void;
  onEditProposal?: (proposal: Proposal) => void;
  onAddProposalToGroup: (status: ProposalStatus) => void;
}

export function BoardGroup({
  statusKey,
  proposals,
  onUpdateProposal,
  onDeleteProposal,
  onCreateRevision,
  onViewHistory,
  onEditProposal,
  onAddProposalToGroup,
}: BoardGroupProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const config = STATUS_CONFIGS[statusKey];

  const groupTotalValue = proposals.reduce((acc, curr) => acc + (curr.value || 0), 0);

  return (
    <div className={`rounded-lg border border-slate-200 bg-white shadow-xs overflow-hidden mb-5`}>
      {/* Group Header Bar */}
      <div
        className={`px-4 py-2.5 flex items-center justify-between cursor-pointer border-b border-[#DDE5F0] ${config.groupHeaderBg} transition-colors select-none`}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3">
          <button className="text-slate-300 hover:text-white">
            {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>

          <div className="flex items-center gap-2">
            <h2 className="font-bold text-white text-sm tracking-wide">
              {config.label}
            </h2>
            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-white text-slate-900">
              {proposals.length}
            </span>
          </div>

          <span className="text-xs text-slate-400 hidden md:inline font-normal">
            • {config.description}
          </span>
        </div>

        {/* Group Quick Actions */}
        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => onAddProposalToGroup(statusKey)}
            className="flex items-center gap-1.5 px-3 py-1 text-xs font-extrabold rounded bg-[#EAF2FB] hover:bg-[#D4E5F9] border border-[#93C5FD] text-black shadow-2xs transition-all"
          >
            <Plus className="w-3.5 h-3.5 text-slate-900" />
            <span>Adicionar Proposta</span>
          </button>
        </div>
      </div>

      {/* Expanded Table Content */}
      {isExpanded && (
        <div className="overflow-x-auto">
          {proposals.length === 0 ? (
            <div className="p-5 text-center text-slate-400 text-xs italic bg-slate-50/40">
              Nenhuma proposta registrada neste grupo. Clique em &quot;Adicionar Proposta&quot;.
            </div>
          ) : (
            <table className="w-full text-left border-collapse min-w-[1650px]">
              {/* Table Column Headers (Matches RBT Fundações Screenshot Style) */}
              <thead>
                <tr className="bg-[#1F2937] text-[11px] font-bold text-white uppercase tracking-wider border-b border-slate-700">
                  <th className="w-8 px-2 py-2.5 text-center">#</th>
                  <th className="w-32 px-3 py-2.5 border-r border-slate-700/60">Código</th>
                  <th className="w-36 px-3 py-2.5 border-r border-slate-700/60 text-center">Status</th>
                  <th className="w-44 px-3 py-2.5 border-r border-slate-700/60 text-center">Tipo</th>
                  <th className="w-36 px-3 py-2.5 border-r border-slate-700/60 text-center">Escopo / Qtd</th>
                  <th className="w-36 px-3 py-2.5 border-r border-slate-700/60">Data Entrega</th>
                  <th className="w-44 px-3 py-2.5 border-r border-slate-700/60">Cliente</th>
                  <th className="w-32 px-3 py-2.5 border-r border-slate-700/60 text-center">Revisão</th>
                  <th className="w-32 px-3 py-2.5 border-r border-slate-700/60">Docs. Recebidos</th>
                  <th className="w-36 px-3 py-2.5 border-r border-slate-700/60">Resp. Técnica</th>
                  <th className="w-36 px-3 py-2.5 border-r border-slate-700/60">Resp. Comercial</th>
                  <th className="w-36 px-3 py-2.5 border-r border-slate-700/60 text-right">Valor Total</th>
                  <th className="w-36 px-3 py-2.5 border-r border-slate-700/60">Início Serviço</th>
                  <th className="w-36 px-3 py-2.5 border-r border-slate-700/60">Término Contrato</th>
                  <th className="w-24 px-3 py-2.5 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {proposals.map((proposal) => (
                  <BoardRow
                    key={proposal.id}
                    proposal={proposal}
                    onUpdate={onUpdateProposal}
                    onDelete={onDeleteProposal}
                    onCreateRevision={onCreateRevision}
                    onViewHistory={onViewHistory}
                    onEditProposal={onEditProposal}
                  />
                ))}
              </tbody>
            </table>
          )}

          {/* Group Totals Footer */}
          <BoardFooterTotals count={proposals.length} totalValue={groupTotalValue} />
        </div>
      )}
    </div>
  );
}
