import { redirect } from 'next/navigation';
import { getServerSession } from '@/lib/session';
import { prisma } from '@/lib/db';
import { GestaoUsuariosClient } from '@/components/medicao/admin/gestao-usuarios-client';

export const dynamic = 'force-dynamic';

export default async function UsuariosPage() {
  const session = await getServerSession();
  if (!session?.user || !['ADMINISTRADOR', 'ADMIN'].includes(session.user.role)) {
    redirect('/medicao');
  }

  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      ativo: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  return (
    <GestaoUsuariosClient
      initialUsers={users.map((u) => ({
        ...u,
        createdAt: u.createdAt.toISOString(),
      }))}
      currentUserId={session.user.id}
    />
  );
}
