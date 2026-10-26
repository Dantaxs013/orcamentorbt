import React from 'react';
import { redirect } from 'next/navigation';
import { getServerSession } from '@/lib/session';
import { prisma } from '@/lib/db';
import { Briefcase, Building, Plus, DollarSign, FileSpreadsheet } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function AdminContratosPage() {
  const session = await getServerSession();
  if (!session?.user) redirect('/login');
  if (!['ADMINISTRADOR', 'ADMIN', 'ENGENHEIRO'].includes(session.user.role)) {
    redirect('/medicao');
  }
  const contratos = await prisma.contrato.findMany({
    include: {
      obra: true,
      itens: true,
    },
    orderBy: { createdAt: 'desc' },
  }).catch(() => []);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2.5">
            <Briefcase className="w-7 h-7 text-[#BA1A1A]" />
            <span>Gestão de Contratos e PPU</span>
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Painel Executivo: Cadastro de contratos, retenções tributárias e planilhas de preços unitários
          </p>
        </div>

        <button className="inline-flex items-center gap-2 bg-[#BA1A1A] hover:bg-[#991B1B] text-white font-bold text-sm px-4 py-2.5 rounded-xl shadow-md transition hover:scale-[1.02]">
          <Plus className="w-4 h-4" />
          <span>Novo Contrato</span>
        </button>
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
        <h2 className="text-lg font-bold text-slate-800 mb-4">Contratos Cadastrados</h2>

        {contratos.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-xl">
            <Building className="w-12 h-12 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-700">Nenhum contrato cadastrado ainda.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {contratos.map((contrato) => (
              <div
                key={contrato.id}
                className="p-5 border border-slate-200 rounded-xl bg-slate-50 hover:bg-slate-100/70 transition space-y-3"
              >
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                  <div>
                    <span className="font-mono text-xs font-bold text-amber-700 bg-amber-100 px-2.5 py-1 rounded-md">
                      {contrato.numeroContrato}
                    </span>
                    <h3 className="font-bold text-slate-900 text-base mt-1.5">{contrato.obra.nome}</h3>
                    <p className="text-xs text-slate-500">Cliente: {contrato.obra.cliente}</p>
                  </div>

                  <div className="text-right">
                    <span className="text-xs text-slate-400 block">Valor Global</span>
                    <span className="text-lg font-bold text-emerald-700">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                        Number(contrato.valorTotalContratual)
                      )}
                    </span>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-200 text-xs text-slate-600 flex flex-wrap gap-4">
                  <span>Itens PPU: <strong>{contrato.itens.length}</strong></span>
                  <span>INSS: <strong>{String(contrato.retencaoINSS)}%</strong></span>
                  <span>ISS: <strong>{String(contrato.retencaoISS)}%</strong></span>
                  <span>IRRF: <strong>{String(contrato.retencaoIRRF)}%</strong></span>
                  <span>Status: <strong className="text-emerald-700">{contrato.status}</strong></span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
