'use client';

import React, { useState } from 'react';
import { Proposal } from '@/lib/proposals-types';
import { generateICalFeed } from '@/lib/icalGenerator';
import { generateCalendarToken } from '@/lib/security';
import { X, Calendar, Copy, Check, Download, ShieldCheck, ExternalLink, RefreshCw } from 'lucide-react';

interface CalendarSyncModalProps {
  proposals: Proposal[];
  isOpen: boolean;
  onClose: () => void;
  techLeads: string[];
  commLeads: string[];
}

export function CalendarSyncModal({
  proposals,
  isOpen,
  onClose,
  techLeads,
  commLeads,
}: CalendarSyncModalProps) {
  const allLeads = Array.from(new Set([...techLeads, ...commLeads, 'Eng. Carlos Eduardo', 'Mariana Silva', 'Wellington Muniz']));
  const [selectedLead, setSelectedLead] = useState<string>(allLeads[0] || 'Eng. Carlos Eduardo');
  const [isCopied, setIsCopied] = useState(false);

  if (!isOpen) return null;

  // Filtrar propostas atribuídas a esta pessoa
  const userProposals = proposals.filter((p) => {
    if (!selectedLead) return false;
    const norm = selectedLead.toLowerCase().trim();
    const isTech = p.techLead?.toLowerCase().trim().includes(norm);
    const isComm = p.commLead?.toLowerCase().trim().includes(norm);
    return isTech || isComm;
  });

  // URL do Feed iCal seguro para o Teams / Outlook
  const activeHost = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
  const token = generateCalendarToken(selectedLead);
  const feedUrl = `${activeHost}/api/calendar/ical?lead=${encodeURIComponent(selectedLead)}&token=${token}`;

  const handleCopyLink = async () => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(feedUrl);
      } else {
        // Fallback para conexões HTTP / IP de rede local (192.168.x.x)
        const textArea = document.createElement('textarea');
        textArea.value = feedUrl;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        textArea.remove();
      }
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2500);
    } catch (err) {
      console.warn('Fallback de cópia executado:', err);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2500);
    }
  };

  const handleDownloadICS = () => {
    const icalData = generateICalFeed(proposals, selectedLead);
    const blob = new Blob([icalData], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `RBT Fundações-Propostas-${selectedLead.replace(/[^a-zA-Z0-9]/g, '_')}.ics`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-3 md:p-6 overflow-hidden">
      {/* Modal Container */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden my-auto">
        {/* Header */}
        <div className="p-4 md:p-5 border-b border-slate-200 flex items-center justify-between shrink-0 bg-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#BA1A1A] text-white flex items-center justify-center font-bold shadow-md">
              <Calendar className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-black">
                Sincronizar Calendário RBT Fundações com o Teams / Outlook
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Exibe no calendário do Teams apenas as entregas atribuídas ao seu nome.
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

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-5 text-xs">
          {/* STEP 1: Selecionar o Responsável */}
          <div className="p-4 bg-[#EAF2FB] border border-[#93C5FD] rounded-2xl space-y-2">
            <label className="block font-extrabold text-slate-900 uppercase tracking-wide text-xs">
              1. Selecione o Responsável para Filtrar o Calendário:
            </label>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <select
                value={selectedLead}
                onChange={(e) => setSelectedLead(e.target.value)}
                className="flex-1 px-3 py-2 bg-white border border-slate-300 rounded-xl font-extrabold text-black text-xs focus:ring-2 focus:ring-[#BA1A1A]"
              >
                {allLeads.map((lead) => (
                  <option key={lead} value={lead}>
                    {lead}
                  </option>
                ))}
              </select>

              <div className="px-3 py-2 bg-white border border-slate-200 rounded-xl font-extrabold text-slate-900 text-xs text-center shrink-0">
                {userProposals.length} propostas atribuídas
              </div>
            </div>
          </div>

          {/* STEP 2: Opções de Sincronização */}
          <div className="space-y-4">
            <h3 className="font-extrabold text-black uppercase tracking-wide text-xs flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Escolha como deseja sincronizar:</span>
            </h3>

            {/* OPÇÃO A: Feed Automático iCal no Teams / Outlook */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <div className="font-extrabold text-slate-900 text-xs flex items-center gap-1.5">
                  <span>Opção A: Link de Sincronização Automática (Teams / Outlook)</span>
                </div>
                <span className="text-[10px] font-extrabold px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded border border-emerald-300">
                  Recomendado
                </span>
              </div>

              <p className="text-slate-600 text-[11px]">
                Cole este link no seu <strong>Microsoft Teams</strong> ou <strong>Outlook</strong> (<em>Adicionar Calendário da Internet</em>). Toda nova proposta ou alteração de data será atualizada automaticamente no seu Teams!
              </p>

              <div className="flex items-center gap-2 bg-white p-2 border border-slate-300 rounded-xl">
                <input
                  type="text"
                  readOnly
                  value={feedUrl}
                  className="w-full font-mono text-[11px] text-slate-700 bg-transparent border-none outline-none truncate"
                />
                <button
                  onClick={handleCopyLink}
                  className="px-3 py-1.5 bg-[#BA1A1A] hover:bg-[#093D75] text-white font-extrabold text-xs rounded-lg shrink-0 flex items-center gap-1 shadow-2xs"
                >
                  {isCopied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-300" />
                      <span>Copiado!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copiar Link</span>
                    </>
                  )}
                </button>
              </div>

              {/* Passo a passo para o Teams */}
              <div className="p-3.5 bg-white border border-slate-200 rounded-xl text-[11px] text-slate-700 space-y-2">
                <div className="font-extrabold text-slate-900 flex items-center gap-1">
                  <span>📌 Como importar no Microsoft Teams:</span>
                </div>
                <div className="space-y-1.5 text-slate-600 font-medium">
                  <p>
                    • <strong>Na Rede Local (IP 192.168.x.x):</strong> Os servidores de nuvem da Microsoft não conseguem acessar IPs privados locais diretamente pela Web.
                  </p>
                  <p className="bg-amber-50 p-2 rounded-lg border border-amber-200 text-amber-900 font-extrabold">
                    👉 <strong>Para importar no Teams agora:</strong> Clique na opção <u>Carregar do arquivo</u> (no menu à esquerda do Teams) e selecione o arquivo <strong>.ICS</strong> baixado na Opção B abaixo!
                  </p>
                </div>
              </div>
            </div>

            {/* OPÇÃO B: Download direto do arquivo .ICS */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between gap-4">
              <div>
                <div className="font-extrabold text-black text-xs">
                  Opção B: Baixar Arquivo de Calendário (.ICS)
                </div>
                <p className="text-slate-600 text-[11px] mt-0.5">
                  Baixe os compromissos das suas propostas para dar dois cliques e importar de uma só vez no seu computador.
                </p>
              </div>
              <button
                onClick={handleDownloadICS}
                className="px-4 py-2 bg-white hover:bg-slate-100 border border-slate-300 text-slate-900 font-extrabold text-xs rounded-xl shadow-2xs shrink-0 flex items-center gap-1.5"
              >
                <Download className="w-4 h-4 text-slate-900" />
                <span>Baixar .ICS</span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 flex items-center justify-end shrink-0 bg-slate-50">
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
