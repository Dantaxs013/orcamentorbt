'use client';

import React from 'react';
import { useValuesVisibility } from '@/lib/ValuesVisibilityContext';

interface BoardFooterTotalsProps {
  count: number;
  totalValue: number;
}

export function BoardFooterTotals({ count, totalValue }: BoardFooterTotalsProps) {
  const { formatCurrency } = useValuesVisibility();

  return (
    <div className="flex items-center justify-between px-5 py-2.5 bg-[#111827] text-white border-t border-slate-800 text-xs font-medium">
      {/* Rótulo sem o símbolo Sigma */}
      <span className="font-extrabold text-black">
        Subtotal do Grupo ({count} propostas)
      </span>

      <div className="flex items-center gap-3">
        <span className="text-slate-700 font-bold text-xs">Soma Total:</span>
        <span className="text-xs font-extrabold text-slate-900 px-3 py-1 rounded-lg bg-white border border-[#2563EB] shadow-2xs tracking-wide">
          {formatCurrency(totalValue)}
        </span>
      </div>
    </div>
  );
}
