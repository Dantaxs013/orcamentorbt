'use client';

import React from 'react';
import { Proposal } from '@/lib/proposals-types';
import { EditableTextCell } from './cells/EditableTextCell';
import { StatusCell } from './cells/StatusCell';
import { CurrencyCell } from './cells/CurrencyCell';
import { DateCell } from './cells/DateCell';
import { DocsChecklist } from './cells/DocsChecklist';
import { RevisionAction } from './cells/RevisionAction';
import { ProjectTypeCell } from './cells/ProjectTypeCell';
import { AutocompleteCell } from './cells/AutocompleteCell';
import { Trash2, GripVertical, Eye, Edit3 } from 'lucide-react';

interface BoardRowProps {
  proposal: Proposal;
  onUpdate: (id: string | number, field: keyof Proposal, value: any) => void;
  onDelete: (id: string | number) => void;
  onCreateRevision: (id: string | number) => void;
  onViewHistory: (proposal: Proposal) => void;
  onEditProposal?: (proposal: Proposal) => void;
}

const DEFAULT_TECH_LEADS = [
  'Eng. Carlos Eduardo',
  'Eng. Marcos Vinícius',
  'Eng. André Luiz',
  'Eng. Ricardo Mendes',
];

const DEFAULT_COMM_LEADS = [
  'Mariana Silva',
  'Roberto Alves',
  'Fernanda Oliveira',
  'Wellington Muniz',
];

