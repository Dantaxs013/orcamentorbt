'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Save, AlertCircle, RefreshCw, Trash2, CheckCircle } from 'lucide-react';
import { RelatorioDiarioData } from '@/lib/calculations/rdp-math';

export interface DraftStoragePayload {
  key: string;
  obraId: string;
  data: string;
  userId: string;
  timestamp: string; // ISO string
  rdpData: Partial<RelatorioDiarioData>;
}

export function buildDraftStorageKey(obraId: string, date: string, userId?: string): string {
  const normalizedDate = (date || '').split('T')[0];
  if (userId) {
    return `rbt_rdp_draft_obra_${obraId}_data_${normalizedDate}_user_${userId}`;
  }
  return `rbt_rdp_draft_${obraId}_${normalizedDate}`;
}

export function getAlternativeDraftKey(obraId: string, date: string): string {
  const normalizedDate = (date || '').split('T')[0];
  return `rbt_rdp_draft_${obraId}_${normalizedDate}`;
}

export function saveDraftToLocalStorage(
  obraId: string,
  date: string,
  userId: string,
  rdpData: Partial<RelatorioDiarioData>
): DraftStoragePayload | null {
  if (typeof window === 'undefined' || !window.localStorage) return null;
  if (!obraId || !date) return null;

  try {
    const key = buildDraftStorageKey(obraId, date, userId);
    const altKey = getAlternativeDraftKey(obraId, date);
    const payload: DraftStoragePayload = {
      key,
      obraId,
      data: date.split('T')[0],
      userId: userId || 'anonymous',
      timestamp: new Date().toISOString(),
      rdpData,
    };

    const serialized = JSON.stringify(payload);
    window.localStorage.setItem(key, serialized);
    window.localStorage.setItem(altKey, serialized);
    return payload;
  } catch (err) {
    console.warn('[LocalStorage Autosave] Falha ao persistir rascunho:', err);
    return null;
  }
}

export function loadDraftFromLocalStorage(
  obraId: string,
  date: string,
  userId?: string
): DraftStoragePayload | null {
  if (typeof window === 'undefined' || !window.localStorage) return null;
  if (!obraId || !date) return null;

  try {
    const key = buildDraftStorageKey(obraId, date, userId);
    const altKey = getAlternativeDraftKey(obraId, date);

    let raw = window.localStorage.getItem(key);
    if (!raw) {
      raw = window.localStorage.getItem(altKey);
    }
    if (!raw) return null;

    const parsed = JSON.parse(raw) as DraftStoragePayload;
    return parsed;
  } catch (err) {
    console.warn('[LocalStorage Recovery] Rascunho corrompido:', err);
    return null;
  }
}

export function purgeDraftFromLocalStorage(
  obraId: string,
  date: string,
  userId?: string
): boolean {
  if (typeof window === 'undefined' || !window.localStorage) return false;
  if (!obraId || !date) return false;

  try {
    const key = buildDraftStorageKey(obraId, date, userId);
    const altKey = getAlternativeDraftKey(obraId, date);
    const hadKey = window.localStorage.getItem(key) !== null || window.localStorage.getItem(altKey) !== null;

    window.localStorage.removeItem(key);
    window.localStorage.removeItem(altKey);
    return hadKey;
  } catch {
    return false;
  }
}

interface RdpLocalDraftProps {
  obraId: string;
  data: string;
  userId: string;
  currentRdpData: Partial<RelatorioDiarioData>;
  onRestoreDraft: (restoredData: Partial<RelatorioDiarioData>) => void;
  onDiscardDraft?: () => void;
}

export function RdpLocalDraftManager({
  obraId,
  data,
  userId,
  currentRdpData,
  onRestoreDraft,
  onDiscardDraft,
}: RdpLocalDraftProps) {
  const [detectedDraft, setDetectedDraft] = useState<DraftStoragePayload | null>(null);
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const initialCheckDoneRef = useRef<boolean>(false);

  // Check for existing draft on load or context change
  useEffect(() => {
    if (!obraId || !data) {
      setDetectedDraft(null);
      return;
    }

    const found = loadDraftFromLocalStorage(obraId, data, userId);
    if (found && found.rdpData && !initialCheckDoneRef.current) {
      // Check if found draft has any content
      const hasLines = (found.rdpData.linhas || []).some(
        (l) => l.numeroEstaca || (l.comprimento && l.comprimento > 0)
      );
      const hasHeader = Boolean(found.rdpData.operador || found.rdpData.maquinaEquipamento);

      if (hasLines || hasHeader) {
        setDetectedDraft(found);
      }
    }
  }, [obraId, data, userId]);

  // Debounced Autosave (400ms debounce as specified)
  useEffect(() => {
    if (!obraId || !data) return;

    // Do not save if draft banner is pending user decision
    if (detectedDraft) return;

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    setSaveStatus('saving');
    debounceTimerRef.current = setTimeout(() => {
      const saved = saveDraftToLocalStorage(obraId, data, userId, currentRdpData);
      if (saved) {
        const timeStr = new Date(saved.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        setLastSavedTime(timeStr);
        setSaveStatus('saved');
      } else {
        setSaveStatus('idle');
      }
    }, 400);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [obraId, data, userId, currentRdpData, detectedDraft]);

  const handleRestore = useCallback(() => {
    if (detectedDraft?.rdpData) {
      initialCheckDoneRef.current = true;
      onRestoreDraft(detectedDraft.rdpData);
      setDetectedDraft(null);
    }
  }, [detectedDraft, onRestoreDraft]);

  const handleDiscard = useCallback(() => {
    if (obraId && data) {
      purgeDraftFromLocalStorage(obraId, data, userId);
    }
    initialCheckDoneRef.current = true;
    setDetectedDraft(null);
    if (onDiscardDraft) {
      onDiscardDraft();
    }
  }, [obraId, data, userId, onDiscardDraft]);

  return (
    <div className="space-y-3">
      {/* Draft Recovery Notification Banner */}
      {detectedDraft && (
        <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-fade-in">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-amber-100 rounded-xl text-amber-700 mt-0.5">
              <RefreshCw className="w-5 h-5 animate-spin" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-amber-900">
                Rascunho local recuperado do navegador
              </h4>
              <p className="text-xs text-amber-700 mt-0.5">
                Existe um preenchimento salvo automaticamente neste dispositivo em{' '}
                <span className="font-semibold">
                  {new Date(detectedDraft.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
                . Deseja restaurar os dados de estacas e cabeçalho?
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
            <button
              type="button"
              onClick={handleDiscard}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-rose-300 text-rose-700 hover:bg-rose-50 text-xs font-semibold transition"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Descartar</span>
            </button>
            <button
              type="button"
              onClick={handleRestore}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-sm transition"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Restaurar Rascunho</span>
            </button>
          </div>
        </div>
      )}

      {/* Discrete Autosave Status Indicator */}
      <div className="flex items-center justify-between text-xs px-2 text-slate-500">
        <div className="flex items-center gap-1.5">
          {saveStatus === 'saving' ? (
            <>
              <Save className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
              <span className="text-amber-600 font-medium">Gravando rascunho localmente...</span>
            </>
          ) : lastSavedTime ? (
            <>
              <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
              <span>
                Rascunho salvo no dispositivo às <span className="font-medium text-slate-700">{lastSavedTime}</span>
              </span>
            </>
          ) : (
            <>
              <Save className="w-3.5 h-3.5 text-slate-400" />
              <span>Autosave offline ativo (400ms debounce)</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
