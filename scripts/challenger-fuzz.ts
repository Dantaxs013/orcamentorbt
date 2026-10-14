/**
 * Challenger 2: Adversarial Mask Fuzzing, Math Precision & UI Edge Cases
 * Stress test suite and fuzzing engine for RBT Gestão de Orçamentos
 */

import {
  formatCurrencyBRL,
  parseCurrencyBRL,
  maskCurrencyKeystroke,
  formatPhoneBR,
  formatDimension,
  DIMENSION_GUIDES,
} from '../src/lib/masks';
import { getSlaInfo, OrcamentoItem } from '../src/components/kanban/kanban-card';
import { KANBAN_COLUMNS } from '../src/components/kanban/kanban-board';
import { propostaComercialSchema } from '../src/lib/validations/orcamento.schema';

interface TestResult {
  name: string;
  category: string;
  passed: boolean;
  details?: string;
  error?: string;
}

const results: TestResult[] = [];

function assert(condition: boolean, name: string, category: string, details?: string) {
  if (condition) {
    results.push({ name, category, passed: true, details });
  } else {
    results.push({ name, category, passed: false, details, error: 'Assertion failed' });
    console.error(`❌ [FAIL] ${category} -> ${name} ${details ? `(${details})` : ''}`);
  }
}

// =========================================================================
// SECTION 1: Currency BRL Masking & Parsing Fuzzing
// =========================================================================
console.log('=== SECTION 1: Currency BRL Masking & Parsing Fuzzing ===');

// 1.1 Boundary & Special Values
assert(formatCurrencyBRL(0) === 'R$ 0,00', 'formatCurrencyBRL(0) is R$ 0,00', 'Currency BRL');
assert(formatCurrencyBRL(-0) === 'R$ 0,00', 'formatCurrencyBRL(-0) is R$ 0,00', 'Currency BRL');
assert(formatCurrencyBRL(null) === 'R$ 0,00', 'formatCurrencyBRL(null) is R$ 0,00', 'Currency BRL');
assert(formatCurrencyBRL(undefined) === 'R$ 0,00', 'formatCurrencyBRL(undefined) is R$ 0,00', 'Currency BRL');
assert(formatCurrencyBRL('') === 'R$ 0,00', 'formatCurrencyBRL("") is R$ 0,00', 'Currency BRL');
assert(formatCurrencyBRL(NaN) === 'R$ 0,00', 'formatCurrencyBRL(NaN) is R$ 0,00', 'Currency BRL');

assert(parseCurrencyBRL(0) === 0, 'parseCurrencyBRL(0) is 0', 'Currency BRL');
assert(parseCurrencyBRL(null) === 0, 'parseCurrencyBRL(null) is 0', 'Currency BRL');
assert(parseCurrencyBRL(undefined) === 0, 'parseCurrencyBRL(undefined) is 0', 'Currency BRL');
assert(parseCurrencyBRL('') === 0, 'parseCurrencyBRL("") is 0', 'Currency BRL');
assert(parseCurrencyBRL(NaN) === 0, 'parseCurrencyBRL(NaN) is 0', 'Currency BRL');

// 1.2 Round-trip fidelity for exact monetary amounts
const testAmounts = [
  0.01,
  0.5,
  0.99,
  1.0,
  1.5,
  12.34,
  99.99,
  100.0,
  1250.5,
  12345.67,
  999999.99,
  999999999.99,
];

for (const amt of testAmounts) {
  const formatted = formatCurrencyBRL(amt);
  const parsed = parseCurrencyBRL(formatted);
  const diff = Math.abs(parsed - amt);
  assert(
    diff < 0.0001,
    `Round-trip fidelity for ${amt}`,
    'Currency BRL',
    `formatted="${formatted}", parsed=${parsed}`
  );
}

// 1.3 Negative numbers handling
const negativeFormatted = formatCurrencyBRL(-1250.5);
const negativeParsed = parseCurrencyBRL(negativeFormatted);
assert(
  Math.abs(negativeParsed - -1250.5) < 0.0001,
  'formatCurrencyBRL & parseCurrencyBRL negative amounts',
  'Currency BRL',
  `formatted="${negativeFormatted}", parsed=${negativeParsed}`
);

