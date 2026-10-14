import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const SESSION_COOKIE_NAME = 'rbt_orcamentos_session';

/**
 * Middleware Next.js Edge para proteção de perímetro das rotas internas do dashboard.
 * Intercepta acessos a /dashboard/:path* e redireciona usuários sem sessão para /login.
 */
export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  // Intercepta rotas sob /dashboard
  if (pathname.startsWith('/dashboard')) {
    const sessionToken = request.cookies.get(SESSION_COOKIE_NAME)?.value;

    // Se o cookie de sessão estiver ausente ou vazio, redireciona para login preservando o destino
    if (!sessionToken || sessionToken.trim() === '') {
      const loginUrl = new URL('/login', request.url);
      const redirectTarget = pathname + (search || '');
      loginUrl.searchParams.set('redirect', redirectTarget);

      return NextResponse.redirect(loginUrl, 307);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/dashboard',
    '/dashboard/:path*',
  ],
};
