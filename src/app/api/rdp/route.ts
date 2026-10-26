import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from '@/lib/session';
import { applySecurityHeaders } from '@/lib/security-headers';
import { stripFinancialData, isAdmin } from '@/lib/auth';
import { RelatorioDiarioSchema } from '@/lib/validations/rdp.schema';
import { validateRdpSubmission, calculateLineMetrics } from '@/lib/calculations/rdp-math';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const session = await getServerSession();
  if (!session?.user) {
    const res = NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    return applySecurityHeaders(res);
  }
  if (!session.user.acessoMedicao && !isAdmin(session.user.role)) {
    const res = NextResponse.json({ error: 'Acesso negado ao módulo de Medição' }, { status: 403 });
    return applySecurityHeaders(res);
  }

  const { searchParams } = new URL(request.url);
  const obraId = searchParams.get('obraId');
  const status = searchParams.get('status');
  const data = searchParams.get('data');

  try {
    const whereClause: Record<string, unknown> = {};

    // If Apontador, scope to their own reports
    if (session.user.role === 'APONTADOR') {
      whereClause.apontadorId = session.user.id;
    }

    if (obraId) {
      whereClause.obraId = obraId;
    }

    if (status) {
      whereClause.status = status;
    }

    if (data) {
      const parsedDate = new Date(data);
      if (!isNaN(parsedDate.getTime())) {
        const startOfDay = new Date(parsedDate.setHours(0, 0, 0, 0));
        const endOfDay = new Date(parsedDate.setHours(23, 59, 59, 999));
        whereClause.data = {
          gte: startOfDay,
          lte: endOfDay,
        };
      }
    }

    const relatorios = await prisma.relatorioDiario.findMany({
      where: whereClause,
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
        linhasProducao: {
          orderBy: { numeroLinha: 'asc' },
        },
      },
      orderBy: { data: 'desc' },
      take: 50,
    });

    // Enforce strict financial data stripping for all responses if user is Apontador
    const sanitized = session.user.role === 'APONTADOR' ? stripFinancialData(relatorios) : relatorios;
    const res = NextResponse.json({ relatorios: sanitized }, { status: 200 });
    return applySecurityHeaders(res);
  } catch (error) {
    console.error('[API /api/rdp GET] Erro ao listar relatórios:', error);
    const res = NextResponse.json({ error: 'Erro interno ao consultar relatórios' }, { status: 500 });
    return applySecurityHeaders(res);
  }
}

