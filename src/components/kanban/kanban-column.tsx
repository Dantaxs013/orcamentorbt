'use client';

import React from 'react';
import { KanbanCard, OrcamentoItem } from './kanban-card';

export interface ColumnDefinition {
  key: string;
  title: string;
  subtitle: string;
  statuses: string[];
  color: string;
  badge: string;
  borderAccent: string;
  dotColor: string;
  emptyIcon: React.ElementType;
  emptyTitle: string;
  emptySubtitle: string;
  category: 'EM_ANDAMENTO' | 'CONCLUIDOS';
}

interface KanbanColumnProps {
  column: ColumnDefinition;
  items: OrcamentoItem[];
  copiedToken?: string | null;
  onCopyLink?: (token: string, e: React.MouseEvent) => void;
}

export function KanbanColumn({
  column,
  items,
  copiedToken,
  onCopyLink,
}: KanbanColumnProps) {
  const EmptyIcon = column.emptyIcon;

  return (
    <div className="w-[310px] min-w-[280px] shrink-0 bg-slate-50/90 rounded-2xl border border-slate-200/90 p-3.5 min-h-[540px] flex flex-col shadow-sm">
      {/* Column Header */}
      <div className="pb-3 border-b border-slate-200 mb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span
              className={`w-2.5 h-2.5 rounded-full ${column.dotColor}`}
              aria-hidden="true"
            />
            <h3 className="text-xs font-bold text-slate-800 tracking-wider uppercase">
              {column.title}
            </h3>
          </div>
          <span
            className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded-full border ${column.badge}`}
          >
            {items.length}
          </span>
        </div>
        <p className="text-[11px] text-slate-400 mt-1 truncate" title={column.subtitle}>
          {column.subtitle}
        </p>
      </div>

      {/* Column Items / Stylized Empty State */}
      <div className="flex-1 flex flex-col">
        {items.length === 0 ? (
          <div className="my-auto py-8 px-4 rounded-xl border border-dashed border-slate-200/90 bg-white/50 text-center flex flex-col items-center justify-center transition-colors">
            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 mb-2.5 shadow-2xs">
              <EmptyIcon className="w-5 h-5 text-slate-500" />
            </div>
            <h4 className="text-xs font-semibold text-slate-700">
              {column.emptyTitle}
            </h4>
            <p className="text-[11px] text-slate-400 mt-1 max-w-[210px] leading-relaxed">
              {column.emptySubtitle}
            </p>
          </div>
        ) : (
          <div className="space-y-2.5 overflow-y-auto max-h-[72vh] pr-0.5 scrollbar-thin [scrollbar-width:thin]">
            {items.map((orcamento) => (
              <KanbanCard
                key={orcamento.id}
                orcamento={orcamento}
                borderLeftAccent={column.borderAccent}
                onCopyLink={onCopyLink}
                isCopied={
                  Boolean(
                    orcamento.magicLink?.token &&
                      copiedToken === orcamento.magicLink.token
                  )
                }
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
