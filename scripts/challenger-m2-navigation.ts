/**
 * Challenger M2-2: Empirical Adversarial Verification Suite
 * Portal Unificado RBT Fundações — Gestão de Orçamentos + Medição Diária (RDP)
 * Milestone M2: Navigation Flow, Module Switcher Visibility & Persona Access States
 *
 * RIGOROUS EMPIRICAL TEST SUITE:
 * - Suite 1: Persona Matrix Setup (Lucas, Carlos, Roberto, Zero-Modules, Anonymous, Inactive)
 * - Suite 2: Root Gateway Redirection Empirical Tests ('/')
 * - Suite 3: Module Switcher Visibility & Click Targets ('DashboardShell' - Desktop, Mobile Drawer, Header)
 * - Suite 4: Portal Selection Hub Card States & Badges ('/portal')
 * - Suite 5: Portal Unauthorized Redirect Alert Banners
 * - Suite 6: Institutional Branding & Design Conformance (#BA1A1A, #111827, Initials, Logout)
 * - Suite 7: Adversarial Stress, Inactive Users & Chaos Inputs
 *
 * Usage:
 *   npx tsx scripts/challenger-m2-navigation.ts
 */

export {};

// 1. MUST set globalThis.AsyncLocalStorage BEFORE requiring Next.js modules to avoid FakeAsyncLocalStorage
const { AsyncLocalStorage } = require('async_hooks');
(globalThis as any).AsyncLocalStorage = AsyncLocalStorage;

import React from 'react';
const { renderToStaticMarkup } = require('react-dom/server');
const { PathnameContext } = require('next/dist/shared/lib/hooks-client-context.shared-runtime');
const { AppRouterContext } = require('next/dist/shared/lib/app-router-context.shared-runtime');
const { requestAsyncStorage } = require('next/dist/client/components/request-async-storage-instance');

const { prisma } = require('../src/lib/db');
const { createSession } = require('../src/lib/session');
const { DashboardShell } = require('../src/components/layout/dashboard-shell');

const homePageMod = require('../src/app/page');
const HomePage = homePageMod.default?.default || homePageMod.default;

const portalPageMod = require('../src/app/portal/page');
const PortalPage = portalPageMod.default?.default || portalPageMod.default;

// =========================================================================
// TEST RUNNER ENGINE & HARNESS PRIMITIVES
// =========================================================================

interface TestResult {
  suite: string;
  id: string;
  name: string;
  passed: boolean;
  verdict: 'PASS' | 'FAIL';
  details?: string;
  error?: string;
  durationMs: number;
}

const testResults: TestResult[] = [];
let currentSuite = '';

function suite(name: string) {
  currentSuite = name;
  console.log(`\n===============================================================`);
  console.log(`  SUITE: ${name}`);
  console.log(`===============================================================`);
}

async function test(id: string, name: string, fn: () => void | Promise<void>) {
  const start = performance.now();
  try {
    await fn();
    const durationMs = Number((performance.now() - start).toFixed(2));
    testResults.push({
      suite: currentSuite,
      id,
      name,
      passed: true,
      verdict: 'PASS',
      durationMs,
    });
    console.log(`  ✓ [PASS] ${id}: ${name} (${durationMs}ms)`);
  } catch (err: any) {
    const durationMs = Number((performance.now() - start).toFixed(2));
    const errorMessage = err?.message || String(err);
    testResults.push({
      suite: currentSuite,
      id,
      name,
      passed: false,
      verdict: 'FAIL',
      error: errorMessage,
      durationMs,
    });
    console.error(`  ✗ [FAIL] ${id}: ${name} (${durationMs}ms)`);
    console.error(`         Error: ${errorMessage}`);
  }
}

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

function assertEqual<T>(actual: T, expected: T, message: string) {
  if (actual !== expected) {
    throw new Error(
      `${message} — Expected: ${JSON.stringify(expected)}, Got: ${JSON.stringify(actual)}`
    );
  }
}

function assertIncludes(haystack: string, needle: string, message: string) {
  if (!haystack.includes(needle)) {
    throw new Error(`${message} — String does not include expected needle: "${needle}"`);
  }
}

