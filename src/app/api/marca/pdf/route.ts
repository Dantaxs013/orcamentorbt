import { NextResponse } from 'next/server';

export async function GET() {
  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>Manual da Marca — RBT Engenharia & Fundações</title>
<style>
  @page {
    size: A4 portrait;
    margin: 12mm 15mm;
  }
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    color: #111827;
    background: #ffffff;
    line-height: 1.5;
    font-size: 10pt;
  }
  .container {
    max-width: 100%;
    margin: 0 auto;
  }
  .header-box {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 3px solid #BA1A1A;
    padding-bottom: 14px;
    margin-bottom: 20px;
  }
  .doc-title h1 {
    font-size: 16pt;
    font-weight: 900;
    color: #111827;
    letter-spacing: -0.5px;
    line-height: 1.2;
  }
  .doc-title p {
    font-size: 8.5pt;
    color: #64748B;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 1px;
    margin-top: 3px;
  }
  .logo-box {
    border: 1px solid #CBD5E1;
    border-radius: 8px;
    padding: 6px 12px;
    background: #FFFFFF;
    box-shadow: 0 1px 3px rgba(0,0,0,0.05);
  }

  .section {
    margin-bottom: 18px;
    page-break-inside: avoid;
  }
  .section-title {
    font-size: 11pt;
    font-weight: 800;
    color: #111827;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    border-left: 4px solid #BA1A1A;
    padding-left: 8px;
    margin-bottom: 10px;
  }

  .grid-2 {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 14px;
  }
  .grid-3 {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 12px;
  }

  .card {
    background: #F8FAFC;
    border: 1px solid #E2E8F0;
    border-radius: 8px;
    padding: 12px;
  }

  /* Swatches de cores */
  .color-card {
    border-radius: 8px;
    overflow: hidden;
    border: 1px solid #E2E8F0;
  }
  .color-preview {
    height: 48px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 800;
    font-size: 9pt;
  }
  .color-info {
    padding: 8px 10px;
    background: #FFFFFF;
    font-size: 8pt;
  }
  .color-name {
    font-weight: 800;
    font-size: 8.5pt;
    margin-bottom: 2px;
  }

  .spec-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 8.5pt;
    margin-top: 6px;
  }
  .spec-table th, .spec-table td {
    border: 1px solid #CBD5E1;
    padding: 5px 8px;
    text-align: left;
  }
  .spec-table th {
    background: #F1F5F9;
    color: #111827;
    font-weight: 700;
  }

  .badge-do {
    display: inline-block;
    background: #DCFCE7;
    color: #166534;
    font-weight: 800;
    font-size: 7.5pt;
    padding: 2px 6px;
    border-radius: 4px;
    text-transform: uppercase;
  }
  .badge-dont {
    display: inline-block;
    background: #FEE2E2;
    color: #991B1B;
    font-weight: 800;
    font-size: 7.5pt;
    padding: 2px 6px;
    border-radius: 4px;
    text-transform: uppercase;
  }

  .footer-note {
    margin-top: 25px;
    border-top: 1px solid #E2E8F0;
    padding-top: 10px;
    font-size: 7.5pt;
    color: #64748B;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  /* Ação de impressão na tela */
  .no-print-bar {
    background: #111827;
    border-bottom: 2px solid #BA1A1A;
    color: #FFFFFF;
    padding: 10px 16px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
    border-radius: 8px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.15);
  }
  .btn-print {
    background: #BA1A1A;
    color: #FFFFFF;
    border: none;
    padding: 8px 18px;
    font-size: 9pt;
    font-weight: 700;
    border-radius: 6px;
    cursor: pointer;
  }
  .btn-print:hover {
    background: #991B1B;
  }
  @media print {
    .no-print-bar {
      display: none !important;
    }
  }
</style>
</head>
<body>

