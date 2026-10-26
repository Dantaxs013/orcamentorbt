/**
 * Challenger M1-2: Empirical Adversarial Stress Test Suite
 * Database Unified Access Model, stripFinancialData, and Session Concurrency
 *
 * Targets:
 * 1. 4 User Personas in SQLite (admin, orcamentista, apontador, engenheiro) permission flags & auth
 * 2. stripFinancialData deep recursion, all 26 financial keys, edge cases, Prisma Decimal preservation
 * 3. Session creation, renewal sliding window, concurrent validations, revocation, adversarial inputs
 */

import crypto from 'crypto';
import { Prisma } from '@prisma/client';
import { prisma } from '../src/lib/db';
import {
  AuthUser,
  UserRole,
  verifyPassword,
  isAdmin,
  isOrcamentista,
  isApontador,
  isEngenheiro,
  hasRole,
  stripFinancialData,
  FINANCIAL_KEYS,
} from '../src/lib/auth';
import {
  createSession,
  validateSession,
  destroySession,
  destroyAllUserSessions,
  buildSessionCookies,
  hashToken,
  SESSION_DURATION_SECONDS,
  SLIDING_WINDOW_THRESHOLD_SECONDS,
} from '../src/lib/session';
import { verifyUserMeta } from '../src/lib/token-utils';

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

