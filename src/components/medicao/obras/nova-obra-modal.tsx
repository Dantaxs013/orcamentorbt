'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, X, Building2, AlertCircle, Loader2 } from 'lucide-react';

interface EngenheiroOption {
  id: string;
  name: string;
  email: string;
}

interface NovaObraModalProps {
  engenheiros?: EngenheiroOption[];
  currentUserId?: string;
  userRole?: string;
}

export function NovaObraModal({
  engenheiros = [],
  currentUserId,
  userRole,
}: NovaObraModalProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Form states
  const [codigo, setCodigo] = useState('');
  const [nome, setNome] = useState('');
  const [cliente, setCliente] = useState('');
  const [cidade, setCidade] = useState('');
  const [estado, setEstado] = useState('PR');
  const [endereco, setEndereco] = useState('');
  const [engenheiroId, setEngenheiroId] = useState(currentUserId || '');
  const [dataInicio, setDataInicio] = useState('');
  const [dataPrevisaoFim, setDataPrevisaoFim] = useState('');

  const resetForm = () => {
    setCodigo('');
    setNome('');
    setCliente('');
    setCidade('');
    setEstado('PR');
    setEndereco('');
    setEngenheiroId(currentUserId || '');
    setDataInicio('');
    setDataPrevisaoFim('');
    setErrorMessage('');
  };

  const handleOpen = () => {
    resetForm();
    // Sugestão de código automático baseado no ano
    const ano = new Date().getFullYear();
    const rand = Math.floor(100 + Math.random() * 900);
    setCodigo(`OBR-${ano}-${rand}`);
    setIsOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!codigo || !nome || !cliente) {
      setErrorMessage('Por favor, preencha o código, o nome da obra e o cliente.');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');

    try {
      const response = await fetch('/api/obras', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          codigo: codigo.trim().toUpperCase(),
          nome: nome.trim(),
          cliente: cliente.trim(),
          cidade: cidade.trim() || undefined,
          estado: estado.trim() || undefined,
          endereco: endereco.trim() || undefined,
          engenheiroResponsavelId: engenheiroId || currentUserId || undefined,
          dataInicio: dataInicio || undefined,
          dataPrevisaoFim: dataPrevisaoFim || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setErrorMessage(
          typeof data.error === 'string'
            ? data.error
            : 'Erro ao cadastrar obra. Verifique se o código já existe.'
        );
        setIsLoading(false);
        return;
      }

      // Sucesso
      setIsLoading(false);
      setIsOpen(false);
      resetForm();
      router.refresh();
    } catch {
      setErrorMessage('Erro de conexão ao salvar a obra. Tente novamente.');
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Botão de Adicionar Obra */}
      <button
        type="button"
        onClick={handleOpen}
        className="inline-flex items-center gap-2 bg-[#BA1A1A] hover:bg-[#991B1B] text-white px-4 py-2.5 rounded-xl text-sm font-semibold shadow-sm shadow-red-950/10 transition-all hover:scale-[1.02] active:scale-[0.98]"
      >
        <Plus className="w-4 h-4" />
        <span>Adicionar Obra</span>
      </button>

      {/* Modal Overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header com Preto Grafite e Borda Vermelha RBT */}
            <div className="bg-[#111827] border-b-2 border-[#BA1A1A] text-white px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center border border-white/20">
                  <Building2 className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <h2 className="text-lg font-bold">Cadastrar Nova Obra</h2>
                  <p className="text-xs text-slate-300">RBT Engenharia · Gestão de Canteiros</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-slate-300 hover:text-white p-1 rounded-lg hover:bg-white/10 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4">
              {errorMessage && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-1">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Código <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={codigo}
                    onChange={(e) => setCodigo(e.target.value.toUpperCase())}
                    placeholder="OBR-2026-001"
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#BA1A1A]"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Nome da Obra <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    placeholder="Ex: Edifício Horizonte Azul"
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#BA1A1A]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Cliente / Contratante <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={cliente}
                  onChange={(e) => setCliente(e.target.value)}
                  placeholder="Ex: Construtora Horizonte Ltda"
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#BA1A1A]"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Cidade
                  </label>
                  <input
                    type="text"
                    value={cidade}
                    onChange={(e) => setCidade(e.target.value)}
                    placeholder="Curitiba"
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#BA1A1A]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    UF
                  </label>
                  <input
                    type="text"
                    maxLength={2}
                    value={estado}
                    onChange={(e) => setEstado(e.target.value.toUpperCase())}
                    placeholder="PR"
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#BA1A1A] text-center"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Endereço do Canteiro
                </label>
                <input
                  type="text"
                  value={endereco}
                  onChange={(e) => setEndereco(e.target.value)}
                  placeholder="Av. Sete de Setembro, 4500"
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#BA1A1A]"
                />
              </div>

              {/* Responsável (visível para Admin) */}
              {(userRole === 'ADMINISTRADOR' || userRole === 'ADMIN') && engenheiros.length > 0 && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Engenheiro Responsável
                  </label>
                  <select
                    value={engenheiroId}
                    onChange={(e) => setEngenheiroId(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#BA1A1A]"
                  >
                    <option value="">Selecione um engenheiro...</option>
                    {engenheiros.map((eng) => (
                      <option key={eng.id} value={eng.id}>
                        {eng.name} ({eng.email})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Data de Início
                  </label>
                  <input
                    type="date"
                    value={dataInicio}
                    onChange={(e) => setDataInicio(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#BA1A1A]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Previsão de Término
                  </label>
                  <input
                    type="date"
                    value={dataPrevisaoFim}
                    onChange={(e) => setDataPrevisaoFim(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#BA1A1A]"
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  disabled={isLoading}
                  onClick={() => setIsOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="inline-flex items-center gap-2 bg-[#BA1A1A] hover:bg-[#991B1B] text-white px-5 py-2 rounded-lg text-sm font-semibold transition disabled:opacity-50"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Salvando...</span>
                    </>
                  ) : (
                    <span>Salvar Obra</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