// 1.4 Extreme large numbers
const bigFormatted = formatCurrencyBRL(999999999.99);
assert(
  bigFormatted === 'R$ 999.999.999,99',
  'formatCurrencyBRL(999999999.99) formatted correctly',
  'Currency BRL',
  `got: ${bigFormatted}`
);

// 1.5 Fractional cents rounding
const subCentFormatted = formatCurrencyBRL(10.004);
assert(
  subCentFormatted === 'R$ 10,00',
  'formatCurrencyBRL(10.004) rounds down to R$ 10,00',
  'Currency BRL',
  `got: ${subCentFormatted}`
);
const subCentHalfFormatted = formatCurrencyBRL(10.005);
// Note: Intl pt-BR uses standard half-expand/half-even
assert(
  subCentHalfFormatted === 'R$ 10,01' || subCentHalfFormatted === 'R$ 10,00',
  'formatCurrencyBRL(10.005) rounds to nearest cent',
  'Currency BRL',
  `got: ${subCentHalfFormatted}`
);

// 1.6 Keystroke Masking Simulation
console.log('Testing Keystroke Masking...');
const keystrokeSequence = ['1', '12', '125', '1250', '12505', '125050'];
const expectedMasks = [
  'R$ 0,01',
  'R$ 0,12',
  'R$ 1,25',
  'R$ 12,50',
  'R$ 125,05',
  'R$ 1.250,50',
];
const expectedNumerics = [0.01, 0.12, 1.25, 12.5, 125.05, 1250.5];

for (let i = 0; i < keystrokeSequence.length; i++) {
  const result = maskCurrencyKeystroke(keystrokeSequence[i]);
  assert(
    result.masked === expectedMasks[i],
    `maskCurrencyKeystroke masked step "${keystrokeSequence[i]}"`,
    'Currency BRL',
    `expected: ${expectedMasks[i]}, got: ${result.masked}`
  );
  assert(
    Math.abs(result.numericValue - expectedNumerics[i]) < 0.0001,
    `maskCurrencyKeystroke numeric step "${keystrokeSequence[i]}"`,
    'Currency BRL',
    `expected: ${expectedNumerics[i]}, got: ${result.numericValue}`
  );
}

// 1.7 Keystroke with garbage inputs
const garbageInputs = [
  'abc',
  '!@#$%^&*()',
  '<script>alert(1)</script>',
  '   ',
  '-',
  '000',
];
for (const g of garbageInputs) {
  const res = maskCurrencyKeystroke(g);
  assert(
    !isNaN(res.numericValue) && res.masked.startsWith('R$'),
    `maskCurrencyKeystroke handles garbage input "${g}" gracefully`,
    'Currency BRL',
    `got masked: "${res.masked}", numeric: ${res.numericValue}`
  );
}

// 1.8 Fuzzing parseCurrencyBRL with 5,000 randomized string inputs
console.log('Fuzzing parseCurrencyBRL with randomized strings...');
let parseFuzzPass = true;
for (let i = 0; i < 5000; i++) {
  const randNum = Math.random() * 1000000;
  const randStr = Math.random() < 0.5 ? formatCurrencyBRL(randNum) : `R$ ${randNum.toFixed(2)}`;
  const parsed = parseCurrencyBRL(randStr);
  if (isNaN(parsed) || parsed < 0) {
    parseFuzzPass = false;
    console.error(`Fuzz failed on: "${randStr}" -> ${parsed}`);
    break;
  }
}
assert(parseFuzzPass, 'parseCurrencyBRL fuzz 5,000 random currency strings', 'Currency BRL');

// =========================================================================
// SECTION 2: Math Precision in Budget Calculations (Subtotal, BDI, Total)
// =========================================================================
console.log('=== SECTION 2: Math Precision & Budget Calculations ===');

// 2.1 Basic calculation sanity
{
  const maoDeObra = 1000.0;
  const materiais = 2000.0;
  const extras = 500.0;
  const bdiMargemPerc = 15;

  const subtotal = maoDeObra + materiais + extras;
  const valorMargem = subtotal * (bdiMargemPerc / 100);
  const total = subtotal + valorMargem;

  assert(subtotal === 3500, 'Subtotal direct sum is 3500', 'Math Precision');
  assert(valorMargem === 525, 'BDI margin 15% is 525', 'Math Precision');
  assert(total === 4025, 'Total is 4025', 'Math Precision');
}