function assertNotIncludes(haystack: string, needle: string, message: string) {
  if (haystack.includes(needle)) {
    throw new Error(`${message} — String unexpectedly contains forbidden needle: "${needle}"`);
  }
}

// Router Mock for React rendering
const mockRouter = {
  push: () => {},
  replace: () => {},
  prefetch: () => {},
  back: () => {},
  forward: () => {},
  refresh: () => {},
};

function renderShell(user: any, pathname: string = '/dashboard', forceMobileOpen: boolean = false): string {
  const originalUseState = React.useState;
  if (forceMobileOpen) {
    // Intercept useState so mobileOpen returns true
    (React as any).useState = ((initial?: any) => {
      if (typeof initial === 'boolean' && initial === false) {
        return [true, () => {}];
      }
      return [initial, () => {}];
    }) as any;
  }

  try {
    const element = React.createElement(
      AppRouterContext.Provider,
      { value: mockRouter },
      React.createElement(
        PathnameContext.Provider,
        { value: pathname },
        React.createElement(DashboardShell, { user }, React.createElement('div', { id: 'test-content' }, 'Child Body'))
      )
    );
    return renderToStaticMarkup(element);
  } finally {
    if (forceMobileOpen) {
      React.useState = originalUseState;
    }
  }
}

async function renderPortal(token: string | null, searchParams: any = {}): Promise<string> {
  return new Promise(async (resolve, reject) => {
    try {
      const store = {
        cookies: {
          get: (name: string) => {
            if (token && (name === 'rbt_orcamentos_session' || name === 'rbt_session')) {
              return { name, value: token };
            }
            return undefined;
          },
        },
      };

      await requestAsyncStorage.run(store, async () => {
        try {
          const jsx = await PortalPage({ searchParams });
          const wrapped = React.createElement(
            AppRouterContext.Provider,
            { value: mockRouter },
            React.createElement(
              PathnameContext.Provider,
              { value: '/portal' },
              jsx
            )
          );
          const html = renderToStaticMarkup(wrapped);
          resolve(html);
        } catch (err) {
          reject(err);
        }
      });
    } catch (err) {
      reject(err);
    }
  });
}

async function runRootRedirect(token: string | null): Promise<string> {
  return new Promise(async (resolve, reject) => {
    try {
      const store = {
        cookies: {
          get: (name: string) => {
            if (token && (name === 'rbt_orcamentos_session' || name === 'rbt_session')) {
              return { name, value: token };
            }
            return undefined;
          },
        },
      };

      await requestAsyncStorage.run(store, async () => {
        try {
          await HomePage();
          reject(new Error('HomePage did not redirect; returned normally'));
        } catch (err: any) {
          if (err?.digest && typeof err.digest === 'string' && err.digest.startsWith('NEXT_REDIRECT')) {
            const parts = err.digest.split(';');
            const target = parts[2] || err.digest;
            resolve(target);
          } else {
            reject(err);
          }
        }
      });
    } catch (err) {
      reject(err);
    }
  });
}

// =========================================================================
// MAIN ADVERSARIAL EXECUTION HARNESS
// =========================================================================

