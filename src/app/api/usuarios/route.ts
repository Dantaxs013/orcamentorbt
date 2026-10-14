import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from '@/lib/session';
import { hashPassword } from '@/lib/auth';

/**
 * GET /api/usuarios
 * Retorna a lista de usuários cadastrados (Orçamentistas e Gestores)
 */
export async function GET() {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: 'Acesso restrito. Faça login.' }, { status: 401 });
  }

  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        ativo: true,
        createdAt: true,
        _count: {
          select: {
            orcamentos: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ users });
  } catch (error) {
    console.error('Erro ao listar usuários:', error);
    return NextResponse.json({ error: 'Erro ao carregar lista de usuários.' }, { status: 500 });
  }
}

/**
 * POST /api/usuarios
 * Cria um novo usuário (Orçamentista ou Gestor/ADMIN)
 */
export async function POST(req: NextRequest) {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: 'Acesso restrito. Faça login.' }, { status: 401 });
  }

  // Apenas ADMIN pode cadastrar novos usuários
  if (session.user.role !== 'ADMIN') {
    return NextResponse.json(
      { error: 'Apenas Gestores (ADMIN) possuem permissão para criar novos usuários.' },
      { status: 403 }
    );
  }

  try {
    const body = await req.json();
    const { name, email, password, role } = body;

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: 'Nome, e-mail e senha são obrigatórios.' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'A senha deve conter no mínimo 6 caracteres.' },
        { status: 400 }
      );
    }

    const emailNormalizado = email.toLowerCase().trim();
    const existing = await prisma.user.findUnique({
      where: { email: emailNormalizado },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'Já existe um usuário cadastrado com este e-mail.' },
        { status: 409 }
      );
    }

    const validRole = role === 'ADMIN' ? 'ADMIN' : 'ORCAMENTISTA';
    const passwordHash = await hashPassword(password);

    const novoUsuario = await prisma.user.create({
      data: {
        name: name.trim(),
        email: emailNormalizado,
        passwordHash,
        role: validRole,
        ativo: true,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        ativo: true,
        createdAt: true,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: `Usuário ${novoUsuario.name} cadastrado com sucesso como ${validRole === 'ADMIN' ? 'Gestor' : 'Orçamentista'}.`,
        user: novoUsuario,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Erro ao cadastrar usuário:', error);
    return NextResponse.json(
      { error: 'Erro interno ao cadastrar usuário.' },
      { status: 500 }
    );
  }
}