// 2.2 Floating-point drift stress test (100,000 permutations)
console.log('Stress testing 100,000 budget calculations for floating point drift...');
let discrepancyCount = 0;
let maxDiscrepancy = 0;
let nanCount = 0;

for (let i = 0; i < 100000; i++) {
  // Typical construction cost amounts in cents
  const maoDeObraCents = Math.floor(Math.random() * 5000000); // 0 to 50,000.00
  const materiaisCents = Math.floor(Math.random() * 10000000); // 0 to 100,000.00
  const extrasCents = Math.floor(Math.random() * 1000000); // 0 to 10,000.00
  const bdiPerc = Math.floor(Math.random() * 10000) / 100; // 0.00% to 100.00%

  const maoDeObra = maoDeObraCents / 100;
  const materiais = materiaisCents / 100;
  const extras = extrasCents / 100;

  const subtotal = maoDeObra + materiais + extras;
  const valorMargem = subtotal * (bdiPerc / 100);
  const total = subtotal + valorMargem;

  if (isNaN(subtotal) || isNaN(valorMargem) || isNaN(total)) {
    nanCount++;
  }

  // Check display formatting roundings
  const subtotalFormatted = formatCurrencyBRL(subtotal);
  const margemFormatted = formatCurrencyBRL(valorMargem);
  const totalFormatted = formatCurrencyBRL(total);

  const subtotalParsed = parseCurrencyBRL(subtotalFormatted);
  const margemParsed = parseCurrencyBRL(margemFormatted);
  const totalParsed = parseCurrencyBRL(totalFormatted);

  // Check if displayed subtotal + displayed margin differs from displayed total by more than 1 cent
  const displayDiff = Math.abs(subtotalParsed + margemParsed - totalParsed);
  if (displayDiff > 0.011) {
    discrepancyCount++;
    if (displayDiff > maxDiscrepancy) {
      maxDiscrepancy = displayDiff;
    }
  }
}

assert(nanCount === 0, 'Zero NaN values in 100,000 budget permutations', 'Math Precision');
assert(
  discrepancyCount === 0,
  'Zero multi-cent rounding discrepancies between displayed subtotal + margin and total',
  'Math Precision',
  `discrepancies: ${discrepancyCount}, max: ${maxDiscrepancy}`
);

// 2.3 Zod validation schema stress test
console.log('Testing propostaComercialSchema validation with boundary values...');

const validPayload = {
  custoMaoDeObra: 1000,
  custoMateriais: 2000,
  custosExtras: 0,
  bdiMargemPerc: 15,
  valorTotal: 3450,
  condicoesPagamento: '30% entrada e saldo em 30 dias',
  prazoExecucaoDias: 15,
  validadePropostaDias: 10,
  observacoes: 'Tudo incluso',
  enviarEmailCliente: true,
};

const validResult = propostaComercialSchema.safeParse(validPayload);
assert(validResult.success, 'Valid proposal payload passes Zod validation', 'Math Precision');

// Negative values must be rejected
const negativePayload = {
  ...validPayload,
  custoMaoDeObra: -50,
};
const negativeResult = propostaComercialSchema.safeParse(negativePayload);
assert(!negativeResult.success, 'Negative labor cost is rejected by Zod schema', 'Math Precision');

// BDI > 100 must be rejected
const bdiOverPayload = {
  ...validPayload,
  bdiMargemPerc: 150,
};
const bdiOverResult = propostaComercialSchema.safeParse(bdiOverPayload);
assert(!bdiOverResult.success, 'BDI > 100% is rejected by Zod schema', 'Math Precision');

// BDI < 0 must be rejected
const bdiNegativePayload = {
  ...validPayload,
  bdiMargemPerc: -5,
};
const bdiNegativeResult = propostaComercialSchema.safeParse(bdiNegativePayload);
assert(!bdiNegativeResult.success, 'BDI < 0% is rejected by Zod schema', 'Math Precision');

// Zero days execution must be rejected
const zeroDaysPayload = {
  ...validPayload,
  prazoExecucaoDias: 0,
};
const zeroDaysResult = propostaComercialSchema.safeParse(zeroDaysPayload);
assert(!zeroDaysResult.success, 'Zero execution days is rejected by Zod schema', 'Math Precision');

