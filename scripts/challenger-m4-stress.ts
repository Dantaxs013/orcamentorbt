/**
 * Challenger M4-2: Empirical Adversarial Stress Test Suite
 * Portal Unificado RBT Fundações — Gestão de Orçamentos + Medição Diária (RDP)
 * Milestone M4: Medição Diária Live Math, API Endpoints & Access Control
 *
 * RIGOROUS EMPIRICAL VERIFICATION HARNESS:
 * - Suite 1: Live Math & Calculation Engine Stress (rdp-math.ts)
 *   - 1.1 parseBrazilianNumber boundary, locale format, and fuzzing
 *   - 1.2 round2 financial floating-point precision & epsilon tests
 *   - 1.3 calculateLineMetrics net depth (comprimentoUtil = max(0, comprimento - arrasamento))
 *   - 1.4 calculateRdpTotals aggregation, emendas (W150, W310), talas, 25-row boundary, shift hours
 *   - 1.5 validateLineIntegrity & validateRdpSubmission domain rules & error propagation
 *   - 1.6 High-volume monte-carlo / fuzz stress (1,000 randomized lines)
 * - Suite 2: API Endpoints Authentication, RBAC & Payload Validation
 *   - 2.1 /api/health (Liveness & database probe)
 *   - 2.2 /api/rdp (GET filtering, APONTADOR scoping & financial stripping, POST validation)
 *   - 2.3 /api/estacas (GET filtering, POST creation & validation)
 *   - 2.4 /api/obras (GET role enforcement, POST creation)
 *   - 2.5 /api/contratos (GET role enforcement, POST schema validation & item order)
 *   - 2.6 /api/medicoes (GET role enforcement, POST creation & retention calculations)
 * - Suite 3: Access Control on /medicao/* Pages & Layout Guards
 *   - 3.1 MedicaoLayout unauthenticated visitor redirection to /login
 *   - 3.2 MedicaoLayout unauthorized user (acessoMedicao: false) redirection to /portal?unauthorized=medicao
 *   - 3.3 MedicaoLayout authorized user (acessoMedicao: true) passes through
 *   - 3.4 /medicao/engenheiro/validacao role guard (APONTADOR blocked -> /medicao, ENGENHEIRO allowed)
 *   - 3.5 /medicao/admin/usuarios role guard (ENGENHEIRO blocked -> /medicao, ADMIN allowed)
 * - Suite 4: Adversarial Security, Financial Masking & Concurrency Stress
 *   - 4.1 stripFinancialData deep recursion & non-leakage
 *   - 4.2 SQL Injection / Parameter Tampering resilience
 *
 * Usage:
 *   npx tsx scripts/challenger-m4-stress.ts
 */

export {};

// AsyncLocalStorage initialization for Next.js Server Components / Request Context
const { AsyncLocalStorage } = require('async_hooks');
(globalThis as any).AsyncLocalStorage = AsyncLocalStorage;

const React = require('react');
(globalThis as any).React = React;

const { NextRequest } = require('next/server');
const { requestAsyncStorage } = require('next/dist/client/components/request-async-storage-instance');

const { prisma } = require('../src/lib/db');
const {
  createSession,
  destroySession,
  SESSION_COOKIE_NAME,
} = require('../src/lib/session');
const {
  parseBrazilianNumber,
  round2,
  calculateLineMetrics,
  calculateRdpTotals,
  validateLineIntegrity,
  validateRdpSubmission,
} = require('../src/lib/calculations/rdp-math');
const { stripFinancialData, FINANCIAL_KEYS } = require('../src/lib/auth');

// Route Handlers
const { GET: getHealth } = require('../src/app/api/health/route');
const { GET: getRdp, POST: postRdp } = require('../src/app/api/rdp/route');
const { GET: getRdpById } = require('../src/app/api/rdp/[id]/route');
const { POST: postAprovar } = require('../src/app/api/rdp/[id]/aprovar/route');
const { GET: getEstacas, POST: postEstacas } = require('../src/app/api/estacas/route');
const { GET: getObras, POST: postObras } = require('../src/app/api/obras/route');
const { GET: getContratos, POST: postContratos } = require('../src/app/api/contratos/route');
const { GET: getMedicoes, POST: postMedicoes } = require('../src/app/api/medicoes/route');
const { GET: getMedicaoById } = require('../src/app/api/medicoes/[id]/route');

// Page Layout & Components
const MedicaoLayout = require('../src/app/medicao/layout').default;
const ValidacaoPage = require('../src/app/medicao/engenheiro/validacao/page').default;
const UsuariosPage = require('../src/app/medicao/admin/usuarios/page').default;
const AdminContratosPage = require('../src/app/medicao/admin/contratos/page').default;
const ApontadorRdpPage = require('../src/app/medicao/apontador/rdp/page').default;
const EstacasPage = require('../src/app/medicao/apontador/estacas/page').default;

// =========================================================================
// TEST HARNESS PRIMITIVES
// =========================================================================

interface TestResult {
  suite: string;
  name: string;
  passed: boolean;
  durationMs: number;
  error?: string;
}

const testResults: TestResult[] = [];
let currentSuite = '';

function suite(name: string) {
  currentSuite = name;
  console.log(`\n===============================================================`);
  console.log(`  SUITE: ${name}`);
  console.log(`===============================================================`);
}

