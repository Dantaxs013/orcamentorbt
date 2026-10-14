import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from '@/lib/session';

interface RouteContext {
  params: {
    id: string;
  };
}

export async function PATCH(req: NextRequest, { params }: RouteContext) {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: 'Acesso restrito. Faça login.' }, { status: 401 });
  }

  try {
    const { id } = params;
    const { status, motivo } = await req.json();

    if (!status) {
      return NextResponse.json({ error: 'Status não informado.' }, { status: 400 });
    }

    const orcamento = await prisma.orcamento.findUnique({
      where: { id },
    });

    if (!orcamento) {
      return NextResponse.json({ error: 'Orçamento não encontrado.' }, { status: 404 });
    }

    const statusAnterior = orcamento.status;

    const atualizado = await prisma.orcamento.update({
      where: { id },
      data: {
        status,
        orcamentistaId: session.user.id,
      },
    });

    await prisma.statusLog.create({
      data: {
        orcamentoId: id,
        statusAnterior,
        statusNovo: status,
        motivo: motivo || `Status alterado manualmente para ${status}.`,
        usuarioId: session.user.id,
        usuarioNome: session.user.name,
      },
    });

    return NextResponse.json({
      success: true,
      orcamento: atualizado,
    });
  } catch (error) {
    console.error('Erro ao atualizar status:', error);
    return NextResponse.json(
      { error: 'Erro interno ao atualizar status.' },
      { status: 500 }
    );
  }
}
