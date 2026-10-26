import React from 'react';
import { redirect } from 'next/navigation';
import { getServerSession } from '@/lib/session';
import { prisma } from '@/lib/db';
import { ValidacaoClient } from '@/components/medicao/engenheiro/validacao-client';

export const dynamic = 'force-dynamic';

export default async function ValidacaoPage() {
  const session = await getServerSession();
  if (!session?.user) redirect('/login');
  if (!['ENGENHEIRO', 'ADMINISTRADOR', 'ADMIN'].includes(session.user.role)) redirect('/medicao');

  const rdpsRaw = await prisma.relatorioDiario.findMany({
    where: { status: 'SUBMETIDO' },
    include: {
      obra: {
        select: {
          id: true,
          nome: true,
          codigo: true,
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
        select: {
          id: true,
          numeroLinha: true,
          numeroEstaca: true,
          perfil: true,
          profundidade: true,
          emendaW150: true,
          emendaW310: true,
          talas: true,
          arrasamento: true,
          horaInicio: true,
          horaFim: true,
          observacao: true,
        },
      },
    },
    orderBy: { data: 'desc' },
  });

  const rdps = rdpsRaw.map((r) => ({
    id: r.id,
    numeroSequencial: r.numeroSequencial,
    data: r.data.toISOString(),
    turno: r.turno,
    maquinaEquipamento: r.maquinaEquipamento,
    operador: r.operador,
    encarregado: r.encarregado,
    condicaoClimatica: r.condicaoClimatica,
    observacoes: r.observacoes,
    obra: {
      id: r.obra.id,
      nome: r.obra.nome,
      codigo: r.obra.codigo,
      cliente: r.obra.cliente,
      cidade: r.obra.cidade,
      estado: r.obra.estado,
    },
    apontador: {
      id: r.apontador.id,
      name: r.apontador.name,
      email: r.apontador.email,
    },
    linhasProducao: r.linhasProducao.map((l) => ({
      id: l.id,
      numeroLinha: l.numeroLinha,
      numeroEstaca: l.numeroEstaca,
      perfil: l.perfil,
      profundidade: Number(l.profundidade) || 0,
      emendaW150: l.emendaW150 || 0,
      emendaW310: l.emendaW310 || 0,
      talas: l.talas || 0,
      arrasamento: Number(l.arrasamento) || 0,
      horaInicio: l.horaInicio,
      horaFim: l.horaFim,
      observacao: l.observacao,
    })),
  }));

  return <ValidacaoClient initialRdps={rdps} />;
}
