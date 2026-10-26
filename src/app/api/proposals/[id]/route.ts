import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const numId = parseInt(id, 10);
    const body = await request.json();

    const updateData: any = {};

    if (body.code !== undefined) updateData.code = body.code;
    if (body.status !== undefined) updateData.status = body.status;
    if (body.clientName !== undefined) updateData.clientName = body.clientName;
    if (body.requesterName !== undefined) updateData.requesterName = body.requesterName;
    if (body.requesterEmail !== undefined) updateData.requesterEmail = body.requesterEmail;
    if (body.techLead !== undefined) updateData.techLead = body.techLead;
    if (body.commLead !== undefined) updateData.commLead = body.commLead;
    if (body.value !== undefined) updateData.value = Number(body.value);
    if (body.revision !== undefined) updateData.revision = Number(body.revision);
    if (body.docsReceived !== undefined) updateData.docsReceived = typeof body.docsReceived === 'string' ? body.docsReceived : JSON.stringify(body.docsReceived || []);
    if (body.sharepointUrl !== undefined) updateData.sharepointUrl = body.sharepointUrl;
    if (body.projectArea !== undefined) updateData.projectArea = body.projectArea;
    if (body.quantidade !== undefined) {
      updateData.quantidade = body.quantidade !== null && body.quantidade !== '' ? Number(body.quantidade) : null;
    }
    if (body.unidadeMedida !== undefined) updateData.unidadeMedida = body.unidadeMedida;
    if (body.projectType !== undefined) updateData.projectType = body.projectType;
    if (body.observations !== undefined) updateData.observations = body.observations;

    if (body.deliveryDate) updateData.deliveryDate = new Date(body.deliveryDate);
    if (body.serviceStartDate !== undefined) {
      updateData.serviceStartDate = body.serviceStartDate ? new Date(body.serviceStartDate) : null;
    }
    if (body.contractEndDate !== undefined) {
      updateData.contractEndDate = body.contractEndDate ? new Date(body.contractEndDate) : null;
    }

    try {
      if (!isNaN(numId)) {
        const updated = await prisma.proposal.update({
          where: { id: numId },
          data: updateData,
        });

        return NextResponse.json({
          ...updated,
          value: Number(updated.value),
          quantidade: updated.quantidade !== null && updated.quantidade !== undefined ? Number(updated.quantidade) : null,
          unidadeMedida: updated.unidadeMedida || '',
          deliveryDate: updated.deliveryDate ? updated.deliveryDate.toISOString().split('T')[0] : null,
          serviceStartDate: updated.serviceStartDate ? updated.serviceStartDate.toISOString().split('T')[0] : null,
          contractEndDate: updated.contractEndDate ? updated.contractEndDate.toISOString().split('T')[0] : null,
          docsReceived: typeof updated.docsReceived === 'string' ? JSON.parse(updated.docsReceived || '[]') : updated.docsReceived,
        });
      }
      return NextResponse.json({ id, ...body });
    } catch (err: any) {
      console.error('Database update error:', err);
      return NextResponse.json({ id, ...body });
    }
  } catch (err: any) {
    return NextResponse.json({ error: 'Erro ao atualizar proposta', details: err.message }, { status: 400 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const numId = parseInt(id, 10);
    if (!isNaN(numId)) {
      try {
        await prisma.proposal.delete({ where: { id: numId } });
      } catch (err) {
        console.warn('Database delete warning:', err);
      }
    }
    return NextResponse.json({ success: true, id });
  } catch (err: any) {
    return NextResponse.json({ error: 'Erro ao remover proposta', details: err.message }, { status: 400 });
  }
}
