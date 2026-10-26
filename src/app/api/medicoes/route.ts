import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/session';
import { prisma } from '@/lib/db';
import { isAdmin } from '@/lib/auth';
import { notifyGestorMedicaoSubmetida } from '@/lib/email';

export const dynamic = 'force-dynamic';

function calcularRetencoes(valorBruto: number, contrato: {
  retencaoINSS: unknown; baseMaoDeObra: unknown; retencaoISS: unknown;
  retencaoIRRF: unknown; retencaoCSLL: unknown; retencaoPIS: unknown;
  retencaoCOFINS: unknown; outrasDeducoesPerc: unknown;
}) {
  const toNum = (v: unknown) => parseFloat(String(v) || '0');
  const inssPerc = toNum(contrato.retencaoINSS);
  const basePerc = toNum(contrato.baseMaoDeObra);
  const issPerc = toNum(contrato.retencaoISS);
  const irrfPerc = toNum(contrato.retencaoIRRF);
  const csllPerc = toNum(contrato.retencaoCSLL);
  const pisPerc = toNum(contrato.retencaoPIS);
  const cofinsPerc = toNum(contrato.retencaoCOFINS);
  const outrasPerc = toNum(contrato.outrasDeducoesPerc);

  const baseMO = valorBruto * (basePerc / 100);
  const inss = baseMO * (inssPerc / 100);
  const iss = valorBruto * (issPerc / 100);
  const irrf = valorBruto * (irrfPerc / 100);
  const csll = valorBruto * (csllPerc / 100);
  const pis = valorBruto * (pisPerc / 100);
  const cofins = valorBruto * (cofinsPerc / 100);
  const outras = valorBruto * (outrasPerc / 100);
  const total = inss + iss + irrf + csll + pis + cofins + outras;
  return { inss, iss, irrf, csll, pis, cofins, outras, total, liquido: valorBruto - total };
}

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
  const contratoId = searchParams.get('contratoId');

  const medicoes = await prisma.medicao.findMany({
    where: {
      ...(obraId ? { obraId } : {}),
      ...(contratoId ? { contratoId } : {}),
    },
    include: {
      obra: { select: { nome: true, codigo: true } },
      contrato: { select: { numeroContrato: true } },
      engenheiro: { select: { name: true } },
    },
    orderBy: { numeroMedicao: 'desc' },
  });

  return NextResponse.json({ medicoes });
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
  const { obraId, contratoId, periodoInicio, periodoFim } = body;

  if (!obraId || !contratoId || !periodoInicio || !periodoFim) {
    return NextResponse.json({ error: 'Campos obrigatórios faltando' }, { status: 400 });
  }

  const contrato = await prisma.contrato.findUnique({
    where: { id: contratoId },
    include: { itens: { orderBy: { ordem: 'asc' } } },
  });
  if (!contrato) return NextResponse.json({ error: 'Contrato não encontrado' }, { status: 404 });

  const ultimaMedicao = await prisma.medicao.findFirst({
    where: { contratoId },
    orderBy: { numeroMedicao: 'desc' },
  });
  const numeroMedicao = (ultimaMedicao?.numeroMedicao ?? 0) + 1;

  // Busca acumulados anteriores por item
  const itensAnteriores = await prisma.itemMedicao.findMany({
    where: {
      medicao: { contratoId },
      itemContrato: { contratoId },
    },
    include: { itemContrato: true },
  });

  const acumuladoMap = new Map<string, number>();
  for (const im of itensAnteriores) {
    const cur = acumuladoMap.get(im.itemContratoId) ?? 0;
    acumuladoMap.set(im.itemContratoId, cur + parseFloat(String(im.quantidadePeriodo)));
  }

  const medicao = await prisma.medicao.create({
    data: {
      obraId,
      contratoId,
      engenheiroId: session.user.id,
      numeroMedicao,
      periodoInicio: new Date(periodoInicio),
      periodoFim: new Date(periodoFim),
      valorBruto: 0,
      totalDeducoes: 0,
      valorLiquido: 0,
      itensMedicao: {
        create: contrato.itens.map((item) => {
          const qtdAnterior = acumuladoMap.get(item.id) ?? 0;
          const qtdAcumulada = qtdAnterior;
          const qtdContratada = parseFloat(String(item.quantidadeContratada));
          const saldo = qtdContratada - qtdAcumulada;
          const valUnit = parseFloat(String(item.valorUnitario));
          return {
            itemContratoId: item.id,
            quantidadeAnterior: qtdAnterior,
            quantidadePeriodo: 0,
            quantidadeAcumulada: qtdAcumulada,
            saldoQuantidade: saldo,
            valorUnitario: valUnit,
            valorPeriodo: 0,
            valorAcumulado: qtdAcumulada * valUnit,
            saldoValor: saldo * valUnit,
          };
        }),
      },
    },
    include: { itensMedicao: { include: { itemContrato: true } } },
  });

  return NextResponse.json({ medicao }, { status: 201 });
}