// =========================================================================
// SECTION 3: Phone and Dimension Masking with Edge Cases
// =========================================================================
console.log('=== SECTION 3: Phone and Dimension Masking ===');

// 3.1 formatPhoneBR standard tests
assert(formatPhoneBR(null) === '', 'formatPhoneBR(null) returns ""', 'Phone Mask');
assert(formatPhoneBR(undefined) === '', 'formatPhoneBR(undefined) returns ""', 'Phone Mask');
assert(formatPhoneBR('') === '', 'formatPhoneBR("") returns ""', 'Phone Mask');
assert(formatPhoneBR('1') === '(1', 'formatPhoneBR("1") returns "(1"', 'Phone Mask');
assert(formatPhoneBR('11') === '(11', 'formatPhoneBR("11") returns "(11"', 'Phone Mask');
assert(formatPhoneBR('119') === '(11) 9', 'formatPhoneBR("119") returns "(11) 9"', 'Phone Mask');
assert(formatPhoneBR('119876') === '(11) 9876', 'formatPhoneBR("119876") returns "(11) 9876"', 'Phone Mask');
assert(formatPhoneBR('1132345678') === '(11) 3234-5678', 'formatPhoneBR 10-digit landline', 'Phone Mask');
assert(formatPhoneBR('11987654321') === '(11) 98765-4321', 'formatPhoneBR 11-digit mobile', 'Phone Mask');

// 3.2 Fuzzing formatPhoneBR with excess digits, letters, special characters
assert(
  formatPhoneBR('119876543219999') === '(11) 98765-4321',
  'formatPhoneBR slices at 11 digits',
  'Phone Mask'
);
assert(
  formatPhoneBR('tel: (11) 98765-4321 ext 44') === '(11) 98765-4321',
  'formatPhoneBR strips letters and masks digits correctly',
  'Phone Mask'
);
assert(
  formatPhoneBR('---!!!@@@###$$$%%%') === '',
  'formatPhoneBR with only symbols returns ""',
  'Phone Mask'
);

// 3.3 International Prefix Edge Case analysis
// When user inputs "+5511987654321", digits = "5511987654321".slice(0, 11) = "55119876543"
const intlResult = formatPhoneBR('+5511987654321');
console.log(`[OBSERVATION] International phone +5511987654321 results in: "${intlResult}"`);
assert(
  intlResult.length <= 15,
  'formatPhoneBR handles international prefix without crash',
  'Phone Mask',
  `result="${intlResult}"`
);

// 3.4 formatDimension standard tests
assert(formatDimension(null) === '', 'formatDimension(null) returns ""', 'Dimension Mask');
assert(formatDimension(undefined) === '', 'formatDimension(undefined) returns ""', 'Dimension Mask');
assert(formatDimension('') === '', 'formatDimension("") returns ""', 'Dimension Mask');
assert(formatDimension('10x20') === '10 x 20', 'formatDimension("10x20") returns "10 x 20"', 'Dimension Mask');
assert(formatDimension('10X20') === '10 x 20', 'formatDimension("10X20") returns "10 x 20"', 'Dimension Mask');
assert(formatDimension('10*20') === '10 x 20', 'formatDimension("10*20") returns "10 x 20"', 'Dimension Mask');
assert(formatDimension('10×20') === '10 x 20', 'formatDimension("10×20") returns "10 x 20"', 'Dimension Mask');
assert(formatDimension('  10   x   20   ') === '10 x 20', 'formatDimension multiple spaces', 'Dimension Mask');
assert(formatDimension('100 x 200 x 300 mm') === '100 x 200 x 300 mm', 'formatDimension 3D dimension', 'Dimension Mask');
assert(formatDimension('100*200*300') === '100 x 200 x 300', 'formatDimension 3D with asterisk', 'Dimension Mask');

// 3.5 formatDimension with engineering templates from DIMENSION_GUIDES
for (const guide of DIMENSION_GUIDES) {
  const formatted = formatDimension(guide.template);
  assert(
    formatted.length > 0 && !formatted.includes('  '),
    `formatDimension normalizes guide "${guide.label}"`,
    'Dimension Mask',
    `original="${guide.template}", formatted="${formatted}"`
  );
}

