'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';

interface LogoutButtonProps {
  showTextAlways?: boolean;
  fullWidth?: boolean;
  className?: string;
}

export function LogoutButton({
  showTextAlways = false,
  fullWidth = false,
  className = '',
}: LogoutButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleLogout = async () => {
    setLoading(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
      router.refresh();
    } catch {
      router.push('/login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={loading}
      className={`inline-flex items-center justify-center gap-2 px-3 py-2 text-xs rounded-xl font-medium transition ${
        fullWidth ? 'w-full' : ''
      } ${
        className ||
        'bg-slate-100 hover:bg-red-50 text-slate-600 hover:text-red-700 border border-slate-200'
      }`}
      title="Sair do sistema"
    >
      <LogOut className="w-3.5 h-3.5" />
      {(showTextAlways || fullWidth) && (
        <span>{loading ? 'Saindo...' : 'Sair'}</span>
      )}
    </button>
  );
}
