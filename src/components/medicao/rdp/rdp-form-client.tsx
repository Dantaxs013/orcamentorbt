'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ObraOption, RdpHeaderForm, RdpHeaderState } from './rdp-header-form';
import { RdpProductionGrid, EstacaOption } from './rdp-production-grid';
import { RdpTotalsBar } from './rdp-totals-bar';
import { RdpLocalDraftManager, purgeDraftFromLocalStorage } from './rdp-local-draft';
import { RdpSignatures } from './rdp-signatures';
import {
  LinhaProducaoItem,
  RelatorioDiarioData,
  calculateRdpTotals,
  calculateLineMetrics,
  validateRdpSubmission,
} from '@/lib/calculations/rdp-math';
import { Send, Save, ArrowLeft, AlertCircle, CheckCircle2 } from 'lucide-react';

interface RdpFormClientProps {
  obras: ObraOption[];
  currentUser: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
  initialData?: Partial<RelatorioDiarioData>;
  initialEstacas?: EstacaOption[];
}

function createEmptyLines(): LinhaProducaoItem[] {
  return Array.from({ length: 25 }, (_, i) => ({
    numeroLinha: i + 1,
    numeroEstaca: '',
    perfil: '',
    comprimento: 0,
    profundidade: 0,
    cotaTerreno: null,
    cotaArrasamento: null,
    emendaW150: 0,
    emendaW310: 0,
    talas: 0,
    arrasamento: 0,
    comprimentoUtil: 0,
    negaRepique: '',
    horarioCravacao: '',
    horaInicio: '',
    horaFim: '',
    tempoParadaMinutos: 0,
    motivoParada: '',
    observacao: '',
  }));
}

