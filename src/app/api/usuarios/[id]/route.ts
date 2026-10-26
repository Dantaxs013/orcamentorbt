import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from '@/lib/session';
import { hashPassword, isAdmin } from '@/lib/auth';
import { updateUserSchema } from '@/lib/validations/usuario.schema';

interface RouteContext {
  params: {
    id: string;
  };
}

/**
 * PATCH /api/usuarios/[id]
 * Atualiza dados, papéis e permissões modulares de acesso (acessoOrcamento, acessoMedicao).
 * Protegido contra auto-bloqueio do admin em sessão.
 */
export async function PATCH(req: NextRequest, { params }: RouteContext) {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: 'Acesso restrito. Faça login.' }, { status: 401 });
  }

  if (!isAdmin(session.user.role)) {
    return NextResponse.json(
      { error: 'Apenas Gestores (ADMIN) possuem permissão para alterar usuários.' },
      { status: 403 }
    );
  }

  try {
    const { id } = params;
    const body = await req.json();

    const parseResult = updateUserSchema.safeParse(body);
    if (!parseResult.success) {
      const issue = parseResult.error.issues[0];
      return NextResponse.json(
        { error: issue?.message || 'Dados de atualização inválidos.' },
        { status: 400 }
      );
    }

    const data = parseResult.data;

    const user = await prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      return NextResponse.json({ error: 'Usuário não encontrado.' }, { status: 404 });
    }

    // Calcula os estados finais de permissão após o merge com o estado atual do banco
    const targetOrcamento =
      typeof data.acessoOrcamento === 'boolean'
        ? data.acessoOrcamento
        : user.acessoOrcamento;
    const targetMedicao =
      typeof data.acessoMedicao === 'boolean'
        ? data.acessoMedicao
        : user.acessoMedicao;

    // REGRA UNIVERSAL: Pelo menos um módulo de acesso deve ser mantido
    if (!targetOrcamento && !targetMedicao) {
      return NextResponse.json(
        {
          error:
            'Pelo menos um módulo de acesso deve ser selecionado (Orçamentos ou Medição Diária).',
        },
        { status: 400 }
      );
    }

    // PROTEÇÃO ATIVA DE AUTO-BLOQUEIO DO GESTOR LOGADO
    if (id === session.user.id) {
      if (typeof data.ativo === 'boolean' && !data.ativo) {
        return NextResponse.json(
          { error: 'Você não pode desativar o seu próprio usuário atual.' },
          { status: 400 }
        );
      }
      if (!targetOrcamento && !targetMedicao) {
        return NextResponse.json(
          { error: 'Você não pode revogar todos os seus próprios acessos a módulos.' },
          { status: 400 }
        );
      }
      if (data.role && !isAdmin(data.role)) {
        return NextResponse.json(
          { error: 'Você não pode rebaixar o seu próprio perfil de Administrador.' },
          { status: 400 }
        );
      }
    }

    const dataToUpdate: Record<string, any> = {};

    if (data.name !== undefined) {
      dataToUpdate.name = data.name.trim();
    }
    if (data.role !== undefined) {
      dataToUpdate.role = data.role;
    }
    if (typeof data.ativo === 'boolean') {
      dataToUpdate.ativo = data.ativo;
    }
    if (data.telefone !== undefined) {
      dataToUpdate.telefone = data.telefone;
    }
    if (typeof data.acessoOrcamento === 'boolean') {
      dataToUpdate.acessoOrcamento = data.acessoOrcamento;
    }
    if (typeof data.acessoMedicao === 'boolean') {
      dataToUpdate.acessoMedicao = data.acessoMedicao;
    }
    if (data.password && data.password.trim().length >= 6) {
      dataToUpdate.passwordHash = await hashPassword(data.password.trim());
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
        acessoOrcamento: true,
        acessoMedicao: true,
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

  if (!isAdmin(session.user.role)) {
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
