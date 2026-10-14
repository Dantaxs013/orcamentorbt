import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from '@/lib/session';

interface RouteContext {
  params: {
    id: string;
  };
}

/**
 * DELETE /api/orcamentos/[id]
 * Exclui permanentemente um orçamento e seus dados vinculados (respostas, proposta, magic link e logs em cascata).
 * Caso o Lead associado não possua nenhum outro orçamento, também o remove para manter o banco limpo.
 */
export async function DELETE(req: NextRequest, { params }: RouteContext) {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: 'Acesso restrito. Faça login.' }, { status: 401 });
  }

  try {
    const { id } = params;

    const orcamento = await prisma.orcamento.findUnique({
      where: { id },
      include: {
        lead: {
          include: {
            orcamentos: true,
          },
        },
      },
    });

    if (!orcamento) {
      return NextResponse.json({ error: 'Orçamento não encontrado.' }, { status: 404 });
    }

    const leadId = orcamento.leadId;
    const leadTotalOrcamentos = orcamento.lead.orcamentos.length;

    // Remove o orçamento (onDelete: Cascade remove automaticamente magicLink, respostaFormulario, propostaComercial e logs)
    await prisma.orcamento.delete({
      where: { id },
    });

    // Se este lead só tinha este orçamento, limpa o lead órfão
    if (leadTotalOrcamentos <= 1) {
      await prisma.lead.delete({
        where: { id: leadId },
      }).catch(() => {
        // Ignora caso haja restrição pontual
      });
    }

    return NextResponse.json({
      success: true,
      message: `Orçamento ${orcamento.numeroProtocolo} excluído com sucesso.`,
    });
  } catch (error) {
    console.error('Erro ao excluir orçamento:', error);
    return NextResponse.json(
      { error: 'Erro interno ao excluir orçamento.' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/orcamentos/[id]
 * Permite atribuir ou alterar o orçamentista responsável pela solicitação
 */
export async function PATCH(req: NextRequest, { params }: RouteContext) {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: 'Acesso restrito. Faça login.' }, { status: 401 });
  }

  try {
    const { id } = params;
    const body = await req.json();
    const { orcamentistaId } = body;

    const orcamento = await prisma.orcamento.findUnique({
      where: { id },
    });

    if (!orcamento) {
      return NextResponse.json({ error: 'Orçamento não encontrado.' }, { status: 404 });
    }

    let orcamentistaNome = 'Nenhum';
    if (orcamentistaId) {
      const orcamentistaUser = await prisma.user.findUnique({
        where: { id: orcamentistaId },
      });
      if (orcamentistaUser) {
        orcamentistaNome = orcamentistaUser.name;
      }
    }

    const atualizado = await prisma.orcamento.update({
      where: { id },
      data: {
        orcamentistaId: orcamentistaId || null,
      },
      include: {
        orcamentista: {
          select: { id: true, name: true, email: true, role: true },
        },
      },
    });

    // Registrar log
    await prisma.statusLog.create({
      data: {
        orcamentoId: id,
        statusAnterior: orcamento.status,
        statusNovo: orcamento.status,
        motivo: orcamentistaId
          ? `Responsável técnico definido para ${orcamentistaNome}.`
          : 'Responsável técnico desvinculado.',
        usuarioId: session.user.id,
        usuarioNome: session.user.name,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Responsável atualizado com sucesso.',
      orcamento: atualizado,
    });
  } catch (error) {
    console.error('Erro ao atualizar orçamentista do orçamento:', error);
    return NextResponse.json(
      { error: 'Erro interno ao atualizar responsável.' },
      { status: 500 }
    );
  }
}
