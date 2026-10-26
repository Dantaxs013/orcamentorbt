import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/session';
import { prisma } from '@/lib/db';
import { isAdmin } from '@/lib/auth';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const obraSchema = z.object({
  codigo: z.string().min(1),
  nome: z.string().min(1),
  cliente: z.string().min(1),
  endereco: z.string().optional(),
  cidade: z.string().optional(),
  estado: z.string().optional(),
  engenheiroResponsavelId: z.string().optional(),
  dataInicio: z.string().optional(),
  dataPrevisaoFim: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const session = await getServerSession();
  if (!session?.user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  if (!session.user.acessoMedicao && !isAdmin(session.user.role)) {
    return NextResponse.json({ error: 'Acesso negado ao módulo de Medição' }, { status: 403 });
  }
  if (!['ENGENHEIRO', 'ADMINISTRADOR', 'ADMIN'].includes(session.user.role)) {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
  }

  const obras = await prisma.obra.findMany({
    where: session.user.role === 'ENGENHEIRO'
      ? { engenheiroResponsavelId: session.user.id }
      : {},
    include: {
      engenheiroResponsavel: { select: { id: true, name: true, email: true } },
      _count: { select: { relatoriosDiarios: true, contratos: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json({ obras });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession();
  if (!session?.user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  if (!session.user.acessoMedicao && !isAdmin(session.user.role)) {
    return NextResponse.json({ error: 'Acesso negado ao módulo de Medição' }, { status: 403 });
  }
  if (!['ENGENHEIRO', 'ADMINISTRADOR', 'ADMIN'].includes(session.user.role)) {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
  }

  const body = await req.json();
  const parsed = obraSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const engId =
    parsed.data.engenheiroResponsavelId ||
    (session.user.role === 'ENGENHEIRO' ? session.user.id : null);

  const obra = await prisma.obra.create({
    data: {
      ...parsed.data,
      engenheiroResponsavelId: engId,
      dataInicio: parsed.data.dataInicio ? new Date(parsed.data.dataInicio) : null,
      dataPrevisaoFim: parsed.data.dataPrevisaoFim ? new Date(parsed.data.dataPrevisaoFim) : null,
    },
  });

  return NextResponse.json({ obra }, { status: 201 });
}
