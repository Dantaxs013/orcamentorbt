import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from '@/lib/session';
import { hashPassword } from '@/lib/auth';

interface RouteContext {
  params: {
    id: string;
  };
}

/**
 * PATCH /api/usuarios/[id]
 * Atualiza o perfil (role: ADMIN / ORCAMENTISTA), status ativo ou senha do usuário
 */
export async function PATCH(req: NextRequest, { params }: RouteContext) {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: 'Acesso restrito. Faça login.' }, { status: 401 });
  }

  if (session.user.role !== 'ADMIN') {
    return NextResponse.json(
      { error: 'Apenas Gestores (ADMIN) possuem permissão para alterar usuários.' },
      { status: 403 }
    );
  }

  try {
    const { id } = params;
    const body = await req.json();
    const { role, ativo, name, password } = body;

    const user = await prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      return NextResponse.json({ error: 'Usuário não encontrado.' }, { status: 404 });
    }

    const dataToUpdate: any = {};

    if (role && (role === 'ADMIN' || role === 'ORCAMENTISTA')) {
      dataToUpdate.role = role;
    }

    if (typeof ativo === 'boolean') {
      // Impede desativar a própria conta do gestor que está operando
      if (id === session.user.id && !ativo) {
        return NextResponse.json(
          { error: 'Você não pode desativar o seu próprio usuário atual.' },
          { status: 400 }
        );
      }
      dataToUpdate.ativo = ativo;
    }

    if (name && typeof name === 'string') {
      dataToUpdate.name = name.trim();
    }

    if (password && typeof password === 'string' && password.length >= 6) {
      dataToUpdate.passwordHash = await hashPassword(password);
    }

    const updated = await prisma.user.update({
      where: { id },
      data: dataToUpdate,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        ativo: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Dados do usuário atualizados com sucesso.',
      user: updated,
    });
  } catch (error) {
    console.error('Erro ao atualizar usuário:', error);
    return NextResponse.json(
      { error: 'Erro interno ao atualizar usuário.' },
      { status: 500 }
    );
  }
}
