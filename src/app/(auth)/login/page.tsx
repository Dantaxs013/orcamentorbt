'use client';

import React, { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Shield, Lock, Mail, AlertTriangle, ArrowRight, CheckCircle2 } from 'lucide-react';
import { RBTLogo } from '@/components/ui/rbt-logo';

function LoginFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect') || '/portal';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMessage('Por favor, preencha o e-mail e a senha.');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setErrorMessage(data.error || 'Credenciais inválidas. Verifique seu e-mail e senha.');
        setIsLoading(false);
        return;
      }

      router.push(redirect !== '/login' ? redirect : '/portal');
      router.refresh();
    } catch {
      setErrorMessage('Erro de conexão com o servidor. Tente novamente.');
      setIsLoading(false);
    }
  };


  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-zinc-950 via-zinc-900 to-black p-4 font-sans">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200">
        {/* Header with Official RBT Branding */}
        <div className="bg-[#111827] p-7 text-center relative overflow-hidden border-b-2 border-[#BA1A1A]">
          <div className="absolute -right-8 -top-8 w-32 h-32 bg-red-600/10 rounded-full blur-2xl" />

          {/* Logo Oficial RBT em Card Branco com escrita Vermelha e Preta */}
          <div className="inline-block bg-white rounded-2xl p-3 shadow-lg border border-slate-200/80 mb-3 transform hover:scale-[1.02] transition-transform">
            <RBTLogo size="lg" subtitle="FUNDAÇÕES" />
          </div>

          <h1 className="text-lg font-bold text-white tracking-tight">
            Gestão & Automação de Orçamentos
          </h1>
          <p className="text-xs text-slate-400 font-medium tracking-wide uppercase mt-1">
            Plataforma Corporativa de Engenharia e Propostas
          </p>
        </div>

        {/* Form Body */}
        <div className="p-8">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-slate-800">Acesso Restrito</h2>
            <p className="text-sm text-slate-500">Informe suas credenciais corporativas</p>
          </div>

          {errorMessage && (
            <div className="mb-6 p-4 rounded-xl flex items-start gap-3 text-sm bg-red-50 border border-red-200 text-red-800">
              <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5 text-red-600" />
              <div className="flex-1">
                <p className="font-semibold">Falha na Autenticação</p>
                <p className="mt-1">{errorMessage}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                E-mail Corporativo
              </label>
              <div className="relative">
                <Mail className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  name="rbt_login_email"
                  id="rbt_login_email"
                  autoComplete="off"
                  data-lpignore="true"
                  data-form-type="other"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="usuario@rbtfundacoes.com.br"
                  required
                  disabled={isLoading}
                  className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#BA1A1A] focus:border-transparent transition-all disabled:opacity-50"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Senha
              </label>
              <div className="relative">
                <Lock className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="password"
                  name="rbt_login_password"
                  id="rbt_login_password"
                  autoComplete="new-password"
                  data-lpignore="true"
                  data-form-type="other"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  required
                  disabled={isLoading}
                  className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#BA1A1A] focus:border-transparent transition-all disabled:opacity-50"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 py-3.5 px-4 bg-[#BA1A1A] hover:bg-[#991B1B] text-white font-bold text-sm rounded-xl shadow-lg shadow-red-950/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed group cursor-pointer"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>Entrar no Sistema</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Footer Security Badges */}
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-100 flex flex-col items-center gap-2 text-xs text-slate-500">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-1.5">
              <Shield className="w-4 h-4 text-emerald-600" />
              <span>Sessão Criptografada</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-blue-600" />
              <span>Proteção RBAC</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <React.Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-slate-900" />}>
      <LoginFormContent />
    </React.Suspense>
  );
}
