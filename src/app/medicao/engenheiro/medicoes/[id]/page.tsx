import { redirect } from 'next/navigation';
import { getServerSession } from '@/lib/session';
import { prisma } from '@/lib/db';
import Link from 'next/link';
import { Download, FileText, Send } from 'lucide-react';

function toNum(v: unknown): number { return parseFloat(String(v ?? '0')) || 0; }
function brl(v: number) { return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }); }

export default async function MedicaoDetailPage({ params }: { params: { id: string } }) {
  const session = await getServerSession();
  if (!session?.user) redirect('/login');
  if (!['ENGENHEIRO', 'ADMINISTRADOR', 'ADMIN'].includes(session.user.role)) redirect('/medicao');

  const medicao = await prisma.medicao.findUnique({
    where: { id: params.id },
    include: {
      obra: true,
      contrato: true,
      engenheiro: { select: { name: true } },
      itensMedicao: {
        include: { itemContrato: true },
        orderBy: { itemContrato: { ordem: 'asc' } },
      },
    },
  });

  if (!medicao) redirect('/medicao/engenheiro/medicoes');

  const c = medicao.contrato;

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold text-slate-800">
              Boletim de Medição #{medicao.numeroMedicao}
            </h1>
            <p className="text-slate-500 text-sm">{medicao.obra.nome} — {c.numeroContrato}</p>
          </div>
          <div className="flex gap-2">
            <a href={`/api/medicoes/${medicao.id}/excel`}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition">
              <Download className="w-4 h-4" /> Excel
            </a>
            {medicao.status === 'EM_ELABORACAO' && (
              <form action={`/api/medicoes/${medicao.id}`} method="POST">
                <button type="submit"
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition">
                  <Send className="w-4 h-4" /> Submeter para Aprovação
                </button>
              </form>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div><span className="text-slate-500">Contratante:</span><p className="font-semibold">{medicao.obra.cliente}</p></div>
          <div><span className="text-slate-500">Período:</span><p className="font-semibold">{medicao.periodoInicio.toLocaleDateString('pt-BR')} a {medicao.periodoFim.toLocaleDateString('pt-BR')}</p></div>
          <div><span className="text-slate-500">Engenheiro:</span><p className="font-semibold">{medicao.engenheiro.name}</p></div>
          <div><span className="text-slate-500">Status:</span><p className="font-semibold">{medicao.status}</p></div>
        </div>
      </div>

      {/* Tabela de Itens */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
        <table className="w-full text-xs min-w-[900px]">
          <thead>
            <tr className="bg-slate-800 text-white">
              <th className="px-3 py-2 text-left">Item</th>
              <th className="px-3 py-2 text-left">Descrição</th>
              <th className="px-3 py-2 text-center">UN</th>
              <th className="px-3 py-2 text-right">Qtd Contr.</th>
              <th className="px-3 py-2 text-right">P. Unit.</th>
              <th className="px-3 py-2 text-right">P. Total</th>
              <th className="px-3 py-2 text-right bg-slate-600">Anterior</th>
              <th className="px-3 py-2 text-right bg-slate-600">Atual</th>
              <th className="px-3 py-2 text-right bg-slate-600">Acumulada</th>
              <th className="px-3 py-2 text-right bg-slate-600">Saldo</th>
              <th className="px-3 py-2 text-right bg-slate-500">Val Atual</th>
              <th className="px-3 py-2 text-right bg-slate-500">Val Acum.</th>
              <th className="px-3 py-2 text-right bg-slate-500">Saldo R$</th>
            </tr>
          </thead>
          <tbody>
            {medicao.itensMedicao.map((im, i) => {
              const ic = im.itemContrato;
              return (
                <tr key={im.id} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                  <td className="px-3 py-2 font-mono">{ic.codigoItem}</td>
                  <td className="px-3 py-2">{ic.descricao}</td>
                  <td className="px-3 py-2 text-center">{ic.unidadeMedida}</td>
                  <td className="px-3 py-2 text-right">{toNum(ic.quantidadeContratada).toFixed(3)}</td>
                  <td className="px-3 py-2 text-right">{brl(toNum(ic.valorUnitario))}</td>
                  <td className="px-3 py-2 text-right">{brl(toNum(ic.valorTotal))}</td>
                  <td className="px-3 py-2 text-right bg-slate-50">{toNum(im.quantidadeAnterior).toFixed(3)}</td>
                  <td className="px-3 py-2 text-right bg-blue-50 font-semibold">{toNum(im.quantidadePeriodo).toFixed(3)}</td>
                  <td className="px-3 py-2 text-right bg-slate-50">{toNum(im.quantidadeAcumulada).toFixed(3)}</td>
                  <td className="px-3 py-2 text-right bg-slate-50">{toNum(im.saldoQuantidade).toFixed(3)}</td>
                  <td className="px-3 py-2 text-right bg-green-50 font-semibold">{brl(toNum(im.valorPeriodo))}</td>
                  <td className="px-3 py-2 text-right bg-slate-50">{brl(toNum(im.valorAcumulado))}</td>
                  <td className="px-3 py-2 text-right bg-slate-50">{brl(toNum(im.saldoValor))}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Resumo Financeiro */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="font-bold text-slate-700 mb-3">Retenções e Deduções</h3>
          <div className="space-y-2 text-sm">
            {[
              ['INSS', c.retencaoINSS, medicao.retencaoINSSValor],
              ['ISS', c.retencaoISS, medicao.retencaoISSValor],
              ['IRRF', c.retencaoIRRF, medicao.retencaoIRRFValor],
              ['CSLL', c.retencaoCSLL, medicao.retencaoCSLLValor],
              ['PIS', c.retencaoPIS, medicao.retencaoPISValor],
              ['COFINS', c.retencaoCOFINS, medicao.retencaoCOFINSValor],
              ['Outras', c.outrasDeducoesPerc, medicao.outrasDeducoesValor],
            ].map(([label, perc, val]) => (
              <div key={String(label)} className="flex items-center justify-between">
                <span className="text-slate-600">{String(label)} ({toNum(perc).toFixed(2)}%)</span>
                <span className="font-medium text-red-600">- {brl(toNum(val))}</span>
              </div>
            ))}
            <div className="border-t border-slate-200 pt-2 flex items-center justify-between font-bold">
              <span className="text-slate-700">Total Retenções</span>
              <span className="text-red-700">- {brl(toNum(medicao.totalDeducoes))}</span>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="font-bold text-slate-700 mb-3">Resumo</h3>
          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-slate-600">Valor Bruto do Período</span>
              <span className="font-semibold text-slate-800">{brl(toNum(medicao.valorBruto))}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-600">(-) Total de Retenções</span>
              <span className="font-semibold text-red-600">- {brl(toNum(medicao.totalDeducoes))}</span>
            </div>
            <div className="border-t border-slate-200 pt-3 flex items-center justify-between">
              <span className="font-bold text-slate-800 text-base">VALOR LÍQUIDO</span>
              <span className="font-bold text-green-700 text-xl">{brl(toNum(medicao.valorLiquido))}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
