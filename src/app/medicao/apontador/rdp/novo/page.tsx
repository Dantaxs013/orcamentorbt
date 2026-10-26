import React from 'react';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { getServerSession } from '@/lib/session';
import { stripFinancialData } from '@/lib/auth';
import { RdpFormClient } from '@/components/medicao/rdp/rdp-form-client';

export const metadata = {
  title: 'Novo RDP - RBT Fundações',
};

export default async function NovoRdpPage() {
  const session = await getServerSession();
  if (!session?.user) {
    redirect('/login');
  }

  // Fetch active obras with STRICT field selection (NO financial fields)
  const obrasRaw = await prisma.obra.findMany({
    where: { ativo: true },
    select: {
      id: true,
      codigo: true,
      nome: true,
      cliente: true,
      cidade: true,
      estado: true,
    },
    orderBy: { codigo: 'asc' },
  }).catch(() => []);

  // Enforce sanitization
  const obras = stripFinancialData(obrasRaw);

  // Fetch active estacas for autocomplete
  const estacasRaw = await prisma.estacaPrincipal.findMany({
    where: { ativo: true },
    select: {
      id: true,
      obraId: true,
      nome: true,
      perfil: true,
      comprimento: true,
    },
    orderBy: { nome: 'asc' },
  }).catch(() => []);

  const estacas = estacasRaw.map((e) => ({
    id: e.id,
    obraId: e.obraId,
    nome: e.nome,
    perfil: e.perfil,
    comprimento: Number(e.comprimento) || 0,
  }));

  return (
    <div className="max-w-7xl mx-auto px-2 sm:px-4">
      <RdpFormClient
        obras={obras}
        currentUser={{
          id: session.user.id,
          name: session.user.name,
          email: session.user.email,
          role: session.user.role,
        }}
        initialEstacas={estacas}
      />
    </div>
  );
}
