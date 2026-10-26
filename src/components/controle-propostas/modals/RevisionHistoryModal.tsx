'use client';

import React, { useState, useEffect } from 'react';
import { Proposal } from '@/lib/proposals-types';
import { formatDate } from '@/lib/proposals-utils';
import { useValuesVisibility } from '@/lib/ValuesVisibilityContext';
import { compareProposalRevisions, ProposalDiffItem } from '@/lib/diffUtils';
import {
  X,
  History,
  Layers,
  Maximize2,
  FileText,
  Eye,
  Building2,
  Mail,
  User,
  Edit3,
  Check,
  Plus,
  Trash2,
  GitCommit,
  ArrowRight,
  Sparkles,
  DollarSign,
} from 'lucide-react';

interface RevisionHistoryModalProps {
  proposal: Proposal | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdateProposal?: (id: string | number, fieldOrData: keyof Proposal | Partial<Proposal>, value?: any) => void;
  onOpenEdit?: (proposal: Proposal) => void;
  startInEditMode?: boolean;
}

export function RevisionHistoryModal({
  proposal,
  isOpen,
  onClose,
  onUpdateProposal,
  onOpenEdit,
  startInEditMode = false,
}: RevisionHistoryModalProps) {
  const { formatCurrency } = useValuesVisibility();
  const [isEditing, setIsEditing] = useState(startInEditMode);

  useEffect(() => {
    if (isOpen) {
      setIsEditing(startInEditMode);
    }
  }, [isOpen, startInEditMode]);
  const [clientName, setClientName] = useState('');
  const [requesterName, setRequesterName] = useState('');
  const [emailsList, setEmailsList] = useState<string[]>(['']);
  const [value, setValue] = useState('0');
  const [projectArea, setProjectArea] = useState('');
  const [quantidade, setQuantidade] = useState('');
  const [unidadeMedida, setUnidadeMedida] = useState('');
  const [projectType, setProjectType] = useState('ONSHORE');
  const [observations, setObservations] = useState('');
  const [isSavedAlert, setIsSavedAlert] = useState(false);

  useEffect(() => {
    if (proposal) {
      setClientName(proposal.clientName || '');
      setRequesterName(proposal.requesterName || '');
      setValue(proposal.value !== undefined && proposal.value !== null ? proposal.value.toString() : '0');
      setProjectArea(proposal.projectArea || '');
      setQuantidade(proposal.quantidade !== undefined && proposal.quantidade !== null ? proposal.quantidade.toString() : '');
      setUnidadeMedida(proposal.unidadeMedida || '');
      setProjectType(proposal.projectType || 'ONSHORE');
      setObservations(proposal.observations || '');

      if (proposal.requesterEmails && proposal.requesterEmails.length > 0) {
        setEmailsList(proposal.requesterEmails);
      } else if (proposal.requesterEmail) {
        setEmailsList([proposal.requesterEmail]);
      } else {
        setEmailsList(['']);
      }
    }
  }, [proposal]);

  if (!isOpen || !proposal) return null;

  const handleAddEmail = () => {
    setEmailsList((prev) => [...prev, '']);
  };

  const handleRemoveEmail = (idx: number) => {
    setEmailsList((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleEmailChange = (idx: number, val: string) => {
    setEmailsList((prev) => {
      const next = [...prev];
      next[idx] = val;
      return next;
    });
  };

  const handleSaveScope = (e: React.FormEvent) => {
    e.preventDefault();
    if (proposal && onUpdateProposal) {
      const validEmails = emailsList.filter((e) => e.trim().length > 0);
      const primaryEmail = validEmails[0] || proposal.requesterEmail;

      onUpdateProposal(proposal.id, {
        clientName,
        requesterName,
        requesterEmail: primaryEmail,
        requesterEmails: validEmails,
        value: parseFloat(value.toString().replace(',', '.')) || 0,
        projectArea,
        quantidade: quantidade !== '' && quantidade !== null && quantidade !== undefined ? parseFloat(quantidade.toString().replace(',', '.')) : null,
        unidadeMedida,
        projectType,
        observations,
      } as any);

      setIsSavedAlert(true);
      setIsEditing(false);
      setTimeout(() => setIsSavedAlert(false), 2500);
    }
  };

  // Construir snapshots históricos e diferenças reais das revisões
  const realRevisionsSnapshots: Array<{
    revisionNumber: number;
    createdAt: string;
    createdBy: string;
    snapshot: Partial<Proposal>;
    notes: string;
  }> = [];

  const savedRevisions = (proposal as any).revisions || [];

  if (savedRevisions.length > 0) {
    // Adiciona os snapshots arquivados no histórico (ex: R0, R1...)
    savedRevisions.forEach((r: any) => {
      const snap = typeof r.snapshot === 'string' ? JSON.parse(r.snapshot || '{}') : (r.snapshot || {});
      const fullSnap = {
        clientName: proposal.clientName,
        requesterName: proposal.requesterName,
        requesterEmail: proposal.requesterEmail,
        value: proposal.value,
        quantidade: proposal.quantidade,
        unidadeMedida: proposal.unidadeMedida,
        projectType: proposal.projectType || 'ONSHORE',
        projectArea: proposal.projectArea || '',
        observations: proposal.observations || '',
        deliveryDate: proposal.deliveryDate,
        serviceStartDate: proposal.serviceStartDate,
        contractEndDate: proposal.contractEndDate,
        sharepointUrl: proposal.sharepointUrl,
        ...snap,
      };

      realRevisionsSnapshots.push({
        revisionNumber: r.revisionNumber,
        createdAt: r.createdAt || proposal.createdAt || new Date().toISOString(),
        createdBy: r.createdBy || proposal.techLead || 'Engenharia RBT Fundações',
        snapshot: fullSnap,
        notes: r.notes || `Versão R${r.revisionNumber} arquivada no histórico.`,
      });
    });

    // Adiciona a versão ATUAL ativa se for superior às revisões salvas
    const hasCurrentRevInSaved = savedRevisions.some((r: any) => r.revisionNumber === proposal.revision);
    if (!hasCurrentRevInSaved) {
      realRevisionsSnapshots.push({
        revisionNumber: proposal.revision,
        createdAt: proposal.updatedAt || new Date().toISOString(),
        createdBy: proposal.techLead || 'Engenharia RBT Fundações',
        snapshot: {
          value: proposal.value,
          quantidade: proposal.quantidade,
          unidadeMedida: proposal.unidadeMedida,
          projectType: proposal.projectType || projectType || 'ONSHORE',
          projectArea: proposal.projectArea || projectArea || '',
          clientName: proposal.clientName || clientName,
          requesterName: proposal.requesterName || requesterName,
          requesterEmail: proposal.requesterEmail || (emailsList[0] || ''),
          status: proposal.status,
          deliveryDate: proposal.deliveryDate,
          serviceStartDate: proposal.serviceStartDate,
          contractEndDate: proposal.contractEndDate,
          sharepointUrl: proposal.sharepointUrl,
          observations: proposal.observations || observations || `Versão R${proposal.revision} ativa.`,
        },
        notes: 'Versão ativa atualmente em andamento no quadro.',
      });
    }
  } else {
    // Se ainda não houver revisões salvas no histórico, exibe R0 inicial com dados completos
    realRevisionsSnapshots.push({
      revisionNumber: 0,
      createdAt: proposal.createdAt || new Date().toISOString(),
      createdBy: proposal.techLead || 'Engenharia RBT Fundações',
      snapshot: {
        value: proposal.value,
        quantidade: proposal.quantidade,
        unidadeMedida: proposal.unidadeMedida,
        projectType: proposal.projectType || projectType || 'ONSHORE',
        projectArea: proposal.projectArea || projectArea || '',
        clientName: proposal.clientName || clientName,
        requesterName: proposal.requesterName || requesterName,
        requesterEmail: proposal.requesterEmail || (emailsList[0] || ''),
        status: proposal.status || 'NEW',
        deliveryDate: proposal.deliveryDate,
        serviceStartDate: proposal.serviceStartDate,
        contractEndDate: proposal.contractEndDate,
        sharepointUrl: proposal.sharepointUrl,
        observations: proposal.observations || observations || 'Versão R0 inicial criada.',
      },
      notes: 'Versão inicial enviada para orçamento (R0).',
    });

    if (proposal.revision > 0) {
      realRevisionsSnapshots.push({
        revisionNumber: proposal.revision,
        createdAt: proposal.updatedAt || new Date().toISOString(),
        createdBy: proposal.techLead || 'Engenharia RBT Fundações',
        snapshot: {
          value: proposal.value,
          quantidade: proposal.quantidade,
          unidadeMedida: proposal.unidadeMedida,
          projectType: proposal.projectType || projectType || 'ONSHORE',
          projectArea: proposal.projectArea || projectArea || '',
          clientName: proposal.clientName || clientName,
          requesterName: proposal.requesterName || requesterName,
          requesterEmail: proposal.requesterEmail || (emailsList[0] || ''),
          status: proposal.status,
          deliveryDate: proposal.deliveryDate,
          serviceStartDate: proposal.serviceStartDate,
          contractEndDate: proposal.contractEndDate,
          sharepointUrl: proposal.sharepointUrl,
          observations: proposal.observations || observations || `Versão R${proposal.revision} ativa.`,
        },
        notes: 'Versão ativa atualmente em andamento no quadro.',
      });
    }
  }

  // Ordenar da revisão mais recente (R_max) para a mais antiga (R0)
  const orderedRevisions = [...realRevisionsSnapshots].reverse();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-3 md:p-6 overflow-hidden">
      {/* White Modal Container (Constrained max-h-[90vh] flex flex-col) */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden my-auto">
        {/* Modal Fixed Header */}
        <div className="p-4 md:p-5 border-b border-slate-200 flex items-center justify-between shrink-0 bg-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-900 flex items-center justify-center font-bold shadow-xs border border-[#93C5FD]">
              <Eye className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-extrabold text-black">
                  Escopo & Histórico de Modificações — {proposal.code}
                </h2>
                {isSavedAlert && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-emerald-100 text-emerald-700 border border-emerald-300 flex items-center gap-1 animate-in fade-in">
                    <Check className="w-3 h-3" /> Salvo com sucesso!
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-900 font-extrabold mt-0.5 flex items-center gap-2 flex-wrap">
                <span>Cliente: <span className="font-extrabold text-black uppercase">{proposal.clientName}</span></span>
                <span>|</span>
                <span>Revisão Atual: <span className="font-extrabold text-slate-900">R{proposal.revision}</span></span>
                <span>|</span>
                <span>Valor Total: <span className="font-extrabold text-emerald-700">{formatCurrency(proposal.value)}</span></span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-500 hover:text-black hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 text-xs">
          {/* SECTION 1: FICHA TÉCNICA DO ESCOPO (COM LÁPIS SVG E EDIÇÃO DIRETA) */}
          <div className="p-4 bg-[#EAF2FB]/80 border border-[#93C5FD] rounded-2xl space-y-3.5">
          <div className="font-extrabold text-slate-900 flex items-center justify-between uppercase text-xs tracking-wide border-b border-[#93C5FD]/40 pb-2">
            <span className="flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-slate-900" />
              Ficha Técnica do Escopo & Solicitante
            </span>

            {/* ÍCONE DO LÁPIS SVG PARA EDITAR A FICHA TÉCNICA (SOLICITADO NA IMAGEM) */}
            <button
              type="button"
              onClick={() => setIsEditing(!isEditing)}
              className="px-2.5 py-1 rounded-lg bg-white text-slate-900 hover:bg-[#D4E5F9] border border-[#93C5FD] shadow-2xs flex items-center gap-1.5 text-xs font-extrabold transition-all"
              title="Clique no Ícone do Lápis para Editar a Ficha Técnica"
            >
              <Edit3 className="w-4 h-4 text-slate-900" />
              <span>{isEditing ? 'Cancelar Edição' : 'Editar Ficha'}</span>
            </button>
          </div>

          {/* EDIT MODE FORM */}
          {isEditing ? (
            <form onSubmit={handleSaveScope} className="space-y-3 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Empresa Cliente */}
                <div>
                  <label className="block font-extrabold text-black mb-1 flex items-center gap-1">
                    <Building2 className="w-3.5 h-3.5 text-slate-900" />
                    <span>Empresa Cliente</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    placeholder="Ex: Klabin S.A., Vale S.A..."
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-extrabold text-black uppercase focus:ring-2 focus:ring-[#BA1A1A]"
                  />
                </div>

                {/* Contato Solicitante */}
                <div>
                  <label className="block font-extrabold text-black mb-1 flex items-center gap-1">
                    <User className="w-3.5 h-3.5 text-slate-900" />
                    <span>Contato Solicitante</span>
                  </label>
                  <input
                    type="text"
                    value={requesterName}
                    onChange={(e) => setRequesterName(e.target.value)}
                    placeholder="Ex: Fernanda Oliveira"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-bold text-black focus:ring-2 focus:ring-[#BA1A1A]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* E-mails do Solicitante */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="block font-extrabold text-black flex items-center gap-1">
                      <Mail className="w-3.5 h-3.5 text-slate-900" />
                      <span>E-mails do Solicitante ({emailsList.length})</span>
                    </label>
                    <button
                      type="button"
                      onClick={handleAddEmail}
                      className="text-[11px] font-extrabold text-slate-900 hover:underline"
                    >
                      + Adicionar E-mail
                    </button>
                  </div>

                  <div className="space-y-1.5">
                    {emailsList.map((em, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <input
                          type="email"
                          value={em}
                          onChange={(e) => handleEmailChange(idx, e.target.value)}
                          placeholder={`E-mail ${idx + 1}...`}
                          className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg font-mono text-black text-xs focus:ring-2 focus:ring-[#BA1A1A]"
                        />
                        {emailsList.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveEmail(idx)}
                            className="p-1.5 rounded text-rose-600 hover:bg-rose-100"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Valor Total da Proposta */}
                <div>
                  <label className="block font-extrabold text-black mb-1 flex items-center gap-1">
                    <DollarSign className="w-3.5 h-3.5 text-[#059669]" />
                    <span>Valor Total da Proposta (R$)</span>
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    placeholder="Ex: 250000"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-extrabold text-[#059669] text-sm focus:ring-2 focus:ring-[#059669]"
                  />
                </div>
              </div>

              {/* Escopo: Quantidade, Unidade, Valor Unitário e Tipo de Projeto */}
              <div className="p-3 bg-[#EAF2FB] border border-[#93C5FD] rounded-xl space-y-3">
                <div className="font-extrabold text-slate-900 flex items-center gap-1.5 uppercase text-[11px] tracking-wide">
                  <Layers className="w-4 h-4 text-slate-900" />
                  <span>Escopo & Especificações do Projeto</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block font-extrabold text-black mb-1 flex items-center gap-1 text-[10px] uppercase">
                        <Maximize2 className="w-3.5 h-3.5 text-slate-900" />
                        <span>Quantidade</span>
                      </label>
                      <input
                        type="number"
                        step="any"
                        value={quantidade}
                        onChange={(e) => setQuantidade(e.target.value)}
                        placeholder="Ex: 2500"
                        className="w-full px-2 py-2 bg-white border border-slate-300 rounded-lg font-bold text-black focus:ring-2 focus:ring-[#BA1A1A] text-xs"
                      />
                    </div>
                    <div>
                      <label className="block font-extrabold text-black mb-1 flex items-center gap-1 text-[10px] uppercase">
                        <span>Unid. Medida</span>
                      </label>
                      <input
                        type="text"
                        value={unidadeMedida}
                        onChange={(e) => setUnidadeMedida(e.target.value)}
                        placeholder="Ex: m²"
                        className="w-full px-2 py-2 bg-white border border-slate-300 rounded-lg font-bold text-black focus:ring-2 focus:ring-[#BA1A1A] text-xs"
                      />
                    </div>
                    <div>
                      <label className="block font-extrabold text-black mb-1 flex items-center gap-1 text-[10px] uppercase">
                        <span>Valor Unit.</span>
                      </label>
                      <input
                        type="text"
                        readOnly
                        value={quantidade && parseFloat(quantidade) > 0 ? (parseFloat(value || '0') / parseFloat(quantidade)).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : 'R$ 0,00'}
                        className="w-full px-2 py-2 bg-slate-100 border border-slate-300 rounded-lg font-bold text-slate-500 text-xs cursor-not-allowed"
                      />
                    </div>
                  </div>

                  {/* Tipo de Projeto */}
                  <div>
                    <label className="block font-extrabold text-black mb-1 flex items-center gap-1 text-[10px] uppercase">
                      <Layers className="w-3.5 h-3.5 text-slate-900" />
                      <span>Tipo de Projeto (CPU)</span>
                    </label>
                    <select
                      value={projectType}
                      onChange={(e) => {
                        if (e.target.value === '__CUSTOM__') {
                          const typed = prompt('Digite o novo Tipo de Projeto:');
                          if (typed && typed.trim()) {
                            setProjectType(typed.trim().toUpperCase());
                          }
                        } else {
                          setProjectType(e.target.value);
                        }
                      }}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-extrabold text-black uppercase focus:ring-2 focus:ring-[#BA1A1A]"
                    >
                      <option value="ONSHORE">ONSHORE</option>
                      <option value="OFFSHORE">OFFSHORE</option>
                      <option value="TERRAPLANAGEM">TERRAPLANAGEM</option>
                      {projectType && !['ONSHORE', 'OFFSHORE', 'TERRAPLANAGEM'].includes(projectType) && (
                        <option value={projectType}>{projectType}</option>
                      )}
                      <option value="__CUSTOM__">+ Outro (Personalizado)...</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Observações */}
              <div>
                <label className="block font-extrabold text-black mb-1 flex items-center gap-1">
                  <FileText className="w-3.5 h-3.5 text-slate-900" />
                  <span>Observações & Especificações Técnicas</span>
                </label>
                <textarea
                  rows={3}
                  value={observations}
                  onChange={(e) => setObservations(e.target.value)}
                  placeholder="Observações do projeto..."
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-bold text-black focus:ring-2 focus:ring-[#BA1A1A]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-[#BA1A1A] hover:bg-[#093D75] text-white text-xs font-extrabold rounded-lg shadow-md flex items-center gap-1"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Salvar Ficha Técnica</span>
                </button>
              </div>
            </form>
          ) : (
            /* READ-ONLY VIEW MODE */
            <div className="space-y-3.5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                {/* Empresa Cliente */}
                <div className="p-2.5 rounded-xl bg-white border border-slate-200">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5 flex items-center gap-1">
                    <Building2 className="w-3 h-3 text-slate-900" />
                    Empresa Cliente
                  </span>
                  <span className="font-extrabold text-black uppercase text-sm">{proposal.clientName || '-'}</span>
                </div>

                {/* Contato Solicitante */}
                <div className="p-2.5 rounded-xl bg-white border border-slate-200">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5 flex items-center gap-1">
                    <User className="w-3 h-3 text-slate-900" />
                    Contato Solicitante
                  </span>
                  <span className="font-extrabold text-black">{proposal.requesterName || '-'}</span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                {/* E-mails do Solicitante */}
                <div className="p-2.5 rounded-xl bg-white border border-slate-200 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block flex items-center gap-1">
                    <Mail className="w-3 h-3 text-slate-900" />
                    E-mails do Solicitante ({emailsList.length})
                  </span>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {emailsList.map((em, idx) => (
                      <span key={idx} className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-900 font-mono text-xs font-bold border border-[#93C5FD]">
                        {em}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Valor Total da Proposta */}
                <div className="p-2.5 rounded-xl bg-emerald-50/80 border border-emerald-300 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-emerald-800 block flex items-center gap-1">
                    <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                    Valor Total da Proposta
                  </span>
                  <span className="font-extrabold text-emerald-700 text-base block pt-0.5">
                    {formatCurrency(proposal.value)}
                  </span>
                </div>
              </div>

              {/* ESCOPO & ESPECIFICAÇÕES DO PROJETO (IGUAL AO MODAL DE NOVA PROPOSTA) */}
              <div className="p-3 bg-[#EAF2FB] border border-[#93C5FD] rounded-xl space-y-3">
                <div className="font-extrabold text-slate-900 flex items-center gap-1.5 uppercase text-[11px] tracking-wide">
                  <Layers className="w-4 h-4 text-slate-900" />
                  <span>Escopo & Especificações do Projeto</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="grid grid-cols-3 gap-2">
                    {/* QUANTIDADE */}
                    <div className="bg-white p-2 rounded-lg border border-slate-300">
                      <span className="block font-extrabold text-black mb-1 flex items-center gap-1 text-[10px] uppercase">
                        <Maximize2 className="w-3.5 h-3.5 text-slate-900" />
                        <span>Quantidade</span>
                      </span>
                      <span className="font-bold text-black text-sm block truncate">
                        {proposal.quantidade !== undefined && proposal.quantidade !== null && Number(proposal.quantidade) > 0
                          ? Number(proposal.quantidade).toLocaleString('pt-BR')
                          : '-'}
                      </span>
                    </div>

                    {/* UNID. MEDIDA */}
                    <div className="bg-white p-2 rounded-lg border border-slate-300">
                      <span className="block font-extrabold text-black mb-1 text-[10px] uppercase">
                        Unid. Medida
                      </span>
                      <span className="font-bold text-black text-sm block truncate">
                        {proposal.unidadeMedida || '-'}
                      </span>
                    </div>

                    {/* VALOR P/ QUANT. */}
                    <div className="bg-slate-100 p-2 rounded-lg border border-slate-300">
                      <span className="block font-extrabold text-black mb-1 text-[10px] uppercase">
                        Valor p/ Quant.
                      </span>
                      <span className="font-bold text-slate-900 text-sm block truncate">
                        {proposal.quantidade && Number(proposal.quantidade) > 0 && proposal.value
                          ? (Number(proposal.value) / Number(proposal.quantidade)).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
                          : 'R$ 0,00'}
                      </span>
                    </div>
                  </div>

                  {/* TIPO DE PROJETO (CPU) */}
                  <div className="bg-white p-2 rounded-lg border border-slate-300">
                    <span className="block font-extrabold text-black mb-1 flex items-center gap-1 text-[10px] uppercase">
                      <Layers className="w-3.5 h-3.5 text-slate-900" />
                      <span>Tipo de Projeto (CPU)</span>
                    </span>
                    <span className="font-extrabold text-slate-900 uppercase text-sm block">
                      {proposal.projectType || 'ONSHORE'}
                    </span>
                  </div>
                </div>

                {/* OBSERVAÇÕES & ESPECIFICAÇÕES TÉCNICAS */}
                <div>
                  <label className="block font-extrabold text-black mb-1 flex items-center gap-1 text-[10px] uppercase">
                    <FileText className="w-3.5 h-3.5 text-slate-900" />
                    <span>Observações & Especificações Técnicas</span>
                  </label>
                  <div className="w-full p-2.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-black min-h-[45px]">
                    {proposal.observations || 'Nenhuma observação cadastrada para este projeto.'}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* SECTION 2: LINHA DO TEMPO DE REVISÕES COM O QUE FOI MODIFICADO (DIFF COMPARATIVO) */}
        <div className="space-y-4 pt-2 border-t border-slate-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-black">
              <History className="w-4 h-4 text-slate-900" />
              <span>Linha do Tempo de Revisões & Histórico de Modificações:</span>
            </div>
            <span className="text-[11px] font-extrabold text-slate-900 bg-[#EAF2FB] px-2.5 py-0.5 rounded-full border border-[#93C5FD]">
              {orderedRevisions.length} versões registradas
            </span>
          </div>

          <div className="space-y-4 relative before:absolute before:left-4 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
            {orderedRevisions.map((item, idx) => {
              // Comparar a versão atual com a versão imediatamente anterior (item anterior na lista ordenada de trás para frente)
              const prevItem = orderedRevisions[idx + 1];
              const diffs: ProposalDiffItem[] = prevItem
                ? compareProposalRevisions(prevItem.snapshot, item.snapshot)
                : [];

              const isLatest = idx === 0;

              return (
                <div
                  key={item.revisionNumber}
                  className={`relative pl-9 p-4 rounded-2xl border transition-all ${
                    isLatest
                      ? 'bg-[#EAF2FB]/70 border-2 border-[#2563EB] shadow-xs'
                      : 'bg-slate-50/80 border-slate-200'
                  }`}
                >
                  <div className={`absolute left-2.5 top-5 w-3.5 h-3.5 rounded-full border-2 border-white ${isLatest ? 'bg-[#2563EB] ring-4 ring-blue-100' : 'bg-slate-400'}`} />

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-black text-sm text-black">
                        Revisão R{item.revisionNumber}
                      </span>
                      {isLatest && (
                        <span className="px-2.5 py-0.5 rounded text-[10px] font-black bg-[#2563EB] text-white uppercase tracking-wider">
                          Versão Ativa Atual
                        </span>
                      )}
                    </div>
                    <span className="text-sm font-extrabold text-[#059669]">
                      {formatCurrency(item.snapshot.value || proposal.value)}
                    </span>
                  </div>

                  <div className="text-xs text-black font-semibold mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1">
                    <span>Autor: <strong className="font-extrabold text-black">{item.createdBy}</strong></span>
                    <span>Data: <strong className="font-extrabold text-black">{formatDate(item.createdAt)}</strong></span>
                  </div>

                  {/* BLOCO DE MODIFICAÇÕES REALIZADAS (SOLICITADO PELO USUÁRIO) */}
                  {diffs.length > 0 ? (
                    <div className="mt-3 p-3 bg-white border border-[#93C5FD] rounded-xl space-y-2 shadow-2xs">
                      <div className="text-[11px] font-extrabold text-slate-900 uppercase tracking-wide flex items-center gap-1.5 border-b border-slate-100 pb-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                        <span>O que foi modificado nesta revisão ({diffs.length} alterações):</span>
                      </div>

                      <div className="space-y-1.5 text-xs font-semibold">
                        {diffs.map((d, i) => (
                          <div
                            key={i}
                            className="flex flex-wrap items-center gap-2 bg-[#F8FAFC] px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-800"
                          >
                            <span className="font-extrabold text-slate-900 text-[11px] uppercase">
                              • {d.fieldLabel}:
                            </span>
                            <span className="line-through text-rose-500 font-mono text-[11px]">
                              {d.oldValue}
                            </span>
                            <ArrowRight className="w-3 h-3 text-slate-400 shrink-0" />
                            <span className="font-extrabold text-emerald-700 font-mono text-[11px]">
                              {d.newValue}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-black font-medium mt-2 bg-white p-2.5 rounded-lg border border-slate-200 shadow-2xs">
                      {item.notes}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
          </div>
        </div>

        {/* Modal Fixed Footer */}
        <div className="p-4 border-t border-slate-100 flex items-center justify-end gap-2 shrink-0 bg-slate-50">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-[#0C1E38] hover:bg-[#1F2937] text-white text-xs font-extrabold rounded-xl shadow-md transition-all"
          >
            Concluir
          </button>
        </div>
      </div>
    </div>
  );
}
