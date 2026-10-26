import React from 'react';
import { redirect } from 'next/navigation';
import { getServerSession } from '@/lib/session';
import { prisma } from '@/lib/db';
import { GestaoEstacasClient } from '@/components/medicao/estacas/gestao-estacas-client';

export const dynamic = 'force-dynamic';

export default async function EstacasPage() {
  const session = await getServerSession();
  if (!session?.user) redirect('/login');

  const [obrasRaw, estacasRaw] = await Promise.all([
    prisma.obra.findMany({
      where: { ativo: true },
      select: { id: true, nome: true, codigo: true },
      orderBy: { codigo: 'asc' },
    }),
    prisma.estacaPrincipal.findMany({
      where: { ativo: true },
      include: {
        obra: { select: { id: true, nome: true, codigo: true } },
      },
      orderBy: { nome: 'asc' },
    }),
  ]);

  const estacas = estacasRaw.map((e) => ({
    id: e.id,
    obraId: e.obraId,
    obraNome: e.obra?.nome || null,
    obraCodigo: e.obra?.codigo || null,
    nome: e.nome,
    perfil: e.perfil,
    comprimento: Number(e.comprimento) || 0,
    status: e.status,
    observacao: e.observacao,
    createdAt: e.createdAt.toISOString(),
  }));

  return (
    <GestaoEstacasClient
      initialEstacas={estacas}
      obras={obrasRaw}
    />
  );
}
