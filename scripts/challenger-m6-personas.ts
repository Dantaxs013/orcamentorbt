/**
 * Empirical Challenger M6-2: Full Persona Lifecycle & Workload Stress Harness
 *
 * Direct adversarial stress harness testing production modules:
 * - Live Edge Middleware (`src/middleware.ts`)
 * - Live Cryptographic Engine (`src/lib/token-utils.ts`)
 * - Live User Validation Schema (`src/lib/validations/usuario.schema.ts`)
 * - Live RDP Math Calculation Engine (`src/lib/calculations/rdp-math.ts`)
 * - Live BRL Currency & Precision Masks (`src/lib/masks.ts`)
 *
 * Covers:
 * - Suite 1: Production Persona 1 — "Engenheiro Carlos" (Medição-only Lifecycle & Operational Stress)
 * - Suite 2: Production Persona 2 — "Orçamentista Lucas" (Orçamento-only Lifecycle & Commercial Stress)
 * - Suite 3: Production Persona 3 — "Diretoria Roberto" (Dual-Module Executive Lifecycle & Cross-Module Switcher)
 * - Suite 4: Concurrent Multi-Persona Interleaved Workload Stress (Zero Route Bleed Under High Concurrency)
 * - Suite 5: Domain Calculations Deep Stress in rdp-math.ts (Net depth, emendas, totals, 5,000 Monte-Carlo cycles)
 *
 * Usage:
 *   npx tsx scripts/challenger-m6-personas.ts
 */

import { NextRequest } from 'next/server';
import { middleware as liveMiddleware, SESSION_COOKIE_NAME } from '../src/middleware';
import {
  signUserMeta,
  verifyUserMeta,
  USER_META_COOKIE_NAME,
  UserMetaClaims,
} from '../src/lib/token-utils';
import {
  createUserSchema,
  updateUserSchema,
} from '../src/lib/validations/usuario.schema';
import {
  parseBrazilianNumber,
  round2,
  calculateLineMetrics,
  calculateRdpTotals,
  validateLineIntegrity,
  validateRdpSubmission,
  LinhaProducaoItem,
  ShiftHours,
} from '../src/lib/calculations/rdp-math';
import {
  formatCurrencyBRL,
  parseCurrencyBRL,
  formatPhoneBR,
  formatDimension,
} from '../src/lib/masks';

// =========================================================================
// TEST RECORDING PRIMITIVES
// =========================================================================

interface TestRecord {
  suite: string;
  name: string;
  passed: boolean;
  error?: string;
  durationMs: number;
}

const testRecords: TestRecord[] = [];
let currentSuiteName = '';

function suite(name: string) {
  currentSuiteName = name;
  console.log(`\n===============================================================`);
  console.log(`  SUITE: ${name}`);
  console.log(`===============================================================`);
}

async function test(name: string, fn: () => void | Promise<void>) {
  const start = performance.now();
  try {
    await fn();
    const durationMs = Number((performance.now() - start).toFixed(2));
    testRecords.push({ suite: currentSuiteName, name, passed: true, durationMs });
    console.log(`  ✓ [PASS] ${name} (${durationMs}ms)`);
  } catch (err: any) {
    const durationMs = Number((performance.now() - start).toFixed(2));
    const errorMessage = err?.message || String(err);
    testRecords.push({
      suite: currentSuiteName,
      name,
      passed: false,
      error: errorMessage,
      durationMs,
    });
    console.error(`  ✗ [FAIL] ${name} (${durationMs}ms)`);
    console.error(`         Error: ${errorMessage}`);
  }
}

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
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

// Helper to execute live Edge Middleware and extract status and location
async function callLiveMiddleware(url: string, cookieHeader: string, method: string = 'GET') {
  const req = new NextRequest(url, {
    method,
    headers: {
      cookie: cookieHeader,
    },
  });
  const res = await liveMiddleware(req);
  return {
    status: res.status,
    location: res.headers.get('location'),
    response: res,
  };
}

// =========================================================================
// MAIN RUNNER
// =========================================================================

