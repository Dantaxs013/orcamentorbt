import type { Metadata } from 'next';
import React from 'react';
import './globals.css';
import { ToastProvider } from '@/components/ui/toast-provider';

export const metadata: Metadata = {
  title: 'RBT Fundações — Gestão e Automação de Orçamentos',
  description: 'Sistema corporativo de gestão, análise técnica e automação de propostas comerciais da RBT Fundações & Engenharia.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body className="antialiased min-h-screen bg-slate-100 text-slate-900">
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
