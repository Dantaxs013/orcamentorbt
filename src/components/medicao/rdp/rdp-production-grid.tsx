'use client';

import React, { useState } from 'react';
import { LinhaProducaoItem, calculateLineMetrics } from '@/lib/calculations/rdp-math';
import { Table, ChevronDown, ChevronUp, Layers, CheckCircle2, AlertCircle } from 'lucide-react';

export interface EstacaOption {
  id: string;
  obraId?: string | null;
  nome: string;
  perfil: string;
  comprimento: number;
}

interface RdpProductionGridProps {
  lines: LinhaProducaoItem[];
  onLineChange?: (index: number, field: keyof LinhaProducaoItem, value: unknown) => void;
  readOnly?: boolean;
  estacasPrincipais?: EstacaOption[];
}

const COMMON_PROFILES = [
  'W150x22.5',
  'W150x29.8',
  'W150x37.1',
  'W310x32.7',
  'W310x38.7',
  'W310x52.0',
  'Trilho TR-37',
  'Trilho TR-45',
  'Tubular',
  'Outro',
];

export function RdpProductionGrid({
  lines,
  onLineChange,
  readOnly = false,
  estacasPrincipais = [],
}: RdpProductionGridProps) {
  // Mobile active expanded line (accordion style on small screens)
  const [activeMobileLine, setActiveMobileLine] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');

  const handleLineChange = (index: number, field: keyof LinhaProducaoItem, value: unknown) => {
    if (!readOnly && onLineChange) {
      onLineChange(index, field, value);

      // Autopreenchimento inteligente se o nome da estaca coincidir com uma cadastrada
      if (field === 'numeroEstaca' && typeof value === 'string' && estacasPrincipais.length > 0) {
        const valUpper = value.trim().toUpperCase();
        const match = estacasPrincipais.find(
          (e) => e.nome.trim().toUpperCase() === valUpper
        );
        if (match) {
          // Preenche perfil se vazio
          if (!lines[index]?.perfil || lines[index]?.perfil.trim() === '') {
            onLineChange(index, 'perfil', match.perfil);
          }
          // Preenche comprimento se 0 ou vazio
          if (!lines[index]?.comprimento || Number(lines[index]?.comprimento) === 0) {
            onLineChange(index, 'comprimento', match.comprimento);
          }
        }
      }
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      {/* Header Bar */}
      <div className="p-4 sm:p-5 border-b border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-50/50">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
            <Table className="w-5 h-5 text-emerald-600" />
            <span>Grade de Produção Padronizada (25 Linhas)</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Registro detalhado de cravação de estacas, emendas metálicas, talas e arrasamentos
          </p>
        </div>

        {/* View mode toggle for mobile devices */}
        <div className="flex sm:hidden items-center gap-1 bg-slate-200 p-1 rounded-xl text-xs font-semibold">
          <button
            type="button"
            onClick={() => setViewMode('table')}
            className={`px-3 py-1 rounded-lg transition ${
              viewMode === 'table' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
            }`}
          >
            Tabela
          </button>
          <button
            type="button"
            onClick={() => setViewMode('cards')}
            className={`px-3 py-1 rounded-lg transition ${
              viewMode === 'cards' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
            }`}
          >
            Cards (Mobile)
          </button>
        </div>
      </div>

      {/* Cards View (Mobile Accordion Optimized for 360px+) */}
      {viewMode === 'cards' && (
        <div className="sm:hidden divide-y divide-slate-100 p-3 space-y-2">
          {lines.map((line, idx) => {
            const metrics = calculateLineMetrics(line);
            const isFilled = Boolean(line.numeroEstaca && line.numeroEstaca.trim().length > 0);
            const isExpanded = activeMobileLine === idx;

            return (
              <div
                key={line.numeroLinha}
                className={`rounded-xl border transition ${
                  isFilled ? 'border-emerald-200 bg-emerald-50/20' : 'border-slate-200 bg-white'
                }`}
              >
                {/* Accordion Header */}
                <button
                  type="button"
                  onClick={() => setActiveMobileLine(isExpanded ? null : idx)}
                  className="w-full p-3 flex items-center justify-between text-left"
                >
                  <div className="flex items-center gap-2.5">
                    <span
                      className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black ${
                        isFilled ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {String(line.numeroLinha).padStart(2, '0')}
                    </span>
                    <div>
                      <div className="text-xs font-bold text-slate-800">
                        {line.numeroEstaca || <span className="text-slate-400 font-normal">Estaca não preenchida</span>}
                      </div>
                      {isFilled && (
                        <div className="text-[11px] text-slate-500">
                          {line.perfil || 'Perfil N/D'} • {metrics.comprimento.toFixed(2)}m (Útil: {(metrics.comprimentoUtil ?? 0).toFixed(2)}m)
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {isFilled && (
                      <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                        {metrics.comprimento.toFixed(1)}m
                      </span>
                    )}
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-slate-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-slate-400" />
                    )}
                  </div>
                </button>

                {/* Expanded Form Fields for this line */}
                {isExpanded && (
                  <div className="p-3 pt-0 border-t border-slate-100 space-y-3 mt-1">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[11px] font-bold text-slate-600">Nº Estaca</label>
                        <input
                          type="text"
                          placeholder="Ex: E-01"
                          list="estacas-principais-datalist"
                          value={line.numeroEstaca || ''}
                          disabled={readOnly}
                          onChange={(e) => handleLineChange(idx, 'numeroEstaca', e.target.value)}
                          className="w-full h-9 px-2 text-xs font-semibold bg-slate-50 border border-slate-300 rounded-lg focus:ring-1 focus:ring-emerald-500"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-slate-600">Perfil</label>
                        <input
                          type="text"
                          placeholder="Ex: W150x22.5"
                          list="perfis-datalist"
                          value={line.perfil || ''}
                          disabled={readOnly}
                          onChange={(e) => handleLineChange(idx, 'perfil', e.target.value)}
                          className="w-full h-9 px-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:ring-1 focus:ring-emerald-500"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="text-[11px] font-bold text-slate-600">Comprimento (m)</label>
                        <input
                          type="text"
                          placeholder="0,00"
                          value={line.comprimento ?? ''}
                          disabled={readOnly}
                          onChange={(e) => handleLineChange(idx, 'comprimento', e.target.value)}
                          className="w-full h-9 px-2 text-xs font-bold text-emerald-800 bg-emerald-50/50 border border-emerald-300 rounded-lg"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-slate-600">Arrasamento (m)</label>
                        <input
                          type="text"
                          placeholder="0,00"
                          value={line.arrasamento ?? ''}
                          disabled={readOnly}
                          onChange={(e) => handleLineChange(idx, 'arrasamento', e.target.value)}
                          className="w-full h-9 px-2 text-xs font-bold text-rose-800 bg-rose-50/50 border border-rose-300 rounded-lg"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-slate-600">Comp. Útil</label>
                        <div className="w-full h-9 px-2 text-xs font-black text-slate-700 bg-slate-100 rounded-lg flex items-center">
                          {(metrics.comprimentoUtil ?? 0).toFixed(2)}m
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="text-[11px] font-bold text-slate-600">Emenda W150</label>
                        <input
                          type="number"
                          min="0"
                          value={line.emendaW150 ?? 0}
                          disabled={readOnly}
                          onChange={(e) => handleLineChange(idx, 'emendaW150', e.target.value)}
                          className="w-full h-9 px-2 text-xs bg-slate-50 border border-slate-300 rounded-lg"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-slate-600">Emenda W310</label>
                        <input
                          type="number"
                          min="0"
                          value={line.emendaW310 ?? 0}
                          disabled={readOnly}
                          onChange={(e) => handleLineChange(idx, 'emendaW310', e.target.value)}
                          className="w-full h-9 px-2 text-xs bg-slate-50 border border-slate-300 rounded-lg"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-slate-600">Talas (un)</label>
                        <input
                          type="number"
                          min="0"
                          value={line.talas ?? 0}
                          disabled={readOnly}
                          onChange={(e) => handleLineChange(idx, 'talas', e.target.value)}
                          className="w-full h-9 px-2 text-xs bg-slate-50 border border-slate-300 rounded-lg"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[11px] font-bold text-slate-600">Hora Início</label>
                        <input
                          type="time"
                          value={line.horaInicio || ''}
                          disabled={readOnly}
                          onChange={(e) => handleLineChange(idx, 'horaInicio', e.target.value)}
                          className="w-full h-9 px-2 text-xs bg-slate-50 border border-slate-300 rounded-lg"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-slate-600">Hora Fim</label>
                        <input
                          type="time"
                          value={line.horaFim || ''}
                          disabled={readOnly}
                          onChange={(e) => handleLineChange(idx, 'horaFim', e.target.value)}
                          className="w-full h-9 px-2 text-xs bg-slate-50 border border-slate-300 rounded-lg"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-600">Nega / Repique</label>
                      <input
                        type="text"
                        placeholder="Ex: Nega 15mm/10 golpes | Repique 6mm"
                        value={line.negaRepique || ''}
                        disabled={readOnly}
                        onChange={(e) => handleLineChange(idx, 'negaRepique', e.target.value)}
                        className="w-full h-9 px-2 text-xs bg-slate-50 border border-slate-300 rounded-lg"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-600">Observações</label>
                      <input
                        type="text"
                        placeholder="Ex: Encontrou rocha a 12m"
                        value={line.observacao || ''}
                        disabled={readOnly}
                        onChange={(e) => handleLineChange(idx, 'observacao', e.target.value)}
                        className="w-full h-9 px-2 text-xs bg-slate-50 border border-slate-300 rounded-lg"
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Responsive Table View (Default on desktop/tablets, scrollable horizontally on mobile) */}
      <div className={`overflow-x-auto ${viewMode === 'cards' ? 'hidden sm:block' : 'block'}`}>
          <table className="w-full text-left text-xs border-collapse min-w-[1100px]">
            <thead>
              <tr className="bg-slate-900 text-white font-bold tracking-wider text-[11px] uppercase divide-x divide-slate-800">
                <th className="py-3 px-2 w-12 text-center sticky left-0 z-10 bg-slate-900">#</th>
                <th className="py-3 px-3 w-28">Nº Estaca</th>
                <th className="py-3 px-3 w-36">Perfil</th>
                <th className="py-3 px-2 w-20 text-center">Início</th>
                <th className="py-3 px-2 w-20 text-center">Fim</th>
                <th className="py-3 px-3 w-28 text-right bg-slate-800/80">Comp. (m)</th>
                <th className="py-3 px-2.5 w-24 text-right">Cota Terr.</th>
                <th className="py-3 px-2.5 w-24 text-right">Cota Arras.</th>
                <th className="py-3 px-2 w-20 text-center">Emenda W150</th>
                <th className="py-3 px-2 w-20 text-center">Emenda W310</th>
                <th className="py-3 px-2 w-16 text-center">Talas</th>
                <th className="py-3 px-3 w-24 text-right bg-rose-950/60">Arras. (m)</th>
                <th className="py-3 px-3 w-24 text-right bg-emerald-950/60 text-emerald-300">Útil (m)</th>
                <th className="py-3 px-3 w-40">Nega / Repique</th>
                <th className="py-3 px-3 min-w-[140px]">Observações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 font-medium text-slate-800">
              {lines.map((line, idx) => {
                const metrics = calculateLineMetrics(line);
                const isFilled = Boolean(line.numeroEstaca && line.numeroEstaca.trim().length > 0);
                const isEven = idx % 2 === 0;

                return (
                  <tr
                    key={line.numeroLinha}
                    className={`hover:bg-slate-100/80 transition-colors ${
                      isFilled ? 'bg-emerald-50/20' : isEven ? 'bg-white' : 'bg-slate-50/50'
                    }`}
                  >
                    {/* Index */}
                    <td className="py-2 px-2 text-center font-bold text-slate-600 bg-inherit sticky left-0 z-10 border-r border-slate-200">
                      <span
                        className={`inline-block w-6 h-6 leading-6 rounded-md text-xs ${
                          isFilled ? 'bg-emerald-600 text-white font-black' : 'text-slate-500'
                        }`}
                      >
                        {String(line.numeroLinha).padStart(2, '0')}
                      </span>
                    </td>

                    {/* Nº Estaca */}
                    <td className="p-1 px-2 border-r border-slate-200">
                      <input
                        type="text"
                        placeholder="E-..."
                        list="estacas-principais-datalist"
                        value={line.numeroEstaca || ''}
                        disabled={readOnly}
                        onChange={(e) => handleLineChange(idx, 'numeroEstaca', e.target.value)}
                        className="w-full h-8 px-2 font-bold text-slate-900 bg-transparent hover:bg-white focus:bg-white border border-transparent hover:border-slate-300 focus:border-emerald-500 rounded-md transition"
                      />
                    </td>

                    {/* Perfil */}
                    <td className="p-1 px-2 border-r border-slate-200">
                      <input
                        type="text"
                        placeholder="W150 / W310"
                        list="perfis-datalist"
                        value={line.perfil || ''}
                        disabled={readOnly}
                        onChange={(e) => handleLineChange(idx, 'perfil', e.target.value)}
                        className="w-full h-8 px-2 bg-transparent hover:bg-white focus:bg-white border border-transparent hover:border-slate-300 focus:border-emerald-500 rounded-md transition"
                      />
                    </td>

                    {/* Hora Início */}
                    <td className="p-1 px-1 border-r border-slate-200">
                      <input
                        type="time"
                        value={line.horaInicio || ''}
                        disabled={readOnly}
                        onChange={(e) => handleLineChange(idx, 'horaInicio', e.target.value)}
                        className="w-full h-8 px-1 text-center bg-transparent hover:bg-white focus:bg-white border border-transparent hover:border-slate-300 focus:border-emerald-500 rounded-md transition text-[11px]"
                      />
                    </td>

                    {/* Hora Fim */}
                    <td className="p-1 px-1 border-r border-slate-200">
                      <input
                        type="time"
                        value={line.horaFim || ''}
                        disabled={readOnly}
                        onChange={(e) => handleLineChange(idx, 'horaFim', e.target.value)}
                        className="w-full h-8 px-1 text-center bg-transparent hover:bg-white focus:bg-white border border-transparent hover:border-slate-300 focus:border-emerald-500 rounded-md transition text-[11px]"
                      />
                    </td>

                    {/* Comprimento / Profundidade (m) */}
                    <td className="p-1 px-2 border-r border-slate-200 bg-slate-50/40">
                      <input
                        type="text"
                        placeholder="0,00"
                        value={line.comprimento ?? ''}
                        disabled={readOnly}
                        onChange={(e) => handleLineChange(idx, 'comprimento', e.target.value)}
                        className="w-full h-8 px-2 text-right font-bold text-slate-900 bg-transparent hover:bg-white focus:bg-white border border-transparent hover:border-emerald-400 focus:border-emerald-500 rounded-md transition"
                      />
                    </td>

                    {/* Cota Terreno */}
                    <td className="p-1 px-1 border-r border-slate-200">
                      <input
                        type="text"
                        placeholder="0,00"
                        value={line.cotaTerreno ?? ''}
                        disabled={readOnly}
                        onChange={(e) => handleLineChange(idx, 'cotaTerreno', e.target.value)}
                        className="w-full h-8 px-1.5 text-right text-slate-600 bg-transparent hover:bg-white focus:bg-white border border-transparent hover:border-slate-300 focus:border-emerald-500 rounded-md transition"
                      />
                    </td>

                    {/* Cota Arrasamento */}
                    <td className="p-1 px-1 border-r border-slate-200">
                      <input
                        type="text"
                        placeholder="0,00"
                        value={line.cotaArrasamento ?? ''}
                        disabled={readOnly}
                        onChange={(e) => handleLineChange(idx, 'cotaArrasamento', e.target.value)}
                        className="w-full h-8 px-1.5 text-right text-slate-600 bg-transparent hover:bg-white focus:bg-white border border-transparent hover:border-slate-300 focus:border-emerald-500 rounded-md transition"
                      />
                    </td>

                    {/* Emenda W150 */}
                    <td className="p-1 px-1 border-r border-slate-200 text-center">
                      <input
                        type="number"
                        min="0"
                        value={line.emendaW150 ?? 0}
                        disabled={readOnly}
                        onChange={(e) => handleLineChange(idx, 'emendaW150', e.target.value)}
                        className="w-full h-8 px-1 text-center bg-transparent hover:bg-white focus:bg-white border border-transparent hover:border-slate-300 focus:border-emerald-500 rounded-md transition"
                      />
                    </td>

                    {/* Emenda W310 */}
                    <td className="p-1 px-1 border-r border-slate-200 text-center">
                      <input
                        type="number"
                        min="0"
                        value={line.emendaW310 ?? 0}
                        disabled={readOnly}
                        onChange={(e) => handleLineChange(idx, 'emendaW310', e.target.value)}
                        className="w-full h-8 px-1 text-center bg-transparent hover:bg-white focus:bg-white border border-transparent hover:border-slate-300 focus:border-emerald-500 rounded-md transition"
                      />
                    </td>

                    {/* Talas */}
                    <td className="p-1 px-1 border-r border-slate-200 text-center">
                      <input
                        type="number"
                        min="0"
                        value={line.talas ?? 0}
                        disabled={readOnly}
                        onChange={(e) => handleLineChange(idx, 'talas', e.target.value)}
                        className="w-full h-8 px-1 text-center bg-transparent hover:bg-white focus:bg-white border border-transparent hover:border-slate-300 focus:border-emerald-500 rounded-md transition"
                      />
                    </td>

                    {/* Arrasamento (m) */}
                    <td className="p-1 px-2 border-r border-slate-200 bg-rose-50/20">
                      <input
                        type="text"
                        placeholder="0,00"
                        value={line.arrasamento ?? ''}
                        disabled={readOnly}
                        onChange={(e) => handleLineChange(idx, 'arrasamento', e.target.value)}
                        className="w-full h-8 px-2 text-right font-semibold text-rose-700 bg-transparent hover:bg-white focus:bg-white border border-transparent hover:border-rose-300 focus:border-rose-500 rounded-md transition"
                      />
                    </td>

                    {/* Comprimento Útil (calculado) */}
                    <td className="py-2 px-3 text-right font-black text-emerald-800 bg-emerald-50/40 border-r border-slate-200">
                      {(metrics.comprimentoUtil ?? 0).toFixed(2)}
                    </td>

                    {/* Nega / Repique */}
                    <td className="p-1 px-2 border-r border-slate-200">
                      <input
                        type="text"
                        placeholder="Nega / Repique"
                        value={line.negaRepique || ''}
                        disabled={readOnly}
                        onChange={(e) => handleLineChange(idx, 'negaRepique', e.target.value)}
                        className="w-full h-8 px-2 text-slate-700 bg-transparent hover:bg-white focus:bg-white border border-transparent hover:border-slate-300 focus:border-emerald-500 rounded-md transition"
                      />
                    </td>

                    {/* Observações */}
                    <td className="p-1 px-2">
                      <input
                        type="text"
                        placeholder="Observações da estaca"
                        value={line.observacao || ''}
                        disabled={readOnly}
                        onChange={(e) => handleLineChange(idx, 'observacao', e.target.value)}
                        className="w-full h-8 px-2 text-slate-600 bg-transparent hover:bg-white focus:bg-white border border-transparent hover:border-slate-300 focus:border-emerald-500 rounded-md transition"
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

      {/* HTML Datalist for common pile profiles */}
      <datalist id="perfis-datalist">
        {COMMON_PROFILES.map((p) => (
          <option key={p} value={p} />
        ))}
      </datalist>

      {/* HTML Datalist para estacas principais de projeto cadastradas */}
      <datalist id="estacas-principais-datalist">
        {estacasPrincipais.map((estaca) => (
          <option key={estaca.id} value={estaca.nome}>
            {estaca.nome} — {estaca.perfil} ({Number(estaca.comprimento || 0).toFixed(1)}m)
          </option>
        ))}
      </datalist>
    </div>
  );
}