async function main() {
  console.log(`\n===============================================================`);
  console.log(`  CHALLENGER M2-2: EMPIRICAL NAVIGATION & PERSONA VERIFICATION`);
  console.log(`===============================================================`);

  // Ensure test personas exist in database
  let lucasUser = await prisma.user.findFirst({ where: { email: 'lucas.orcamentos@test.com' } });
  if (!lucasUser) {
    lucasUser = await prisma.user.create({
      data: {
        name: 'Lucas Orçamentista',
        email: 'lucas.orcamentos@test.com',
        passwordHash: '$2a$10$abcdefghijklmnopqrstuv',
        role: 'ORCAMENTISTA',
        ativo: true,
        acessoOrcamento: true,
        acessoMedicao: false,
      },
    });
  } else {
    lucasUser = await prisma.user.update({
      where: { id: lucasUser.id },
      data: { ativo: true, acessoOrcamento: true, acessoMedicao: false },
    });
  }

  let carlosUser = await prisma.user.findFirst({ where: { email: 'carlos.apontador@test.com' } });
  if (!carlosUser) {
    carlosUser = await prisma.user.create({
      data: {
        name: 'Carlos Oliveira',
        email: 'carlos.apontador@test.com',
        passwordHash: '$2a$10$abcdefghijklmnopqrstuv',
        role: 'APONTADOR',
        ativo: true,
        acessoOrcamento: false,
        acessoMedicao: true,
      },
    });
  } else {
    carlosUser = await prisma.user.update({
      where: { id: carlosUser.id },
      data: { ativo: true, acessoOrcamento: false, acessoMedicao: true },
    });
  }

  let robertoUser = await prisma.user.findFirst({ where: { email: 'roberto.admin@test.com' } });
  if (!robertoUser) {
    robertoUser = await prisma.user.create({
      data: {
        name: 'Roberto Mendes Admin',
        email: 'roberto.admin@test.com',
        passwordHash: '$2a$10$abcdefghijklmnopqrstuv',
        role: 'ADMIN',
        ativo: true,
        acessoOrcamento: true,
        acessoMedicao: true,
      },
    });
  } else {
    robertoUser = await prisma.user.update({
      where: { id: robertoUser.id },
      data: { ativo: true, acessoOrcamento: true, acessoMedicao: true },
    });
  }

  let zeroUser = await prisma.user.findFirst({ where: { email: 'zero.modules@test.com' } });
  if (!zeroUser) {
    zeroUser = await prisma.user.create({
      data: {
        name: 'Zero Modules Persona',
        email: 'zero.modules@test.com',
        passwordHash: '$2a$10$abcdefghijklmnopqrstuv',
        role: 'USUARIO',
        ativo: true,
        acessoOrcamento: false,
        acessoMedicao: false,
      },
    });
  } else {
    zeroUser = await prisma.user.update({
      where: { id: zeroUser.id },
      data: { ativo: true, acessoOrcamento: false, acessoMedicao: false },
    });
  }

  let inactiveUser = await prisma.user.findFirst({ where: { email: 'inactive.user@test.com' } });
  if (!inactiveUser) {
    inactiveUser = await prisma.user.create({
      data: {
        name: 'Inativo User',
        email: 'inactive.user@test.com',
        passwordHash: '$2a$10$abcdefghijklmnopqrstuv',
        role: 'ORCAMENTISTA',
        ativo: false,
        acessoOrcamento: true,
        acessoMedicao: true,
      },
    });
  } else {
    inactiveUser = await prisma.user.update({
      where: { id: inactiveUser.id },
      data: { ativo: false, acessoOrcamento: true, acessoMedicao: true },
    });
  }

  // Create real database sessions for each persona
  const lucasToken = await createSession(lucasUser.id);
  const carlosToken = await createSession(carlosUser.id);
  const robertoToken = await createSession(robertoUser.id);
  const zeroToken = await createSession(zeroUser.id);
  const inactiveToken = await createSession(inactiveUser.id);

  // =========================================================================
  // SUITE 1: PERSONA SETUP VERIFICATION
  // =========================================================================
  suite('1. Persona Database State & Claim Integrity');

  await test('1.1', 'Lucas persona exists withcessoOrcamento=true, acessoMedicao=false', () => {
    assert(lucasUser!.acessoOrcamento === true, 'Lucas must have acessoOrcamento true');
    assert(lucasUser!.acessoMedicao === false, 'Lucas must have acessoMedicao false');
  });

  await test('1.2', 'Carlos persona exists withcessoOrcamento=false, acessoMedicao=true', () => {
    assert(carlosUser!.acessoOrcamento === false, 'Carlos must have acessoOrcamento false');
    assert(carlosUser!.acessoMedicao === true, 'Carlos must have acessoMedicao true');
  });

  await test('1.3', 'Roberto persona exists withcessoOrcamento=true, acessoMedicao=true (dual access)', () => {
    assert(robertoUser!.acessoOrcamento === true, 'Roberto must have acessoOrcamento true');
    assert(robertoUser!.acessoMedicao === true, 'Roberto must have acessoMedicao true');
  });

  await test('1.4', 'Zero modules persona has both flags set to false', () => {
    assert(zeroUser!.acessoOrcamento === false, 'ZeroUser must have acessoOrcamento false');
    assert(zeroUser!.acessoMedicao === false, 'ZeroUser must have acessoMedicao false');
  });

  // =========================================================================
  // SUITE 2: ROOT GATEWAY REDIRECTION EMPIRICAL TESTS ('/')
  // =========================================================================
  suite('2. Root Gateway Redirection Empirical Tests ("/")');

  await test('2.1', 'Lucas (Orçamentos-only) visiting "/" is redirected to /dashboard', async () => {
    const target = await runRootRedirect(lucasToken);
    assertEqual(target, '/dashboard', 'Lucas must be redirected strictly to /dashboard');
  });

  await test('2.2', 'Carlos (Medição-only) visiting "/" is redirected to /medicao', async () => {
    const target = await runRootRedirect(carlosToken);
    assertEqual(target, '/medicao', 'Carlos must be redirected strictly to /medicao');
  });

  await test('2.3', 'Roberto (Dual-access) visiting "/" is redirected to /portal', async () => {
    const target = await runRootRedirect(robertoToken);
    assertEqual(target, '/portal', 'Roberto must be redirected strictly to /portal');
  });

  await test('2.4', 'Zero-modules user visiting "/" is redirected to /login?error=no_modules', async () => {
    const target = await runRootRedirect(zeroToken);
    assertEqual(target, '/login?error=no_modules', 'Zero modules user must receive explicit error redirect');
  });

  await test('2.5', 'Unauthenticated visitor visiting "/" is redirected to /login', async () => {
    const target = await runRootRedirect(null);
    assertEqual(target, '/login', 'Unauthenticated visitor must be redirected to /login');
  });

  await test('2.6', 'Inactive user session on "/" is rejected to /login', async () => {
    const target = await runRootRedirect(inactiveToken);
    assertEqual(target, '/login', 'Inactive user session must be rejected to /login');
  });

  // =========================================================================
  // SUITE 3: MODULE SWITCHER VISIBILITY & CLICK TARGETS ('DashboardShell')
  // =========================================================================
  suite('3. Module Switcher Visibility & Click Targets (DashboardShell)');

  await test('3.1', 'Lucas (Orçamentos-only): Switcher is completely HIDDEN in DashboardShell (Desktop & Mobile)', () => {
    // Desktop render
    const htmlDesktop = renderShell({
      id: lucasUser!.id,
      name: lucasUser!.name,
      email: lucasUser!.email,
      role: lucasUser!.role,
      acessoOrcamento: true,
      acessoMedicao: false,
    });

    assertNotIncludes(htmlDesktop, 'Trocar Módulo', 'Lucas must NOT see Trocar Módulo button on desktop');
    assertNotIncludes(htmlDesktop, 'href="/portal"', 'Lucas must NOT have any link to /portal in sidebar/header');
    assertNotIncludes(htmlDesktop, 'Portal Unificado', 'Lucas must NOT see Portal Unificado section header in menu');

    // Mobile drawer render
    const htmlMobile = renderShell({
      id: lucasUser!.id,
      name: lucasUser!.name,
      email: lucasUser!.email,
      role: lucasUser!.role,
      acessoOrcamento: true,
      acessoMedicao: false,
    }, '/dashboard', true);

    assertNotIncludes(htmlMobile, 'Trocar Módulo', 'Lucas must NOT see Trocar Módulo button in mobile drawer');
  });

  await test('3.2', 'Carlos (Medição-only): Switcher is completely HIDDEN if rendered in DashboardShell', () => {
    const html = renderShell({
      id: carlosUser!.id,
      name: carlosUser!.name,
      email: carlosUser!.email,
      role: carlosUser!.role,
      acessoOrcamento: false,
      acessoMedicao: true,
    });

    assertNotIncludes(html, 'Trocar Módulo', 'Carlos must NOT see Trocar Módulo button');
    assertNotIncludes(html, 'href="/portal"', 'Carlos must NOT have any link to /portal');
  });

  await test('3.3', 'Roberto (Dual-access): Switcher is VISIBLE in Desktop Sidebar and Top Header', () => {
    const html = renderShell({
      id: robertoUser!.id,
      name: robertoUser!.name,
      email: robertoUser!.email,
      role: robertoUser!.role,
      acessoOrcamento: true,
      acessoMedicao: true,
    });

    assertIncludes(html, 'Trocar Módulo', 'Roberto MUST see Trocar Módulo in shell');

    // Both desktop sidebar and top header render link to /portal
    const portalLinkMatches = html.match(/href="\/portal"/g) || [];
    assert(
      portalLinkMatches.length >= 2,
      `Expected at least 2 href="/portal" links in desktop render (sidebar + header), found: ${portalLinkMatches.length}`
    );

    // Check title attributes
    assertIncludes(html, 'title="Voltar ao Portal de Módulos RBT"', 'Sidebar switcher must include helpful title attribute');
    assertIncludes(html, 'title="Voltar à seleção de módulos do Portal Unificado"', 'Header switcher must include helpful title attribute');
  });

  await test('3.4', 'Roberto (Dual-access): Switcher is ALSO VISIBLE in Mobile Slide Drawer', () => {
    const htmlMobile = renderShell({
      id: robertoUser!.id,
      name: robertoUser!.name,
      email: robertoUser!.email,
      role: robertoUser!.role,
      acessoOrcamento: true,
      acessoMedicao: true,
    }, '/dashboard', true);

    // With drawer open, we have 3 links to /portal (Desktop sidebar, mobile drawer, top header)
    const portalLinkMatches = htmlMobile.match(/href="\/portal"/g) || [];
    assertEqual(
      portalLinkMatches.length,
      3,
      `Expected exactly 3 href="/portal" links with drawer open (desktop sidebar, mobile drawer, top header)`
    );
  });

  await test('3.5', 'Legacy user (acessoOrcamento andcessoMedicao undefined): Switcher is safely hidden', () => {
    const html = renderShell({
      id: 'legacy-1',
      name: 'Legacy User',
      email: 'legacy@rbt.com.br',
      role: 'ORCAMENTISTA',
    });

    assertNotIncludes(html, 'Trocar Módulo', 'Legacy user without flags must NOT see switcher');
    assertNotIncludes(html, 'href="/portal"', 'Legacy user must NOT have link to /portal');
  });

  await test('3.6', 'Corrupted/Null flags: Switcher is safely hidden without throwing exceptions', () => {
    const html = renderShell({
      id: 'null-1',
      name: 'Null User',
      email: 'null@rbt.com.br',
      role: 'ORCAMENTISTA',
      acessoOrcamento: null,
      acessoMedicao: undefined,
    });

    assertNotIncludes(html, 'Trocar Módulo', 'User with null/undefined flags must NOT see switcher');
  });

  // =========================================================================
  // SUITE 4: PORTAL SELECTION HUB CARD STATES & BADGES ('/portal')
  // =========================================================================
  suite('4. Portal Selection Hub Card States & Badges ("/portal")');

  await test('4.1', 'Lucas (Orçamentos-only): Card 1 is ENABLED, Card 2 is DISABLED', async () => {
    const html = await renderPortal(lucasToken);

    // User identification
    assertIncludes(html, 'Lucas Orçamentista', 'Must display Lucas user name');
    assertIncludes(html, 'Orçamentista', 'Must display Lucas role badge');

    // Card 1: Gestão de Orçamentos MUST BE ENABLED
    assertIncludes(html, 'Gestão de Orçamentos', 'Card 1 title must exist');
    assertIncludes(html, 'href="/dashboard"', 'Card 1 MUST contain active link to /dashboard');
    assertIncludes(html, 'Clique para acessar', 'Card 1 button must say "Clique para acessar"');

    // Card 2: Medição Diária (RDP) MUST BE DISABLED
    assertIncludes(html, 'Medição Diária (RDP)', 'Card 2 title must exist');
    assertNotIncludes(html, 'href="/medicao"', 'Card 2 MUST NOT contain active link to /medicao');
    assertIncludes(html, 'Acesso não habilitado', 'Card 2 button must say "Acesso não habilitado"');
    assertIncludes(html, 'cursor-not-allowed', 'Card 2 must have cursor-not-allowed class');

    // Status badges
    assertIncludes(html, 'Acesso Liberado', 'Must have at least one Acesso Liberado badge');
    assertIncludes(html, 'Acesso Não Habilitado', 'Must have at least one Acesso Não Habilitado badge');

    // Zero modules banner should NOT appear
    assertNotIncludes(html, 'Nenhum Módulo Corporativo Habilitado', 'Zero modules banner must not appear');
  });

  await test('4.2', 'Carlos (Medição-only): Card 1 is DISABLED, Card 2 is ENABLED', async () => {
    const html = await renderPortal(carlosToken);

    // User identification
    assertIncludes(html, 'Carlos Oliveira', 'Must display Carlos user name');
    assertIncludes(html, 'Apontador', 'Must display Carlos role badge');

    // Card 1: Gestão de Orçamentos MUST BE DISABLED
    assertNotIncludes(html, 'href="/dashboard"', 'Card 1 MUST NOT contain active link to /dashboard');

    // Card 2: Medição Diária (RDP) MUST BE ENABLED
    assertIncludes(html, 'href="/medicao"', 'Card 2 MUST contain active link to /medicao');
    assertIncludes(html, 'Clique para acessar', 'Card 2 button must say "Clique para acessar"');

    // Badges check
    assertIncludes(html, 'Acesso Liberado', 'Must have Acesso Liberado badge for Medicao');
    assertIncludes(html, 'Acesso Não Habilitado', 'Must have Acesso Não Habilitado badge for Orcamentos');
  });

  await test('4.3', 'Roberto (Dual-access): BOTH Card 1 and Card 2 are ENABLED', async () => {
    const html = await renderPortal(robertoToken);

    // User identification
    assertIncludes(html, 'Roberto Mendes Admin', 'Must display Roberto user name');
    assertIncludes(html, 'Gestor / Admin', 'Must display Roberto role badge');

    // Card 1: Gestão de Orçamentos ENABLED
    assertIncludes(html, 'href="/dashboard"', 'Card 1 MUST contain active link to /dashboard');

    // Card 2: Medição Diária ENABLED
    assertIncludes(html, 'href="/medicao"', 'Card 2 MUST contain active link to /medicao');

    // Both cards have "Clique para acessar"
    const cliqueMatches = html.match(/Clique para acessar/g) || [];
    assertEqual(cliqueMatches.length, 2, 'Both cards must feature "Clique para acessar"');

    // No disabled card
    assertNotIncludes(html, 'Acesso não habilitado', 'No card should be marked as "Acesso não habilitado"');
    assertNotIncludes(html, 'Acesso Não Habilitado', 'No badge should be "Acesso Não Habilitado"');
  });

  await test('4.4', 'Zero-modules persona: BOTH Card 1 and Card 2 are DISABLED, warning banner shown', async () => {
    const html = await renderPortal(zeroToken);

    // Neither card has active link
    assertNotIncludes(html, 'href="/dashboard"', 'Card 1 must NOT have link');
    assertNotIncludes(html, 'href="/medicao"', 'Card 2 must NOT have link');

    // Both cards show disabled label
    const disabledLabels = html.match(/Acesso não habilitado/g) || [];
    assertEqual(disabledLabels.length, 2, 'Both cards must show "Acesso não habilitado"');

    // Explicit warning banner is rendered
    assertIncludes(
      html,
      'Nenhum Módulo Corporativo Habilitado',
      'Must display prominent banner when user has zero permissions'
    );
  });

  await test('4.5', 'Unauthenticated visitor accessing "/portal" is redirected to /login', async () => {
    try {
      await renderPortal(null);
      throw new Error('Should have redirected to /login');
    } catch (err: any) {
      if (err?.digest && typeof err.digest === 'string' && err.digest.includes('/login')) {
        assert(true, 'Redirected to /login');
      } else {
        throw err;
      }
    }
  });

  // =========================================================================
  // SUITE 5: PORTAL UNAUTHORIZED ALERT PROCESSING
  // =========================================================================
  suite('5. Portal Unauthorized Redirect Alert Banners');

  await test('5.1', 'searchParams.unauthorized = "orcamentos" renders friendly orcamentos alert', async () => {
    const html = await renderPortal(carlosToken, { unauthorized: 'orcamentos' });

    assertIncludes(
      html,
      'Acesso Restrito ao Módulo de Orçamentos',
      'Must display friendly alert title for orcamentos restriction'
    );
    assertIncludes(
      html,
      'Seu perfil de usuário corporativo não possui habilitação para acessar a Gestão de Orçamentos',
      'Must display explanatory guidance text'
    );
  });

  await test('5.2', 'searchParams.unauthorized = "medicao" renders friendly medicao alert', async () => {
    const html = await renderPortal(lucasToken, { unauthorized: 'medicao' });

    assertIncludes(
      html,
      'Acesso Restrito ao Módulo de Medição Diária',
      'Must display friendly alert title for medicao restriction'
    );
    assertIncludes(
      html,
      'Seu perfil de usuário corporativo não possui habilitação para acessar a Medição Diária (RDP)',
      'Must display explanatory guidance text'
    );
  });

  await test('5.3', 'searchParams.unauthorized = "unknown" renders generic warning alert', async () => {
    const html = await renderPortal(robertoToken, { unauthorized: 'unknown' });

    assertIncludes(
      html,
      'Acesso Não Autorizado',
      'Must display generic alert title'
    );
  });

  await test('5.4', 'Empty searchParams renders NO unauthorized alert banner', async () => {
    const html = await renderPortal(robertoToken, {});

    assertNotIncludes(html, 'Acesso Restrito ao Módulo', 'No unauthorized alert banner should be rendered');
    assertNotIncludes(html, 'Acesso Não Autorizado', 'No generic unauthorized alert banner should be rendered');
  });

  // =========================================================================
  // SUITE 6: INSTITUTIONAL BRANDING & DESIGN SYSTEM CONFORMANCE
  // =========================================================================
  suite('6. Institutional Branding & Design Conformance (#BA1A1A, #111827)');

  await test('6.1', 'Official RBT Brand Colors and Logo are present in Portal', async () => {
    const html = await renderPortal(robertoToken);

    // Primary red: #BA1A1A (Card 1 accent stripe and button)
    assertIncludes(html, 'bg-[#BA1A1A]', 'Must use RBT corporate primary red #BA1A1A');

    // Dark graphite: #111827 (Card 2 accent stripe, avatar background, and button)
    assertIncludes(html, 'bg-[#111827]', 'Must use RBT corporate dark graphite #111827');

    // Topbar brand
    assertIncludes(html, 'RBT', 'Must render RBT brand name');
    assertIncludes(html, 'FUNDAÇÕES', 'Must render FUNDAÇÕES subtitle in logo');
    assertIncludes(html, 'Sistemas Corporativos Integrados', 'Must render institutional subtitle');
  });

  await test('6.2', 'User Avatar Initials calculation works for single and compound names', async () => {
    const htmlLucas = await renderPortal(lucasToken);
    assertIncludes(htmlLucas, '>LO<', 'Lucas Orçamentista must produce initials LO');

    const htmlCarlos = await renderPortal(carlosToken);
    assertIncludes(htmlCarlos, '>CO<', 'Carlos Oliveira must produce initials CO');

    const htmlRoberto = await renderPortal(robertoToken);
    assertIncludes(htmlRoberto, '>RM<', 'Roberto Mendes Admin must produce initials RM');
  });

  await test('6.3', 'Role badge color mappings are distinct and correct', async () => {
    const htmlLucas = await renderPortal(lucasToken);
    assertIncludes(htmlLucas, 'bg-blue-500/10', 'ORCAMENTISTA role badge uses blue tint');

    const htmlCarlos = await renderPortal(carlosToken);
    assertIncludes(htmlCarlos, 'bg-emerald-500/10', 'APONTADOR role badge uses emerald tint');

    const htmlRoberto = await renderPortal(robertoToken);
    assertIncludes(htmlRoberto, 'bg-amber-500/10', 'ADMIN role badge uses amber tint');
  });

  await test('6.4', 'Secure Logout button is present in Portal header', async () => {
    const html = await renderPortal(robertoToken);
    assertIncludes(html, 'Sair', 'Must render logout button with text "Sair"');
  });

  // =========================================================================
  // SUITE 7: ADVERSARIAL STRESS, INACTIVE USERS & CHAOS INPUTS
  // =========================================================================
  suite('7. Adversarial Stress & Chaos Inputs');

  await test('7.1', 'Malicious XSS payload in user name is safely sanitized by React', () => {
    const xssPayload = '<script>alert("xss")</script><img src=x onerror=alert(1)>';
    const html = renderShell({
      id: 'xss-user',
      name: xssPayload,
      email: 'xss@rbt.com.br',
      role: 'ADMIN',
      acessoOrcamento: true,
      acessoMedicao: true,
    });

    assertNotIncludes(html, '<script>', 'Raw script tags must not be emitted unescaped');
    assertIncludes(html, '&lt;script&gt;', 'Script tag must be safely HTML escaped');
  });

  await test('7.2', 'Massive 500-character name does not crash or break layout rendering', () => {
    const longName = 'A'.repeat(500);
    const html = renderShell({
      id: 'long-name-user',
      name: longName,
      email: 'long@rbt.com.br',
      role: 'ORCAMENTISTA',
      acessoOrcamento: true,
      acessoMedicao: true,
    });

    assertIncludes(html, 'truncate', 'Truncate CSS class must be applied to user name');
    assert(html.length > 500, 'HTML was rendered successfully');
  });

  await test('7.3', 'Rapid concurrent session evaluations maintain strict isolation', async () => {
    const evaluations = await Promise.all([
      runRootRedirect(lucasToken),
      runRootRedirect(carlosToken),
      runRootRedirect(robertoToken),
      runRootRedirect(zeroToken),
      runRootRedirect(null),
    ]);

    assertEqual(evaluations[0], '/dashboard', 'Parallel Lucas redirect');
    assertEqual(evaluations[1], '/medicao', 'Parallel Carlos redirect');
    assertEqual(evaluations[2], '/portal', 'Parallel Roberto redirect');
    assertEqual(evaluations[3], '/login?error=no_modules', 'Parallel ZeroUser redirect');
    assertEqual(evaluations[4], '/login', 'Parallel Null redirect');
  });

  // Cleanup temporary test sessions and users
  await prisma.session.deleteMany({
    where: {
      userId: {
        in: [lucasUser.id, carlosUser.id, robertoUser.id, zeroUser.id, inactiveUser.id],
      },
    },
  });
  await prisma.user.deleteMany({
    where: {
      id: {
        in: [lucasUser.id, carlosUser.id, robertoUser.id, zeroUser.id, inactiveUser.id],
      },
    },
  });

  // =========================================================================
  // SUMMARY REPORT & VERDICT
  // =========================================================================
  const total = testResults.length;
  const passed = testResults.filter((r) => r.passed).length;
  const failed = testResults.filter((r) => !r.passed).length;

  console.log(`\n===============================================================`);
  console.log(`        CHALLENGER M2-2 NAVIGATION TEST SUMMARY REPORT         `);
  console.log(`===============================================================`);
  console.log(`  Total Tests Run:    ${total}`);
  console.log(`  Tests Passed:       ${passed}`);
  console.log(`  Tests Failed:       ${failed}`);
  console.log(`  Pass Rate:          ${((passed / total) * 100).toFixed(1)}%`);
  console.log(`===============================================================`);

  if (failed > 0) {
    console.error(`\nOVERALL VERDICT: REJECT ✗ (${failed} tests failed)`);
    process.exit(1);
  } else {
    console.log(`\nOVERALL VERDICT: APPROVE ✓ (All empirical assertions passed!)`);
    process.exit(0);
  }
}

main().catch((err) => {
  console.error('Fatal unhandled error in test runner:', err);
  process.exit(1);
});
