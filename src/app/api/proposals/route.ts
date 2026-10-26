import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { Proposal } from '@/lib/proposals-types';

export async function GET() {
  try {
    const proposals = await prisma.proposal.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        revisions: {
          orderBy: { revisionNumber: 'asc' },
        },
        auditLogs: true,
      },
    });

    if (!proposals || proposals.length === 0) {
      return NextResponse.json([]);
    }

    // Format proposals for frontend including ALL fields and revisions
    const formatted: Proposal[] = proposals.map((p) => ({
      id: p.id,
      code: p.code,
      status: p.status as Proposal['status'],
      groupOrder: p.groupOrder,
      clientName: p.clientName,
      requesterName: p.requesterName,
      requesterEmail: p.requesterEmail,
      deliveryDate: p.deliveryDate ? p.deliveryDate.toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      serviceStartDate: p.serviceStartDate ? p.serviceStartDate.toISOString().split('T')[0] : null,
      contractEndDate: p.contractEndDate ? p.contractEndDate.toISOString().split('T')[0] : null,
      techLead: p.techLead,
      commLead: p.commLead,
      value: Number(p.value || 0),
      revision: p.revision || 0,
      sharepointUrl: p.sharepointUrl || '',
      projectArea: p.projectArea || '',
      quantidade: p.quantidade !== null && p.quantidade !== undefined ? Number(p.quantidade) : undefined,
      unidadeMedida: p.unidadeMedida || '',
      projectType: p.projectType || 'ONSHORE',
      observations: p.observations || '',
      docsReceived: typeof p.docsReceived === 'string' ? JSON.parse(p.docsReceived || '[]') : (p.docsReceived || []),
      revisions: (p.revisions || []).map((r) => ({
        id: r.id,
        proposalId: r.proposalId,
        revisionNumber: r.revisionNumber,
        createdBy: r.createdBy,
        notes: r.notes || '',
        createdAt: r.createdAt.toISOString(),
        snapshot: typeof r.snapshot === 'string' ? JSON.parse(r.snapshot || '{}') : r.snapshot,
      })) as any,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
    }));

    return NextResponse.json(formatted);
  } catch (error) {
    console.warn('Prisma DB connect warning:', error);
    return NextResponse.json([]);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const newProposal = {
      code: body.code || `PROP-2026-${Math.floor(100 + Math.random() * 900)}`,
      status: body.status || 'NEW',
      clientName: body.clientName || 'Novo Cliente',
      requesterName: body.requesterName || 'Contato Principal',
      requesterEmail: body.requesterEmail || 'contato@cliente.com',
      deliveryDate: body.deliveryDate || new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
      serviceStartDate: body.serviceStartDate || null,
      contractEndDate: body.contractEndDate || null,
      techLead: body.techLead || 'Eng. Piatec',
      commLead: body.commLead || 'Gestor Comercial',
      value: Number(body.value || 0),
      revision: 0,
      sharepointUrl: body.sharepointUrl || '',
      projectArea: body.projectArea || '',
      quantidade: body.quantidade !== undefined && body.quantidade !== null && body.quantidade !== '' ? Number(body.quantidade) : null,
      unidadeMedida: body.unidadeMedida || '',
      projectType: body.projectType || 'ONSHORE',
      observations: body.observations || '',
      docsReceived: typeof body.docsReceived === 'string' ? body.docsReceived : JSON.stringify(body.docsReceived || [
        { id: 'memorial', label: 'Memorial Descritivo', received: false },
        { id: 'orcamento', label: 'Planilha Orçamentária', received: false },
        { id: 'cronograma', label: 'Cronograma Físico-Financeiro', received: false },
        { id: 'art', label: 'ART / RRT Técnica', received: false },
        { id: 'minuta', label: 'Minuta de Contrato', received: false },
      ]),
    };

    const created = await prisma.proposal.create({
      data: {
        code: newProposal.code,
        status: newProposal.status as any,
        clientName: newProposal.clientName,
        requesterName: newProposal.requesterName,
        requesterEmail: newProposal.requesterEmail,
        deliveryDate: new Date(newProposal.deliveryDate),
        serviceStartDate: newProposal.serviceStartDate ? new Date(newProposal.serviceStartDate) : null,
        contractEndDate: newProposal.contractEndDate ? new Date(newProposal.contractEndDate) : null,
        techLead: newProposal.techLead,
        commLead: newProposal.commLead,
        value: newProposal.value,
        revision: 0,
        sharepointUrl: newProposal.sharepointUrl,
        projectArea: newProposal.projectArea,
        quantidade: newProposal.quantidade,
        unidadeMedida: newProposal.unidadeMedida,
        projectType: newProposal.projectType,
        observations: newProposal.observations,
        docsReceived: newProposal.docsReceived,
      },
    });

    // Automatically create initial R0 snapshot record
    const r0Snapshot = {
      id: created.id,
      code: newProposal.code,
      status: newProposal.status,
      clientName: newProposal.clientName,
      requesterName: newProposal.requesterName,
      requesterEmail: newProposal.requesterEmail,
      deliveryDate: newProposal.deliveryDate,
      serviceStartDate: newProposal.serviceStartDate,
      contractEndDate: newProposal.contractEndDate,
      techLead: newProposal.techLead,
      commLead: newProposal.commLead,
      value: newProposal.value,
      revision: 0,
      sharepointUrl: newProposal.sharepointUrl,
      projectArea: newProposal.projectArea,
      quantidade: newProposal.quantidade,
      unidadeMedida: newProposal.unidadeMedida,
      projectType: newProposal.projectType,
      observations: newProposal.observations,
      docsReceived: typeof newProposal.docsReceived === 'string' ? JSON.parse(newProposal.docsReceived) : newProposal.docsReceived,
    };

    let initialRevisionObj: any = null;
    try {
      initialRevisionObj = await prisma.proposalRevision.create({
        data: {
          proposalId: created.id,
          revisionNumber: 0,
          createdBy: newProposal.techLead || 'Engenharia Piatec',
          notes: 'Versão R0 inicial cadastrada no sistema.',
          snapshot: JSON.stringify(r0Snapshot),
        },
      });
    } catch (e) {
      console.warn('Warning creating R0 revision record:', e);
    }

    const revisionsArr = initialRevisionObj
      ? [
          {
            id: initialRevisionObj.id,
            proposalId: created.id,
            revisionNumber: 0,
            createdBy: initialRevisionObj.createdBy,
            notes: initialRevisionObj.notes,
            createdAt: initialRevisionObj.createdAt.toISOString(),
            snapshot: r0Snapshot,
          },
        ]
      : [];

    return NextResponse.json(
      {
        ...newProposal,
        id: created.id,
        revisions: revisionsArr,
        docsReceived: typeof newProposal.docsReceived === 'string' ? JSON.parse(newProposal.docsReceived) : newProposal.docsReceived,
        createdAt: created.createdAt.toISOString(),
        updatedAt: created.updatedAt.toISOString(),
      },
      { status: 201 }
    );
  } catch (err: any) {
    console.error('Erro ao criar proposta:', err);
    return NextResponse.json({ error: 'Erro ao criar proposta', details: err.message }, { status: 400 });
  }
}
