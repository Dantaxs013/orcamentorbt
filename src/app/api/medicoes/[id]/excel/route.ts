import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/session';
import { prisma } from '@/lib/db';
import { isAdmin } from '@/lib/auth';
import ExcelJS from 'exceljs';

export const dynamic = 'force-dynamic';

function toNum(v: unknown): number { return parseFloat(String(v ?? '0')) || 0; }

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
      engenheiro: { select: { name: true } },
      itensMedicao: {
        include: { itemContrato: true },
        orderBy: { itemContrato: { ordem: 'asc' } },
      },
    },
  });

  if (!medicao) return NextResponse.json({ error: 'Medição não encontrada' }, { status: 404 });

  const wb = new ExcelJS.Workbook();
  wb.creator = 'RBT Fundações';
  const ws = wb.addWorksheet('Boletim de Medição');

  // Larguras das colunas
  ws.columns = [
    { key: 'A', width: 6 },   // Item
    { key: 'B', width: 30 },  // Descrição
    { key: 'C', width: 6 },   // UN
    { key: 'D', width: 10 },  // Qtd Contratada
    { key: 'E', width: 12 },  // Preço Unit
    { key: 'F', width: 14 },  // Preço Total
    { key: 'G', width: 10 },  // Qtd Anterior
    { key: 'H', width: 10 },  // Qtd Atual
    { key: 'I', width: 10 },  // Qtd Acumulada
    { key: 'J', width: 10 },  // Qtd Saldo
    { key: 'K', width: 14 },  // Val Anterior
    { key: 'L', width: 14 },  // Val Atual
    { key: 'M', width: 14 },  // Val Acumulado
    { key: 'N', width: 14 },  // Val Saldo
  ];

  const RED = 'FFBA1A1A';
  const NAVY = 'FF111827'; // Preto Grafite Corporativo RBT
  const WHITE = 'FFFFFFFF';
  const LGRAY = 'FFF5F5F5';
  const DGRAY = 'FFE0E0E0';

  const boldWhite = { bold: true, color: { argb: WHITE } };
  const boldRed = { bold: true, color: { argb: RED } };
  const moneyFmt = 'R$ #,##0.00';
  const numFmt = '#,##0.000';
  const allBorders = {
    top: { style: 'thin' as const }, bottom: { style: 'thin' as const },
    left: { style: 'thin' as const }, right: { style: 'thin' as const },
    diagonal: {},
  };

  // Row 1: Título
  ws.mergeCells('A1:N1');
  const r1 = ws.getRow(1);
  r1.height = 22;
  const c1 = ws.getCell('A1');
  c1.value = 'GESTÃO DE CONTRATOS — BOLETIM DE MEDIÇÃO';
  c1.font = { ...boldWhite, size: 13 };
  c1.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY } };
  c1.alignment = { horizontal: 'center', vertical: 'middle' };

  // Row 2: Contratante
  ws.mergeCells('A2:B2'); ws.getCell('A2').value = 'CONTRATANTE:';
  ws.getCell('A2').font = { bold: true }; ws.getCell('A2').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: LGRAY } };
  ws.mergeCells('C2:F2'); ws.getCell('C2').value = medicao.obra.cliente;
  ws.mergeCells('G2:H2'); ws.getCell('G2').value = 'BM'; ws.getCell('G2').font = { bold: true };
  ws.getCell('I2').value = medicao.numeroMedicao; ws.getCell('I2').font = { bold: true };
  ws.mergeCells('J2:K2'); ws.getCell('J2').value = 'MÊS'; ws.getCell('J2').font = { bold: true };
  ws.mergeCells('L2:N2'); ws.getCell('L2').value = medicao.periodoInicio.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

  // Row 3: Objeto
  ws.mergeCells('A3:B3'); ws.getCell('A3').value = 'OBJETO:'; ws.getCell('A3').font = { bold: true };
  ws.getCell('A3').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: LGRAY } };
  ws.mergeCells('C3:N3'); ws.getCell('C3').value = medicao.contrato.descricao || '';

  // Row 4: Contrato / Prazo
  ws.mergeCells('A4:B4'); ws.getCell('A4').value = 'CONTRATO:'; ws.getCell('A4').font = { bold: true };
  ws.getCell('A4').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: LGRAY } };
  ws.getCell('C4').value = medicao.contrato.numeroContrato;
  ws.getCell('D4').value = 'PRAZO:'; ws.getCell('D4').font = { bold: true };
  ws.getCell('E4').value = medicao.contrato.dataContrato.toLocaleDateString('pt-BR');
  ws.getCell('F4').value = 'A'; ws.getCell('F4').alignment = { horizontal: 'center' };
  ws.getCell('G4').value = ''; // fim prazo
  ws.getCell('H4').value = 'PERÍODO:'; ws.getCell('H4').font = { bold: true };
  ws.getCell('I4').value = medicao.periodoInicio.toLocaleDateString('pt-BR');
  ws.getCell('J4').value = 'À'; ws.getCell('J4').alignment = { horizontal: 'center' };
  ws.mergeCells('K4:N4'); ws.getCell('K4').value = medicao.periodoFim.toLocaleDateString('pt-BR');

  // Row 5: Boletim de Medição header
  ws.mergeCells('A5:N5');
  const c5 = ws.getCell('A5');
  c5.value = 'BOLETIM DE MEDIÇÃO';
  c5.font = { ...boldWhite, size: 11 };
  c5.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: RED } };
  c5.alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(5).height = 18;

  // Row 6: sub-headers — CONTRATO / QUANTIDADES / VALORES
  const r6 = ws.getRow(6);
  r6.height = 16;
  ws.getCell('A6').value = 'ITEM'; ws.getCell('A6').font = boldWhite; ws.getCell('A6').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY } };
  ws.mergeCells('B6:B7'); ws.getCell('B6').value = 'DESCRIÇÃO DO ITEM'; ws.getCell('B6').font = boldWhite; ws.getCell('B6').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY } };
  ws.getCell('C6').value = 'UN'; ws.getCell('C6').font = boldWhite; ws.getCell('C6').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY } };
  ws.mergeCells('D6:F6'); ws.getCell('D6').value = 'CONTRATO'; ws.getCell('D6').font = boldWhite; ws.getCell('D6').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY } };
  ws.getCell('D6').alignment = { horizontal: 'center' };
  ws.mergeCells('G6:J6'); ws.getCell('G6').value = 'QUANTIDADES'; ws.getCell('G6').font = boldWhite; ws.getCell('G6').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY } };
  ws.getCell('G6').alignment = { horizontal: 'center' };
  ws.mergeCells('K6:N6'); ws.getCell('K6').value = 'VALORES (R$)'; ws.getCell('K6').font = boldWhite; ws.getCell('K6').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY } };
  ws.getCell('K6').alignment = { horizontal: 'center' };

  // Row 7: sub-sub-headers
  const r7 = ws.getRow(7);
  r7.height = 30;
  const h7 = (col: string, val: string) => {
    const c = ws.getCell(`${col}7`);
    c.value = val; c.font = boldWhite;
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY } };
    c.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    c.border = allBorders;
  };
  h7('A', 'ITEM'); h7('C', 'UN');
  h7('D', 'QUANTIDADE'); h7('E', 'PREÇO UNITÁRIO'); h7('F', 'PREÇO TOTAL');
  h7('G', 'ANTERIOR'); h7('H', 'ATUAL'); h7('I', 'ACUMULADA'); h7('J', 'SALDO');
  h7('K', 'ANTERIOR'); h7('L', 'ATUAL'); h7('M', 'ACUMULADO'); h7('N', 'SALDO');

  // Dados
  let rowIdx = 8;
  for (const im of medicao.itensMedicao) {
    const ic = im.itemContrato;
    const row = ws.getRow(rowIdx);
    row.height = 15;
    const bg = rowIdx % 2 === 0 ? LGRAY : WHITE;

    const setCell = (col: string, val: unknown, fmt?: string) => {
      const c = ws.getCell(`${col}${rowIdx}`);
      c.value = val as ExcelJS.CellValue;
      c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
      c.border = allBorders;
      c.alignment = { horizontal: typeof val === 'number' ? 'right' : 'left', vertical: 'middle' };
      if (fmt) c.numFmt = fmt;
    };

    setCell('A', ic.codigoItem);
    setCell('B', ic.descricao);
    setCell('C', ic.unidadeMedida);
    setCell('D', toNum(ic.quantidadeContratada), numFmt);
    setCell('E', toNum(ic.valorUnitario), moneyFmt);
    setCell('F', toNum(ic.valorTotal), moneyFmt);
    setCell('G', toNum(im.quantidadeAnterior), numFmt);
    setCell('H', toNum(im.quantidadePeriodo), numFmt);
    setCell('I', toNum(im.quantidadeAcumulada), numFmt);
    setCell('J', toNum(im.saldoQuantidade), numFmt);
    setCell('K', toNum(im.valorAcumulado) - toNum(im.valorPeriodo), moneyFmt);
    setCell('L', toNum(im.valorPeriodo), moneyFmt);
    setCell('M', toNum(im.valorAcumulado), moneyFmt);
    setCell('N', toNum(im.saldoValor), moneyFmt);

    rowIdx++;
  }

  // Totais
  const totRow = ws.getRow(rowIdx);
  totRow.height = 18;
  ws.mergeCells(`A${rowIdx}:C${rowIdx}`);
  const totLabel = ws.getCell(`A${rowIdx}`);
  totLabel.value = 'TOTAIS';
  totLabel.font = { bold: true, color: { argb: WHITE } };
  totLabel.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY } };
  totLabel.alignment = { horizontal: 'center', vertical: 'middle' };

  const tot = (col: string, val: number) => {
    const c = ws.getCell(`${col}${rowIdx}`);
    c.value = val; c.numFmt = moneyFmt;
    c.font = { bold: true };
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: DGRAY } };
    c.border = allBorders;
    c.alignment = { horizontal: 'right', vertical: 'middle' };
  };
  tot('F', toNum(medicao.contrato.valorTotalContratual));
  tot('L', toNum(medicao.valorBruto));
  tot('M', medicao.itensMedicao.reduce((s, im) => s + toNum(im.valorAcumulado), 0));
  rowIdx++;

  // Retenções
  rowIdx++;
  const addRet = (label: string, perc: number, val: number) => {
    ws.mergeCells(`A${rowIdx}:J${rowIdx}`);
    ws.getCell(`A${rowIdx}`).value = label;
    ws.getCell(`A${rowIdx}`).font = { bold: true };
    ws.getCell(`A${rowIdx}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: LGRAY } };
    ws.getCell(`K${rowIdx}`).value = `${perc.toFixed(2)}%`;
    ws.getCell(`K${rowIdx}`).alignment = { horizontal: 'center' };
    ws.mergeCells(`L${rowIdx}:N${rowIdx}`);
    ws.getCell(`L${rowIdx}`).value = val;
    ws.getCell(`L${rowIdx}`).numFmt = moneyFmt;
    ws.getCell(`L${rowIdx}`).alignment = { horizontal: 'right' };
    rowIdx++;
  };

  const c = medicao.contrato;
  addRet('INSS', toNum(c.retencaoINSS), toNum(medicao.retencaoINSSValor));
  addRet('ISS', toNum(c.retencaoISS), toNum(medicao.retencaoISSValor));
  addRet('IRRF', toNum(c.retencaoIRRF), toNum(medicao.retencaoIRRFValor));
  addRet('CSLL', toNum(c.retencaoCSLL), toNum(medicao.retencaoCSLLValor));
  addRet('PIS', toNum(c.retencaoPIS), toNum(medicao.retencaoPISValor));
  addRet('COFINS', toNum(c.retencaoCOFINS), toNum(medicao.retencaoCOFINSValor));
  addRet('OUTRAS DEDUÇÕES', toNum(c.outrasDeducoesPerc), toNum(medicao.outrasDeducoesValor));

  // Total Deduções
  ws.mergeCells(`A${rowIdx}:K${rowIdx}`);
  ws.getCell(`A${rowIdx}`).value = 'TOTAL DE RETENÇÕES';
  ws.getCell(`A${rowIdx}`).font = { bold: true, color: { argb: WHITE } };
  ws.getCell(`A${rowIdx}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: RED } };
  ws.mergeCells(`L${rowIdx}:N${rowIdx}`);
  ws.getCell(`L${rowIdx}`).value = toNum(medicao.totalDeducoes);
  ws.getCell(`L${rowIdx}`).numFmt = moneyFmt;
  ws.getCell(`L${rowIdx}`).font = { bold: true };
  ws.getCell(`L${rowIdx}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFD0D0' } };
  ws.getCell(`L${rowIdx}`).alignment = { horizontal: 'right' };
  rowIdx++;

  // Valor Líquido
  ws.mergeCells(`A${rowIdx}:K${rowIdx}`);
  ws.getCell(`A${rowIdx}`).value = 'TOTAL LÍQUIDO';
  ws.getCell(`A${rowIdx}`).font = { bold: true, size: 11, color: { argb: WHITE } };
  ws.getCell(`A${rowIdx}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY } };
  ws.mergeCells(`L${rowIdx}:N${rowIdx}`);
  ws.getCell(`L${rowIdx}`).value = toNum(medicao.valorLiquido);
  ws.getCell(`L${rowIdx}`).numFmt = moneyFmt;
  ws.getCell(`L${rowIdx}`).font = { bold: true, size: 11 };
  ws.getCell(`L${rowIdx}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD0FFD0' } };
  ws.getCell(`L${rowIdx}`).alignment = { horizontal: 'right' };

  const buffer = await wb.xlsx.writeBuffer();

  return new NextResponse(buffer as ArrayBuffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="BM-${medicao.numeroMedicao}-${medicao.obra.codigo}.xlsx"`,
    },
  });
}
