'use client';

import React, { useRef, useState } from 'react';
import { UploadCloud, FileText, Image as ImageIcon, Trash2, CheckCircle2, Loader2, ExternalLink } from 'lucide-react';

interface FileUploadFieldProps {
  label?: string;
  helperText?: string;
  value: string;
  onChange: (url: string) => void;
  categoria?: string;
  placeholderLink?: string;
}

export function FileUploadField({
  label,
  helperText,
  value,
  onChange,
  categoria = 'documentos',
  placeholderLink = 'Ou cole o link do Google Drive, OneDrive, etc.',
}: FileUploadFieldProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadedName, setUploadedName] = useState<string | null>(null);

  const isLocalUpload = value?.startsWith('/uploads/');
  const isImage = value && (/\.(png|jpe?g|webp)$/i.test(value) || isLocalUpload && !value.endsWith('.pdf'));

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadError(null);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('categoria', categoria);

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Falha ao realizar upload.');
      }

      onChange(data.url);
      setUploadedName(data.fileName);
    } catch (err: any) {
      setUploadError(err.message || 'Erro inesperado no envio do arquivo.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemove = () => {
    onChange('');
    setUploadedName(null);
    setUploadError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-2 mt-2">
      {label && (
        <label className="block text-xs font-semibold text-slate-700">
          {label}
        </label>
      )}

      {/* Input de arquivo invisível */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,image/png,image/jpeg,image/jpg,image/webp"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Área de Seleção / Dropzone Compacta */}
      <div className="flex flex-col sm:flex-row gap-2">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="flex items-center justify-center gap-2 px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 border border-slate-300 hover:border-slate-400 rounded-lg text-xs font-semibold shadow-sm transition disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
        >
          {uploading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin text-[#BA1A1A]" />
              <span>Enviando...</span>
            </>
          ) : (
            <>
              <UploadCloud className="w-4 h-4 text-[#BA1A1A]" />
              <span>Selecionar Arquivo (PDF / Fotos)</span>
            </>
          )}
        </button>

        {/* Campo de Link alternativo */}
        <input
          type="text"
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setUploadedName(null);
          }}
          placeholder={placeholderLink}
          className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-[#BA1A1A] focus:ring-1 focus:ring-[#BA1A1A] transition"
        />
      </div>

      {helperText && (
        <p className="text-[11px] text-slate-400">
          {helperText}
        </p>
      )}

      {uploadError && (
        <p className="text-xs text-red-600 font-medium">
          {uploadError}
        </p>
      )}

      {/* Preview / Indicador de Arquivo Anexado */}
      {value && (
        <div className="flex items-center justify-between p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-xs">
          <div className="flex items-center gap-2 text-emerald-900 font-medium truncate pr-2">
            {isImage ? (
              <ImageIcon className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            ) : (
              <FileText className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            )}
            <span className="truncate">
              {uploadedName || (isLocalUpload ? 'Arquivo anexado com sucesso' : 'Link externo configurado')}
            </span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0 ml-1" />
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <a
              href={value}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#BA1A1A] hover:underline flex items-center gap-1 font-semibold text-[11px]"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Abrir</span>
            </a>
            <button
              type="button"
              onClick={handleRemove}
              className="text-slate-400 hover:text-red-600 p-1 rounded transition"
              title="Remover arquivo"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