<div class="container">
  <!-- Barra de controle na tela (oculta na impressão) -->
  <div class="no-print-bar">
    <div>
      <strong>📄 Manual de Identidade Visual da Marca RBT</strong>
      <span style="font-size: 8pt; opacity: 0.8; margin-left: 8px;">Documento Oficial de Engenharia</span>
    </div>
    <button class="btn-print" onclick="window.print()">🖨️ Salvar como PDF / Imprimir</button>
  </div>

  <!-- CABEÇALHO -->
  <div class="header-box">
    <div class="doc-title">
      <h1>MANUAL DE IDENTIDADE VISUAL DA MARCA</h1>
      <p>RBT Engenharia & Fundações · Diretrizes de Aplicação</p>
    </div>
    <div class="logo-box">
      <!-- Logo Oficial RBT em SVG -->
      <svg viewBox="0 0 240 70" width="160" height="46" xmlns="http://www.w3.org/2000/svg">
        <path d="M 12 12 L 28 12 L 28 18 L 19 18 L 19 50 L 28 50 L 28 56 L 12 56 Z" fill="#BA1A1A" />
        <text x="36" y="44" font-family="'Arial Black', 'Montserrat', sans-serif" font-weight="900" font-size="38" fill="#BA1A1A" letter-spacing="-1">RBT</text>
        <text x="37" y="60" font-family="'Arial', sans-serif" font-weight="800" font-size="12" fill="#000000" letter-spacing="3.5">ENGENHARIA</text>
      </svg>
    </div>
  </div>

  <!-- SEÇÃO 1: APRESENTAÇÃO E CONCEITO -->
  <div class="section">
    <div class="section-title">1. Conceito e Estrutura da Marca</div>
    <div class="card">
      <p style="margin-bottom: 6px;">
        A marca <strong>RBT Engenharia</strong> expressa a robustez, precisão e solidez necessárias no segmento de fundações profundas, cravação de perfis metálicos e obras geotécnicas.
      </p>
      <p style="color: #475569; font-size: 8.5pt;">
        Sua construção baseia-se no elemento estrutural de <strong>bracket / cantoneira de aço</strong> em vermelho industrial, complementado pelo acrônimo <strong>RBT</strong> em destaque e o descritivo de especialidade <strong>ENGENHARIA</strong> em preto absoluto para conferir leitura imediata e peso formal.
      </p>
    </div>
  </div>

  <!-- SEÇÃO 2: ELEMENTOS DA MARCA -->
  <div class="section">
    <div class="section-title">2. Anatomia do Logotipo Oficial</div>
    <div class="grid-2">
      <div class="card" style="text-align: center; display: flex; flex-direction: column; justify-content: center; align-items: center;">
        <div style="background: #ffffff; padding: 14px 20px; border-radius: 8px; border: 1px dashed #94A3B8; margin-bottom: 8px;">
          <svg viewBox="0 0 240 70" width="200" height="58" xmlns="http://www.w3.org/2000/svg">
            <path d="M 12 12 L 28 12 L 28 18 L 19 18 L 19 50 L 28 50 L 28 56 L 12 56 Z" fill="#BA1A1A" />
            <text x="36" y="44" font-family="'Arial Black', 'Montserrat', sans-serif" font-weight="900" font-size="38" fill="#BA1A1A" letter-spacing="-1">RBT</text>
            <text x="37" y="60" font-family="'Arial', sans-serif" font-weight="800" font-size="12" fill="#000000" letter-spacing="3.5">ENGENHARIA</text>
          </svg>
        </div>
        <span style="font-size: 8pt; font-weight: 700; color: #64748B;">Configuração Principal Obrigatória</span>
      </div>

      <div class="card">
        <strong style="font-size: 9pt; color: #111827;">Componentes Essenciais:</strong>
        <table class="spec-table">
          <tr>
            <th>Elemento</th>
            <th>Cor Obrigatória</th>
            <th>Significado</th>
          </tr>
          <tr>
            <td><strong>Bracket [</strong></td>
            <td style="color: #BA1A1A; font-weight: 800;">Vermelho #BA1A1A</td>
            <td>Cantoneira, aço e retenção geotécnica</td>
          </tr>
          <tr>
            <td><strong>Texto RBT</strong></td>
            <td style="color: #BA1A1A; font-weight: 800;">Vermelho #BA1A1A</td>
            <td>Identidade nominal em alta densidade</td>
          </tr>
          <tr>
            <td><strong>ENGENHARIA</strong></td>
            <td style="color: #000000; font-weight: 800;">Preto #000000</td>
            <td>Rigor técnico e autoridade formal</td>
          </tr>
        </table>
      </div>
    </div>
  </div>

  <!-- SEÇÃO 3: PALETA DE CORES INSTITUCIONAL -->
  <div class="section">
    <div class="section-title">3. Paleta Cromática Institucional</div>
    <div class="grid-3">
      <!-- Vermelho RBT -->
      <div class="color-card">
        <div class="color-preview" style="background: #BA1A1A; color: #FFFFFF;">
          VERMELHO RBT
        </div>
        <div class="color-info">
          <div class="color-name">Vermelho Primário</div>
          <div>HEX: <strong>#BA1A1A</strong></div>
          <div>RGB: 186, 26, 26</div>
          <div>Uso: Logo RBT e Destaques</div>
        </div>
      </div>

      <!-- Preto Estrutural -->
      <div class="color-card">
        <div class="color-preview" style="background: #000000; color: #FFFFFF;">
          PRETO ENGENHARIA
        </div>
        <div class="color-info">
          <div class="color-name">Preto Institucional</div>
          <div>HEX: <strong>#000000</strong></div>
          <div>RGB: 0, 0, 0</div>
          <div>Uso: Texto "ENGENHARIA" e Tipografia</div>
        </div>
      </div>

      <!-- Grafite Corporativo -->
      <div class="color-card">
        <div class="color-preview" style="background: #111827; color: #FFFFFF;">
          GRAFITE RBT
        </div>
        <div class="color-info">
          <div class="color-name">Preto Grafite Técnico</div>
          <div>HEX: <strong>#111827</strong></div>
          <div>RGB: 17, 24, 39</div>
          <div>Uso: Cabeçalhos e Estrutura do App</div>
        </div>
      </div>
    </div>
  </div>

  <!-- SEÇÃO 4: APLICAÇÃO NO SISTEMA E RELATÓRIOS -->
  <div class="section">
    <div class="section-title">4. Aplicação no Sistema de Medição Diária</div>
    <div class="card">
      <ul style="padding-left: 18px; font-size: 8.5pt; color: #334155; line-height: 1.7;">
        <li><strong>Tela de Login:</strong> Exibição da logo com a escrita vermelha e preta destacada em card branco de alto contraste para clareza corporativa.</li>
        <li><strong>Barra Superior do Sistema:</strong> Aplicação do selo oficial em caixa branca com cantos arredondados sobre o fundo preto grafite (<code style="background:#E2E8F0;padding:1px 4px;border-radius:3px;">#111827</code>) com linha vermelha RBT.</li>
        <li><strong>Relatório Diário de Produção (RDP Físico / PDF):</strong> Posicionamento fixo no quadrante superior direito do cabeçalho técnico, alinhado aos campos de Obra, Apontador, Data e Máquina.</li>
        <li><strong>Boletins de Medição (Excel / PDF):</strong> Assinatura visual superior em todos os fechamentos contratuais e boletins de medição oficializados.</li>
      </ul>
    </div>
  </div>

  <!-- SEÇÃO 5: DIRETRIZES DE USO (PERMITIDO VS PROIBIDO) -->
  <div class="section">
    <div class="section-title">5. Regras de Preservação da Marca</div>
    <div class="grid-2">
      <div class="card" style="border-left: 3px solid #16A34A;">
        <div style="margin-bottom: 6px;"><span class="badge-do">Permitido</span></div>
        <ul style="padding-left: 16px; font-size: 8pt; color: #334155; line-height: 1.6;">
          <li>Manter a combinação da escrita <strong>RBT em vermelho</strong> com <strong>ENGENHARIA em preto</strong>.</li>
          <li>Aplicar sobre fundo branco ou em container branco sobre fundos escuros.</li>
          <li>Respeitar a área de respiro mínima equivalente à largura do bracket.</li>
        </ul>
      </div>

      <div class="card" style="border-left: 3px solid #DC2626;">
        <div style="margin-bottom: 6px;"><span class="badge-dont">Não Permitido</span></div>
        <ul style="padding-left: 16px; font-size: 8pt; color: #334155; line-height: 1.6;">
          <li>Alterar a cor da escrita "ENGENHARIA" para vermelho ou cores secundárias.</li>
          <li>Distorcer as proporções horizontais e verticais do logotipo.</li>
          <li>Remover o bracket estrutural vermelho da composição oficial.</li>
        </ul>
      </div>
    </div>
  </div>

  <!-- RODAPÉ DE VALIDAÇÃO -->
  <div class="footer-note">
    <div><strong>RBT Engenharia & Fundações</strong> · Documento de Padronização Visual 2026</div>
    <div>Emitido pelo Sistema Integrado de Medição e Produção</div>
  </div>
</div>

<script>
  // Ao abrir em janela dedicada com parâmetro print=1, abre a tela de impressão automaticamente
  if (window.location.search.includes('print=1')) {
    window.onload = function() { window.print(); }
  }
</script>

</body>
</html>`;

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Disposition': 'inline; filename="Manual_Marca_RBT_Engenharia.pdf"',
      'Cache-Control': 'no-store',
    },
  });
}
