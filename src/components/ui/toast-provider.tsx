'use client';

import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastItem {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

interface ToastContextType {
  toasts: ToastItem[];
  addToast: (type: ToastType, title: string, message?: string, duration?: number) => void;
  removeToast: (id: string) => void;
  toast: {
    success: (title: string, message?: string, duration?: number) => void;
    error: (title: string, message?: string, duration?: number) => void;
    warning: (title: string, message?: string, duration?: number) => void;
    info: (title: string, message?: string, duration?: number) => void;
  };
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast deve ser utilizado dentro de um ToastProvider');
  }
  return context;
}

const ICONS = {
  success: CheckCircle2,
  error: AlertTriangle,
  warning: AlertCircle,
  info: Info,
};

const STYLES = {
  success: {
    container: 'bg-white border-emerald-500/30 shadow-emerald-950/5 text-slate-900',
    icon: 'text-emerald-600 bg-emerald-50',
    border: 'border-l-4 border-l-emerald-600',
    progress: 'bg-emerald-500',
  },
  error: {
    container: 'bg-white border-red-500/30 shadow-red-950/5 text-slate-900',
    icon: 'text-red-600 bg-red-50',
    border: 'border-l-4 border-l-[#BA1A1A]',
    progress: 'bg-[#BA1A1A]',
  },
  warning: {
    container: 'bg-white border-amber-500/30 shadow-amber-950/5 text-slate-900',
    icon: 'text-amber-600 bg-amber-50',
    border: 'border-l-4 border-l-amber-500',
    progress: 'bg-amber-500',
  },
  info: {
    container: 'bg-white border-blue-500/30 shadow-blue-950/5 text-slate-900',
    icon: 'text-blue-600 bg-blue-50',
    border: 'border-l-4 border-l-blue-600',
    progress: 'bg-blue-500',
  },
};

function ToastMessageItem({
  item,
  onDismiss,
}: {
  item: ToastItem;
  onDismiss: (id: string) => void;
}) {
  const IconComponent = ICONS[item.type] || Info;
  const style = STYLES[item.type] || STYLES.info;

  return (
    <div
      role={item.type === 'error' ? 'alert' : 'status'}
      aria-live={item.type === 'error' ? 'assertive' : 'polite'}
      className={`pointer-events-auto relative flex items-start gap-3 p-4 rounded-xl border bg-white shadow-xl transition-all duration-300 animate-in slide-in-from-top-3 fade-in ${style.border}`}
    >
      <div className={`p-1.5 rounded-lg flex-shrink-0 ${style.icon}`}>
        <IconComponent className="w-4 h-4" />
      </div>

      <div className="flex-1 min-w-0 pr-2">
        <h4 className="text-xs sm:text-sm font-bold text-slate-900 leading-tight">
          {item.title}
        </h4>
        {item.message && (
          <p className="text-xs text-slate-600 mt-1 leading-relaxed break-words">
            {item.message}
          </p>
        )}
      </div>

      <button
        type="button"
        onClick={() => onDismiss(item.id)}
        aria-label="Fechar notificação"
        className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition flex-shrink-0 -mr-1 -mt-1"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    (type: ToastType, title: string, message?: string, duration = 4500) => {
      const id = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      const newToast: ToastItem = { id, type, title, message, duration };

      setToasts((prev) => [...prev, newToast]);

      if (duration > 0) {
        setTimeout(() => {
          removeToast(id);
        }, duration);
      }
    },
    [removeToast]
  );

  const toastMethods = useMemo(
    () => ({
      success: (title: string, message?: string, duration?: number) =>
        addToast('success', title, message, duration),
      error: (title: string, message?: string, duration?: number) =>
        addToast('error', title, message, duration),
      warning: (title: string, message?: string, duration?: number) =>
        addToast('warning', title, message, duration),
      info: (title: string, message?: string, duration?: number) =>
        addToast('info', title, message, duration),
    }),
    [addToast]
  );

  const contextValue = useMemo(
    () => ({
      toasts,
      addToast,
      removeToast,
      toast: toastMethods,
    }),
    [toasts, addToast, removeToast, toastMethods]
  );

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      {/* Toast viewport container */}
      <div
        aria-label="Notificações do sistema"
        className="fixed top-4 right-4 z-[9999] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none px-3 sm:px-0"
      >
        {toasts.map((item) => (
          <ToastMessageItem key={item.id} item={item} onDismiss={removeToast} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}
