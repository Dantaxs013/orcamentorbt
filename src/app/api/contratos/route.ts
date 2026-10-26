import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/session';
import { prisma } from '@/lib/db';
import { isAdmin } from '@/lib/auth';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const itemSchema = z.object({
  codigoItem: z.string().min(1),
  descricao: z.string().min(1),
  unidadeMedida: z.string().min(1),
  quantidadeContratada: z.number().min(0),
  valorUnitario: z.number().min(0),
  ordem: z.number().optional(),
});

const contratoSchema = z.object({
  obraId: z.string().min(1),
  numeroContrato: z.string().min(1),
  descricao: z.string().optional(),
  dataContrato: z.string(),
  valorTotalContratual: z.number().min(0),
  retencaoINSS: z.number().optional(),
  baseMaoDeObra: z.number().optional(),
  retencaoISS: z.number().optional(),
  retencaoIRRF: z.number().optional(),
  retencaoCSLL: z.number().optional(),
  retencaoPIS: z.number().optional(),
  retencaoCOFINS: z.number().optional(),
  outrasDeducoesPerc: z.number().optional(),
  observacoes: z.string().optional(),
  itens: z.array(itemSchema).optional(),
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

  const { searchParams } = new URL(req.url);
  const obraId = searchParams.get('obraId');

  const contratos = await prisma.contrato.findMany({
    where: obraId ? { obraId } : {},
    include: {
      obra: { select: { nome: true, codigo: true } },
      itens: { orderBy: { ordem: 'asc' } },
      _count: { select: { medicoes: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json({ contratos });
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
  const parsed = contratoSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { itens, ...contratoData } = parsed.data;

  const contrato = await prisma.contrato.create({
    data: {
      ...contratoData,
      dataContrato: new Date(contratoData.dataContrato),
      itens: itens && itens.length > 0
        ? {
            create: itens.map((item, idx) => ({
              ...item,
              valorTotal: item.quantidadeContratada * item.valorUnitario,
              ordem: item.ordem ?? idx,
            })),
          }
        : undefined,
    },
    include: { itens: true },
  });

  return NextResponse.json({ contrato }, { status: 201 });
}
