import React from 'react';
import { redirect } from 'next/navigation';
import { getServerSession } from '@/lib/session';
import { MedicaoShell } from '@/components/medicao/layout/medicao-shell';
import { isAdmin } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function MedicaoLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession();
  if (!session?.user) {
    redirect('/login');
  }

  // Guard: User must have acessoMedicao or be ADMIN/ADMINISTRADOR
  if (!session.user.acessoMedicao && !isAdmin(session.user.role)) {
    redirect('/portal?unauthorized=medicao');
  }

  return (
    <MedicaoShell user={session.user}>
      {children}
    </MedicaoShell>
  );
}
