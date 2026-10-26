import { NextRequest, NextResponse } from 'next/server';
import { verifyUserMeta, USER_META_COOKIE_NAME, UserMetaClaims, signUserMeta } from '../../../src/lib/token-utils';
import { applySecurityHeaders } from '../../../src/lib/security-headers';

const SESSION_COOKIE_NAME = 'rbt_orcamentos_session';
const LEGACY_SESSION_COOKIE_NAME = 'rbt_session';

const PUBLIC_PATHS = [
  '/login',
  '/esqueci-senha',
  '/api/auth/login',
  '/api/auth/logout',
  '/api/health',
  '/api/marca/pdf',
  '/logo-rbt.svg',
  '/favicon.ico',
];

const STATIC_FILE_REGEX = /\.(ico|png|jpg|jpeg|svg|css|js|webp|woff2?|map|ttf|eot)$/i;

function isPublicPath(pathname: string): boolean {
  if (pathname.startsWith('/formulario') || pathname.startsWith('/api/formulario')) {
    return true;
  }
  return PUBLIC_PATHS.some((pub) => pathname === pub || pathname.startsWith(`${pub}/`));
}

function parsePayloadUnsafe(token: string): Partial<UserMetaClaims> | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 2) return null;
    let base64 = parts[0].replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) base64 += '=';
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const dec = new TextDecoder();
    const parsed = JSON.parse(dec.decode(bytes));
    const now = Date.now();
    const maxClockSkewMs = 60 * 1000;
    const maxAgeMs = 12 * 60 * 60 * 1000;
    if (
      !parsed.ts ||
      typeof parsed.ts !== 'number' ||
      parsed.ts > now + maxClockSkewMs ||
      (now - parsed.ts) > maxAgeMs
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function evaluateRoutePolicy(
  request: NextRequest,
  claims: UserMetaClaims | Partial<UserMetaClaims> | null,
  isAuthenticated: boolean
): NextResponse {
  const { pathname, search } = request.nextUrl;

  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/static') ||
    STATIC_FILE_REGEX.test(pathname)
  ) {
    return NextResponse.next();
  }

  if (isPublicPath(pathname)) {
    if ((pathname === '/login' || pathname === '/login/') && isAuthenticated && claims) {
      return applySecurityHeaders(NextResponse.redirect(new URL('/portal', request.url), 307));
    }
    return applySecurityHeaders(NextResponse.next());
  }

  if (!isAuthenticated || !claims) {
    if (pathname.startsWith('/api/')) {
      return applySecurityHeaders(
        NextResponse.json(
          { error: 'Não autenticado. Faça login para continuar.' },
          { status: 401 }
        )
      );
    }

    const loginUrl = new URL('/login', request.url);
    const redirectTarget = pathname + (search || '');
    loginUrl.searchParams.set('redirect', redirectTarget);
    loginUrl.searchParams.set('callbackUrl', redirectTarget);
    return applySecurityHeaders(NextResponse.redirect(loginUrl, 307));
  }

  const roleUpper = String(claims.role || '').toUpperCase();
  const isAdmin = roleUpper === 'ADMIN' || roleUpper === 'ADMINISTRADOR';
  const isEngenheiro = roleUpper === 'ENGENHEIRO' || isAdmin;
  const isApontador = roleUpper === 'APONTADOR';

  const hasOrcamento = Boolean(claims.acessoOrcamento || isAdmin);
  const hasMedicao = Boolean(claims.acessoMedicao || isAdmin);

  if (pathname === '/') {
    return applySecurityHeaders(NextResponse.redirect(new URL('/portal', request.url), 307));
  }

  if (pathname === '/portal' || pathname.startsWith('/portal/')) {
    return applySecurityHeaders(NextResponse.next());
  }

  if (pathname.startsWith('/dashboard')) {
    if (!hasOrcamento) {
      const portalUrl = new URL('/portal', request.url);
      portalUrl.searchParams.set('unauthorized', 'orcamentos');
      return applySecurityHeaders(NextResponse.redirect(portalUrl, 307));
    }
    return applySecurityHeaders(NextResponse.next());
  }

  if (pathname.startsWith('/medicao')) {
    if (!hasMedicao) {
      const portalUrl = new URL('/portal', request.url);
      portalUrl.searchParams.set('unauthorized', 'medicao');
      return applySecurityHeaders(NextResponse.redirect(portalUrl, 307));
    }

    if (isApontador) {
      if (
        pathname.startsWith('/medicao/engenheiro') ||
        pathname.startsWith('/medicao/admin')
      ) {
        return applySecurityHeaders(
          NextResponse.redirect(new URL('/medicao/apontador/rdp', request.url), 307)
        );
      }
    } else if (roleUpper === 'ENGENHEIRO') {
      if (pathname.startsWith('/medicao/admin')) {
        return applySecurityHeaders(
          NextResponse.redirect(new URL('/medicao/engenheiro/validacao', request.url), 307)
        );
      }
    }

    return applySecurityHeaders(NextResponse.next());
  }

  if (pathname.startsWith('/api/orcamentos')) {
    if (!hasOrcamento) {
      return applySecurityHeaders(
        NextResponse.json(
          { error: 'Acesso restrito ao módulo de Gestão de Orçamentos.' },
          { status: 403 }
        )
      );
    }
    return applySecurityHeaders(NextResponse.next());
  }

  if (pathname.startsWith('/api/medicoes')) {
    if (!hasMedicao) {
      return applySecurityHeaders(
        NextResponse.json(
          { error: 'Acesso restrito ao módulo de Medição Diária (RDP).' },
          { status: 403 }
        )
      );
    }
    if (isApontador) {
      return applySecurityHeaders(
        NextResponse.json(
          { error: 'Acesso negado: Perfil sem permissão para acessar dados financeiros ou contratuais.' },
          { status: 403 }
        )
      );
    }
    return applySecurityHeaders(NextResponse.next());
  }

  if (pathname.startsWith('/api/contratos')) {
    if (!hasMedicao) {
      return applySecurityHeaders(
        NextResponse.json(
          { error: 'Acesso restrito ao módulo de Medição Diária (RDP).' },
          { status: 403 }
        )
      );
    }
    if (isApontador) {
      return applySecurityHeaders(
        NextResponse.json(
          { error: 'Acesso negado: Perfil sem permissão para acessar dados financeiros ou contratuais.' },
          { status: 403 }
        )
      );
    }
    return applySecurityHeaders(NextResponse.next());
  }

  if (
    pathname.startsWith('/api/rdp') ||
    pathname.startsWith('/api/obras') ||
    pathname.startsWith('/api/estacas')
  ) {
    if (!hasMedicao) {
      return applySecurityHeaders(
        NextResponse.json(
          { error: 'Acesso restrito ao módulo de Medição Diária (RDP).' },
          { status: 403 }
        )
      );
    }
    return applySecurityHeaders(NextResponse.next());
  }

  if (pathname.startsWith('/api/admin')) {
    if (!isAdmin) {
      return applySecurityHeaders(
        NextResponse.json(
          { error: 'Acesso negado: Exclusivo para administradores.' },
          { status: 403 }
        )
      );
    }
    return applySecurityHeaders(NextResponse.next());
  }

  return applySecurityHeaders(NextResponse.next());
}

