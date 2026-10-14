import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { respostaFormularioSchema } from '@/lib/validations/orcamento.schema';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

interface RouteContext {
  params: {
    token: string;
  };
}

/**
 * GET /api/formulario/[token]
 * Valida o token e retorna os dados de contexto do cliente para carregar a página
 */
export async function GET(req: NextRequest, { params }: RouteContext) {
  try {
    const { token } = params;

    if (!token) {
      return NextResponse.json({ error: 'Token não fornecido.' }, { status: 400 });
    }

    const magicLink = await prisma.magicLink.findUnique({
      where: { token },
      include: {
        orcamento: {
          include: {
            lead: true,
            respostaFormulario: true,
          },
        },
      },
    });

    if (!magicLink) {
      return NextResponse.json(
        { error: 'Magic Link inválido ou inexistente.' },
        { status: 404 }
      );
    }

    // Verificar expiração
    if (magicLink.expiresAt.getTime() < Date.now()) {
      return NextResponse.json(
        { error: 'Este link expirou. Por favor, solicite um novo link à nossa equipe.' },
        { status: 410 }
      );
    }

    // Se já foi preenchido
    if (magicLink.used || magicLink.orcamento.respostaFormulario) {
      return NextResponse.json({
        alreadySubmitted: true,
        protocolo: magicLink.orcamento.numeroProtocolo,
        clienteNome: magicLink.orcamento.lead.nome,
        status: magicLink.orcamento.status,
        submittedAt: magicLink.orcamento.respostaFormulario?.submittedAt,
        message: 'Este formulário já foi respondido e está em processo de análise.',
      });
    }

    return NextResponse.json({
      valid: true,
      protocolo: magicLink.orcamento.numeroProtocolo,
      cliente: {
        nome: magicLink.orcamento.lead.nome,
        email: magicLink.orcamento.lead.email,
        empresa: magicLink.orcamento.lead.empresa,
        mensagemInicial: magicLink.orcamento.lead.mensagemInicial,
      },
      expiresAt: magicLink.expiresAt,
    });
  } catch (error) {
    console.error('Erro ao consultar Magic Link:', error);
    return NextResponse.json(
      { error: 'Erro interno ao validar link do formulário.' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/formulario/[token]
 * Recebe as respostas do cliente, valida com Zod, salva no banco e atualiza status para AGUARDANDO_ANALISE
 */
export async function POST(req: NextRequest, { params }: RouteContext) {
  try {
    const ip = getClientIp(req);
    const rateLimitResult = checkRateLimit(`formulario:${ip}`, 10, 60000);

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        {
          error: `Muitas tentativas de envio do formulário. Aguarde ${rateLimitResult.retryAfterSeconds} segundos antes de tentar novamente.`,
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

    const { token } = params;

    if (!token) {
      return NextResponse.json({ error: 'Token não fornecido.' }, { status: 400 });
    }

    // 1. Validar Magic Link
    const magicLink = await prisma.magicLink.findUnique({
      where: { token },
      include: {
        orcamento: {
          include: {
            lead: true,
            respostaFormulario: true,
          },
        },
      },
    });

    if (!magicLink) {
      return NextResponse.json(
        { error: 'Magic Link inválido ou inexistente.' },
        { status: 404 }
      );
    }

    if (magicLink.expiresAt.getTime() < Date.now()) {
      return NextResponse.json(
        { error: 'Este link expirou. Solicite um novo link à equipe RBT.' },
        { status: 410 }
      );
    }

    if (magicLink.used || magicLink.orcamento.respostaFormulario) {
      return NextResponse.json(
        { error: 'Este formulário já foi enviado anteriormente e está em análise.' },
        { status: 409 }
      );
    }

    // 2. Validar dados preenchidos com Zod
    const body = await req.json();
    const parseResult = respostaFormularioSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: 'Dados inválidos no preenchimento do formulário.',
          detalhes: parseResult.error.format(),
        },
        { status: 400 }
      );
    }

    const dados = parseResult.data;
    const orcamentoId = magicLink.orcamento.id;

    // 3. Transação atômica: salvar Resposta, marcar Magic Link como usado e atualizar Status
    const resultado = await prisma.$transaction(async (tx) => {
      // Salvar respostas técnicas
      const resposta = await tx.respostaFormulario.create({
        data: {
          orcamentoId,
          empresa: dados.empresa,
          contatoNome: dados.contatoNome,
          email: dados.email,
          telefone: dados.telefone,
          naturezaContratacao: dados.naturezaContratacao,
          dataLimiteConcorrencia: dados.dataLimiteConcorrencia,
          previsaoInicio: dados.previsaoInicio,
          sondagensStatus: dados.sondagensStatus,
          sondagensArquivoUrl: dados.sondagensArquivoUrl,
          sondagensDetalhes: dados.sondagensDetalhes,
          projetosStatus: dados.projetosStatus,
          projetosArquivoUrl: dados.projetosArquivoUrl,
          tipoFundacao: dados.tipoFundacao,
          especificacoes: dados.especificacoes,
          quantidadeEstacas: dados.quantidadeEstacas,
          profundidadeMedia: dados.profundidadeMedia,
          metragemTotalEstimada: dados.metragemTotalEstimada,
          ensaiosRequeridos: dados.ensaiosRequeridos,
          observacoes: dados.observacoes,
        },
      });

      // Atualizar status do orçamento para AGUARDANDO_ANALISE
      const statusAnterior = magicLink.orcamento.status;
      const orcamentoAtualizado = await tx.orcamento.update({
        where: { id: orcamentoId },
        data: {
          status: 'AGUARDANDO_ANALISE',
        },
      });

      // Invalidar o Magic Link
      await tx.magicLink.update({
        where: { id: magicLink.id },
        data: { used: true },
      });

      // Gravar histórico de auditoria
      await tx.statusLog.create({
        data: {
          orcamentoId,
          statusAnterior,
          statusNovo: 'AGUARDANDO_ANALISE',
          motivo: 'Formulário técnico preenchido e submetido pelo cliente.',
          usuarioNome: `Cliente: ${magicLink.orcamento.lead.nome}`,
        },
      });

      return { resposta, orcamentoAtualizado };
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Formulário enviado com sucesso! Sua solicitação agora está Aguardando Análise.',
        protocolo: magicLink.orcamento.numeroProtocolo,
        status: resultado.orcamentoAtualizado.status,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Erro ao processar envio do formulário:', error);
    return NextResponse.json(
      { error: 'Erro interno ao salvar respostas do formulário.' },
      { status: 500 }
    );
  }
}