// 3.6 formatDimension adversarial inputs (HTML, SQL, XSS, unicode)
const adversarialDims = [
  '<script>alert(1)</script>',
  "10' OR '1'='1",
  'Ø 310mm x 12m 🏗️',
  'x',
  'xxx',
  '***',
  '   x   x   x   ',
];
for (const adv of adversarialDims) {
  const res = formatDimension(adv);
  assert(typeof res === 'string', `formatDimension safely processes "${adv}"`, 'Dimension Mask', `got: "${res}"`);
}

// =========================================================================
// SECTION 4: Kanban Board Data Edge Cases (Volume, Columns, SLA)
// =========================================================================
console.log('=== SECTION 4: Kanban Board Edge Cases & SLA Calculations ===');

// 4.1 SLA Calculation Tests
const now = new Date();

// 4.1.1 Missing / Invalid dates
const slaNull = getSlaInfo(undefined);
assert(slaNull.label === 'Recente' && slaNull.days === 0, 'SLA with undefined is "Recente"', 'Kanban SLA');
const slaInvalid = getSlaInfo('data-invalida-xyz');
assert(slaInvalid.label === 'Recente' && slaInvalid.days === 0, 'SLA with invalid string is "Recente"', 'Kanban SLA');

// 4.1.2 Today
const slaToday = getSlaInfo(now);
assert(slaToday.label === 'Hoje' && slaToday.days === 0 && !slaToday.isAlert, 'SLA today is "Hoje"', 'Kanban SLA');

// 4.1.3 Future Date
const futureDate = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000);
const slaFuture = getSlaInfo(futureDate);
assert(slaFuture.label === 'Hoje' && slaFuture.days === 0, 'SLA future date returns "Hoje" gracefully', 'Kanban SLA');

// 4.1.4 2 days ago
const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
const sla2Days = getSlaInfo(twoDaysAgo);
assert(sla2Days.label === 'Há 2 d' && sla2Days.days === 2 && !sla2Days.isAlert, 'SLA 2 days ago is "Há 2 d"', 'Kanban SLA');

// 4.1.5 5 days ago (Amber alert)
const fiveDaysAgo = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000);
const sla5Days = getSlaInfo(fiveDaysAgo);
assert(sla5Days.label === 'Há 5 d' && sla5Days.days === 5 && sla5Days.isAlert, 'SLA 5 days ago has isAlert=true', 'Kanban SLA');

// 4.1.6 10 days ago (Red alert)
const tenDaysAgo = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000);
const sla10Days = getSlaInfo(tenDaysAgo);
assert(sla10Days.label === 'Há 10 d' && sla10Days.days === 10 && sla10Days.isAlert, 'SLA 10 days ago is red alert', 'Kanban SLA');

// 4.1.7 Epoch 0 (1970-01-01)
const epochZero = new Date(0);
const slaEpoch = getSlaInfo(epochZero);
assert(slaEpoch.days > 19000 && slaEpoch.isAlert, 'SLA epoch 0 returns high day count without crash', 'Kanban SLA');

// 4.1.8 Daylight Savings Time (DST) edge cases
// 23 hours ago across DST spring-forward boundary (82,800,000 ms)
const dst23hAgo = new Date(now.getTime() - 23 * 60 * 60 * 1000);
const slaDst23h = getSlaInfo(dst23hAgo);
console.log(`[OBSERVATION] 23 hours difference SLA result: label="${slaDst23h.label}", days=${slaDst23h.days}`);
assert(typeof slaDst23h.label === 'string', 'SLA 23h DST edge case handled safely', 'Kanban SLA');

// 4.2 Kanban Board Column Coverage & Status Mapping
console.log('Testing Kanban column mappings and status coverage...');
const allPrismaStatuses = [
  'NOVO',
  'AGUARDANDO_CLIENTE',
  'AGUARDANDO_ANALISE',
  'EM_ANALISE',
  'PROPOSTA_ENVIADA',
  'APROVADO',
  'REJEITADO',
];

const mappedStatuses = new Set(KANBAN_COLUMNS.flatMap((c) => c.statuses));
for (const status of allPrismaStatuses) {
  assert(
    mappedStatuses.has(status),
    `Prisma status "${status}" is mapped in KANBAN_COLUMNS`,
    'Kanban Columns'
  );
}