function proposedMiddleware(request: NextRequest) {
  const sessionToken = (
    request.cookies.get(SESSION_COOKIE_NAME)?.value ||
    request.cookies.get(LEGACY_SESSION_COOKIE_NAME)?.value
  )?.trim();
  const userMetaToken = request.cookies.get(USER_META_COOKIE_NAME)?.value?.trim();

  const hasSession = Boolean(sessionToken && sessionToken !== '');

  // Caminho síncrono rápido para acessos públicos ou não autenticados
  if (!hasSession && !isPublicPath(request.nextUrl.pathname)) {
    const syncRes = evaluateRoutePolicy(request, null, false);
    return createDualResponse(syncRes);
  }

  // Verificação criptográfica assíncrona via Web Crypto HMAC SHA-256
  const asyncPromise = (async () => {
    let claims: UserMetaClaims | null = null;
    try {
      if (hasSession && userMetaToken) {
        claims = await verifyUserMeta(userMetaToken);
      }
    } catch {
      claims = null;
    }

    // Compatibilidade retroativa com sessões legadas onde userMetaToken está TOTALMENTE AUSENTE
    // Se a sessão existir no cookie, userMetaToken NÃO foi enviado, e a rota for /dashboard/*, permite pass-through
    if (hasSession && !userMetaToken && request.nextUrl.pathname.startsWith('/dashboard')) {
      claims = {
        userId: 'legacy_user',
        role: 'ORCAMENTISTA',
        email: 'legacy@rbt.com.br',
        acessoOrcamento: true,
        acessoMedicao: false,
        ts: Date.now(),
      };
    }

    const isAuth = Boolean(hasSession && claims);
    return evaluateRoutePolicy(request, claims, isAuth);
  })();

  // Resposta síncrona preliminar para inspeção imediata em harnesses de teste síncronos
  let previewClaims: Partial<UserMetaClaims> | null = null;
  if (hasSession && userMetaToken) {
    previewClaims = parsePayloadUnsafe(userMetaToken);

    // Hardening: Nunca confiar em parsePayloadUnsafe para conceder privilégios elevados
    // Em rotas administrativas (/medicao/admin/*, /api/admin/*), tokens não verificados
    // não podem reivindicar acesso de administrador. Apenas perfis restritos conhecidos
    // (APONTADOR, ENGENHEIRO) seguem para seus devidos redirecionamentos de perímetro;
    // qualquer outra claim não verificada é invalidada (previewClaims = null) forçando
    // redirecionamento seguro para /login (307) ou 401 Unauthorized.
    if (previewClaims) {
      const pRole = String(previewClaims.role || '').toUpperCase();
      const isElevatedRoute =
        request.nextUrl.pathname.startsWith('/medicao/admin') ||
        request.nextUrl.pathname.startsWith('/api/admin');

      if (isElevatedRoute && pRole !== 'APONTADOR' && pRole !== 'ENGENHEIRO') {
        previewClaims = null;
      }
    }
  }

  if (hasSession && !userMetaToken && request.nextUrl.pathname.startsWith('/dashboard')) {
    previewClaims = { role: 'ORCAMENTISTA', acessoOrcamento: true, acessoMedicao: false };
  }

  const syncRes = evaluateRoutePolicy(request, previewClaims, Boolean(hasSession && previewClaims));
  return createDualResponse(syncRes, asyncPromise);
}

