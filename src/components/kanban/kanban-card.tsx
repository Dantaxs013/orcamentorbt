'use client';

import React from 'react';
import Link from 'next/link';
import {
  Clock,
  User,
  Building,
  Check,
  Copy,
  Layers,
  ChevronRight,
} from 'lucide-react';
import { formatCurrencyBRL } from '@/lib/masks';

export interface OrcamentoItem {
  id: string;
  numeroProtocolo: string;
  status:
    | 'NOVO'
    | 'AGUARDANDO_CLIENTE'
    | 'AGUARDANDO_ANALISE'
    | 'EM_ANALISE'
    | 'VISITA_TECNICA'
    | 'PROPOSTA_ENVIADA'
    | 'APROVADO'
    | 'REJEITADO'
    | 'CANCELADO'
    | string;
  createdAt: string | Date;
  criadoEm?: string | Date;
  lead: {
    nome: string;
    email: string;
    empresa?: string | null;
    telefone?: string | null;
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
    tipoServico?: string;
    tipoFundacao?: string;
    quantidade?: number;
    quantidadeEstacas?: number;
    submittedAt?: string | Date;
  } | null;
  propostaComercial?: {
    valorTotal: number | string;
  } | null;
}

interface KanbanCardProps {
  orcamento: OrcamentoItem;
  borderLeftAccent?: string;
  onCopyLink?: (token: string, e: React.MouseEvent) => void;
  isCopied?: boolean;
}

/**
 * Calcula o tempo decorrido (SLA) a partir de criadoEm ou createdAt.
 * - Hoje: badge verde com indicador pulsante
 * - Até 3 dias: badge neutro cinza
 * - 4 a 7 dias: badge âmbar de atenção
 * - Acima de 7 dias: badge vermelho de alerta com pulso
 */
export function getSlaInfo(dateInput: string | Date | undefined) {
  if (!dateInput) {
    return {
      label: 'Recente',
      days: 0,
      badgeClass: 'bg-slate-100 text-slate-600 border-slate-200',
      dotClass: 'bg-slate-400',
      isAlert: false,
    };
  }

  const date = new Date(dateInput);
  if (isNaN(date.getTime())) {
    return {
      label: 'Recente',
      days: 0,
      badgeClass: 'bg-slate-100 text-slate-600 border-slate-200',
      dotClass: 'bg-slate-400',
      isAlert: false,
    };
  }

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays <= 0) {
    return {
      label: 'Hoje',
      days: 0,
      badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      dotClass: 'bg-emerald-500 animate-pulse',
      isAlert: false,
    };
  }

  if (diffDays <= 3) {
    return {
      label: `Há ${diffDays} d`,
      days: diffDays,
      badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
      dotClass: 'bg-slate-400',
      isAlert: false,
    };
  }

  if (diffDays <= 7) {
    return {
      label: `Há ${diffDays} d`,
      days: diffDays,
      badgeClass: 'bg-amber-50 text-amber-800 border-amber-300 font-semibold',
      dotClass: 'bg-amber-500',
      isAlert: true,
    };
  }

  return {
    label: `Há ${diffDays} d`,
    days: diffDays,
    badgeClass: 'bg-red-50 text-red-800 border-red-300 font-bold',
    dotClass: 'bg-red-500 animate-pulse',
    isAlert: true,
  };
}

