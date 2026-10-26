import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { verifyPassword } from '@/lib/auth';
import { createSession, buildSessionCookies } from '@/lib/session';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const rateLimitResult = checkRateLimit(`login:${ip}`, 5, 60000);

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        {
          error: `Muitas tentativas de login. Aguarde ${rateLimitResult.retryAfterSeconds} segundos.`,
          retryAfter: rateLimitResult.retryAfterSeconds,
        },
        {
          status: 429,
          headers: {
            'Retry-After': String(rateLimitResult.retryAfterSeconds),
          },
        }
      );
    }

    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'E-mail e senha são obrigatórios.' },
        { status: 400 }
      );
    }

    const cleanEmail = String(email).toLowerCase().trim();
    const altEmail = cleanEmail.endsWith('@rbt.com.br')
      ? cleanEmail.replace('@rbt.com.br', '@rbtfundacoes.com.br')
      : cleanEmail.endsWith('@rbtfundacoes.com.br')
      ? cleanEmail.replace('@rbtfundacoes.com.br', '@rbt.com.br')
      : cleanEmail;

    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: cleanEmail },
          { email: altEmail },
        ],
      },
    });

    if (!user || !user.ativo) {
      return NextResponse.json(
        { error: 'Credenciais inválidas ou usuário inativo.' },
        { status: 401 }
      );
    }

    const passwordMatch = await verifyPassword(password, user.passwordHash);
    if (!passwordMatch) {
      return NextResponse.json(
        { error: 'Credenciais inválidas.' },
        { status: 401 }
      );
    }

    const ipAddress = req.headers.get('x-forwarded-for') || req.ip || undefined;
    const userAgent = req.headers.get('user-agent') || undefined;

    const u = user as any;
    const roleUpper = String(u.role || '').toUpperCase();
    const fallbackOrcamento = roleUpper === 'ADMIN' || roleUpper === 'ADMINISTRADOR' || roleUpper === 'ORCAMENTISTA';
    const fallbackMedicao = roleUpper === 'ADMIN' || roleUpper === 'ADMINISTRADOR' || roleUpper === 'APONTADOR' || roleUpper === 'ENGENHEIRO';

    const acessoOrcamento = typeof u.acessoOrcamento === 'boolean' ? u.acessoOrcamento : fallbackOrcamento;
    const acessoMedicao = typeof u.acessoMedicao === 'boolean' ? u.acessoMedicao : fallbackMedicao;

    const rawToken = await createSession(user.id, { ipAddress, userAgent });
    const cookieHeaders = await buildSessionCookies(rawToken, {
      id: user.id,
      role: user.role,
      email: user.email,
      acessoOrcamento,
      acessoMedicao,
    });

    // Determina URL de destino pós-login
    // Conforme ajuste prioritário de UX: TODOS os usuários autenticados são redirecionados para /portal
    const redirectUrl = '/portal';

    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name || u.nome || '',
        nome: u.nome || user.name || '',
        email: user.email,
        role: user.role,
        acessoOrcamento,
        acessoMedicao,
      },
      redirectUrl,
    });

    for (const cookieHeader of cookieHeaders) {
      response.headers.append('Set-Cookie', cookieHeader);
    }

    return response;
  } catch (error) {
    console.error('Erro na autenticação:', error);
    return NextResponse.json(
      { error: 'Erro interno no servidor ao autenticar.' },
      { status: 500 }
    );
  }
}
