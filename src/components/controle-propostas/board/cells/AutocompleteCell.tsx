'use client';

import React, { useState, useEffect, useRef } from 'react';

interface AutocompleteCellProps {
  value: string;
  onChange: (newValue: string) => void;
  storageKey: string;
  defaultSuggestions: string[];
  placeholder?: string;
  isBold?: boolean;
}

export function AutocompleteCell({
  value,
  onChange,
  storageKey,
  defaultSuggestions,
  placeholder = 'Digite para pesquisar...',
  isBold = false,
}: AutocompleteCellProps) {
  const [text, setText] = useState(value || '');
  const [isOpen, setIsOpen] = useState(false);
  const [savedSuggestions, setSavedSuggestions] = useState<string[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  // Load custom saved suggestions from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(`piatec_suggestions_${storageKey}`);
      if (saved) {
        setSavedSuggestions(JSON.parse(saved));
      }
    } catch {}
  }, [storageKey]);

  useEffect(() => {
    setText(value || '');
  }, [value]);

  const allSuggestions = Array.from(new Set([...defaultSuggestions, ...savedSuggestions]));

  // Filter suggestions matching current input
  const filtered = allSuggestions.filter((item) =>
    item.toLowerCase().includes(text.toLowerCase())
  );

  const saveCustomSuggestion = (val: string) => {
    if (val.trim() && !allSuggestions.includes(val.trim())) {
      const updated = [...savedSuggestions, val.trim()];
      setSavedSuggestions(updated);
      try {
        localStorage.setItem(`piatec_suggestions_${storageKey}`, JSON.stringify(updated));
      } catch {}
    }
  };

  const handleSelect = (item: string) => {
    setText(item);
    onChange(item);
    saveCustomSuggestion(item);
    setIsOpen(false);
  };

  const handleBlur = () => {
    setTimeout(() => setIsOpen(false), 200);
    if (text !== value) {
      onChange(text);
      saveCustomSuggestion(text);
    }
  };

  return (
    <div className="relative w-full" ref={containerRef}>
      <input
        type="text"
        value={text}
        onFocus={() => setIsOpen(true)}
        onChange={(e) => {
          setText(e.target.value);
          onChange(e.target.value);
          setIsOpen(true);
        }}
        onBlur={handleBlur}
        placeholder={placeholder}
        className={`w-full px-2 py-1 text-xs bg-transparent border border-transparent hover:border-slate-300 hover:bg-[#F4F8FC] focus:bg-white focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/30 rounded focus:outline-none transition-all truncate text-black ${
          isBold ? 'font-extrabold text-slate-900' : 'font-semibold text-black'
        }`}
      />

      {/* Autocomplete Dropdown List */}
      {isOpen && filtered.length > 0 && (
        <div className="absolute left-0 top-full mt-1 w-56 bg-white border border-slate-200 rounded-xl shadow-2xl z-50 max-h-48 overflow-y-auto p-1 space-y-0.5 text-xs select-none">
          {filtered.map((item) => (
            <div
              key={item}
              onMouseDown={() => handleSelect(item)}
              className="px-3 py-1.5 hover:bg-[#EAF2FB] hover:text-slate-900 rounded-lg cursor-pointer font-bold text-black flex items-center justify-between"
            >
              <span>{item}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
