import React from 'react';
import { notFound, redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { getServerSession } from '@/lib/session';
import { stripFinancialData } from '@/lib/auth';
import { RdpFormClient } from '@/components/medicao/rdp/rdp-form-client';
import { RdpTotalsBar } from '@/components/medicao/rdp/rdp-totals-bar';
import { RdpProductionGrid } from '@/components/medicao/rdp/rdp-production-grid';
import { RdpViewActions } from '@/components/medicao/rdp/rdp-view-actions';
import { calculateRdpTotals } from '@/lib/calculations/rdp-math';
import { ArrowLeft, CheckCircle2, Clock, XCircle, FileText, Calendar, Building2, User, Wrench } from 'lucide-react';
import Link from 'next/link';

interface PageProps {
  params: {
    id: string;
  };
}

export default async function ViewOrEditRdpPage({ params }: PageProps) {
  const session = await getServerSession();
  if (!session?.user) {
    redirect('/login');
  }

  const { id } = params;

  const rdpRaw = await prisma.relatorioDiario.findUnique({
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

  if (!rdpRaw) {
    notFound();
  }

  // Isolation check: Apontador can only see own reports
  if (session.user.role === 'APONTADOR' && rdpRaw.apontadorId !== session.user.id) {
    redirect('/medicao/apontador/rdp');
  }

  const rdp = stripFinancialData(rdpRaw);

  // Fetch active obras for form
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
  const obras = stripFinancialData(obrasRaw);

  const estacasRaw = await prisma.estacaPrincipal.findMany({
    where: { ativo: true },
    select: { id: true, obraId: true, nome: true, perfil: true, comprimento: true },
    orderBy: { nome: 'asc' },
  }).catch(() => []);
  const estacas = estacasRaw.map((e) => ({
    id: e.id,
    obraId: e.obraId,
    nome: e.nome,
    perfil: e.perfil,
    comprimento: Number(e.comprimento) || 0,
  }));

  // Map lines to LinhaProducaoItem
  const lines = (rdp.linhasProducao || []).map((l: any) => ({
    numeroLinha: l.numeroLinha,
    numeroEstaca: l.numeroEstaca || '',
    perfil: l.perfil || '',
    comprimento: Number(l.profundidade) || 0,
    profundidade: Number(l.profundidade) || 0,
    cotaTerreno: l.cotaTerreno ? Number(l.cotaTerreno) : null,
    cotaArrasamento: l.cotaArrasamento ? Number(l.cotaArrasamento) : null,
    emendaW150: l.emendaW150 || 0,
    emendaW310: l.emendaW310 || 0,
    talas: l.talas || 0,
    arrasamento: Number(l.arrasamento) || 0,
    comprimentoUtil: l.comprimentoUtil ? Number(l.comprimentoUtil) : Math.max(0, (Number(l.profundidade) || 0) - (Number(l.arrasamento) || 0)),
    negaRepique: '',
    horarioCravacao: '',
    horaInicio: l.horaInicio || '',
    horaFim: l.horaFim || '',
    tempoParadaMinutos: l.tempoParadaMinutos || 0,
    motivoParada: l.motivoParada || '',
    observacao: l.observacao || '',
  }));

  // If editable status (RASCUNHO or REJEITADO), open in interactive RdpFormClient
  const isEditable = (rdp.status === 'RASCUNHO' || rdp.status === 'REJEITADO') && session.user.role === 'APONTADOR';

  if (isEditable) {
    return (
      <div className="max-w-7xl mx-auto px-2 sm:px-4">
        {rdp.status === 'REJEITADO' && rdp.motivoRejeicao && (
          <div className="mb-4 bg-rose-50 border border-rose-300 text-rose-800 rounded-2xl p-4">
            <h4 className="font-bold text-sm flex items-center gap-2">
              <XCircle className="w-5 h-5 text-rose-600" />
              <span>Relatório Devolvido pela Engenharia para Correção</span>
            </h4>
            <p className="text-xs text-rose-700 mt-1 pl-7">
              <span className="font-semibold">Motivo: </span>
              {rdp.motivoRejeicao}
            </p>
          </div>
        )}

        <RdpFormClient
          obras={obras}
          currentUser={{
            id: session.user.id,
            name: session.user.name,
            email: session.user.email,
            role: session.user.role,
          }}
          initialData={{
            id: rdp.id,
            obraId: rdp.obraId,
            data: rdp.data,
            turno: rdp.turno,
            maquinaEquipamento: rdp.maquinaEquipamento,
            operador: rdp.operador,
            encarregado: rdp.encarregado,
            soldador: '',
            equipeDescricao: rdp.equipeDescricao,
            condicaoClimatica: rdp.condicaoClimatica,
            status: rdp.status,
            horarioInicio: rdp.horaInicio || '07:00',
            horarioTermino: rdp.horaFim || '17:00',
            observacoes: rdp.observacoes,
            assinadoApontador: rdp.assinadoApontador,
            dataAssinaturaApontador: rdp.dataAssinaturaApontador,
            linhas: lines,
          }}
          initialEstacas={estacas}
        />
      </div>
    );
  }

  // Read-only View for SUBMETIDO / APROVADO
  const totals = calculateRdpTotals(lines, {
    inicio: rdp.horaInicio || undefined,
    fim: rdp.horaFim || undefined,
  });

  return (
    <div className="max-w-7xl mx-auto px-2 sm:px-4 space-y-6 pb-16">
      {/* Header View */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 shadow-sm border border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <Link
            href={session.user.role === 'APONTADOR' ? '/medicao/apontador/rdp' : '/medicao/engenheiro/validacao'}
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition"
            title="Voltar"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
                RDP #{rdp.numeroSequencial}
              </h1>
              <span
                className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold ${
                  rdp.status === 'APROVADO'
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    : rdp.status === 'SUBMETIDO'
                    ? 'bg-blue-100 text-blue-800 border border-blue-300'
                    : 'bg-amber-100 text-amber-800 border border-amber-300'
                }`}
              >
                {rdp.status === 'APROVADO' ? (
                  <CheckCircle2 className="w-3.5 h-3.5" />
                ) : (
                  <Clock className="w-3.5 h-3.5" />
                )}
                <span>{rdp.status}</span>
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Obra: <span className="font-semibold text-slate-700">{rdp.obra?.nome} ({rdp.obra?.codigo})</span> • Data:{' '}
              <span className="font-semibold text-slate-700">{new Date(rdp.data).toLocaleDateString('pt-BR')}</span>
            </p>
          </div>
        </div>

        <RdpViewActions
          rdpId={rdp.id}
          status={rdp.status}
          userRole={session.user.role}
        />
      </div>

      {/* Totals Bar */}
      <RdpTotalsBar totals={totals} isSticky={false} />

      {/* General Details Summary Cards */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 shadow-sm border border-slate-200 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
        <div className="p-3 bg-slate-50 rounded-xl">
          <span className="text-slate-400 block font-medium">Equipamento</span>
          <span className="text-sm font-bold text-slate-800 mt-0.5 block">{rdp.maquinaEquipamento}</span>
        </div>
        <div className="p-3 bg-slate-50 rounded-xl">
          <span className="text-slate-400 block font-medium">Operador</span>
          <span className="text-sm font-bold text-slate-800 mt-0.5 block">{rdp.operador}</span>
        </div>
        <div className="p-3 bg-slate-50 rounded-xl">
          <span className="text-slate-400 block font-medium">Encarregado</span>
          <span className="text-sm font-bold text-slate-800 mt-0.5 block">{rdp.encarregado || 'N/D'}</span>
        </div>
        <div className="p-3 bg-slate-50 rounded-xl">
          <span className="text-slate-400 block font-medium">Apontador</span>
          <span className="text-sm font-bold text-slate-800 mt-0.5 block">{rdp.apontador?.name}</span>
        </div>
      </div>

      {/* Production Grid View */}
      <RdpProductionGrid
        lines={lines}
        readOnly={true}
      />

      {/* Signatures & Observations View */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 shadow-sm border border-slate-200 space-y-4">
        <h3 className="text-sm font-bold text-slate-900">Observações de Campo</h3>
        <p className="text-xs text-slate-700 bg-slate-50 p-4 rounded-xl border border-slate-200">
          {rdp.observacoes || 'Nenhuma observação registrada neste dia.'}
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-slate-100 text-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>
              Apontador: <strong className="text-slate-800">{rdp.apontador?.name}</strong>{' '}
              {rdp.assinadoApontador && rdp.dataAssinaturaApontador && (
                <span className="text-slate-400">
                  (assinado em {new Date(rdp.dataAssinaturaApontador).toLocaleString('pt-BR')})
                </span>
              )}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {rdp.assinadoEngenheiro ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            ) : (
              <Clock className="w-4 h-4 text-amber-500" />
            )}
            <span>
              Engenharia:{' '}
              {rdp.revisor?.name ? (
                <strong className="text-slate-800">{rdp.revisor.name}</strong>
              ) : (
                <span className="text-slate-400">Pendente de validação</span>
              )}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
