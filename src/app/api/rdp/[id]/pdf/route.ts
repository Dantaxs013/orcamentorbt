import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/session';
import { prisma } from '@/lib/db';
import { isAdmin } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession();
  if (!session?.user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  if (!session.user.acessoMedicao && !isAdmin(session.user.role)) {
    return NextResponse.json({ error: 'Acesso negado ao módulo de Medição' }, { status: 403 });
  }

  const rdp = await prisma.relatorioDiario.findUnique({
    where: { id: params.id },
    include: {
      obra: { select: { nome: true, codigo: true, cliente: true } },
      apontador: { select: { name: true } },
      linhasProducao: { orderBy: { numeroLinha: 'asc' } },
    },
  });

  if (!rdp) return NextResponse.json({ error: 'RDP não encontrado' }, { status: 404 });

  // Monta HTML fiel ao modelo físico
  const linhas = rdp.linhasProducao;
  const totalEmendaW150 = linhas.reduce((s, l) => s + l.emendaW150, 0);
  const totalEmendaW310 = linhas.reduce((s, l) => s + l.emendaW310, 0);
  const totalTalas = linhas.reduce((s, l) => s + l.talas, 0);
  const totalArrasamento = linhas.reduce((s, l) => s + parseFloat(String(l.arrasamento || 0)), 0);
  const totalProfundidade = linhas.reduce((s, l) => s + parseFloat(String(l.profundidade || 0)), 0);

  const fillerRows = Array.from({ length: Math.max(0, 25 - linhas.length) }, (_, i) => i);

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>Relatório Diário de Produção - ${rdp.obra.nome}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: Arial, sans-serif; font-size: 8pt; color: #000; background: #fff; }
  @page { size: A4 portrait; margin: 8mm; }
  @media print { body { margin: 0; } }
  .page { width: 100%; padding: 4px; }
  table { width: 100%; border-collapse: collapse; }
  td, th { border: 1px solid #000; padding: 2px 3px; text-align: center; vertical-align: middle; }
  th { background: #E5E7EB; color: #000000; font-weight: bold; font-size: 7pt; }
  .header-title { background: #D1D5DB; color: #000000; text-align: center; font-weight: 900; font-size: 10pt; padding: 4px; letter-spacing: 0.5px; }
  .section-title { background: #E5E7EB; color: #000000; text-align: center; font-weight: bold; font-size: 8pt; padding: 3px; }
  .totals-row td { background: #F3F4F6; font-weight: bold; }
  .label-cell { background: #e8e8e8; font-weight: bold; text-align: left; padding-left: 4px; }
  .field-cell { text-align: left; padding-left: 4px; }
  .obs-row { height: 20px; }
  .sig-area { height: 35px; }
  .empty-row { height: 14px; }
</style>
</head>
<body>
<div class="page">
  <!-- CABEÇALHO -->
  <table>
    <tr>
      <td colspan="6" class="header-title">RELATÓRIO DIÁRIO DE PRODUÇÃO</td>
      <td rowspan="3" style="width:110px;text-align:center;border:1px solid #000;background:#ffffff;padding:4px 6px;">
        <svg viewBox="0 0 240 70" width="100" height="34" xmlns="http://www.w3.org/2000/svg">
          <path d="M 12 12 L 28 12 L 28 18 L 19 18 L 19 50 L 28 50 L 28 56 L 12 56 Z" fill="#BA1A1A" />
          <text x="36" y="44" font-family="'Arial Black', 'Montserrat', sans-serif" font-weight="900" font-size="38" fill="#BA1A1A" letter-spacing="-1">RBT</text>
          <text x="37" y="60" font-family="'Arial', sans-serif" font-weight="800" font-size="12" fill="#000000" letter-spacing="3.5">ENGENHARIA</text>
        </svg>
      </td>
    </tr>
    <tr>
      <td class="label-cell" style="width:40px">Obra:</td>
      <td colspan="2" class="field-cell">${rdp.obra.nome}</td>
      <td class="label-cell" style="width:50px">Apontador</td>
      <td colspan="2" class="field-cell">${rdp.apontador.name}</td>
    </tr>
    <tr>
      <td class="label-cell">Data:</td>
      <td class="field-cell">${rdp.data.toLocaleDateString('pt-BR')}</td>
      <td class="label-cell"></td>
      <td class="label-cell">Máquina</td>
      <td colspan="2" class="field-cell">${rdp.maquinaEquipamento || ''}</td>
    </tr>
  </table>

  <!-- DESCRIÇÃO DAS ATIVIDADES -->
  <table style="margin-top:2px">
    <tr><td colspan="8" class="section-title">Descrição das atividades</td></tr>
    <tr>
      <td class="label-cell" style="width:70px">soldadores:</td>
      <td class="field-cell" colspan="2">${rdp.equipeDescricao || ''}</td>
      <td class="label-cell" style="width:80px">Início das atividades:</td>
      <td class="field-cell">${rdp.horaInicio || ''}</td>
      <td class="label-cell" style="width:70px">Fim das atividades:</td>
      <td class="field-cell" colspan="2">${rdp.horaFim || ''}</td>
    </tr>
    <tr><td class="label-cell">massariqueiro:</td><td colspan="7" class="field-cell"></td></tr>
    <tr><td class="label-cell">1/2 oficial:</td><td colspan="7" class="field-cell"></td></tr>
    <tr><td class="label-cell">encarregado:</td><td class="field-cell" colspan="7">${rdp.encarregado || ''}</td></tr>
  </table>

  <!-- TABELA DE PRODUÇÃO -->
  <table style="margin-top:2px">
    <tr>
      <td colspan="10" class="section-title">Produção</td>
    </tr>
    <tr>
      <th rowspan="2" colspan="3">Info</th>
      <th colspan="2">Emenda estrutural em perfil metálico</th>
      <th colspan="2">Tala de apoio para cravação W 150</th>
      <th colspan="2">Redução / corte / Arrasamento de perfil</th>
      <th rowspan="2">Outros / observações</th>
    </tr>
    <tr>
      <th>W150</th>
      <th>W310</th>
      <th>Montagem da Tala</th>
      <th>Desm. da tala</th>
      <th>W150</th>
      <th>W310</th>
    </tr>
    <tr>
      <th>Nº Estaca</th>
      <th>Tipo Perfil</th>
      <th>Elemento</th>
      <th>W150</th>
      <th>W310</th>
      <th>Montagem da Tala</th>
      <th>Desm. da tala</th>
      <th>W150</th>
      <th>W310</th>
      <th></th>
    </tr>
    ${linhas.map((l, idx) => `
    <tr class="empty-row">
      <td style="text-align:left;padding-left:3px">${idx + 1}&nbsp;${l.numeroEstaca || ''}</td>
      <td>${l.perfil || ''}</td>
      <td></td>
      <td>${l.emendaW150 || ''}</td>
      <td>${l.emendaW310 || ''}</td>
      <td></td>
      <td>${l.talas || ''}</td>
      <td>${parseFloat(String(l.arrasamento)) > 0 ? parseFloat(String(l.arrasamento)).toFixed(2) : ''}</td>
      <td></td>
      <td style="text-align:left;padding-left:2px;font-size:6pt">${l.observacao || ''}</td>
    </tr>`).join('')}
    ${fillerRows.map((_, i) => `
    <tr class="empty-row">
      <td style="text-align:left;padding-left:3px">${linhas.length + i + 1}</td>
      <td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td>
    </tr>`).join('')}
    <tr class="totals-row">
      <td colspan="3" style="text-align:center;font-weight:bold;color:#cc0000">Total</td>
      <td style="color:#cc0000">${totalEmendaW150 || ''}</td>
      <td style="color:#cc0000">${totalEmendaW310 || ''}</td>
      <td style="color:#cc0000">${totalTalas || ''}</td>
      <td></td>
      <td style="color:#cc0000">${totalArrasamento > 0 ? totalArrasamento.toFixed(2) : ''}</td>
      <td></td>
      <td></td>
    </tr>
  </table>

  <!-- OBSERVAÇÕES -->
  <table style="margin-top:2px">
    <tr><td class="section-title">Observações</td></tr>
    <tr><td style="height:18px;text-align:left;padding-left:4px">${rdp.observacoes || ''}</td></tr>
    <tr><td style="height:14px"></td></tr>
    <tr><td style="height:14px"></td></tr>
    <tr><td style="height:14px"></td></tr>
  </table>

  <!-- ASSINATURAS -->
  <table style="margin-top:4px">
    <tr>
      <td style="width:33%;text-align:left;padding:2px 4px">Ass. RBT</td>
      <td style="width:34%;text-align:center;padding:2px 4px">Ass. Excelsior</td>
      <td style="width:33%;text-align:right;padding:2px 4px"></td>
    </tr>
    <tr>
      <td class="sig-area"></td>
      <td class="sig-area"></td>
      <td class="sig-area"></td>
    </tr>
    <tr>
      <td style="text-align:left;padding:2px 4px">Ass. Conviva</td>
      <td></td>
      <td></td>
    </tr>
    <tr>
      <td class="sig-area"></td>
      <td></td>
      <td></td>
    </tr>
  </table>
</div>
<script>
  window.onload = function() { window.print(); }
</script>
</body>
</html>`;

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}
