'use client';

import React, { useState } from 'react';
import {
  format,
  parseISO,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isToday,
  isValid,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, X } from 'lucide-react';

interface GoogleDatePickerProps {
  value: string | null; // ISO YYYY-MM-DD
  onChange: (newDateStr: string | null) => void;
  onClose?: () => void;
}

export function GoogleDatePicker({ value, onChange, onClose }: GoogleDatePickerProps) {
  const initialDate = value && isValid(parseISO(value)) ? parseISO(value) : new Date();
  const [currentMonth, setCurrentMonth] = useState(initialDate);

  const selectedDate = value && isValid(parseISO(value)) ? parseISO(value) : null;

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 0 }); // Domingo
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 0 });

  const days = eachDayOfInterval({ start: startDate, end: endDate });

  const handleSelectDay = (day: Date) => {
    const formatted = format(day, 'yyyy-MM-dd');
    onChange(formatted);
    onClose?.();
  };

  const handleSelectToday = () => {
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    onChange(todayStr);
    setCurrentMonth(new Date());
    onClose?.();
  };

  const handleClear = () => {
    onChange(null);
    onClose?.();
  };

  return (
    <div className="w-72 bg-white border border-[#93C5FD] rounded-2xl shadow-2xl p-4 space-y-3 font-sans select-none border-2">
      {/* Google Calendar Header */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-100">
        <div className="flex items-center gap-2">
          {/* Google Color Calendar Logo */}
          <div className="w-7 h-7 rounded-lg bg-[#E8F0FE] flex items-center justify-center border border-[#1A73E8]/30">
            <CalendarIcon className="w-4 h-4 text-[#1A73E8]" />
          </div>
          <span className="font-extrabold text-sm text-black capitalize">
            {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
          </span>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            className="p-1 rounded-full text-slate-600 hover:bg-slate-100 hover:text-black transition-colors"
            title="Mês Anterior"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            className="p-1 rounded-full text-slate-600 hover:bg-slate-100 hover:text-black transition-colors"
            title="Próximo Mês"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded-full text-slate-400 hover:bg-slate-100 hover:text-black transition-colors ml-0.5"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Weekday Names Header (D, S, T, Q, Q, S, S) */}
      <div className="grid grid-cols-7 text-center text-[11px] font-extrabold text-slate-500 uppercase">
        {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((dayName, i) => (
          <div key={i} className="py-1">
            {dayName}
          </div>
        ))}
      </div>

      {/* Calendar Days Grid */}
      <div className="grid grid-cols-7 gap-1 text-center text-xs">
        {days.map((day: any) => {
          const isSelected = selectedDate ? isSameDay(day, selectedDate) : false;
          const isCurrentMonth = isSameMonth(day, currentMonth);
          const isDayToday = isToday(day);

          return (
            <button
              type="button"
              key={day.toString()}
              onClick={() => handleSelectDay(day)}
              className={`h-8 w-8 mx-auto flex items-center justify-center rounded-full text-xs transition-all font-bold ${
                isSelected
                  ? 'bg-[#1A73E8] text-white shadow-md font-extrabold scale-105'
                  : isDayToday
                  ? 'border-2 border-[#1A73E8] text-[#1A73E8] font-extrabold hover:bg-[#E8F0FE]'
                  : !isCurrentMonth
                  ? 'text-slate-300 hover:bg-slate-50'
                  : 'text-black hover:bg-[#E8F0FE] hover:text-[#1A73E8]'
              }`}
            >
              {format(day, 'd')}
            </button>
          );
        })}
      </div>

      {/* Footer Controls (Google Calendar Style "Hoje" & "Limpar") */}
      <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
        <button
          type="button"
          onClick={handleSelectToday}
          className="px-3 py-1 rounded-lg bg-[#E8F0FE] hover:bg-[#D2E3FC] text-[#1A73E8] font-extrabold transition-colors"
        >
          Hoje
        </button>
        <button
          type="button"
          onClick={handleClear}
          className="px-2.5 py-1 text-slate-500 hover:text-black font-semibold hover:bg-slate-100 rounded-lg transition-colors"
        >
          Limpar Data
        </button>
      </div>
    </div>
  );
}
