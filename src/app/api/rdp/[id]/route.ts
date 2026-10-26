import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from '@/lib/session';
import { applySecurityHeaders } from '@/lib/security-headers';
import { stripFinancialData, isAdmin } from '@/lib/auth';
import { calculateLineMetrics } from '@/lib/calculations/rdp-math';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession();
  if (!session?.user) {
    const res = NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    return applySecurityHeaders(res);
  }
  if (!session.user.acessoMedicao && !isAdmin(session.user.role)) {
    const res = NextResponse.json({ error: 'Acesso negado ao módulo de Medição' }, { status: 403 });
    return applySecurityHeaders(res);
  }

  const { id } = params;

  try {
    const rdp = await prisma.relatorioDiario.findUnique({
      where: { id },
      include: {
        obra: {
          select: {
            id: true,
            codigo: true,
            nome: true,
            cliente: true,
            cidade: true,
            estado: true,
          },
        },
        apontador: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        revisor: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        linhasProducao: {
          orderBy: { numeroLinha: 'asc' },
        },
      },
    });

    if (!rdp) {
      const res = NextResponse.json({ error: 'Relatório não encontrado' }, { status: 404 });
      return applySecurityHeaders(res);
    }

    // Role check: If Apontador, can only view if own report
    if (session.user.role === 'APONTADOR' && rdp.apontadorId !== session.user.id) {
      const res = NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
      return applySecurityHeaders(res);
    }

    const sanitized = session.user.role === 'APONTADOR' ? stripFinancialData(rdp) : rdp;
    const res = NextResponse.json({ relatorio: sanitized }, { status: 200 });
    return applySecurityHeaders(res);
  } catch (error) {
    console.error('[API /api/rdp/[id] GET] Erro ao buscar RDP:', error);
    const res = NextResponse.json({ error: 'Erro interno ao consultar relatório' }, { status: 500 });
    return applySecurityHeaders(res);
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession();
  if (!session?.user) {
    const res = NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    return applySecurityHeaders(res);
  }
  if (!session.user.acessoMedicao && !isAdmin(session.user.role)) {
    const res = NextResponse.json({ error: 'Acesso negado ao módulo de Medição' }, { status: 403 });
    return applySecurityHeaders(res);
  }

  const { id } = params;

  try {
    const existing = await prisma.relatorioDiario.findUnique({
      where: { id },
    });

    if (!existing) {
      const res = NextResponse.json({ error: 'Relatório não encontrado' }, { status: 404 });
      return applySecurityHeaders(res);
    }

    // Apontador can only edit if status is RASCUNHO or REJEITADO
    if (session.user.role === 'APONTADOR') {
      if (existing.apontadorId !== session.user.id) {
        const res = NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
        return applySecurityHeaders(res);
      }
      if (existing.status !== 'RASCUNHO' && existing.status !== 'REJEITADO') {
        const res = NextResponse.json(
          { error: 'Não é possível alterar um relatório já submetido ou aprovado' },
          { status: 403 }
        );
        return applySecurityHeaders(res);
      }
    }

    const body = await request.json();

    // Partial updates allowed
    const updateData: Record<string, unknown> = {};

    if (body.status !== undefined) {
      updateData.status = body.status;
    }
    if (body.motivoRejeicao !== undefined) {
      updateData.motivoRejeicao = body.motivoRejeicao;
    }
    if (body.observacoes !== undefined) {
      updateData.observacoes = body.observacoes;
    }
    if (body.maquinaEquipamento !== undefined) {
      updateData.maquinaEquipamento = body.maquinaEquipamento;
    }
    if (body.operador !== undefined) {
      updateData.operador = body.operador;
    }
    if (body.encarregado !== undefined) {
      updateData.encarregado = body.encarregado;
    }
    if (body.soldador !== undefined) {
      updateData.soldador = body.soldador;
    }
    if (body.equipeDescricao !== undefined) {
      updateData.equipeDescricao = body.equipeDescricao;
    }
    if (body.condicaoClimatica !== undefined) {
      updateData.condicaoClimatica = body.condicaoClimatica;
    }
    if (body.assinadoApontador !== undefined) {
      updateData.assinadoApontador = body.assinadoApontador;
      updateData.dataAssinaturaApontador = body.assinadoApontador ? new Date() : null;
    }
    if (body.assinadoEngenheiro !== undefined && session.user.role !== 'APONTADOR') {
      updateData.assinadoEngenheiro = body.assinadoEngenheiro;
      updateData.dataAssinaturaEngenheiro = body.assinadoEngenheiro ? new Date() : null;
      updateData.revisadoPorId = session.user.id;
    }

    // If lines are updated
    if (Array.isArray(body.linhas)) {
      const linesToInsert = body.linhas.slice(0, 25).map((rawLine: any, index: number) => {
        const metrics = calculateLineMetrics({
          ...rawLine,
          numeroLinha: rawLine.numeroLinha || index + 1,
        });

        return {
          numeroLinha: metrics.numeroLinha,
          numeroEstaca: metrics.numeroEstaca,
          perfil: metrics.perfil,
          horaInicio: metrics.horaInicio,
          horaFim: metrics.horaFim,
          profundidade: metrics.comprimento,
          cotaTerreno: metrics.cotaTerreno,
          cotaArrasamento: metrics.cotaArrasamento,
          comprimentoUtil: metrics.comprimentoUtil,
          emendaW150: metrics.emendaW150,
          emendaW310: metrics.emendaW310,
          talas: metrics.talas,
          arrasamento: metrics.arrasamento,
          tempoParadaMinutos: metrics.tempoParadaMinutos || 0,
          motivoParada: metrics.motivoParada,
          observacao: metrics.observacao,
        };
      });

      const updated = await prisma.$transaction(async (tx) => {
        await tx.linhaProducao.deleteMany({
          where: { relatorioId: id },
        });

        return await tx.relatorioDiario.update({
          where: { id },
          data: {
            ...updateData,
            linhasProducao: {
              create: linesToInsert,
            },
          },
          include: {
            obra: { select: { id: true, codigo: true, nome: true, cliente: true, cidade: true, estado: true } },
            linhasProducao: { orderBy: { numeroLinha: 'asc' } },
          },
        });
      });

      const sanitized = session.user.role === 'APONTADOR' ? stripFinancialData(updated) : updated;
      const res = NextResponse.json({ success: true, relatorio: sanitized }, { status: 200 });
      return applySecurityHeaders(res);
    }

    const updated = await prisma.relatorioDiario.update({
      where: { id },
      data: updateData,
      include: {
        obra: { select: { id: true, codigo: true, nome: true, cliente: true, cidade: true, estado: true } },
        linhasProducao: { orderBy: { numeroLinha: 'asc' } },
      },
    });

    const sanitized = session.user.role === 'APONTADOR' ? stripFinancialData(updated) : updated;
    const res = NextResponse.json({ success: true, relatorio: sanitized }, { status: 200 });
    return applySecurityHeaders(res);
  } catch (error) {
    console.error('[API /api/rdp/[id] PUT] Erro ao atualizar RDP:', error);
    const res = NextResponse.json({ error: 'Erro interno ao atualizar relatório' }, { status: 500 });
    return applySecurityHeaders(res);
  }
}
