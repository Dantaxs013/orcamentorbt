import { notFound, redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { getServerSession } from '@/lib/session';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { DetalhesOrcamentoClient } from '@/components/orcamentos/detalhes-orcamento-client';

interface PageProps {
  params: {
    id: string;
  };
}

export default async function DetalhesOrcamentoPage({ params }: PageProps) {
  const session = await getServerSession();

  if (!session) {
    redirect('/login');
  }

  const { id } = params;

  const orcamento = await prisma.orcamento.findUnique({
    where: { id },
    include: {
      lead: true,
      orcamentista: true,
      magicLink: true,
      respostaFormulario: true,
      propostaComercial: true,
      logs: {
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  if (!orcamento) {
    notFound();
  }

  // Buscar lista de usuários (orçamentistas e gestores) para seleção de responsável
  const usuariosDisponiveis = await prisma.user.findMany({
    where: { ativo: true },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
    },
    orderBy: { name: 'asc' },
  });

  return (
    <DashboardShell user={session.user}>
      <DetalhesOrcamentoClient
        orcamento={orcamento}
        currentUser={session.user}
        usuariosDisponiveis={usuariosDisponiveis}
      />
    </DashboardShell>
  );
}