export async function POST(request: NextRequest) {
  const session = await getServerSession();
  if (!session?.user) {
    const res = NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    return applySecurityHeaders(res);
  }
  if (!session.user.acessoMedicao && !isAdmin(session.user.role)) {
    const res = NextResponse.json({ error: 'Acesso negado ao módulo de Medição' }, { status: 403 });
    return applySecurityHeaders(res);
  }

  try {
    const body = await request.json();

    // Validate with Zod schema
    const parseResult = RelatorioDiarioSchema.safeParse(body);
    if (!parseResult.success) {
      const res = NextResponse.json(
        { error: 'Dados inválidos', details: parseResult.error.flatten() },
        { status: 400 }
      );
      return applySecurityHeaders(res);
    }

    const input = parseResult.data;

    // If status is SUBMETIDO, run full business domain validation
    if (input.status === 'SUBMETIDO') {
      const submissionValidation = validateRdpSubmission({
        ...input,
        data: input.data.toISOString().split('T')[0],
      });

      if (!submissionValidation.valid) {
        const res = NextResponse.json(
          { error: 'Falha na validação de submissão do RDP', errors: submissionValidation.errors },
          { status: 422 }
        );
        return applySecurityHeaders(res);
      }
    }

    // Check obra exists
    const obra = await prisma.obra.findUnique({
      where: { id: input.obraId },
    });

    if (!obra) {
      const res = NextResponse.json({ error: 'Obra não encontrada' }, { status: 404 });
      return applySecurityHeaders(res);
    }

    // Determine numeroSequencial if not provided or 0
    let seqNum = input.numeroSequencial;
    if (!seqNum || seqNum <= 0) {
      const lastRdp = await prisma.relatorioDiario.findFirst({
        where: { obraId: input.obraId },
        orderBy: { numeroSequencial: 'desc' },
      });
      seqNum = (lastRdp?.numeroSequencial || 0) + 1;
    }

    // Map lines to database format
    const linesToInsert = (input.linhas || []).slice(0, 25).map((rawLine, index) => {
      const metrics = calculateLineMetrics({
        ...rawLine,
        numeroLinha: rawLine.numeroLinha ?? index + 1,
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

    // Check if updating existing by ID or creating new
    let savedRelatorio;
    if (input.id) {
      // Update existing
      savedRelatorio = await prisma.$transaction(async (tx) => {
        // Delete existing lines
        await tx.linhaProducao.deleteMany({
          where: { relatorioId: input.id },
        });

        // Update report and re-create lines
        return await tx.relatorioDiario.update({
          where: { id: input.id },
          data: {
            data: input.data,
            turno: input.turno,
            horaInicio: input.horaInicio || input.horarioInicio,
            horaFim: input.horaFim || input.horarioTermino,
            maquinaEquipamento: input.maquinaEquipamento,
            operador: input.operador,
            encarregado: input.encarregado,
            equipeDescricao: input.equipeDescricao,
            condicaoClimatica: input.condicaoClimatica,
            status: input.status,
            observacoes: input.observacoes,
            motivoRejeicao: input.motivoRejeicao,
            assinadoApontador: input.assinadoApontador ?? false,
            dataAssinaturaApontador: input.assinadoApontador ? input.dataAssinaturaApontador || new Date() : null,
            linhasProducao: {
              create: linesToInsert,
            },
          },
          include: {
            obra: {
              select: { id: true, codigo: true, nome: true, cliente: true, cidade: true, estado: true },
            },
            linhasProducao: {
              orderBy: { numeroLinha: 'asc' },
            },
          },
        });
      });
    } else {
      // Create new
      savedRelatorio = await prisma.relatorioDiario.create({
        data: {
          obraId: input.obraId,
          apontadorId: session.user.id,
          numeroSequencial: seqNum,
          data: input.data,
          turno: input.turno,
          horaInicio: input.horaInicio || input.horarioInicio,
          horaFim: input.horaFim || input.horarioTermino,
          maquinaEquipamento: input.maquinaEquipamento,
          operador: input.operador,
          encarregado: input.encarregado,
          equipeDescricao: input.equipeDescricao,
          condicaoClimatica: input.condicaoClimatica,
          status: input.status,
          observacoes: input.observacoes,
          motivoRejeicao: input.motivoRejeicao,
          assinadoApontador: input.assinadoApontador ?? false,
          dataAssinaturaApontador: input.assinadoApontador ? input.dataAssinaturaApontador || new Date() : null,
          linhasProducao: {
            create: linesToInsert,
          },
        },
        include: {
          obra: {
            select: { id: true, codigo: true, nome: true, cliente: true, cidade: true, estado: true },
          },
          linhasProducao: {
            orderBy: { numeroLinha: 'asc' },
          },
        },
      });
    }

    const sanitized = session.user.role === 'APONTADOR' ? stripFinancialData(savedRelatorio) : savedRelatorio;
    const res = NextResponse.json(
      { success: true, relatorio: sanitized, message: 'RDP salvo com sucesso' },
      { status: input.id ? 200 : 201 }
    );
    return applySecurityHeaders(res);
  } catch (error: any) {
    console.error('[API /api/rdp POST] Erro ao salvar RDP:', error);
    if (error.code === 'P2002') {
      const res = NextResponse.json(
        { error: 'Já existe um relatório com este número sequencial para esta obra' },
        { status: 409 }
      );
      return applySecurityHeaders(res);
    }

    const res = NextResponse.json({ error: 'Erro interno ao salvar RDP' }, { status: 500 });
    return applySecurityHeaders(res);
  }
}
