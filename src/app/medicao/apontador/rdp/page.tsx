import React from 'react';
import { prisma } from '@/lib/db';
import { getServerSession } from '@/lib/session';
import { stripFinancialData } from '@/lib/auth';
import { FileText, Plus, Building2, Calendar, CheckCircle, Clock } from 'lucide-react';

export default async function ApontadorRdpPage() {
  const session = await getServerSession();
  const userId = session?.user.id;

  // Fetch active obras (selecting only non-financial fields)
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

  // Ensure sanitization
  const obras = stripFinancialData(obrasRaw);

  // Fetch existing RDPs for this apontador
  const relatoriosRaw = await prisma.relatorioDiario.findMany({
    where: userId ? { apontadorId: userId } : {},
    select: {
      id: true,
      numeroSequencial: true,
      data: true,
      status: true,
      maquinaEquipamento: true,
      operador: true,
      obra: {
        select: {
          codigo: true,
          nome: true,
        },
      },
    },
    orderBy: { data: 'desc' },
    take: 10,
  }).catch(() => []);

  const relatorios = stripFinancialData(relatoriosRaw);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2.5">
            <FileText className="w-7 h-7 text-emerald-600" />
            <span>Relatórios Diários de Produção (RDP)</span>
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Módulo de Campo para preenchimento e controle de estacas e perfis metálicos
          </p>
        </div>

        <a
          href="/medicao/apontador/rdp/novo"
          className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm px-4 py-2.5 rounded-xl shadow-md shadow-emerald-900/10 transition"
        >
          <Plus className="w-4 h-4" />
          <span>Novo Relatório Diário</span>
        </a>
      </div>

      {/* Grid: Obras and Recent Reports */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column: Active Obras */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 md:col-span-1">
          <h2 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-blue-600" />
            <span>Obras Disponíveis</span>
          </h2>

          <div className="space-y-3">
            {obras.length === 0 ? (
              <p className="text-sm text-slate-400">Nenhuma obra ativa no momento.</p>
            ) : (
              obras.map((obra) => (
                <div
                  key={obra.id}
                  className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 transition"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-blue-700 font-mono">
                      {obra.codigo}
                    </span>
                    <span className="text-[11px] text-slate-500">
                      {obra.cidade}/{obra.estado}
                    </span>
                  </div>
                  <h3 className="font-semibold text-slate-800 text-sm mt-1">{obra.nome}</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Cliente: {obra.cliente}</p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Column: Recent Reports */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 md:col-span-2">
          <h2 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-emerald-600" />
            <span>Últimos Relatórios Apontados</span>
          </h2>

          {relatorios.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-xl">
              <FileText className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-medium text-slate-600">Nenhum relatório enviado ainda.</p>
              <p className="text-xs text-slate-400 mt-1">
                Clique em "Novo Relatório Diário" para iniciar o preenchimento de campo.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {relatorios.map((rdp) => (
                <a
                  key={rdp.id}
                  href={`/medicao/apontador/rdp/${rdp.id}`}
                  className="py-3.5 px-3 -mx-3 rounded-xl flex items-center justify-between hover:bg-slate-50 transition group"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-slate-800 group-hover:text-emerald-700 transition">
                        RDP #{rdp.numeroSequencial}
                      </span>
                      <span className="text-xs text-slate-400">•</span>
                      <span className="text-xs font-medium text-slate-600">
                        {rdp.obra?.nome} ({rdp.obra?.codigo})
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Equipamento: {rdp.maquinaEquipamento} | Operador: {rdp.operador}
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
                        rdp.status === 'APROVADO'
                          ? 'bg-emerald-100 text-emerald-800'
                          : rdp.status === 'SUBMETIDO'
                          ? 'bg-blue-100 text-blue-800'
                          : rdp.status === 'REJEITADO'
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {rdp.status === 'APROVADO' ? (
                        <CheckCircle className="w-3.5 h-3.5" />
                      ) : (
                        <Clock className="w-3.5 h-3.5" />
                      )}
                      <span>{rdp.status}</span>
                    </span>
                  </div>
                </a>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
