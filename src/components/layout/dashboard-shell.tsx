'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { RBTLogo } from '@/components/ui/rbt-logo';
import { LogoutButton } from '@/components/ui/logout-button';
import {
  LayoutDashboard,
  PlusCircle,
  FileSpreadsheet,
  CheckCircle2,
  Menu,
  X,
  ShieldCheck,
  User as UserIcon,
  ChevronRight,
  Users,
} from 'lucide-react';

interface UserSession {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
}

const navItems: NavItem[] = [
  { href: '/dashboard', label: 'Orçamentos', icon: LayoutDashboard },
  { href: '/dashboard/usuarios', label: 'Equipe & Usuários', icon: Users },
];

const roleColors: Record<string, string> = {
  ADMIN: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
  ORCAMENTISTA: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
};

const roleLabels: Record<string, string> = {
  ADMIN: 'Gestor / Admin',
  ORCAMENTISTA: 'Orçamentista',
};

export function DashboardShell({
  user,
  children,
}: {
  user: UserSession;
  children: React.ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  const isLinkActive = (href: string) => {
    if (href === '/dashboard') {
      return pathname === '/dashboard';
    }
    return pathname.startsWith(href);
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans">
      {/* ========================================================= */}
      {/* 1. SIDEBAR FIXA DO LADO ESQUERDO (DESKTOP)                */}
      {/* ========================================================= */}
      <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 z-40 bg-[#111827] border-r border-slate-800 text-white shadow-xl">
        {/* Brand Header */}
        <div className="p-4 border-b border-slate-800 bg-[#0f172a]">
          <Link href="/dashboard" className="flex flex-col items-center group">
            <div className="bg-white rounded-xl px-4 py-2.5 shadow-md border border-white/20 flex items-center justify-center group-hover:scale-105 transition-transform w-full">
              <RBTLogo size="md" subtitle="FUNDAÇÕES" />
            </div>
            <div className="mt-2 text-center">
              <span className="text-[11px] font-bold tracking-wider text-slate-300 uppercase block">
                Gestão & Automação de Propostas
              </span>
              <span className="text-[10px] text-slate-400 font-mono block">
                RBT Fundações & Engenharia
              </span>
            </div>
          </Link>
          <div className="h-0.5 bg-[#BA1A1A] w-12 mx-auto mt-3 rounded-full" />
        </div>

        {/* Menu Navigation Links */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-3 pb-2">
            Navegação Principal
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
            <div>
              <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-[#0f172a]">
                <div className="bg-white rounded-lg px-2.5 py-1.5">
                  <RBTLogo size="sm" subtitle="FUNDAÇÕES" />
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

              <nav className="p-3 space-y-1">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-3 pb-2">
                  Navegação
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
              </nav>
            </div>

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
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="md:hidden p-2 rounded-xl text-slate-700 hover:text-[#BA1A1A] hover:bg-slate-100 transition border border-slate-200"
              aria-label="Abrir menu lateral"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div className="md:hidden bg-slate-900 rounded-lg px-2.5 py-1 flex items-center justify-center">
              <RBTLogo size="sm" subtitle="FUNDAÇÕES" />
            </div>

            <div className="hidden md:flex items-center gap-2">
              <span className="text-sm font-bold text-slate-900">
                RBT Fundações & Engenharia
              </span>
              <span className="text-slate-300">/</span>
              <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                Painel Comercial
              </span>
            </div>
          </div>

          {/* Right Side: User profile badge & Quick Logout */}
          <div className="flex items-center gap-3">
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
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-2 text-center sm:text-left">
            <p className="font-medium text-slate-600">
              RBT Fundações © 2026
            </p>
            <p className="text-[11px] text-slate-400">
              Desenvolvido por <strong className="text-slate-600 font-semibold">Wellington Dantas</strong>
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
}
