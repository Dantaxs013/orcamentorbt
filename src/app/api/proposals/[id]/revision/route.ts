import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const numId = parseInt(id, 10);
    if (isNaN(numId)) {
      return NextResponse.json([]);
    }

    const revisions = await prisma.proposalRevision.findMany({
      where: { proposalId: numId },
      orderBy: { revisionNumber: 'asc' },
    });

    const formatted = revisions.map((r) => ({
      id: r.id,
      revisionNumber: r.revisionNumber,
      createdBy: r.createdBy,
      notes: r.notes,
      createdAt: r.createdAt.toISOString(),
      snapshot: typeof r.snapshot === 'string' ? JSON.parse(r.snapshot || '{}') : r.snapshot,
    }));

    return NextResponse.json(formatted);
  } catch (err: any) {
    return NextResponse.json({ error: 'Erro ao buscar revisões', details: err.message }, { status: 400 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const numId = parseInt(id, 10);
    const body = await request.json();
    const currentProposal = body.proposal || {};

    const currentRevNumber = currentProposal.revision || 0;
    const nextRevisionNumber = currentRevNumber + 1;

    let createdRev = null;

    if (!isNaN(numId)) {
      try {
        // Grava o snapshot da revisão ATUAL (ex: R0) antes de incrementar para a nova (ex: R1)
        createdRev = await prisma.proposalRevision.create({
          data: {
            proposalId: numId,
            revisionNumber: currentRevNumber,
            snapshot: JSON.stringify(currentProposal),
            createdBy: body.createdBy || currentProposal.techLead || 'Engenharia Piatec',
            notes: body.notes || `Versão R${currentRevNumber} arquivada no histórico.`,
          },
        });

        // Atualiza a proposta para a nova revisão (R1) e status IN_REVISION
        await prisma.proposal.update({
          where: { id: numId },
          data: {
            revision: nextRevisionNumber,
            status: 'IN_REVISION',
          },
        });
      } catch (e) {
        console.warn('Erro na gravação do histórico no banco:', e);
      }
    }

    return NextResponse.json({
      success: true,
      revision: nextRevisionNumber,
      status: 'IN_REVISION',
      revisionRecord: createdRev
        ? {
            id: createdRev.id,
            revisionNumber: createdRev.revisionNumber,
            createdBy: createdRev.createdBy,
            notes: createdRev.notes,
            createdAt: createdRev.createdAt.toISOString(),
            snapshot: currentProposal,
          }
        : null,
      notes: `Revisão R${nextRevisionNumber} criada com sucesso.`,
    });
  } catch (err: any) {
    return NextResponse.json({ error: 'Erro ao gerar revisão', details: err.message }, { status: 400 });
  }
}
