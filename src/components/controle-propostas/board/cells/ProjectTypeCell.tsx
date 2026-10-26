'use client';

import React, { useState, useEffect } from 'react';
import { Layers, Plus, Check } from 'lucide-react';

interface ProjectTypeCellProps {
  value?: string;
  onChange: (newValue: string) => void;
}

const DEFAULT_TYPES = ['ONSHORE', 'OFFSHORE', 'TERRAPLANAGEM'];

export function ProjectTypeCell({ value = 'ONSHORE', onChange }: ProjectTypeCellProps) {
  const [customTypes, setCustomTypes] = useState<string[]>([]);
  const [isEditingCustom, setIsEditingCustom] = useState(false);
  const [newTypeInput, setNewTypeInput] = useState('');

  // Load saved custom types from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('piatec_custom_project_types');
      if (saved) {
        setCustomTypes(JSON.parse(saved));
      }
    } catch {
      // Fallback
    }
  }, []);

  const allOptions = Array.from(
    new Set([
      ...DEFAULT_TYPES,
      ...customTypes,
      ...(value ? [value.toUpperCase()] : []),
    ])
  );

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (val === '__ADD_NEW__') {
      setIsEditingCustom(true);
      setNewTypeInput('');
    } else {
      onChange(val);
    }
  };

  const handleSaveCustomType = (e: React.FormEvent) => {
    e.preventDefault();
    if (newTypeInput.trim()) {
      const formatted = newTypeInput.trim().toUpperCase();
      const updated = Array.from(new Set([...customTypes, formatted]));
      setCustomTypes(updated);
      try {
        localStorage.setItem('piatec_custom_project_types', JSON.stringify(updated));
      } catch {}
      onChange(formatted);
    }
    setIsEditingCustom(false);
  };

  if (isEditingCustom) {
    return (
      <form onSubmit={handleSaveCustomType} className="flex items-center gap-1">
        <input
          type="text"
          autoFocus
          value={newTypeInput}
          onChange={(e) => setNewTypeInput(e.target.value)}
          placeholder="Novo tipo..."
          className="w-full px-2 py-0.5 text-xs font-bold uppercase bg-white text-black border-2 border-[#2563EB] rounded focus:outline-none"
        />
        <button
          type="submit"
          className="p-1 rounded bg-[#BA1A1A] text-white hover:bg-[#093D75]"
          title="Salvar Novo Tipo"
        >
          <Check className="w-3.5 h-3.5" />
        </button>
      </form>
    );
  }

  return (
    <div className="relative w-full">
      <select
        value={value}
        onChange={handleSelectChange}
        className="w-full px-2 py-1 text-xs font-extrabold bg-[#EAF2FB] hover:bg-[#D4E5F9] text-slate-900 border border-[#93C5FD] rounded-lg cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#BA1A1A] uppercase tracking-wide truncate"
        title="Selecione o tipo de projeto (Onshore, Offshore, Terraplanagem...)"
      >
        {allOptions.map((type) => (
          <option key={type} value={type} className="bg-white text-black font-bold">
            {type}
          </option>
        ))}
        <option value="__ADD_NEW__" className="bg-slate-100 text-slate-900 font-extrabold">
          + Outro (Adicionar Novo)...
        </option>
      </select>
    </div>
  );
}
