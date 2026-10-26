'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ExternalLink, Folder, Edit3, X, Check } from 'lucide-react';

interface DocsChecklistProps {
  sharepointUrl?: string;
  items?: any[];
  onChangeSharepointUrl: (url: string) => void;
}

export function DocsChecklist({ sharepointUrl = '', onChangeSharepointUrl }: DocsChecklistProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputUrl, setInputUrl] = useState(sharepointUrl);
  const triggerRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState<{ top: number; left: number }>({ top: 0, left: 0 });

  useEffect(() => {
    setInputUrl(sharepointUrl || '');
  }, [sharepointUrl]);

  const handleOpen = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const popupWidth = 320;
      const popupHeight = 160;

      let left = rect.left;
      let top = rect.bottom + window.scrollY + 4;

      if (left + popupWidth > window.innerWidth - 16) {
        left = window.innerWidth - popupWidth - 16;
      }
      if (left < 16) left = 16;

      if (rect.bottom + popupHeight > window.innerHeight) {
        top = rect.top + window.scrollY - popupHeight - 4;
      }

      setCoords({ top, left });
    }
    setIsOpen(!isOpen);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    let trimmed = inputUrl.trim();
    if (trimmed && !trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
      trimmed = `https://${trimmed}`;
    }
    onChangeSharepointUrl(trimmed);
    setIsOpen(false);
  };

  return (
    <div className="w-full" ref={triggerRef}>
      {sharepointUrl ? (
        <div className="flex items-center gap-1.5 justify-center">
          {/* Botão Principal: Abrir Pasta do SharePoint */}
          <a
            href={sharepointUrl}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-extrabold bg-slate-100 text-slate-900 border border-[#93C5FD] hover:bg-[#D4E5F9] transition-all shadow-2xs truncate max-w-[120px]"
            title="Abrir pasta do SharePoint em nova aba"
          >
            <Folder className="w-3.5 h-3.5 text-slate-900 shrink-0" />
            <span className="truncate">SharePoint</span>
            <ExternalLink className="w-3 h-3 opacity-75 shrink-0" />
          </a>

          {/* Botão Editar Link */}
          <button
            type="button"
            onClick={handleOpen}
            className="p-1 rounded-full text-slate-500 hover:text-slate-900 hover:bg-[#EAF2FB] transition-colors"
            title="Editar link da pasta do SharePoint"
          >
            <Edit3 className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        /* Botão para Inserir Link quando vazio */
        <button
          type="button"
          onClick={handleOpen}
          className="w-full flex items-center justify-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-slate-50 text-slate-600 border border-slate-300 hover:bg-[#EAF2FB] hover:text-slate-900 hover:border-[#93C5FD] transition-all shadow-2xs"
        >
          <Folder className="w-3.5 h-3.5 text-slate-400" />
          <span>+ Link SharePoint</span>
        </button>
      )}

      {/* Floating Popover para Inserir / Editar URL do SharePoint */}
      {isOpen && (
        <>
          <div className="fixed inset-0 z-[100]" onClick={() => setIsOpen(false)} />
          <div
            className="fixed z-[101] w-80 bg-white border-2 border-[#93C5FD] rounded-2xl shadow-2xl p-4 space-y-3 font-sans animate-in fade-in zoom-in-95 duration-150"
            style={{
              top: `${coords.top}px`,
              left: `${coords.left}px`,
            }}
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-900 flex items-center justify-center border border-[#93C5FD]">
                  <Folder className="w-4 h-4" />
                </div>
                <span className="font-extrabold text-sm text-black">
                  Pasta do SharePoint
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-full text-slate-400 hover:text-black hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-3">
              <div>
                <label className="block text-[11px] font-extrabold text-black mb-1">
                  Cole a URL da pasta no SharePoint:
                </label>
                <input
                  type="text"
                  required
                  value={inputUrl}
                  onChange={(e) => setInputUrl(e.target.value)}
                  placeholder="https://piatec.sharepoint.com/sites/propostas/..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono text-black focus:outline-none focus:ring-2 focus:ring-[#BA1A1A]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                {sharepointUrl && (
                  <button
                    type="button"
                    onClick={() => {
                      onChangeSharepointUrl('');
                      setInputUrl('');
                      setIsOpen(false);
                    }}
                    className="px-3 py-1.5 rounded-xl border border-slate-300 text-xs font-bold text-rose-600 hover:bg-rose-50"
                  >
                    Remover Link
                  </button>
                )}
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-[#BA1A1A] hover:bg-[#093D75] text-white text-xs font-extrabold rounded-xl shadow-md flex items-center gap-1"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Salvar Link</span>
                </button>
              </div>
            </form>
          </div>
        </>
      )}
    </div>
  );
}
