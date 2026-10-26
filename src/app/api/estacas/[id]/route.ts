import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/session';
import { prisma } from '@/lib/db';
import { isAdmin } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession();
  if (!session?.user) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }
  if (!session.user.acessoMedicao && !isAdmin(session.user.role)) {
    return NextResponse.json({ error: 'Acesso negado ao módulo de Medição' }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const { nome, perfil, comprimento, obraId, status, observacao } = body;

  const data: any = {};
  if (nome !== undefined) data.nome = String(nome).trim();
  if (perfil !== undefined) data.perfil = String(perfil).trim();
  if (comprimento !== undefined) {
    const num = Number(comprimento);
    if (!isNaN(num) && num > 0) data.comprimento = num;
  }
  if (obraId !== undefined) {
    data.obraId = obraId && String(obraId).trim() !== '' ? String(obraId).trim() : null;
  }
  if (status !== undefined) data.status = String(status).trim();
  if (observacao !== undefined) data.observacao = String(observacao).trim();

  try {
    const estacaAtualizada = await prisma.estacaPrincipal.update({
      where: { id: params.id },
      data,
      include: {
        obra: {
          select: {
            id: true,
            nome: true,
            codigo: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      estaca: {
        id: estacaAtualizada.id,
        obraId: estacaAtualizada.obraId,
        obraNome: estacaAtualizada.obra?.nome || null,
        obraCodigo: estacaAtualizada.obra?.codigo || null,
        nome: estacaAtualizada.nome,
        perfil: estacaAtualizada.perfil,
        comprimento: Number(estacaAtualizada.comprimento),
        status: estacaAtualizada.status,
        observacao: estacaAtualizada.observacao,
      },
    });
  } catch (err: any) {
    if (err?.code === 'P2025') {
      return NextResponse.json({ error: 'Estaca não encontrada.' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Erro ao atualizar estaca.' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession();
  if (!session?.user) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }
  if (!session.user.acessoMedicao && !isAdmin(session.user.role)) {
    return NextResponse.json({ error: 'Acesso negado ao módulo de Medição' }, { status: 403 });
  }

  try {
    await prisma.estacaPrincipal.delete({
      where: { id: params.id },
    });
    return NextResponse.json({ success: true, message: 'Estaca excluída com sucesso.' });
  } catch (err: any) {
    if (err?.code === 'P2025') {
      return NextResponse.json({ error: 'Estaca não encontrada.' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Erro ao excluir estaca.' }, { status: 500 });
  }
}
