'use client';

import React, { useState, useEffect } from 'react';

interface EditableTextCellProps {
  value: string;
  onChange: (newValue: string) => void;
  placeholder?: string;
  type?: 'text' | 'email';
  className?: string;
  isBold?: boolean;
}

export function EditableTextCell({
  value,
  onChange,
  placeholder = 'Digite aqui...',
  type = 'text',
  className = '',
  isBold = false,
}: EditableTextCellProps) {
  const [text, setText] = useState(value || '');

  useEffect(() => {
    setText(value || '');
  }, [value]);

  const handleBlur = () => {
    if (text !== value) {
      onChange(text);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      (e.target as HTMLInputElement).blur();
    }
  };

  return (
    <input
      type={type}
      value={text}
      onChange={(e) => {
        setText(e.target.value);
        onChange(e.target.value); // Atualização dinâmica em tempo real
      }}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      placeholder={placeholder}
      className={`w-full px-2 py-1 text-xs bg-transparent border border-transparent hover:border-slate-300 hover:bg-[#F4F8FC] focus:bg-white focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/30 rounded focus:outline-none transition-all truncate text-black ${
        isBold ? 'font-extrabold text-slate-900' : 'font-semibold text-black'
      } ${className}`}
      title="Clique para editar este campo"
    />
  );
}
