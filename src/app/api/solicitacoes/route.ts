import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { prisma } from '@/lib/db';
import { solicitacaoInicialSchema } from '@/lib/validations/orcamento.schema';
import { sendMagicLinkEmail } from '@/lib/email';
import { getServerSession } from '@/lib/session';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

/**
 * Gera um número de protocolo amigável e único: ORC-YYYY-XXXX
 */
async function gerarNumeroProtocolo(): Promise<string> {
  const ano = new Date().getFullYear();
  const count = await prisma.orcamento.count();
  const proximo = (count + 1).toString().padStart(4, '0');
  return `ORC-${ano}-${proximo}`;
}

/**
 * POST /api/solicitacoes
 * Recebe a solicitação inicial do cliente (via webhook de email, form de contato ou painel)
 * Gera o Lead, o Orçamento, o Magic Link seguro e dispara o e-mail transacional.
 */
export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const rateLimitResult = checkRateLimit(`solicitacoes:${ip}`, 10, 60000);

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        {
          error: `Muitas solicitações enviadas recentemente. Aguarde ${rateLimitResult.retryAfterSeconds} segundos antes de tentar novamente.`,
          retryAfter: rateLimitResult.retryAfterSeconds,
        },
        {
          status: 429,
          headers: {
            'Retry-After': String(rateLimitResult.retryAfterSeconds),
          },
        }
      );
    }

    const body = await req.json();
    const parseResult = solicitacaoInicialSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: 'Dados inválidos na solicitação inicial.',
          detalhes: parseResult.error.format(),
        },
        { status: 400 }
      );
    }

    const { nome, email, telefone, empresa, mensagemInicial } = parseResult.data;

    // 1. Criar ou atualizar Lead
    const lead = await prisma.lead.create({
      data: {
        nome,
        email: email.toLowerCase().trim(),
        telefone,
        empresa,
        mensagemInicial,
      },
    });

    // 2. Gerar Protocolo único
    const numeroProtocolo = await gerarNumeroProtocolo();

    // 3. Criar Orçamento com status AGUARDANDO_CLIENTE
    const orcamento = await prisma.orcamento.create({
      data: {
        numeroProtocolo,
        status: 'AGUARDANDO_CLIENTE',
        leadId: lead.id,
      },
    });

    // 4. Gerar Magic Link seguro (UUID v4) com validade de 7 dias
    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 dias

    const magicLink = await prisma.magicLink.create({
      data: {
        token,
        orcamentoId: orcamento.id,
        expiresAt,
      },
    });

    // 5. Registrar log de auditoria
    await prisma.statusLog.create({
      data: {
        orcamentoId: orcamento.id,
        statusNovo: 'AGUARDANDO_CLIENTE',
        motivo: 'Solicitação inicial recebida. Magic Link gerado para o cliente.',
        usuarioNome: 'Sistema Automático',
      },
    });

    // 6. Montar URL do Magic Link e enviar e-mail transacional
    const baseUrl = process.env.APP_URL || 'http://localhost:3000';
    const magicLinkUrl = `${baseUrl}/formulario/${magicLink.token}`;

    const emailResult = await sendMagicLinkEmail({
      to: lead.email,
      clienteNome: lead.nome,
      protocolo: orcamento.numeroProtocolo,
      magicLinkUrl,
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Solicitação inicial processada com sucesso.',
        orcamento: {
          id: orcamento.id,
          numeroProtocolo: orcamento.numeroProtocolo,
          status: orcamento.status,
          createdAt: orcamento.createdAt,
        },
        cliente: {
          id: lead.id,
          nome: lead.nome,
          email: lead.email,
        },
        magicLink: {
          token: magicLink.token,
          url: magicLinkUrl,
          expiresAt: magicLink.expiresAt,
          emailEnviado: emailResult.success,
          simulado: emailResult.simulated,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Erro ao processar solicitação inicial:', error);
    return NextResponse.json(
      { error: 'Erro interno ao processar solicitação inicial de orçamento.' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/solicitacoes
 * Listagem de orçamentos para o painel dos orçamentistas (autenticado)
 */
export async function GET() {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
  }

  try {
    const orcamentos = await prisma.orcamento.findMany({
      include: {
        lead: true,
        orcamentista: {
          select: { id: true, name: true, email: true },
        },
        magicLink: {
          select: { token: true, used: true, expiresAt: true },
        },
        respostaFormulario: true,
        propostaComercial: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ success: true, orcamentos });
  } catch (error) {
    console.error('Erro ao buscar orçamentos:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar lista de orçamentos.' },
      { status: 500 }
    );
  }
}
