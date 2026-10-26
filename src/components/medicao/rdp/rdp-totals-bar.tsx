'use client';

import React from 'react';
import { RdpTotals } from '@/lib/calculations/rdp-math';
import { Hash, Ruler, Layers, Scissors, CheckCircle2, Clock } from 'lucide-react';

interface RdpTotalsBarProps {
  totals: RdpTotals;
  isSticky?: boolean;
}

export function RdpTotalsBar({ totals, isSticky = true }: RdpTotalsBarProps) {
  return (
    <div
      className={`bg-slate-900 text-white rounded-2xl shadow-xl border border-slate-800 p-4 transition-all duration-200 ${
        isSticky ? 'sticky top-4 z-30 backdrop-blur-md bg-slate-900/95' : ''
      }`}
    >
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        {/* Title and main highlight */}
        <div className="flex items-center justify-between sm:justify-start gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Totais em Tempo Real
              </span>
            </div>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="text-2xl font-black text-white tracking-tight">
                {totals.metragemLiquida.toFixed(2)}
              </span>
              <span className="text-xs font-semibold text-emerald-400 uppercase">m Líquidos</span>
            </div>
          </div>

          <div className="h-8 w-px bg-slate-800 hidden sm:block"></div>

          {/* Quick estacas badge */}
          <div className="flex items-center gap-2 bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-700/60">
            <Hash className="w-4 h-4 text-emerald-400" />
            <span className="text-xs text-slate-300 font-medium">Estacas:</span>
            <span className="text-base font-bold text-white">{totals.totalEstacas}</span>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2.5">
          {/* Metragem Total */}
          <div className="bg-slate-800/60 rounded-xl p-2.5 border border-slate-700/40">
            <div className="flex items-center gap-1.5 text-slate-400 text-xs font-medium">
              <Ruler className="w-3.5 h-3.5 text-blue-400" />
              <span>Metragem Bruta</span>
            </div>
            <div className="text-sm sm:text-base font-bold text-white mt-1">
              {totals.metragemTotal.toFixed(2)} <span className="text-xs font-normal text-slate-400">m</span>
            </div>
          </div>

          {/* Emendas W150 */}
          <div className="bg-slate-800/60 rounded-xl p-2.5 border border-slate-700/40">
            <div className="flex items-center gap-1.5 text-slate-400 text-xs font-medium">
              <Layers className="w-3.5 h-3.5 text-amber-400" />
              <span>Emenda W150</span>
            </div>
            <div className="text-sm sm:text-base font-bold text-white mt-1">
              {totals.totalW150} <span className="text-xs font-normal text-slate-400">un</span>
            </div>
          </div>

          {/* Emendas W310 */}
          <div className="bg-slate-800/60 rounded-xl p-2.5 border border-slate-700/40">
            <div className="flex items-center gap-1.5 text-slate-400 text-xs font-medium">
              <Layers className="w-3.5 h-3.5 text-orange-400" />
              <span>Emenda W310</span>
            </div>
            <div className="text-sm sm:text-base font-bold text-white mt-1">
              {totals.totalW310} <span className="text-xs font-normal text-slate-400">un</span>
            </div>
          </div>

          {/* Total Talas */}
          <div className="bg-slate-800/60 rounded-xl p-2.5 border border-slate-700/40">
            <div className="flex items-center gap-1.5 text-slate-400 text-xs font-medium">
              <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />
              <span>Total Talas</span>
            </div>
            <div className="text-sm sm:text-base font-bold text-white mt-1">
              {totals.totalTalas} <span className="text-xs font-normal text-slate-400">un</span>
            </div>
          </div>

          {/* Arrasamento Total */}
          <div className="bg-slate-800/60 rounded-xl p-2.5 border border-slate-700/40">
            <div className="flex items-center gap-1.5 text-slate-400 text-xs font-medium">
              <Scissors className="w-3.5 h-3.5 text-rose-400" />
              <span>Arrasamento</span>
            </div>
            <div className="text-sm sm:text-base font-bold text-rose-300 mt-1">
              {totals.totalArrasamento.toFixed(2)} <span className="text-xs font-normal text-rose-400/80">m</span>
            </div>
          </div>

          {/* Horas Produtivas / Paradas */}
          <div className="bg-slate-800/60 rounded-xl p-2.5 border border-slate-700/40">
            <div className="flex items-center gap-1.5 text-slate-400 text-xs font-medium">
              <Clock className="w-3.5 h-3.5 text-purple-400" />
              <span>Horas Prod./Par.</span>
            </div>
            <div className="text-sm sm:text-base font-bold text-white mt-1">
              {(totals.horasTrabalhadas || 0).toFixed(1)}h / {(totals.horasParadas || 0).toFixed(1)}h
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
