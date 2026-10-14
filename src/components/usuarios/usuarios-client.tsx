'use client';

import React, { useState } from 'react';
import {
  Users,
  UserPlus,
  Shield,
  Briefcase,
  CheckCircle2,
  XCircle,
  Mail,
  Lock,
  User as UserIcon,
  Calendar,
  AlertCircle,
  X,
  Search,
} from 'lucide-react';
import { useToast } from '@/components/ui/toast-provider';

interface Usuario {
  id: string;
  name: string;
  email: string;
  role: string;
  ativo: boolean;
  createdAt: string | Date;
  _count?: {
    orcamentos: number;
  };
}

interface UsuariosClientProps {
  initialUsers: Usuario[];
  currentUser: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
}

export function UsuariosClient({ initialUsers, currentUser }: UsuariosClientProps) {
  const { toast } = useToast();
  const [users, setUsers] = useState<Usuario[]>(initialUsers);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'TODOS' | 'ADMIN' | 'ORCAMENTISTA'>('TODOS');

  // Modal Novo Usuário
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'ORCAMENTISTA' as 'ADMIN' | 'ORCAMENTISTA',
  });

  // Atualização inline de status/perfil
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const isGestor = currentUser.role === 'ADMIN';

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase());
    const matchesRole = roleFilter === 'TODOS' || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.name || !createForm.email || !createForm.password) {
      toast.warning('Campos Obrigatórios', 'Preencha nome, e-mail e senha.');
      return;
    }

    setCreating(true);
    try {
      const res = await fetch('/api/usuarios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createForm),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error('Erro ao Criar Usuário', data.error || 'Falha ao salvar usuário.');
        setCreating(false);
        return;
      }

      toast.success(
        'Usuário Criado!',
        `${data.user.name} cadastrado com perfil ${data.user.role === 'ADMIN' ? 'Gestor' : 'Orçamentista'}.`
      );

      setUsers([data.user, ...users]);
      setShowCreateModal(false);
      setCreateForm({
        name: '',
        email: '',
        password: '',
        role: 'ORCAMENTISTA',
      });
    } catch {
      toast.error('Erro de Conexão', 'Não foi possível conectar ao servidor.');
    } finally {
      setCreating(false);
    }
  };

  const handleUpdateRole = async (userId: string, newRole: 'ADMIN' | 'ORCAMENTISTA') => {
    setUpdatingId(userId);
    try {
      const res = await fetch(`/api/usuarios/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error('Erro', data.error || 'Falha ao atualizar perfil.');
        return;
      }

      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u))
      );
      toast.success(
        'Perfil Atualizado',
        `Usuário agora é ${newRole === 'ADMIN' ? 'Gestor' : 'Orçamentista'}.`
      );
    } catch {
      toast.error('Erro de Conexão', 'Não foi possível atualizar o perfil.');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleToggleAtivo = async (userId: string, currentAtivo: boolean) => {
    if (userId === currentUser.id && currentAtivo) {
      toast.warning('Ação Não Permitida', 'Você não pode desativar o seu próprio usuário logado.');
      return;
    }

    setUpdatingId(userId);
    try {
      const res = await fetch(`/api/usuarios/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ativo: !currentAtivo }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error('Erro', data.error || 'Falha ao alterar status.');
        return;
      }

      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, ativo: !currentAtivo } : u))
      );
      toast.success(
        'Status Atualizado',
        `Usuário ${!currentAtivo ? 'ativado' : 'desativado'} com sucesso.`
      );
    } catch {
      toast.error('Erro de Conexão', 'Não foi possível alterar o status.');
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-red-100 text-[#BA1A1A] rounded-xl">
              <Users className="w-5 h-5" />
            </span>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Gestão de Equipe & Usuários
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Controle de acesso da equipe RBT: defina quem é <strong>Orçamentista</strong> e quem é <strong>Gestor</strong>.
          </p>
        </div>

        {isGestor && (
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2.5 bg-[#BA1A1A] hover:bg-[#991B1B] text-white text-xs font-bold rounded-xl transition flex items-center justify-center gap-2 shadow-sm shadow-red-950/20 active:scale-95 cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>Novo Usuário</span>
          </button>
        )}
      </div>

      {/* Barra de Filtros e Busca */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome ou e-mail..."
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#BA1A1A]"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs text-slate-500 font-medium">Filtrar perfil:</span>
          <div className="inline-flex p-1 bg-slate-100 rounded-xl text-xs">
            <button
              type="button"
              onClick={() => setRoleFilter('TODOS')}
              className={`px-3 py-1 rounded-lg font-bold transition ${
                roleFilter === 'TODOS'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Todos ({users.length})
            </button>
            <button
              type="button"
              onClick={() => setRoleFilter('ADMIN')}
              className={`px-3 py-1 rounded-lg font-bold transition ${
                roleFilter === 'ADMIN'
                  ? 'bg-amber-500 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Gestores ({users.filter((u) => u.role === 'ADMIN').length})
            </button>
            <button
              type="button"
              onClick={() => setRoleFilter('ORCAMENTISTA')}
              className={`px-3 py-1 rounded-lg font-bold transition ${
                roleFilter === 'ORCAMENTISTA'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Orçamentistas ({users.filter((u) => u.role === 'ORCAMENTISTA').length})
            </button>
          </div>
        </div>
      </div>

      {/* Tabela de Usuários */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <th className="py-3 px-4 sm:px-6">Usuário</th>
                <th className="py-3 px-4">Função / Perfil</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-center">Orçamentos Vinculados</th>
                <th className="py-3 px-4 text-right">Cadastrado em</th>
                {isGestor && <th className="py-3 px-4 sm:px-6 text-right">Ações</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    Nenhum usuário encontrado com os filtros atuais.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => {
                  const isCurrent = user.id === currentUser.id;
                  const isUpdating = updatingId === user.id;

                  return (
                    <tr
                      key={user.id}
                      className="hover:bg-slate-50/60 transition group"
                    >
                      {/* Usuário Nome & Email */}
                      <td className="py-3.5 px-4 sm:px-6">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-slate-700 flex-shrink-0">
                            {user.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-900">
                                {user.name}
                              </span>
                              {isCurrent && (
                                <span className="bg-slate-100 text-slate-600 text-[10px] font-semibold px-2 py-0.2 rounded-md">
                                  Você
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] text-slate-500 font-mono">
                              {user.email}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Perfil: Gestor vs Orçamentista */}
                      <td className="py-3.5 px-4">
                        {isGestor && !isCurrent ? (
                          <select
                            value={user.role}
                            onChange={(e) =>
                              handleUpdateRole(
                                user.id,
                                e.target.value as 'ADMIN' | 'ORCAMENTISTA'
                              )
                            }
                            disabled={isUpdating}
                            className={`text-xs font-bold px-2.5 py-1 rounded-lg border focus:outline-none transition cursor-pointer ${
                              user.role === 'ADMIN'
                                ? 'bg-amber-50 text-amber-800 border-amber-300'
                                : 'bg-blue-50 text-blue-800 border-blue-300'
                            }`}
                          >
                            <option value="ADMIN">Gestor (ADMIN)</option>
                            <option value="ORCAMENTISTA">Orçamentista</option>
                          </select>
                        ) : (
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border ${
                              user.role === 'ADMIN'
                                ? 'bg-amber-50 text-amber-800 border-amber-300'
                                : 'bg-blue-50 text-blue-800 border-blue-300'
                            }`}
                          >
                            {user.role === 'ADMIN' ? (
                              <>
                                <Shield className="w-3.5 h-3.5 text-amber-600" />
                                <span>Gestor (ADMIN)</span>
                              </>
                            ) : (
                              <>
                                <Briefcase className="w-3.5 h-3.5 text-blue-600" />
                                <span>Orçamentista</span>
                              </>
                            )}
                          </span>
                        )}
                      </td>

                      {/* Status Ativo / Inativo */}
                      <td className="py-3.5 px-4 text-center">
                        {isGestor && !isCurrent ? (
                          <button
                            type="button"
                            onClick={() => handleToggleAtivo(user.id, user.ativo)}
                            disabled={isUpdating}
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold border transition cursor-pointer ${
                              user.ativo
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                                : 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100'
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                user.ativo ? 'bg-emerald-500' : 'bg-red-500'
                              }`}
                            />
                            <span>{user.ativo ? 'Ativo' : 'Inativo'}</span>
                          </button>
                        ) : (
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold border ${
                              user.ativo
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : 'bg-red-50 text-red-700 border-red-200'
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                user.ativo ? 'bg-emerald-500' : 'bg-red-500'
                              }`}
                            />
                            <span>{user.ativo ? 'Ativo' : 'Inativo'}</span>
                          </span>
                        )}
                      </td>

                      {/* Orçamentos Vinculados */}
                      <td className="py-3.5 px-4 text-center font-mono font-bold text-slate-700">
                        {user._count?.orcamentos ?? 0}
                      </td>

                      {/* Data de Cadastro */}
                      <td className="py-3.5 px-4 text-right text-slate-400 font-mono text-[11px]">
                        {new Date(user.createdAt).toLocaleDateString('pt-BR')}
                      </td>

                      {/* Ações */}
                      {isGestor && (
                        <td className="py-3.5 px-4 sm:px-6 text-right">
                          {!isCurrent ? (
                            <button
                              type="button"
                              onClick={() => handleToggleAtivo(user.id, user.ativo)}
                              disabled={isUpdating}
                              className="text-[11px] font-semibold text-slate-500 hover:text-slate-800 underline transition cursor-pointer"
                            >
                              {user.ativo ? 'Desativar' : 'Reativar'}
                            </button>
                          ) : (
                            <span className="text-[11px] text-slate-400">—</span>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Criar Novo Usuário */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-slate-200 text-slate-900 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-red-100 text-[#BA1A1A] flex items-center justify-center">
                  <UserPlus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Cadastrar Usuário da Equipe
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Adicione um novo Orçamentista ou Gestor ao sistema.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Nome Completo *
                </label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={createForm.name}
                    onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                    placeholder="Ex: Eng. Rafael Silveira"
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#BA1A1A]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  E-mail Corporativo *
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="email"
                    required
                    value={createForm.email}
                    onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                    placeholder="rafael.silveira@rbt.com.br"
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#BA1A1A]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Senha Provisória *
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={createForm.password}
                    onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                    placeholder="Mínimo de 6 caracteres"
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#BA1A1A]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Perfil de Acesso (Função) *
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <label
                    className={`p-3 rounded-xl border flex flex-col items-center text-center gap-1 cursor-pointer transition ${
                      createForm.role === 'ORCAMENTISTA'
                        ? 'border-blue-500 bg-blue-50/50 text-blue-900 ring-2 ring-blue-500'
                        : 'border-slate-200 hover:border-slate-300 text-slate-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name="role"
                      value="ORCAMENTISTA"
                      checked={createForm.role === 'ORCAMENTISTA'}
                      onChange={() => setCreateForm({ ...createForm, role: 'ORCAMENTISTA' })}
                      className="sr-only"
                    />
                    <Briefcase className="w-4 h-4 text-blue-600" />
                    <span className="text-xs font-bold">Orçamentista</span>
                    <span className="text-[10px] text-slate-500">
                      Calcula custos, propostas e atende obras
                    </span>
                  </label>

                  <label
                    className={`p-3 rounded-xl border flex flex-col items-center text-center gap-1 cursor-pointer transition ${
                      createForm.role === 'ADMIN'
                        ? 'border-amber-500 bg-amber-50/50 text-amber-900 ring-2 ring-amber-500'
                        : 'border-slate-200 hover:border-slate-300 text-slate-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name="role"
                      value="ADMIN"
                      checked={createForm.role === 'ADMIN'}
                      onChange={() => setCreateForm({ ...createForm, role: 'ADMIN' })}
                      className="sr-only"
                    />
                    <Shield className="w-4 h-4 text-amber-600" />
                    <span className="text-xs font-bold">Gestor (ADMIN)</span>
                    <span className="text-[10px] text-slate-500">
                      Controle total, métricas e gestão de usuários
                    </span>
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-5 py-2.5 bg-[#BA1A1A] hover:bg-[#991B1B] text-white text-xs font-bold rounded-xl transition flex items-center gap-2 shadow-sm active:scale-95 cursor-pointer disabled:opacity-50"
                >
                  {creating ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>Salvar Usuário</span>
                      <CheckCircle2 className="w-4 h-4" />
                    </>
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