export function BoardRow({
  proposal,
  onUpdate,
  onDelete,
  onCreateRevision,
  onViewHistory,
  onEditProposal,
}: BoardRowProps) {
  return (
    <tr className="hover:bg-[#F4F8FC] border-b border-slate-200 transition-colors group text-xs">
      {/* Drag & Select Handle */}
      <td className="w-8 px-2 py-2 text-center text-slate-300 group-hover:text-slate-500 cursor-grab">
        <GripVertical className="w-3.5 h-3.5 mx-auto" />
      </td>

      {/* 1. Código */}
      <td className="w-32 px-2 py-1.5 border-r border-slate-100 font-mono">
        <EditableTextCell
          value={proposal.code}
          onChange={(val) => onUpdate(proposal.id, 'code', val)}
          isBold
          className="text-slate-900 font-bold"
        />
      </td>

      {/* 2. Status */}
      <td className="w-36 px-2 py-1.5 border-r border-slate-100">
        <StatusCell
          value={proposal.status}
          onChange={(val) => onUpdate(proposal.id, 'status', val)}
        />
      </td>

      {/* 3. TIPO DE PROJETO */}
      <td className="w-44 px-2 py-1.5 border-r border-slate-100 text-center">
        <ProjectTypeCell
          value={proposal.projectType || 'ONSHORE'}
          onChange={(val) => onUpdate(proposal.id, 'projectType', val)}
        />
      </td>

      {/* 3.1 Escopo / Quantidade & Unidade */}
      <td className="w-36 px-2 py-1.5 border-r border-slate-100 text-center">
        {proposal.quantidade ? (
          <span
            onClick={() => onEditProposal ? onEditProposal(proposal) : onViewHistory(proposal)}
            className="inline-flex items-center gap-1 font-extrabold text-slate-900 bg-[#EAF2FB] hover:bg-[#D4E5F9] px-2 py-0.5 rounded-lg border border-[#93C5FD] text-xs cursor-pointer shadow-2xs transition-all"
            title="Clique para editar o escopo"
          >
            {Number(proposal.quantidade).toLocaleString('pt-BR')} {proposal.unidadeMedida || ''}
          </span>
        ) : (
          <button
            onClick={() => onEditProposal ? onEditProposal(proposal) : onViewHistory(proposal)}
            className="text-slate-400 hover:text-slate-900 hover:bg-slate-100 px-2 py-0.5 rounded text-[11px] font-medium"
            title="Clique para adicionar escopo (Quantidade e Unidade)"
          >
            + Escopo
          </button>
        )}
      </td>

      {/* 4. Data da Entrega */}
      <td className="w-36 px-2 py-1.5 border-r border-slate-100">
        <DateCell
          value={proposal.deliveryDate}
          onChange={(val) => onUpdate(proposal.id, 'deliveryDate', val)}
          showAlert={false}
        />
      </td>

      {/* 5. Cliente */}
      <td className="w-44 px-2 py-1.5 border-r border-slate-100">
        <EditableTextCell
          value={proposal.clientName}
          onChange={(val) => onUpdate(proposal.id, 'clientName', val)}
          isBold
          className="uppercase tracking-tight"
        />
      </td>

      {/* 6. Revisão */}
      <td className="w-36 px-2 py-1.5 border-r border-slate-100">
        <RevisionAction
          currentRevision={proposal.revision}
          onCreateRevision={() => onCreateRevision(proposal.id)}
          onViewHistory={() => onViewHistory(proposal)}
        />
      </td>

      {/* 7. Docs. Recebidos (Link SharePoint) */}
      <td className="w-36 px-2 py-1.5 border-r border-slate-100">
        <DocsChecklist
          sharepointUrl={proposal.sharepointUrl}
          items={proposal.docsReceived || []}
          onChangeSharepointUrl={(url) => onUpdate(proposal.id, 'sharepointUrl', url)}
        />
      </td>

      {/* 8. Resp. Técnica (Autocomplete Suspenso) */}
      <td className="w-40 px-2 py-1.5 border-r border-slate-100">
        <AutocompleteCell
          value={proposal.techLead}
          onChange={(val) => onUpdate(proposal.id, 'techLead', val)}
          storageKey="tech_leads"
          defaultSuggestions={DEFAULT_TECH_LEADS}
          placeholder="Digite o responsável..."
        />
      </td>

      {/* 9. Resp. Comercial (Autocomplete Suspenso) */}
      <td className="w-40 px-2 py-1.5 border-r border-slate-100">
        <AutocompleteCell
          value={proposal.commLead}
          onChange={(val) => onUpdate(proposal.id, 'commLead', val)}
          storageKey="comm_leads"
          defaultSuggestions={DEFAULT_COMM_LEADS}
          placeholder="Digite o comercial..."
        />
      </td>

      {/* 10. Valor Total */}
      <td className="w-36 px-2 py-1.5 border-r border-slate-100 bg-[#F9FBFE]">
        <CurrencyCell
          value={proposal.value}
          onChange={(val) => onUpdate(proposal.id, 'value', val)}
        />
      </td>

      {/* 11. Início do Serviço */}
      <td className="w-36 px-2 py-1.5 border-r border-slate-100">
        <DateCell
          value={proposal.serviceStartDate}
          onChange={(val) => onUpdate(proposal.id, 'serviceStartDate', val)}
        />
      </td>

      {/* 12. Término Contrato */}
      <td className="w-36 px-2 py-1.5 border-r border-slate-100">
        <DateCell
          value={proposal.contractEndDate}
          onChange={(val) => onUpdate(proposal.id, 'contractEndDate', val)}
        />
      </td>

      {/* Quick Actions Toolbar (Olho, Lápis e Lixeira) */}
      <td className="w-24 px-2 py-1.5 text-center">
        <div className="flex items-center gap-2 justify-center">
          <button
            onClick={() => onViewHistory(proposal)}
            className="p-1 rounded text-teal-600 hover:bg-teal-50 transition-colors"
            title="Ver escopo e detalhes da proposta"
          >
            <Eye className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => onEditProposal ? onEditProposal(proposal) : onViewHistory(proposal)}
            className="p-1 rounded text-slate-900 hover:bg-blue-50 transition-colors"
            title="Editar escopo e dados da proposta (Ícone do Lápis)"
          >
            <Edit3 className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => onDelete(proposal.id)}
            className="p-1 rounded text-rose-600 hover:bg-rose-50 transition-colors"
            title="Excluir proposta"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </td>
    </tr>
  );
}