export function KanbanCard({
  orcamento,
  borderLeftAccent = 'border-l-amber-500',
  onCopyLink,
  isCopied = false,
}: KanbanCardProps) {
  const slaDate = orcamento.criadoEm || orcamento.createdAt;
  const sla = getSlaInfo(slaDate);

  const formattedDate = slaDate
    ? new Date(slaDate).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
      })
    : '--/--';

  return (
    <Link
      href={`/dashboard/orcamentos/${orcamento.id}`}
      className="block group outline-none focus-visible:ring-2 focus-visible:ring-red-600 focus-visible:ring-offset-2 rounded-xl transition"
      tabIndex={0}
      aria-label={`Orçamento protocolo ${orcamento.numeroProtocolo} cliente ${orcamento.lead.nome}`}
    >
      <div
        className={`bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm border-l-4 ${borderLeftAccent} hover:shadow-md hover:border-zinc-300 transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.99] focus-within:ring-2 focus-within:ring-red-600/30`}
      >
        {/* Header: Protocolo & SLA Badge */}
        <div className="flex items-center justify-between gap-1.5 mb-2">
          <span className="font-mono text-[11px] font-bold text-red-700 bg-red-50 border border-red-200/70 px-2 py-0.5 rounded-md tracking-tight">
            {orcamento.numeroProtocolo}
          </span>

          <div className="flex items-center gap-1.5">
            {/* SLA Badge com cores de aviso */}
            <span
              className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] border ${sla.badgeClass}`}
              title={`Criado em ${formattedDate} (${sla.days} dias atrás)`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${sla.dotClass}`} />
              <span>{sla.label}</span>
            </span>

            <span className="text-[10px] text-slate-400 flex items-center gap-0.5">
              <Clock className="w-2.5 h-2.5 text-slate-400" />
              {formattedDate}
            </span>
          </div>
        </div>

        {/* Informações do Cliente & Empresa */}
        <div className="mb-2.5">
          <p className="text-xs font-bold text-slate-900 truncate group-hover:text-red-700 transition">
            {orcamento.lead.nome}
          </p>
          {orcamento.lead.empresa ? (
            <p className="text-[11px] text-slate-500 truncate flex items-center gap-1 mt-0.5">
              <Building className="w-3 h-3 text-slate-400 flex-shrink-0" />
              <span className="truncate">{orcamento.lead.empresa}</span>
            </p>
          ) : (
            <p className="text-[10px] text-slate-400 truncate mt-0.5">
              {orcamento.lead.email}
            </p>
          )}
        </div>

        {/* Badges de Categoria & Orçamentista */}
        <div className="flex flex-wrap items-center gap-1.5 mb-2">
          {(orcamento.respostaFormulario?.tipoFundacao || orcamento.respostaFormulario?.tipoServico) && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200/70 max-w-[190px] truncate">
              <Layers className="w-2.5 h-2.5 text-slate-500 flex-shrink-0" />
              <span className="truncate">
                {orcamento.respostaFormulario.tipoFundacao || orcamento.respostaFormulario.tipoServico}
              </span>
              {((orcamento.respostaFormulario.quantidadeEstacas ?? orcamento.respostaFormulario.quantidade) || 0) > 0 && (
                <span className="text-slate-400 font-normal">
                  ({orcamento.respostaFormulario.quantidadeEstacas ?? orcamento.respostaFormulario.quantidade} un)
                </span>
              )}
            </span>
          )}

          {orcamento.orcamentista?.name && (
            <span className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-600 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-200/60">
              <User className="w-2.5 h-2.5 text-slate-500 flex-shrink-0" />
              <span className="truncate">Eng. {orcamento.orcamentista.name}</span>
            </span>
          )}
        </div>

        {/* Rodapé: Ações de Magic Link pendente */}
        {orcamento.magicLink && !orcamento.magicLink.used && (
          <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between gap-1">
            <span className="text-[10px] text-amber-700 font-medium flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
              Link pendente
            </span>
            <button
              type="button"
              onClick={(e) => {
                if (onCopyLink && orcamento.magicLink?.token) {
                  onCopyLink(orcamento.magicLink.token, e);
                }
              }}
              className="text-[10px] inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 hover:bg-slate-200 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600 rounded text-slate-700 font-medium transition cursor-pointer"
              title="Copiar Magic Link"
            >
              {isCopied ? (
                <>
                  <Check className="w-3 h-3 text-emerald-600" />
                  <span className="text-emerald-700 font-semibold">Copiado!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3 text-slate-500" />
                  <span>Copiar Link</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* Rodapé: Valor Total da Proposta Comercial se existir */}
        {orcamento.propostaComercial?.valorTotal !== undefined &&
          orcamento.propostaComercial.valorTotal !== null && (
            <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                Total
              </span>
              <span className="text-xs font-bold text-emerald-700 font-mono">
                {formatCurrencyBRL(orcamento.propostaComercial.valorTotal)}
              </span>
            </div>
          )}
      </div>
    </Link>
  );
}