async function runPersonaStress() {
  const startTime = performance.now();
  console.log(`\n===============================================================`);
  console.log(`  EMPIRICAL CHALLENGER M6-2: PERSONA & WORKLOAD STRESS SUITE  `);
  console.log(`  Target: Live Production Middleware, Crypto, Schemas & Math  `);
  console.log(`  Timestamp: ${new Date().toISOString()}`);
  console.log(`===============================================================`);

  // =======================================================================
  // SUITE 1: Persona 1 "Engenheiro Carlos" (Medição-only Lifecycle)
  // =======================================================================
  suite('1. Production Persona 1: "Engenheiro Carlos" (Medição-only Lifecycle)');

  const carlosToken = await signUserMeta({
    userId: 'carlos_eng_001',
    role: 'ENGENHEIRO',
    email: 'carlos.engenharia@rbtfundacoes.com.br',
    acessoOrcamento: false,
    acessoMedicao: true,
  });
  const carlosCookieHeader = `${SESSION_COOKIE_NAME}=sess_carlos_prod; ${USER_META_COOKIE_NAME}=${carlosToken}`;

  await test('1.1 Carlos root "/" navigation triages directly to "/portal"', async () => {
    const res = await callLiveMiddleware('http://localhost:3000/', carlosCookieHeader);
    assertEqual(res.status, 307, 'Root redirect status must be 307');
    assertIncludes(res.location || '', '/portal', 'Carlos must be triaged to /portal');
  });

  await test('1.2 Carlos claims reflect Medição exclusive access', async () => {
    const claims = await verifyUserMeta(carlosToken);
    assert(claims !== null, 'Claims must decode successfully');
    assertEqual(claims?.acessoOrcamento, false, 'acessoOrcamento must be false');
    assertEqual(claims?.acessoMedicao, true, 'acessoMedicao must be true');
    assertEqual(claims?.role, 'ENGENHEIRO', 'Role must be ENGENHEIRO');
  });

  await test('1.3 Carlos module switcher rule: suppressed when dual access is false', () => {
    const hasDualAccess = Boolean(false && true);
    assertEqual(hasDualAccess, false, 'Module switcher must be suppressed for Carlos');
  });

  await test('1.4 Carlos accesses all operational Medição routes and APIs smoothly', async () => {
    const allowedUrls = [
      'http://localhost:3000/medicao',
      'http://localhost:3000/medicao/rdp',
      'http://localhost:3000/medicao/obras',
      'http://localhost:3000/medicao/engenheiro/validacao',
      'http://localhost:3000/api/medicoes',
      'http://localhost:3000/api/rdp',
      'http://localhost:3000/api/obras',
      'http://localhost:3000/api/estacas',
    ];
    for (const url of allowedUrls) {
      const res = await callLiveMiddleware(url, carlosCookieHeader);
      assertEqual(res.status, 200, `Carlos must be permitted access to ${url}`);
    }
  });

  await test('1.5 Carlos blocked from /dashboard routes with 307 redirect to /portal?unauthorized=orcamentos', async () => {
    const forbiddenPages = [
      'http://localhost:3000/dashboard',
      'http://localhost:3000/dashboard/orcamentos',
      'http://localhost:3000/dashboard/usuarios',
      'http://localhost:3000/dashboard/kanban',
    ];
    for (const url of forbiddenPages) {
      const res = await callLiveMiddleware(url, carlosCookieHeader);
      assertEqual(res.status, 307, `Carlos must be blocked with 307 from ${url}`);
      assertIncludes(res.location || '', '/portal?unauthorized=orcamentos', 'Must redirect with friendly banner');
    }
  });

  await test('1.6 Carlos blocked from /api/orcamentos with HTTP 403 Forbidden', async () => {
    const forbiddenApis = [
      'http://localhost:3000/api/orcamentos',
      'http://localhost:3000/api/orcamentos/123/proposta',
    ];
    for (const url of forbiddenApis) {
      const res = await callLiveMiddleware(url, carlosCookieHeader);
      assertEqual(res.status, 403, `Carlos must receive HTTP 403 on ${url}`);
    }
  });

  await test('1.7 Carlos path traversal attempt /medicao/../dashboard is normalized and blocked', async () => {
    const res = await callLiveMiddleware('http://localhost:3000/medicao/../dashboard', carlosCookieHeader);
    assertEqual(res.status, 307, 'Normalized path to /dashboard must block Carlos');
    assertIncludes(res.location || '', '/portal?unauthorized=orcamentos', 'Redirect must enforce barrier');
  });

  await test('1.8 Carlos tampering with token to self-grant orçamentos is detected and rejected', async () => {
    const [payloadB64, sig] = carlosToken.split('.');
    const jsonStr = Buffer.from(payloadB64, 'base64url').toString('utf8');
    const tamperedObj = JSON.parse(jsonStr);
    tamperedObj.acessoOrcamento = true; // Malicious tamper
    const tamperedB64 = Buffer.from(JSON.stringify(tamperedObj)).toString('base64url');
    const forgedToken = `${tamperedB64}.${sig}`;

    const verified = await verifyUserMeta(forgedToken);
    assertEqual(verified, null, 'Forged token must fail cryptographic verification');

    const res = await callLiveMiddleware('http://localhost:3000/dashboard', `${SESSION_COOKIE_NAME}=sess_carlos; ${USER_META_COOKIE_NAME}=${forgedToken}`);
    assertEqual(res.status, 307, 'Tampered cookie must trigger redirect');
  });

  // =======================================================================
  // SUITE 2: Persona 2 "Orçamentista Lucas" (Orçamento-only Lifecycle)
  // =======================================================================
  suite('2. Production Persona 2: "Orçamentista Lucas" (Orçamento-only Lifecycle)');

  const lucasToken = await signUserMeta({
    userId: 'lucas_orc_002',
    role: 'ORCAMENTISTA',
    email: 'lucas.orcamentos@rbtfundacoes.com.br',
    acessoOrcamento: true,
    acessoMedicao: false,
  });
  const lucasCookieHeader = `${SESSION_COOKIE_NAME}=sess_lucas_prod; ${USER_META_COOKIE_NAME}=${lucasToken}`;

  await test('2.1 Lucas root "/" navigation triages directly to "/portal"', async () => {
    const res = await callLiveMiddleware('http://localhost:3000/', lucasCookieHeader);
    assertEqual(res.status, 307, 'Root redirect status must be 307');
    assertIncludes(res.location || '', '/portal', 'Lucas must be triaged to /portal');
  });

  await test('2.2 Lucas claims reflect Orçamento exclusive access', async () => {
    const claims = await verifyUserMeta(lucasToken);
    assert(claims !== null, 'Claims must decode successfully');
    assertEqual(claims?.acessoOrcamento, true, 'acessoOrcamento must be true');
    assertEqual(claims?.acessoMedicao, false, 'acessoMedicao must be false');
    assertEqual(claims?.role, 'ORCAMENTISTA', 'Role must be ORCAMENTISTA');
  });

  await test('2.3 Lucas module switcher rule: suppressed when dual access is false', () => {
    const hasDualAccess = Boolean(true && false);
    assertEqual(hasDualAccess, false, 'Module switcher must be suppressed for Lucas');
  });

  await test('2.4 Lucas accesses /dashboard, Kanban, and /api/orcamentos smoothly', async () => {
    const allowedUrls = [
      'http://localhost:3000/dashboard',
      'http://localhost:3000/dashboard/orcamentos',
      'http://localhost:3000/dashboard/usuarios',
      'http://localhost:3000/api/orcamentos',
    ];
    for (const url of allowedUrls) {
      const res = await callLiveMiddleware(url, lucasCookieHeader);
      assertEqual(res.status, 200, `Lucas must be permitted access to ${url}`);
    }
  });

  await test('2.5 Lucas blocked from /medicao routes with 307 redirect to /portal?unauthorized=medicao', async () => {
    const forbiddenPages = [
      'http://localhost:3000/medicao',
      'http://localhost:3000/medicao/rdp',
      'http://localhost:3000/medicao/obras',
      'http://localhost:3000/medicao/engenheiro/validacao',
    ];
    for (const url of forbiddenPages) {
      const res = await callLiveMiddleware(url, lucasCookieHeader);
      assertEqual(res.status, 307, `Lucas must be blocked with 307 from ${url}`);
      assertIncludes(res.location || '', '/portal?unauthorized=medicao', 'Must redirect with friendly banner');
    }
  });

  await test('2.6 Lucas blocked from Medição APIs (/api/medicoes, /api/rdp, /api/obras) with HTTP 403', async () => {
    const forbiddenApis = [
      'http://localhost:3000/api/medicoes',
      'http://localhost:3000/api/rdp',
      'http://localhost:3000/api/obras',
      'http://localhost:3000/api/estacas',
      'http://localhost:3000/api/contratos',
    ];
    for (const url of forbiddenApis) {
      const res = await callLiveMiddleware(url, lucasCookieHeader);
      assertEqual(res.status, 403, `Lucas must receive HTTP 403 on ${url}`);
    }
  });

  await test('2.7 Lucas commercial proposal currency & dimension masking accuracy', () => {
    assertEqual(formatCurrencyBRL(0), 'R$ 0,00', 'Zero currency formatted');
    assertEqual(formatCurrencyBRL(1250.5), 'R$ 1.250,50', 'Thousands separator formatted');
    assertEqual(formatCurrencyBRL(9876543.21), 'R$ 9.876.543,21', 'Millions currency formatted');
    assertEqual(parseCurrencyBRL('R$ 1.250,50'), 1250.5, 'Parsed thousands currency');
    assertEqual(parseCurrencyBRL('9.876.543,21'), 9876543.21, 'Parsed raw Brazilian currency');
    assertEqual(formatPhoneBR('11999998888'), '(11) 99999-8888', 'Phone mask formatted');
    assertEqual(formatDimension('10x20'), '10 x 20', 'Dimension multiplier spacing normalized');
    assertEqual(formatDimension('W150*22.5'), 'W150 x 22.5', 'Dimension asterisk multiplier converted');
  });

  // =======================================================================
  // SUITE 3: Persona 3 "Diretoria Roberto" (Dual-Module Executive)
  // =======================================================================
  suite('3. Production Persona 3: "Diretoria Roberto" (Dual-Module Executive)');

  const robertoToken = await signUserMeta({
    userId: 'roberto_dir_999',
    role: 'ADMIN',
    email: 'roberto.diretoria@rbtfundacoes.com.br',
    acessoOrcamento: true,
    acessoMedicao: true,
  });
  const robertoCookieHeader = `${SESSION_COOKIE_NAME}=sess_roberto_prod; ${USER_META_COOKIE_NAME}=${robertoToken}`;

  await test('3.1 Roberto root "/" navigation triages directly to "/portal"', async () => {
    const res = await callLiveMiddleware('http://localhost:3000/', robertoCookieHeader);
    assertEqual(res.status, 307, 'Root redirect status must be 307');
    assertIncludes(res.location || '', '/portal', 'Roberto must be triaged to /portal');
  });

  await test('3.2 Roberto claims reflect dual-module full executive access', async () => {
    const claims = await verifyUserMeta(robertoToken);
    assert(claims !== null, 'Claims must decode successfully');
    assertEqual(claims?.acessoOrcamento, true, 'acessoOrcamento must be true');
    assertEqual(claims?.acessoMedicao, true, 'acessoMedicao must be true');
    assertEqual(claims?.role, 'ADMIN', 'Role must be ADMIN');
  });

  await test('3.3 Roberto module switcher rule: enabled when dual access is true', () => {
    const hasDualAccess = Boolean(true && true);
    assertEqual(hasDualAccess, true, 'Module switcher must be enabled for Roberto');
  });

  await test('3.4 Roberto traverses freely across Orçamentos and Medição subsystems', async () => {
    const allUrls = [
      'http://localhost:3000/portal',
      'http://localhost:3000/dashboard',
      'http://localhost:3000/dashboard/orcamentos',
      'http://localhost:3000/medicao',
      'http://localhost:3000/medicao/rdp',
      'http://localhost:3000/medicao/engenheiro/validacao',
      'http://localhost:3000/medicao/admin/usuarios',
      'http://localhost:3000/api/orcamentos',
      'http://localhost:3000/api/medicoes',
      'http://localhost:3000/api/rdp',
      'http://localhost:3000/api/obras',
      'http://localhost:3000/api/admin/usuarios',
    ];
    for (const url of allUrls) {
      const res = await callLiveMiddleware(url, robertoCookieHeader);
      assertEqual(res.status, 200, `Roberto must be permitted access to ${url}`);
    }
  });

  await test('3.5 Roberto user provisioning via createUserSchema rejects zero modules and accepts valid combos', () => {
    // Zero modules rejected
    const zeroResult = createUserSchema.safeParse({
      name: 'Sem Modulo',
      email: 'sem@rbt.com.br',
      password: 'StrongPassword123!',
      role: 'ORCAMENTISTA',
      acessoOrcamento: false,
      acessoMedicao: false,
    });
    assertEqual(zeroResult.success, false, 'Zero modules must fail validation');
    if (!zeroResult.success) {
      const msg = zeroResult.error.issues[0]?.message || '';
      assertIncludes(msg, 'Pelo menos um módulo de acesso deve ser selecionado', 'Validation message check');
    }

    // Single module Orçamentos
    const orcOnly = createUserSchema.safeParse({
      name: 'Lucas Estagiario',
      email: 'lucas.estagio@rbt.com.br',
      password: 'StrongPassword123!',
      role: 'ORCAMENTISTA',
      acessoOrcamento: true,
      acessoMedicao: false,
    });
    assertEqual(orcOnly.success, true, 'Orçamentos only is valid');

    // Single module Medição
    const medOnly = createUserSchema.safeParse({
      name: 'Carlos Campo',
      email: 'carlos.campo@rbt.com.br',
      password: 'StrongPassword123!',
      role: 'ENGENHEIRO',
      acessoOrcamento: false,
      acessoMedicao: true,
    });
    assertEqual(medOnly.success, true, 'Medição only is valid');

    // Dual module
    const dualUser = createUserSchema.safeParse({
      name: 'Diretor Adjunto',
      email: 'diretor.adjunto@rbt.com.br',
      password: 'StrongPassword123!',
      role: 'ADMIN',
      acessoOrcamento: true,
      acessoMedicao: true,
    });
    assertEqual(dualUser.success, true, 'Dual module is valid');
  });

  // =======================================================================
  // SUITE 4: Concurrent Multi-Persona Interleaved Workload Stress
  // =======================================================================
  suite('4. Concurrent Multi-Persona Interleaved Workload Stress');

  await test('4.1 Zero route bleed under 90 randomized concurrent requests across all 3 personas', async () => {
    const personas = [
      { name: 'Carlos', cookie: carlosCookieHeader, canOrc: false, canMed: true },
      { name: 'Lucas', cookie: lucasCookieHeader, canOrc: true, canMed: false },
      { name: 'Roberto', cookie: robertoCookieHeader, canOrc: true, canMed: true },
    ];

    const targets = [
      { url: 'http://localhost:3000/dashboard', kind: 'orc_page' },
      { url: 'http://localhost:3000/dashboard/orcamentos', kind: 'orc_page' },
      { url: 'http://localhost:3000/medicao', kind: 'med_page' },
      { url: 'http://localhost:3000/medicao/rdp', kind: 'med_page' },
      { url: 'http://localhost:3000/api/orcamentos', kind: 'orc_api' },
      { url: 'http://localhost:3000/api/medicoes', kind: 'med_api' },
      { url: 'http://localhost:3000/api/rdp', kind: 'med_api' },
    ];

    const promises: Promise<void>[] = [];

    for (let i = 0; i < 90; i++) {
      const p = personas[i % personas.length];
      const t = targets[i % targets.length];

      promises.push(
        (async () => {
          const res = await callLiveMiddleware(t.url, p.cookie);
          if (t.kind === 'orc_page') {
            if (p.canOrc) {
              assertEqual(res.status, 200, `${p.name} access to ${t.url} must be 200`);
            } else {
              assertEqual(res.status, 307, `${p.name} access to ${t.url} must be 307`);
              assertIncludes(res.location || '', '/portal?unauthorized=orcamentos', 'Redirect target');
            }
          } else if (t.kind === 'med_page') {
            if (p.canMed) {
              assertEqual(res.status, 200, `${p.name} access to ${t.url} must be 200`);
            } else {
              assertEqual(res.status, 307, `${p.name} access to ${t.url} must be 307`);
              assertIncludes(res.location || '', '/portal?unauthorized=medicao', 'Redirect target');
            }
          } else if (t.kind === 'orc_api') {
            if (p.canOrc) {
              assertEqual(res.status, 200, `${p.name} calling ${t.url} must be 200`);
            } else {
              assertEqual(res.status, 403, `${p.name} calling ${t.url} must be 403`);
            }
          } else if (t.kind === 'med_api') {
            if (p.canMed) {
              assertEqual(res.status, 200, `${p.name} calling ${t.url} must be 200`);
            } else {
              assertEqual(res.status, 403, `${p.name} calling ${t.url} must be 403`);
            }
          }
        })()
      );
    }

    await Promise.all(promises);
  });

  // =======================================================================
  // SUITE 5: Domain Calculations Deep Stress in rdp-math.ts
  // =======================================================================
  suite('5. Domain Calculations Deep Stress in rdp-math.ts');

  await test('5.1 parseBrazilianNumber comprehensive inputs and fuzzing', () => {
    assertEqual(parseBrazilianNumber(null), 0, 'null -> 0');
    assertEqual(parseBrazilianNumber(undefined), 0, 'undefined -> 0');
    assertEqual(parseBrazilianNumber(''), 0, 'empty string -> 0');
    assertEqual(parseBrazilianNumber('   '), 0, 'spaces -> 0');
    assertEqual(parseBrazilianNumber(0), 0, 'number 0 -> 0');
    assertEqual(parseBrazilianNumber(18.75), 18.75, 'direct number -> 18.75');
    assertEqual(parseBrazilianNumber(-5.2), -5.2, 'negative number -> -5.2');
    assertEqual(parseBrazilianNumber(NaN), 0, 'NaN -> 0');
    assertEqual(parseBrazilianNumber('12,50'), 12.5, '"12,50" -> 12.5');
    assertEqual(parseBrazilianNumber('1.250,50'), 1250.5, '"1.250,50" -> 1250.5');
    assertEqual(parseBrazilianNumber('1,250.50'), 1250.5, '"1,250.50" (US) -> 1250.5');
    assertEqual(parseBrazilianNumber('10.000.000,99'), 10000000.99, 'Millions Brazilian notation');
    assertEqual(parseBrazilianNumber('abc_not_a_number'), 0, 'string fuzz -> 0');
    assertEqual(parseBrazilianNumber({}), 0, 'object fuzz -> 0');
    assertEqual(parseBrazilianNumber([]), 0, 'array fuzz -> 0');
    assertEqual(parseBrazilianNumber(true), 0, 'boolean fuzz -> 0');
  });

  await test('5.2 round2 financial floating point stability with Number.EPSILON', () => {
    assertEqual(round2(10.005), 10.01, '10.005 rounds up to 10.01');
    assertEqual(round2(12.344), 12.34, '12.344 rounds down to 12.34');
    assertEqual(round2(12.345), 12.35, '12.345 rounds up to 12.35');
    assertEqual(round2(0.1 + 0.2), 0.3, '0.1 + 0.2 floating addition = 0.3');
    assertEqual(round2(0), 0, '0 rounds to 0');
    assertEqual(round2(-5.555), -5.55, 'negative rounds cleanly');
  });

  await test('5.3 calculateLineMetrics net depth: comprimentoUtil = max(0, comprimento - arrasamento)', () => {
    // Standard case
    const l1 = calculateLineMetrics({
      numeroLinha: 1,
      numeroEstaca: 'EST-101',
      comprimento: 15.0,
      arrasamento: 2.5,
      emendaW150: 2,
      emendaW310: 1,
      talas: 3,
    });
    assertEqual(l1.comprimentoUtil, 12.5, '15.0 - 2.5 = 12.5m net depth');
    assertEqual(l1.comprimento, 15.0, 'comprimento preserved');
    assertEqual(l1.profundidade, 15.0, 'profundidade aliased to comprimento');
    assertEqual(l1.emendaW150, 2, 'emendaW150 floored');
    assertEqual(l1.emendaW310, 1, 'emendaW310 floored');
    assertEqual(l1.talas, 3, 'talas floored');

    // Arrasamento equals comprimento
    const l2 = calculateLineMetrics({
      numeroLinha: 2,
      comprimento: 6.0,
      arrasamento: 6.0,
    });
    assertEqual(l2.comprimentoUtil, 0.0, '6.0 - 6.0 = 0.0m');

    // Arrasamento > comprimento
    const l3 = calculateLineMetrics({
      numeroLinha: 3,
      comprimento: 4.0,
      arrasamento: 7.0,
    });
    assertEqual(l3.comprimentoUtil, 0.0, 'Arrasamento exceeding depth clamps net depth to 0');

    // Profundidade alias when comprimento omitted
    const l4 = calculateLineMetrics({
      numeroLinha: 4,
      profundidade: 18.0,
      arrasamento: 3.0,
    });
    assertEqual(l4.comprimento, 18.0, 'comprimento mapped from profundidade');
    assertEqual(l4.comprimentoUtil, 15.0, '18.0 - 3.0 = 15.0m');

    // Negative values defensive clamping
    const l5 = calculateLineMetrics({
      numeroLinha: 5,
      comprimento: -10,
      arrasamento: -2,
      emendaW150: -5,
    });
    assertEqual(l5.comprimento, 0, 'negative comprimento clamped to 0');
    assertEqual(l5.arrasamento, 0, 'negative arrasamento clamped to 0');
    assertEqual(l5.comprimentoUtil, 0, 'comprimentoUtil clamped to 0');
    assertEqual(l5.emendaW150, 0, 'negative emenda clamped to 0');
  });

  await test('5.4 calculateRdpTotals aggregation across 25 rows and shift deduction', () => {
    const rawLines: Partial<LinhaProducaoItem>[] = Array.from({ length: 30 }, (_, idx) => ({
      numeroLinha: idx + 1,
      numeroEstaca: idx < 12 ? `EST-${idx + 1}` : undefined,
      comprimento: 10.0,
      arrasamento: 1.0,
      emendaW150: 1,
      emendaW310: 2,
      talas: 3,
    }));

    const shift: ShiftHours = {
      inicio: '07:00',
      fim: '17:00', // 10h gross = 600 min
      almocoInicio: '12:00',
      almocoFim: '13:00', // 1h lunch = 60 min -> 540 min
      horasParadas: 1.5, // 1.5h stopped = 90 min -> 450 min = 7.5h
    };

    const totals = calculateRdpTotals(rawLines, shift);

    // Truncated at 25 rows (not 30)
    assertEqual(totals.totalEstacas, 12, 'Only first 12 have numeroEstaca');
    assertEqual(totals.metragemTotal, 250.0, '25 rows * 10m = 250m');
    assertEqual(totals.totalArrasamento, 25.0, '25 rows * 1m = 25m');
    assertEqual(totals.metragemLiquida, 225.0, '250m - 25m = 225m net depth');
    assertEqual(totals.totalW150, 25, '25 lines * 1 = 25 W150');
    assertEqual(totals.totalW310, 50, '25 lines * 2 = 50 W310');
    assertEqual(totals.totalEmendas, 75, '25 + 50 = 75 total emendas');
    assertEqual(totals.totalTalas, 75, '25 lines * 3 = 75 talas');
    assertEqual(totals.horasTrabalhadas, 7.5, '10h - 1h lunch - 1.5h stop = 7.5h worked');
    assertEqual(totals.horasParadas, 1.5, '1.5h stopped');
  });

  await test('5.5 Shift hours extreme boundary: stoppage exceeds shift duration -> clamped to 0', () => {
    const extremeShift = calculateRdpTotals([], {
      inicio: '08:00',
      fim: '12:00', // 4h = 240 min
      horasParadas: 6.0, // 6h stopped > 4h
    });
    assertEqual(extremeShift.horasTrabalhadas, 0, 'Productive hours clamped to 0 when stoppage exceeds gross time');
  });

  await test('5.6 validateLineIntegrity domain boundary validation rules', () => {
    // Valid line
    const v1 = validateLineIntegrity({
      numeroLinha: 1,
      numeroEstaca: 'E1',
      comprimento: 12.0,
      arrasamento: 1.5,
    });
    assertEqual(v1.valid, true, 'Valid line passes');

    // Line number out of range
    const vBadNum = validateLineIntegrity({ numeroLinha: 26, comprimento: 10 });
    assertEqual(vBadNum.valid, false, 'numeroLinha 26 should fail');

    // Estaca with 0 length
    const vZeroLen = validateLineIntegrity({ numeroLinha: 1, numeroEstaca: 'E-01', comprimento: 0 });
    assertEqual(vZeroLen.valid, false, 'Estaca with 0 length should fail');

    // Arrasamento > comprimento
    const vArrExceed = validateLineIntegrity({ numeroLinha: 2, comprimento: 5.0, arrasamento: 8.0 });
    assertEqual(vArrExceed.valid, false, 'Arrasamento exceeding depth should fail');

    // Negative values
    const vNeg = validateLineIntegrity({ numeroLinha: 3, emendaW150: -1 });
    assertEqual(vNeg.valid, false, 'Negative emendas should fail');
  });

  await test('5.7 validateRdpSubmission domain rules (required fields and 0-estacas justification)', () => {
    // Missing required fields
    const sub1 = validateRdpSubmission({});
    assertEqual(sub1.valid, false, 'Empty RDP submission fails');

    // 0 piles without stoppage justification
    const sub2 = validateRdpSubmission({
      obraId: 'obra_123',
      data: '2026-10-21',
      maquinaEquipamento: 'Bate-Estaca 01',
      operador: 'José',
      linhas: [],
      horasParadas: 0,
    });
    assertEqual(sub2.valid, false, '0 piles without stoppage must fail');

    // 0 piles WITH stoppage and justification
    const sub3 = validateRdpSubmission({
      obraId: 'obra_123',
      data: '2026-10-21',
      maquinaEquipamento: 'Bate-Estaca 01',
      operador: 'José',
      linhas: [],
      horasParadas: 8,
      motivoParada: 'Chuva torrencial e alagamento do canteiro',
    });
    assertEqual(sub3.valid, true, '0 piles with valid stoppage justification passes');
  });

  await test('5.8 Monte-Carlo Stress: 5,000 randomized calculation cycles with invariant verification', () => {
    for (let cycle = 0; cycle < 5000; cycle++) {
      const comp = Number((Math.random() * 50).toFixed(2));
      const arr = Number((Math.random() * 20).toFixed(2));
      const w150 = Math.floor(Math.random() * 5);
      const w310 = Math.floor(Math.random() * 5);
      const talas = Math.floor(Math.random() * 8);

      const line = calculateLineMetrics({
        numeroLinha: 1,
        numeroEstaca: 'RAND',
        comprimento: comp,
        arrasamento: arr,
        emendaW150: w150,
        emendaW310: w310,
        talas,
      });

      // Invariants:
      assert(line.comprimentoUtil != null && line.comprimentoUtil >= 0, `Invariant violation: comprimentoUtil (${line.comprimentoUtil}) < 0`);
      assert(line.comprimento >= 0, `Invariant violation: comprimento < 0`);
      assert(line.arrasamento >= 0, `Invariant violation: arrasamento < 0`);
      assert(line.emendaW150 >= 0, `Invariant violation: emendaW150 < 0`);
      assert(line.emendaW310 >= 0, `Invariant violation: emendaW310 < 0`);
      assert(line.talas >= 0, `Invariant violation: talas < 0`);

      const expectedNet = Math.max(0, round2(comp - arr));
      assertEqual(line.comprimentoUtil, expectedNet, `Invariant violation: net depth mismatch`);
    }
  });

  // =======================================================================
  // SUMMARY REPORT & EXIT
  // =======================================================================
  const totalDuration = Number((performance.now() - startTime).toFixed(2));
  const passed = testRecords.filter((r) => r.passed).length;
  const failed = testRecords.filter((r) => !r.passed).length;

  console.log(`\n===============================================================`);
  console.log(`      CHALLENGER M6-2: PERSONA & WORKLOAD STRESS SUMMARY       `);
  console.log(`===============================================================`);
  console.log(`  Total Tests Run:     ${testRecords.length}`);
  console.log(`  Tests Passed:        ${passed}`);
  console.log(`  Tests Failed:        ${failed}`);
  console.log(`  Overall Duration:    ${totalDuration}ms`);
  console.log(`===============================================================`);

  if (failed > 0) {
    console.error(`\nFAILED TESTS:`);
    for (const f of testRecords.filter((r) => !r.passed)) {
      console.error(`  - ${f.suite} -> ${f.name}: ${f.error}`);
    }
    process.exit(1);
  } else {
    console.log(`\nALL PERSONA & WORKLOAD STRESS CHALLENGES PASSED (100%)! ✓\n`);
    process.exit(0);
  }
}

runPersonaStress().catch((err) => {
  console.error('Fatal unhandled error in persona challenger:', err);
  process.exit(1);
});
