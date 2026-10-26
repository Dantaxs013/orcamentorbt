'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { RBTLogo } from '@/components/ui/rbt-logo';
import { LogoutButton } from '@/components/ui/logout-button';
import {
  LayoutDashboard,
  ClipboardList,
  CheckSquare,
  Building2,
  TrendingUp,
  Users,
  FileText,
  Menu,
  X,
  ShieldCheck,
  User as UserIcon,
  ChevronRight,
  ExternalLink,
  Target,
  LayoutGrid,
} from 'lucide-react';

interface UserSession {
  id: string;
  name: string;
  email: string;
  role: string;
  acessoOrcamento?: boolean;
  acessoMedicao?: boolean;
}

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
}

function getNavItems(role: string): NavItem[] {
  const roleUpper = (role || '').toUpperCase();
  if (roleUpper === 'APONTADOR') {
    return [
      { href: '/medicao', label: 'Início', icon: LayoutDashboard },
      { href: '/medicao/apontador/rdp', label: 'Meus RDPs', icon: ClipboardList },
      { href: '/medicao/apontador/estacas', label: 'Estacas Principais', icon: Target },
    ];
  }
  if (roleUpper === 'ENGENHEIRO') {
    return [
      { href: '/medicao', label: 'Início', icon: LayoutDashboard },
      { href: '/medicao/engenheiro/validacao', label: 'Validar RDPs', icon: CheckSquare },
      { href: '/medicao/engenheiro/obras', label: 'Obras', icon: Building2 },
      { href: '/medicao/apontador/estacas', label: 'Estacas Principais', icon: Target },
      { href: '/medicao/engenheiro/medicoes', label: 'Medições', icon: TrendingUp },
    ];
  }
  // ADMINISTRADOR ou ADMIN
  return [
    { href: '/medicao', label: 'Início', icon: LayoutDashboard },
    { href: '/medicao/admin/usuarios', label: 'Usuários', icon: Users },
    { href: '/medicao/engenheiro/obras', label: 'Obras', icon: Building2 },
    { href: '/medicao/apontador/estacas', label: 'Estacas Principais', icon: Target },
    { href: '/medicao/admin/contratos', label: 'Contratos', icon: FileText },
    { href: '/medicao/engenheiro/medicoes', label: 'Medições', icon: TrendingUp },
    { href: '/medicao/engenheiro/validacao', label: 'Validar RDPs', icon: CheckSquare },
  ];
}

const roleColors: Record<string, string> = {
  APONTADOR: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
  ENGENHEIRO: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
  ADMINISTRADOR: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
  ADMIN: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
};

const roleLabels: Record<string, string> = {
  APONTADOR: 'Apontador',
  ENGENHEIRO: 'Engenheiro',
  ADMINISTRADOR: 'Admin / Gestor',
  ADMIN: 'Admin / Gestor',
};

