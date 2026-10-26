'use client';

import React, { useState, useRef, useEffect } from 'react';
import { formatDate, getDeadlineAlert } from '@/lib/proposals-utils';
import { GoogleDatePicker } from '@/components/ui/GoogleDatePicker';
import { Calendar } from 'lucide-react';

interface DateCellProps {
  value: string | null; // ISO string YYYY-MM-DD
  onChange: (newDate: string | null) => void;
  showAlert?: boolean;
}

export function DateCell({ value, onChange, showAlert = false }: DateCellProps) {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState<{ top: number; left: number }>({ top: 0, left: 0 });

  const alert = showAlert ? getDeadlineAlert(value) : null;

  const handleOpen = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const popupWidth = 300;
      const popupHeight = 350;

      let left = rect.left;
      let top = rect.bottom + window.scrollY + 4;

      // Adjust if near right viewport edge
      if (left + popupWidth > window.innerWidth - 16) {
        left = window.innerWidth - popupWidth - 16;
      }
      if (left < 16) left = 16;

      // Adjust if near bottom viewport edge
      if (rect.bottom + popupHeight > window.innerHeight) {
        top = rect.top + window.scrollY - popupHeight - 4;
      }

      setCoords({ top, left });
    }
    setIsOpen(!isOpen);
  };

  // Close on window resize
  useEffect(() => {
    const handleResize = () => {
      if (isOpen) setIsOpen(false);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isOpen]);

  return (
    <div className="w-full">
      {/* Date Trigger Cell */}
      <div
        ref={triggerRef}
        onClick={handleOpen}
        className="w-full flex items-center justify-between gap-1 px-2 py-1 text-xs hover:bg-[#E8F0FE] rounded cursor-pointer transition-colors group select-none"
      >
        <div className="flex items-center gap-1.5 min-w-0">
          {/* Google Color Styled Calendar Icon */}
          <div className="w-4 h-4 rounded bg-[#E8F0FE] text-[#1A73E8] flex items-center justify-center shrink-0 border border-[#1A73E8]/20 group-hover:scale-110 transition-transform">
            <Calendar className="w-3 h-3 stroke-[2.5]" />
          </div>
          <span className="font-extrabold text-black truncate">
            {formatDate(value)}
          </span>
        </div>

        {alert && (
          <span
            className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded border ${alert.className}`}
            title={`Prazo de entrega: ${alert.daysRemaining} dias`}
          >
            {alert.label}
          </span>
        )}
      </div>

      {/* Google Calendar Floating Viewport Popover */}
      {isOpen && (
        <>
          <div className="fixed inset-0 z-[100]" onClick={() => setIsOpen(false)} />
          <div
            className="fixed z-[101] shadow-2xl animate-in fade-in zoom-in-95 duration-150"
            style={{
              top: `${coords.top}px`,
              left: `${coords.left}px`,
            }}
          >
            <GoogleDatePicker
              value={value}
              onChange={(newDate) => {
                onChange(newDate);
                setIsOpen(false);
              }}
              onClose={() => setIsOpen(false)}
            />
          </div>
        </>
      )}
    </div>
  );
}
