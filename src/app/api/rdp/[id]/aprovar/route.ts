import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/session';
import { prisma } from '@/lib/db';
import { isAdmin } from '@/lib/auth';
import { notifyEngenheiroRdpSubmetido } from '@/lib/email';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession();
  if (!session?.user) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }
  if (!session.user.acessoMedicao && !isAdmin(session.user.role)) {
    return NextResponse.json({ error: 'Acesso negado ao módulo de Medição' }, { status: 403 });
  }
  if (!['ENGENHEIRO', 'ADMINISTRADOR', 'ADMIN'].includes(session.user.role)) {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
  }

  let acao: string | undefined;
  let motivoRejeicao: string | undefined;

  const contentType = req.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    const body = await req.json().catch(() => ({}));
    acao = body.acao;
    motivoRejeicao = body.motivoRejeicao;
  } else {
    const formData = await req.formData().catch(() => null);
    if (formData) {
      acao = formData.get('acao')?.toString();
      motivoRejeicao = formData.get('motivoRejeicao')?.toString();
    }
  }

  if (!acao || !['APROVAR', 'REJEITAR'].includes(acao.toUpperCase())) {
    return NextResponse.json({ error: 'Ação inválida. Use APROVAR ou REJEITAR' }, { status: 400 });
  }
  const acaoUpper = acao.toUpperCase();

  const rdp = await prisma.relatorioDiario.findUnique({
    where: { id: params.id },
    include: {
      obra: true,
      apontador: { select: { name: true, email: true } },
      linhasProducao: true,
    },
  });

  if (!rdp) {
    return NextResponse.json({ error: 'RDP não encontrado' }, { status: 404 });
  }
  if (rdp.status !== 'SUBMETIDO') {
    return NextResponse.json({ error: 'RDP não está em status SUBMETIDO' }, { status: 409 });
  }

  const atualizado = await prisma.relatorioDiario.update({
    where: { id: params.id },
    data: {
      status: acaoUpper === 'APROVAR' ? 'APROVADO' : 'REJEITADO',
      revisadoPorId: session.user.id,
      assinadoEngenheiro: acaoUpper === 'APROVAR',
      dataAssinaturaEngenheiro: acaoUpper === 'APROVAR' ? new Date() : null,
      motivoRejeicao: acaoUpper === 'REJEITAR' ? (motivoRejeicao || 'Sem justificativa') : null,
    },
  });

  // Notifica o apontador de forma segura
  if (rdp.apontador?.email) {
    const totalEstacas = rdp.linhasProducao.filter(l => l.numeroEstaca).length;
    await notifyEngenheiroRdpSubmetido(rdp.apontador.email, {
      obra: rdp.obra.nome,
      data: rdp.data.toLocaleDateString('pt-BR'),
      apontador: rdp.apontador.name,
      totalEstacas,
      rdpId: rdp.id,
    }).catch(() => {});
  }

  // Redirecionamento se chamado por formulário HTML tradicional
  if (!contentType.includes('application/json')) {
    return NextResponse.redirect(new URL('/medicao/engenheiro/validacao?sucesso=1', req.url), { status: 303 });
  }

  return NextResponse.json({ ok: true, success: true, rdp: atualizado });
}
