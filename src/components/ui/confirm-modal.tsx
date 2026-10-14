'use client';

import React, { useEffect } from 'react';
import { AlertTriangle, AlertCircle, CheckCircle2, X } from 'lucide-react';

export interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  description: string | React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'primary' | 'warning';
  isLoading?: boolean;
  children?: React.ReactNode;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
}

export function ConfirmModal({
  isOpen,
  title,
  description,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  variant = 'primary',
  isLoading = false,
  children,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  // ESC handling
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isLoading) {
        onCancel();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isLoading, onCancel]);

  if (!isOpen) return null;

  const ICONS = {
    danger: AlertTriangle,
    warning: AlertCircle,
    primary: CheckCircle2,
  };

  const IconComponent = ICONS[variant] || CheckCircle2;

  const VARIANT_STYLES = {
    danger: {
      iconBg: 'bg-red-100 text-[#BA1A1A]',
      confirmBtn: 'bg-[#BA1A1A] hover:bg-[#991B1B] text-white shadow-red-950/20',
      headerBorder: 'border-[#BA1A1A]',
    },
    warning: {
      iconBg: 'bg-amber-100 text-amber-700',
      confirmBtn: 'bg-amber-600 hover:bg-amber-700 text-white shadow-amber-950/20',
      headerBorder: 'border-amber-500',
    },
    primary: {
      iconBg: 'bg-slate-100 text-slate-800',
      confirmBtn: 'bg-slate-900 hover:bg-slate-800 text-white shadow-slate-950/20',
      headerBorder: 'border-slate-800',
    },
  };

  const currentVariant = VARIANT_STYLES[variant] || VARIANT_STYLES.primary;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-modal-title"
      onClick={() => {
        if (!isLoading) onCancel();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-200"
      >
        {/* Header */}
        <div className={`p-5 flex items-start gap-3.5 border-b-2 ${currentVariant.headerBorder} bg-slate-50`}>
          <div className={`p-2 rounded-xl flex-shrink-0 ${currentVariant.iconBg}`}>
            <IconComponent className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0 pr-2">
            <h3 id="confirm-modal-title" className="text-base font-bold text-slate-900 leading-snug">
              {title}
            </h3>
            <div className="text-xs sm:text-sm text-slate-600 mt-1 leading-relaxed">
              {typeof description === 'string' ? <p>{description}</p> : description}
            </div>
          </div>
          <button
            type="button"
            disabled={isLoading}
            onClick={onCancel}
            aria-label="Fechar modal"
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Optional body children (e.g. reason input, summary metadata) */}
        {children && <div className="p-5 border-b border-slate-100">{children}</div>}

        {/* Actions Footer */}
        <div className="p-4 bg-slate-50 flex items-center justify-end gap-2.5">
          <button
            type="button"
            disabled={isLoading}
            onClick={onCancel}
            className="px-4 py-2.5 text-xs sm:text-sm font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-200/60 rounded-xl transition disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            disabled={isLoading}
            onClick={onConfirm}
            className={`px-5 py-2.5 text-xs sm:text-sm font-bold rounded-xl shadow-md transition disabled:opacity-50 flex items-center gap-2 ${currentVariant.confirmBtn}`}
          >
            {isLoading && (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            )}
            <span>{confirmLabel}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