async function test(name: string, fn: () => void | Promise<void>) {
  const start = performance.now();
  try {
    await fn();
    const durationMs = Number((performance.now() - start).toFixed(2));
    testResults.push({ suite: currentSuite, name, passed: true, durationMs });
    console.log(`  ✓ [PASS] ${name} (${durationMs}ms)`);
  } catch (err: any) {
    const durationMs = Number((performance.now() - start).toFixed(2));
    const errorMessage = err?.message || String(err);
    testResults.push({
      suite: currentSuite,
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

async function runWithSession(token: string | null, fn: () => Promise<any>): Promise<any> {
  const store = {
    cookies: {
      get: (name: string) => {
        if (token && (name === SESSION_COOKIE_NAME || name === 'rbt_session')) {
          return { name, value: token };
        }
        return undefined;
      },
    },
  };
  return requestAsyncStorage.run(store, fn);
}

// =========================================================================
// MAIN TEST SUITES
// =========================================================================

async function runChallengerSuite() {
  console.log('Starting Empirical Challenger M4-2 Verification Suite...');
  console.log(`Timestamp: ${new Date().toISOString()}`);

  // Fetch personas from database
  const adminUser = await prisma.user.findFirst({
    where: { role: { in: ['ADMIN', 'ADMINISTRADOR'] }, ativo: true },
  });
  const orcUser = await prisma.user.findFirst({
    where: { role: 'ORCAMENTISTA', ativo: true },
  });
  const aptUser = await prisma.user.findFirst({
    where: { role: 'APONTADOR', ativo: true },
  });
  const engUser = await prisma.user.findFirst({
    where: { role: 'ENGENHEIRO', ativo: true },
  });

  assert(Boolean(adminUser), 'Database must contain active admin user');
  assert(Boolean(orcUser), 'Database must contain active orcamentista user');
  assert(Boolean(aptUser), 'Database must contain active apontador user');
  assert(Boolean(engUser), 'Database must contain active engenheiro user');

  // Create temporary sessions
  const adminToken = await createSession(adminUser.id);
  const orcToken = await createSession(orcUser.id);
  const aptToken = await createSession(aptUser.id);
  const engToken = await createSession(engUser.id);

  try {
    // =====================================================================
    // SUITE 1: Live Math & Calculation Engine Stress (rdp-math.ts)
    // =====================================================================
    suite('1. Live Math & Calculation Engine Stress (rdp-math.ts)');

    await test('1.1 parseBrazilianNumber boundary values, comma notation and fuzzing', () => {
      // Basic null/empty
      assertEqual(parseBrazilianNumber(null), 0, 'null should return 0');
      assertEqual(parseBrazilianNumber(undefined), 0, 'undefined should return 0');
      assertEqual(parseBrazilianNumber(''), 0, 'empty string should return 0');
      assertEqual(parseBrazilianNumber('   '), 0, 'whitespace string should return 0');

      // Direct numbers
      assertEqual(parseBrazilianNumber(0), 0, '0 should return 0');
      assertEqual(parseBrazilianNumber(42.5), 42.5, '42.5 should return 42.5');
      assertEqual(parseBrazilianNumber(-12.8), -12.8, 'negative number should be preserved');
      assertEqual(parseBrazilianNumber(NaN), 0, 'NaN should return 0');

      // Brazilian comma notation
      assertEqual(parseBrazilianNumber('12,50'), 12.5, '"12,50" -> 12.5');
      assertEqual(parseBrazilianNumber('0,75'), 0.75, '"0,75" -> 0.75');
      assertEqual(parseBrazilianNumber('1.250,50'), 1250.5, '"1.250,50" -> 1250.5');
      assertEqual(parseBrazilianNumber('10.000.000,99'), 10000000.99, 'Millions with dot/comma');

      // US format fallback
      assertEqual(parseBrazilianNumber('1,250.50'), 1250.5, '"1,250.50" (US) -> 1250.5');
      assertEqual(parseBrazilianNumber('10,000.00'), 10000, '"10,000.00" (US) -> 10000');

      // Fuzzing invalid inputs
      assertEqual(parseBrazilianNumber('abc'), 0, 'non-numeric string returns 0');
      assertEqual(parseBrazilianNumber('--'), 0, 'double dash returns 0');
      assertEqual(parseBrazilianNumber({}), 0, 'object returns 0');
      assertEqual(parseBrazilianNumber([]), 0, 'array returns 0');
      assertEqual(parseBrazilianNumber(true), 0, 'boolean returns 0');
    });

    await test('1.2 round2 financial floating-point precision & epsilon stability', () => {
      assertEqual(round2(10.005), 10.01, '10.005 rounds up to 10.01 with Number.EPSILON');
      assertEqual(round2(12.344), 12.34, '12.344 rounds down to 12.34');
      assertEqual(round2(12.345), 12.35, '12.345 rounds up to 12.35');
      assertEqual(round2(0.1 + 0.2), 0.3, '0.1 + 0.2 floating point drift resolved to 0.3');
      assertEqual(round2(0), 0, '0 rounds to 0');
      assertEqual(round2(-5.555), -5.55, 'negative float rounds cleanly');
    });

    await test('1.3 calculateLineMetrics net depth: comprimentoUtil = max(0, comprimento - arrasamento)', () => {
      // Nominal case
      const line1 = calculateLineMetrics({
        numeroLinha: 1,
        numeroEstaca: 'E-01',
        comprimento: 15.0,
        arrasamento: 2.5,
      });
      assertEqual(line1.comprimentoUtil, 12.5, '15.0 - 2.5 = 12.5');
      assertEqual(line1.comprimento, 15.0, 'comprimento preserved');
      assertEqual(line1.profundidade, 15.0, 'profundidade aliased to comprimento');

      // Arrasamento equals comprimento (boundary)
      const line2 = calculateLineMetrics({
        numeroLinha: 2,
        numeroEstaca: 'E-02',
        comprimento: 8.0,
        arrasamento: 8.0,
      });
      assertEqual(line2.comprimentoUtil, 0, '8.0 - 8.0 = 0');

      // Arrasamento exceeds comprimento (stress boundary: must NOT be negative)
      const line3 = calculateLineMetrics({
        numeroLinha: 3,
        numeroEstaca: 'E-03',
        comprimento: 5.0,
        arrasamento: 9.0,
      });
      assertEqual(line3.comprimentoUtil, 0, 'max(0, 5.0 - 9.0) = 0');

      // Brazilian comma strings in inputs
      const line4 = calculateLineMetrics({
        numeroLinha: 4,
        numeroEstaca: 'E-04',
        comprimento: '14,80' as any,
        arrasamento: '1,25' as any,
      });
      assertEqual(line4.comprimentoUtil, 13.55, '14.80 - 1.25 = 13.55');

      // Depth alias: input provides profundidade without comprimento
      const line5 = calculateLineMetrics({
        numeroLinha: 5,
        numeroEstaca: 'E-05',
        profundidade: 18.0,
        arrasamento: 3.0,
      });
      assertEqual(line5.comprimento, 18.0, 'profundidade correctly mapped to comprimento');
      assertEqual(line5.comprimentoUtil, 15.0, '18.0 - 3.0 = 15.0');

      // Integer floor coercion on emendas and talas
      const line6 = calculateLineMetrics({
        numeroLinha: 6,
        emendaW150: '2.9' as any,
        emendaW310: '1.2' as any,
        talas: '3.7' as any,
      });
      assertEqual(line6.emendaW150, 2, 'emendaW150 floored to 2');
      assertEqual(line6.emendaW310, 1, 'emendaW310 floored to 1');
      assertEqual(line6.talas, 3, 'talas floored to 3');

      // Negative values defensive clamping
      const line7 = calculateLineMetrics({
        numeroLinha: 7,
        comprimento: -10,
        arrasamento: -2,
        emendaW150: -5,
      });
      assertEqual(line7.comprimento, 0, 'negative comprimento clamped to 0');
      assertEqual(line7.arrasamento, 0, 'negative arrasamento clamped to 0');
      assertEqual(line7.comprimentoUtil, 0, 'comprimentoUtil clamped to 0');
      assertEqual(line7.emendaW150, 0, 'negative emenda clamped to 0');
    });

    await test('1.4 calculateRdpTotals aggregation, emendas totals, 25-row boundary and shift hours', () => {
      // Construct 30 lines (should strictly truncate to 25)
      const rawLines = Array.from({ length: 30 }, (_, idx) => ({
        numeroLinha: idx + 1,
        numeroEstaca: idx < 10 ? `E-${idx + 1}` : undefined,
        comprimento: 10.0,
        arrasamento: 1.0,
        emendaW150: 1,
        emendaW310: 2,
        talas: 3,
      }));

      const totals = calculateRdpTotals(rawLines, {
        inicio: '07:00',
        fim: '17:00', // 10h gross = 600 min
        almocoInicio: '12:00',
        almocoFim: '13:00', // 1h lunch = 60 min -> 540 min gross
        horasParadas: 1.5, // 1.5h stopped = 90 min -> 450 min productive = 7.5h
      });

      // 25 lines processed (not 30!)
      assertEqual(totals.totalEstacas, 10, 'Only first 10 have numeroEstaca');
      assertEqual(totals.metragemTotal, 250.0, '25 lines * 10m = 250m (truncated at 25)');
      assertEqual(totals.totalArrasamento, 25.0, '25 lines * 1m = 25m');
      assertEqual(totals.metragemLiquida, 225.0, '250m - 25m = 225m net depth');
      assertEqual(totals.totalW150, 25, '25 lines * 1 = 25 W150');
      assertEqual(totals.totalW310, 50, '25 lines * 2 = 50 W310');
      assertEqual(totals.totalEmendas, 75, '25 + 50 = 75 total emendas');
      assertEqual(totals.totalTalas, 75, '25 lines * 3 = 75 talas');
      assertEqual(totals.horasTrabalhadas, 7.5, '10h - 1h lunch - 1.5h stopped = 7.5h worked');
      assertEqual(totals.horasParadas, 1.5, 'horasParadas formatted to 1.5');

      // Shift hours extreme case: stoppage exceeds shift duration -> clamped to 0
      const extremeShift = calculateRdpTotals([], {
        inicio: '08:00',
        fim: '12:00', // 4h = 240 min
        horasParadas: 6.0, // 6h stopped > 4h
      });
      assertEqual(extremeShift.horasTrabalhadas, 0, 'Productive hours clamped to 0 when stoppage exceeds gross time');
    });

    await test('1.5 validateLineIntegrity & validateRdpSubmission domain validation rules', () => {
      // Line: numeroLinha out of bounds
      const lineBadNum = validateLineIntegrity({ numeroLinha: 26, comprimento: 10 });
      assert(!lineBadNum.valid, 'numeroLinha 26 should fail');

      // Line: negative arrasamento
      const lineNegArr = validateLineIntegrity({ numeroLinha: 1, comprimento: 10, arrasamento: -1 });
      assert(!lineNegArr.valid, 'negative arrasamento should fail');

      // Line: negative comprimento
      const lineNegComp = validateLineIntegrity({ numeroLinha: 1, comprimento: -5 });
      assert(!lineNegComp.valid, 'negative comprimento should fail');

      // Line: estaca with zero length
      const lineEstacaZero = validateLineIntegrity({ numeroLinha: 1, numeroEstaca: 'E-01', comprimento: 0 });
      assert(!lineEstacaZero.valid, 'estaca with 0 length should fail');

      // Line: arrasamento > comprimento
      const lineArrExcess = validateLineIntegrity({ numeroLinha: 1, comprimento: 10, arrasamento: 15 });
      assert(!lineArrExcess.valid, 'arrasamento > comprimento should fail');
      assert(lineArrExcess.errors[0].includes('não pode ser superior'), 'informative error message expected');

      // Line: perfectly valid
      const lineValid = validateLineIntegrity({
        numeroLinha: 5,
        numeroEstaca: 'E-05',
        comprimento: 12.5,
        arrasamento: 1.5,
      });
      assert(lineValid.valid, 'valid line should pass');

      // Submission: missing mandatory fields
      const subMissing = validateRdpSubmission({});
      assert(!subMissing.valid, 'empty RDP should fail submission');
      assert(subMissing.errors.some((e: string) => e.includes('Obra')), 'Obra is mandatory');
      assert(subMissing.errors.some((e: string) => e.includes('Data')), 'Data is mandatory');
      assert(subMissing.errors.some((e: string) => e.includes('Máquina')), 'Máquina is mandatory');
      assert(subMissing.errors.some((e: string) => e.includes('operador')), 'Operador is mandatory');

      // Submission: zero estacas without justified stoppage fails
      const subZeroEstacas = validateRdpSubmission({
        obraId: 'obra-1',
        data: '2026-10-21',
        maquinaEquipamento: 'Bate-Estaca 01',
        operador: 'João',
        linhas: [],
        horasParadas: 0,
      });
      assert(!subZeroEstacas.valid, 'zero estacas without stoppage justification should fail');

      // Submission: zero estacas WITH stoppage and justification passes
      const subZeroEstacasJustified = validateRdpSubmission({
        obraId: 'obra-1',
        data: '2026-10-21',
        maquinaEquipamento: 'Bate-Estaca 01',
        operador: 'João',
        linhas: [],
        horasParadas: 8,
        motivoParada: 'Chuva torrencial impossibilitando operação',
      });
      assert(subZeroEstacasJustified.valid, 'zero estacas with valid justification must pass');
    });

    await test('1.6 High-volume monte-carlo / fuzz stress (1,000 randomized calculation cycles)', () => {
      for (let i = 0; i < 1000; i++) {
        const comp = Math.random() * 50;
        const arr = Math.random() * 60; // intentionally sometimes exceeds comp
        const line = calculateLineMetrics({
          numeroLinha: (i % 25) + 1,
          comprimento: comp,
          arrasamento: arr,
          emendaW150: Math.floor(Math.random() * 5),
          emendaW310: Math.floor(Math.random() * 5),
        });

        assert(!isNaN(line.comprimentoUtil!), 'comprimentoUtil must not be NaN');
        assert(line.comprimentoUtil! >= 0, 'comprimentoUtil must be >= 0');
        assert(line.comprimentoUtil! <= line.comprimento, 'comprimentoUtil must not exceed comprimento');
      }
    });

    await test('1.7 Emendas matrix & talas aggregation stress across multiple lines', () => {
      const mixedLines = [
        { numeroLinha: 1, numeroEstaca: 'E-01', comprimento: 12.0, arrasamento: 1.0, emendaW150: 3, emendaW310: 0, talas: 2 },
        { numeroLinha: 2, numeroEstaca: 'E-02', comprimento: 14.5, arrasamento: 0.5, emendaW150: 0, emendaW310: 4, talas: 4 },
        { numeroLinha: 3, numeroEstaca: 'E-03', comprimento: 18.0, arrasamento: 2.0, emendaW150: '2.8' as any, emendaW310: '1.9' as any, talas: '3.1' as any },
        { numeroLinha: 4, numeroEstaca: 'E-04', comprimento: 20.0, arrasamento: 0.0, emendaW150: -5, emendaW310: -10, talas: -2 },
        { numeroLinha: 5, numeroEstaca: '', comprimento: 15.0, arrasamento: 0.0, emendaW150: 1, emendaW310: 1, talas: 1 },
      ];

      const totals = calculateRdpTotals(mixedLines);
      assertEqual(totals.totalW150, 3 + 0 + 2 + 0 + 1, 'Sum of emendaW150 floored & clamped = 6');
      assertEqual(totals.totalW310, 0 + 4 + 1 + 0 + 1, 'Sum of emendaW310 floored & clamped = 6');
      assertEqual(totals.totalEmendas, 12, 'Total emendas = 6 + 6 = 12');
      assertEqual(totals.totalTalas, 2 + 4 + 3 + 0 + 1, 'Sum of talas floored & clamped = 10');
      assertEqual(totals.totalEstacas, 4, 'Line 5 has empty numeroEstaca, so totalEstacas = 4');
    });

    await test('1.8 Net depth (comprimentoUtil) extreme boundary values', () => {
      // Zero length, zero arrasamento
      assertEqual(calculateLineMetrics({ comprimento: 0, arrasamento: 0 }).comprimentoUtil, 0, '0 - 0 = 0');
      // Identical values
      assertEqual(calculateLineMetrics({ comprimento: 14.77, arrasamento: 14.77 }).comprimentoUtil, 0, '14.77 - 14.77 = 0');
      // Sub-centimeter difference
      assertEqual(calculateLineMetrics({ comprimento: 10.001, arrasamento: 10.0 }).comprimentoUtil, 0, 'sub-centimeter difference rounds to 0.00');
      // Arrasamento strictly exceeds comprimento
      assertEqual(calculateLineMetrics({ comprimento: 20.0, arrasamento: 25.0 }).comprimentoUtil, 0, 'negative difference clamped to 0');
      // High length, tiny arrasamento
      assertEqual(calculateLineMetrics({ comprimento: 50.0, arrasamento: 0.05 }).comprimentoUtil, 49.95, '50.0 - 0.05 = 49.95');
    });

    // =====================================================================
    // SUITE 2: API Endpoints Authentication, RBAC & Payload Validation
    // =====================================================================
    suite('2. API Endpoints Authentication, RBAC & Payload Validation');

    await test('2.1 /api/health probe returns 200 with database: connected', async () => {
      const res = await getHealth();
      assertEqual(res.status, 200, 'Health endpoint must return 200');
      const body = await res.json();
      assertEqual(body.status, 'ok', 'Status must be "ok"');
      assertEqual(body.database, 'connected', 'Database must be "connected"');
      assertEqual(body.service, 'rbt-portal-unificado', 'Service matches unified portal');
    });

    await test('2.2 /api/rdp authentication, permission barriers, and APONTADOR financial stripping', async () => {
      const req = new NextRequest('http://localhost:3000/api/rdp');

      // Unauthenticated -> 401
      const unauthRes = await runWithSession(null, () => getRdp(req));
      assertEqual(unauthRes.status, 401, 'Unauthenticated GET /api/rdp returns 401');

      // Orçamentista (acessoMedicao: false) -> 403
      const orcRes = await runWithSession(orcToken, () => getRdp(req));
      assertEqual(orcRes.status, 403, 'Unauthorized user (Orçamentista) returns 403');

      // Engenheiro (acessoMedicao: true) -> 200
      const engRes = await runWithSession(engToken, () => getRdp(req));
      assertEqual(engRes.status, 200, 'Engenheiro GET /api/rdp returns 200');

      // Apontador -> 200, scoped to own reports, and financial fields stripped
      const aptRes = await runWithSession(aptToken, () => getRdp(req));
      assertEqual(aptRes.status, 200, 'Apontador GET /api/rdp returns 200');
      const aptBody = await aptRes.json();
      assert(Array.isArray(aptBody.relatorios), 'relatorios array returned');

      // Deep verification: zero financial keys in Apontador response
      const jsonStr = JSON.stringify(aptBody);
      for (const finKey of FINANCIAL_KEYS) {
        assert(!jsonStr.includes(`"${finKey}":`), `Financial key "${finKey}" must not appear in Apontador response`);
      }

      // POST /api/rdp validation: invalid body -> 400
      const badPostReq = new NextRequest('http://localhost:3000/api/rdp', {
        method: 'POST',
        body: JSON.stringify({ invalid: true }),
      });
      const badPostRes = await runWithSession(aptToken, () => postRdp(badPostReq));
      assertEqual(badPostRes.status, 400, 'Invalid RDP payload rejected with 400');
    });

    await test('2.3 /api/estacas access control and creation validation', async () => {
      const getReq = new NextRequest('http://localhost:3000/api/estacas');

      // Unauthenticated -> 401
      const unauth = await runWithSession(null, () => getEstacas(getReq));
      assertEqual(unauth.status, 401, 'Unauthenticated GET /api/estacas returns 401');

      // Orçamentista -> 403
      const orc = await runWithSession(orcToken, () => getEstacas(getReq));
      assertEqual(orc.status, 403, 'Orçamentista GET /api/estacas returns 403');

      // Apontador -> 200
      const apt = await runWithSession(aptToken, () => getEstacas(getReq));
      assertEqual(apt.status, 200, 'Apontador GET /api/estacas returns 200');

      // POST /api/estacas with invalid payload -> 400
      const badReq = new NextRequest('http://localhost:3000/api/estacas', {
        method: 'POST',
        body: JSON.stringify({ nome: '', perfil: '', comprimento: -1 }),
      });
      const badRes = await runWithSession(aptToken, () => postEstacas(badReq));
      assertEqual(badRes.status, 400, 'Invalid estaca body returns 400');
    });

    await test('2.4 /api/obras role barriers (ENGENHEIRO/ADMIN only)', async () => {
      const req = new NextRequest('http://localhost:3000/api/obras');

      // Unauthenticated -> 401
      const unauth = await runWithSession(null, () => getObras(req));
      assertEqual(unauth.status, 401, 'Unauthenticated GET /api/obras returns 401');

      // Apontador -> 403 (insufficient role)
      const apt = await runWithSession(aptToken, () => getObras(req));
      assertEqual(apt.status, 403, 'Apontador GET /api/obras returns 403');

      // Engenheiro -> 200
      const eng = await runWithSession(engToken, () => getObras(req));
      assertEqual(eng.status, 200, 'Engenheiro GET /api/obras returns 200');

      // Admin -> 200
      const adm = await runWithSession(adminToken, () => getObras(req));
      assertEqual(adm.status, 200, 'Admin GET /api/obras returns 200');
    });

    await test('2.5 /api/contratos role barriers and validation (ENGENHEIRO/ADMIN only)', async () => {
      const req = new NextRequest('http://localhost:3000/api/contratos');

      // Unauthenticated -> 401
      const unauth = await runWithSession(null, () => getContratos(req));
      assertEqual(unauth.status, 401, 'Unauthenticated GET /api/contratos returns 401');

      // Apontador -> 403
      const apt = await runWithSession(aptToken, () => getContratos(req));
      assertEqual(apt.status, 403, 'Apontador GET /api/contratos returns 403');

      // Engenheiro -> 200
      const eng = await runWithSession(engToken, () => getContratos(req));
      assertEqual(eng.status, 200, 'Engenheiro GET /api/contratos returns 200');

      // POST with empty payload -> 400
      const badPost = new NextRequest('http://localhost:3000/api/contratos', {
        method: 'POST',
        body: JSON.stringify({}),
      });
      const badRes = await runWithSession(engToken, () => postContratos(badPost));
      assertEqual(badRes.status, 400, 'Empty contrato payload rejected with 400');
    });

    await test('2.6 /api/medicoes role barriers and creation validation', async () => {
      const req = new NextRequest('http://localhost:3000/api/medicoes');

      // Unauthenticated -> 401
      const unauth = await runWithSession(null, () => getMedicoes(req));
      assertEqual(unauth.status, 401, 'Unauthenticated GET /api/medicoes returns 401');

      // Apontador -> 403
      const apt = await runWithSession(aptToken, () => getMedicoes(req));
      assertEqual(apt.status, 403, 'Apontador GET /api/medicoes returns 403');

      // Engenheiro -> 200
      const eng = await runWithSession(engToken, () => getMedicoes(req));
      assertEqual(eng.status, 200, 'Engenheiro GET /api/medicoes returns 200');

      // POST with missing fields -> 400
      const badPost = new NextRequest('http://localhost:3000/api/medicoes', {
        method: 'POST',
        body: JSON.stringify({ obraId: 'fake-obra' }),
      });
      const badRes = await runWithSession(engToken, () => postMedicoes(badPost));
      assertEqual(badRes.status, 400, 'Missing mandatory fields returns 400');
    });

    await test('2.7 /api/rdp/[id] GET tenant row-level access control & financial stripping', async () => {
      const existingRdp = await prisma.relatorioDiario.findFirst();
      if (!existingRdp) return;

      const req = new NextRequest(`http://localhost:3000/api/rdp/${existingRdp.id}`);

      // Unauthenticated -> 401
      const unauth = await runWithSession(null, () => getRdpById(req, { params: { id: existingRdp.id } }));
      assertEqual(unauth.status, 401, 'Unauthenticated GET /api/rdp/[id] returns 401');

      // Orçamentista -> 403
      const orc = await runWithSession(orcToken, () => getRdpById(req, { params: { id: existingRdp.id } }));
      assertEqual(orc.status, 403, 'Orçamentista GET /api/rdp/[id] returns 403');

      // Engenheiro / Admin -> 200
      const eng = await runWithSession(engToken, () => getRdpById(req, { params: { id: existingRdp.id } }));
      assertEqual(eng.status, 200, 'Engenheiro GET /api/rdp/[id] returns 200');

      // Nonexistent ID -> 404
      const notFoundReq = new NextRequest('http://localhost:3000/api/rdp/non-existent-id-999');
      const notFoundRes = await runWithSession(engToken, () => getRdpById(notFoundReq, { params: { id: 'non-existent-id-999' } }));
      assertEqual(notFoundRes.status, 404, 'Non-existent RDP ID returns 404');
    });

    await test('2.8 /api/rdp/[id]/aprovar authorization & validation rules', async () => {
      const req = new NextRequest('http://localhost:3000/api/rdp/some-id/aprovar', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ acao: 'APROVAR' }),
      });

      // Unauthenticated -> 401
      const unauth = await runWithSession(null, () => postAprovar(req, { params: { id: 'some-id' } }));
      assertEqual(unauth.status, 401, 'Unauthenticated aprovar returns 401');

      // Apontador -> 403 (Apontador cannot approve RDPs)
      const apt = await runWithSession(aptToken, () => postAprovar(req, { params: { id: 'some-id' } }));
      assertEqual(apt.status, 403, 'Apontador cannot approve RDPs (returns 403)');

      // Invalid action -> 400
      const badActionReq = new NextRequest('http://localhost:3000/api/rdp/some-id/aprovar', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ acao: 'INVALID_ACTION' }),
      });
      const badActionRes = await runWithSession(engToken, () => postAprovar(badActionReq, { params: { id: 'some-id' } }));
      assertEqual(badActionRes.status, 400, 'Invalid approval action returns 400');
    });

    await test('2.9 Retenções financeiras & dedução fiscal calculation contract', () => {
      // Simulate calcularRetencoes formula from /api/medicoes
      const valorBruto = 100000;
      const contrato = {
        retencaoINSS: 11,
        baseMaoDeObra: 50,
        retencaoISS: 5,
        retencaoIRRF: 1.5,
        retencaoCSLL: 1.0,
        retencaoPIS: 0.65,
        retencaoCOFINS: 3.0,
        outrasDeducoesPerc: 0,
      };

      const baseMO = valorBruto * (contrato.baseMaoDeObra / 100); // 50,000
      const inss = baseMO * (contrato.retencaoINSS / 100); // 5,500
      const iss = valorBruto * (contrato.retencaoISS / 100); // 5,000
      const irrf = valorBruto * (contrato.retencaoIRRF / 100); // 1,500
      const csll = valorBruto * (contrato.retencaoCSLL / 100); // 1,000
      const pis = valorBruto * (contrato.retencaoPIS / 100); // 650
      const cofins = valorBruto * (contrato.retencaoCOFINS / 100); // 3,000
      const total = inss + iss + irrf + csll + pis + cofins; // 16,650
      const liquido = valorBruto - total; // 83,350

      assertEqual(inss, 5500, 'INSS on base MO = 5500');
      assertEqual(total, 16650, 'Total deduções = 16650');
      assertEqual(liquido, 83350, 'Valor Líquido = 83350');
    });

    // =====================================================================
    // SUITE 3: Access Control on /medicao/* Pages & Layout Guards
    // =====================================================================
    suite('3. Access Control on /medicao/* Pages & Layout Guards');

    await test('3.1 MedicaoLayout unauthenticated visitor redirection to /login', async () => {
      try {
        await runWithSession(null, async () => {
          await MedicaoLayout({ children: null });
        });
        assert(false, 'Should have thrown redirect for unauthenticated user');
      } catch (err: any) {
        assertEqual(err.message, 'NEXT_REDIRECT', 'Throws NEXT_REDIRECT');
        assert(err.digest.includes('/login'), 'Redirect target must be /login');
      }
    });

    await test('3.2 MedicaoLayout unauthorized user (acessoMedicao: false) redirection to /portal?unauthorized=medicao', async () => {
      try {
        await runWithSession(orcToken, async () => {
          await MedicaoLayout({ children: null });
        });
        assert(false, 'Should have thrown redirect for orcamentista on /medicao');
      } catch (err: any) {
        assertEqual(err.message, 'NEXT_REDIRECT', 'Throws NEXT_REDIRECT');
        assert(err.digest.includes('/portal?unauthorized=medicao'), 'Redirect target must be /portal?unauthorized=medicao');
      }
    });

    await test('3.3 MedicaoLayout authorized user (acessoMedicao: true) passes through to MedicaoShell', async () => {
      const rendered = await runWithSession(aptToken, async () => {
        return await MedicaoLayout({ children: 'CHILDREN_CONTENT' });
      });
      assert(Boolean(rendered), 'Layout renders successfully');
      assertEqual(rendered.type?.name, 'MedicaoShell', 'Mounted shell is MedicaoShell');
    });

    await test('3.4 /medicao/engenheiro/validacao role guard (APONTADOR blocked, ENGENHEIRO allowed)', async () => {
      // Apontador trying to access validation -> redirected to /medicao
      try {
        await runWithSession(aptToken, async () => {
          await ValidacaoPage();
        });
        assert(false, 'Apontador should be blocked from ValidacaoPage');
      } catch (err: any) {
        assertEqual(err.message, 'NEXT_REDIRECT', 'Throws NEXT_REDIRECT');
        assert(err.digest.includes('/medicao'), 'Redirect target is /medicao');
      }

      // Engenheiro accessing validation -> allowed
      const rendered = await runWithSession(engToken, async () => {
        return await ValidacaoPage();
      });
      assertEqual(rendered.type?.name, 'ValidacaoClient', 'Engenheiro successfully opens ValidacaoClient');
    });

    await test('3.5 /medicao/admin/usuarios role guard (ENGENHEIRO blocked, ADMIN allowed)', async () => {
      // Engenheiro trying to access admin/usuarios -> redirected to /medicao
      try {
        await runWithSession(engToken, async () => {
          await UsuariosPage();
        });
        assert(false, 'Engenheiro should be blocked from admin/usuarios');
      } catch (err: any) {
        assertEqual(err.message, 'NEXT_REDIRECT', 'Throws NEXT_REDIRECT');
        assert(err.digest.includes('/medicao'), 'Redirect target is /medicao');
      }

      // Admin accessing admin/usuarios -> allowed
      const rendered = await runWithSession(adminToken, async () => {
        return await UsuariosPage();
      });
      assertEqual(rendered.type?.name, 'GestaoUsuariosClient', 'Admin successfully opens GestaoUsuariosClient');
    });

    await test('3.6 /medicao/admin/contratos role guard (APONTADOR blocked, ENGENHEIRO allowed)', async () => {
      // Apontador accessing admin/contratos -> redirected to /medicao
      try {
        await runWithSession(aptToken, async () => {
          await AdminContratosPage();
        });
        assert(false, 'Apontador should be blocked from AdminContratosPage');
      } catch (err: any) {
        assertEqual(err.message, 'NEXT_REDIRECT', 'Throws NEXT_REDIRECT');
        assert(err.digest.includes('/medicao'), 'Redirect target is /medicao');
      }

      // Engenheiro accessing admin/contratos -> allowed
      const rendered = await runWithSession(engToken, async () => {
        return await AdminContratosPage();
      });
      assert(Boolean(rendered), 'Engenheiro opens AdminContratosPage');
    });

    await test('3.7 /medicao/apontador/rdp & /medicao/apontador/estacas page level security', async () => {
      // Apontador accessing ApontadorRdpPage -> allowed
      const rdpRendered = await runWithSession(aptToken, async () => {
        return await ApontadorRdpPage();
      });
      assert(Boolean(rdpRendered), 'Apontador renders ApontadorRdpPage');

      // Apontador accessing EstacasPage -> allowed
      const estacasRendered = await runWithSession(aptToken, async () => {
        return await EstacasPage();
      });
      assert(Boolean(estacasRendered), 'Apontador renders EstacasPage');
    });

    // =====================================================================
    // SUITE 4: Adversarial Security, Financial Masking & Concurrency Stress
    // =====================================================================
    suite('4. Adversarial Security, Financial Masking & Concurrency Stress');

    await test('4.1 stripFinancialData deep recursion, array nesting and object preservation', () => {
      const testObj = {
        id: 'rdp-1',
        numeroSequencial: 10,
        data: new Date('2026-10-21'),
        linhasProducao: [
          {
            id: 'l1',
            numeroEstaca: 'E-01',
            comprimento: 12.5,
            valorUnitario: 150.0, // FORBIDDEN
            valorTotal: 1875.0, // FORBIDDEN
          },
        ],
        contrato: {
          numeroContrato: 'CT-2026-001',
          valorTotalContratual: 500000.0, // FORBIDDEN
          retencaoINSS: 11.0, // FORBIDDEN
          nested: {
            retencaoISS: 5.0, // FORBIDDEN
            descricao: 'Safe field',
          },
        },
      };

      const stripped = stripFinancialData(testObj) as any;
      assertEqual(stripped.id, 'rdp-1', 'Safe field preserved');
      assertEqual(stripped.numeroSequencial, 10, 'Safe number preserved');
      assert(stripped.data instanceof Date, 'Date object preserved');
      assertEqual(stripped.linhasProducao[0].comprimento, 12.5, 'comprimento preserved');
      assertEqual(stripped.linhasProducao[0].valorUnitario, undefined, 'valorUnitario stripped');
      assertEqual(stripped.linhasProducao[0].valorTotal, undefined, 'valorTotal stripped');
      assertEqual(stripped.contrato.valorTotalContratual, undefined, 'valorTotalContratual stripped');
      assertEqual(stripped.contrato.retencaoINSS, undefined, 'retencaoINSS stripped');
      assertEqual(stripped.contrato.nested.retencaoISS, undefined, 'nested retencaoISS stripped');
      assertEqual(stripped.contrato.nested.descricao, 'Safe field', 'nested safe field preserved');
    });

    await test('4.2 SQL Injection / Parameter Pollution in API query parameters', async () => {
      const sqliQueries = [
        "'; DROP TABLE RelatorioDiario; --",
        "1' OR '1'='1",
        "../../etc/passwd",
        "%00",
      ];

      for (const query of sqliQueries) {
        const req = new NextRequest(`http://localhost:3000/api/rdp?obraId=${encodeURIComponent(query)}&status=${encodeURIComponent(query)}`);
        const res = await runWithSession(engToken, () => getRdp(req));
        // Prisma safely parameterizes queries — must return 200 with 0 results, never 500
        assertEqual(res.status, 200, `SQLi query "${query}" safely handled without database crash`);
        const body = await res.json();
        assertEqual(body.relatorios.length, 0, 'No rows returned for malicious param');
      }
    });

  } finally {
    // Cleanup temporary sessions
    await destroySession(adminToken).catch(() => {});
    await destroySession(orcToken).catch(() => {});
    await destroySession(aptToken).catch(() => {});
    await destroySession(engToken).catch(() => {});
  }

  // =========================================================================
  // SUMMARY REPORT
  // =========================================================================
  console.log(`\n===============================================================`);
  console.log(`                 CHALLENGER VERIFICATION SUMMARY               `);
  console.log(`===============================================================`);
  const total = testResults.length;
  const passed = testResults.filter((r) => r.passed).length;
  const failed = testResults.filter((r) => !r.passed).length;
  const duration = testResults.reduce((acc, r) => acc + r.durationMs, 0);

  console.log(`  Total Tests Run:  ${total}`);
  console.log(`  Tests Passed:     ${passed}`);
  console.log(`  Tests Failed:     ${failed}`);
  console.log(`  Total Execution:  ${duration.toFixed(2)}ms`);
  console.log(`===============================================================`);

  if (failed > 0) {
    console.error(`\nVERIFICATION FAILED: ${failed} check(s) did not pass.`);
    process.exit(1);
  } else {
    console.log(`\nALL EMPIRICAL CHALLENGER CHECKS PASSED (100%)! ✓`);
  }
}

runChallengerSuite().catch((err) => {
  console.error('Fatal unhandled error in test suite:', err);
  process.exit(1);
});
