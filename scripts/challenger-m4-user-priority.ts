/**
 * Empirical Challenger M4: User Priority UX Behaviors & Adversarial Stress Suite
 * RBT Fundações — Portal Unificado (Gestão de Orçamentos + Medição Diária RDP)
 *
 * Adversarial Verifications:
 * 1. Root / Redirection Matrix:
 *    - Unauthenticated visitors (no cookie, empty cookie, invalid token, expired token, inactive user) -> 307 /login
 *    - Dual-module users -> 307 /portal
 *    - Single-module users (Orçamentos-only) -> 307 /portal
 *    - Single-module users (Medição-only) -> 307 /portal
 *    - Boundary / Zero-module users -> 307 /portal
 *
 * 2. Login API Redirection Contract (/api/auth/login):
 *    - Dual-module user -> HTTP 200, redirectUrl === '/portal'
 *    - Orçamentos-only user -> HTTP 200, redirectUrl === '/portal'
 *    - Medição-only user -> HTTP 200, redirectUrl === '/portal'
 *    - Alternate domain normalization (@rbt.com.br <-> @rbtfundacoes.com.br) -> redirectUrl === '/portal'
 *    - Rate limiter enforcement (5 calls allowed, 6th returns HTTP 429)
 *    - Negative auth cases (bad password -> 401, inactive user -> 401, missing fields -> 400)
 *
 * 3. /portal Page SSR & Strict DOM Omission:
 *    - Unauthenticated visitor -> redirects to /login
 *    - Dual-module user -> exactly 2 module cards rendered in DOM, zero disabled placeholders
 *    - Single-module Orçamentos -> exactly 1 card rendered, Medição card is 100% absent (0 DOM nodes, zero placeholders)
 *    - Single-module Medição -> exactly 1 card rendered, Orçamentos card is 100% absent (0 DOM nodes, zero placeholders)
 *    - Zero-module user -> exactly 0 cards rendered, informative banner displayed
 *    - Adversarial parameter fuzzing on /portal?unauthorized=... (XSS, SQLi, homoglyphs, buffer stress)
 *
 * Usage:
 *   npx tsx scripts/challenger-m4-user-priority.ts
 */

// =========================================================================
// 1. NEXT.JS SERVER RUNTIME INTERCEPTION (MUST RUN FIRST)
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
import { NextRequest } from 'next/server';

const { prisma } = require('../src/lib/db');
const { createSession, hashToken, SESSION_DURATION_SECONDS } = require('../src/lib/session');
const { resetRateLimit } = require('../src/lib/rate-limit');

// Next.js App Router context provider mock for client component SSR
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

// Lazy require page and route handlers
const HomePage = require('../src/app/page').default;
const PortalPage = require('../src/app/portal/page').default;
const { POST: loginHandler } = require('../src/app/api/auth/login/route');

// =========================================================================
// 2. TEST ENGINE & RESULT COLLECTION
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
  console.log(`  [${mark}] [${res.suite}] ${res.testId}: ${res.name} (${res.durationMs.toFixed(2)}ms)`);
  if (!res.passed && res.details) {
    console.error(`         Failure Detail: ${res.details}`);
  }
}

/**
 * Extracts redirection destination and HTTP status code from NEXT_REDIRECT digest
 * Format: NEXT_REDIRECT;replace;/target;307; or NEXT_REDIRECT;push;/target;307;
 */
function extractRedirectInfo(error: any): { url: string | null; status: number | null } {
  if (!error) return { url: null, status: null };
  const digest = error.digest || error.message || '';
  if (typeof digest === 'string' && digest.startsWith('NEXT_REDIRECT;')) {
    const parts = digest.split(';');
    const url = parts[2] || null;
    const status = parts[3] ? parseInt(parts[3], 10) : 307;
    return { url, status };
  }
  return { url: null, status: null };
}

// =========================================================================
// SUITE 1: ROOT GATEWAY REDIRECTION MATRIX ('/' -> src/app/page.tsx)
// =========================================================================

