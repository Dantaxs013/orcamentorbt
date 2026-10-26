import { redirect } from 'next/navigation';
import { getServerSession } from '@/lib/session';
import { prisma } from '@/lib/db';
import Link from 'next/link';
import { Building2, FileText, UserCheck } from 'lucide-react';
import { NovaObraModal } from '@/components/medicao/obras/nova-obra-modal';

export default async function ObrasEngPage() {
  const session = await getServerSession();
  if (!session?.user) redirect('/login');
  if (!['ENGENHEIRO', 'ADMINISTRADOR', 'ADMIN'].includes(session.user.role)) redirect('/medicao');

  const [obras, engenheiros] = await Promise.all([
    prisma.obra.findMany({
      where:
        session.user.role === 'ENGENHEIRO'
          ? { engenheiroResponsavelId: session.user.id }
          : {},
      include: {
        engenheiroResponsavel: { select: { id: true, name: true, email: true } },
        _count: { select: { relatoriosDiarios: true, contratos: true } },
        contratos: { select: { id: true, numeroContrato: true } },
      },
      orderBy: { createdAt: 'desc' },
    }),
    ['ADMINISTRADOR', 'ADMIN'].includes(session.user.role)
      ? prisma.user.findMany({
          where: { role: 'ENGENHEIRO', ativo: true },
          select: { id: true, name: true, email: true },
        })
      : Promise.resolve([]),
  ]);

  return (
    <div className="space-y-6">
      {/* Page Header com botão de Adicionar Obra */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Canteiros de Obras</h1>
          <p className="text-slate-500 text-sm">
            {obras.length} obra(s) cadastrada(s){' '}
            {session.user.role === 'ENGENHEIRO' ? 'sob sua responsabilidade técnica' : 'no sistema RBT'}
          </p>
        </div>

        <div>
          <NovaObraModal
            engenheiros={engenheiros}
            currentUserId={session.user.id}
            userRole={session.user.role}
          />
        </div>
      </div>

      {/* Lista de Obras */}
      {obras.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm">
          <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-red-100">
            <Building2 className="w-8 h-8 text-[#BA1A1A]" />
          </div>
          <h3 className="text-lg font-bold text-slate-800 mb-1">Nenhuma obra cadastrada</h3>
          <p className="text-slate-500 text-sm max-w-md mx-auto mb-6">
            Cadastre sua primeira obra para iniciar o apontamento de estacas e a geração de boletins de medição.
          </p>
          <NovaObraModal
            engenheiros={engenheiros}
            currentUserId={session.user.id}
            userRole={session.user.role}
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {obras.map((obra) => (
            <div
              key={obra.id}
              className="bg-white rounded-2xl border border-slate-200 p-5 hover:shadow-md transition-shadow flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <span className="font-mono text-xs font-bold px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md">
                      {obra.codigo}
                    </span>
                    <h3 className="font-bold text-slate-900 text-base mt-1.5 leading-snug">
                      {obra.nome}
                    </h3>
                  </div>
                  <span
                    className={`text-xs px-2.5 py-1 rounded-full font-bold ${
                      obra.ativo ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {obra.ativo ? 'Ativa' : 'Inativa'}
                  </span>
                </div>

                <div className="space-y-1.5 text-xs text-slate-600 mb-4">
                  <p>
                    <span className="font-semibold text-slate-700">Cliente:</span> {obra.cliente}
                  </p>
                  {obra.cidade && (
                    <p>
                      <span className="font-semibold text-slate-700">Local:</span> {obra.cidade}
                      {obra.estado ? ` - ${obra.estado}` : ''}
                    </p>
                  )}
                  {obra.engenheiroResponsavel && (
                    <p className="flex items-center gap-1 text-slate-500">
                      <UserCheck className="w-3.5 h-3.5 text-blue-600" />
                      <span>{obra.engenheiroResponsavel.name}</span>
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-4 text-xs text-slate-500 py-3 border-y border-slate-100 mb-4">
                  <span className="flex items-center gap-1 font-medium">
                    <FileText className="w-3.5 h-3.5 text-slate-400" />
                    <strong>{obra._count.relatoriosDiarios}</strong> RDPs
                  </span>
                  <span className="flex items-center gap-1 font-medium">
                    <FileText className="w-3.5 h-3.5 text-slate-400" />
                    <strong>{obra._count.contratos}</strong> Contratos
                  </span>
                </div>
              </div>

              <div>
                {obra.contratos.length > 0 ? (
                  <Link
                    href={`/medicao/engenheiro/medicoes?contratoId=${obra.contratos[0].id}&obraId=${obra.id}`}
                    className="w-full text-center block text-xs bg-slate-100 hover:bg-[#111827] hover:text-white text-slate-800 font-semibold py-2.5 rounded-xl transition-all"
                  >
                    Acessar Medições
                  </Link>
                ) : (
                  <Link
                    href="/medicao/admin/contratos"
                    className="w-full text-center block text-xs bg-red-50 hover:bg-red-100 text-[#BA1A1A] font-semibold py-2.5 rounded-xl border border-red-200 transition-all"
                  >
                    Vincular Contrato
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
