'use client';

import React, { useState, useEffect } from 'react';
import { Proposal, ProposalStatus, STATUS_CONFIGS } from '@/lib/proposals-types';
import { GoogleDatePicker } from '@/components/ui/GoogleDatePicker';
import { formatDate } from '@/lib/proposals-utils';
import { X, Check, Edit3, Building2, User, Mail, Calendar, DollarSign, Layers, Maximize2, FileText, Plus, Trash2 } from 'lucide-react';

interface EditProposalModalProps {
  proposal: Proposal | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedProposalData: Partial<Proposal>) => void;
}

export function EditProposalModal({ proposal, isOpen, onClose, onSave }: EditProposalModalProps) {
  const [code, setCode] = useState('');
  const [status, setStatus] = useState<ProposalStatus>('NEW');
  const [clientName, setClientName] = useState('');
  const [requesterName, setRequesterName] = useState('');
  const [requesterEmail, setRequesterEmail] = useState('');
  const [requesterEmails, setRequesterEmails] = useState<string[]>([]);
  const [deliveryDate, setDeliveryDate] = useState('');
  const [serviceStartDate, setServiceStartDate] = useState<string | null>('');
  const [contractEndDate, setContractEndDate] = useState<string | null>('');
  const [techLead, setTechLead] = useState('');
  const [commLead, setCommLead] = useState('');
  const [value, setValue] = useState('0');
  const [quantidade, setQuantidade] = useState('');
  const [unidadeMedida, setUnidadeMedida] = useState('');
  const [projectType, setProjectType] = useState('ONSHORE');
  const [observations, setObservations] = useState('');

  const [openDatePicker, setOpenDatePicker] = useState<'delivery' | 'service' | 'contract' | null>(null);

  useEffect(() => {
    if (proposal) {
      setCode(proposal.code || '');
      setStatus(proposal.status || 'NEW');
      setClientName(proposal.clientName || '');
      setRequesterName(proposal.requesterName || '');
      setRequesterEmail(proposal.requesterEmail || '');
      setDeliveryDate(proposal.deliveryDate || '');
      setServiceStartDate(proposal.serviceStartDate || '');
      setContractEndDate(proposal.contractEndDate || '');
      setTechLead(proposal.techLead || '');
      setCommLead(proposal.commLead || '');
      setValue(proposal.value ? proposal.value.toString() : '0');
      setQuantidade(proposal.quantidade ? proposal.quantidade.toString() : '');
      setUnidadeMedida(proposal.unidadeMedida || '');
      setProjectType(proposal.projectType || 'ONSHORE');
      setObservations(proposal.observations || '');

      if (proposal.requesterEmails && proposal.requesterEmails.length > 0) {
        setRequesterEmails(proposal.requesterEmails);
      } else if (proposal.requesterEmail) {
        setRequesterEmails([proposal.requesterEmail]);
      } else {
        setRequesterEmails(['']);
      }
    }
  }, [proposal]);

  if (!isOpen || !proposal) return null;

  const handleAddEmail = () => {
    setRequesterEmails((prev) => [...prev, '']);
  };

  const handleRemoveEmail = (idx: number) => {
    setRequesterEmails((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleEmailChange = (idx: number, val: string) => {
    setRequesterEmails((prev) => {
      const next = [...prev];
      next[idx] = val;
      return next;
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const validEmails = requesterEmails.filter((em) => em.trim().length > 0);
    const primaryEmail = validEmails[0] || requesterEmail;

    onSave({
      code,
      status,
      clientName,
      requesterName,
      requesterEmail: primaryEmail,
      requesterEmails: validEmails,
      deliveryDate,
      serviceStartDate: serviceStartDate || null,
      contractEndDate: contractEndDate || null,
      techLead,
      commLead,
      value: parseFloat(value) || 0,
      quantidade: quantidade ? parseFloat(quantidade.replace(',', '.')) : 0,
      unidadeMedida,
      projectType,
      observations,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-3 md:p-6 overflow-hidden">
      {/* White Modal Container (Constrained max-h-[90vh] flex flex-col) */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden my-auto">
        {/* Modal Fixed Header */}
        <div className="p-4 md:p-5 border-b border-slate-200 flex items-center justify-between shrink-0 bg-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-900 flex items-center justify-center font-bold shadow-xs border border-[#93C5FD]">
              <Edit3 className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-black">
                Editar Proposta & Escopo — {proposal.code}
              </h2>
              <p className="text-xs text-slate-600 font-medium">
                Altere os campos da proposta comercial e salve as modificações.
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 text-xs">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Código */}
              <div>
                <label className="block font-extrabold text-black mb-1">
                  Código da Proposta *
                </label>
                <input
                  type="text"
                  required
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-mono font-extrabold text-slate-900 focus:ring-2 focus:ring-[#BA1A1A]"
                />
              </div>

              {/* Status / Grupo */}
              <div>
                <label className="block font-extrabold text-black mb-1">
                  Status / Estágio Comercial
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as ProposalStatus)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-bold text-black focus:ring-2 focus:ring-[#BA1A1A]"
                >
                  {Object.entries(STATUS_CONFIGS).map(([k, cfg]) => (
                    <option key={k} value={k}>
                      {cfg.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Cliente */}
              <div>
                <label className="block font-extrabold text-black mb-1 flex items-center gap-1">
                  <Building2 className="w-3.5 h-3.5 text-slate-900" />
                  <span>Empresa Cliente *</span>
                </label>
                <input
                  type="text"
                  required
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="Ex: Vale S.A., Klabin..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-bold text-black uppercase focus:ring-2 focus:ring-[#BA1A1A]"
                />
              </div>

              {/* Contato Solicitante */}
              <div>
                <label className="block font-extrabold text-black mb-1 flex items-center gap-1">
                  <User className="w-3.5 h-3.5 text-slate-900" />
                  <span>Contato Solicitante (Nome)</span>
                </label>
                <input
                  type="text"
                  value={requesterName}
                  onChange={(e) => setRequesterName(e.target.value)}
                  placeholder="Ex: Eng. Ricardo Mendes"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-bold text-black focus:ring-2 focus:ring-[#BA1A1A]"
                />
              </div>
            </div>

            {/* E-mails do Solicitante (Múltiplos) */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <label className="block font-extrabold text-black flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5 text-slate-900" />
                  <span>E-mails do Solicitante ({requesterEmails.length})</span>
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
                {requesterEmails.map((em, idx) => (
                  <div key={idx} className="flex items-center gap-1.5">
                    <input
                      type="email"
                      value={em}
                      onChange={(e) => handleEmailChange(idx, e.target.value)}
                      placeholder={`E-mail ${idx + 1}...`}
                      className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg font-mono text-black text-xs focus:ring-2 focus:ring-[#BA1A1A]"
                    />
                    {requesterEmails.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveEmail(idx)}
                        className="p-1 rounded text-rose-600 hover:bg-rose-100"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* ESCOPO DO PROJETO */}
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
                      className="w-full px-2 py-2 bg-white border border-slate-300 rounded-lg font-bold text-black focus:ring-2 focus:ring-[#BA1A1A] text-sm"
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
                      className="w-full px-2 py-2 bg-white border border-slate-300 rounded-lg font-bold text-black focus:ring-2 focus:ring-[#BA1A1A] text-sm"
                    />
                  </div>
                  <div>
                    <label className="block font-extrabold text-black mb-1 flex items-center gap-1 text-[10px] uppercase">
                      <span>Valor p/ Quant.</span>
                    </label>
                    <input
                      type="text"
                      readOnly
                      value={quantidade && parseFloat(quantidade) > 0 ? (parseFloat(value || '0') / parseFloat(quantidade)).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : 'R$ 0,00'}
                      className="w-full px-2 py-2 bg-slate-100 border border-slate-300 rounded-lg font-bold text-slate-500 text-sm cursor-not-allowed"
                    />
                  </div>
                </div>

                {/* Tipo de Projeto (CPU) */}
                <div>
                  <label className="block font-extrabold text-black mb-1 flex items-center gap-1">
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
                  placeholder="Insira detalhes sobre o escopo, fornecimento de materiais, prazos e restrições..."
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-bold text-black focus:ring-2 focus:ring-[#BA1A1A]"
                />
              </div>
            </div>

            {/* Google Calendar Date Pickers Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* 1. Data Entrega */}
              <div className="relative">
                <label className="block font-extrabold text-black mb-1 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-orange-600" />
                  <span>Data de Entrega *</span>
                </label>
                <button
                  type="button"
                  onClick={() => setOpenDatePicker(openDatePicker === 'delivery' ? null : 'delivery')}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-bold text-black text-left flex items-center justify-between hover:bg-[#E8F0FE]"
                >
                  <span>{formatDate(deliveryDate)}</span>
                  <Calendar className="w-4 h-4 text-[#1A73E8]" />
                </button>
                {openDatePicker === 'delivery' && (
                  <div className="absolute left-0 top-full mt-1 z-50">
                    <GoogleDatePicker
                      value={deliveryDate}
                      onChange={(val) => {
                        if (val) setDeliveryDate(val);
                        setOpenDatePicker(null);
                      }}
                      onClose={() => setOpenDatePicker(null)}
                    />
                  </div>
                )}
              </div>

              {/* 2. Início Serviço */}
              <div className="relative">
                <label className="block font-extrabold text-black mb-1">
                  Início do Serviço
                </label>
                <button
                  type="button"
                  onClick={() => setOpenDatePicker(openDatePicker === 'service' ? null : 'service')}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-bold text-black text-left flex items-center justify-between hover:bg-[#E8F0FE]"
                >
                  <span>{formatDate(serviceStartDate)}</span>
                  <Calendar className="w-4 h-4 text-[#1A73E8]" />
                </button>
                {openDatePicker === 'service' && (
                  <div className="absolute left-0 top-full mt-1 z-50">
                    <GoogleDatePicker
                      value={serviceStartDate}
                      onChange={(val) => {
                        setServiceStartDate(val);
                        setOpenDatePicker(null);
                      }}
                      onClose={() => setOpenDatePicker(null)}
                    />
                  </div>
                )}
              </div>

              {/* 3. Término Contrato */}
              <div className="relative">
                <label className="block font-extrabold text-black mb-1">
                  Término do Contrato
                </label>
                <button
                  type="button"
                  onClick={() => setOpenDatePicker(openDatePicker === 'contract' ? null : 'contract')}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-bold text-black text-left flex items-center justify-between hover:bg-[#E8F0FE]"
                >
                  <span>{formatDate(contractEndDate)}</span>
                  <Calendar className="w-4 h-4 text-[#1A73E8]" />
                </button>
                {openDatePicker === 'contract' && (
                  <div className="absolute left-0 top-full mt-1 z-50">
                    <GoogleDatePicker
                      value={contractEndDate}
                      onChange={(val) => {
                        setContractEndDate(val);
                        setOpenDatePicker(null);
                      }}
                      onClose={() => setOpenDatePicker(null)}
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Resp. Técnica */}
              <div>
                <label className="block font-extrabold text-black mb-1">
                  Responsável Técnica
                </label>
                <input
                  type="text"
                  value={techLead}
                  onChange={(e) => setTechLead(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-bold text-black focus:ring-2 focus:ring-[#BA1A1A]"
                />
              </div>

              {/* Resp. Comercial */}
              <div>
                <label className="block font-extrabold text-black mb-1">
                  Responsável Comercial
                </label>
                <input
                  type="text"
                  value={commLead}
                  onChange={(e) => setCommLead(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-bold text-black focus:ring-2 focus:ring-[#BA1A1A]"
                />
              </div>

              {/* Valor */}
              <div>
                <label className="block font-extrabold text-black mb-1 flex items-center gap-1">
                  <DollarSign className="w-3.5 h-3.5 text-[#059669]" />
                  <span>Valor Total (R$)</span>
                </label>
                <input
                  type="number"
                  step="1000"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-extrabold text-[#059669] focus:ring-2 focus:ring-[#059669]"
                />
              </div>
            </div>
          </div>

          {/* Modal Fixed Footer */}
          <div className="p-4 border-t border-slate-200 flex items-center justify-end gap-3 shrink-0 bg-slate-50">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-300 text-black font-extrabold hover:bg-slate-100"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-[#0C1E38] hover:bg-[#1F2937] text-white font-extrabold rounded-xl shadow-md flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>Salvar Alterações</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