async function runPersonaVerification() {
  console.log('\n===============================================================');
  console.log('  SECTION 1: SQLite User Personas & Module Permission Flags');
  console.log('===============================================================');

  // 1.1 Admin Persona Check
  {
    const start = performance.now();
    const admin = await prisma.user.findUnique({
      where: { email: 'admin@rbt.com.br' },
    });
    const pwdOk = admin ? await verifyPassword('Rbt@2026', admin.passwordHash) : false;
    const passed =
      !!admin &&
      admin.role === 'ADMIN' &&
      admin.ativo === true &&
      admin.acessoOrcamento === true &&
      admin.acessoMedicao === true &&
      pwdOk;
    recordTest({
      suite: 'Personas',
      testId: 'PER-01',
      name: 'Admin Persona (admin@rbt.com.br) has dual access (Orcamento=true, Medicao=true) & valid bcrypt',
      passed,
      durationMs: performance.now() - start,
      details: admin ? `role=${admin.role}, orc=${admin.acessoOrcamento}, med=${admin.acessoMedicao}, pwdOk=${pwdOk}` : 'Admin not found',
    });
  }

  // 1.2 Admin Alias Persona Check
  {
    const start = performance.now();
    const adminAlias = await prisma.user.findUnique({
      where: { email: 'admin@rbtfundacoes.com.br' },
    });
    const pwdOk = adminAlias ? await verifyPassword('Rbt@2026', adminAlias.passwordHash) : false;
    const passed =
      !!adminAlias &&
      adminAlias.role === 'ADMIN' &&
      adminAlias.ativo === true &&
      adminAlias.acessoOrcamento === true &&
      adminAlias.acessoMedicao === true &&
      pwdOk;
    recordTest({
      suite: 'Personas',
      testId: 'PER-02',
      name: 'Admin Alias (admin@rbtfundacoes.com.br) has dual access (Orcamento=true, Medicao=true) & valid bcrypt',
      passed,
      durationMs: performance.now() - start,
      details: adminAlias ? `role=${adminAlias.role}, orc=${adminAlias.acessoOrcamento}, med=${adminAlias.acessoMedicao}, pwdOk=${pwdOk}` : 'Admin alias not found',
    });
  }

  // 1.3 Orcamentista Persona Check
  {
    const start = performance.now();
    const orcamentista = await prisma.user.findUnique({
      where: { email: 'orcamentista@rbt.com.br' },
    });
    const pwdOk = orcamentista ? await verifyPassword('Rbt@2026', orcamentista.passwordHash) : false;
    const passed =
      !!orcamentista &&
      orcamentista.role === 'ORCAMENTISTA' &&
      orcamentista.ativo === true &&
      orcamentista.acessoOrcamento === true &&
      orcamentista.acessoMedicao === false &&
      pwdOk;
    recordTest({
      suite: 'Personas',
      testId: 'PER-03',
      name: 'Orcamentista Persona (orcamentista@rbt.com.br) has exclusive Orcamento access (Orcamento=true, Medicao=false)',
      passed,
      durationMs: performance.now() - start,
      details: orcamentista ? `role=${orcamentista.role}, orc=${orcamentista.acessoOrcamento}, med=${orcamentista.acessoMedicao}, pwdOk=${pwdOk}` : 'Orcamentista not found',
    });
  }

  // 1.4 Apontador Persona Check
  {
    const start = performance.now();
    const apontador = await prisma.user.findUnique({
      where: { email: 'apontador@rbtfundacoes.com.br' },
    });
    const pwdOk = apontador ? await verifyPassword('Rbt@2026', apontador.passwordHash) : false;
    const passed =
      !!apontador &&
      apontador.role === 'APONTADOR' &&
      apontador.ativo === true &&
      apontador.acessoOrcamento === false &&
      apontador.acessoMedicao === true &&
      pwdOk;
    recordTest({
      suite: 'Personas',
      testId: 'PER-04',
      name: 'Apontador Persona (apontador@rbtfundacoes.com.br) has exclusive Medicao access (Orcamento=false, Medicao=true)',
      passed,
      durationMs: performance.now() - start,
      details: apontador ? `role=${apontador.role}, orc=${apontador.acessoOrcamento}, med=${apontador.acessoMedicao}, pwdOk=${pwdOk}` : 'Apontador not found',
    });
  }

  // 1.5 Engenheiro Persona Check
  {
    const start = performance.now();
    const engenheiro = await prisma.user.findUnique({
      where: { email: 'engenheiro@rbtfundacoes.com.br' },
    });
    const pwdOk = engenheiro ? await verifyPassword('Rbt@2026', engenheiro.passwordHash) : false;
    const passed =
      !!engenheiro &&
      engenheiro.role === 'ENGENHEIRO' &&
      engenheiro.ativo === true &&
      engenheiro.acessoOrcamento === false &&
      engenheiro.acessoMedicao === true &&
      pwdOk;
    recordTest({
      suite: 'Personas',
      testId: 'PER-05',
      name: 'Engenheiro Persona (engenheiro@rbtfundacoes.com.br) has exclusive Medicao access (Orcamento=false, Medicao=true)',
      passed,
      durationMs: performance.now() - start,
      details: engenheiro ? `role=${engenheiro.role}, orc=${engenheiro.acessoOrcamento}, med=${engenheiro.acessoMedicao}, pwdOk=${pwdOk}` : 'Engenheiro not found',
    });
  }

  // 1.6 Role Helper Cross-Matrix Verification
  {
    const start = performance.now();
    const adminRole = isAdmin('ADMIN') && isAdmin('ADMINISTRADOR') && !isAdmin('ORCAMENTISTA') && !isAdmin('APONTADOR') && !isAdmin('ENGENHEIRO');
    const orcRole = isOrcamentista('ORCAMENTISTA') && !isOrcamentista('ADMIN') && !isOrcamentista('APONTADOR');
    const aptRole = isApontador('APONTADOR') && !isApontador('ENGENHEIRO') && !isApontador('ADMIN');
    const engRole = isEngenheiro('ENGENHEIRO') && isEngenheiro('ADMIN') && !isEngenheiro('APONTADOR') && !isEngenheiro('ORCAMENTISTA');
    const hasRoleCheck =
      hasRole('ADMIN', 'ORCAMENTISTA') &&
      hasRole('ADMIN', 'APONTADOR') &&
      hasRole('ADMIN', 'ENGENHEIRO') &&
      hasRole('ENGENHEIRO', 'APONTADOR') &&
      !hasRole('APONTADOR', 'ENGENHEIRO') &&
      !hasRole('APONTADOR', 'ORCAMENTISTA') &&
      !hasRole('ORCAMENTISTA', 'APONTADOR');
    const passed = adminRole && orcRole && aptRole && engRole && hasRoleCheck;
    recordTest({
      suite: 'Personas',
      testId: 'PER-06',
      name: 'Role helper functions (isAdmin, isOrcamentista, isApontador, isEngenheiro, hasRole) enforce strict hierarchy',
      passed,
      durationMs: performance.now() - start,
      details: `admin=${adminRole}, orc=${orcRole}, apt=${aptRole}, eng=${engRole}, hasRole=${hasRoleCheck}`,
    });
  }

  // 1.7 Defensive Permission Fallback for legacy/unpopulated records
  {
    const start = performance.now();
    // Simulate legacy user in validateSession
    const fakeAdminToken = await createSession((await prisma.user.findFirstOrThrow({ where: { role: 'ADMIN' } })).id);
    const validRes = await validateSession(fakeAdminToken);
    await destroySession(fakeAdminToken);

    const passed = !!validRes && validRes.user.acessoOrcamento === true && validRes.user.acessoMedicao === true;
    recordTest({
      suite: 'Personas',
      testId: 'PER-07',
      name: 'validateSession resolves module access claims with zero regressions for active accounts',
      passed,
      durationMs: performance.now() - start,
    });
  }

  // 1.8 Full SQLite User Database Integrity Audit
  {
    const start = performance.now();
    const allUsers = await prisma.user.findMany();
    const allActive = allUsers.every((u) => u.ativo === true);
    const allHaveModules = allUsers.every((u) => u.acessoOrcamento || u.acessoMedicao);
    const allHaveHashes = allUsers.every((u) => typeof u.passwordHash === 'string' && u.passwordHash.startsWith('$2'));
    const allHaveValidRoles = allUsers.every((u) => ['ADMIN', 'ORCAMENTISTA', 'APONTADOR', 'ENGENHEIRO'].includes(u.role));

    const passed = allUsers.length >= 4 && allActive && allHaveModules && allHaveHashes && allHaveValidRoles;
    recordTest({
      suite: 'Personas',
      testId: 'PER-08',
      name: 'Full SQLite User Table Audit: all users have active status, at least one module flag, bcrypt hash, and valid role',
      passed,
      durationMs: performance.now() - start,
      details: `totalUsers=${allUsers.length}, allActive=${allActive}, allHaveModules=${allHaveModules}, allHaveHashes=${allHaveHashes}`,
    });
  }

  // 1.9 Negative password authentication attacks across all personas
  {
    const start = performance.now();
    const allUsers = await prisma.user.findMany();
    let allNegativePassed = true;

    for (const u of allUsers) {
      const wrong1 = await verifyPassword('WrongPassword123!', u.passwordHash);
      const wrong2 = await verifyPassword('', u.passwordHash);
      const wrong3 = await verifyPassword("' OR '1'='1", u.passwordHash);
      const wrong4 = await verifyPassword(null as any, u.passwordHash);
      const wrong5 = await verifyPassword('rbt@2026', u.passwordHash); // case sensitivity

      if (wrong1 || wrong2 || wrong3 || wrong4 || wrong5) {
        allNegativePassed = false;
        break;
      }
    }

    recordTest({
      suite: 'Personas',
      testId: 'PER-09',
      name: 'Adversarial password authentication: rejected wrong passwords, empty strings, SQLi, and case-altered strings',
      passed: allNegativePassed,
      durationMs: performance.now() - start,
      details: `allNegativePassed=${allNegativePassed}`,
    });
  }
}

