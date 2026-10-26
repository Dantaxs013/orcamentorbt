'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Eye,
  CheckCircle,
  XCircle,
  Loader2,
  FileText,
  Building2,
  Calendar,
  User,
  Wrench,
  X,
  Printer,
  AlertTriangle,
  ExternalLink,
} from 'lucide-react';

export interface LinhaProducaoData {
  id: string;
  numeroLinha: number;
  numeroEstaca?: string | null;
  perfil?: string | null;
  profundidade: number | string;
  emendaW150: number;
  emendaW310: number;
  talas: number;
  arrasamento: number | string;
  horaInicio?: string | null;
  horaFim?: string | null;
  observacao?: string | null;
}

export interface RdpPendente {
  id: string;
  numeroSequencial: number;
  data: string | Date;
  turno?: string;
  maquinaEquipamento?: string;
  operador?: string;
  encarregado?: string | null;
  condicaoClimatica?: string;
  observacoes?: string | null;
  obra: {
    id: string;
    nome: string;
    codigo: string;
    cliente?: string;
    cidade?: string | null;
    estado?: string | null;
  };
  apontador: {
    id: string;
    name: string;
    email?: string;
  };
  linhasProducao: LinhaProducaoData[];
}

interface ValidacaoClientProps {
  initialRdps: RdpPendente[];
}

