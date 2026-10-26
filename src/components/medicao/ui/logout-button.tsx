'use client';

import React, { useState } from 'react';
import { LogOut, Loader2 } from 'lucide-react';

interface LogoutButtonProps {
  className?: string;
  showTextAlways?: boolean;
  fullWidth?: boolean;
}

export function LogoutButton({
  className = '',
  showTextAlways = false,
  fullWidth = false,
}: LogoutButtonProps) {
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (isLoggingOut) return;

    setIsLoggingOut(true);

    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      });
    } catch {
      // Ignora erro de rede e força redirecionamento
    } finally {
      // Redireciona imediatamente para a tela de login
      window.location.href = '/login';
    }
  };

  return (
    <form action="/api/auth/logout" method="POST" className={fullWidth ? 'w-full' : ''}>
      <button
        type="submit"
        onClick={handleLogout}
        disabled={isLoggingOut}
        title="Encerrar sessão e voltar para o login"
        className={`flex items-center gap-1.5 text-xs text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-lg border border-white/10 transition disabled:opacity-50 ${
          fullWidth ? 'w-full justify-center py-2' : ''
        } ${className}`}
      >
        {isLoggingOut ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin text-red-400" />
        ) : (
          <LogOut className="w-3.5 h-3.5 text-red-400" />
        )}
        <span className={`${showTextAlways ? 'inline' : 'hidden sm:inline'} font-semibold`}>
          {isLoggingOut ? 'Saindo...' : 'Sair'}
        </span>
      </button>
    </form>
  );
}
