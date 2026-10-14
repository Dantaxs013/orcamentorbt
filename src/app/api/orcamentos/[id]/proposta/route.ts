import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from '@/lib/session';
import { propostaComercialSchema } from '@/lib/validations/orcamento.schema';
import { generatePropostaPdfBuffer } from '@/lib/pdf/proposta-pdf';
import { sendPropostaEmail } from '@/lib/email';

interface RouteContext {
  params: {
    id: string;
  };
}

/**
 * GET /api/orcamentos/[id]/proposta
 * Gera e retorna diretamente o arquivo binário do PDF da proposta comercial
 */
export async function GET(req: NextRequest, { params }: RouteContext) {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: 'Acesso restrito. Faça login.' }, { status: 401 });
  }

  try {
    const { id } = params;

    const orcamento = await prisma.orcamento.findUnique({
      where: { id },
      include: {
        lead: true,
        respostaFormulario: true,
        propostaComercial: true,
      },
    });

    if (!orcamento || !orcamento.propostaComercial) {
      return NextResponse.json(
        { error: 'Proposta comercial ainda não elaborada para este orçamento.' },
        { status: 404 }
      );
    }

    const proposta = orcamento.propostaComercial;
    const resp = orcamento.respostaFormulario;

    const pdfBuffer = await generatePropostaPdfBuffer({
      protocolo: orcamento.numeroProtocolo,
      dataEmissao: new Date(proposta.geradaEm).toLocaleDateString('pt-BR'),
      cliente: {
        nome: orcamento.lead.nome,
        email: orcamento.lead.email,
        telefone: orcamento.lead.telefone,
        empresa: orcamento.lead.empresa,
      },
      especificacoes: {
        tipoServico: resp?.tipoFundacao || 'Fundações Especiais RBT',
        detalhes: resp?.observacoes || resp?.especificacoes || `Tipo: ${resp?.tipoFundacao || 'Estacas'}. Quantidade: ${resp?.quantidadeEstacas || 1} un. Profundidade média: ${resp?.profundidadeMedia || 0}m. Metragem: ${resp?.metragemTotalEstimada || 0}m. Sondagens: ${resp?.sondagensStatus || '-'}. Projetos: ${resp?.projetosStatus || '-'}.`,
        dimensoes: resp?.profundidadeMedia ? `${resp.profundidadeMedia}m prof.` : undefined,
        quantidade: resp?.quantidadeEstacas || 1,
        material: resp?.tipoFundacao,
        prazoDesejado: resp?.previsaoInicio,
        localEntrega: resp?.naturezaContratacao,
      },
      comercial: {
        custoMaoDeObra: Number(proposta.custoMaoDeObra),
        custoMateriais: Number(proposta.custoMateriais),
        custosExtras: Number(proposta.custosExtras),
        bdiMargemPerc: Number(proposta.bdiMargemPerc),
        valorTotal: Number(proposta.valorTotal),
        condicoesPagamento: proposta.condicoesPagamento,
        prazoExecucaoDias: proposta.prazoExecucaoDias,
        validadeDias: proposta.validadePropostaDias,
        observacoes: proposta.observacoes,
      },
    });

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="Proposta_${orcamento.numeroProtocolo}.pdf"`,
      },
    });
  } catch (error) {
    console.error('Erro ao gerar PDF da proposta:', error);
    return NextResponse.json(
      { error: 'Erro ao gerar documento PDF da proposta.' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/orcamentos/[id]/proposta
 * Salva a precificação do orçamentista, gera o PDF e dispara o e-mail ao cliente
 */
export async function POST(req: NextRequest, { params }: RouteContext) {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: 'Acesso restrito. Faça login.' }, { status: 401 });
  }

  try {
    const { id } = params;
    const body = await req.json();

    const parseResult = propostaComercialSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: 'Dados de precificação inválidos.',
          detalhes: parseResult.error.format(),
        },
        { status: 400 }
      );
    }

    const dados = parseResult.data;

    const orcamento = await prisma.orcamento.findUnique({
      where: { id },
      include: {
        lead: true,
        respostaFormulario: true,
      },
    });

    if (!orcamento) {
      return NextResponse.json({ error: 'Orçamento não encontrado.' }, { status: 404 });
    }

    // Upsert da proposta comercial
    const proposta = await prisma.propostaComercial.upsert({
      where: { orcamentoId: id },
      update: {
        custoMaoDeObra: dados.custoMaoDeObra,
        custoMateriais: dados.custoMateriais,
        custosExtras: dados.custosExtras,
        bdiMargemPerc: dados.bdiMargemPerc,
        valorTotal: dados.valorTotal,
        condicoesPagamento: dados.condicoesPagamento,
        prazoExecucaoDias: dados.prazoExecucaoDias,
        validadePropostaDias: dados.validadePropostaDias,
        observacoes: dados.observacoes,
        enviadaEm: dados.enviarEmailCliente ? new Date() : undefined,
      },
      create: {
        orcamentoId: id,
        custoMaoDeObra: dados.custoMaoDeObra,
        custoMateriais: dados.custoMateriais,
        custosExtras: dados.custosExtras,
        bdiMargemPerc: dados.bdiMargemPerc,
        valorTotal: dados.valorTotal,
        condicoesPagamento: dados.condicoesPagamento,
        prazoExecucaoDias: dados.prazoExecucaoDias,
        validadePropostaDias: dados.validadePropostaDias,
        observacoes: dados.observacoes,
        enviadaEm: dados.enviarEmailCliente ? new Date() : undefined,
      },
    });

    // Atualiza status do orçamento para PROPOSTA_ENVIADA se solicitado envio
    const statusAnterior = orcamento.status;
    const novoStatus = dados.enviarEmailCliente ? 'PROPOSTA_ENVIADA' : 'EM_ANALISE';

    await prisma.orcamento.update({
      where: { id },
      data: {
        status: novoStatus,
        orcamentistaId: session.user.id,
      },
    });

    // Gera PDF Buffer
    const pdfBuffer = await generatePropostaPdfBuffer({
      protocolo: orcamento.numeroProtocolo,
      dataEmissao: new Date().toLocaleDateString('pt-BR'),
      cliente: {
        nome: orcamento.lead.nome,
        email: orcamento.lead.email,
        telefone: orcamento.lead.telefone,
        empresa: orcamento.lead.empresa,
      },
      especificacoes: {
        tipoServico: orcamento.respostaFormulario?.tipoFundacao || 'Fundações Especiais RBT',
        detalhes: orcamento.respostaFormulario?.observacoes || orcamento.respostaFormulario?.especificacoes || `Tipo: ${orcamento.respostaFormulario?.tipoFundacao || 'Estacas'}. Quantidade: ${orcamento.respostaFormulario?.quantidadeEstacas || 1} un. Profundidade média: ${orcamento.respostaFormulario?.profundidadeMedia || 0}m. Metragem: ${orcamento.respostaFormulario?.metragemTotalEstimada || 0}m. Sondagens: ${orcamento.respostaFormulario?.sondagensStatus || '-'}. Projetos: ${orcamento.respostaFormulario?.projetosStatus || '-'}.`,
        dimensoes: orcamento.respostaFormulario?.profundidadeMedia ? `${orcamento.respostaFormulario.profundidadeMedia}m prof.` : undefined,
        quantidade: orcamento.respostaFormulario?.quantidadeEstacas || 1,
        material: orcamento.respostaFormulario?.tipoFundacao,
        prazoDesejado: orcamento.respostaFormulario?.previsaoInicio,
        localEntrega: orcamento.respostaFormulario?.naturezaContratacao,
      },
      comercial: {
        custoMaoDeObra: dados.custoMaoDeObra,
        custoMateriais: dados.custoMateriais,
        custosExtras: dados.custosExtras,
        bdiMargemPerc: dados.bdiMargemPerc,
        valorTotal: dados.valorTotal,
        condicoesPagamento: dados.condicoesPagamento,
        prazoExecucaoDias: dados.prazoExecucaoDias,
        validadeDias: dados.validadePropostaDias,
        observacoes: dados.observacoes,
      },
    });

    let emailStatus: { success: boolean; simulated?: boolean } = {
      success: false,
      simulated: false,
    };

    if (dados.enviarEmailCliente) {
      emailStatus = await sendPropostaEmail({
        to: orcamento.lead.email,
        clienteNome: orcamento.lead.nome,
        protocolo: orcamento.numeroProtocolo,
        valorTotal: dados.valorTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
        pdfBuffer,
      });
    }

    // Log de auditoria
    await prisma.statusLog.create({
      data: {
        orcamentoId: id,
        statusAnterior,
        statusNovo: novoStatus,
        motivo: dados.enviarEmailCliente
          ? `Proposta comercial elaborada no valor de ${dados.valorTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} e despachada para ${orcamento.lead.email}.`
          : 'Precificação salva como rascunho em análise.',
        usuarioId: session.user.id,
        usuarioNome: session.user.name,
      },
    });

    return NextResponse.json({
      success: true,
      message: dados.enviarEmailCliente
        ? 'Proposta gerada com sucesso e enviada ao cliente!'
        : 'Precificação salva com sucesso!',
      propostaId: proposta.id,
      pdfUrl: `/api/orcamentos/${id}/proposta`,
      emailStatus,
    });
  } catch (error) {
    console.error('Erro ao salvar proposta comercial:', error);
    return NextResponse.json(
      { error: 'Erro interno ao processar proposta comercial.' },
      { status: 500 }
    );
  }
}
