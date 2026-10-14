'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Clock,
  User,
  Building,
  FileText,
  ChevronRight,
  ExternalLink,
  Copy,
  Check,
  Search,
  Filter,
} from 'lucide-react';

export interface OrcamentoItem {
  id: string;
  numeroProtocolo: string;
  status:
    | 'NOVO'
    | 'AGUARDANDO_CLIENTE'
    | 'AGUARDANDO_ANALISE'
    | 'EM_ANALISE'
    | 'PROPOSTA_ENVIADA'
    | 'APROVADO'
    | 'REJEITADO';
  createdAt: string | Date;
  lead: {
    nome: string;
    email: string;
    empresa?: string | null;
  };
  orcamentista?: {
    name: string;
  } | null;
  magicLink?: {
    token: string;
    used: boolean;
    expiresAt: string | Date;
  } | null;
  respostaFormulario?: {
    tipoServico: string;
    quantidade: number;
    submittedAt: string | Date;
  } | null;
  propostaComercial?: {
    valorTotal: number | string;
  } | null;
}

interface KanbanBoardProps {
  initialOrcamentos: OrcamentoItem[];
}

const COLUMNS = [
  {
    key: 'AGUARDANDO_CLIENTE',
    title: 'Aguardando Cliente',
    subtitle: 'Magic Link enviado',
    color: 'border-amber-400 bg-amber-500/10 text-amber-700',
    badge: 'bg-amber-100 text-amber-800',
  },
  {
    key: 'AGUARDANDO_ANALISE',
    title: 'Aguardando Análise',
    subtitle: 'Formulário preenchido',
    color: 'border-blue-500 bg-blue-500/10 text-blue-700',
    badge: 'bg-blue-100 text-blue-800',
  },
  {
    key: 'EM_ANALISE',
    title: 'Em Análise',
    subtitle: 'Cálculo de custos',
    color: 'border-purple-500 bg-purple-500/10 text-purple-700',
    badge: 'bg-purple-100 text-purple-800',
  },
  {
    key: 'PROPOSTA_ENVIADA',
    title: 'Proposta Enviada',
    subtitle: 'PDF despachado',
    color: 'border-emerald-500 bg-emerald-500/10 text-emerald-700',
    badge: 'bg-emerald-100 text-emerald-800',
  },
  {
    key: 'APROVADO',
    title: 'Aprovado',
    subtitle: 'Fechado com sucesso',
    color: 'border-green-600 bg-green-500/10 text-green-700',
    badge: 'bg-green-100 text-green-800',
  },
];

export function KanbanBoard({ initialOrcamentos }: KanbanBoardProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  const filtered = initialOrcamentos.filter((orc) => {
    const term = searchTerm.toLowerCase();
    return (
      orc.numeroProtocolo.toLowerCase().includes(term) ||
      orc.lead.nome.toLowerCase().includes(term) ||
      (orc.lead.empresa && orc.lead.empresa.toLowerCase().includes(term)) ||
      (orc.respostaFormulario?.tipoServico &&
        orc.respostaFormulario.tipoServico.toLowerCase().includes(term))
    );
  });

  const handleCopyLink = (token: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const url = `${window.location.origin}/formulario/${token}`;
    navigator.clipboard.writeText(url);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2000);
  };

  return (
    <div className="space-y-4">
      {/* Search and Filters Bar */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por protocolo, cliente ou serviço..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#BA1A1A] focus:bg-white"
          />
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span className="font-semibold text-slate-700">{filtered.length}</span>{' '}
          orçamentos encontrados
        </div>
      </div>

      {/* Kanban Columns Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-start overflow-x-auto pb-4">
        {COLUMNS.map((col) => {
          const colItems = filtered.filter((item) => item.status === col.key);

          return (
            <div
              key={col.key}
              className="bg-slate-50/80 rounded-2xl border border-slate-200/80 p-3 min-h-[500px] flex flex-col shadow-sm"
            >
              {/* Column Header */}
              <div className="pb-3 border-b border-slate-200/80 mb-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-800 tracking-wide uppercase">
                    {col.title}
                  </h4>
                  <span
                    className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded-full ${col.badge}`}
                  >
                    {colItems.length}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">{col.subtitle}</p>
              </div>

              {/* Column Cards */}
              <div className="space-y-2.5 flex-1 overflow-y-auto max-h-[70vh]">
                {colItems.length === 0 ? (
                  <div className="h-28 rounded-xl border-2 border-dashed border-slate-200 flex items-center justify-center text-xs text-slate-400">
                    Nenhum item
                  </div>
                ) : (
                  colItems.map((orc) => (
                    <Link
                      key={orc.id}
                      href={`/dashboard/orcamentos/${orc.id}`}
                      className="block group"
                    >
                      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:border-[#BA1A1A] transition-all transform hover:-translate-y-0.5">
                        {/* Protocol & Date */}
                        <div className="flex items-center justify-between gap-1 mb-2">
                          <span className="font-mono text-[11px] font-bold text-[#BA1A1A] bg-red-50 border border-red-200/60 px-2 py-0.5 rounded-md">
                            {orc.numeroProtocolo}
                          </span>
                          <span className="text-[10px] text-slate-400 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {new Date(orc.createdAt).toLocaleDateString('pt-BR')}
                          </span>
                        </div>

                        {/* Client & Company */}
                        <div className="mb-2">
                          <p className="text-xs font-bold text-slate-800 truncate group-hover:text-[#BA1A1A] transition">
                            {orc.lead.nome}
                          </p>
                          {orc.lead.empresa && (
                            <p className="text-[11px] text-slate-500 truncate flex items-center gap-1 mt-0.5">
                              <Building className="w-3 h-3 text-slate-400 flex-shrink-0" />
                              {orc.lead.empresa}
                            </p>
                          )}
                        </div>

                        {/* Service / Answers info */}
                        {orc.respostaFormulario ? (
                          <div className="mt-2 pt-2 border-t border-slate-100 text-[11px] text-slate-600">
                            <p className="font-medium truncate text-slate-700">
                              {orc.respostaFormulario.tipoServico}
                            </p>
                            <span className="text-[10px] text-slate-400">
                              Qtd: {orc.respostaFormulario.quantidade} un
                            </span>
                          </div>
                        ) : orc.magicLink && !orc.magicLink.used ? (
                          <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between gap-1">
                            <span className="text-[10px] text-amber-700 font-medium">
                              Link pendente
                            </span>
                            <button
                              type="button"
                              onClick={(e) => handleCopyLink(orc.magicLink!.token, e)}
                              className="text-[10px] inline-flex items-center gap-1 px-1.5 py-0.5 bg-slate-100 hover:bg-slate-200 rounded text-slate-700 transition"
                              title="Copiar Magic Link"
                            >
                              {copiedToken === orc.magicLink.token ? (
                                <>
                                  <Check className="w-3 h-3 text-emerald-600" />
                                  <span>Copiado!</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3 h-3" />
                                  <span>Copiar Link</span>
                                </>
                              )}
                            </button>
                          </div>
                        ) : null}

                        {/* Proposal Value if exists */}
                        {orc.propostaComercial && (
                          <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between">
                            <span className="text-[10px] text-slate-400 font-semibold uppercase">
                              Total
                            </span>
                            <span className="text-xs font-bold text-emerald-700 font-mono">
                              {Number(orc.propostaComercial.valorTotal).toLocaleString(
                                'pt-BR',
                                { style: 'currency', currency: 'BRL' }
                              )}
                            </span>
                          </div>
                        )}
                      </div>
                    </Link>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