export function MedicaoShell({
  user,
  children,
}: {
  user: UserSession;
  children: React.ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const navItems = getNavItems(user.role);

  const isLinkActive = (href: string) => {
    if (href === '/medicao') {
      return pathname === '/medicao';
    }
    return pathname.startsWith(href);
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      {/* ========================================================= */}
      {/* 1. SIDEBAR FIXA DO LADO ESQUERDO (DESKTOP)                */}
      {/* ========================================================= */}
      <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 z-40 bg-[#111827] border-r border-slate-800 text-white shadow-xl">
        {/* Brand Header */}
        <div className="p-4 border-b border-slate-800 bg-[#0f172a]">
          <Link href="/medicao" className="flex flex-col items-center group">
            <div className="bg-white rounded-xl px-4 py-2.5 shadow-md border border-white/20 flex items-center justify-center group-hover:scale-105 transition-transform w-full">
              <RBTLogo size="md" subtitle="ENGENHARIA" />
            </div>
            <div className="mt-2 text-center">
              <span className="text-[11px] font-bold tracking-wider text-slate-300 uppercase block">
                Sistema de Medição Diária
              </span>
              <span className="text-[10px] text-slate-400 font-mono block">
                RBT Fundações · Obras
              </span>
            </div>
          </Link>
          <div className="h-0.5 bg-[#BA1A1A] w-12 mx-auto mt-3 rounded-full" />
        </div>

        {/* Menu Navigation Links */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-3 pb-2">
            Menu de Navegação
          </div>
          <nav className="space-y-1">
            {navItems.map((item) => {
              const active = isLinkActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm transition group ${
                    active
                      ? 'bg-[#BA1A1A] text-white shadow-md shadow-red-950/40 font-bold'
                      : 'text-slate-300 hover:text-white hover:bg-white/10 font-medium'
                  }`}
                >
                  <item.icon
                    className={`w-4 h-4 flex-shrink-0 transition-colors ${
                      active ? 'text-white' : 'text-slate-400 group-hover:text-white'
                    }`}
                  />
                  <span className="truncate">{item.label}</span>
                  {active && (
                    <ChevronRight className="w-4 h-4 ml-auto text-white/80 flex-shrink-0" />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Trocar Módulo (se possuir acesso a Orçamentos) */}
          {Boolean(user.acessoOrcamento) && (
            <div className="pt-4 mt-4 border-t border-slate-800/80">
              <Link
                href="/portal"
                className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-medium text-slate-300 hover:text-white hover:bg-white/10 transition border border-slate-800 hover:border-slate-700 bg-slate-900/60 group shadow-sm"
                title="Voltar ao Portal de Módulos RBT"
              >
                <div className="w-6 h-6 rounded-lg bg-red-600/20 border border-red-500/30 flex items-center justify-center flex-shrink-0 group-hover:bg-red-600/30 transition-colors">
                  <LayoutGrid className="w-3.5 h-3.5 text-red-400 group-hover:text-red-300" />
                </div>
                <span className="truncate">Trocar Módulo</span>
                <ChevronRight className="w-4 h-4 ml-auto text-slate-500 group-hover:text-white flex-shrink-0" />
              </Link>
            </div>
          )}
        </div>

        {/* Bottom Sidebar: User Profile & Actions */}
        <div className="p-3 border-t border-slate-800 bg-[#0f172a]/80 space-y-2">
          {/* User Card */}
          <div className="bg-white/5 p-2.5 rounded-xl border border-white/10 flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-red-600/20 border border-red-500/30 flex items-center justify-center flex-shrink-0">
              <UserIcon className="w-4 h-4 text-red-400" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-white truncate">
                {user.name || user.email}
              </p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[9px] font-bold border ${
                    roleColors[user.role] || 'bg-slate-700 text-slate-300'
                  }`}
                >
                  {roleLabels[user.role] || user.role}
                </span>
              </div>
            </div>
          </div>

          {/* Brand Manual Link */}
          <a
            href="/api/marca/pdf"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium text-slate-300 hover:text-white hover:bg-white/5 transition"
            title="Visualizar manual oficial da marca RBT"
          >
            <div className="flex items-center gap-2">
              <FileText className="w-3.5 h-3.5 text-red-400" />
              <span>Manual da Marca</span>
            </div>
            <ExternalLink className="w-3 h-3 text-slate-400" />
          </a>

          {/* Logout Button */}
          <LogoutButton
            showTextAlways
            fullWidth
            className="bg-red-500/10 hover:bg-red-600 hover:text-white border-red-500/20 text-red-300 font-semibold transition"
          />
        </div>
      </aside>

      {/* ========================================================= */}
      {/* 2. DRAWER MOBILE (SLIDE-OVER LATERAL ESQUERDA)            */}
      {/* ========================================================= */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          {/* Backdrop blur overlay */}
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
            onClick={() => setMobileOpen(false)}
          />

          {/* Drawer Panel */}
          <div className="relative w-72 max-w-[80vw] bg-[#111827] text-white flex flex-col justify-between shadow-2xl z-10 border-r border-slate-800">
            {/* Drawer Header */}
            <div>
              <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-[#0f172a]">
                <div className="bg-white rounded-lg px-2.5 py-1.5">
                  <RBTLogo size="sm" subtitle="ENGENHARIA" />
                </div>
                <button
                  type="button"
                  onClick={() => setMobileOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10"
                  aria-label="Fechar menu"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Navigation Links in Mobile Drawer */}
              <nav className="p-3 space-y-1">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-3 pb-2">
                  Menu de Navegação
                </div>
                {navItems.map((item) => {
                  const active = isLinkActive(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileOpen(false)}
                      className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm transition ${
                        active
                          ? 'bg-[#BA1A1A] text-white font-bold shadow-md shadow-red-950/40'
                          : 'text-slate-300 hover:text-white hover:bg-white/10 font-medium'
                      }`}
                    >
                      <item.icon
                        className={`w-4 h-4 flex-shrink-0 ${
                          active ? 'text-white' : 'text-slate-400'
                        }`}
                      />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}

                {Boolean(user.acessoOrcamento) && (
                  <div className="pt-3 mt-3 border-t border-slate-800/80">
                    <Link
                      href="/portal"
                      onClick={() => setMobileOpen(false)}
                      className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium text-slate-300 hover:text-white hover:bg-white/10 transition border border-slate-800 bg-slate-900/60"
                    >
                      <LayoutGrid className="w-4 h-4 text-red-400" />
                      <span>Trocar Módulo</span>
                    </Link>
                  </div>
                )}
              </nav>
            </div>

            {/* Drawer Footer */}
            <div className="p-4 border-t border-slate-800 bg-[#0f172a] space-y-2">
              <div className="bg-white/5 p-2.5 rounded-xl border border-white/10 flex items-center gap-2">
                <UserIcon className="w-4 h-4 text-slate-300" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-white truncate">
                    {user.name || user.email}
                  </p>
                  <span className="text-[10px] text-slate-400 block truncate">
                    {roleLabels[user.role] || user.role}
                  </span>
                </div>
              </div>

              <a
                href="/api/marca/pdf"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium text-slate-300 hover:text-white hover:bg-white/5 transition"
              >
                <div className="flex items-center gap-2">
                  <FileText className="w-3.5 h-3.5 text-red-400" />
                  <span>Manual da Marca</span>
                </div>
                <ExternalLink className="w-3 h-3 text-slate-400" />
              </a>

              <LogoutButton
                showTextAlways
                fullWidth
                className="bg-red-500/10 hover:bg-red-600 hover:text-white border-red-500/20 text-red-300 font-semibold"
              />
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 3. ÁREA DE CONTEÚDO PRINCIPAL (DESLOCADA MD:PL-64)        */}
      {/* ========================================================= */}
      <div className="md:pl-64 flex flex-col flex-1 min-h-screen">
        {/* Top Header Bar */}
        <header className="sticky top-0 z-30 bg-white border-b border-slate-200 shadow-sm h-16 flex items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Left Side: Mobile toggle or Desktop Context */}
          <div className="flex items-center gap-3">
            {/* Mobile Hamburger button */}
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="md:hidden p-2 rounded-xl text-slate-700 hover:text-[#BA1A1A] hover:bg-slate-100 transition border border-slate-200"
              aria-label="Abrir menu lateral"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Mobile Brand Logo */}
            <div className="md:hidden bg-slate-900 rounded-lg px-2.5 py-1 flex items-center justify-center">
              <RBTLogo size="sm" subtitle="ENGENHARIA" />
            </div>

            {/* Desktop Brand Context */}
            <div className="hidden md:flex items-center gap-2">
              <span className="text-sm font-bold text-slate-800">
                RBT Fundações
              </span>
              <span className="text-slate-300">/</span>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Controle de Produção & Medição Diária
              </span>
            </div>
          </div>

          {/* Right Side: Module Switcher, User profile badge & Quick Logout */}
          <div className="flex items-center gap-3">
            {Boolean(user.acessoOrcamento) && (
              <Link
                href="/portal"
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-700 hover:text-[#BA1A1A] hover:bg-slate-100 transition border border-slate-200"
                title="Voltar ao Portal de Módulos RBT"
              >
                <LayoutGrid className="w-3.5 h-3.5 text-[#BA1A1A]" />
                <span>Trocar Módulo</span>
              </Link>
            )}

            <div className="hidden sm:flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-full border border-slate-200 text-xs">
              <UserIcon className="w-3.5 h-3.5 text-slate-500" />
              <span className="font-semibold text-slate-700 truncate max-w-[140px]">
                {user.name || user.email}
              </span>
              <span
                className={`ml-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                  roleColors[user.role] || 'bg-slate-200 text-slate-800'
                }`}
              >
                {roleLabels[user.role] || user.role}
              </span>
            </div>

            <LogoutButton showTextAlways />
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
          {children}
        </main>

        {/* Footer */}
        <footer className="bg-white border-t border-slate-200 py-4 mt-auto">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-xs text-slate-500 flex flex-col items-center gap-2">
            <div className="flex items-center justify-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>
                RBT Fundações © 2026 — Sistema com Isolamento RBAC e Criptografia Ativa
              </span>
            </div>
            <div className="flex items-center justify-between w-full pt-2 border-t border-slate-100 text-xs">
              <a
                href="/api/marca/pdf"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-700 hover:text-red-800 hover:underline transition"
                title="Visualizar manual oficial da marca RBT em PDF"
              >
                <FileText className="w-3.5 h-3.5 text-red-600" />
                <span>Manual de Identidade da Marca RBT (PDF)</span>
              </a>
              <span className="text-slate-400 font-medium">
                Desenvolvido by Wellington Dantas
              </span>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}

export { MedicaoShell as DashboardShell };
