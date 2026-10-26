import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { differenceInDays, parseISO, format, isValid } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, hideValues: boolean = false): string {
  if (hideValues) return 'R$ ••••••';
  if (isNaN(amount) || amount === null || amount === undefined) return 'R$ 0,00';
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return '-';
  try {
    const date = parseISO(dateString);
    if (!isValid(date)) return '-';
    return format(date, 'dd/MM/yyyy', { locale: ptBR });
  } catch {
    return '-';
  }
}

export interface DeadlineAlert {
  label: string;
  className: string;
  badgeClass: string;
  daysRemaining: number;
}

export function getDeadlineAlert(deliveryDateStr: string | null | undefined): DeadlineAlert | null {
  if (!deliveryDateStr) return null;
  try {
    const deliveryDate = parseISO(deliveryDateStr);
    if (!isValid(deliveryDate)) return null;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const days = differenceInDays(deliveryDate, today);

    if (days < 0) {
      return {
        label: `Vencido (${Math.abs(days)}d)`,
        className: 'bg-rose-100 text-rose-800 border-rose-300 font-semibold',
        badgeClass: 'bg-rose-600 text-white animate-pulse',
        daysRemaining: days,
      };
    } else if (days <= 2) {
      return {
        label: `Urgente (${days}d)`,
        className: 'bg-orange-100 text-orange-900 border-orange-300 font-semibold',
        badgeClass: 'bg-orange-600 text-white',
        daysRemaining: days,
      };
    } else if (days <= 7) {
      return {
        label: `Próximo (${days}d)`,
        className: 'bg-amber-50 text-amber-900 border-amber-300',
        badgeClass: 'bg-amber-500 text-white',
        daysRemaining: days,
      };
    } else {
      return {
        label: `No prazo (${days}d)`,
        className: 'text-slate-700',
        badgeClass: 'bg-emerald-600 text-white',
        daysRemaining: days,
      };
    }
  } catch {
    return null;
  }
}
