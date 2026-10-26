'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  UserPlus,
  Pencil,
  Shield,
  ShieldCheck,
  ShieldAlert,
  X,
  Search,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Lock,
  Mail,
  User,
  Power,
} from 'lucide-react';

export interface UserItem {
  id: string;
  name: string;
  email: string;
  role: string;
  ativo: boolean;
  createdAt: string | Date;
}

interface GestaoUsuariosClientProps {
  initialUsers: UserItem[];
  currentUserId: string;
}

export function GestaoUsuariosClient({
  initialUsers,
  currentUserId,
}: GestaoUsuariosClientProps) {
  const router = useRouter();

  // Estados dos modais
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserItem | null>(null);

  // Filtro
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');

  // Loading & mensagens
  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Form de Criação
  const [createName, setCreateName] = useState('');
  const [createEmail, setCreateEmail] = useState('');
  const [createPassword, setCreatePassword] = useState('');
  const [createRole, setCreateRole] = useState<'APONTADOR' | 'ENGENHEIRO' | 'ADMINISTRADOR'>('APONTADOR');

  // Form de Edição
  const [editName, setEditName] = useState('');
  const [editRole, setEditRole] = useState<'APONTADOR' | 'ENGENHEIRO' | 'ADMINISTRADOR'>('APONTADOR');
  const [editAtivo, setEditAtivo] = useState(true);
  const [editPassword, setEditPassword] = useState('');

  // Abrir Modal de Criação
  const handleOpenCreate = () => {
    setCreateName('');
    setCreateEmail('');
    setCreatePassword('Rbt@2026');
    setCreateRole('APONTADOR');
    setFeedback(null);
    setIsCreateOpen(true);
  };

  // Abrir Modal de Edição (Lápis)
  const handleOpenEdit = (user: UserItem) => {
    setEditingUser(user);
    setEditName(user.name);
    setEditRole(user.role as any);
    setEditAtivo(user.ativo);
    setEditPassword('');
    setFeedback(null);
    setIsEditOpen(true);
  };

  // Submeter Criação
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createName || !createEmail || !createPassword) {
      setFeedback({ type: 'error', message: 'Preencha nome, e-mail e senha.' });
      return;
    }

    setIsLoading(true);
    setFeedback(null);

    try {
      const res = await fetch('/api/admin/usuarios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: createName.trim(),
          email: createEmail.trim().toLowerCase(),
          password: createPassword,
          role: createRole,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setFeedback({
          type: 'error',
          message: data.error || 'Erro ao criar usuário. Verifique se o e-mail já existe.',
        });
        setIsLoading(false);
        return;
      }

      setIsLoading(false);
      setIsCreateOpen(false);
      router.refresh();
    } catch {
      setFeedback({ type: 'error', message: 'Erro de conexão ao criar usuário.' });
      setIsLoading(false);
    }
  };

  // Submeter Edição
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    setIsLoading(true);
    setFeedback(null);

    try {
      const payload: Record<string, any> = {
        name: editName.trim(),
        role: editRole,
        ativo: editAtivo,
      };

      if (editPassword && editPassword.trim().length >= 6) {
        payload.password = editPassword.trim();
      }

      const res = await fetch(`/api/admin/usuarios/${editingUser.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        setFeedback({
          type: 'error',
          message: data.error || 'Erro ao atualizar dados do usuário.',
        });
        setIsLoading(false);
        return;
      }

      setIsLoading(false);
      setIsEditOpen(false);
      router.refresh();
    } catch {
      setFeedback({ type: 'error', message: 'Erro de conexão ao salvar alterações.' });
      setIsLoading(false);
    }
  };

  // Ação rápida de alternar Ativo / Inativo
  const handleToggleAtivo = async (user: UserItem) => {
    if (user.id === currentUserId) {
      alert('Você não pode inativar seu próprio usuário logado.');
      return;
    }

    const action = user.ativo ? 'inativar' : 'reativar';
    if (!confirm(`Deseja realmente ${action} o usuário ${user.name}?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/usuarios/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ativo: !user.ativo }),
      });

      if (res.ok) {
        router.refresh();
      } else {
        alert('Não foi possível alterar o status do usuário.');
      }
    } catch {
      alert('Erro de conexão ao atualizar status.');
    }
  };

  // Filtragem
  const filteredUsers = initialUsers.filter((u) => {
    const matchesSearch =
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase());
    const matchesRole = roleFilter === 'ALL' || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const roleBadge = (role: string) => {
    if (role === 'APONTADOR') {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
          Apontador (Campo)
        </span>
      );
    }
    if (role === 'ENGENHEIRO') {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-zinc-100 text-zinc-800 border border-zinc-300">
          Engenheiro (Técnico)
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
        Administrador / Gestor
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Barra de Título e Ação Principal */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Gestão de Usuários</h1>
          <p className="text-slate-500 text-sm">
            Controle de acessos, permissões corporativas e status dos colaboradores
          </p>
        </div>

        {/* Botão + Novo Usuário em Vermelho RBT */}
        <button
          type="button"
          onClick={handleOpenCreate}
          className="inline-flex items-center gap-2 bg-[#BA1A1A] hover:bg-[#991B1B] text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-md shadow-red-950/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
        >
          <UserPlus className="w-4 h-4" />
          <span>+ Novo Usuário</span>
        </button>
      </div>

      {/* Barra de Filtros e Busca */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome ou e-mail..."
            className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#BA1A1A]"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Perfil:</span>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#BA1A1A]"
          >
            <option value="ALL">Todos os Perfis ({initialUsers.length})</option>
            <option value="APONTADOR">Apontadores</option>
            <option value="ENGENHEIRO">Engenheiros</option>
            <option value="ADMINISTRADOR">Administradores</option>
          </select>
        </div>
      </div>

      {/* Tabela de Usuários */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <table className="w-full text-sm text-left">
          <thead>
            <tr className="bg-[#111827] text-white">
              <th className="px-5 py-3.5 font-bold">Colaborador / E-mail</th>
              <th className="px-5 py-3.5 font-bold text-center">Perfil de Acesso</th>
              <th className="px-5 py-3.5 font-bold text-center">Status</th>
              <th className="px-5 py-3.5 font-bold text-center">Cadastrado em</th>
              <th className="px-5 py-3.5 font-bold text-center">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-5 py-10 text-center text-slate-500">
                  Nenhum usuário encontrado com os filtros atuais.
                </td>
              </tr>
            ) : (
              filteredUsers.map((u, i) => (
                <tr
                  key={u.id}
                  className={`transition-colors hover:bg-slate-50/80 ${
                    !u.ativo ? 'opacity-60 bg-slate-50/50' : i % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'
                  }`}
                >
                  {/* Colaborador */}
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-slate-700 text-xs">
                        {u.name.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-bold text-slate-900 leading-snug">{u.name}</p>
                        <p className="text-xs text-slate-500 font-mono">{u.email}</p>
                      </div>
                    </div>
                  </td>

                  {/* Perfil */}
                  <td className="px-5 py-3.5 text-center">{roleBadge(u.role)}</td>

                  {/* Status Ativo / Inativo */}
                  <td className="px-5 py-3.5 text-center">
                    <span
                      className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-0.5 rounded-full ${
                        u.ativo
                          ? 'bg-green-100 text-green-800 border border-green-200'
                          : 'bg-red-100 text-red-800 border border-red-200'
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${u.ativo ? 'bg-green-600' : 'bg-red-600'}`} />
                      {u.ativo ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>

                  {/* Data */}
                  <td className="px-5 py-3.5 text-center text-xs text-slate-500">
                    {new Date(u.createdAt).toLocaleDateString('pt-BR')}
                  </td>

                  {/* Ações: Lápis para editar e Power para ativar/inativar */}
                  <td className="px-5 py-3.5 text-center">
                    <div className="inline-flex items-center gap-1.5">
                      {/* Botão de Lápis para editar o perfil */}
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(u)}
                        title="Editar perfil do usuário"
                        className="inline-flex items-center gap-1 p-2 bg-slate-100 hover:bg-[#111827] hover:text-white text-slate-700 rounded-lg transition-colors border border-slate-200 text-xs font-medium"
                      >
                        <Pencil className="w-3.5 h-3.5 text-[#BA1A1A] group-hover:text-white" />
                        <span className="hidden md:inline">Editar</span>
                      </button>

                      {/* Botão rápido para Ativar / Inativar */}
                      <button
                        type="button"
                        onClick={() => handleToggleAtivo(u)}
                        title={u.ativo ? 'Inativar usuário' : 'Reativar usuário'}
                        className={`p-2 rounded-lg transition-colors border text-xs font-medium ${
                          u.ativo
                            ? 'bg-red-50 hover:bg-red-100 text-red-700 border-red-200'
                            : 'bg-green-50 hover:bg-green-100 text-green-700 border-green-200'
                        }`}
                      >
                        <Power className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ================= MODAL NOVO USUÁRIO ================= */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden">
            {/* Modal Header com Vermelho RBT */}
            <div className="bg-[#BA1A1A] text-white px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <UserPlus className="w-5 h-5" />
                <h2 className="text-lg font-bold">Cadastrar Novo Usuário</h2>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleCreateSubmit} className="p-6 space-y-4">
              {feedback && (
                <div
                  className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                    feedback.type === 'error'
                      ? 'bg-red-50 border border-red-200 text-red-700'
                      : 'bg-green-50 border border-green-200 text-green-700'
                  }`}
                >
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{feedback.message}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Nome Completo <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={createName}
                    onChange={(e) => setCreateName(e.target.value)}
                    placeholder="Ex: João da Silva"
                    className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#BA1A1A]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  E-mail Corporativo <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="email"
                    required
                    value={createEmail}
                    onChange={(e) => setCreateEmail(e.target.value)}
                    placeholder="usuario@rbt.com.br"
                    className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#BA1A1A]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Senha Provisória <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={createPassword}
                    onChange={(e) => setCreatePassword(e.target.value)}
                    placeholder="Mínimo 6 dígitos (ex: Rbt@2026)"
                    className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#BA1A1A]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Perfil de Acesso <span className="text-red-500">*</span>
                </label>
                <select
                  value={createRole}
                  onChange={(e) => setCreateRole(e.target.value as any)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#BA1A1A]"
                >
                  <option value="APONTADOR">Apontador de Campo (Apenas preenche RDP)</option>
                  <option value="ENGENHEIRO">Engenheiro (Valida RDPs e gerencia medições)</option>
                  <option value="ADMINISTRADOR">Administrador / Gestor (Acesso irrestrito)</option>
                </select>
              </div>

              {/* Ações */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  disabled={isLoading}
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="inline-flex items-center gap-2 bg-[#BA1A1A] hover:bg-[#991B1B] text-white px-5 py-2 rounded-lg text-sm font-bold transition disabled:opacity-50"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Salvando...</span>
                    </>
                  ) : (
                    <span>Cadastrar Usuário</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL EDITAR PERFIL (LÁPIS) ================= */}
      {isEditOpen && editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden">
            {/* Modal Header com Preto Grafite e Linha Vermelha RBT */}
            <div className="bg-[#111827] border-b-2 border-[#BA1A1A] text-white px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Pencil className="w-5 h-5 text-amber-400" />
                <div>
                  <h2 className="text-lg font-bold">Editar Perfil do Usuário</h2>
                  <p className="text-xs text-slate-300">{editingUser.email}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsEditOpen(false)}
                className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleEditSubmit} className="p-6 space-y-4">
              {feedback && (
                <div
                  className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                    feedback.type === 'error'
                      ? 'bg-red-50 border border-red-200 text-red-700'
                      : 'bg-green-50 border border-green-200 text-green-700'
                  }`}
                >
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{feedback.message}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Nome do Usuário <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#BA1A1A]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Perfil de Acesso <span className="text-red-500">*</span>
                </label>
                <select
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value as any)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#BA1A1A]"
                >
                  <option value="APONTADOR">Apontador de Campo (Apenas preenche RDP)</option>
                  <option value="ENGENHEIRO">Engenheiro (Valida RDPs e gerencia medições)</option>
                  <option value="ADMINISTRADOR">Administrador / Gestor (Acesso irrestrito)</option>
                </select>
              </div>

              {/* Status Ativo / Inativo com Switch Visual */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Status da Conta
                </label>
                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <button
                    type="button"
                    onClick={() => setEditAtivo(!editAtivo)}
                    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      editAtivo ? 'bg-green-600' : 'bg-slate-300'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        editAtivo ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                  <div>
                    <span className={`text-sm font-bold ${editAtivo ? 'text-green-700' : 'text-red-700'}`}>
                      {editAtivo ? 'Conta Ativa' : 'Conta Inativa (Acesso Bloqueado)'}
                    </span>
                    <p className="text-[11px] text-slate-500">
                      {editAtivo
                        ? 'O usuário pode entrar no sistema normalmente.'
                        : 'O usuário não conseguirá efetuar login.'}
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Redefinir Senha (Opcional)
                </label>
                <input
                  type="text"
                  value={editPassword}
                  onChange={(e) => setEditPassword(e.target.value)}
                  placeholder="Deixe em branco para manter a senha atual"
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#BA1A1A]"
                />
                <span className="text-[11px] text-slate-400 mt-0.5 block">
                  Preencha apenas se desejar alterar a senha deste colaborador.
                </span>
              </div>

              {/* Ações */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  disabled={isLoading}
                  onClick={() => setIsEditOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="inline-flex items-center gap-2 bg-[#BA1A1A] hover:bg-[#991B1B] text-white px-5 py-2 rounded-lg text-sm font-bold transition disabled:opacity-50"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Salvando...</span>
                    </>
                  ) : (
                    <span>Salvar Alterações</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
