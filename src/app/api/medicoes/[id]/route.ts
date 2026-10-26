import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/session';
import { prisma } from '@/lib/db';
import { isAdmin } from '@/lib/auth';
import { notifyGestorMedicaoSubmetida } from '@/lib/email';

export const dynamic = 'force-dynamic';

function toNum(v: unknown): number { return parseFloat(String(v ?? '0')) || 0; }

function recalcularMedicao(
  itensMedicao: Array<{ quantidadePeriodo: number; quantidadeAnterior: number; valorUnitario: number; itemContrato: { quantidadeContratada: unknown } }>,
  contrato: { retencaoINSS: unknown; baseMaoDeObra: unknown; retencaoISS: unknown; retencaoIRRF: unknown; retencaoCSLL: unknown; retencaoPIS: unknown; retencaoCOFINS: unknown; outrasDeducoesPerc: unknown }
) {
  let valorBruto = 0;
  const itensCalc = itensMedicao.map((im) => {
    const qtdAnterior = toNum(im.quantidadeAnterior);
    const qtdPeriodo = toNum(im.quantidadePeriodo);
    const qtdAcumulada = qtdAnterior + qtdPeriodo;
    const qtdContratada = toNum(im.itemContrato.quantidadeContratada);
    const saldoQtd = qtdContratada - qtdAcumulada;
    const valUnit = toNum(im.valorUnitario);
    const valPeriodo = qtdPeriodo * valUnit;
    const valAcumulado = qtdAcumulada * valUnit;
    const saldoVal = (qtdContratada * valUnit) - valAcumulado;
    valorBruto += valPeriodo;
    return { qtdAcumulada, saldoQtd, valPeriodo, valAcumulado, saldoVal };
  });

  const baseMO = valorBruto * (toNum(contrato.baseMaoDeObra) / 100);
  const inss = baseMO * (toNum(contrato.retencaoINSS) / 100);
  const iss = valorBruto * (toNum(contrato.retencaoISS) / 100);
  const irrf = valorBruto * (toNum(contrato.retencaoIRRF) / 100);
  const csll = valorBruto * (toNum(contrato.retencaoCSLL) / 100);
  const pis = valorBruto * (toNum(contrato.retencaoPIS) / 100);
  const cofins = valorBruto * (toNum(contrato.retencaoCOFINS) / 100);
  const outras = valorBruto * (toNum(contrato.outrasDeducoesPerc) / 100);
  const totalDeducoes = inss + iss + irrf + csll + pis + cofins + outras;
  const valorLiquido = valorBruto - totalDeducoes;

  return { valorBruto, totalDeducoes, valorLiquido, inss, iss, irrf, csll, pis, cofins, outras, itensCalc };
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession();
  if (!session?.user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  if (!session.user.acessoMedicao && !isAdmin(session.user.role)) {
    return NextResponse.json({ error: 'Acesso negado ao módulo de Medição' }, { status: 403 });
  }
  if (!['ENGENHEIRO', 'ADMINISTRADOR', 'ADMIN'].includes(session.user.role)) {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
  }

  const medicao = await prisma.medicao.findUnique({
    where: { id: params.id },
    include: {
      obra: true,
      contrato: true,
      engenheiro: { select: { name: true, email: true } },
      gestorAprovador: { select: { name: true } },
      itensMedicao: {
        include: { itemContrato: { select: { codigoItem: true, descricao: true, unidadeMedida: true, quantidadeContratada: true, valorUnitario: true, valorTotal: true } } },
        orderBy: { itemContrato: { ordem: 'asc' } },
      },
    },
  });

  if (!medicao) return NextResponse.json({ error: 'Medição não encontrada' }, { status: 404 });
  return NextResponse.json({ medicao });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession();
  if (!session?.user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  if (!session.user.acessoMedicao && !isAdmin(session.user.role)) {
    return NextResponse.json({ error: 'Acesso negado ao módulo de Medição' }, { status: 403 });
  }
  if (!['ENGENHEIRO', 'ADMINISTRADOR', 'ADMIN'].includes(session.user.role)) {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
  }

  const body = await req.json();
  const { itens } = body as { itens: Array<{ id: string; quantidadePeriodo: number }> };

  const medicao = await prisma.medicao.findUnique({
    where: { id: params.id },
    include: {
      contrato: true,
      itensMedicao: { include: { itemContrato: true } },
    },
  });
  if (!medicao) return NextResponse.json({ error: 'Medição não encontrada' }, { status: 404 });

  // Atualiza quantidades
  for (const item of itens) {
    await prisma.itemMedicao.update({
      where: { id: item.id },
      data: { quantidadePeriodo: item.quantidadePeriodo },
    });
  }

  // Busca estado atualizado
  const medicaoAtualizada = await prisma.medicao.findUnique({
    where: { id: params.id },
    include: { contrato: true, itensMedicao: { include: { itemContrato: true } } },
  });
  if (!medicaoAtualizada) return NextResponse.json({ error: 'Erro ao atualizar' }, { status: 500 });

  const calc = recalcularMedicao(
    medicaoAtualizada.itensMedicao.map(im => ({
      quantidadePeriodo: toNum(im.quantidadePeriodo),
      quantidadeAnterior: toNum(im.quantidadeAnterior),
      valorUnitario: toNum(im.valorUnitario),
      itemContrato: im.itemContrato,
    })),
    medicaoAtualizada.contrato
  );

  // Atualiza itens calculados
  for (let i = 0; i < medicaoAtualizada.itensMedicao.length; i++) {
    const im = medicaoAtualizada.itensMedicao[i];
    const c = calc.itensCalc[i];
    await prisma.itemMedicao.update({
      where: { id: im.id },
      data: {
        quantidadeAcumulada: c.qtdAcumulada,
        saldoQuantidade: c.saldoQtd,
        valorPeriodo: c.valPeriodo,
        valorAcumulado: c.valAcumulado,
        saldoValor: c.saldoVal,
      },
    });
  }

  const medicaoFinal = await prisma.medicao.update({
    where: { id: params.id },
    data: {
      valorBruto: calc.valorBruto,
      retencaoINSSValor: calc.inss,
      retencaoISSValor: calc.iss,
      retencaoIRRFValor: calc.irrf,
      retencaoCSLLValor: calc.csll,
      retencaoPISValor: calc.pis,
      retencaoCOFINSValor: calc.cofins,
      outrasDeducoesValor: calc.outras,
      totalDeducoes: calc.totalDeducoes,
      valorLiquido: calc.valorLiquido,
    },
  });

  return NextResponse.json({ medicao: medicaoFinal });
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession();
  if (!session?.user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  if (!session.user.acessoMedicao && !isAdmin(session.user.role)) {
    return NextResponse.json({ error: 'Acesso negado ao módulo de Medição' }, { status: 403 });
  }
  if (!['ENGENHEIRO', 'ADMINISTRADOR', 'ADMIN'].includes(session.user.role)) {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
  }

  const medicao = await prisma.medicao.update({
    where: { id: params.id },
    data: { status: 'SUBMETIDA_GESTAO' },
    include: {
      obra: true,
      engenheiro: { select: { name: true } },
    },
  });

  // Notificar gestores/admins
  const gestores = await prisma.user.findMany({
    where: { role: { in: ['ADMINISTRADOR', 'ADMIN'] }, ativo: true },
    select: { email: true },
  });

  for (const gestor of gestores) {
    await notifyGestorMedicaoSubmetida(gestor.email, {
      obra: medicao.obra.nome,
      numero: medicao.numeroMedicao,
      valorLiquido: toNum(medicao.valorLiquido),
      engenheiro: medicao.engenheiro.name,
      medicaoId: medicao.id,
    });
  }

  return NextResponse.json({ ok: true, medicao });
}
