'use client';

import React, { useState } from 'react';
import { ProposalStatus, PROPOSAL_GROUPS_ORDER } from '@/lib/proposals-types';
import { Check } from 'lucide-react';

interface StatusCellProps {
  value: ProposalStatus;
  onChange: (newStatus: ProposalStatus) => void;
}

export const STATUS_PILL_STYLES: Record<ProposalStatus, { label: string; bg: string; text: string }> = {
  NEW: {
    label: 'nova proposta',
    bg: 'bg-[#DBEAFE]',
    text: 'text-[#1E40AF]',
  },
  IN_PROGRESS: {
    label: 'em elaboração',
    bg: 'bg-[#FEF3C7]',
    text: 'text-[#92400E]',
  },
  SENT: {
    label: 'enviada ao cliente',
    bg: 'bg-[#F3E8FF]',
    text: 'text-[#6B21A8]',
  },
  WON: {
    label: 'proposta ganha',
    bg: 'bg-[#D1FAE5]',
    text: 'text-[#065F46]',
  },
  DECLINED: {
    label: 'declinada / rejeitada',
    bg: 'bg-[#FEE2E2]',
    text: 'text-[#991B1B]',
  },
  LOST: {
    label: 'proposta perdida',
    bg: 'bg-[#F1F5F9]',
    text: 'text-[#475569]',
  },
  IN_REVISION: {
    label: 'em revisão',
    bg: 'bg-[#FCE7F3]',
    text: 'text-[#9D174D]',
  },
  HISTORY: {
    label: 'arquivada',
    bg: 'bg-[#F1F5F9]',
    text: 'text-[#475569]',
  },
};

export function StatusCell({ value, onChange }: StatusCellProps) {
  const [isOpen, setIsOpen] = useState(false);
  const style = STATUS_PILL_STYLES[value] || STATUS_PILL_STYLES.NEW;

  return (
    <div className="relative inline-block w-full text-center">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full py-0.5 px-3 rounded-full text-[11px] font-semibold tracking-tight transition-all hover:brightness-95 ${style.bg} ${style.text}`}
      >
        <span className="truncate block">{style.label}</span>
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute left-1/2 -translate-x-1/2 top-full mt-1 w-48 bg-white border border-slate-200 rounded-xl shadow-xl z-50 py-1.5 overflow-hidden">
            {PROPOSAL_GROUPS_ORDER.map((statusKey) => {
              const cfg = STATUS_PILL_STYLES[statusKey];
              const isSelected = statusKey === value;
              return (
                <button
                  key={statusKey}
                  onClick={() => {
                    onChange(statusKey);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-1.5 text-xs text-left hover:bg-slate-50 transition-colors ${
                    isSelected ? 'font-bold' : ''
                  }`}
                >
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${cfg.bg} ${cfg.text}`}>
                    {cfg.label}
                  </span>
                  {isSelected && <Check className="w-3.5 h-3.5 text-slate-900" />}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
