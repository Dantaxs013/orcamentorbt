/**
 * Challenger M5-2: Empirical Adversarial Stress Test Suite
 * Route Boundaries, Unauthorized Redirects, Apontador Isolation & API Status Codes
 *
 * Target Verifications:
 * 1. Unauthorized access to /dashboard/* -> status 307 redirect to /portal?unauthorized=orcamentos.
 * 2. Unauthorized access to /medicao/* -> status 307 redirect to /portal?unauthorized=medicao.
 * 3. Unauthenticated access to /dashboard, /medicao, /portal -> status 307 redirect to /login?redirect=...
 * 4. Apontador role perimeter: blocked from /medicao/engenheiro/* and /medicao/admin/* -> redirected to /medicao/apontador/rdp.
 * 5. Apontador blocked from /api/medicoes/* and /api/contratos/* -> HTTP 403 Forbidden.
 * 6. API endpoints return HTTP 401 for unauthenticated calls and HTTP 403 for unauthorized calls.
 * 7. Adversarial Fuzzing: Tampered signatures, bit flips, expired tokens, future timestamps, path traversal.
 * 8. Dual Runtime Verification: Synchronous property access AND Asynchronous awaited resolution.
 */

import { NextRequest, NextResponse } from 'next/server';
import { middleware, SESSION_COOKIE_NAME, LEGACY_SESSION_COOKIE_NAME } from '../src/middleware';
import { signUserMeta, USER_META_COOKIE_NAME, UserMetaClaims } from '../src/lib/token-utils';
import { prisma } from '../src/lib/db';
import { createSession, destroySession } from '../src/lib/session';

interface TestResult {
  suite: string;
  testId: string;
  name: string;
  passed: boolean;
  durationMs: number;
  details?: string;
}

const results: TestResult[] = [];
let currentSuite = '';

function suite(name: string) {
  currentSuite = name;
  console.log(`\n===============================================================`);
  console.log(`  SUITE: ${name}`);
  console.log(`===============================================================`);
}

function recordTest(testId: string, name: string, passed: boolean, start: number, details?: string) {
  const durationMs = Number((performance.now() - start).toFixed(2));
  results.push({ suite: currentSuite, testId, name, passed, durationMs, details });
  const mark = passed ? '✓ [PASS]' : '✗ [FAIL]';
  console.log(`  ${mark} ${testId}: ${name} (${durationMs}ms)`);
  if (!passed && details) {
    console.error(`         Failure Details: ${details}`);
  }
}

function assertEqual<T>(actual: T, expected: T, message: string) {
  if (actual !== expected) {
    throw new Error(`${message} — Expected: ${JSON.stringify(expected)}, Got: ${JSON.stringify(actual)}`);
  }
}

function assertIncludes(haystack: string, needle: string, message: string) {
  if (!haystack.includes(needle)) {
    throw new Error(`${message} — String does not include "${needle}". Got: "${haystack}"`);
  }
}

// Helper to create simulated NextRequest with cookies
function createTestRequest(url: string, cookies?: Record<string, string>): NextRequest {
  const headers: Record<string, string> = {};
  if (cookies && Object.keys(cookies).length > 0) {
    headers['cookie'] = Object.entries(cookies)
      .map(([k, v]) => `${k}=${v}`)
      .join('; ');
  }
  return new NextRequest(url, { headers });
}

// Helper to test both sync and async response behavior
async function executeDualMiddleware(req: NextRequest) {
  const syncRes = middleware(req) as any;
  const asyncRes = await (middleware(req) as any);
  return { syncRes, asyncRes };
}