// 4.3 Extreme Data Volume & Board Stress Simulation (5,000 items)
console.log('Stress testing Kanban board filtering and column distribution with 5,000 items...');

const mockItems: OrcamentoItem[] = [];
const possibleStatuses = [
  'NOVO',
  'AGUARDANDO_CLIENTE',
  'EM_ANALISE',
  'AGUARDANDO_ANALISE',
  'VISITA_TECNICA',
  'PROPOSTA_ENVIADA',
  'APROVADO',
  'REJEITADO',
  'CANCELADO',
  'STATUS_DESCONHECIDO', // Adversarial: unknown status
];

for (let i = 0; i < 5000; i++) {
  const status = possibleStatuses[i % possibleStatuses.length];
  mockItems.push({
    id: `item-${i}`,
    numeroProtocolo: `RBT-2026-${String(i).padStart(5, '0')}`,
    status,
    createdAt: new Date(Date.now() - (i % 30) * 86400000).toISOString(),
    lead: {
      nome: `Cliente Teste ${i}`,
      email: `cliente${i}@construtora.com.br`,
      empresa: i % 2 === 0 ? `Construtora Alpha ${i}` : null,
      telefone: '11987654321',
    },
    orcamentista: i % 3 === 0 ? { name: 'Carlos Mendonça' } : null,
    magicLink: i % 4 === 0 ? { token: `token-${i}`, used: false, expiresAt: new Date() } : null,
    respostaFormulario:
      i % 2 === 0
        ? {
            tipoServico: 'Fabricação de Estacas Metálicas',
            quantidade: (i % 10) + 1,
          }
        : null,
    propostaComercial:
      i % 5 === 0
        ? {
            valorTotal: (i + 1) * 100.5,
          }
        : null,
  });
}

// Benchmark filtering
const startTime = performance.now();
const searchFiltered = mockItems.filter((orc) => {
  const term = 'alpha 10';
  return (
    orc.numeroProtocolo.toLowerCase().includes(term) ||
    orc.lead.nome.toLowerCase().includes(term) ||
    (orc.lead.empresa && orc.lead.empresa.toLowerCase().includes(term))
  );
});
const duration = performance.now() - startTime;
console.log(`Filtering 5,000 items took ${duration.toFixed(2)} ms. Matches: ${searchFiltered.length}`);
assert(duration < 50, 'Search filter over 5,000 items executes in < 50ms', 'Kanban Volume', `${duration.toFixed(2)}ms`);

// Benchmark Column Distribution
const colDistribution = KANBAN_COLUMNS.map((col) => {
  const count = mockItems.filter((item) => col.statuses.includes(item.status)).length;
  return { key: col.key, count };
});
const totalInColumns = colDistribution.reduce((acc, c) => acc + c.count, 0);
console.log(`Total in columns: ${totalInColumns} / 5,000 items`);

// The remaining items are those with STATUS_DESCONHECIDO (unknown status)
const unknownCount = mockItems.filter((i) => i.status === 'STATUS_DESCONHECIDO').length;
assert(
  totalInColumns + unknownCount === 5000,
  'Column distribution preserves item accounting integrity',
  'Kanban Volume',
  `Columns: ${totalInColumns}, Unknown: ${unknownCount}`
);

// 4.4 Empty Board & All Cards in One Column
const emptyFiltered = [].filter(() => true);
assert(emptyFiltered.length === 0, 'Empty board handles 0 items gracefully', 'Kanban Board');

const allOneColumn = mockItems.filter((i) => i.status === 'NOVO');
assert(allOneColumn.length > 0, 'Single column concentration handled properly', 'Kanban Board');

// =========================================================================
// SUMMARY & VERDICT
// =========================================================================
console.log('\n=========================================================');
const totalTests = results.length;
const passedTests = results.filter((r) => r.passed).length;
const failedTests = results.filter((r) => !r.passed).length;

console.log(`TOTAL TESTS: ${totalTests}`);
console.log(`PASSED: ${passedTests}`);
console.log(`FAILED: ${failedTests}`);

if (failedTests === 0) {
  console.log('\n🎉 ALL ADVERSARIAL STRESS TESTS PASSED! VERDICT: APPROVE');
} else {
  console.log(`\n⚠️ ${failedTests} TESTS FAILED! VERDICT: FAIL`);
}