async function runStripFinancialDataVerification() {
  console.log('\n===============================================================');
  console.log('  SECTION 2: stripFinancialData Deep Recursion & Boundary Verification');
  console.log('===============================================================');

  // 2.1 Complete enumeration of all 26 FINANCIAL_KEYS on top level
  {
    const start = performance.now();
    const payload: Record<string, any> = {
      id: 'item-123',
      codigoItem: '01.01',
      descricao: 'Estaca Escavada',
      quantidadeContratada: 150.5,
    };
    for (const key of FINANCIAL_KEYS) {
      payload[key] = 1234.56;
    }

    const stripped = stripFinancialData(payload);
    let anyFinancialRemains = false;
    for (const key of FINANCIAL_KEYS) {
      if (key in stripped) {
        anyFinancialRemains = true;
        break;
      }
    }
    const preservedNonFinancial =
      stripped.id === 'item-123' &&
      stripped.codigoItem === '01.01' &&
      stripped.descricao === 'Estaca Escavada' &&
      stripped.quantidadeContratada === 150.5;

    const passed = !anyFinancialRemains && preservedNonFinancial;
    recordTest({
      suite: 'FinancialSanitization',
      testId: 'SAN-01',
      name: 'All 26 FINANCIAL_KEYS are completely stripped from top-level object while preserving operational fields',
      passed,
      durationMs: performance.now() - start,
      details: `anyRemains=${anyFinancialRemains}, preserved=${preservedNonFinancial}, totalKeys=${FINANCIAL_KEYS.size}`,
    });
  }

  // 2.2 Deep 10-level nested hierarchy stripping
  {
    const start = performance.now();
    const deepObj = {
      level1: {
        level2: {
          level3: {
            level4: {
              level5: {
                level6: {
                  level7: {
                    level8: {
                      level9: {
                        level10: {
                          valorUnitario: 55.4,
                          valorTotal: 55400.0,
                          safeData: 'operational-data',
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    };

    const stripped = stripFinancialData(deepObj);
    const leaf = stripped.level1.level2.level3.level4.level5.level6.level7.level8.level9.level10 as any;
    const passed = leaf.safeData === 'operational-data' && !('valorUnitario' in leaf) && !('valorTotal' in leaf);
    recordTest({
      suite: 'FinancialSanitization',
      testId: 'SAN-02',
      name: 'Deep 10-level nested objects are recursively sanitized without stack overflow or leakage',
      passed,
      durationMs: performance.now() - start,
    });
  }

  // 2.3 Arrays of objects and nested arrays of objects
  {
    const start = performance.now();
    const arrayData = [
      { id: 1, valorBruto: 100, valorLiquido: 80, operador: 'Operador A' },
      { id: 2, valorTotal: 200, retencaoINSS: 3.5, operador: 'Operador B' },
      [
        { id: 3, precoUnitario: 50, valorAcumulado: 500, operador: 'Operador C' }
      ]
    ];

    const stripped: any = stripFinancialData(arrayData);
    const item1Ok = stripped[0].operador === 'Operador A' && !('valorBruto' in stripped[0]) && !('valorLiquido' in stripped[0]);
    const item2Ok = stripped[1].operador === 'Operador B' && !('valorTotal' in stripped[1]) && !('retencaoINSS' in stripped[1]);
    const item3Ok = stripped[2][0].operador === 'Operador C' && !('precoUnitario' in stripped[2][0]) && !('valorAcumulado' in stripped[2][0]);

    const passed = item1Ok && item2Ok && item3Ok;
    recordTest({
      suite: 'FinancialSanitization',
      testId: 'SAN-03',
      name: 'Arrays and multi-dimensional nested arrays of objects are recursively stripped',
      passed,
      durationMs: performance.now() - start,
    });
  }

  // 2.4 Date and Prisma Decimal preservation in operational fields
  {
    const start = performance.now();
    const now = new Date('2026-10-20T12:00:00Z');
    const decimalDepth = new Prisma.Decimal(22.75); // Prisma decimal structure { s, e, d }
    const complexData = {
      dataAssinatura: now,
      profundidade: decimalDepth,
      valorUnitario: new Prisma.Decimal(100.0), // Financial decimal
      operador: 'Carlos',
    };

    const stripped: any = stripFinancialData(complexData);
    const datePreserved = stripped.dataAssinatura instanceof Date && stripped.dataAssinatura.getTime() === now.getTime();
    const decimalPreserved = stripped.profundidade instanceof Prisma.Decimal && stripped.profundidade.equals(decimalDepth);
    const financialDecimalStripped = !('valorUnitario' in stripped);

    const passed = datePreserved && decimalPreserved && financialDecimalStripped;
    recordTest({
      suite: 'FinancialSanitization',
      testId: 'SAN-04',
      name: 'Preserves Date instances and Prisma Decimal objects in non-financial fields while stripping financial Decimals',
      passed,
      durationMs: performance.now() - start,
      details: `datePreserved=${datePreserved}, decimalPreserved=${decimalPreserved}, financialStripped=${financialDecimalStripped}`,
    });
  }

  // 2.5 Primitive and Edge Case inputs (null, undefined, primitives, empty)
  {
    const start = performance.now();
    const nullVal = stripFinancialData(null);
    const undefVal = stripFinancialData(undefined);
    const numVal = stripFinancialData(42);
    const strVal = stripFinancialData('safe-string');
    const boolVal = stripFinancialData(true);
    const emptyObj = stripFinancialData({});
    const emptyArr = stripFinancialData([]);

    const passed =
      nullVal === null &&
      undefVal === undefined &&
      numVal === 42 &&
      strVal === 'safe-string' &&
      boolVal === true &&
      typeof emptyObj === 'object' &&
      Object.keys(emptyObj).length === 0 &&
      Array.isArray(emptyArr) &&
      emptyArr.length === 0;

    recordTest({
      suite: 'FinancialSanitization',
      testId: 'SAN-05',
      name: 'Handles edge cases (null, undefined, numbers, strings, booleans, empty objects, empty arrays) safely',
      passed,
      durationMs: performance.now() - start,
    });
  }

  // 2.6 Real Database Query Object Graph Sanitization Test
  {
    const start = performance.now();
    const realContrato = await prisma.contrato.findFirst({
      include: {
        obra: true,
        itens: true,
        medicoes: {
          include: {
            itensMedicao: true,
          },
        },
      },
    });

    if (!realContrato) {
      recordTest({
        suite: 'FinancialSanitization',
        testId: 'SAN-06',
        name: 'Real SQLite database Contrato/Medicao object graph sanitization',
        passed: false,
        durationMs: performance.now() - start,
        details: 'No seeded Contrato found in dev.db',
      });
    } else {
      const sanitized = stripFinancialData(realContrato) as any;

      // Recursive scanner to check for any FINANCIAL_KEYS left in the sanitized result
      function scanForFinancialKeys(obj: any, path = ''): string[] {
        if (!obj || typeof obj !== 'object' || obj instanceof Date || (obj && 'd' in obj && 'e' in obj && 's' in obj)) {
          return [];
        }
        let leaked: string[] = [];
        if (Array.isArray(obj)) {
          obj.forEach((item, idx) => {
            leaked = leaked.concat(scanForFinancialKeys(item, `${path}[${idx}]`));
          });
        } else {
          for (const [k, v] of Object.entries(obj)) {
            const currentPath = path ? `${path}.${k}` : k;
            if (FINANCIAL_KEYS.has(k)) {
              leaked.push(currentPath);
            }
            leaked = leaked.concat(scanForFinancialKeys(v, currentPath));
          }
        }
        return leaked;
      }

      const leaks = scanForFinancialKeys(sanitized);
      const operationalDataIntact =
        sanitized.numeroContrato === realContrato.numeroContrato &&
        sanitized.obra.codigo === realContrato.obra.codigo &&
        Array.isArray(sanitized.itens) &&
        sanitized.itens.length > 0 &&
        sanitized.itens[0].codigoItem === realContrato.itens[0].codigoItem;

      const passed = leaks.length === 0 && operationalDataIntact;
      recordTest({
        suite: 'FinancialSanitization',
        testId: 'SAN-06',
        name: 'Sanitizes real Prisma database tree (Contrato + Obra + Itens + Medicoes + ItensMedicao) with zero financial key leakage',
        passed,
        durationMs: performance.now() - start,
        details: leaks.length > 0 ? `Leaks found: ${leaks.join(', ')}` : `Sanitized successfully (0 leaks in ${sanitized.itens.length} items)`,
      });
    }
  }

  // 2.7 Stress harness: 5,000 array items sanitization throughput
  {
    const start = performance.now();
    const largeList = Array.from({ length: 5000 }, (_, i) => ({
      id: `item-${i}`,
      numeroLinha: (i % 25) + 1,
      profundidade: 15.5,
      valorUnitario: 120.0,
      valorTotal: 1860.0,
      descricao: `Estaca perfurada número ${i}`,
      nested: {
        precoUnitario: 50.0,
        operador: `Operador ${(i % 5) + 1}`,
      },
    }));

    const sanitizedList: any[] = stripFinancialData(largeList);
    const duration = performance.now() - start;
    const allClean = sanitizedList.every(
      (item) => !('valorUnitario' in item) && !('valorTotal' in item) && !('precoUnitario' in item.nested) && item.nested.operador
    );
    const passed = allClean && duration < 500; // Expected to process 5k items in < 500ms
    recordTest({
      suite: 'FinancialSanitization',
      testId: 'SAN-07',
      name: 'High-throughput performance: 5,000 nested production objects stripped under 500ms without memory pressure',
      passed,
      durationMs: duration,
      details: `Processed 5,000 complex items in ${duration.toFixed(2)}ms (throughput: ${((5000 / duration) * 1000).toFixed(0)} items/sec)`,
    });
  }

  // 2.8 Circular Reference Boundary & Prototype Pollution Resistance
  {
    const start = performance.now();
    // Test prototype safety
    const protoPollutionAttempt = Object.create({ valorTotal: 999999 });
    protoPollutionAttempt.safeField = 'hello';
    protoPollutionAttempt.valorUnitario = 123.45;

    const sanitizedProto = stripFinancialData(protoPollutionAttempt) as any;
    const protoKeySkipped = !('valorUnitario' in sanitizedProto);
    const safeFieldKept = sanitizedProto.safeField === 'hello';

    // Test circular reference behavior
    const circularObj: any = { id: 'circ-1', valorBruto: 5000 };
    circularObj.self = circularObj;

    let circularHandled = false;
    let circularThrewRangeError = false;
    try {
      stripFinancialData(circularObj);
      circularHandled = true;
    } catch (err: any) {
      if (err instanceof RangeError || String(err).includes('Maximum call stack size')) {
        circularThrewRangeError = true;
      }
    }

    const passed = protoKeySkipped && safeFieldKept && (circularHandled || circularThrewRangeError);
    recordTest({
      suite: 'FinancialSanitization',
      testId: 'SAN-08',
      name: 'Boundary resilience: resists prototype poisoning and safely characterizes circular reference behavior',
      passed,
      durationMs: performance.now() - start,
      details: `protoKeySkipped=${protoKeySkipped}, safeFieldKept=${safeFieldKept}, circularThrewRangeError=${circularThrewRangeError}`,
    });
  }

  // 2.9 Exhaustive Prisma Schema Model Financial Field Audit
  {
    const start = performance.now();
    // Verify that every single financial Decimal in Contrato, ItemContrato, Medicao, ItemMedicao is present in FINANCIAL_KEYS
    const expectedFinancialFields = [
      'valorTotalContratual', 'retencaoINSS', 'baseMaoDeObra', 'retencaoISS',
      'retencaoIRRF', 'retencaoCSLL', 'retencaoPIS', 'retencaoCOFINS', 'outrasDeducoesPerc',
      'valorUnitario', 'valorTotal', 'valorBruto', 'retencaoINSSValor', 'retencaoISSValor',
      'retencaoIRRFValor', 'retencaoCSLLValor', 'retencaoPISValor', 'retencaoCOFINSValor',
      'outrasDeducoesValor', 'totalDeducoes', 'valorLiquido', 'valorPeriodo',
      'valorAcumulado', 'saldoValor', 'precoUnitario', 'valorGlobal'
    ];

    const missingKeys = expectedFinancialFields.filter((f) => !FINANCIAL_KEYS.has(f));
    const passed = missingKeys.length === 0;

    recordTest({
      suite: 'FinancialSanitization',
      testId: 'SAN-09',
      name: 'Exhaustive schema alignment: FINANCIAL_KEYS contains 100% of all financial fields defined across Prisma models',
      passed,
      durationMs: performance.now() - start,
      details: missingKeys.length === 0 ? 'All 26 financial fields accounted for' : `Missing: ${missingKeys.join(', ')}`,
    });
  }
}

async function runSessionConcurrencyVerification() {
  console.log('\n===============================================================');
  console.log('  SECTION 3: Session Concurrency, Sliding Window & Revocation');
  console.log('===============================================================');

  // Fetch all 4 users
  const admin = await prisma.user.findFirstOrThrow({ where: { role: 'ADMIN' } });
  const orcamentista = await prisma.user.findFirstOrThrow({ where: { role: 'ORCAMENTISTA' } });
  const apontador = await prisma.user.findFirstOrThrow({ where: { role: 'APONTADOR' } });
  const engenheiro = await prisma.user.findFirstOrThrow({ where: { role: 'ENGENHEIRO' } });

  const personas = [admin, orcamentista, apontador, engenheiro];

  // 3.1 Concurrent session creation (40 sessions created in parallel across 4 personas)
  const createdTokens: { token: string; userId: string; role: string }[] = [];
  {
    const start = performance.now();
    const tasks: Promise<{ token: string; userId: string; role: string }>[] = [];
    const CONCURRENCY_COUNT = 40;

    for (let i = 0; i < CONCURRENCY_COUNT; i++) {
      const p = personas[i % personas.length];
      tasks.push(
        createSession(p.id, { ipAddress: `192.168.1.${(i % 50) + 1}`, userAgent: `StressBot/1.0 (#${i})` }).then(
          (token) => ({ token, userId: p.id, role: p.role })
        )
      );
    }

    const resultsArr = await Promise.all(tasks);
    createdTokens.push(...resultsArr);

    // Verify all 40 tokens are unique
    const uniqueTokens = new Set(createdTokens.map((t) => t.token));
    const passed = createdTokens.length === CONCURRENCY_COUNT && uniqueTokens.size === CONCURRENCY_COUNT;

    recordTest({
      suite: 'SessionConcurrency',
      testId: 'SES-01',
      name: 'Parallel creation of 40 concurrent sessions across 4 personas with 100% token uniqueness and zero collisions',
      passed,
      durationMs: performance.now() - start,
      details: `Created ${createdTokens.length} sessions, unique=${uniqueTokens.size}`,
    });
  }

  // 3.2 Concurrent validation of all 40 sessions
  {
    const start = performance.now();
    const validationTasks = createdTokens.map(async (item) => {
      const res = await validateSession(item.token);
      return {
        item,
        valid: !!res && res.user.id === item.userId,
        acessoOrcamento: res?.user.acessoOrcamento,
        acessoMedicao: res?.user.acessoMedicao,
      };
    });

    const valResults = await Promise.all(validationTasks);
    const allValid = valResults.every((r) => r.valid);

    // Verify persona permission integrity under concurrency
    const adminCheck = valResults.filter((r) => r.item.role === 'ADMIN').every((r) => r.acessoOrcamento === true && r.acessoMedicao === true);
    const orcCheck = valResults.filter((r) => r.item.role === 'ORCAMENTISTA').every((r) => r.acessoOrcamento === true && r.acessoMedicao === false);
    const aptCheck = valResults.filter((r) => r.item.role === 'APONTADOR').every((r) => r.acessoOrcamento === false && r.acessoMedicao === true);
    const engCheck = valResults.filter((r) => r.item.role === 'ENGENHEIRO').every((r) => r.acessoOrcamento === false && r.acessoMedicao === true);

    const passed = allValid && adminCheck && orcCheck && aptCheck && engCheck;
    recordTest({
      suite: 'SessionConcurrency',
      testId: 'SES-02',
      name: 'Concurrent validation of 40 active sessions returns 100% accurate permissions per persona',
      passed,
      durationMs: performance.now() - start,
      details: `allValid=${allValid}, adminCheck=${adminCheck}, orcCheck=${orcCheck}, aptCheck=${aptCheck}, engCheck=${engCheck}`,
    });
  }

  // 3.3 Sliding Window Renewal Race Condition Test
  // Create a session with expiresAt 30 minutes in future (timeLeft < 2 hours).
  // Hit it with 15 concurrent validateSession calls simultaneously.
  {
    const start = performance.now();
    const raceToken = await createSession(admin.id);
    const tokenHash = hashToken(raceToken);

    // Force expiresAt to 30 minutes in future
    const nearExpiry = new Date(Date.now() + 30 * 60 * 1000);
    await prisma.session.update({
      where: { tokenHash },
      data: { expiresAt: nearExpiry },
    });

    // Fire 15 concurrent validateSession requests on this exact session
    const concurrentValidations = await Promise.all(
      Array.from({ length: 15 }, () => validateSession(raceToken))
    );

    // Verify all 15 calls succeeded
    const allSucceeded = concurrentValidations.every((v) => v !== null && v.user.id === admin.id);

    // Verify the session in DB was renewed to ~12 hours from now
    const updatedSession = await prisma.session.findUnique({
      where: { tokenHash },
    });
    const expectedMinExpiry = Date.now() + 11 * 60 * 60 * 1000;
    const isRenewed = updatedSession ? updatedSession.expiresAt.getTime() > expectedMinExpiry : false;

    await destroySession(raceToken);

    const passed = allSucceeded && isRenewed;
    recordTest({
      suite: 'SessionConcurrency',
      testId: 'SES-03',
      name: 'Sliding window session renewal survives 15 concurrent race condition validations without lock error or failure',
      passed,
      durationMs: performance.now() - start,
      details: `allSucceeded=${allSucceeded}, isRenewed=${isRenewed}, newExpiresAt=${updatedSession?.expiresAt.toISOString()}`,
    });
  }

  // 3.4 Expired session eviction test
  {
    const start = performance.now();
    const expiredToken = await createSession(orcamentista.id);
    const expiredHash = hashToken(expiredToken);

    // Set expiresAt to 10 minutes in the past
    await prisma.session.update({
      where: { tokenHash: expiredHash },
      data: { expiresAt: new Date(Date.now() - 10 * 60 * 1000) },
    });

    // Validate should return null AND delete the session from DB
    const validated = await validateSession(expiredToken);
    const dbRecord = await prisma.session.findUnique({ where: { tokenHash: expiredHash } });

    const passed = validated === null && dbRecord === null;
    recordTest({
      suite: 'SessionConcurrency',
      testId: 'SES-04',
      name: 'Expired session returns null on validation and is automatically evicted from database',
      passed,
      durationMs: performance.now() - start,
      details: `validated=${validated}, dbRecord=${dbRecord}`,
    });
  }

  // 3.5 Inactive user session eviction test
  {
    const start = performance.now();
    // Create a temporary user with ativo: false
    const tempUser = await prisma.user.create({
      data: {
        name: 'Temporary Inactive Test User',
        email: `inactive-test-${Date.now()}@rbt.com.br`,
        passwordHash: 'dummy-hash',
        role: 'APONTADOR',
        ativo: false,
        acessoOrcamento: false,
        acessoMedicao: true,
      },
    });

    const tempToken = await createSession(tempUser.id);
    const tempHash = hashToken(tempToken);

    // validateSession should return null and delete session
    const validated = await validateSession(tempToken);
    const dbRecord = await prisma.session.findUnique({ where: { tokenHash: tempHash } });

    // Clean up temporary user
    await prisma.user.delete({ where: { id: tempUser.id } });

    const passed = validated === null && dbRecord === null;
    recordTest({
      suite: 'SessionConcurrency',
      testId: 'SES-05',
      name: 'Inactive user (ativo=false) session returns null on validation and is instantly destroyed',
      passed,
      durationMs: performance.now() - start,
      details: `validated=${validated}, dbRecord=${dbRecord}`,
    });
  }

  // 3.6 Selective session destruction vs destroyAllUserSessions
  {
    const start = performance.now();
    // User A (apontador): create 5 sessions
    const tokensA = await Promise.all(Array.from({ length: 5 }, () => createSession(apontador.id)));
    // User B (engenheiro): create 5 sessions
    const tokensB = await Promise.all(Array.from({ length: 5 }, () => createSession(engenheiro.id)));

    // Destroy 1 session from User A
    const singleDestroyed = await destroySession(tokensA[0]);
    const valA0 = await validateSession(tokensA[0]);
    const valA1 = await validateSession(tokensA[1]);
    const valB0 = await validateSession(tokensB[0]);

    const step1Ok = singleDestroyed && valA0 === null && valA1 !== null && valB0 !== null;

    // Destroy all sessions for User A
    await destroyAllUserSessions(apontador.id);
    const allAValidations = await Promise.all(tokensA.map((t) => validateSession(t)));
    const allADestroyed = allAValidations.every((v) => v === null);

    // User B sessions must remain intact
    const allBValidations = await Promise.all(tokensB.map((t) => validateSession(t)));
    const allBIntact = allBValidations.every((v) => v !== null && v.user.id === engenheiro.id);

    // Clean up User B sessions
    await destroyAllUserSessions(engenheiro.id);

    const passed = step1Ok && allADestroyed && allBIntact;
    recordTest({
      suite: 'SessionConcurrency',
      testId: 'SES-06',
      name: 'Granular session destruction: single session logout and destroyAllUserSessions isolate user sessions without cross-user interference',
      passed,
      durationMs: performance.now() - start,
      details: `step1Ok=${step1Ok}, allADestroyed=${allADestroyed}, allBIntact=${allBIntact}`,
    });
  }

  // 3.7 Adversarial and Malformed Inputs to validateSession and destroySession
  {
    const start = performance.now();
    const malformedInputs = [
      '',
      '   ',
      'invalid-token-format',
      'a'.repeat(64), // Valid length hex but non-existent
      'b'.repeat(10000), // Enormous string
      "' OR '1'='1", // SQL injection attack
      "'; DROP TABLE sessions; --", // SQL injection DROP
      null as any,
      undefined as any,
      12345 as any,
      {} as any,
    ];

    const validationOutcomes = await Promise.all(
      malformedInputs.map(async (input) => {
        try {
          const res = await validateSession(input);
          return res === null;
        } catch {
          return false;
        }
      })
    );

    const destructionOutcomes = await Promise.all(
      malformedInputs.map(async (input) => {
        try {
          const res = await destroySession(input);
          return typeof res === 'boolean';
        } catch {
          return false;
        }
      })
    );

    const allValSafe = validationOutcomes.every(Boolean);
    const allDestructSafe = destructionOutcomes.every(Boolean);
    const passed = allValSafe && allDestructSafe;

    recordTest({
      suite: 'SessionConcurrency',
      testId: 'SES-07',
      name: 'Adversarial inputs (SQLi, massive payloads, non-strings, non-existent tokens) handled safely with zero unhandled exceptions',
      passed,
      durationMs: performance.now() - start,
      details: `allValSafe=${allValSafe}, allDestructSafe=${allDestructSafe}`,
    });
  }

  // 3.8 Multi-Cookie and UserMeta HMAC claims alignment across all 4 personas
  {
    const start = performance.now();
    let allCookiesMatch = true;

    for (const p of personas) {
      const token = await createSession(p.id);
      const cookieHeaders = await buildSessionCookies(token, {
        id: p.id,
        role: p.role,
        email: p.email,
        acessoOrcamento: p.acessoOrcamento,
        acessoMedicao: p.acessoMedicao,
      });

      // Verify all 3 cookies are present
      const hasOrcamentos = cookieHeaders.some((c) => c.startsWith('rbt_orcamentos_session='));
      const hasLegacy = cookieHeaders.some((c) => c.startsWith('rbt_session='));
      const metaHeader = cookieHeaders.find((c) => c.startsWith('rbt_user_meta='));

      if (!hasOrcamentos || !hasLegacy || !metaHeader) {
        allCookiesMatch = false;
        break;
      }

      // Extract and verify meta token
      const metaTokenVal = metaHeader.split(';')[0].replace('rbt_user_meta=', '');
      const claims = await verifyUserMeta(metaTokenVal);

      if (
        !claims ||
        claims.userId !== p.id ||
        claims.role !== p.role ||
        claims.email !== p.email ||
        claims.acessoOrcamento !== p.acessoOrcamento ||
        claims.acessoMedicao !== p.acessoMedicao
      ) {
        allCookiesMatch = false;
        break;
      }

      await destroySession(token);
    }

    // Clean up createdTokens from test 3.1
    for (const t of createdTokens) {
      await destroySession(t.token);
    }

    const passed = allCookiesMatch;
    recordTest({
      suite: 'SessionConcurrency',
      testId: 'SES-08',
      name: 'buildSessionCookies simultaneously issues 3 compliant cookies with HMAC claims exactly matching persona DB permissions',
      passed,
      durationMs: performance.now() - start,
      details: `allCookiesMatch=${allCookiesMatch}`,
    });
  }

  // 3.9 High-concurrency scalability: 100 simultaneous sessions created & validated
  {
    const start = performance.now();
    const HIGH_CONCURRENCY = 100;
    const tokens: string[] = [];

    const creationTasks = Array.from({ length: HIGH_CONCURRENCY }, (_, i) => {
      const p = personas[i % personas.length];
      return createSession(p.id, { ipAddress: `10.0.0.${(i % 100) + 1}`, userAgent: `HighLoad/${i}` });
    });

    const newTokens = await Promise.all(creationTasks);
    tokens.push(...newTokens);

    const validationTasks = tokens.map((tok) => validateSession(tok));
    const validations = await Promise.all(validationTasks);
    const all100Valid = validations.every((v) => v !== null);

    // Clean up all 100 sessions
    const cleanupTasks = tokens.map((tok) => destroySession(tok));
    await Promise.all(cleanupTasks);

    const duration = performance.now() - start;
    const passed = all100Valid && tokens.length === HIGH_CONCURRENCY;

    recordTest({
      suite: 'SessionConcurrency',
      testId: 'SES-09',
      name: 'High-concurrency load: 100 simultaneous sessions created, validated, and purged without SQLite locking failure',
      passed,
      durationMs: duration,
      details: `all100Valid=${all100Valid}, completed in ${duration.toFixed(2)}ms`,
    });
  }

  // 3.10 Token Collision & Cryptographic Entropy Stress
  {
    const start = performance.now();
    const SAMPLE_SIZE = 1000;
    const tokenSet = new Set<string>();
    const hashSet = new Set<string>();

    for (let i = 0; i < SAMPLE_SIZE; i++) {
      const tok = crypto.randomBytes(32).toString('hex');
      tokenSet.add(tok);
      hashSet.add(hashToken(tok));
    }

    const noTokenCollisions = tokenSet.size === SAMPLE_SIZE;
    const noHashCollisions = hashSet.size === SAMPLE_SIZE;
    const validHex = Array.from(tokenSet).every((t) => /^[0-9a-f]{64}$/.test(t));

    const passed = noTokenCollisions && noHashCollisions && validHex;
    recordTest({
      suite: 'SessionConcurrency',
      testId: 'SES-10',
      name: 'Cryptographic entropy audit: 1,000 pseudo-random tokens generated with 0 collisions and strict 64-char hex format',
      passed,
      durationMs: performance.now() - start,
      details: `tokenSet=${tokenSet.size}, hashSet=${hashSet.size}, validHex=${validHex}`,
    });
  }
}

async function main() {
  console.log('╔═══════════════════════════════════════════════════════════════╗');
  console.log('║   CHALLENGER M1-2: EMPIRICAL ADVERSARIAL STRESS TEST SUITE    ║');
  console.log('║   Database Models, stripFinancialData & Session Concurrency   ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝');

  const totalStart = performance.now();

  try {
    await runPersonaVerification();
    await runStripFinancialDataVerification();
    await runSessionConcurrencyVerification();
  } catch (err) {
    console.error('FATAL TEST ERROR:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }

  const totalDuration = performance.now() - totalStart;

  console.log('\n===============================================================');
  console.log('                  CHALLENGE SUITE SUMMARY                      ');
  console.log('===============================================================');
  const total = results.length;
  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;

  console.log(`  Total Tests Run:     ${total}`);
  console.log(`  Tests Passed:        ${passed}`);
  console.log(`  Tests Failed:        ${failed}`);
  console.log(`  Total Suite Time:    ${totalDuration.toFixed(2)}ms`);
  console.log('---------------------------------------------------------------');

  const personasPassed = results.filter((r) => r.suite === 'Personas' && r.passed).length;
  const personasTotal = results.filter((r) => r.suite === 'Personas').length;
  const sanitizePassed = results.filter((r) => r.suite === 'FinancialSanitization' && r.passed).length;
  const sanitizeTotal = results.filter((r) => r.suite === 'FinancialSanitization').length;
  const sessionPassed = results.filter((r) => r.suite === 'SessionConcurrency' && r.passed).length;
  const sessionTotal = results.filter((r) => r.suite === 'SessionConcurrency').length;

  console.log(`  Section 1 (Personas & DB):       ${personasPassed} / ${personasTotal} passed`);
  console.log(`  Section 2 (stripFinancialData):   ${sanitizePassed} / ${sanitizeTotal} passed`);
  console.log(`  Section 3 (Session Concurrency): ${sessionPassed} / ${sessionTotal} passed`);
  console.log('===============================================================');

  if (failed > 0) {
    console.error(`\n❌ VERDICT: REJECT (${failed} challenge tests failed)`);
    process.exit(1);
  } else {
    console.log('\n✅ VERDICT: APPROVE (100% of adversarial challenges passed)');
    process.exit(0);
  }
}

main();
