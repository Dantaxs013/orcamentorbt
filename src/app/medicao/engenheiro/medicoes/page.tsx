import { redirect } from 'next/navigation';
import { getServerSession } from '@/lib/session';
import { prisma } from '@/lib/db';
import Link from 'next/link';
import { TrendingUp, FileSpreadsheet, Download } from 'lucide-react';

function toNum(v: unknown): number { return parseFloat(String(v ?? '0')) || 0; }

const statusColors: Record<string, string> = {
  EM_ELABORACAO: 'bg-yellow-100 text-yellow-800',
  SUBMETIDA_GESTAO: 'bg-blue-100 text-blue-800',
  APROVADA: 'bg-green-100 text-green-800',
  FATURADA: 'bg-purple-100 text-purple-800',
};
const statusLabels: Record<string, string> = {
  EM_ELABORACAO: 'Em Elaboração',
  SUBMETIDA_GESTAO: 'Submetida',
  APROVADA: 'Aprovada',
  FATURADA: 'Faturada',
};

export default async function MedicoesPage() {
  const session = await getServerSession();
  if (!session?.user) redirect('/login');
  if (!['ENGENHEIRO', 'ADMINISTRADOR', 'ADMIN'].includes(session.user.role)) redirect('/medicao');

  const medicoes = await prisma.medicao.findMany({
    include: {
      obra: { select: { nome: true, codigo: true } },
      contrato: { select: { numeroContrato: true } },
      engenheiro: { select: { name: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Boletins de Medição</h1>
          <p className="text-slate-500 text-sm">{medicoes.length} medição(ões) encontrada(s)</p>
        </div>
      </div>

      {medicoes.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <TrendingUp className="w-14 h-14 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500">Nenhuma medição criada ainda.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-800 text-white">
                <th className="px-4 py-3 text-left">Nº</th>
                <th className="px-4 py-3 text-left">Obra</th>
                <th className="px-4 py-3 text-left">Contrato</th>
                <th className="px-4 py-3 text-center">Período</th>
                <th className="px-4 py-3 text-right">Valor Bruto</th>
                <th className="px-4 py-3 text-right">Valor Líquido</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-center">Ações</th>
              </tr>
            </thead>
            <tbody>
              {medicoes.map((m, i) => (
                <tr key={m.id} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                  <td className="px-4 py-3 font-bold text-slate-700">#{m.numeroMedicao}</td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-800">{m.obra.nome}</p>
                    <p className="text-xs text-slate-400">{m.obra.codigo}</p>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{m.contrato.numeroContrato}</td>
                  <td className="px-4 py-3 text-center text-slate-600 text-xs">
                    {m.periodoInicio.toLocaleDateString('pt-BR')} a {m.periodoFim.toLocaleDateString('pt-BR')}
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-slate-700">
                    {toNum(m.valorBruto).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-green-700">
                    {toNum(m.valorLiquido).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`text-xs font-semibold px-2 py-1 rounded-full ${statusColors[m.status] || 'bg-slate-100 text-slate-600'}`}>
                      {statusLabels[m.status] || m.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-2">
                      <Link href={`/medicao/engenheiro/medicoes/${m.id}`}
                        className="text-xs bg-red-50 hover:bg-red-100 text-[#BA1A1A] font-semibold px-2.5 py-1.5 rounded-lg border border-red-200 transition">
                        Abrir
                      </Link>
                      <a href={`/api/medicoes/${m.id}/excel`}
                        className="flex items-center gap-1 text-xs bg-green-50 hover:bg-green-100 text-green-700 px-2 py-1.5 rounded-lg transition">
                        <Download className="w-3 h-3" /> Excel
                      </a>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
