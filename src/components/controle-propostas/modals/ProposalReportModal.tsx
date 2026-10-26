'use client';

import React from 'react';
import { Proposal, STATUS_CONFIGS } from '@/lib/proposals-types';
import { formatDate } from '@/lib/proposals-utils';
import { useValuesVisibility } from '@/lib/ValuesVisibilityContext';
import { X, Printer, Download, TrendingUp, CheckCircle2, Clock, RefreshCw, Building2, ShieldCheck } from 'lucide-react';

interface ProposalReportModalProps {
  proposals: Proposal[];
  isOpen: boolean;
  onClose: () => void;
}

export function ProposalReportModal({ proposals, isOpen, onClose }: ProposalReportModalProps) {
  const { formatCurrency } = useValuesVisibility();
  if (!isOpen) return null;

  // Filter only WON, IN_PROGRESS, IN_REVISION
  const reportProposals = proposals.filter((p) =>
    ['WON', 'IN_PROGRESS', 'IN_REVISION'].includes(p.status)
  );

  const wonProposals = reportProposals.filter((p) => p.status === 'WON');
  const inProgressProposals = reportProposals.filter((p) => p.status === 'IN_PROGRESS');
  const inRevisionProposals = reportProposals.filter((p) => p.status === 'IN_REVISION');

  const totalValue = reportProposals.reduce((sum, p) => sum + (p.value || 0), 0);
  const wonValue = wonProposals.reduce((sum, p) => sum + (p.value || 0), 0);
  const inProgressValue = inProgressProposals.reduce((sum, p) => sum + (p.value || 0), 0);
  const inRevisionValue = inRevisionProposals.reduce((sum, p) => sum + (p.value || 0), 0);

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    const headers = ['Codigo', 'Status', 'Cliente', 'Solicitante', 'DataEntrega', 'RespTecnica', 'RespComercial', 'Valor_RS'];
    const rows = reportProposals.map((p) => [
      p.code,
      STATUS_CONFIGS[p.status]?.label || p.status,
      `"${p.clientName}"`,
      `"${p.requesterName}"`,
      p.deliveryDate || '-',
      `"${p.techLead}"`,
      `"${p.commLead}"`,
      p.value || 0,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `relatorio_piatec_propostas_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 overflow-y-auto print:p-0 print:bg-white">
      {/* Modal Container */}
      <div className="bg-white border border-slate-200 rounded-3xl shadow-2xl max-w-4xl w-full p-6 md:p-8 space-y-6 my-8 print:border-none print:shadow-none print:max-w-none print:w-full print:p-0">
        
        {/* Header Branding & Modal Controls */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-900 flex items-center justify-center font-bold shadow-xs border border-[#93C5FD]">
              <TrendingUp className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-lg tracking-tight text-[#0C1E38] font-sans lowercase">
                  piatec
                </span>
                <span className="w-2 h-2 rounded-full bg-orange-500 inline-block" />
                <span className="text-xs font-extrabold text-slate-400 uppercase tracking-widest">
                  Relatório Executivo
                </span>
              </div>
              <h2 className="text-xl font-black text-black tracking-tight">
                Relatório de Propostas Ganhas, Em Elaboração e Em Revisão
              </h2>
              <p className="text-xs text-slate-600 font-medium">
                Gerado em: {formatDate(new Date().toISOString())} | Total de {reportProposals.length} propostas analisadas
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 print:hidden">
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 px-3 py-2 bg-[#EAF2FB] hover:bg-[#D4E5F9] text-slate-900 font-extrabold rounded-xl text-xs border border-[#93C5FD] transition-all shadow-2xs"
              title="Baixar em formato CSV / Excel"
            >
              <Download className="w-4 h-4" />
              <span>Exportar CSV</span>
            </button>

            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-[#0C1E38] hover:bg-[#1F2937] text-white font-extrabold rounded-xl text-xs transition-all shadow-md"
              title="Imprimir ou Salvar PDF"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir / PDF</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-black hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Executive Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Card Total */}
          <div className="p-4 rounded-2xl bg-slate-900 text-white space-y-1 shadow-md">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-300">
              Pipeline Total Selecionado
            </div>
            <div className="text-lg font-black text-white">
              {formatCurrency(totalValue)}
            </div>
            <div className="text-[11px] text-slate-300 font-semibold">
              {reportProposals.length} propostas ativas
            </div>
          </div>

          {/* Card Ganhas */}
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 space-y-1 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-800">
                Propostas Ganhas
              </span>
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-lg font-black text-emerald-950">
              {formatCurrency(wonValue)}
            </div>
            <div className="text-[11px] text-emerald-700 font-bold">
              {wonProposals.length} propostas fechadas
            </div>
          </div>

          {/* Card Em Elaboração */}
          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 space-y-1 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-amber-800">
                Em Elaboração
              </span>
              <Clock className="w-4 h-4 text-amber-600" />
            </div>
            <div className="text-lg font-black text-amber-950">
              {formatCurrency(inProgressValue)}
            </div>
            <div className="text-[11px] text-amber-700 font-bold">
              {inProgressProposals.length} propostas em orçamento
            </div>
          </div>

          {/* Card Em Revisão */}
          <div className="p-4 rounded-2xl bg-orange-50 border border-orange-200 text-orange-900 space-y-1 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-orange-800">
                Em Revisão
              </span>
              <RefreshCw className="w-4 h-4 text-orange-600" />
            </div>
            <div className="text-lg font-black text-orange-950">
              {formatCurrency(inRevisionValue)}
            </div>
            <div className="text-[11px] text-orange-700 font-bold">
              {inRevisionProposals.length} propostas em ajuste
            </div>
          </div>
        </div>

        {/* Breakdown Tables */}
        <div className="space-y-6">
          {/* Section 1: Propostas Ganhas */}
          {wonProposals.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs font-extrabold text-emerald-800 uppercase tracking-wide">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 inline-block" />
                <span>1. Propostas Ganhas ({wonProposals.length}) — Total: {formatCurrency(wonValue)}</span>
              </div>
              <div className="overflow-x-auto rounded-xl border border-emerald-200">
                <table className="w-full text-left text-xs">
                  <thead className="bg-emerald-100/70 text-emerald-900 font-extrabold uppercase text-[10px]">
                    <tr>
                      <th className="p-2.5">Código</th>
                      <th className="p-2.5">Cliente</th>
                      <th className="p-2.5">Solicitante</th>
                      <th className="p-2.5">Data Entrega</th>
                      <th className="p-2.5">Resp. Técnica</th>
                      <th className="p-2.5 text-right">Valor (R$)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-emerald-100 font-bold text-black bg-white">
                    {wonProposals.map((p) => (
                      <tr key={p.id} className="hover:bg-emerald-50/50">
                        <td className="p-2.5 font-mono text-slate-900">{p.code}</td>
                        <td className="p-2.5 uppercase">{p.clientName}</td>
                        <td className="p-2.5">{p.requesterName}</td>
                        <td className="p-2.5">{formatDate(p.deliveryDate)}</td>
                        <td className="p-2.5">{p.techLead}</td>
                        <td className="p-2.5 text-right font-extrabold text-emerald-700">{formatCurrency(p.value)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Section 2: Em Elaboração */}
          {inProgressProposals.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs font-extrabold text-amber-800 uppercase tracking-wide">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
                <span>2. Em Elaboração ({inProgressProposals.length}) — Total: {formatCurrency(inProgressValue)}</span>
              </div>
              <div className="overflow-x-auto rounded-xl border border-amber-200">
                <table className="w-full text-left text-xs">
                  <thead className="bg-amber-100/70 text-amber-900 font-extrabold uppercase text-[10px]">
                    <tr>
                      <th className="p-2.5">Código</th>
                      <th className="p-2.5">Cliente</th>
                      <th className="p-2.5">Solicitante</th>
                      <th className="p-2.5">Data Entrega</th>
                      <th className="p-2.5">Resp. Técnica</th>
                      <th className="p-2.5 text-right">Valor (R$)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-amber-100 font-bold text-black bg-white">
                    {inProgressProposals.map((p) => (
                      <tr key={p.id} className="hover:bg-amber-50/50">
                        <td className="p-2.5 font-mono text-slate-900">{p.code}</td>
                        <td className="p-2.5 uppercase">{p.clientName}</td>
                        <td className="p-2.5">{p.requesterName}</td>
                        <td className="p-2.5">{formatDate(p.deliveryDate)}</td>
                        <td className="p-2.5">{p.techLead}</td>
                        <td className="p-2.5 text-right font-extrabold text-amber-800">{formatCurrency(p.value)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Section 3: Em Revisão */}
          {inRevisionProposals.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs font-extrabold text-orange-800 uppercase tracking-wide">
                <span className="w-2.5 h-2.5 rounded-full bg-orange-600 inline-block" />
                <span>3. Em Revisão ({inRevisionProposals.length}) — Total: {formatCurrency(inRevisionValue)}</span>
              </div>
              <div className="overflow-x-auto rounded-xl border border-orange-200">
                <table className="w-full text-left text-xs">
                  <thead className="bg-orange-100/70 text-orange-900 font-extrabold uppercase text-[10px]">
                    <tr>
                      <th className="p-2.5">Código</th>
                      <th className="p-2.5">Cliente</th>
                      <th className="p-2.5">Solicitante</th>
                      <th className="p-2.5">Revisão</th>
                      <th className="p-2.5">Resp. Técnica</th>
                      <th className="p-2.5 text-right">Valor (R$)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-orange-100 font-bold text-black bg-white">
                    {inRevisionProposals.map((p) => (
                      <tr key={p.id} className="hover:bg-orange-50/50">
                        <td className="p-2.5 font-mono text-slate-900">{p.code}</td>
                        <td className="p-2.5 uppercase">{p.clientName}</td>
                        <td className="p-2.5">{p.requesterName}</td>
                        <td className="p-2.5 font-bold text-orange-600">R{p.revision}</td>
                        <td className="p-2.5">{p.techLead}</td>
                        <td className="p-2.5 text-right font-extrabold text-orange-700">{formatCurrency(p.value)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer Signature */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-200 text-[11px] text-slate-500 font-semibold">
          <span>RBT Fundações & Construção — Relatório Operacional Comercial</span>
          <span>DOCUMENTO INTERNO CONFIDENCIAL</span>
        </div>
      </div>
    </div>
  );
}
