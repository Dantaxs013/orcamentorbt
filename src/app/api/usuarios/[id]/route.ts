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

/**
 * DELETE /api/usuarios/[id]
 * Exclui permanentemente o usuário do sistema
 */
export async function DELETE(req: NextRequest, { params }: RouteContext) {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: 'Acesso restrito. Faça login.' }, { status: 401 });
  }

  if (session.user.role !== 'ADMIN') {
    return NextResponse.json(
      { error: 'Apenas Gestores (ADMIN) possuem permissão para excluir usuários.' },
      { status: 403 }
    );
  }

  try {
    const { id } = params;

    // Impede o gestor de deletar a sua própria conta ativa
    if (id === session.user.id) {
      return NextResponse.json(
        { error: 'Você não pode excluir o seu próprio usuário em uso.' },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      return NextResponse.json({ error: 'Usuário não encontrado.' }, { status: 404 });
    }

    // Exclui o usuário (sessões são deletadas em cascata; orçamentos e logs ficam desvinculados com SetNull)
    await prisma.user.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: `Usuário ${user.name} (${user.email}) foi excluído permanentemente do sistema.`,
    });
  } catch (error) {
    console.error('Erro ao excluir usuário:', error);
    return NextResponse.json(
      { error: 'Erro interno ao excluir usuário.' },
      { status: 500 }
    );
  }
}

