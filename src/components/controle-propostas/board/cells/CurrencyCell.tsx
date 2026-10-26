'use client';

import React, { useState, useEffect } from 'react';
import { useValuesVisibility } from '@/lib/ValuesVisibilityContext';

interface CurrencyCellProps {
  value: number;
  onChange: (newValue: number) => void;
}

export function CurrencyCell({ value, onChange }: CurrencyCellProps) {
  const { formatCurrency } = useValuesVisibility();
  const [isEditing, setIsEditing] = useState(false);
  const [inputValue, setInputValue] = useState(value ? value.toString() : '0');

  useEffect(() => {
    setInputValue(value ? value.toString() : '0');
  }, [value]);

  const handleBlur = () => {
    setIsEditing(false);
    const parsed = parseFloat(inputValue.replace(',', '.'));
    if (!isNaN(parsed) && parsed >= 0) {
      onChange(parsed);
    } else {
      setInputValue(value ? value.toString() : '0');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleBlur();
    }
  };

  if (isEditing) {
    return (
      <input
        type="number"
        step="1000"
        value={inputValue}
        onChange={(e) => {
          setInputValue(e.target.value);
          const parsed = parseFloat(e.target.value);
          if (!isNaN(parsed)) onChange(parsed);
        }}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        autoFocus
        className="w-full px-2 py-1 text-xs font-extrabold bg-white text-black border-2 border-[#2563EB] rounded focus:outline-none ring-2 ring-[#2563EB]/20 text-right shadow-2xs"
      />
    );
  }

  return (
    <div
      onClick={() => setIsEditing(true)}
      className="w-full px-2 py-1 text-xs font-extrabold text-black hover:bg-[#E8F0FE] border border-transparent hover:border-[#93C5FD] rounded cursor-pointer transition-all text-right truncate"
      title="Clique para editar o valor monetário"
    >
      {formatCurrency(value)}
    </div>
  );
}