export function RdpFormClient({ obras, currentUser, initialData, initialEstacas }: RdpFormClientProps) {
  const router = useRouter();

  // Header State
  const [headerState, setHeaderState] = useState<RdpHeaderState>({
    obraId: initialData?.obraId || (obras.length > 0 ? obras[0].id : ''),
    data: initialData?.data
      ? typeof initialData.data === 'string'
        ? initialData.data.split('T')[0]
        : initialData.data.toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0],
    turno: initialData?.turno || 'DIURNO',
    maquinaEquipamento: initialData?.maquinaEquipamento || '',
    operador: initialData?.operador || '',
    encarregado: initialData?.encarregado || '',
    soldador: initialData?.soldador || '',
    equipeDescricao: initialData?.equipeDescricao || '',
    condicaoClimatica: initialData?.condicaoClimatica || 'BOM_SOL',
    horarioInicio: initialData?.horarioInicio || '07:00',
    horarioTermino: initialData?.horarioTermino || '17:00',
    intervaloAlmocoInicio: initialData?.intervaloAlmocoInicio || '12:00',
    intervaloAlmocoFim: initialData?.intervaloAlmocoFim || '13:00',
    horasParadas: initialData?.horasParadas ?? 0,
    motivoParada: initialData?.motivoParada || '',
    observacoes: initialData?.observacoes || '',
  });

  // Estacas Principais de Projeto para autocompletar na grade
  const [estacas, setEstacas] = useState<EstacaOption[]>(initialEstacas || []);

  React.useEffect(() => {
    const fetchEstacas = async () => {
      try {
        const query = headerState.obraId ? `?obraId=${headerState.obraId}` : '';
        const res = await fetch(`/api/estacas${query}`);
        if (res.ok) {
          const data = await res.json();
          if (data.estacas) {
            setEstacas(data.estacas);
          }
        }
      } catch (err) {
        console.error('Erro ao buscar estacas principais:', err);
      }
    };
    fetchEstacas();
  }, [headerState.obraId]);

  // Lines State (25 rows)
  const [lines, setLines] = useState<LinhaProducaoItem[]>(() => {
    if (initialData?.linhas && initialData.linhas.length > 0) {
      const base = createEmptyLines();
      initialData.linhas.forEach((l) => {
        const idx = l.numeroLinha - 1;
        if (idx >= 0 && idx < 25) {
          base[idx] = { ...base[idx], ...l };
        }
      });
      return base;
    }
    return createEmptyLines();
  });

  // Signatures State
  const [assinadoApontador, setAssinadoApontador] = useState<boolean>(initialData?.assinadoApontador || false);
  const [dataAssinaturaApontador, setDataAssinaturaApontador] = useState<Date | string | null>(
    initialData?.dataAssinaturaApontador || null
  );

  // Status & Feedback
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isSavingDraft, setIsSavingDraft] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Live Totals
  const liveTotals = useMemo(() => {
    return calculateRdpTotals(lines, {
      inicio: headerState.horarioInicio,
      fim: headerState.horarioTermino,
      almocoInicio: headerState.intervaloAlmocoInicio,
      almocoFim: headerState.intervaloAlmocoFim,
      horasParadas: headerState.horasParadas,
    });
  }, [lines, headerState]);

  // Current Full RDP payload for autosave
  const currentRdpPayload: Partial<RelatorioDiarioData> = useMemo(() => {
    return {
      id: initialData?.id,
      obraId: headerState.obraId,
      apontadorId: currentUser.id,
      data: headerState.data,
      turno: headerState.turno,
      maquinaEquipamento: headerState.maquinaEquipamento,
      operador: headerState.operador,
      encarregado: headerState.encarregado,
      soldador: headerState.soldador,
      equipeDescricao: headerState.equipeDescricao,
      condicaoClimatica: headerState.condicaoClimatica,
      horarioInicio: headerState.horarioInicio,
      horarioTermino: headerState.horarioTermino,
      intervaloAlmocoInicio: headerState.intervaloAlmocoInicio,
      intervaloAlmocoFim: headerState.intervaloAlmocoFim,
      horasParadas: Number(headerState.horasParadas) || 0,
      motivoParada: headerState.motivoParada,
      observacoes: headerState.observacoes,
      assinadoApontador,
      dataAssinaturaApontador,
      linhas: lines,
    };
  }, [headerState, lines, assinadoApontador, dataAssinaturaApontador, currentUser.id, initialData?.id]);

  const handleHeaderChange = useCallback((field: keyof RdpHeaderState, value: string | number) => {
    setHeaderState((prev) => ({
      ...prev,
      [field]: value,
    }));
  }, []);

  const handleLineChange = useCallback((index: number, field: keyof LinhaProducaoItem, value: unknown) => {
    setLines((prev) => {
      const next = [...prev];
      next[index] = {
        ...next[index],
        [field]: value,
      };
      return next;
    });
  }, []);

  const handleRestoreDraft = useCallback((draft: Partial<RelatorioDiarioData>) => {
    if (draft.obraId) handleHeaderChange('obraId', draft.obraId);
    if (draft.data) handleHeaderChange('data', typeof draft.data === 'string' ? draft.data.split('T')[0] : draft.data.toISOString().split('T')[0]);
    if (draft.maquinaEquipamento) handleHeaderChange('maquinaEquipamento', draft.maquinaEquipamento);
    if (draft.operador) handleHeaderChange('operador', draft.operador);
    if (draft.encarregado) handleHeaderChange('encarregado', draft.encarregado);
    if (draft.soldador) handleHeaderChange('soldador', draft.soldador);
    if (draft.equipeDescricao) handleHeaderChange('equipeDescricao', draft.equipeDescricao);
    if (draft.condicaoClimatica) handleHeaderChange('condicaoClimatica', draft.condicaoClimatica);
    if (draft.horarioInicio) handleHeaderChange('horarioInicio', draft.horarioInicio);
    if (draft.horarioTermino) handleHeaderChange('horarioTermino', draft.horarioTermino);
    if (draft.horasParadas !== undefined && draft.horasParadas !== null) handleHeaderChange('horasParadas', draft.horasParadas);
    if (draft.motivoParada) handleHeaderChange('motivoParada', draft.motivoParada);
    if (draft.observacoes) handleHeaderChange('observacoes', draft.observacoes);

    if (draft.linhas && draft.linhas.length > 0) {
      setLines((prev) => {
        const next = [...prev];
        draft.linhas!.forEach((dl) => {
          const idx = dl.numeroLinha - 1;
          if (idx >= 0 && idx < 25) {
            next[idx] = { ...next[idx], ...dl };
          }
        });
        return next;
      });
    }

    setSuccessMessage('Rascunho local restaurado com sucesso!');
    setTimeout(() => setSuccessMessage(null), 4000);
  }, [handleHeaderChange]);

  const handleDiscardDraft = useCallback(() => {
    setSuccessMessage('Rascunho descartado.');
    setTimeout(() => setSuccessMessage(null), 3000);
  }, []);

  const handleSignApontador = useCallback((signed: boolean) => {
    setAssinadoApontador(signed);
    setDataAssinaturaApontador(signed ? new Date() : null);
  }, []);

  // Save as Draft (HTTP API)
  const handleSaveDraftApi = async () => {
    if (isSavingDraft || isSubmitting) return;
    setIsSavingDraft(true);
    setErrorMessage(null);
    setValidationErrors([]);

    try {
      const payload = {
        ...currentRdpPayload,
        status: 'RASCUNHO',
      };

      const res = await fetch('/api/rdp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erro ao salvar rascunho no servidor');
      }

      setSuccessMessage('Rascunho salvo no servidor com sucesso!');
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Falha ao salvar rascunho');
    } finally {
      setIsSavingDraft(false);
    }
  };

  // Submit Final Report (HTTP API)
  const handleSubmitFinal = async () => {
    if (isSubmitting || isSavingDraft) return;

    setErrorMessage(null);
    setValidationErrors([]);

    // Pre-validate
    const validation = validateRdpSubmission({
      ...currentRdpPayload,
      horasParadas: Number(headerState.horasParadas) || 0,
      linhas: lines,
    });

    if (!validation.valid) {
      setValidationErrors(validation.errors);
      setErrorMessage('Por favor, corrija os erros de validação antes de submeter.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (!assinadoApontador) {
      setErrorMessage('É obrigatório apor o visto/assinatura digital do apontador antes de submeter o relatório.');
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        ...currentRdpPayload,
        status: 'SUBMETIDO',
        assinadoApontador: true,
        dataAssinaturaApontador: dataAssinaturaApontador || new Date(),
        horasTrabalhadas: liveTotals.horasTrabalhadas,
        horasParadas: Number(headerState.horasParadas) || 0,
      };

      const res = await fetch('/api/rdp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await res.json();
      if (!res.ok) {
        if (result.errors && Array.isArray(result.errors)) {
          setValidationErrors(result.errors);
        }
        throw new Error(result.error || 'Erro ao submeter relatório diário');
      }

      // PURGE localStorage draft upon 200/201 HTTP success ONLY
      purgeDraftFromLocalStorage(headerState.obraId, headerState.data, currentUser.id);

      setSuccessMessage('Relatório Diário de Produção submetido com sucesso!');
      setTimeout(() => {
        router.push('/medicao/apontador/rdp');
      }, 1200);
    } catch (err: any) {
      setErrorMessage(err.message || 'Falha ao submeter relatório diário');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Top Bar with Navigation and Action Buttons */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-sm border border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.push('/medicao/apontador/rdp')}
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
              {initialData?.id ? 'Editar Relatório Diário' : 'Novo Relatório Diário (RDP)'}
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Apontamento oficial de campo com 25 linhas, motor de cálculos e autosave contínuo
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
          <button
            type="button"
            onClick={handleSaveDraftApi}
            disabled={isSavingDraft || isSubmitting}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 bg-white hover:bg-slate-50 text-xs sm:text-sm font-semibold shadow-sm transition disabled:opacity-50"
          >
            <Save className="w-4 h-4 text-slate-500" />
            <span>{isSavingDraft ? 'Salvando...' : 'Salvar Rascunho'}</span>
          </button>

          <button
            type="button"
            onClick={handleSubmitFinal}
            disabled={isSubmitting || isSavingDraft}
            className="inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold shadow-md shadow-emerald-900/10 transition disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
            <span>{isSubmitting ? 'Submetendo...' : 'Submeter Relatório'}</span>
          </button>
        </div>
      </div>

      {/* Success Notification */}
      {successMessage && (
        <div className="bg-emerald-50 border border-emerald-300 text-emerald-800 rounded-2xl p-4 flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span className="text-sm font-semibold">{successMessage}</span>
        </div>
      )}

      {/* Error Message & Validation List */}
      {(errorMessage || validationErrors.length > 0) && (
        <div className="bg-rose-50 border border-rose-300 text-rose-800 rounded-2xl p-4 space-y-2">
          <div className="flex items-center gap-2 font-bold text-sm">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            <span>{errorMessage || 'Erros de validação encontrados:'}</span>
          </div>
          {validationErrors.length > 0 && (
            <ul className="list-disc list-inside text-xs space-y-1 text-rose-700 font-medium pl-1">
              {validationErrors.map((err, i) => (
                <li key={i}>{err}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* LocalStorage Autosave and Recovery Banner */}
      <RdpLocalDraftManager
        obraId={headerState.obraId}
        data={headerState.data}
        userId={currentUser.id}
        currentRdpData={currentRdpPayload}
        onRestoreDraft={handleRestoreDraft}
        onDiscardDraft={handleDiscardDraft}
      />

      {/* Sticky Real-Time Totals Bar */}
      <RdpTotalsBar totals={liveTotals} isSticky={true} />

      {/* Section 1: Header Information */}
      <RdpHeaderForm
        obras={obras}
        apontadorNome={currentUser.name}
        state={headerState}
        onChange={handleHeaderChange}
        horasTrabalhadas={liveTotals.horasTrabalhadas}
      />

      {/* Section 2: 25-Row Production Grid */}
      <RdpProductionGrid
        lines={lines}
        onLineChange={handleLineChange}
        readOnly={false}
        estacasPrincipais={estacas}
      />

      {/* Section 3: Signatures and Field Observations */}
      <RdpSignatures
        observacoes={headerState.observacoes || ''}
        onObservacoesChange={(val) => handleHeaderChange('observacoes', val)}
        assinadoApontador={assinadoApontador}
        dataAssinaturaApontador={dataAssinaturaApontador}
        nomeApontador={currentUser.name}
        onSignApontador={handleSignApontador}
        readOnly={false}
      />

      {/* Bottom Sticky Action Bar on Mobile */}
      <div className="sm:hidden fixed bottom-0 left-0 right-0 p-3 bg-white/95 backdrop-blur-md border-t border-slate-200 z-40 flex items-center gap-2">
        <button
          type="button"
          onClick={handleSaveDraftApi}
          disabled={isSavingDraft || isSubmitting}
          className="flex-1 h-11 inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-300 text-slate-700 font-semibold text-xs"
        >
          <Save className="w-4 h-4" />
          <span>Rascunho</span>
        </button>
        <button
          type="button"
          onClick={handleSubmitFinal}
          disabled={isSubmitting || isSavingDraft}
          className="flex-1 h-11 inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 text-white font-bold text-xs shadow-md"
        >
          <Send className="w-4 h-4" />
          <span>Submeter</span>
        </button>
      </div>
    </div>
  );
}
