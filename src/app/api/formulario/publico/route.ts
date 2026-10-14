import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { respostaFormularioSchema } from '@/lib/validations/orcamento.schema';
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
 * POST /api/formulario/publico
 * Endpoint aberto para clientes que acessam o link permanente configurado na auto-resposta de e-mail.
 * Recebe todas as informações cadastrais e técnicas da obra, cria o Lead, o Orçamento
 * com status imediato 'AGUARDANDO_ANALISE', grava a RespostaFormulario e o StatusLog.
 */
export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    // Rate limit: máximo de 15 envios por minuto por IP para evitar abuso ou spam
    const rateLimitResult = checkRateLimit(`formulario-publico:${ip}`, 15, 60000);

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        {
          error: `Muitas solicitações enviadas em curto intervalo. Aguarde ${rateLimitResult.retryAfterSeconds} segundos antes de tentar novamente.`,
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
    const parseResult = respostaFormularioSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: 'Dados inválidos no formulário. Verifique os campos obrigatórios.',
          detalhes: parseResult.error.format(),
        },
        { status: 400 }
      );
    }

    const dados = parseResult.data;

    // Transação atômica completa para integridade dos dados
    const resultado = await prisma.$transaction(async (tx) => {
      // 1. Localizar ou cadastrar o Lead
      const emailNormalizado = dados.email.toLowerCase().trim();
      let lead = await tx.lead.findFirst({
        where: { email: emailNormalizado },
      });

      if (!lead) {
        lead = await tx.lead.create({
          data: {
            nome: dados.contatoNome,
            email: emailNormalizado,
            telefone: dados.telefone,
            empresa: dados.empresa,
            mensagemInicial: dados.observacoes
              ? `[Auto-Resposta E-mail] Obs: ${dados.observacoes}`
              : 'Solicitação recebida via Formulário Público RBT (Auto-Resposta de E-mail)',
          },
        });
      } else {
        // Atualiza dados cadastrais se o lead já existir
        lead = await tx.lead.update({
          where: { id: lead.id },
          data: {
            nome: dados.contatoNome,
            telefone: dados.telefone,
            empresa: dados.empresa,
          },
        });
      }

      // 2. Gerar número de protocolo sequencial
      const ano = new Date().getFullYear();
      const count = await tx.orcamento.count();
      const numeroProtocolo = `ORC-${ano}-${(count + 1).toString().padStart(4, '0')}`;

      // 3. Criar o Orçamento com status direto 'AGUARDANDO_ANALISE'
      const orcamento = await tx.orcamento.create({
        data: {
          numeroProtocolo,
          status: 'AGUARDANDO_ANALISE',
          leadId: lead.id,
        },
      });

      // 4. Salvar as Respostas Técnicas do Formulário
      const resposta = await tx.respostaFormulario.create({
        data: {
          orcamentoId: orcamento.id,
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

      // 5. Registrar histórico de auditoria no log
      await tx.statusLog.create({
        data: {
          orcamentoId: orcamento.id,
          statusAnterior: null,
          statusNovo: 'AGUARDANDO_ANALISE',
          motivo: 'Solicitação técnica enviada diretamente pelo cliente via formulário público permanente.',
          usuarioNome: `Cliente: ${dados.contatoNome} (${dados.empresa})`,
        },
      });

      return { orcamento, lead, resposta };
    });

    return NextResponse.json(
      {
        success: true,
        protocolo: resultado.orcamento.numeroProtocolo,
        status: resultado.orcamento.status,
        message: 'Solicitação de orçamento recebida com sucesso! Protocolo gerado.',
        orcamentoId: resultado.orcamento.id,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Erro ao processar formulário público:', error);
    return NextResponse.json(
      { error: 'Erro interno no servidor ao processar o formulário. Tente novamente em instantes.' },
      { status: 500 }
    );
  }
}
