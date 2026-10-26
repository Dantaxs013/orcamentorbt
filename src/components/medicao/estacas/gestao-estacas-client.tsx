'use client';

import React, { useState } from 'react';
import {
  Target,
  Plus,
  Search,
  Filter,
  Building2,
  Ruler,
  Layers,
  Edit2,
  Trash2,
  CheckCircle,
  AlertCircle,
  X,
  Loader2,
  HardHat,
  ArrowUpDown,
} from 'lucide-react';

export interface EstacaItem {
  id: string;
  obraId: string | null;
  obraNome: string | null;
  obraCodigo: string | null;
  nome: string;
  perfil: string;
  comprimento: number;
  status: string;
  observacao?: string | null;
  createdAt?: string | Date;
}

export interface ObraOption {
  id: string;
  nome: string;
  codigo: string;
}

interface GestaoEstacasClientProps {
  initialEstacas: EstacaItem[];
  obras: ObraOption[];
}

const PERFIS_SUGERIDOS = [
  'W150x22.5',
  'W150x29.8',
  'W150x37.1',
  'W310x32.7',
  'W310x38.7',
  'W310x52.0',
  'Trilho TR-37',
  'Trilho TR-45',
  'Tubular',
  'Outro',
];

export function GestaoEstacasClient({ initialEstacas, obras }: GestaoEstacasClientProps) {
  const [estacas, setEstacas] = useState<EstacaItem[]>(initialEstacas);
  const [busca, setBusca] = useState('');
  const [obraFiltro, setObraFiltro] = useState<string>('TODAS');

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingEstaca, setEditingEstaca] = useState<EstacaItem | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [excluindoId, setExcluindoId] = useState<string | null>(null);

  // Form Fields
  const [formNome, setFormNome] = useState('');
  const [formPerfil, setFormPerfil] = useState('W150x22.5');
  const [formComprimento, setFormComprimento] = useState('12.00');
  const [formObraId, setFormObraId] = useState(obras[0]?.id || '');
  const [formObservacao, setFormObservacao] = useState('');

  // Feedback Toast
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Abrir modal para nova estaca
  const handleOpenNovo = () => {
    setEditingEstaca(null);
    setFormNome('');
    setFormPerfil('W150x22.5');
    setFormComprimento('12.00');
    setFormObraId(obras[0]?.id || '');
    setFormObservacao('');
    setModalOpen(true);
  };

  // Abrir modal para edição
  const handleOpenEdit = (estaca: EstacaItem) => {
    setEditingEstaca(estaca);
    setFormNome(estaca.nome);
    setFormPerfil(estaca.perfil);
    setFormComprimento(String(estaca.comprimento));
    setFormObraId(estaca.obraId || obras[0]?.id || '');
    setFormObservacao(estaca.observacao || '');
    setModalOpen(true);
  };

  // Salvar (Criar ou Atualizar)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formNome.trim()) {
      setFeedback({ type: 'error', message: 'O nome da estaca é obrigatório.' });
      return;
    }
    const compNum = Number(formComprimento.replace(',', '.'));
    if (isNaN(compNum) || compNum <= 0) {
      setFeedback({ type: 'error', message: 'Informe um comprimento válido em metros.' });
      return;
    }

    setSalvando(true);
    setFeedback(null);

    try {
      const url = editingEstaca ? `/api/estacas/${editingEstaca.id}` : '/api/estacas';
      const method = editingEstaca ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome: formNome.trim(),
          perfil: formPerfil.trim(),
          comprimento: compNum,
          obraId: formObraId || null,
          observacao: formObservacao.trim() || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erro ao salvar estaca');
      }

      if (editingEstaca) {
        setEstacas((prev) =>
          prev.map((item) => (item.id === editingEstaca.id ? data.estaca : item))
        );
        setFeedback({ type: 'success', message: `Estaca "${data.estaca.nome}" atualizada com sucesso!` });
      } else {
        setEstacas((prev) => [data.estaca, ...prev]);
        setFeedback({ type: 'success', message: `Estaca "${data.estaca.nome}" cadastrada com sucesso!` });
      }

      setModalOpen(false);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Falha ao processar solicitação.' });
    } finally {
      setSalvando(false);
    }
  };

  // Excluir estaca
  const handleDelete = async (id: string, nome: string) => {
    if (!confirm(`Deseja realmente remover a estaca ${nome}?`)) return;

    setExcluindoId(id);
    setFeedback(null);

    try {
      const res = await fetch(`/api/estacas/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Erro ao excluir');
      }
      setEstacas((prev) => prev.filter((e) => e.id !== id));
      setFeedback({ type: 'success', message: `Estaca "${nome}" excluída com sucesso.` });
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Falha ao excluir.' });
    } finally {
      setExcluindoId(null);
    }
  };

  // Filtragem
  const estacasFiltradas = estacas.filter((e) => {
    const matchBusca =
      e.nome.toLowerCase().includes(busca.toLowerCase()) ||
      e.perfil.toLowerCase().includes(busca.toLowerCase()) ||
      (e.obraNome && e.obraNome.toLowerCase().includes(busca.toLowerCase()));

    const matchObra = obraFiltro === 'TODAS' || e.obraId === obraFiltro;

    return matchBusca && matchObra;
  });

  // Estatísticas Rápidas
  const totalEstacas = estacas.length;
  const metragemTotal = estacas.reduce((acc, e) => acc + (Number(e.comprimento) || 0), 0);
  const w150Count = estacas.filter((e) => e.perfil.toUpperCase().includes('150')).length;
  const w310Count = estacas.filter((e) => e.perfil.toUpperCase().includes('310')).length;

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Feedback Toast */}
      {feedback && (
        <div
          className={`p-4 rounded-2xl flex items-center justify-between text-sm shadow-sm transition animate-fadeIn ${
            feedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? (
              <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
            )}
            <span className="font-semibold">{feedback.message}</span>
          </div>
          <button
            onClick={() => setFeedback(null)}
            className="text-slate-400 hover:text-slate-700 text-xs font-bold px-2 py-1"
          >
            Fechar
          </button>
        </div>
      )}

      {/* Header */}
      <div className="bg-[#111827] rounded-3xl p-6 sm:p-7 text-white shadow-xl border border-slate-800 relative overflow-hidden flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1 relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-xs text-red-300 border border-white/10">
            <Target className="w-3.5 h-3.5 text-red-400" />
            <span>Módulo do Apontador · Projeto de Fundações</span>
          </div>
          <h1 className="text-2xl font-extrabold text-white">Estacas Principais</h1>
          <p className="text-xs sm:text-sm text-slate-300 max-w-xl">
            Cadastre as estacas de projeto com <strong>nome</strong>, <strong>perfil/emenda</strong> e{' '}
            <strong>comprimento nominal</strong>. Elas aparecerão automaticamente na listagem suspensa da grade de produção diária.
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenNovo}
          className="inline-flex items-center justify-center gap-2 bg-[#BA1A1A] hover:bg-[#991B1B] text-white px-5 py-3 rounded-2xl text-sm font-bold shadow-lg shadow-red-950/40 transition hover:scale-[1.02] active:scale-95 flex-shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Nova Estaca</span>
        </button>
      </div>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-50 text-[#BA1A1A] flex items-center justify-center flex-shrink-0">
            <Target className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Estacas Cadastradas</p>
            <p className="text-xl font-extrabold text-slate-900">{totalEstacas}</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center flex-shrink-0">
            <Ruler className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Metragem Prevista</p>
            <p className="text-xl font-extrabold text-slate-900">
              {metragemTotal.toFixed(1)} <span className="text-xs font-normal text-slate-400">metros</span>
            </p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-800 flex items-center justify-center flex-shrink-0">
            <Layers className="w-5 h-5 text-[#BA1A1A]" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Perfis W150 / W310</p>
            <p className="text-xl font-extrabold text-slate-900">
              {w150Count} <span className="text-xs font-normal text-slate-400">W150</span> / {w310Count}{' '}
              <span className="text-xs font-normal text-slate-400">W310</span>
            </p>
          </div>
        </div>
      </div>

      {/* Filtros e Busca */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por nome (ex: E-01), perfil..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-slate-400 flex-shrink-0" />
          <select
            value={obraFiltro}
            onChange={(e) => setObraFiltro(e.target.value)}
            className="w-full sm:w-auto text-xs px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:outline-none bg-white font-medium text-slate-700"
          >
            <option value="TODAS">Todas as Obras ({obras.length})</option>
            {obras.map((o) => (
              <option key={o.id} value={o.id}>
                {o.codigo} - {o.nome}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Tabela de Estacas */}
      {estacasFiltradas.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center shadow-sm">
          <Target className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800">Nenhuma estaca encontrada</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
            {busca || obraFiltro !== 'TODAS'
              ? 'Tente ajustar os filtros de busca para localizar as estacas desejadas.'
              : 'Clique no botão "+ Nova Estaca" acima para cadastrar a primeira estaca de projeto.'}
          </p>
          <button
            type="button"
            onClick={handleOpenNovo}
            className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold text-[#BA1A1A] hover:underline"
          >
            <Plus className="w-4 h-4" /> Cadastrar nova estaca agora
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900 text-white font-semibold">
                <tr>
                  <th className="py-3.5 px-4 text-center w-24">Estaca</th>
                  <th className="py-3.5 px-4">Obra Vinculada</th>
                  <th className="py-3.5 px-4">Perfil / Emenda</th>
                  <th className="py-3.5 px-4 text-right">Comprimento Nominal</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                  <th className="py-3.5 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {estacasFiltradas.map((estaca, idx) => (
                  <tr
                    key={estaca.id}
                    className={`hover:bg-slate-50/80 transition ${
                      idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'
                    }`}
                  >
                    <td className="py-3.5 px-4 text-center">
                      <span className="inline-block px-2.5 py-1 rounded-lg bg-red-50 text-[#BA1A1A] font-black text-xs font-mono border border-red-200">
                        {estaca.nome}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      {estaca.obraNome ? (
                        <div>
                          <p className="font-bold text-slate-800">{estaca.obraNome}</p>
                          <p className="text-[10px] text-slate-400 font-mono">{estaca.obraCodigo}</p>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">Geral / Todas</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-800">
                      <span className="inline-block px-2 py-0.5 rounded-md bg-slate-100 text-slate-800 border border-slate-200 font-mono text-[11px]">
                        {estaca.perfil}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900 text-sm">
                      {Number(estaca.comprimento || 0).toFixed(2)} m
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                          estaca.status === 'CRAVADA'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}
                      >
                        {estaca.status === 'CRAVADA' ? 'Cravada' : 'Pendente'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(estaca)}
                          title="Editar estaca"
                          className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(estaca.id, estaca.nome)}
                          disabled={excluindoId === estaca.id}
                          title="Excluir estaca"
                          className="p-1.5 rounded-lg text-red-500 hover:text-red-700 hover:bg-red-50 transition disabled:opacity-50"
                        >
                          {excluindoId === estaca.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: CRIAR OU EDITAR ESTACA PRINCIPAL                  */}
      {/* ========================================================= */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-5 bg-[#111827] text-white flex items-center justify-between border-b-2 border-[#BA1A1A]">
              <div className="flex items-center gap-2">
                <Target className="w-5 h-5 text-red-400" />
                <h3 className="font-bold text-base text-white">
                  {editingEstaca ? `Editar Estaca ${editingEstaca.nome}` : 'Cadastrar Nova Estaca'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
              {/* Campo: Nome da Estaca */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Nome da Estaca <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: E-01, E-02, P-10"
                  value={formNome}
                  onChange={(e) => setFormNome(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:outline-none font-bold text-slate-900"
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">
                  Identificação utilizada no projeto e nas plantas de cravação.
                </span>
              </div>

              {/* Campo: Perfil / Emenda */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Perfil / Emenda <span className="text-red-600">*</span>
                </label>
                <div className="space-y-2">
                  <input
                    type="text"
                    required
                    placeholder="Ex: W150x22.5, W310x38.7"
                    list="perfis-estacas-datalist"
                    value={formPerfil}
                    onChange={(e) => setFormPerfil(e.target.value)}
                    className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:outline-none font-mono text-slate-900"
                  />
                  <datalist id="perfis-estacas-datalist">
                    {PERFIS_SUGERIDOS.map((p) => (
                      <option key={p} value={p} />
                    ))}
                  </datalist>

                  {/* Atalhos rápidos para perfis comuns */}
                  <div className="flex flex-wrap gap-1.5">
                    {PERFIS_SUGERIDOS.slice(0, 6).map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setFormPerfil(p)}
                        className={`px-2 py-1 rounded-lg text-[10px] font-mono border transition ${
                          formPerfil === p
                            ? 'bg-red-50 text-[#BA1A1A] border-red-300 font-bold'
                            : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Campo: Comprimento Nominal (m) */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Comprimento Nominal (metros) <span className="text-red-600">*</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    min="0.1"
                    required
                    placeholder="12.00"
                    value={formComprimento}
                    onChange={(e) => setFormComprimento(e.target.value)}
                    className="w-full p-2.5 pr-10 border border-slate-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:outline-none font-mono font-bold text-slate-900"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">
                    m
                  </span>
                </div>
                <span className="text-[10px] text-slate-400 mt-0.5 block">
                  Metragem padrão de projeto prevista para esta estaca.
                </span>
              </div>

              {/* Campo: Obra Vinculada */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Obra do Projeto <span className="text-slate-400 font-normal">(Opcional)</span>
                </label>
                <select
                  value={formObraId}
                  onChange={(e) => setFormObraId(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:outline-none bg-white text-slate-800"
                >
                  <option value="">Geral (Disponível em todas as obras)</option>
                  {obras.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.codigo} - {o.nome}
                    </option>
                  ))}
                </select>
              </div>

              {/* Campo: Observações */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Observações <span className="text-slate-400 font-normal">(Opcional)</span>
                </label>
                <textarea
                  rows={2}
                  placeholder="Ex: Cota de arrasamento prevista, estaca de teste, reforço especial..."
                  value={formObservacao}
                  onChange={(e) => setFormObservacao(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:outline-none text-slate-800"
                />
              </div>

              {/* Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={salvando}
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 text-xs font-bold text-white bg-[#BA1A1A] hover:bg-[#991B1B] rounded-xl shadow-md transition disabled:opacity-50"
                >
                  {salvando ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                  <span>{editingEstaca ? 'Atualizar Estaca' : 'Salvar Estaca'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
