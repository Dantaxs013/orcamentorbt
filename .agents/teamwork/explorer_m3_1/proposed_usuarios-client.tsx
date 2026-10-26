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
  Trash2,
  Calculator,
  HardHat,
  Pencil,
} from 'lucide-react';
import { useToast } from '@/components/ui/toast-provider';
import { ConfirmModal } from '@/components/ui/confirm-modal';

export interface Usuario {
  id: string;
  name: string;
  email: string;
  role: string;
  ativo: boolean;
  acessoOrcamento: boolean;
  acessoMedicao: boolean;
  createdAt: string | Date;
  _count?: {
    orcamentos: number;
  };
}

export interface UsuariosClientProps {
  initialUsers: Usuario[];
  currentUser: {
    id: string;
    name: string;
    email: string;
    role: string;
    acessoOrcamento?: boolean;
    acessoMedicao?: boolean;
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
    acessoOrcamento: true,
    acessoMedicao: false,
  });

  // Modal Editar Usuário
  const [editingUser, setEditingUser] = useState<Usuario | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    role: 'ORCAMENTISTA' as 'ADMIN' | 'ORCAMENTISTA',
    ativo: true,
    acessoOrcamento: true,
    acessoMedicao: false,
    password: '',
  });

  // Atualização inline de status/perfil
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Modal Deletar Usuário
  const [userToDelete, setUserToDelete] = useState<Usuario | null>(null);
  const [deleting, setDeleting] = useState(false);

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

    if (createForm.password.length < 6) {
      toast.warning('Senha Curta', 'A senha provisória deve conter no mínimo 6 caracteres.');
      return;
    }

    if (!createForm.acessoOrcamento && !createForm.acessoMedicao) {
      toast.warning(
        'Módulo Obrigatório',
        'Selecione pelo menos um módulo de acesso (Orçamentos ou Medição Diária).'
      );
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
        `${data.user.name} cadastrado com sucesso.`
      );

      setUsers([data.user, ...users]);
      setShowCreateModal(false);
      setCreateForm({
        name: '',
        email: '',
        password: '',
        role: 'ORCAMENTISTA',
        acessoOrcamento: true,
        acessoMedicao: false,
      });
    } catch {
      toast.error('Erro de Conexão', 'Não foi possível conectar ao servidor.');
    } finally {
      setCreating(false);
    }
  };

  const handleOpenEdit = (user: Usuario) => {
    setEditingUser(user);
    setEditForm({
      name: user.name,
      role: (user.role === 'ADMIN' ? 'ADMIN' : 'ORCAMENTISTA') as 'ADMIN' | 'ORCAMENTISTA',
      ativo: user.ativo,
      acessoOrcamento: Boolean(user.acessoOrcamento),
      acessoMedicao: Boolean(user.acessoMedicao),
      password: '',
    });
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    if (!editForm.name.trim()) {
      toast.warning('Campo Obrigatório', 'O nome do usuário não pode ficar vazio.');
      return;
    }

    const isEditingSelf = editingUser.id === currentUser.id;

    // Proteção contra autorrevogação do próprio gestor
    if (isEditingSelf && !editForm.ativo) {
      toast.warning('Ação Não Permitida', 'Você não pode desativar o seu próprio usuário logado.');
      return;
    }

    if (isEditingSelf && editForm.role !== 'ADMIN') {
      toast.warning('Ação Não Permitida', 'Você não pode remover o perfil de Gestor da sua própria conta.');
      return;
    }

    if (isEditingSelf && !editForm.acessoOrcamento) {
      toast.warning(
        'Ação Não Permitida',
        'Você não pode revogar seu próprio acesso ao módulo de Orçamentos enquanto opera nesta sessão.'
      );
      return;
    }

    if (!editForm.acessoOrcamento && !editForm.acessoMedicao) {
      toast.warning(
        'Módulo Obrigatório',
        'O usuário deve possuir acesso a pelo menos um módulo do sistema (Orçamentos ou Medição Diária).'
      );
      return;
    }

    if (editForm.password && editForm.password.trim().length < 6) {
      toast.warning('Senha Curta', 'A nova senha deve ter no mínimo 6 caracteres.');
      return;
    }

    setSavingEdit(true);
    try {
      const payload: Record<string, any> = {
        name: editForm.name.trim(),
        role: editForm.role,
        ativo: editForm.ativo,
        acessoOrcamento: editForm.acessoOrcamento,
        acessoMedicao: editForm.acessoMedicao,
      };

      if (editForm.password && editForm.password.trim().length >= 6) {
        payload.password = editForm.password.trim();
      }

      const res = await fetch(`/api/usuarios/${editingUser.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error('Erro ao Atualizar', data.error || 'Falha ao salvar alterações.');
        return;
      }

      setUsers((prev) =>
        prev.map((u) => (u.id === editingUser.id ? { ...u, ...data.user } : u))
      );

      toast.success(
        'Dados Atualizados!',
        `As permissões e dados de ${editForm.name} foram salvos com sucesso.`
      );

      setEditingUser(null);
    } catch {
      toast.error('Erro de Conexão', 'Não foi possível atualizar o usuário.');
    } finally {
      setSavingEdit(false);
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

  const executeDeleteUser = async () => {
    if (!userToDelete) return;
    if (userToDelete.id === currentUser.id) {
      toast.warning('Ação Não Permitida', 'Você não pode excluir o seu próprio usuário logado.');
      setUserToDelete(null);
      return;
    }

    setDeleting(true);
    try {
      const res = await fetch(`/api/usuarios/${userToDelete.id}`, {
        method: 'DELETE',
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error('Erro ao Excluir', data.error || 'Não foi possível excluir o usuário.');
        return;
      }

      setUsers((prev) => prev.filter((u) => u.id !== userToDelete.id));
      toast.success(
        'Conta Excluída',
        `A conta de ${userToDelete.name} foi removida permanentemente do sistema.`
      );
      setUserToDelete(null);
    } catch {
      toast.error('Erro de Conexão', 'Falha ao se comunicar com o servidor.');
    } finally {
      setDeleting(false);
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
            Controle de acesso modular da equipe RBT: gerencie perfis, status e permissões aos sistemas de <strong>Orçamentos</strong> e <strong>Medição Diária (RDP)</strong>.
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
                <th className="py-3 px-4">Módulos Habilitados</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-center">Orçamentos Vinculados</th>
                <th className="py-3 px-4 text-right">Cadastrado em</th>
                {isGestor && <th className="py-3 px-4 sm:px-6 text-right">Ações</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
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

                      {/* Módulos Habilitados */}
                      <td className="py-3.5 px-4">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {user.acessoOrcamento && (
                            <span
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-red-50 text-[#BA1A1A] border border-red-200 shadow-2xs"
                              title="Acesso liberado à Gestão de Orçamentos"
                            >
                              <Calculator className="w-3.5 h-3.5 text-[#BA1A1A]" />
                              <span>Orçamentos</span>
                            </span>
                          )}
                          {user.acessoMedicao && (
                            <span
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-slate-100 text-slate-800 border border-slate-300 shadow-2xs"
                              title="Acesso liberado à Medição Diária (RDP)"
                            >
                              <HardHat className="w-3.5 h-3.5 text-slate-800" />
                              <span>Medição</span>
                            </span>
                          )}
                          {!user.acessoOrcamento && !user.acessoMedicao && (
                            <span
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-200"
                              title="Nenhum módulo liberado"
                            >
                              <AlertCircle className="w-3 h-3 text-amber-500" />
                              <span>Sem módulo</span>
                            </span>
                          )}
                        </div>
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
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => handleOpenEdit(user)}
                              disabled={isUpdating}
                              className="px-2.5 py-1 text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition cursor-pointer flex items-center gap-1 text-[11px] font-bold"
                              title={`Editar perfil e permissões de ${user.name}`}
                            >
                              <Pencil className="w-3.5 h-3.5 text-slate-600" />
                              <span>Editar</span>
                            </button>

                            {!isCurrent ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleToggleAtivo(user.id, user.ativo)}
                                  disabled={isUpdating}
                                  className="text-[11px] font-semibold text-slate-500 hover:text-slate-800 underline transition cursor-pointer px-1"
                                >
                                  {user.ativo ? 'Desativar' : 'Reativar'}
                                </button>

                                <button
                                  type="button"
                                  onClick={() => setUserToDelete(user)}
                                  disabled={isUpdating}
                                  className="p-1.5 text-slate-400 hover:text-[#BA1A1A] hover:bg-red-50 rounded-lg transition cursor-pointer"
                                  title={`Excluir definitivamente ${user.name}`}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </>
                            ) : (
                              <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-semibold">
                                Você
                              </span>
                            )}
                          </div>
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
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-slate-200 text-slate-900 space-y-5 max-h-[90vh] overflow-y-auto">
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
                    Adicione um novo colaborador e configure o acesso aos módulos RBT.
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

              {/* Módulos Habilitados */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Módulos do Sistema Habilitados *
                </label>
                <p className="text-[11px] text-slate-500 mb-2.5 leading-snug">
                  Selecione os módulos corporativos que o usuário poderá acessar. É obrigatório selecionar ao menos um módulo.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Card Orçamentos */}
                  <label
                    className={`p-3 rounded-2xl border flex items-start gap-3 cursor-pointer transition select-none ${
                      createForm.acessoOrcamento
                        ? 'border-red-300 bg-red-50/50 text-slate-900 ring-2 ring-[#BA1A1A]/20'
                        : 'border-slate-200 hover:border-slate-300 text-slate-600 bg-slate-50/50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={createForm.acessoOrcamento}
                      onChange={(e) =>
                        setCreateForm({ ...createForm, acessoOrcamento: e.target.checked })
                      }
                      className="mt-0.5 w-4 h-4 rounded border-slate-300 text-[#BA1A1A] focus:ring-[#BA1A1A]"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-1.5">
                        <Calculator className="w-3.5 h-3.5 text-[#BA1A1A]" />
                        <span className="text-xs font-bold text-slate-900">Gestão de Orçamentos</span>
                      </div>
                      <p className="text-[10px] text-slate-500 mt-0.5 leading-snug">
                        Quadro Kanban, propostas comerciais e cálculo de fundações
                      </p>
                    </div>
                  </label>

                  {/* Card Medição */}
                  <label
                    className={`p-3 rounded-2xl border flex items-start gap-3 cursor-pointer transition select-none ${
                      createForm.acessoMedicao
                        ? 'border-slate-400 bg-slate-100 text-slate-900 ring-2 ring-slate-900/20'
                        : 'border-slate-200 hover:border-slate-300 text-slate-600 bg-slate-50/50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={createForm.acessoMedicao}
                      onChange={(e) =>
                        setCreateForm({ ...createForm, acessoMedicao: e.target.checked })
                      }
                      className="mt-0.5 w-4 h-4 rounded border-slate-300 text-[#111827] focus:ring-slate-900"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-1.5">
                        <HardHat className="w-3.5 h-3.5 text-slate-800" />
                        <span className="text-xs font-bold text-slate-900">Medição Diária (RDP)</span>
                      </div>
                      <p className="text-[10px] text-slate-500 mt-0.5 leading-snug">
                        Apontamento em canteiro de obras, estacas e boletins de medição
                      </p>
                    </div>
                  </label>
                </div>

                {!createForm.acessoOrcamento && !createForm.acessoMedicao && (
                  <div className="flex items-center gap-2 mt-2.5 p-2 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-semibold animate-in fade-in">
                    <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-600" />
                    <span>Selecione pelo menos um módulo para poder cadastrar o usuário.</span>
                  </div>
                )}
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
                  disabled={creating || (!createForm.acessoOrcamento && !createForm.acessoMedicao)}
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

      {/* Modal Editar Usuário e Permissões */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-slate-200 text-slate-900 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center border border-slate-200">
                  <Pencil className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Editar Perfil & Permissões
                  </h3>
                  <p className="text-[11px] text-slate-500 font-mono">
                    {editingUser.email}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {editingUser.id === currentUser.id && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-900 flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <p className="font-bold">Você está editando a sua própria conta ativa</p>
                  <p className="text-[11px] text-amber-700 leading-snug">
                    Para proteger sua sessão contra travamento acidental, a função de Gestor,
                    o status ativo e a permissão do módulo Orçamentos estão fixados.
                  </p>
                </div>
              </div>
            )}

            <form onSubmit={handleSaveEdit} className="space-y-4">
              {/* Nome Completo */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Nome Completo *
                </label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#BA1A1A]"
                  />
                </div>
              </div>

              {/* Perfil / Função */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Perfil de Acesso (Função) *
                </label>
                {editingUser.id === currentUser.id ? (
                  <div className="p-2.5 bg-slate-100 border border-slate-200 rounded-xl flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-800 flex items-center gap-1.5">
                      <Shield className="w-4 h-4 text-amber-600" />
                      Gestor (ADMIN)
                    </span>
                    <span className="text-[10px] text-slate-500 font-semibold">🔒 Bloqueado para o próprio usuário</span>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    <label
                      className={`p-3 rounded-xl border flex flex-col items-center text-center gap-1 cursor-pointer transition ${
                        editForm.role === 'ORCAMENTISTA'
                          ? 'border-blue-500 bg-blue-50/50 text-blue-900 ring-2 ring-blue-500'
                          : 'border-slate-200 hover:border-slate-300 text-slate-700'
                      }`}
                    >
                      <input
                        type="radio"
                        name="edit-role"
                        value="ORCAMENTISTA"
                        checked={editForm.role === 'ORCAMENTISTA'}
                        onChange={() => setEditForm({ ...editForm, role: 'ORCAMENTISTA' })}
                        className="sr-only"
                      />
                      <Briefcase className="w-4 h-4 text-blue-600" />
                      <span className="text-xs font-bold">Orçamentista</span>
                    </label>

                    <label
                      className={`p-3 rounded-xl border flex flex-col items-center text-center gap-1 cursor-pointer transition ${
                        editForm.role === 'ADMIN'
                          ? 'border-amber-500 bg-amber-50/50 text-amber-900 ring-2 ring-amber-500'
                          : 'border-slate-200 hover:border-slate-300 text-slate-700'
                      }`}
                    >
                      <input
                        type="radio"
                        name="edit-role"
                        value="ADMIN"
                        checked={editForm.role === 'ADMIN'}
                        onChange={() => setEditForm({ ...editForm, role: 'ADMIN' })}
                        className="sr-only"
                      />
                      <Shield className="w-4 h-4 text-amber-600" />
                      <span className="text-xs font-bold">Gestor (ADMIN)</span>
                    </label>
                  </div>
                )}
              </div>

              {/* Status Ativo / Inativo */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Status da Conta *
                </label>
                {editingUser.id === currentUser.id ? (
                  <div className="p-2.5 bg-slate-100 border border-slate-200 rounded-xl flex items-center justify-between text-xs">
                    <span className="font-bold text-emerald-700 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      Ativo
                    </span>
                    <span className="text-[10px] text-slate-500 font-semibold">🔒 Bloqueado para o próprio usuário</span>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setEditForm({ ...editForm, ativo: true })}
                      className={`p-2.5 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-2 ${
                        editForm.ativo
                          ? 'border-emerald-400 bg-emerald-50 text-emerald-800 ring-2 ring-emerald-400'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      <span>Ativo</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditForm({ ...editForm, ativo: false })}
                      className={`p-2.5 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-2 ${
                        !editForm.ativo
                          ? 'border-red-400 bg-red-50 text-red-800 ring-2 ring-red-400'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <span className="w-2 h-2 rounded-full bg-red-500" />
                      <span>Inativo</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Módulos Habilitados */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Módulos Habilitados *
                </label>
                <p className="text-[11px] text-slate-500 mb-2.5">
                  Defina o acesso às plataformas corporativas. O usuário deve manter ao menos um módulo ativo.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Card Orçamentos */}
                  <label
                    className={`p-3 rounded-2xl border flex items-start gap-3 transition select-none ${
                      editingUser.id === currentUser.id
                        ? 'border-red-200 bg-red-50/30 opacity-90 cursor-not-allowed'
                        : editForm.acessoOrcamento
                        ? 'border-red-300 bg-red-50/50 ring-2 ring-[#BA1A1A]/20 cursor-pointer'
                        : 'border-slate-200 hover:border-slate-300 bg-slate-50/50 cursor-pointer'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={editForm.acessoOrcamento}
                      disabled={editingUser.id === currentUser.id}
                      onChange={(e) => {
                        if (editingUser.id === currentUser.id) return;
                        setEditForm({ ...editForm, acessoOrcamento: e.target.checked });
                      }}
                      className="mt-0.5 w-4 h-4 rounded border-slate-300 text-[#BA1A1A] focus:ring-[#BA1A1A] disabled:opacity-60"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-1.5">
                        <Calculator className="w-3.5 h-3.5 text-[#BA1A1A]" />
                        <span className="text-xs font-bold text-slate-900">Gestão de Orçamentos</span>
                      </div>
                      <p className="text-[10px] text-slate-500 mt-0.5 leading-snug">
                        Pipeline comercial e propostas técnicas
                      </p>
                      {editingUser.id === currentUser.id && (
                        <p className="text-[10px] text-amber-700 font-semibold mt-1">
                          🔒 Acesso obrigatório mantido
                        </p>
                      )}
                    </div>
                  </label>

                  {/* Card Medição */}
                  <label
                    className={`p-3 rounded-2xl border flex items-start gap-3 cursor-pointer transition select-none ${
                      editForm.acessoMedicao
                        ? 'border-slate-400 bg-slate-100 ring-2 ring-slate-900/20'
                        : 'border-slate-200 hover:border-slate-300 bg-slate-50/50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={editForm.acessoMedicao}
                      onChange={(e) =>
                        setEditForm({ ...editForm, acessoMedicao: e.target.checked })
                      }
                      className="mt-0.5 w-4 h-4 rounded border-slate-300 text-[#111827] focus:ring-slate-900"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-1.5">
                        <HardHat className="w-3.5 h-3.5 text-slate-800" />
                        <span className="text-xs font-bold text-slate-900">Medição Diária (RDP)</span>
                      </div>
                      <p className="text-[10px] text-slate-500 mt-0.5 leading-snug">
                        Apontamentos de obras e boletins
                      </p>
                    </div>
                  </label>
                </div>

                {!editForm.acessoOrcamento && !editForm.acessoMedicao && (
                  <div className="flex items-center gap-2 mt-2.5 p-2 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-semibold">
                    <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-600" />
                    <span>O usuário deve possuir acesso a pelo menos um módulo do sistema.</span>
                  </div>
                )}
              </div>

              {/* Redefinição de Senha (Opcional) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Redefinir Senha <span className="text-slate-400 font-normal lowercase">(opcional)</span>
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="password"
                    minLength={6}
                    value={editForm.password}
                    onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                    placeholder="Deixe em branco para manter a senha atual"
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#BA1A1A]"
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  Preencha apenas se desejar alterar a senha deste usuário (mínimo de 6 caracteres).
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingEdit || (!editForm.acessoOrcamento && !editForm.acessoMedicao)}
                  className="px-5 py-2.5 bg-[#BA1A1A] hover:bg-[#991B1B] text-white text-xs font-bold rounded-xl transition flex items-center gap-2 shadow-sm active:scale-95 cursor-pointer disabled:opacity-50"
                >
                  {savingEdit ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>Salvar Alterações</span>
                      <CheckCircle2 className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Confirmação para Exclusão de Conta */}
      <ConfirmModal
        isOpen={!!userToDelete}
        title="Excluir Conta de Usuário"
        description={
          userToDelete ? (
            <div className="space-y-2 text-xs text-slate-600">
              <p>
                Tem certeza que deseja excluir permanentemente o usuário{' '}
                <strong className="text-slate-900">{userToDelete.name}</strong> ({userToDelete.email})?
              </p>
              <p className="text-[11px] text-red-600 bg-red-50 p-2 rounded-lg border border-red-200">
                ⚠️ Esta ação não pode ser desfeita. Todas as sessões serão encerradas imediatamente.
              </p>
            </div>
          ) : (
            ''
          )
        }
        confirmLabel="Sim, Excluir Conta"
        cancelLabel="Cancelar"
        variant="danger"
        isLoading={deleting}
        onConfirm={executeDeleteUser}
        onCancel={() => setUserToDelete(null)}
      />
    </div>
  );
}
