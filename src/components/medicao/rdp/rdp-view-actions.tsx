'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle, XCircle, Printer, Loader2, AlertTriangle, X } from 'lucide-react';

interface RdpViewActionsProps {
  rdpId: string;
  status: string;
  userRole: string;
}

export function RdpViewActions({ rdpId, status, userRole }: RdpViewActionsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showRejeitarModal, setShowRejeitarModal] = useState(false);
  const [motivo, setMotivo] = useState('');

  const handleAprovar = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/rdp/${rdpId}/aprovar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ acao: 'APROVAR' }),
      });
      if (res.ok) {
        router.refresh();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmRejeitar = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/rdp/${rdpId}/aprovar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ acao: 'REJEITAR', motivoRejeicao: motivo }),
      });
      if (res.ok) {
        setShowRejeitarModal(false);
        router.refresh();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <a
        href={`/api/rdp/${rdpId}/pdf`}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-50 px-3.5 py-2 rounded-xl border border-slate-300 transition shadow-sm"
      >
        <Printer className="w-3.5 h-3.5 text-red-600" />
        <span>Imprimir / PDF</span>
      </a>

      {['ENGENHEIRO', 'ADMINISTRADOR', 'ADMIN'].includes(userRole) && status === 'SUBMETIDO' && (
        <>
          <button
            type="button"
            onClick={() => setShowRejeitarModal(true)}
            disabled={loading}
            className="inline-flex items-center gap-1 text-xs bg-red-50 hover:bg-red-600 hover:text-white text-red-700 font-semibold px-3.5 py-2 rounded-xl border border-red-200 transition shadow-sm disabled:opacity-50"
          >
            <XCircle className="w-3.5 h-3.5" />
            <span>Rejeitar</span>
          </button>

          <button
            type="button"
            onClick={handleAprovar}
            disabled={loading}
            className="inline-flex items-center gap-1 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2 rounded-xl shadow-md transition disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <CheckCircle className="w-3.5 h-3.5" />
            )}
            <span>Aprovar RDP</span>
          </button>
        </>
      )}

      {showRejeitarModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl w-full max-w-md p-5 shadow-2xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <span className="font-bold text-red-600 text-sm flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4" /> Justificativa da Rejeição
              </span>
              <button
                type="button"
                onClick={() => setShowRejeitarModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <textarea
              rows={3}
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Descreva o que o apontador precisa corrigir..."
              className="w-full text-xs p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:outline-none"
            />
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowRejeitarModal(false)}
                className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmRejeitar}
                disabled={loading}
                className="px-3 py-1.5 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg shadow-sm disabled:opacity-50"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