async function runRootRedirectionSuite() {
  console.log('\n===============================================================');
  console.log('  SUITE 1: ROOT GATEWAY REDIRECTION MATRIX (src/app/page.tsx)  ');
  console.log('===============================================================');

  // 1.1 Unauthenticated: Missing Cookie
  {
    const start = performance.now();
    activeCookieToken = null;
    let redirectInfo = { url: null as string | null, status: null as number | null };
    try {
      await HomePage();
    } catch (e: any) {
      redirectInfo = extractRedirectInfo(e);
    }
    const passed = redirectInfo.url === '/login' && redirectInfo.status === 307;
    recordTest({
      suite: 'Root Gateway',
      testId: 'ROOT-UNAUTH-01',
      name: 'Unauthenticated visitor (no cookie) redirects to /login with status 307',
      passed,
      durationMs: performance.now() - start,
      details: passed ? undefined : `Expected { url: '/login', status: 307 }, got ${JSON.stringify(redirectInfo)}`,
    });
  }

  // 1.2 Unauthenticated: Invalid / Forged Token
  {
    const start = performance.now();
    activeCookieToken = 'adversarial_forged_token_000000000000000000000000';
    let redirectInfo = { url: null as string | null, status: null as number | null };
    try {
      await HomePage();
    } catch (e: any) {
      redirectInfo = extractRedirectInfo(e);
    }
    const passed = redirectInfo.url === '/login' && redirectInfo.status === 307;
    recordTest({
      suite: 'Root Gateway',
      testId: 'ROOT-UNAUTH-02',
      name: 'Forged token not in database redirects to /login with status 307',
      passed,
      durationMs: performance.now() - start,
      details: passed ? undefined : `Expected { url: '/login', status: 307 }, got ${JSON.stringify(redirectInfo)}`,
    });
  }

  // 1.3 Unauthenticated: Expired Session Token
  {
    const start = performance.now();
    const adminUser = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
    if (!adminUser) throw new Error('Admin user required for test');

    const expiredToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = hashToken(expiredToken);
    await prisma.session.create({
      data: {
        userId: adminUser.id,
        tokenHash,
        expiresAt: new Date(Date.now() - 3600 * 1000), // expired 1 hour ago
      },
    });

    activeCookieToken = expiredToken;
    let redirectInfo = { url: null as string | null, status: null as number | null };
    try {
      await HomePage();
    } catch (e: any) {
      redirectInfo = extractRedirectInfo(e);
    }
    const passed = redirectInfo.url === '/login' && redirectInfo.status === 307;
    recordTest({
      suite: 'Root Gateway',
      testId: 'ROOT-UNAUTH-03',
      name: 'Expired session token redirects to /login with status 307',
      passed,
      durationMs: performance.now() - start,
      details: passed ? undefined : `Expected { url: '/login', status: 307 }, got ${JSON.stringify(redirectInfo)}`,
    });
  }

  // 1.4 Unauthenticated: Inactive User (ativo: false)
  {
    const start = performance.now();
    const inactiveUser = await prisma.user.create({
      data: {
        email: `inactive-chal-${Date.now()}@rbt.com.br`,
        name: 'Inactive User',
        passwordHash: 'dummy_hash',
        role: 'ORCAMENTISTA',
        ativo: false,
        acessoOrcamento: true,
        acessoMedicao: true,
      },
    });

    const token = await createSession(inactiveUser.id);
    activeCookieToken = token;
    let redirectInfo = { url: null as string | null, status: null as number | null };
    try {
      await HomePage();
    } catch (e: any) {
      redirectInfo = extractRedirectInfo(e);
    }

    await prisma.session.deleteMany({ where: { userId: inactiveUser.id } });
    await prisma.user.delete({ where: { id: inactiveUser.id } });

    const passed = redirectInfo.url === '/login' && redirectInfo.status === 307;
    recordTest({
      suite: 'Root Gateway',
      testId: 'ROOT-UNAUTH-04',
      name: 'Inactive user (ativo: false) blocked and redirected to /login with status 307',
      passed,
      durationMs: performance.now() - start,
      details: passed ? undefined : `Expected { url: '/login', status: 307 }, got ${JSON.stringify(redirectInfo)}`,
    });
  }

  // 1.5 Authenticated Dual-Module User -> /portal
  {
    const start = performance.now();
    const dualUser = await prisma.user.create({
      data: {
        email: `dual-chal-${Date.now()}@rbt.com.br`,
        name: 'Dual Module User',
        passwordHash: 'dummy_hash',
        role: 'ADMIN',
        ativo: true,
        acessoOrcamento: true,
        acessoMedicao: true,
      },
    });

    const token = await createSession(dualUser.id);
    activeCookieToken = token;
    let redirectInfo = { url: null as string | null, status: null as number | null };
    try {
      await HomePage();
    } catch (e: any) {
      redirectInfo = extractRedirectInfo(e);
    }

    await prisma.session.deleteMany({ where: { userId: dualUser.id } });
    await prisma.user.delete({ where: { id: dualUser.id } });

    const passed = redirectInfo.url === '/portal' && redirectInfo.status === 307;
    recordTest({
      suite: 'Root Gateway',
      testId: 'ROOT-DUAL-01',
      name: 'Dual-module user redirects to /portal with status 307',
      passed,
      durationMs: performance.now() - start,
      details: passed ? undefined : `Expected { url: '/portal', status: 307 }, got ${JSON.stringify(redirectInfo)}`,
    });
  }

  // 1.6 Authenticated Single-Module User: Orçamentos-only -> /portal (User Priority UX)
  {
    const start = performance.now();
    const orcUser = await prisma.user.create({
      data: {
        email: `orc-chal-${Date.now()}@rbt.com.br`,
        name: 'Orcamento Exclusive',
        passwordHash: 'dummy_hash',
        role: 'ORCAMENTISTA',
        ativo: true,
        acessoOrcamento: true,
        acessoMedicao: false,
      },
    });

    const token = await createSession(orcUser.id);
    activeCookieToken = token;
    let redirectInfo = { url: null as string | null, status: null as number | null };
    try {
      await HomePage();
    } catch (e: any) {
      redirectInfo = extractRedirectInfo(e);
    }

    await prisma.session.deleteMany({ where: { userId: orcUser.id } });
    await prisma.user.delete({ where: { id: orcUser.id } });

    const passed = redirectInfo.url === '/portal' && redirectInfo.status === 307;
    recordTest({
      suite: 'Root Gateway',
      testId: 'ROOT-SINGLE-ORC-01',
      name: 'Orçamentos-only user redirects to /portal with status 307 (User Priority UX)',
      passed,
      durationMs: performance.now() - start,
      details: passed ? undefined : `Expected { url: '/portal', status: 307 }, got ${JSON.stringify(redirectInfo)}`,
    });
  }

  // 1.7 Authenticated Single-Module User: Medição-only -> /portal (User Priority UX)
  {
    const start = performance.now();
    const medUser = await prisma.user.create({
      data: {
        email: `med-chal-${Date.now()}@rbt.com.br`,
        name: 'Medicao Exclusive',
        passwordHash: 'dummy_hash',
        role: 'ENGENHEIRO',
        ativo: true,
        acessoOrcamento: false,
        acessoMedicao: true,
      },
    });

    const token = await createSession(medUser.id);
    activeCookieToken = token;
    let redirectInfo = { url: null as string | null, status: null as number | null };
    try {
      await HomePage();
    } catch (e: any) {
      redirectInfo = extractRedirectInfo(e);
    }

    await prisma.session.deleteMany({ where: { userId: medUser.id } });
    await prisma.user.delete({ where: { id: medUser.id } });

    const passed = redirectInfo.url === '/portal' && redirectInfo.status === 307;
    recordTest({
      suite: 'Root Gateway',
      testId: 'ROOT-SINGLE-MED-01',
      name: 'Medição-only user redirects to /portal with status 307 (User Priority UX)',
      passed,
      durationMs: performance.now() - start,
      details: passed ? undefined : `Expected { url: '/portal', status: 307 }, got ${JSON.stringify(redirectInfo)}`,
    });
  }

  // 1.8 Authenticated Zero-Module User -> /portal
  {
    const start = performance.now();
    const zeroUser = await prisma.user.create({
      data: {
        email: `zero-chal-${Date.now()}@rbt.com.br`,
        name: 'Zero Modules User',
        passwordHash: 'dummy_hash',
        role: 'USUARIO',
        ativo: true,
        acessoOrcamento: false,
        acessoMedicao: false,
      },
    });

    const token = await createSession(zeroUser.id);
    activeCookieToken = token;
    let redirectInfo = { url: null as string | null, status: null as number | null };
    try {
      await HomePage();
    } catch (e: any) {
      redirectInfo = extractRedirectInfo(e);
    }

    await prisma.session.deleteMany({ where: { userId: zeroUser.id } });
    await prisma.user.delete({ where: { id: zeroUser.id } });

    const passed = redirectInfo.url === '/portal' && redirectInfo.status === 307;
    recordTest({
      suite: 'Root Gateway',
      testId: 'ROOT-ZERO-01',
      name: 'Zero-module user redirects to /portal with status 307',
      passed,
      durationMs: performance.now() - start,
      details: passed ? undefined : `Expected { url: '/portal', status: 307 }, got ${JSON.stringify(redirectInfo)}`,
    });
  }

  // 1.9 Seed Personas Matrix: Verify all seeded accounts redirect to /portal from root /
  const seedPersonas = [
    { email: 'admin@rbt.com.br', label: 'Admin Geral (Dual)' },
    { email: 'admin@rbtfundacoes.com.br', label: 'Dra. Mariana Costa (Dual)' },
    { email: 'orcamentista@rbt.com.br', label: 'Engenheiro Orçamentista (Orc-only)' },
    { email: 'apontador@rbtfundacoes.com.br', label: 'Apontador de Campo (Med-only)' },
    { email: 'engenheiro@rbtfundacoes.com.br', label: 'Engenheiro Fiscal (Med-only)' },
  ];

  for (const sp of seedPersonas) {
    const start = performance.now();
    const user = await prisma.user.findUnique({ where: { email: sp.email } });
    if (!user) {
      recordTest({
        suite: 'Root Gateway',
        testId: `ROOT-SEED-${sp.email.split('@')[0]}`,
        name: `Seed Persona: ${sp.label}`,
        passed: false,
        durationMs: performance.now() - start,
        details: `Seed user ${sp.email} not found in database`,
      });
      continue;
    }

    const token = await createSession(user.id);
    activeCookieToken = token;
    let redirectInfo = { url: null as string | null, status: null as number | null };
    try {
      await HomePage();
    } catch (e: any) {
      redirectInfo = extractRedirectInfo(e);
    }
    await prisma.session.deleteMany({ where: { userId: user.id } });

    const passed = redirectInfo.url === '/portal' && redirectInfo.status === 307;
    recordTest({
      suite: 'Root Gateway',
      testId: `ROOT-SEED-${sp.email.split('@')[0]}`,
      name: `Seed Persona: ${sp.label} -> /portal (status 307)`,
      passed,
      durationMs: performance.now() - start,
      details: passed ? undefined : `Expected { url: '/portal', status: 307 }, got ${JSON.stringify(redirectInfo)}`,
    });
  }
}

