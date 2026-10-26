'use client';

import React from 'react';
import { PenTool, CheckCircle, ShieldCheck, MessageSquare, AlertCircle } from 'lucide-react';

interface RdpSignaturesProps {
  observacoes: string;
  onObservacoesChange: (value: string) => void;
  assinadoApontador: boolean;
  dataAssinaturaApontador?: Date | string | null;
  nomeApontador: string;
  onSignApontador: (signed: boolean) => void;
  assinadoEngenheiro?: boolean;
  dataAssinaturaEngenheiro?: Date | string | null;
  nomeEngenheiro?: string;
  onSignEngenheiro?: (signed: boolean) => void;
  assinadoFiscal?: boolean;
  dataAssinaturaFiscal?: Date | string | null;
  nomeFiscal?: string;
  onSignFiscal?: (signed: boolean) => void;
  readOnly?: boolean;
}

export function RdpSignatures({
  observacoes,
  onObservacoesChange,
  assinadoApontador,
  dataAssinaturaApontador,
  nomeApontador,
  onSignApontador,
  assinadoEngenheiro = false,
  dataAssinaturaEngenheiro,
  nomeEngenheiro,
  onSignEngenheiro,
  assinadoFiscal = false,
  dataAssinaturaFiscal,
  nomeFiscal,
  onSignFiscal,
  readOnly = false,
}: RdpSignaturesProps) {
  return (
    <div className="bg-white rounded-2xl p-5 sm:p-6 shadow-sm border border-slate-200 space-y-6">
      {/* General Observations Box */}
      <div className="space-y-2">
        <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
          <MessageSquare className="w-4 h-4 text-emerald-600" />
          <span>Ocorrências Gerais, Condições Geotécnicas e Observações</span>
        </label>
        <textarea
          rows={3}
          value={observacoes || ''}
          disabled={readOnly}
          onChange={(e) => onObservacoesChange(e.target.value)}
          placeholder="Registre aqui quaisquer intercorrências do dia: solo atípico, nível do lençol freático, paradas operacionais, condições do tempo, chegada de perfis ou instruções da fiscalização..."
          className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
        />
      </div>

      {/* Digital Field Signatures Section */}
      <div className="pt-4 border-t border-slate-100">
        <div className="flex items-center gap-2 mb-4">
          <PenTool className="w-4 h-4 text-emerald-600" />
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
            Vistos e Assinaturas Digitais de Campo
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Apontador Signature Card */}
          <div
            className={`p-4 rounded-xl border-2 transition ${
              assinadoApontador
                ? 'border-emerald-500 bg-emerald-50/30'
                : 'border-dashed border-slate-300 bg-slate-50/50'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 uppercase">Apontador de Campo</span>
              {assinadoApontador ? (
                <CheckCircle className="w-4 h-4 text-emerald-600" />
              ) : (
                <ShieldCheck className="w-4 h-4 text-slate-400" />
              )}
            </div>

            <div className="mt-2">
              <p className="text-sm font-bold text-slate-900">{nomeApontador || 'Apontador Autenticado'}</p>
              {assinadoApontador && dataAssinaturaApontador ? (
                <p className="text-[11px] text-emerald-700 font-medium mt-0.5">
                  Assinado digitalmente em{' '}
                  {new Date(dataAssinaturaApontador).toLocaleString('pt-BR', {
                    dateStyle: 'short',
                    timeStyle: 'short',
                  })}
                </p>
              ) : (
                <p className="text-[11px] text-slate-500 mt-0.5">Visto obrigatório para submissão</p>
              )}
            </div>

            {!readOnly && (
              <label className="mt-3 flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={assinadoApontador}
                  onChange={(e) => onSignApontador(e.target.checked)}
                  className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
                />
                <span className="text-xs font-semibold text-slate-700">
                  {assinadoApontador ? 'Assinatura confirmada' : 'Apor visto digital'}
                </span>
              </label>
            )}
          </div>

          {/* Encarregado / Engenheiro Signature Card */}
          <div
            className={`p-4 rounded-xl border-2 transition ${
              assinadoEngenheiro
                ? 'border-emerald-500 bg-emerald-50/30'
                : 'border-dashed border-slate-300 bg-slate-50/50'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 uppercase">Encarregado / Engenheiro</span>
              {assinadoEngenheiro ? (
                <CheckCircle className="w-4 h-4 text-emerald-600" />
              ) : (
                <ShieldCheck className="w-4 h-4 text-slate-400" />
              )}
            </div>

            <div className="mt-2">
              <p className="text-sm font-bold text-slate-900">{nomeEngenheiro || 'Engenharia RBT'}</p>
              {assinadoEngenheiro && dataAssinaturaEngenheiro ? (
                <p className="text-[11px] text-emerald-700 font-medium mt-0.5">
                  Validado em{' '}
                  {new Date(dataAssinaturaEngenheiro).toLocaleString('pt-BR', {
                    dateStyle: 'short',
                    timeStyle: 'short',
                  })}
                </p>
              ) : (
                <p className="text-[11px] text-slate-500 mt-0.5">Validação técnica após submissão</p>
              )}
            </div>

            {onSignEngenheiro && !readOnly && (
              <label className="mt-3 flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={assinadoEngenheiro}
                  onChange={(e) => onSignEngenheiro(e.target.checked)}
                  className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
                />
                <span className="text-xs font-semibold text-slate-700">Validar como Engenharia</span>
              </label>
            )}
          </div>

          {/* Fiscal da Obra (Cliente) Signature Card */}
          <div
            className={`p-4 rounded-xl border-2 transition ${
              assinadoFiscal
                ? 'border-emerald-500 bg-emerald-50/30'
                : 'border-dashed border-slate-300 bg-slate-50/50'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 uppercase">Fiscal da Contratante</span>
              {assinadoFiscal ? (
                <CheckCircle className="w-4 h-4 text-emerald-600" />
              ) : (
                <ShieldCheck className="w-4 h-4 text-slate-400" />
              )}
            </div>

            <div className="mt-2">
              <p className="text-sm font-bold text-slate-900">{nomeFiscal || 'Fiscalização do Cliente'}</p>
              {assinadoFiscal && dataAssinaturaFiscal ? (
                <p className="text-[11px] text-emerald-700 font-medium mt-0.5">
                  De acordo em{' '}
                  {new Date(dataAssinaturaFiscal).toLocaleString('pt-BR', {
                    dateStyle: 'short',
                    timeStyle: 'short',
                  })}
                </p>
              ) : (
                <p className="text-[11px] text-slate-500 mt-0.5">Aceite formal de campo</p>
              )}
            </div>

            {onSignFiscal && !readOnly && (
              <label className="mt-3 flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={assinadoFiscal}
                  onChange={(e) => onSignFiscal(e.target.checked)}
                  className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
                />
                <span className="text-xs font-semibold text-slate-700">Confirmar visto da fiscalização</span>
              </label>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
