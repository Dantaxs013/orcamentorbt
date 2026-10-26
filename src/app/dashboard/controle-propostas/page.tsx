import { redirect } from 'next/navigation';
import { getServerSession } from '@/lib/session';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { ControlePropostasClient } from './controle-propostas-client';

export const dynamic = 'force-dynamic';

export default async function ControlePropostasPage() {
  const session = await getServerSession();

  if (!session) {
    redirect('/login');
  }

  return (
    <DashboardShell user={session.user}>
      <ControlePropostasClient user={session.user} />
    </DashboardShell>
  );
}
