import { NextRequest, NextResponse } from 'next/server';
import { validateSession, SESSION_COOKIE_NAME, LEGACY_SESSION_COOKIE_NAME } from '@/lib/session';

export async function GET(req: NextRequest) {
  const token =
    req.cookies.get(SESSION_COOKIE_NAME)?.value ||
    req.cookies.get(LEGACY_SESSION_COOKIE_NAME)?.value;

  if (!token) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  const session = await validateSession(token);
  if (!session) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  return NextResponse.json({
    authenticated: true,
    user: {
      id: session.user.id,
      name: session.user.name,
      nome: session.user.nome || session.user.name,
      email: session.user.email,
      role: session.user.role,
      ativo: session.user.ativo,
      telefone: session.user.telefone || null,
      acessoOrcamento: session.user.acessoOrcamento,
      acessoMedicao: session.user.acessoMedicao,
    },
  });
}
