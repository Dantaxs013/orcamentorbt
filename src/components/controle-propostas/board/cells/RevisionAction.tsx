'use client';

import React, { useState } from 'react';
import { RefreshCw, FileDiff } from 'lucide-react';

interface RevisionActionProps {
  currentRevision: number;
  onCreateRevision: () => void;
  onViewHistory?: () => void;
}

export function RevisionAction({
  currentRevision,
  onCreateRevision,
  onViewHistory,
}: RevisionActionProps) {
  const [showConfirm, setShowConfirm] = useState(false);

  return (
    <div className="flex items-center gap-1.5 justify-center">
      {/* Visualizar Revisão (Branco com tom Azul Claro e Letras Pretas) */}
      <button
        onClick={onViewHistory}
        className="px-2 py-1 rounded bg-[#EAF2FB] hover:bg-[#D4E5F9] text-black font-extrabold text-xs border border-[#93C5FD] flex items-center gap-1 transition-colors shadow-2xs"
        title="Clique para ver o histórico de revisões desta proposta"
      >
        <FileDiff className="w-3.5 h-3.5 text-slate-900" />
        <span>R{currentRevision}</span>
      </button>

      {/* Adicionar Nova Revisão (Branco com tom Azul Claro e Letras Pretas) */}
      <button
        onClick={() => setShowConfirm(true)}
        className="px-2.5 py-1 rounded bg-white hover:bg-[#EAF2FB] text-black font-extrabold text-xs border border-[#2563EB] flex items-center gap-1 transition-all shadow-2xs"
        title="Criar nova revisão desta proposta"
      >
        <RefreshCw className="w-3.5 h-3.5 text-[#2563EB]" />
        <span className="hidden sm:inline">Nova Rev</span>
      </button>

      {/* Confirmation Modal */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
          <div className="bg-white border border-slate-200 rounded-xl shadow-2xl max-w-md w-full p-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-900 flex items-center justify-center shrink-0 border border-[#93C5FD]">
                <RefreshCw className="w-5 h-5 animate-spin-slow" />
              </div>
              <div>
                <h3 className="font-bold text-black text-base">
                  Criar Revisão R{currentRevision + 1}?
                </h3>
                <p className="text-xs text-slate-600">
                  Isso irá salvar um snapshot da versão R{currentRevision} e incrementar a versão da proposta para R{currentRevision + 1}.
                </p>
              </div>
            </div>

            <div className="p-3 bg-[#EAF2FB]/50 rounded-lg text-xs space-y-1 border border-[#93C5FD]/60">
              <div className="font-bold text-black">
                Ações automáticas:
              </div>
              <ul className="list-disc list-inside text-slate-700 space-y-0.5 font-medium">
                <li>Gravação de snapshot imutável no histórico</li>
                <li>Status alterado para <span className="font-bold text-slate-900">Em Revisão</span></li>
                <li>Registro no log de auditoria</li>
              </ul>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setShowConfirm(false)}
                className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-bold text-black hover:bg-slate-100"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  setShowConfirm(false);
                  onCreateRevision();
                }}
                className="px-4 py-1.5 rounded-lg bg-[#BA1A1A] hover:bg-[#093D75] text-white text-xs font-extrabold shadow-md"
              >
                Confirmar Revisão
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