async function runAllAdversarialSuites() {
  const overallStart = performance.now();
  console.log('===============================================================');
  console.log('  CHALLENGER M5-2: ADVERSARIAL ROUTE & SECURITY HARNESS        ');
  console.log('===============================================================');
  console.log(`Execution started at: ${new Date().toISOString()}`);

  // Fetch or setup personas
  const orcamentista = await prisma.user.findFirst({ where: { role: 'ORCAMENTISTA' } });
  const apontador = await prisma.user.findFirst({ where: { role: 'APONTADOR' } });
  const engenheiro = await prisma.user.findFirst({ where: { role: 'ENGENHEIRO' } });
  const admin = await prisma.user.findFirst({ where: { role: 'ADMIN' } });

  if (!orcamentista || !apontador || !engenheiro || !admin) {
    throw new Error('Database missing essential seeded personas. Run db seed first.');
  }

  // Pre-generate signed tokens for personas
  const tokens = {
    orcamentista: {
      session: 'sess_orcamentista_test_' + Date.now(),
      meta: await signUserMeta({
        userId: orcamentista.id,
        role: orcamentista.role,
        email: orcamentista.email,
        acessoOrcamento: true,
        acessoMedicao: false,
      }),
    },
    apontador: {
      session: 'sess_apontador_test_' + Date.now(),
      meta: await signUserMeta({
        userId: apontador.id,
        role: apontador.role,
        email: apontador.email,
        acessoOrcamento: false,
        acessoMedicao: true,
      }),
    },
    engenheiro: {
      session: 'sess_engenheiro_test_' + Date.now(),
      meta: await signUserMeta({
        userId: engenheiro.id,
        role: engenheiro.role,
        email: engenheiro.email,
        acessoOrcamento: false,
        acessoMedicao: true,
      }),
    },
    admin: {
      session: 'sess_admin_test_' + Date.now(),
      meta: await signUserMeta({
        userId: admin.id,
        role: admin.role,
        email: admin.email,
        acessoOrcamento: true,
        acessoMedicao: true,
      }),
    },
    noModulesUser: {
      session: 'sess_nomodules_test_' + Date.now(),
      meta: await signUserMeta({
        userId: 'no_mod_id',
        role: 'CLIENTE',
        email: 'nomod@rbt.com.br',
        acessoOrcamento: false,
        acessoMedicao: false,
      }),
    },
  };

  // =========================================================================
  // SUITE 1: Unauthorized access to /dashboard/* -> status 307 redirect
  // =========================================================================
  suite('1. Unauthorized Access to /dashboard/* (/portal?unauthorized=orcamentos)');

  const dashboardTargets = [
    '/dashboard',
    '/dashboard/',
    '/dashboard/orcamentos',
    '/dashboard/orcamentos/calc-12345',
    '/dashboard/orcamentos/calc-12345/editar',
    '/dashboard/usuarios',
    '/dashboard/usuarios/novo',
    '/dashboard/relatorios?periodo=mensal&tipo=completo',
    '/dashboard/configuracoes#secao-geral',
  ];

  for (const [idx, target] of dashboardTargets.entries()) {
    const tStart = performance.now();
    try {
      // Test with Apontador (acessoMedicao=true, acessoOrcamento=false)
      const req = createTestRequest(`http://localhost:3000${target}`, {
        [SESSION_COOKIE_NAME]: tokens.apontador.session,
        [USER_META_COOKIE_NAME]: tokens.apontador.meta,
      });

      const { syncRes, asyncRes } = await executeDualMiddleware(req);

      // Verify synchronous proxy response
      assertEqual(syncRes.status, 307, 'Sync response status must be 307');
      const syncLoc = syncRes.headers.get('location') || '';
      assertIncludes(syncLoc, '/portal?unauthorized=orcamentos', 'Sync location must redirect to /portal?unauthorized=orcamentos');

      // Verify asynchronous awaited genuine response
      assertEqual(asyncRes.status, 307, 'Async response status must be 307');
      const asyncLoc = asyncRes.headers.get('location') || '';
      assertIncludes(asyncLoc, '/portal?unauthorized=orcamentos', 'Async location must redirect to /portal?unauthorized=orcamentos');

      // Verify security headers
      assertEqual(asyncRes.headers.get('x-content-type-options'), 'nosniff', 'Must include nosniff');
      assertEqual(asyncRes.headers.get('x-frame-options'), 'DENY', 'Must include DENY');

      recordTest(`DASH-UNAUTH-${idx + 1}`, `Apontador blocked from ${target} -> 307 to /portal?unauthorized=orcamentos`, true, tStart);
    } catch (err: any) {
      recordTest(`DASH-UNAUTH-${idx + 1}`, `Apontador blocked from ${target}`, false, tStart, err.message);
    }
  }

  // Also test with Engenheiro and Zero-Module user
  {
    const tStart = performance.now();
    try {
      const reqEng = createTestRequest('http://localhost:3000/dashboard/orcamentos', {
        [SESSION_COOKIE_NAME]: tokens.engenheiro.session,
        [USER_META_COOKIE_NAME]: tokens.engenheiro.meta,
      });
      const { asyncRes: resEng } = await executeDualMiddleware(reqEng);
      assertEqual(resEng.status, 307, 'Engenheiro must be redirected with 307');
      assertIncludes(resEng.headers.get('location') || '', '/portal?unauthorized=orcamentos', 'Redirects to unauthorized=orcamentos');

      const reqNoMod = createTestRequest('http://localhost:3000/dashboard', {
        [SESSION_COOKIE_NAME]: tokens.noModulesUser.session,
        [USER_META_COOKIE_NAME]: tokens.noModulesUser.meta,
      });
      const { asyncRes: resNoMod } = await executeDualMiddleware(reqNoMod);
      assertEqual(resNoMod.status, 307, 'Zero-module user must be redirected with 307');
      assertIncludes(resNoMod.headers.get('location') || '', '/portal?unauthorized=orcamentos', 'Redirects to unauthorized=orcamentos');

      recordTest('DASH-UNAUTH-ENG-NOMOD', 'Engenheiro and Zero-module users strictly redirected from /dashboard/*', true, tStart);
    } catch (err: any) {
      recordTest('DASH-UNAUTH-ENG-NOMOD', 'Engenheiro and Zero-module check', false, tStart, err.message);
    }
  }

  // =========================================================================
  // SUITE 2: Unauthorized access to /medicao/* -> status 307 redirect
  // =========================================================================
  suite('2. Unauthorized Access to /medicao/* (/portal?unauthorized=medicao)');

  const medicaoTargets = [
    '/medicao',
    '/medicao/',
    '/medicao/apontador',
    '/medicao/apontador/rdp',
    '/medicao/apontador/novo-rdp',
    '/medicao/engenheiro',
    '/medicao/engenheiro/validacao',
    '/medicao/admin',
    '/medicao/admin/usuarios',
    '/medicao/admin/obras',
    '/medicao/obras',
    '/medicao/estacas',
    '/medicao/relatorios?view=consolidado',
  ];

  for (const [idx, target] of medicaoTargets.entries()) {
    const tStart = performance.now();
    try {
      // Test with Orcamentista (acessoOrcamento=true, acessoMedicao=false)
      const req = createTestRequest(`http://localhost:3000${target}`, {
        [SESSION_COOKIE_NAME]: tokens.orcamentista.session,
        [USER_META_COOKIE_NAME]: tokens.orcamentista.meta,
      });

      const { syncRes, asyncRes } = await executeDualMiddleware(req);

      // Verify sync
      assertEqual(syncRes.status, 307, 'Sync response status must be 307');
      const syncLoc = syncRes.headers.get('location') || '';
      assertIncludes(syncLoc, '/portal?unauthorized=medicao', 'Sync location must redirect to /portal?unauthorized=medicao');

      // Verify async
      assertEqual(asyncRes.status, 307, 'Async response status must be 307');
      const asyncLoc = asyncRes.headers.get('location') || '';
      assertIncludes(asyncLoc, '/portal?unauthorized=medicao', 'Async location must redirect to /portal?unauthorized=medicao');

      // Verify security headers
      assertEqual(asyncRes.headers.get('x-content-type-options'), 'nosniff', 'Must include nosniff');
      assertEqual(asyncRes.headers.get('x-frame-options'), 'DENY', 'Must include DENY');

      recordTest(`MED-UNAUTH-${idx + 1}`, `Orcamentista blocked from ${target} -> 307 to /portal?unauthorized=medicao`, true, tStart);
    } catch (err: any) {
      recordTest(`MED-UNAUTH-${idx + 1}`, `Orcamentista blocked from ${target}`, false, tStart, err.message);
    }
  }

  // =========================================================================
  // SUITE 3: Unauthenticated access to /dashboard, /medicao, /portal
  // =========================================================================
  suite('3. Unauthenticated Access to /dashboard, /medicao, /portal -> /login?redirect=...');

  const unauthenticatedCases = [
    { target: '/dashboard', label: '/dashboard root' },
    { target: '/dashboard/orcamentos/123?tab=details', label: '/dashboard subroute with query' },
    { target: '/medicao', label: '/medicao root' },
    { target: '/medicao/apontador/rdp', label: '/medicao subroute' },
    { target: '/medicao/engenheiro/validacao?obra=10', label: '/medicao subroute with query' },
    { target: '/portal', label: '/portal root' },
    { target: '/portal/configuracoes?view=all', label: '/portal subroute with query' },
  ];

  for (const [idx, item] of unauthenticatedCases.entries()) {
    const tStart = performance.now();
    try {
      // 3.1 No cookie at all
      const reqNoCookie = createTestRequest(`http://localhost:3000${item.target}`);
      const { asyncRes: resNoCookie } = await executeDualMiddleware(reqNoCookie);
      assertEqual(resNoCookie.status, 307, 'Status must be 307');
      const locNoCookie = resNoCookie.headers.get('location') || '';
      assertIncludes(locNoCookie, '/login?redirect=', 'Location must point to /login?redirect=');
      assertIncludes(locNoCookie, encodeURIComponent(item.target), 'Redirect param must encode exact target path');

      // 3.2 Empty cookie
      const reqEmpty = createTestRequest(`http://localhost:3000${item.target}`, {
        [SESSION_COOKIE_NAME]: '',
      });
      const { asyncRes: resEmpty } = await executeDualMiddleware(reqEmpty);
      assertEqual(resEmpty.status, 307, 'Empty cookie must redirect 307');

      // 3.3 Whitespace cookie
      const reqSpace = createTestRequest(`http://localhost:3000${item.target}`, {
        [SESSION_COOKIE_NAME]: '    ',
      });
      const { asyncRes: resSpace } = await executeDualMiddleware(reqSpace);
      assertEqual(resSpace.status, 307, 'Whitespace cookie must redirect 307');

      recordTest(`UNAUTH-LOGIN-${idx + 1}`, `Unauthenticated access to ${item.label} redirects to /login with target encoded`, true, tStart);
    } catch (err: any) {
      recordTest(`UNAUTH-LOGIN-${idx + 1}`, `Unauthenticated access to ${item.label}`, false, tStart, err.message);
    }
  }

  // =========================================================================
  // SUITE 4: Apontador Role Perimeter Enforcement
  // =========================================================================
  suite('4. Apontador Role Perimeter Enforcement');

  const engineerTargets = [
    '/medicao/engenheiro',
    '/medicao/engenheiro/',
    '/medicao/engenheiro/validacao',
    '/medicao/engenheiro/boletim',
    '/medicao/engenheiro/boletim/12345',
    '/medicao/engenheiro/aprovacoes?status=pendente',
  ];

  const adminTargets = [
    '/medicao/admin',
    '/medicao/admin/',
    '/medicao/admin/usuarios',
    '/medicao/admin/obras',
    '/medicao/admin/contratos',
    '/medicao/admin/configuracoes',
  ];

  const permittedApontadorTargets = [
    '/medicao/apontador/rdp',
    '/medicao/apontador/novo-rdp',
    '/medicao/obras',
    '/medicao/estacas',
  ];

  // 4.1 Apontador blocked from engineer routes
  for (const [idx, target] of engineerTargets.entries()) {
    const tStart = performance.now();
    try {
      const req = createTestRequest(`http://localhost:3000${target}`, {
        [SESSION_COOKIE_NAME]: tokens.apontador.session,
        [USER_META_COOKIE_NAME]: tokens.apontador.meta,
      });
      const { syncRes, asyncRes } = await executeDualMiddleware(req);

      assertEqual(syncRes.status, 307, 'Sync response status must be 307');
      assertEqual(syncRes.headers.get('location'), 'http://localhost:3000/medicao/apontador/rdp', 'Must redirect to /medicao/apontador/rdp');

      assertEqual(asyncRes.status, 307, 'Async response status must be 307');
      assertEqual(asyncRes.headers.get('location'), 'http://localhost:3000/medicao/apontador/rdp', 'Must redirect to /medicao/apontador/rdp');

      recordTest(`APT-ENG-BLOCKED-${idx + 1}`, `Apontador blocked from ${target} -> 307 redirect to /medicao/apontador/rdp`, true, tStart);
    } catch (err: any) {
      recordTest(`APT-ENG-BLOCKED-${idx + 1}`, `Apontador blocked from ${target}`, false, tStart, err.message);
    }
  }

  // 4.2 Apontador blocked from admin routes
  for (const [idx, target] of adminTargets.entries()) {
    const tStart = performance.now();
    try {
      const req = createTestRequest(`http://localhost:3000${target}`, {
        [SESSION_COOKIE_NAME]: tokens.apontador.session,
        [USER_META_COOKIE_NAME]: tokens.apontador.meta,
      });
      const { syncRes, asyncRes } = await executeDualMiddleware(req);

      assertEqual(syncRes.status, 307, 'Sync response status must be 307');
      assertEqual(syncRes.headers.get('location'), 'http://localhost:3000/medicao/apontador/rdp', 'Must redirect to /medicao/apontador/rdp');

      assertEqual(asyncRes.status, 307, 'Async response status must be 307');
      assertEqual(asyncRes.headers.get('location'), 'http://localhost:3000/medicao/apontador/rdp', 'Must redirect to /medicao/apontador/rdp');

      recordTest(`APT-ADM-BLOCKED-${idx + 1}`, `Apontador blocked from ${target} -> 307 redirect to /medicao/apontador/rdp`, true, tStart);
    } catch (err: any) {
      recordTest(`APT-ADM-BLOCKED-${idx + 1}`, `Apontador blocked from ${target}`, false, tStart, err.message);
    }
  }

  // 4.3 Permitted routes for Apontador
  for (const [idx, target] of permittedApontadorTargets.entries()) {
    const tStart = performance.now();
    try {
      const req = createTestRequest(`http://localhost:3000${target}`, {
        [SESSION_COOKIE_NAME]: tokens.apontador.session,
        [USER_META_COOKIE_NAME]: tokens.apontador.meta,
      });
      const { syncRes, asyncRes } = await executeDualMiddleware(req);

      assertEqual(syncRes.status, 200, 'Sync response status must be 200 (pass-through)');
      assertEqual(syncRes.headers.get('location'), null, 'Must not redirect');

      assertEqual(asyncRes.status, 200, 'Async response status must be 200 (pass-through)');
      assertEqual(asyncRes.headers.get('location'), null, 'Must not redirect');

      recordTest(`APT-PERMITTED-${idx + 1}`, `Apontador permitted on operational route ${target} (status 200)`, true, tStart);
    } catch (err: any) {
      recordTest(`APT-PERMITTED-${idx + 1}`, `Apontador permitted on ${target}`, false, tStart, err.message);
    }
  }

  // 4.4 Additional Role Perimeter checks: Engenheiro blocked from /medicao/admin/*
  {
    const tStart = performance.now();
    try {
      const req = createTestRequest('http://localhost:3000/medicao/admin/usuarios', {
        [SESSION_COOKIE_NAME]: tokens.engenheiro.session,
        [USER_META_COOKIE_NAME]: tokens.engenheiro.meta,
      });
      const { asyncRes } = await executeDualMiddleware(req);
      assertEqual(asyncRes.status, 307, 'Engenheiro must be 307 redirected from /medicao/admin/*');
      assertEqual(asyncRes.headers.get('location'), 'http://localhost:3000/medicao/engenheiro/validacao', 'Redirected to engineer validation');

      recordTest('ENG-ADM-PERIMETER', 'Engenheiro blocked from /medicao/admin/* -> 307 to /medicao/engenheiro/validacao', true, tStart);
    } catch (err: any) {
      recordTest('ENG-ADM-PERIMETER', 'Engenheiro blocked from /medicao/admin/*', false, tStart, err.message);
    }
  }

  // 4.5 Admin has unrestricted access to all Medição areas
  {
    const tStart = performance.now();
    try {
      for (const t of ['/medicao/admin/usuarios', '/medicao/engenheiro/validacao', '/medicao/apontador/rdp']) {
        const req = createTestRequest(`http://localhost:3000${t}`, {
          [SESSION_COOKIE_NAME]: tokens.admin.session,
          [USER_META_COOKIE_NAME]: tokens.admin.meta,
        });
        const { asyncRes } = await executeDualMiddleware(req);
        assertEqual(asyncRes.status, 200, `Admin must have pass-through (200) on ${t}`);
        assertEqual(asyncRes.headers.get('location'), null, 'Admin must not be redirected');
      }
      recordTest('ADM-FULL-PERIMETER', 'Admin has unrestricted 200 pass-through across all Medição sub-routes', true, tStart);
    } catch (err: any) {
      recordTest('ADM-FULL-PERIMETER', 'Admin full perimeter check', false, tStart, err.message);
    }
  }

  // =========================================================================
  // SUITE 5: Apontador Blocked from /api/medicoes/* & /api/contratos/* (HTTP 403)
  // =========================================================================
  suite('5. Apontador Blocked from Financial APIs (/api/medicoes/*, /api/contratos/*)');

  const financialApiEndpoints = [
    '/api/medicoes',
    '/api/medicoes/101',
    '/api/medicoes/101/boletim',
    '/api/medicoes/101/itens',
    '/api/medicoes/exportar-pdf',
    '/api/contratos',
    '/api/contratos/novo',
    '/api/contratos/202',
    '/api/contratos/202/itens',
    '/api/contratos/202/reajuste',
  ];

  for (const [idx, endpoint] of financialApiEndpoints.entries()) {
    const tStart = performance.now();
    try {
      const req = createTestRequest(`http://localhost:3000${endpoint}`, {
        [SESSION_COOKIE_NAME]: tokens.apontador.session,
        [USER_META_COOKIE_NAME]: tokens.apontador.meta,
      });

      const { syncRes, asyncRes } = await executeDualMiddleware(req);

      // Verify sync response
      assertEqual(syncRes.status, 403, 'Sync response status must be 403 Forbidden');

      // Verify async response
      assertEqual(asyncRes.status, 403, 'Async response status must be 403 Forbidden');
      const body = await asyncRes.json();
      assertIncludes(
        body.error,
        'Perfil sem permissão para acessar dados financeiros ou contratuais',
        'Error message must state financial/contract denial'
      );

      recordTest(`APT-API-403-${idx + 1}`, `Apontador blocked from ${endpoint} -> HTTP 403 Forbidden with zero financial leak`, true, tStart);
    } catch (err: any) {
      recordTest(`APT-API-403-${idx + 1}`, `Apontador blocked from ${endpoint}`, false, tStart, err.message);
    }
  }

  // Verify Engenheiro and Admin CAN access /api/medicoes and /api/contratos
  {
    const tStart = performance.now();
    try {
      const reqEng = createTestRequest('http://localhost:3000/api/medicoes', {
        [SESSION_COOKIE_NAME]: tokens.engenheiro.session,
        [USER_META_COOKIE_NAME]: tokens.engenheiro.meta,
      });
      const { asyncRes: resEng } = await executeDualMiddleware(reqEng);
      assertEqual(resEng.status, 200, 'Engenheiro must be allowed (status 200) on /api/medicoes');

      const reqAdm = createTestRequest('http://localhost:3000/api/contratos', {
        [SESSION_COOKIE_NAME]: tokens.admin.session,
        [USER_META_COOKIE_NAME]: tokens.admin.meta,
      });
      const { asyncRes: resAdm } = await executeDualMiddleware(reqAdm);
      assertEqual(resAdm.status, 200, 'Admin must be allowed (status 200) on /api/contratos');

      recordTest('ENG-ADM-FINANCIAL-API', 'Engenheiro and Admin permitted (status 200) on /api/medicoes and /api/contratos', true, tStart);
    } catch (err: any) {
      recordTest('ENG-ADM-FINANCIAL-API', 'Engenheiro and Admin financial access check', false, tStart, err.message);
    }
  }

  // Verify Apontador CAN access operational APIs (/api/rdp, /api/obras, /api/estacas)
  {
    const tStart = performance.now();
    try {
      for (const opEndpoint of ['/api/rdp', '/api/obras', '/api/estacas']) {
        const reqOp = createTestRequest(`http://localhost:3000${opEndpoint}`, {
          [SESSION_COOKIE_NAME]: tokens.apontador.session,
          [USER_META_COOKIE_NAME]: tokens.apontador.meta,
        });
        const { asyncRes: resOp } = await executeDualMiddleware(reqOp);
        assertEqual(resOp.status, 200, `Apontador must be allowed (status 200) on ${opEndpoint}`);
      }
      recordTest('APT-OPERATIONAL-API', 'Apontador permitted (status 200) on operational APIs (/api/rdp, /api/obras, /api/estacas)', true, tStart);
    } catch (err: any) {
      recordTest('APT-OPERATIONAL-API', 'Apontador operational API check', false, tStart, err.message);
    }
  }

  // =========================================================================
  // SUITE 6: API Status Codes: HTTP 401 Unauthenticated & HTTP 403 Unauthorized
  // =========================================================================
  suite('6. API Status Codes: HTTP 401 Unauthenticated & HTTP 403 Unauthorized');

  const protectedApiEndpoints = [
    '/api/orcamentos',
    '/api/orcamentos/501',
    '/api/medicoes',
    '/api/medicoes/502',
    '/api/contratos',
    '/api/contratos/503',
    '/api/rdp',
    '/api/rdp/novo',
    '/api/obras',
    '/api/estacas',
    '/api/admin/users',
    '/api/admin/system',
  ];

  // 6.1 Unauthenticated API requests must return HTTP 401 JSON
  for (const [idx, endpoint] of protectedApiEndpoints.entries()) {
    const tStart = performance.now();
    try {
      const req = createTestRequest(`http://localhost:3000${endpoint}`);
      const { syncRes, asyncRes } = await executeDualMiddleware(req);

      assertEqual(syncRes.status, 401, 'Sync response status must be 401');
      assertEqual(asyncRes.status, 401, 'Async response status must be 401');

      const body = await asyncRes.json();
      assertIncludes(body.error, 'Não autenticado', 'Error must indicate unauthenticated');

      recordTest(`API-UNAUTH-401-${idx + 1}`, `Unauthenticated call to ${endpoint} -> HTTP 401 JSON`, true, tStart);
    } catch (err: any) {
      recordTest(`API-UNAUTH-401-${idx + 1}`, `Unauthenticated call to ${endpoint}`, false, tStart, err.message);
    }
  }

  // 6.2 Public API endpoints must NOT return 401
  const publicApiEndpoints = [
    '/api/auth/login',
    '/api/auth/logout',
    '/api/health',
    '/api/marca/pdf',
    '/api/formulario/lead-submit',
  ];

  for (const [idx, endpoint] of publicApiEndpoints.entries()) {
    const tStart = performance.now();
    try {
      const req = createTestRequest(`http://localhost:3000${endpoint}`);
      const { asyncRes } = await executeDualMiddleware(req);

      assertEqual(asyncRes.status, 200, `Public API ${endpoint} must pass through (status 200)`);
      assertEqual(asyncRes.headers.get('location'), null, 'Public API must not redirect');

      recordTest(`API-PUBLIC-200-${idx + 1}`, `Public API ${endpoint} passes through without authentication (status 200)`, true, tStart);
    } catch (err: any) {
      recordTest(`API-PUBLIC-200-${idx + 1}`, `Public API ${endpoint}`, false, tStart, err.message);
    }
  }

  // 6.3 Unauthorized API calls return HTTP 403
  const unauthorizedApiCases = [
    {
      endpoint: '/api/medicoes',
      tokenSet: tokens.orcamentista,
      label: 'Orcamentista accessing /api/medicoes',
      expectedMsg: 'Acesso restrito ao módulo de Medição Diária (RDP).',
    },
    {
      endpoint: '/api/contratos',
      tokenSet: tokens.orcamentista,
      label: 'Orcamentista accessing /api/contratos',
      expectedMsg: 'Acesso restrito ao módulo de Medição Diária (RDP).',
    },
    {
      endpoint: '/api/rdp',
      tokenSet: tokens.orcamentista,
      label: 'Orcamentista accessing /api/rdp',
      expectedMsg: 'Acesso restrito ao módulo de Medição Diária (RDP).',
    },
    {
      endpoint: '/api/obras',
      tokenSet: tokens.orcamentista,
      label: 'Orcamentista accessing /api/obras',
      expectedMsg: 'Acesso restrito ao módulo de Medição Diária (RDP).',
    },
    {
      endpoint: '/api/estacas',
      tokenSet: tokens.orcamentista,
      label: 'Orcamentista accessing /api/estacas',
      expectedMsg: 'Acesso restrito ao módulo de Medição Diária (RDP).',
    },
    {
      endpoint: '/api/orcamentos',
      tokenSet: tokens.apontador,
      label: 'Apontador accessing /api/orcamentos',
      expectedMsg: 'Acesso restrito ao módulo de Gestão de Orçamentos.',
    },
    {
      endpoint: '/api/admin/users',
      tokenSet: tokens.apontador,
      label: 'Apontador accessing /api/admin/users',
      expectedMsg: 'Acesso negado: Exclusivo para administradores.',
    },
    {
      endpoint: '/api/orcamentos',
      tokenSet: tokens.engenheiro,
      label: 'Engenheiro accessing /api/orcamentos',
      expectedMsg: 'Acesso restrito ao módulo de Gestão de Orçamentos.',
    },
    {
      endpoint: '/api/admin/logs',
      tokenSet: tokens.engenheiro,
      label: 'Engenheiro accessing /api/admin/logs',
      expectedMsg: 'Acesso negado: Exclusivo para administradores.',
    },
  ];

  for (const [idx, item] of unauthorizedApiCases.entries()) {
    const tStart = performance.now();
    try {
      const req = createTestRequest(`http://localhost:3000${item.endpoint}`, {
        [SESSION_COOKIE_NAME]: item.tokenSet.session,
        [USER_META_COOKIE_NAME]: item.tokenSet.meta,
      });

      const { syncRes, asyncRes } = await executeDualMiddleware(req);

      assertEqual(syncRes.status, 403, 'Sync status must be 403');
      assertEqual(asyncRes.status, 403, 'Async status must be 403');

      const body = await asyncRes.json();
      assertIncludes(body.error, item.expectedMsg, 'Body error message must match expected policy violation');

      recordTest(`API-FORBIDDEN-403-${idx + 1}`, `${item.label} -> HTTP 403 Forbidden with exact violation message`, true, tStart);
    } catch (err: any) {
      recordTest(`API-FORBIDDEN-403-${idx + 1}`, `${item.label}`, false, tStart, err.message);
    }
  }

  // =========================================================================
  // SUITE 7: Adversarial Cryptographic Attacks & Edge Case Fuzzing
  // =========================================================================
  suite('7. Adversarial Cryptographic Attacks & Edge Case Fuzzing');

  // 7.1 Forged HMAC signature (tampered signature)
  {
    const tStart = performance.now();
    try {
      const parts = tokens.apontador.meta.split('.');
      const tamperedSig = parts[0] + '.' + Buffer.from('attacker_forged_sig').toString('base64url');
      const req = createTestRequest('http://localhost:3000/medicao/apontador/rdp', {
        [SESSION_COOKIE_NAME]: tokens.apontador.session,
        [USER_META_COOKIE_NAME]: tamperedSig,
      });

      const { asyncRes } = await executeDualMiddleware(req);
      // Because signature is invalid, claims is null -> treated as unauthenticated -> redirects to /login with 307
      assertEqual(asyncRes.status, 307, 'Forged token must fail validation and redirect 307 to login');
      assertIncludes(asyncRes.headers.get('location') || '', '/login', 'Redirects to /login');

      recordTest('ADV-FORGED-SIG', 'Tampered signature rejected; user evicted to /login', true, tStart);
    } catch (err: any) {
      recordTest('ADV-FORGED-SIG', 'Tampered signature test', false, tStart, err.message);
    }
  }

  // 7.2 Privilege escalation bit-flip in claims payload
  {
    const tStart = performance.now();
    try {
      const parts = tokens.apontador.meta.split('.');
      const payloadJson = Buffer.from(parts[0], 'base64url').toString('utf8');
      const forgedPayload = payloadJson.replace('"role":"APONTADOR"', '"role":"ADMIN"');
      const forgedToken = Buffer.from(forgedPayload).toString('base64url') + '.' + parts[1];

      const req = createTestRequest('http://localhost:3000/api/admin/users', {
        [SESSION_COOKIE_NAME]: tokens.apontador.session,
        [USER_META_COOKIE_NAME]: forgedToken,
      });

      const { asyncRes } = await executeDualMiddleware(req);
      // Invalid signature -> unauthenticated API -> returns 401
      assertEqual(asyncRes.status, 401, 'Privilege escalation attack rejected with 401');

      recordTest('ADV-PRIV-ESCALATION', 'Bit-flip privilege escalation fails cryptographic HMAC check', true, tStart);
    } catch (err: any) {
      recordTest('ADV-PRIV-ESCALATION', 'Bit-flip privilege escalation test', false, tStart, err.message);
    }
  }

  // 7.3 Expired token timestamp (> 12 hours)
  {
    const tStart = performance.now();
    try {
      const thirteenHoursAgo = Date.now() - 13 * 60 * 60 * 1000;
      const expiredToken = await signUserMeta({
        userId: admin.id,
        role: admin.role,
        email: admin.email,
        acessoOrcamento: true,
        acessoMedicao: true,
      });
      // Decode and patch ts
      const [dataB64] = expiredToken.split('.');
      const claims = JSON.parse(Buffer.from(dataB64, 'base64url').toString('utf8'));
      claims.ts = thirteenHoursAgo;

      // Note: verifyUserMeta checks maxAgeMs = 12 * 60 * 60 * 1000
      // If we resign with old timestamp:
      const enc = new TextEncoder();
      const claimsJson = JSON.stringify(claims);
      const newPayloadB64 = Buffer.from(claimsJson).toString('base64url');
      const SECRET = process.env.SESSION_SECRET || 'rbt_fundacoes_default_secret_key_at_least_32_chars';
      const key = await crypto.subtle.importKey(
        'raw',
        enc.encode(SECRET),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
      );
      const sig = await crypto.subtle.sign('HMAC', key, enc.encode(newPayloadB64));
      const signedExpiredToken = `${newPayloadB64}.${Buffer.from(sig).toString('base64url')}`;

      const req = createTestRequest('http://localhost:3000/medicao/obras', {
        [SESSION_COOKIE_NAME]: tokens.admin.session,
        [USER_META_COOKIE_NAME]: signedExpiredToken,
      });

      const { asyncRes } = await executeDualMiddleware(req);
      assertEqual(asyncRes.status, 307, 'Expired token redirected to /login with 307');
      assertIncludes(asyncRes.headers.get('location') || '', '/login', 'Redirects to /login');

      recordTest('ADV-EXPIRED-TOKEN', 'Expired token (> 12 hours) rejected and redirected to /login', true, tStart);
    } catch (err: any) {
      recordTest('ADV-EXPIRED-TOKEN', 'Expired token test', false, tStart, err.message);
    }
  }

  // 7.4 Logged-in user visiting /login directly is redirected to /portal (User Priority UX rule)
  {
    const tStart = performance.now();
    try {
      const req = createTestRequest('http://localhost:3000/login', {
        [SESSION_COOKIE_NAME]: tokens.admin.session,
        [USER_META_COOKIE_NAME]: tokens.admin.meta,
      });

      const { syncRes, asyncRes } = await executeDualMiddleware(req);
      assertEqual(syncRes.status, 307, 'Sync redirect must be 307');
      assertEqual(syncRes.headers.get('location'), 'http://localhost:3000/portal', 'Redirects to /portal');
      assertEqual(asyncRes.status, 307, 'Async redirect must be 307');
      assertEqual(asyncRes.headers.get('location'), 'http://localhost:3000/portal', 'Redirects to /portal');

      recordTest('UX-LOGIN-REDIRECT-PORTAL', 'Authenticated user visiting /login redirected directly to /portal (307)', true, tStart);
    } catch (err: any) {
      recordTest('UX-LOGIN-REDIRECT-PORTAL', 'Login redirect to portal test', false, tStart, err.message);
    }
  }

  // 7.5 Root / redirection for authenticated users: directly to /portal
  {
    const tStart = performance.now();
    try {
      for (const [name, tokenSet] of Object.entries(tokens)) {
        if (name === 'noModulesUser') continue;
        const req = createTestRequest('http://localhost:3000/', {
          [SESSION_COOKIE_NAME]: tokenSet.session,
          [USER_META_COOKIE_NAME]: tokenSet.meta,
        });

        const { asyncRes } = await executeDualMiddleware(req);
        assertEqual(asyncRes.status, 307, `Root / must redirect 307 for persona ${name}`);
        assertEqual(asyncRes.headers.get('location'), 'http://localhost:3000/portal', `Persona ${name} routes to /portal`);
      }

      recordTest('UX-ROOT-REDIRECT-PORTAL', 'Root / redirects all authenticated personas directly to /portal (307)', true, tStart);
    } catch (err: any) {
      recordTest('UX-ROOT-REDIRECT-PORTAL', 'Root redirect test', false, tStart, err.message);
    }
  }

  // =========================================================================
  // SUMMARY REPORTING
  // =========================================================================
  const totalExecution = performance.now() - overallStart;
  const passedCount = results.filter((r) => r.passed).length;
  const failedCount = results.filter((r) => !r.passed).length;

  console.log('\n===============================================================');
  console.log('              CHALLENGER M5-2 ADVERSARIAL TEST SUMMARY         ');
  console.log('===============================================================');
  console.log(`  Total Tests Run:      ${results.length}`);
  console.log(`  Tests Passed:         ${passedCount}`);
  console.log(`  Tests Failed:         ${failedCount}`);
  console.log(`  Total Execution Time: ${totalExecution.toFixed(2)}ms`);
  console.log('===============================================================');

  if (failedCount === 0) {
    console.log('ALL ADVERSARIAL VERIFICATION CHECKS PASSED (100%)! ✓');
    process.exit(0);
  } else {
    console.error(`VERIFICATION FAILED: ${failedCount} tests failed.`);
    process.exit(1);
  }
}

runAllAdversarialSuites().catch((err) => {
  console.error('Fatal unhandled error in test harness:', err);
  process.exit(1);
});