// =========================================================================
// SUITE 2: LOGIN API REDIRECTION CONTRACT (/api/auth/login)
// =========================================================================

async function runLoginApiSuite() {
  console.log('\n===============================================================');
  console.log('  SUITE 2: LOGIN API REDIRECTION CONTRACT (/api/auth/login)   ');
  console.log('===============================================================');

  // Helper to create NextRequest for login POST
  function createLoginRequest(body: any, clientIp: string = '127.0.0.1'): NextRequest {
    return new NextRequest('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-forwarded-for': clientIp,
      },
      body: JSON.stringify(body),
    });
  }

  // 2.1 Dual-Module User Login -> redirectUrl: '/portal'
  {
    const start = performance.now();
    resetRateLimit('login:10.0.0.1');
    const req = createLoginRequest({ email: 'admin@rbt.com.br', password: 'Rbt@2026' }, '10.0.0.1');
    const res = await loginHandler(req);
    const data = await res.json();

    const passed =
      res.status === 200 &&
      data.success === true &&
      data.redirectUrl === '/portal' &&
      data.user.acessoOrcamento === true &&
      data.user.acessoMedicao === true;

    recordTest({
      suite: 'Login API',
      testId: 'LOGIN-DUAL-01',
      name: 'Dual-module login returns HTTP 200 and redirectUrl: /portal',
      passed,
      durationMs: performance.now() - start,
      details: passed
        ? undefined
        : `Status: ${res.status}, success: ${data.success}, redirectUrl: ${data.redirectUrl}`,
    });
  }

  // 2.2 Orçamentos-only User Login -> redirectUrl: '/portal'
  {
    const start = performance.now();
    resetRateLimit('login:10.0.0.2');
    const req = createLoginRequest({ email: 'orcamentista@rbt.com.br', password: 'Rbt@2026' }, '10.0.0.2');
    const res = await loginHandler(req);
    const data = await res.json();

    const passed =
      res.status === 200 &&
      data.success === true &&
      data.redirectUrl === '/portal' &&
      data.user.acessoOrcamento === true &&
      data.user.acessoMedicao === false;

    recordTest({
      suite: 'Login API',
      testId: 'LOGIN-SINGLE-ORC-01',
      name: 'Orçamentos-only login returns HTTP 200 and redirectUrl: /portal',
      passed,
      durationMs: performance.now() - start,
      details: passed
        ? undefined
        : `Status: ${res.status}, success: ${data.success}, redirectUrl: ${data.redirectUrl}`,
    });
  }

  // 2.3 Medição-only User Login -> redirectUrl: '/portal'
  {
    const start = performance.now();
    resetRateLimit('login:10.0.0.3');
    const req = createLoginRequest({ email: 'apontador@rbtfundacoes.com.br', password: 'Rbt@2026' }, '10.0.0.3');
    const res = await loginHandler(req);
    const data = await res.json();

    const passed =
      res.status === 200 &&
      data.success === true &&
      data.redirectUrl === '/portal' &&
      data.user.acessoOrcamento === false &&
      data.user.acessoMedicao === true;

    recordTest({
      suite: 'Login API',
      testId: 'LOGIN-SINGLE-MED-01',
      name: 'Medição-only login returns HTTP 200 and redirectUrl: /portal',
      passed,
      durationMs: performance.now() - start,
      details: passed
        ? undefined
        : `Status: ${res.status}, success: ${data.success}, redirectUrl: ${data.redirectUrl}`,
    });
  }

  // 2.4 Alternate Domain Cross-Resolution: admin@rbtfundacoes.com.br -> redirectUrl: '/portal'
  {
    const start = performance.now();
    resetRateLimit('login:10.0.0.4');
    const req = createLoginRequest({ email: 'admin@rbtfundacoes.com.br', password: 'Rbt@2026' }, '10.0.0.4');
    const res = await loginHandler(req);
    const data = await res.json();

    const passed =
      res.status === 200 &&
      data.success === true &&
      data.redirectUrl === '/portal';

    recordTest({
      suite: 'Login API',
      testId: 'LOGIN-DOMAIN-ALT',
      name: 'Cross-domain email resolution returns redirectUrl: /portal',
      passed,
      durationMs: performance.now() - start,
      details: passed ? undefined : `Status: ${res.status}, redirectUrl: ${data.redirectUrl}`,
    });
  }

  // 2.5 Dynamic Single-Module Users Created On-The-Fly
  {
    const start = performance.now();
    const bcrypt = require('bcryptjs');
    const salt = await bcrypt.genSalt(10);
    const testHash = await bcrypt.hash('Secret123!', salt);

    // Create dynamic user with single medicao permission
    const dynMed = await prisma.user.create({
      data: {
        email: `dyn-med-${Date.now()}@rbt.com.br`,
        name: 'Dynamic Med User',
        passwordHash: testHash,
        role: 'APONTADOR',
        ativo: true,
        acessoOrcamento: false,
        acessoMedicao: true,
      },
    });

    resetRateLimit('login:10.0.0.5');
    const req = createLoginRequest({ email: dynMed.email, password: 'Secret123!' }, '10.0.0.5');
    const res = await loginHandler(req);
    const data = await res.json();

    await prisma.session.deleteMany({ where: { userId: dynMed.id } });
    await prisma.user.delete({ where: { id: dynMed.id } });

    const passed =
      res.status === 200 &&
      data.success === true &&
      data.redirectUrl === '/portal';

    recordTest({
      suite: 'Login API',
      testId: 'LOGIN-DYN-MED',
      name: 'Dynamic Medição-only user login returns redirectUrl: /portal',
      passed,
      durationMs: performance.now() - start,
      details: passed ? undefined : `redirectUrl: ${data.redirectUrl}`,
    });
  }

  // 2.6 Adversarial Rate Limiting on Login (5 attempts allowed, 6th returns HTTP 429)
  {
    const start = performance.now();
    const testIp = '192.168.100.99';
    resetRateLimit(`login:${testIp}`);

    let sixthStatus = 0;
    let retryAfterHeader: string | null = null;

    for (let i = 1; i <= 6; i++) {
      const req = createLoginRequest({ email: 'attacker@rbt.com.br', password: 'wrong' }, testIp);
      const res = await loginHandler(req);
      if (i === 6) {
        sixthStatus = res.status;
        retryAfterHeader = res.headers.get('Retry-After');
      }
    }

    const passed = sixthStatus === 429 && retryAfterHeader !== null;
    recordTest({
      suite: 'Login API',
      testId: 'LOGIN-RATELIMIT-01',
      name: 'Brute-force protection: 6th rapid login attempt blocked with HTTP 429 and Retry-After',
      passed,
      durationMs: performance.now() - start,
      details: passed ? undefined : `6th status: ${sixthStatus}, Retry-After: ${retryAfterHeader}`,
    });
  }

  // 2.7 Negative Auth Cases: Invalid Password -> 401
  {
    const start = performance.now();
    resetRateLimit('login:10.0.0.6');
    const req = createLoginRequest({ email: 'admin@rbt.com.br', password: 'WrongPassword!' }, '10.0.0.6');
    const res = await loginHandler(req);
    const passed = res.status === 401;
    recordTest({
      suite: 'Login API',
      testId: 'LOGIN-BAD-PASS',
      name: 'Invalid password returns HTTP 401 Unauthorized',
      passed,
      durationMs: performance.now() - start,
      details: passed ? undefined : `Expected 401, got ${res.status}`,
    });
  }

  // 2.8 Negative Auth Cases: Inactive User -> 401
  {
    const start = performance.now();
    const bcrypt = require('bcryptjs');
    const salt = await bcrypt.genSalt(10);
    const testHash = await bcrypt.hash('Secret123!', salt);

    const inactive = await prisma.user.create({
      data: {
        email: `inactive-login-${Date.now()}@rbt.com.br`,
        name: 'Inactive Login',
        passwordHash: testHash,
        role: 'ORCAMENTISTA',
        ativo: false,
        acessoOrcamento: true,
        acessoMedicao: false,
      },
    });

    resetRateLimit('login:10.0.0.7');
    const req = createLoginRequest({ email: inactive.email, password: 'Secret123!' }, '10.0.0.7');
    const res = await loginHandler(req);

    await prisma.user.delete({ where: { id: inactive.id } });

    const passed = res.status === 401;
    recordTest({
      suite: 'Login API',
      testId: 'LOGIN-INACTIVE-01',
      name: 'Inactive user login blocked with HTTP 401',
      passed,
      durationMs: performance.now() - start,
      details: passed ? undefined : `Expected 401, got ${res.status}`,
    });
  }
}