export function ValidacaoClient({ initialRdps }: ValidacaoClientProps) {
  const [rdps, setRdps] = useState<RdpPendente[]>(initialRdps);
  const [selectedRdp, setSelectedRdp] = useState<RdpPendente | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [rejeitandoRdp, setRejeitandoRdp] = useState<RdpPendente | null>(null);
  const [motivoRejeicao, setMotivoRejeicao] = useState('');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Ação de Aprovar RDP
  const handleAprovar = async (rdp: RdpPendente) => {
    if (loadingId) return;
    setLoadingId(rdp.id);
    setFeedback(null);

    try {
      const res = await fetch(`/api/rdp/${rdp.id}/aprovar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ acao: 'APROVAR' }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.error || 'Erro ao aprovar RDP');
      }

      // Remove da lista em tempo real
      setRdps((prev) => prev.filter((r) => r.id !== rdp.id));
      if (selectedRdp?.id === rdp.id) setSelectedRdp(null);

      setFeedback({
        type: 'success',
        message: `RDP #${rdp.numeroSequencial} da obra "${rdp.obra.nome}" aprovado com sucesso!`,
      });
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || 'Falha na comunicação com o servidor.',
      });
    } finally {
      setLoadingId(null);
    }
  };

  // Abrir Modal de Rejeição
  const handleOpenRejeitar = (rdp: RdpPendente) => {
    setRejeitandoRdp(rdp);
    setMotivoRejeicao('');
  };

  // Confirmar Rejeição do RDP
  const handleConfirmRejeitar = async () => {
    if (!rejeitandoRdp || loadingId) return;
    const rdp = rejeitandoRdp;

    setLoadingId(rdp.id);
    setFeedback(null);

    try {
      const res = await fetch(`/api/rdp/${rdp.id}/aprovar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          acao: 'REJEITAR',
          motivoRejeicao: motivoRejeicao.trim() || 'Sem justificativa informada pelo engenheiro',
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.error || 'Erro ao rejeitar RDP');
      }

      // Remove da lista em tempo real
      setRdps((prev) => prev.filter((r) => r.id !== rdp.id));
      if (selectedRdp?.id === rdp.id) setSelectedRdp(null);
      setRejeitandoRdp(null);

      setFeedback({
        type: 'success',
        message: `RDP #${rdp.numeroSequencial} rejeitado e devolvido ao apontador para revisão.`,
      });
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || 'Falha ao rejeitar o relatório.',
      });
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Feedback Toast */}
      {feedback && (
        <div
          className={`p-4 rounded-2xl flex items-center justify-between text-sm shadow-sm transition animate-fadeIn ${
            feedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? (
              <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0" />
            )}
            <span className="font-semibold">{feedback.message}</span>
          </div>
          <button
            onClick={() => setFeedback(null)}
            className="text-slate-400 hover:text-slate-700 text-xs font-bold px-2 py-1"
          >
            Fechar
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Validação de RDPs</h1>
          <p className="text-slate-500 text-sm">
            {rdps.length} relatório(s) aguardando validação técnica da Engenharia
          </p>
        </div>
      </div>

      {/* Tabela ou Estado Vazio */}
      {rdps.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm">
          <CheckCircle className="w-14 h-14 text-emerald-500 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800">Tudo em dia!</h3>
          <p className="text-slate-500 text-sm mt-1">
            Nenhum Relatório Diário de Produção pendente de validação no momento.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-900 text-white text-xs uppercase tracking-wider">
                  <th className="px-5 py-3.5 text-left">Obra</th>
                  <th className="px-5 py-3.5 text-left">Apontador</th>
                  <th className="px-5 py-3.5 text-center">Data</th>
                  <th className="px-5 py-3.5 text-center">Nº RDP</th>
                  <th className="px-5 py-3.5 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {rdps.map((rdp, i) => {
                  const dataFormatada = new Date(rdp.data).toLocaleDateString('pt-BR');
                  const estacasCount = rdp.linhasProducao.filter(
                    (l) => l.numeroEstaca && l.numeroEstaca.trim() !== ''
                  ).length;
                  const isProcessing = loadingId === rdp.id;

                  return (
                    <tr
                      key={rdp.id}
                      className={`hover:bg-slate-50/80 transition ${
                        i % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'
                      }`}
                    >
                      <td className="px-5 py-4">
                        <p className="font-bold text-slate-900">{rdp.obra.nome}</p>
                        <p className="text-xs text-slate-400 font-mono mt-0.5">
                          {rdp.obra.codigo}
                        </p>
                      </td>
                      <td className="px-5 py-4 text-slate-700 font-medium">
                        {rdp.apontador.name}
                      </td>
                      <td className="px-5 py-4 text-center text-slate-600 font-medium">
                        {dataFormatada}
                      </td>
                      <td className="px-5 py-4 text-center">
                        <span className="font-bold text-slate-900 font-mono text-sm">
                          {rdp.numeroSequencial}
                        </span>
                        <span className="block text-[10px] text-slate-400">
                          {estacasCount} estaca(s)
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center justify-center gap-2">
                          {/* BOTÃO 1: VER */}
                          <button
                            type="button"
                            onClick={() => setSelectedRdp(rdp)}
                            disabled={isProcessing}
                            title="Visualizar detalhes completos do RDP"
                            className="inline-flex items-center gap-1 text-xs bg-zinc-100 hover:bg-[#111827] hover:text-white text-zinc-800 font-semibold px-3 py-1.5 rounded-lg border border-zinc-300 transition shadow-sm active:scale-95 disabled:opacity-50"
                          >
                            <Eye className="w-3.5 h-3.5 text-slate-600" />
                            <span>Ver</span>
                          </button>

                          {/* BOTÃO 2: APROVAR */}
                          <button
                            type="button"
                            onClick={() => handleAprovar(rdp)}
                            disabled={isProcessing}
                            title="Aprovar e assinar digitalmente este RDP"
                            className="inline-flex items-center gap-1 text-xs bg-emerald-50 hover:bg-emerald-600 hover:text-white text-emerald-700 font-semibold px-3 py-1.5 rounded-lg border border-emerald-200 transition shadow-sm active:scale-95 disabled:opacity-50"
                          >
                            {isProcessing ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                            )}
                            <span>{isProcessing ? 'Gravando...' : 'Aprovar'}</span>
                          </button>

                          {/* BOTÃO 3: REJEITAR */}
                          <button
                            type="button"
                            onClick={() => handleOpenRejeitar(rdp)}
                            disabled={isProcessing}
                            title="Rejeitar e solicitar correções ao apontador"
                            className="inline-flex items-center gap-1 text-xs bg-red-50 hover:bg-[#BA1A1A] hover:text-white text-red-700 font-semibold px-3 py-1.5 rounded-lg border border-red-200 transition shadow-sm active:scale-95 disabled:opacity-50"
                          >
                            <XCircle className="w-3.5 h-3.5 text-red-600" />
                            <span>Rejeitar</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL DE VISUALIZAÇÃO COMPLETA DO RDP (QUANDO CLICA EM VER)*/}
      {/* ========================================================= */}
      {selectedRdp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
            {/* Modal Header */}
            <div className="p-5 sm:p-6 bg-[#111827] text-white flex items-start justify-between border-b-2 border-[#BA1A1A]">
              <div>
                <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-md bg-white/10 text-xs font-mono text-slate-300">
                  <span>{selectedRdp.obra.codigo}</span>
                  <span>•</span>
                  <span>RDP #{selectedRdp.numeroSequencial}</span>
                </div>
                <h2 className="text-lg sm:text-xl font-bold mt-1 text-white">
                  {selectedRdp.obra.nome}
                </h2>
                <p className="text-xs text-slate-300 mt-0.5">
                  Apontado por: <strong className="text-white">{selectedRdp.apontador.name}</strong> em{' '}
                  <strong className="text-white">
                    {new Date(selectedRdp.data).toLocaleDateString('pt-BR')}
                  </strong>
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedRdp(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body (Scrollable) */}
            <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5 text-xs text-slate-700">
              {/* Header Info Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <span className="text-[10px] text-slate-400 block uppercase font-bold">Máquina</span>
                  <p className="font-bold text-slate-800 text-sm mt-0.5">
                    {selectedRdp.maquinaEquipamento || 'Não informada'}
                  </p>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <span className="text-[10px] text-slate-400 block uppercase font-bold">Operador</span>
                  <p className="font-bold text-slate-800 text-sm mt-0.5">
                    {selectedRdp.operador || 'Não informado'}
                  </p>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <span className="text-[10px] text-slate-400 block uppercase font-bold">Encarregado</span>
                  <p className="font-bold text-slate-800 text-sm mt-0.5">
                    {selectedRdp.encarregado || 'N/D'}
                  </p>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <span className="text-[10px] text-slate-400 block uppercase font-bold">Condição Climática</span>
                  <p className="font-bold text-slate-800 text-sm mt-0.5">
                    {selectedRdp.condicaoClimatica || 'Bom / Sol'}
                  </p>
                </div>
              </div>

              {/* Tabela de Linhas de Produção */}
              <div>
                <h3 className="text-sm font-bold text-slate-900 mb-2 flex items-center gap-1.5">
                  <Wrench className="w-4 h-4 text-[#BA1A1A]" />
                  <span>Estacas Cravadas no Dia</span>
                </h3>

                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                      <tr>
                        <th className="py-2 px-3 text-center w-12">#</th>
                        <th className="py-2 px-3 text-left">Nº Estaca</th>
                        <th className="py-2 px-3 text-left">Perfil</th>
                        <th className="py-2 px-3 text-right">Comprimento (m)</th>
                        <th className="py-2 px-3 text-center">Emenda W150</th>
                        <th className="py-2 px-3 text-center">Emenda W310</th>
                        <th className="py-2 px-3 text-center">Talas</th>
                        <th className="py-2 px-3 text-right">Arrasamento (m)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {selectedRdp.linhasProducao
                        .filter((l) => (l.numeroEstaca && l.numeroEstaca.trim() !== '') || Number(l.profundidade) > 0)
                        .map((l, idx) => (
                          <tr key={l.id || idx} className="hover:bg-slate-50">
                            <td className="py-2 px-3 text-center font-mono text-slate-400">
                              {l.numeroLinha}
                            </td>
                            <td className="py-2 px-3 font-bold text-slate-900">
                              {l.numeroEstaca || '-'}
                            </td>
                            <td className="py-2 px-3 text-slate-700 font-medium">
                              {l.perfil || '-'}
                            </td>
                            <td className="py-2 px-3 text-right font-mono font-bold text-slate-800">
                              {Number(l.profundidade || 0).toFixed(2)} m
                            </td>
                            <td className="py-2 px-3 text-center font-mono">
                              {l.emendaW150 || 0}
                            </td>
                            <td className="py-2 px-3 text-center font-mono">
                              {l.emendaW310 || 0}
                            </td>
                            <td className="py-2 px-3 text-center font-mono">
                              {l.talas || 0}
                            </td>
                            <td className="py-2 px-3 text-right font-mono text-rose-700">
                              {Number(l.arrasamento || 0).toFixed(2)} m
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Observações de Campo */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <span className="text-[10px] text-slate-400 font-bold uppercase block mb-1">
                  Observações do Apontador:
                </span>
                <p className="text-slate-700 italic">
                  {selectedRdp.observacoes || 'Nenhuma observação registrada.'}
                </p>
              </div>
            </div>

            {/* Modal Footer (Action Buttons) */}
            <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
              <a
                href={`/api/rdp/${selectedRdp.id}/pdf`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-100 px-3 py-2 rounded-xl border border-slate-300 transition"
              >
                <Printer className="w-3.5 h-3.5 text-red-600" />
                <span>Visualizar PDF / Imprimir</span>
              </a>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedRdp(null)}
                  className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-white hover:bg-slate-100 rounded-xl border border-slate-200 transition"
                >
                  Fechar
                </button>

                <button
                  type="button"
                  onClick={() => {
                    handleOpenRejeitar(selectedRdp);
                  }}
                  disabled={loadingId === selectedRdp.id}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl shadow-md transition disabled:opacity-50"
                >
                  <XCircle className="w-4 h-4" />
                  <span>Rejeitar RDP</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleAprovar(selectedRdp)}
                  disabled={loadingId === selectedRdp.id}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-md transition disabled:opacity-50"
                >
                  {loadingId === selectedRdp.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <CheckCircle className="w-4 h-4" />
                  )}
                  <span>Aprovar & Assinar RDP</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL DE MOTIVO DA REJEIÇÃO                               */}
      {/* ========================================================= */}
      {rejeitandoRdp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-red-600 font-bold">
                <AlertTriangle className="w-5 h-5" />
                <span>Rejeitar RDP #{rejeitandoRdp.numeroSequencial}</span>
              </div>
              <button
                type="button"
                onClick={() => setRejeitandoRdp(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600">
              Informe a justificativa técnica para que o apontador{' '}
              <strong>{rejeitandoRdp.apontador.name}</strong> possa corrigir o relatório:
            </p>

            <textarea
              rows={4}
              value={motivoRejeicao}
              onChange={(e) => setMotivoRejeicao(e.target.value)}
              placeholder="Ex: Favor verificar o comprimento da estaca E-04 ou a quantidade de emendas."
              className="w-full text-xs p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:outline-none"
            />

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setRejeitandoRdp(null)}
                className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmRejeitar}
                disabled={loadingId === rejeitandoRdp.id}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl shadow-md transition disabled:opacity-50"
              >
                {loadingId === rejeitandoRdp.id ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <XCircle className="w-3.5 h-3.5" />
                )}
                <span>Confirmar Rejeição</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
