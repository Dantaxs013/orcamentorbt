import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from '@/lib/session';
import { hashPassword, isAdmin } from '@/lib/auth';
import { sendNovoUsuarioEmail } from '@/lib/email';
import { createUserSchema } from '@/lib/validations/usuario.schema';

/**
 * GET /api/usuarios
 * Retorna a lista de usuários cadastrados com permissões modulares
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
        acessoOrcamento: true,
        acessoMedicao: true,
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
 * Cria um novo usuário com validação de permissões de módulos (>= 1 módulo obrigatório)
 */
export async function POST(req: NextRequest) {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: 'Acesso restrito. Faça login.' }, { status: 401 });
  }

  // Apenas Gestores (ADMIN / ADMINISTRADOR) podem cadastrar novos usuários
  if (!isAdmin(session.user.role)) {
    return NextResponse.json(
      { error: 'Apenas Gestores (ADMIN) possuem permissão para criar novos usuários.' },
      { status: 403 }
    );
  }

  try {
    const body = await req.json();
    const parseResult = createUserSchema.safeParse(body);

    if (!parseResult.success) {
      const issue = parseResult.error.issues[0];
      return NextResponse.json(
        { error: issue?.message || 'Dados de usuário inválidos.' },
        { status: 400 }
      );
    }

    const {
      name,
      email,
      password,
      role,
      telefone,
      ativo,
      acessoOrcamento,
      acessoMedicao,
    } = parseResult.data;

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

    const passwordHash = await hashPassword(password);

    const novoUsuario = await prisma.user.create({
      data: {
        name: name.trim(),
        email: emailNormalizado,
        passwordHash,
        role,
        telefone: telefone || null,
        ativo: ativo ?? true,
        acessoOrcamento,
        acessoMedicao,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        ativo: true,
        acessoOrcamento: true,
        acessoMedicao: true,
        createdAt: true,
      },
    });

    // Mapeamento amigável de perfil para e-mail institucional
    const perfilMap: Record<string, string> = {
      ADMIN: 'Gestor (ADMIN)',
      ADMINISTRADOR: 'Gestor (ADMIN)',
      ORCAMENTISTA: 'Engenheiro Orçamentista',
      ENGENHEIRO: 'Engenheiro de Obras',
      APONTADOR: 'Apontador de Campo',
    };

    const baseUrl = process.env.APP_URL || 'https://orcamentos.rbtfundacoes.com.br';
    const loginUrl = `${baseUrl}/login`;

    await sendNovoUsuarioEmail({
      to: novoUsuario.email,
      nome: novoUsuario.name,
      email: novoUsuario.email,
      senhaTemporaria: password,
      perfil: perfilMap[novoUsuario.role] || novoUsuario.role,
      loginUrl,
    }).catch((err) => {
      console.error('Falha ao enviar e-mail de novo usuário (não bloqueante):', err);
    });

    return NextResponse.json(
      {
        success: true,
        message: `Usuário ${novoUsuario.name} cadastrado com sucesso e credenciais enviadas por e-mail.`,
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