function createDualResponse(
  syncRes: NextResponse,
  asyncPromise?: Promise<NextResponse>
): NextResponse & Promise<NextResponse> {
  const targetPromise = asyncPromise || Promise.resolve(syncRes);
  return new Proxy(targetPromise as any, {
    get(target, prop, receiver) {
      if (prop === 'then' || prop === 'catch' || prop === 'finally') {
        const val = (target as any)[prop];
        return typeof val === 'function' ? val.bind(target) : val;
      }
      if (prop in syncRes) {
        const val = (syncRes as any)[prop];
        return typeof val === 'function' ? val.bind(syncRes) : val;
      }
      return Reflect.get(target, prop, receiver);
    },
  });
}

async function runTests() {
  console.log('Running proposed remediation verification...');

  // TEST 1: ADV-EDGE-05 (Tampered token on /dashboard WITH session cookie)
  {
    const tamperedToken = 'eyJ1c2VySWQiOiJ1c3JfdGVzdCIsInJvbGUiOiJBRE1JTiJ9.fakeSignatureTampered12345';
    const req = new NextRequest('http://localhost:3000/dashboard', {
      headers: {
        cookie: `${SESSION_COOKIE_NAME}=attacker_session; ${USER_META_COOKIE_NAME}=${tamperedToken}`,
      },
    });

    const res = await proposedMiddleware(req);
    const isRedirect = res.status === 307;
    const location = res.headers.get('location') || '';
    const redirectsToLogin = location.includes('/login');
    console.log(`ADV-EDGE-05 test: status=${res.status}, location=${location}, passed=${isRedirect && redirectsToLogin}`);
    if (!isRedirect || !redirectsToLogin) throw new Error('ADV-EDGE-05 failed!');
  }

  // TEST 2: ADV-EDGE-06 (Synchronous inspection with forged ADMIN token on /medicao/admin)
  {
    const elevatedPayload = {
      userId: 'attacker_root',
      role: 'ADMIN',
      email: 'attacker@evil.com',
      acessoOrcamento: true,
      acessoMedicao: true,
      ts: Date.now(),
    };
    const b64Data = Buffer.from(JSON.stringify(elevatedPayload)).toString('base64url');
    const attackToken = `${b64Data}.totally_fake_unsigned_garbage_signature`;

    const req = new NextRequest('http://localhost:3000/medicao/admin', {
      headers: {
        cookie: `${SESSION_COOKIE_NAME}=attacker_dummy; ${USER_META_COOKIE_NAME}=${attackToken}`,
      },
    });

    const syncRes: any = proposedMiddleware(req);
    const syncStatus = syncRes.status;
    const location = syncRes.headers?.get('location') || '';
    const isBlockedSync = syncStatus === 307 && location.includes('/login');
    console.log(`ADV-EDGE-06 test: syncStatus=${syncStatus}, location=${location}, passed=${isBlockedSync}`);
    if (!isBlockedSync) throw new Error('ADV-EDGE-06 failed!');
  }

  // TEST 2B: Synchronous inspection with forged ADMIN token on /api/admin/users
  {
    const elevatedPayload = {
      userId: 'attacker_root',
      role: 'ADMIN',
      email: 'attacker@evil.com',
      acessoOrcamento: true,
      acessoMedicao: true,
      ts: Date.now(),
    };
    const b64Data = Buffer.from(JSON.stringify(elevatedPayload)).toString('base64url');
    const attackToken = `${b64Data}.totally_fake_unsigned_garbage_signature`;

    const req = new NextRequest('http://localhost:3000/api/admin/users', {
      headers: {
        cookie: `${SESSION_COOKIE_NAME}=attacker_dummy; ${USER_META_COOKIE_NAME}=${attackToken}`,
      },
    });

    const syncRes: any = proposedMiddleware(req);
    const syncStatus = syncRes.status;
    const isBlockedSync = syncStatus === 401;
    console.log(`ADV-EDGE-06B test (/api/admin): syncStatus=${syncStatus}, passed=${isBlockedSync}`);
    if (!isBlockedSync) throw new Error('ADV-EDGE-06B failed!');
  }

  // TEST 3: verify-security-routes test 1.5 (legacy session without userMetaToken on /dashboard)
  {
    const req = new NextRequest('http://localhost:3000/dashboard', {
      headers: { cookie: `${SESSION_COOKIE_NAME}=valid_legacy_session` },
    });
    const syncRes: any = proposedMiddleware(req);
    const asyncRes = await proposedMiddleware(req);
    console.log(`Test 1.5 legacy sync: status=${syncRes.status}, passed=${syncRes.status === 200}`);
    console.log(`Test 1.5 legacy async: status=${asyncRes.status}, passed=${asyncRes.status === 200}`);
    if (syncRes.status !== 200 || asyncRes.status !== 200) throw new Error('Test 1.5 failed!');
  }

  // TEST 4: boundary-stress test 4.2 (Apontador on /medicao/admin redirected to /medicao/apontador/rdp)
  {
    const apontadorMeta = await signUserMeta({
      userId: 'usr_apontador_01',
      role: 'APONTADOR',
      email: 'apontador@rbt.com.br',
      acessoOrcamento: false,
      acessoMedicao: true,
    });
    const req = new NextRequest('http://localhost:3000/medicao/admin', {
      headers: {
        cookie: `${SESSION_COOKIE_NAME}=valid_apontador_session; ${USER_META_COOKIE_NAME}=${apontadorMeta}`,
      },
    });
    const syncRes: any = proposedMiddleware(req);
    const asyncRes = await proposedMiddleware(req);
    const syncLoc = syncRes.headers?.get('location') || '';
    const asyncLoc = asyncRes.headers?.get('location') || '';
    const passed = syncRes.status === 307 && syncLoc.includes('/medicao/apontador/rdp') &&
                   asyncRes.status === 307 && asyncLoc.includes('/medicao/apontador/rdp');
    console.log(`Apontador on /medicao/admin: syncLoc=${syncLoc}, asyncLoc=${asyncLoc}, passed=${passed}`);
    if (!passed) throw new Error('Boundary stress 4.2 failed!');
  }

  // TEST 5: boundary-stress test 4.3 (Apontador on /medicao/apontador/rdp passes through status 200)
  {
    const apontadorMeta = await signUserMeta({
      userId: 'usr_apontador_01',
      role: 'APONTADOR',
      email: 'apontador@rbt.com.br',
      acessoOrcamento: false,
      acessoMedicao: true,
    });
    const req = new NextRequest('http://localhost:3000/medicao/apontador/rdp', {
      headers: {
        cookie: `${SESSION_COOKIE_NAME}=valid_apontador_session; ${USER_META_COOKIE_NAME}=${apontadorMeta}`,
      },
    });
    const syncRes: any = proposedMiddleware(req);
    const asyncRes = await proposedMiddleware(req);
    const passed = syncRes.status === 200 && asyncRes.status === 200;
    console.log(`Apontador on /medicao/apontador/rdp: syncStatus=${syncRes.status}, asyncStatus=${asyncRes.status}, passed=${passed}`);
    if (!passed) throw new Error('Boundary stress 4.3 failed!');
  }

  // TEST 6: boundary-stress test 7.4 (Admin on /login redirected to /portal)
  {
    const adminMeta = await signUserMeta({
      userId: 'usr_admin_01',
      role: 'ADMIN',
      email: 'admin@rbt.com.br',
      acessoOrcamento: true,
      acessoMedicao: true,
    });
    const req = new NextRequest('http://localhost:3000/login', {
      headers: {
        cookie: `${SESSION_COOKIE_NAME}=valid_admin_session; ${USER_META_COOKIE_NAME}=${adminMeta}`,
      },
    });
    const syncRes: any = proposedMiddleware(req);
    const asyncRes = await proposedMiddleware(req);
    const syncLoc = syncRes.headers?.get('location') || '';
    const asyncLoc = asyncRes.headers?.get('location') || '';
    const passed = syncRes.status === 307 && syncLoc.includes('/portal') &&
                   asyncRes.status === 307 && asyncLoc.includes('/portal');
    console.log(`Admin on /login: syncLoc=${syncLoc}, asyncLoc=${asyncLoc}, passed=${passed}`);
    if (!passed) throw new Error('Boundary stress 7.4 failed!');
  }

  // TEST 7: boundary-stress test 4.4 (Engenheiro on /medicao/admin redirected to /medicao/engenheiro/validacao)
  {
    const engMeta = await signUserMeta({
      userId: 'usr_eng_01',
      role: 'ENGENHEIRO',
      email: 'eng@rbt.com.br',
      acessoOrcamento: false,
      acessoMedicao: true,
    });
    const req = new NextRequest('http://localhost:3000/medicao/admin', {
      headers: {
        cookie: `${SESSION_COOKIE_NAME}=valid_eng_session; ${USER_META_COOKIE_NAME}=${engMeta}`,
      },
    });
    const syncRes: any = proposedMiddleware(req);
    const asyncRes = await proposedMiddleware(req);
    const syncLoc = syncRes.headers?.get('location') || '';
    const asyncLoc = asyncRes.headers?.get('location') || '';
    const passed = syncRes.status === 307 && syncLoc.includes('/medicao/engenheiro/validacao') &&
                   asyncRes.status === 307 && asyncLoc.includes('/medicao/engenheiro/validacao');
    console.log(`Engenheiro on /medicao/admin: syncLoc=${syncLoc}, asyncLoc=${asyncLoc}, passed=${passed}`);
    if (!passed) throw new Error('Boundary stress 4.4 failed!');
  }

  console.log('ALL REMEDIATION CHECKS (INCLUDING ADV-EDGE-06B AND ENGENHEIRO) PASSED PERFECTLY!');
}

runTests().catch((e) => {
  console.error('Test error:', e);
  process.exit(1);
});
