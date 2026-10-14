import nodemailer from 'nodemailer';

interface MagicLinkEmailProps {
  to: string;
  clienteNome: string;
  protocolo: string;
  magicLinkUrl: string;
}

interface PropostaEmailProps {
  to: string;
  clienteNome: string;
  protocolo: string;
  valorTotal: string;
  pdfBuffer?: Buffer;
}

function getMailTransporter() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT) || 587;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass || host.includes('exemplo.com')) {
    // Modo simulação / fallback seguro para testes locais
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: process.env.SMTP_SECURE === 'true' || port === 465,
    auth: {
      user,
      pass,
    },
  });
}

/**
 * Envia o e-mail com o Magic Link exclusivo para o cliente preencher o formulário
 */
export async function sendMagicLinkEmail({
  to,
  clienteNome,
  protocolo,
  magicLinkUrl,
}: MagicLinkEmailProps): Promise<{ success: boolean; simulated?: boolean }> {
  const transporter = getMailTransporter();
  const from = process.env.SMTP_FROM || 'RBT Orçamentos <orcamentos@rbtfundacoes.com.br>';

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f4f6f8; margin: 0; padding: 24px; color: #1e293b; }
        .card { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
        .header { background-color: #111827; padding: 28px; text-align: center; border-bottom: 4px solid #BA1A1A; }
        .header h1 { color: #ffffff; margin: 0; font-size: 20px; font-weight: 800; letter-spacing: -0.5px; }
        .header p { color: #94a3b8; font-size: 12px; margin-top: 6px; text-transform: uppercase; letter-spacing: 1.5px; }
        .body { padding: 32px 28px; }
        .body p { font-size: 15px; line-height: 1.6; color: #334155; margin: 0 0 16px 0; }
        .badge { display: inline-block; background-color: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 8px; padding: 8px 16px; font-family: monospace; font-size: 14px; font-weight: bold; color: #0f172a; margin-bottom: 20px; }
        .btn-box { text-align: center; margin: 32px 0; }
        .btn { display: inline-block; background-color: #BA1A1A; color: #ffffff !important; font-size: 15px; font-weight: bold; text-decoration: none; padding: 14px 32px; border-radius: 10px; box-shadow: 0 4px 12px rgba(186, 26, 26, 0.25); }
        .warning { background-color: #fef2f2; border-left: 4px solid #BA1A1A; padding: 12px 16px; border-radius: 6px; font-size: 13px; color: #991b1b; margin-top: 24px; }
        .footer { background-color: #f8fafc; padding: 20px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="header">
          <h1>RBT FUNDAÇÕES & ENGENHARIA</h1>
          <p>Solicitação de Orçamento Técnico</p>
        </div>
        <div class="body">
          <p>Olá, <strong>${clienteNome}</strong>!</p>
          <p>Recebemos sua solicitação de orçamento com sucesso. Para que nossa equipe de engenharia orçamentária elabore a melhor proposta comercial, geramos um formulário técnico exclusivo para você:</p>
          
          <div style="text-align: center;">
            <div class="badge">Protocolo: ${protocolo}</div>
          </div>

          <div class="btn-box">
            <a href="${magicLinkUrl}" class="btn" target="_blank">Acessar Formulário do Orçamento</a>
          </div>

          <p style="font-size: 13px; color: #64748b;">
            Caso o botão não funcione, copie e cole o link direto em seu navegador:<br>
            <a href="${magicLinkUrl}" style="color: #BA1A1A; word-break: break-all;">${magicLinkUrl}</a>
          </p>

          <div class="warning">
            <strong>Atenção:</strong> Este link é seguro e exclusivo. Não o compartilhe. O acesso permanecerá ativo para preenchimento.
          </div>
        </div>
        <div class="footer">
          RBT Fundações · Departamento de Engenharia & Orçamentos<br>
          © 2026 Todos os direitos reservados.
        </div>
      </div>
    </body>
    </html>
  `;

  if (!transporter) {
    console.log('\n======================================================');
    console.log('📨 [SIMULAÇÃO DE E-MAIL - MAGIC LINK GERADO]');
    console.log(`Para: ${to} (${clienteNome})`);
    console.log(`Protocolo: ${protocolo}`);
    console.log(`🔗 Magic Link: ${magicLinkUrl}`);
    console.log('======================================================\n');
    return { success: true, simulated: true };
  }

  try {
    await transporter.sendMail({
      from,
      to,
      subject: `[RBT] Formulário para Orçamento - Protocolo ${protocolo}`,
      html,
    });
    return { success: true, simulated: false };
  } catch (error) {
    console.error('Erro ao enviar e-mail via SMTP:', error);
    return { success: false };
  }
}

/**
 * Envia o e-mail da proposta comercial com o PDF em anexo
 */
export async function sendPropostaEmail({
  to,
  clienteNome,
  protocolo,
  valorTotal,
  pdfBuffer,
}: PropostaEmailProps): Promise<{ success: boolean; simulated?: boolean }> {
  const transporter = getMailTransporter();
  const from = process.env.SMTP_FROM || 'RBT Orçamentos <orcamentos@rbtfundacoes.com.br>';

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f4f6f8; margin: 0; padding: 24px; color: #1e293b; }
        .card { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; }
        .header { background-color: #111827; padding: 28px; text-align: center; border-bottom: 4px solid #BA1A1A; }
        .header h1 { color: #ffffff; margin: 0; font-size: 20px; font-weight: 800; }
        .body { padding: 32px 28px; }
        .body p { font-size: 15px; line-height: 1.6; color: #334155; }
        .total-box { background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 12px; padding: 20px; text-align: center; margin: 24px 0; }
        .total-label { font-size: 12px; font-weight: bold; color: #64748b; text-transform: uppercase; }
        .total-val { font-size: 28px; font-weight: 800; color: #BA1A1A; margin-top: 4px; }
        .footer { background-color: #f8fafc; padding: 20px; text-align: center; font-size: 12px; color: #64748b; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="header">
          <h1>RBT FUNDAÇÕES & ENGENHARIA</h1>
        </div>
        <div class="body">
          <p>Olá, <strong>${clienteNome}</strong>!</p>
          <p>Nossa equipe técnica concluiu a análise do seu formulário referente ao protocolo <strong>${protocolo}</strong>.</p>
          
          <div class="total-box">
            <div class="total-label">Valor Total da Proposta Comercial</div>
            <div class="total-val">${valorTotal}</div>
          </div>

          <p>A proposta técnica e comercial completa com memorial, quantitativos e cronograma está anexada a este e-mail em formato PDF.</p>
          <p>Ficamos à disposição para quaisquer esclarecimentos ou ajustes técnicos.</p>
        </div>
        <div class="footer">
          RBT Fundações · Departamento Comercial e Engenharia<br>
          © 2026 Todos os direitos reservados.
        </div>
      </div>
    </body>
    </html>
  `;

  if (!transporter) {
    console.log('\n======================================================');
    console.log('📨 [SIMULAÇÃO DE E-MAIL - PROPOSTA COMERCIAL ENVIADA]');
    console.log(`Para: ${to} (${clienteNome})`);
    console.log(`Protocolo: ${protocolo}`);
    console.log(`Valor da Proposta: ${valorTotal}`);
    console.log(`Anexo PDF incluído: ${pdfBuffer ? 'SIM (' + pdfBuffer.length + ' bytes)' : 'NÃO'}`);
    console.log('======================================================\n');
    return { success: true, simulated: true };
  }

  try {
    const attachments = pdfBuffer
      ? [
          {
            filename: `Proposta_Comercial_${protocolo}.pdf`,
            content: pdfBuffer,
            contentType: 'application/pdf',
          },
        ]
      : [];

    await transporter.sendMail({
      from,
      to,
      subject: `[RBT] Proposta Comercial - Protocolo ${protocolo}`,
      html,
      attachments,
    });
    return { success: true, simulated: false };
  } catch (error) {
    console.error('Erro ao enviar e-mail de proposta:', error);
    return { success: false };
  }
}
