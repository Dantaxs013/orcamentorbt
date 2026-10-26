import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/session';
import { prisma } from '@/lib/db';
import { isAdmin } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const session = await getServerSession();
  if (!session?.user) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }
  if (!session.user.acessoMedicao && !isAdmin(session.user.role)) {
    return NextResponse.json({ error: 'Acesso negado ao módulo de Medição' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const obraId = searchParams.get('obraId');

  const where: any = { ativo: true };
  if (obraId) {
    where.obraId = obraId;
  }

  const estacas = await prisma.estacaPrincipal.findMany({
    where,
    include: {
      obra: {
        select: {
          id: true,
          nome: true,
          codigo: true,
        },
      },
    },
    orderBy: { nome: 'asc' },
  });

  return NextResponse.json({
    success: true,
    estacas: estacas.map((e) => ({
      id: e.id,
      obraId: e.obraId,
      obraNome: e.obra?.nome || null,
      obraCodigo: e.obra?.codigo || null,
      nome: e.nome,
      perfil: e.perfil,
      comprimento: Number(e.comprimento) || 0,
      status: e.status,
      observacao: e.observacao,
      createdAt: e.createdAt,
    })),
  });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession();
  if (!session?.user) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }
  if (!session.user.acessoMedicao && !isAdmin(session.user.role)) {
    return NextResponse.json({ error: 'Acesso negado ao módulo de Medição' }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const { nome, perfil, comprimento, obraId, observacao } = body;

  if (!nome || typeof nome !== 'string' || nome.trim() === '') {
    return NextResponse.json(
      { error: 'O nome da estaca é obrigatório (ex: E-01).' },
      { status: 400 }
    );
  }

  if (!perfil || typeof perfil !== 'string' || perfil.trim() === '') {
    return NextResponse.json(
      { error: 'O perfil / emenda é obrigatório (ex: W150x22.5).' },
      { status: 400 }
    );
  }

  const comprimentoNum = Number(comprimento);
  if (isNaN(comprimentoNum) || comprimentoNum <= 0) {
    return NextResponse.json(
      { error: 'Informe um comprimento válido em metros (maior que zero).' },
      { status: 400 }
    );
  }

  const novaEstaca = await prisma.estacaPrincipal.create({
    data: {
      nome: nome.trim(),
      perfil: perfil.trim(),
      comprimento: comprimentoNum,
      obraId: obraId && typeof obraId === 'string' && obraId.trim() !== '' ? obraId.trim() : null,
      observacao: observacao && typeof observacao === 'string' ? observacao.trim() : null,
      status: 'PENDENTE',
      ativo: true,
    },
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
      id: novaEstaca.id,
      obraId: novaEstaca.obraId,
      obraNome: novaEstaca.obra?.nome || null,
      obraCodigo: novaEstaca.obra?.codigo || null,
      nome: novaEstaca.nome,
      perfil: novaEstaca.perfil,
      comprimento: Number(novaEstaca.comprimento),
      status: novaEstaca.status,
      observacao: novaEstaca.observacao,
    },
  });
}