// =========================================================================
// SUITE 3: /portal PAGE SSR & STRICT DOM OMISSION
// =========================================================================

async function runPortalDomSuite() {
  console.log('\n===============================================================');
  console.log('  SUITE 3: /portal SSR & STRICT DOM OMISSION                   ');
  console.log('===============================================================');

  // 3.1 Unauthenticated Visitor to /portal redirects to /login
  {
    const start = performance.now();
    activeCookieToken = null;
    let redirectInfo = { url: null as string | null, status: null as number | null };
    try {
      await PortalPage({});
    } catch (e: any) {
      redirectInfo = extractRedirectInfo(e);
    }
    const passed = redirectInfo.url === '/login';
    recordTest({
      suite: 'Portal DOM',
      testId: 'PORTAL-UNAUTH-01',
      name: 'Unauthenticated visitor to /portal redirects to /login',
      passed,
      durationMs: performance.now() - start,
      details: passed ? undefined : `Expected /login, got ${redirectInfo.url}`,
    });
  }

  // 3.2 Dual-Module User: EXACTLY 2 cards rendered in DOM
  {
    const start = performance.now();
    const dualUser = await prisma.user.create({
      data: {
        email: `portal-dual-${Date.now()}@rbt.com.br`,
        name: 'Roberto Dual',
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

    await prisma.session.deleteMany({ where: { userId: dualUser.id } });
    await prisma.user.delete({ where: { id: dualUser.id } });

    // Card 1 Checks: Gestão de Orçamentos
    const hasOrcamentoLink = html.includes('href="/dashboard"');
    const hasOrcamentoTitle = html.includes('Gestão de Orçamentos');
    const hasOrcamentoColor = html.includes('bg-[#BA1A1A]');

    // Card 2 Checks: Medição Diária (RDP)
    const hasMedicaoLink = html.includes('href="/medicao"');
    const hasMedicaoTitle = html.includes('Medição Diária (RDP)');
    const hasMedicaoColor = html.includes('bg-[#111827]');

    // Total Card Count Check: Check count of "Clique para acessar" buttons
    const ctaMatches = html.match(/Clique para acessar/g) || [];
    const exactTwoCards = ctaMatches.length === 2;

    // Strict DOM Omission Check: Zero disabled placeholders
    const hasDisabledPlaceholder = html.includes('Acesso não habilitado');
    const hasDimmedCard = html.includes('opacity-60') || html.includes('cursor-not-allowed');

    // Layout check: dual-module uses 2-column grid
    const hasTwoColGrid = html.includes('grid-cols-1 md:grid-cols-2');

    const passed =
      hasOrcamentoLink &&
      hasOrcamentoTitle &&
      hasMedicaoLink &&
      hasMedicaoTitle &&
      exactTwoCards &&
      !hasDisabledPlaceholder &&
      !hasDimmedCard &&
      hasTwoColGrid;

    recordTest({
      suite: 'Portal DOM',
      testId: 'PORTAL-DUAL-01',
      name: 'Dual-module user renders EXACTLY 2 active cards and 2-column grid',
      passed,
      durationMs: performance.now() - start,
      details: passed
        ? undefined
        : `orcLink=${hasOrcamentoLink}, medLink=${hasMedicaoLink}, ctaCount=${ctaMatches.length}, disabledPlaceholder=${hasDisabledPlaceholder}, twoCol=${hasTwoColGrid}`,
    });
  }

  // 3.3 Single-Module Orçamentos-Only: EXACTLY 1 card rendered, Medição 100% ABSENT from DOM
  {
    const start = performance.now();
    const orcUser = await prisma.user.create({
      data: {
        email: `portal-orc-${Date.now()}@rbt.com.br`,
        name: 'Lucas Orcamentista',
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

    await prisma.session.deleteMany({ where: { userId: orcUser.id } });
    await prisma.user.delete({ where: { id: orcUser.id } });

    // Card 1 Must Be Present
    const hasOrcamentoLink = html.includes('href="/dashboard"');
    const hasOrcamentoTitle = html.includes('Gestão de Orçamentos');

    // Card 2 (Medição) Must Be 100% ABSENT from DOM:
    const hasMedicaoLink = html.includes('href="/medicao"');
    const hasMedicaoTitle = html.includes('Medição Diária (RDP)');
    const hasMedicaoCopy = html.includes('Apontamento de Campo, Obras &amp; Boletins Técnicos') || html.includes('Apontamento de Campo, Obras & Boletins Técnicos');
    const hasMedicaoBullet = html.includes('Apontamento de RDP em tempo real no canteiro');

    // Strict DOM Absence: Zero disabled/dimmed placeholders
    const hasDisabledPlaceholder = html.includes('Acesso não habilitado');
    const hasDimmedCard = html.includes('opacity-60') || html.includes('cursor-not-allowed');

    // Total Card Count: Exactly 1
    const ctaMatches = html.match(/Clique para acessar/g) || [];
    const exactOneCard = ctaMatches.length === 1;

    // Layout: Single-module centered grid
    const hasSingleColGrid = html.includes('grid-cols-1 max-w-md');

    const passed =
      hasOrcamentoLink &&
      hasOrcamentoTitle &&
      !hasMedicaoLink &&
      !hasMedicaoTitle &&
      !hasMedicaoCopy &&
      !hasMedicaoBullet &&
      !hasDisabledPlaceholder &&
      !hasDimmedCard &&
      exactOneCard &&
      hasSingleColGrid;

    recordTest({
      suite: 'Portal DOM',
      testId: 'PORTAL-ORC-ONLY-01',
      name: 'Orçamentos-only user: EXACTLY 1 card rendered, Medição card is 100% ABSENT from DOM (0 nodes, 0 disabled placeholders)',
      passed,
      durationMs: performance.now() - start,
      details: passed
        ? undefined
        : `orcLink=${hasOrcamentoLink}, medLink=${hasMedicaoLink}, medTitle=${hasMedicaoTitle}, ctaCount=${ctaMatches.length}, disabledPlaceholder=${hasDisabledPlaceholder}, singleCol=${hasSingleColGrid}`,
    });
  }

  // 3.4 Single-Module Medição-Only: EXACTLY 1 card rendered, Orçamentos 100% ABSENT from DOM
  {
    const start = performance.now();
    const medUser = await prisma.user.create({
      data: {
        email: `portal-med-${Date.now()}@rbt.com.br`,
        name: 'Carlos Engenheiro',
        passwordHash: 'dummy',
        role: 'ENGENHEIRO',
        ativo: true,
        acessoOrcamento: false,
        acessoMedicao: true,
      },
    });

    activeCookieToken = await createSession(medUser.id);
    const jsx = await PortalPage({});
    const html = renderPageToHtml(jsx);

    await prisma.session.deleteMany({ where: { userId: medUser.id } });
    await prisma.user.delete({ where: { id: medUser.id } });

    // Card 2 Must Be Present
    const hasMedicaoLink = html.includes('href="/medicao"');
    const hasMedicaoTitle = html.includes('Medição Diária (RDP)');

    // Card 1 (Orçamentos) Must Be 100% ABSENT from DOM:
    const hasOrcamentoLink = html.includes('href="/dashboard"');
    const hasOrcamentoTitle = html.includes('Gestão de Orçamentos');
    const hasOrcamentoCopy = html.includes('Propostas Comerciais, Funil Kanban');
    const hasOrcamentoBullet = html.includes('Quadro Kanban com 4 etapas comerciais');

    // Strict DOM Absence: Zero disabled/dimmed placeholders
    const hasDisabledPlaceholder = html.includes('Acesso não habilitado');
    const hasDimmedCard = html.includes('opacity-60') || html.includes('cursor-not-allowed');

    // Total Card Count: Exactly 1
    const ctaMatches = html.match(/Clique para acessar/g) || [];
    const exactOneCard = ctaMatches.length === 1;

    // Layout: Single-module centered grid
    const hasSingleColGrid = html.includes('grid-cols-1 max-w-md');

    const passed =
      hasMedicaoLink &&
      hasMedicaoTitle &&
      !hasOrcamentoLink &&
      !hasOrcamentoTitle &&
      !hasOrcamentoCopy &&
      !hasOrcamentoBullet &&
      !hasDisabledPlaceholder &&
      !hasDimmedCard &&
      exactOneCard &&
      hasSingleColGrid;

    recordTest({
      suite: 'Portal DOM',
      testId: 'PORTAL-MED-ONLY-01',
      name: 'Medição-only user: EXACTLY 1 card rendered, Orçamentos card is 100% ABSENT from DOM (0 nodes, 0 disabled placeholders)',
      passed,
      durationMs: performance.now() - start,
      details: passed
        ? undefined
        : `medLink=${hasMedicaoLink}, orcLink=${hasOrcamentoLink}, orcTitle=${hasOrcamentoTitle}, ctaCount=${ctaMatches.length}, disabledPlaceholder=${hasDisabledPlaceholder}, singleCol=${hasSingleColGrid}`,
    });
  }

  // 3.5 Zero-Module User: EXACTLY 0 cards rendered, informative banner displayed
  {
    const start = performance.now();
    const zeroUser = await prisma.user.create({
      data: {
        email: `portal-zero-${Date.now()}@rbt.com.br`,
        name: 'No Module User',
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

    await prisma.session.deleteMany({ where: { userId: zeroUser.id } });
    await prisma.user.delete({ where: { id: zeroUser.id } });

    const ctaMatches = html.match(/Clique para acessar/g) || [];
    const exactZeroCards = ctaMatches.length === 0;
    const hasNoModulesBanner = html.includes('Nenhum Módulo Corporativo Habilitado');
    const hasOrcLink = html.includes('href="/dashboard"');
    const hasMedLink = html.includes('href="/medicao"');

    const passed = exactZeroCards && hasNoModulesBanner && !hasOrcLink && !hasMedLink;
    recordTest({
      suite: 'Portal DOM',
      testId: 'PORTAL-ZERO-01',
      name: 'Zero-module user: EXACTLY 0 cards rendered and lock banner displayed',
      passed,
      durationMs: performance.now() - start,
      details: passed ? undefined : `ctaCount=${ctaMatches.length}, banner=${hasNoModulesBanner}, orcLink=${hasOrcLink}, medLink=${hasMedLink}`,
    });
  }

  // 3.6 Adversarial Parameter Stress on /portal?unauthorized=... (XSS, SQLi, Buffer)
  {
    const start = performance.now();
    const adminUser = await prisma.user.findFirst({ where: { email: 'admin@rbt.com.br' } });
    if (!adminUser) throw new Error('admin@rbt.com.br persona required');

    activeCookieToken = await createSession(adminUser.id);

    const adversarialVectors = [
      { id: 'ADV-01', name: 'XSS <script> vector', input: '<script>alert("PWNED")</script>' },
      { id: 'ADV-02', name: 'XSS img onerror vector', input: '"><img src=x onerror=alert(1)>' },
      { id: 'ADV-03', name: 'SQL injection payload', input: "'; DROP TABLE users; --" },
      { id: 'ADV-04', name: 'Homoglyph spoofing', input: '\u043Er\u0441\u0430m\u0435nt\u043Es' },
      { id: 'ADV-05', name: 'Buffer overflow 32KB string', input: 'B'.repeat(32768) },
      { id: 'ADV-06', name: 'Null byte injection', input: 'orcamentos\0evil' },
    ];

    let allVectorsSafe = true;
    for (const vec of adversarialVectors) {
      try {
        const jsx = await PortalPage({ searchParams: { unauthorized: vec.input } });
        const html = renderPageToHtml(jsx);
        const leaksRaw = html.includes(vec.input);
        const hasAlert = html.includes('Acesso Não Autorizado');
        if (leaksRaw || !hasAlert) {
          allVectorsSafe = false;
        }
      } catch {
        allVectorsSafe = false;
      }
    }

    await prisma.session.deleteMany({ where: { userId: adminUser.id } });

    recordTest({
      suite: 'Portal DOM',
      testId: 'PORTAL-ADVERSARIAL-01',
      name: 'Adversarial parameter stress (XSS, SQLi, homoglyph, 32KB buffer) safely handled with zero DOM leaks',
      passed: allVectorsSafe,
      durationMs: performance.now() - start,
      details: allVectorsSafe ? undefined : 'One or more adversarial vectors leaked raw content or crashed SSR',
    });
  }
}

// =========================================================================
// MAIN RUNNER
// =========================================================================

async function main() {
  const globalStart = performance.now();
  console.log('###############################################################');
  console.log('  EMPIRICAL CHALLENGER M4: USER PRIORITY UX ADVERSARIAL SUITE  ');
  console.log('  Date: ' + new Date().toISOString());
  console.log('###############################################################');

  try {
    await runRootRedirectionSuite();
    await runLoginApiSuite();
    await runPortalDomSuite();
  } catch (err: any) {
    console.error('CRITICAL UNHANDLED ERROR IN HARNESS:', err);
    process.exit(1);
  }

  const globalDuration = (performance.now() - globalStart).toFixed(2);
  const total = results.length;
  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;

  console.log('\n===============================================================');
  console.log('  EMPIRICAL CHALLENGER M4: FINAL RESULTS SUMMARY               ');
  console.log('===============================================================');
  console.log(`Total Empirical Checks Executed:  ${total}`);
  console.log(`Passed / Verified:               ${passed} (${((passed / total) * 100).toFixed(1)}%)`);
  console.log(`Failed / Regressions:            ${failed}`);
  console.log(`Harness Execution Time:          ${globalDuration}ms`);
  console.log('===============================================================');

  if (failed > 0) {
    console.error(`\n❌ VERDICT: REJECT (${failed} test(s) failed)`);
    process.exit(1);
  } else {
    console.log(`\n✅ VERDICT: APPROVE (100% of User Priority UX requirements verified empirically)`);
    process.exit(0);
  }
}

main().catch((e) => {
  console.error('Fatal execution error:', e);
  process.exit(1);
});
