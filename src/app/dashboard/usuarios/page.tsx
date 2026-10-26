import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { getServerSession } from '@/lib/session';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { UsuariosClient } from '@/components/usuarios/usuarios-client';

export default async function UsuariosPage() {
  const session = await getServerSession();

  if (!session) {
    redirect('/login');
  }

  // Lista todos os usuários cadastrados com contagem de orçamentos vinculados
  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      ativo: true,
      acessoOrcamento: true,
      acessoMedicao: true,
      createdAt: true,
      _count: {
        select: {
          orcamentos: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return (
    <DashboardShell user={session.user}>
      <UsuariosClient initialUsers={users} currentUser={session.user} />
    </DashboardShell>
  );
}
