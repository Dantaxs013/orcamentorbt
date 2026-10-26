/**
 * Challenger M3-1: Empirical Adversarial Verification Suite
 * Portal Unificado RBT Fundações — Gestão de Orçamentos + Medição Diária (RDP)
 * Milestone M3: User Management UI & Permissions API
 *
 * RIGOROUS EMPIRICAL VERIFICATION HARNESS:
 * - Suite 1: Schema Stress & Fuzzing (Unit Level - Boundary, Corner Cases & Coercion)
 * - Suite 2: HTTP Security, Authentication & Role Access Controls (/api/usuarios)
 * - Suite 3: POST /api/usuarios Boundary, Zero-Module Payloads & DB Integrity
 * - Suite 4: Invalid PATCH Attempts & Partial Merges (/api/usuarios/[id])
 * - Suite 5: Active Admin Self-Protection & Anti-Sabotage Guards
 * - Suite 6: GET /api/usuarios Projection & Credential Masking
 * - Suite 7: UI Component Integrity & Self-Protection Contracts (UsuariosClient)
 *
 * Usage:
 *   npx tsx scripts/challenger-m3-validation.ts
 */

export {};

// 1. MUST set globalThis.AsyncLocalStorage BEFORE requiring Next.js modules to avoid FakeAsyncLocalStorage
const { AsyncLocalStorage } = require('async_hooks');
(globalThis as any).AsyncLocalStorage = AsyncLocalStorage;

import React from 'react';
import type { Usuario } from '../src/components/usuarios/usuarios-client';
import type { NextResponse } from 'next/server';

const { renderToStaticMarkup } = require('react-dom/server');
const { NextRequest } = require('next/server');
const { requestAsyncStorage } = require('next/dist/client/components/request-async-storage-instance');

const { prisma } = require('../src/lib/db');
const { createSession, hashToken, SESSION_COOKIE_NAME } = require('../src/lib/session');
const { hashPassword } = require('../src/lib/auth');
const {
  createUserSchema,
  updateUserSchema,
  userRoleEnum,
} = require('../src/lib/validations/usuario.schema');
const { GET: getUsuarios, POST: postUsuarios } = require('../src/app/api/usuarios/route');
const {
  PATCH: patchUsuario,
  DELETE: deleteUsuario,
} = require('../src/app/api/usuarios/[id]/route');
const { UsuariosClient } = require('../src/components/usuarios/usuarios-client');
const { ToastProvider } = require('../src/components/ui/toast-provider');

// =========================================================================
// TEST HARNESS PRIMITIVES
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

async function test(name: string, fn: () => void | Promise<void>) {
  const start = performance.now();
  try {
    await fn();
    const durationMs = Number((performance.now() - start).toFixed(2));
    testResults.push({
      suite: currentSuite,
      id: name,
      name,
      passed: true,
      verdict: 'PASS',
      durationMs,
    });
    console.log(`  ✓ [PASS] ${name} (${durationMs}ms)`);
  } catch (err: any) {
    const durationMs = Number((performance.now() - start).toFixed(2));
    const errorMessage = err?.message || String(err);
    testResults.push({
      suite: currentSuite,
      id: name,
      name,
      passed: false,
      verdict: 'FAIL',
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

function assertIncludes(haystack: string, needle: string, message: string) {
  if (!haystack.includes(needle)) {
    throw new Error(`${message} — String does not include expected needle: "${needle}"\nActual: ${haystack}`);
  }
}

function assertNotIncludes(haystack: string, needle: string, message: string) {
  if (haystack.includes(needle)) {
    throw new Error(`${message} — String unexpectedly contains forbidden needle: "${needle}"`);
  }
}

/**
 * Execute an async function within a simulated Next.js request context providing cookieStore
 */
async function runWithSessionCookie(token: string | null, fn: () => Promise<any>): Promise<any> {
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
// MAIN ADVERSARIAL EXECUTION
// =========================================================================

async function main() {
  console.log(`\n===============================================================`);
  console.log(`  CHALLENGER M3-1: ADVERSARIAL VALIDATION & ACCESS RULES SUITE  `);
  console.log(`  Timestamp: ${new Date().toISOString()}`);
  console.log(`===============================================================`);

  // IDs created during test to be cleaned up
  const createdUserIds: string[] = [];
  const createdSessionTokens: string[] = [];

  try {
    // -----------------------------------------------------------------------
    // SETUP TEST PERSONAS IN DATABASE
    // -----------------------------------------------------------------------
    const defaultPasswordHash = await hashPassword('RbtTest@2026');

    // 1. Admin Persona
    let adminUser = await prisma.user.findFirst({ where: { email: 'admin.challenger@test.com' } });
    if (!adminUser) {
      adminUser = await prisma.user.create({
        data: {
          name: 'Admin Challenger',
          email: 'admin.challenger@test.com',
          passwordHash: defaultPasswordHash,
          role: 'ADMIN',
          ativo: true,
          acessoOrcamento: true,
          acessoMedicao: true,
        },
      });
    } else {
      adminUser = await prisma.user.update({
        where: { id: adminUser.id },
        data: { role: 'ADMIN', ativo: true, acessoOrcamento: true, acessoMedicao: true },
      });
    }
    createdUserIds.push(adminUser.id);

    // 2. Orçamentista Persona (Non-Admin, Budget Only)
    let orcUser = await prisma.user.findFirst({ where: { email: 'orc.challenger@test.com' } });
    if (!orcUser) {
      orcUser = await prisma.user.create({
        data: {
          name: 'Orc Challenger',
          email: 'orc.challenger@test.com',
          passwordHash: defaultPasswordHash,
          role: 'ORCAMENTISTA',
          ativo: true,
          acessoOrcamento: true,
          acessoMedicao: false,
        },
      });
    } else {
      orcUser = await prisma.user.update({
        where: { id: orcUser.id },
        data: { role: 'ORCAMENTISTA', ativo: true, acessoOrcamento: true, acessoMedicao: false },
      });
    }
    createdUserIds.push(orcUser.id);

    // 3. Engenheiro Persona (Non-Admin, Measurement Only)
    let engUser = await prisma.user.findFirst({ where: { email: 'eng.challenger@test.com' } });
    if (!engUser) {
      engUser = await prisma.user.create({
        data: {
          name: 'Eng Challenger',
          email: 'eng.challenger@test.com',
          passwordHash: defaultPasswordHash,
          role: 'ENGENHEIRO',
          ativo: true,
          acessoOrcamento: false,
          acessoMedicao: true,
        },
      });
    } else {
      engUser = await prisma.user.update({
        where: { id: engUser.id },
        data: { role: 'ENGENHEIRO', ativo: true, acessoOrcamento: false, acessoMedicao: true },
      });
    }
    createdUserIds.push(engUser.id);

    // Create active sessions for personas
    const adminToken = await createSession(adminUser.id, { userAgent: 'Challenger-Admin' });
    createdSessionTokens.push(adminToken);

    const orcToken = await createSession(orcUser.id, { userAgent: 'Challenger-Orc' });
    createdSessionTokens.push(orcToken);

    const engToken = await createSession(engUser.id, { userAgent: 'Challenger-Eng' });
    createdSessionTokens.push(engToken);

    // =======================================================================
    // SUITE 1: SCHEMA STRESS & FUZZING (UNIT LEVEL)
    // =======================================================================
    suite('1. Schema Stress & Fuzzing (Unit Level)');

    await test('1.1 createUserSchema strictly rejects explicit zero-module payload', () => {
      const res = createUserSchema.safeParse({
        name: 'Roberto Zero',
        email: 'zero@test.com',
        password: 'Password123',
        role: 'ORCAMENTISTA',
        acessoOrcamento: false,
        acessoMedicao: false,
      });
      assertEqual(res.success, false, 'Zero module payload must fail validation');
      if (!res.success) {
        assertIncludes(
          res.error.issues[0].message,
          'Pelo menos um módulo de acesso deve ser selecionado',
          'Error message must state minimum 1 module requirement'
        );
        assertEqual(res.error.issues[0].path[0], 'acessoOrcamento', 'Error path must target acessoOrcamento');
      }
    });

    await test('1.2 updateUserSchema strictly rejects explicit zero-module payload', () => {
      const res = updateUserSchema.safeParse({
        acessoOrcamento: false,
        acessoMedicao: false,
      });
      assertEqual(res.success, false, 'updateUserSchema must reject both flags false');
      if (!res.success) {
        assertIncludes(
          res.error.issues[0].message,
          'Pelo menos um módulo de acesso deve ser selecionado',
          'Error message must state minimum 1 module requirement'
        );
      }
    });

    await test('1.3 Falsy coercions (0, null, empty string) are coerced to false and rejected when both false', () => {
      const cases = [
        { acessoOrcamento: 0, acessoMedicao: 0 },
        { acessoOrcamento: '', acessoMedicao: null },
        { acessoOrcamento: false, acessoMedicao: 0 },
        { acessoOrcamento: null, acessoMedicao: false },
      ];
      for (const c of cases) {
        const res = createUserSchema.safeParse({
          name: 'Falsy Test',
          email: 'falsy@test.com',
          password: 'Password123',
          role: 'ORCAMENTISTA',
          ...c,
        });
        assertEqual(res.success, false, `Falsy combination ${JSON.stringify(c)} must fail refine`);
      }
    });

    await test('1.4 Truthy coercions (1, "true", "yes", []) are coerced to true and accepted', () => {
      const truthyVals = [1, 'true', 'yes', [], {}];
      for (const val of truthyVals) {
        const res = createUserSchema.safeParse({
          name: 'Truthy Test',
          email: 'truthy@test.com',
          password: 'Password123',
          role: 'ORCAMENTISTA',
          acessoOrcamento: val,
          acessoMedicao: false,
        });
        assertEqual(res.success, true, `Truthy value ${JSON.stringify(val)} must coerce to true`);
        if (res.success) {
          assertEqual(res.data.acessoOrcamento, true, 'acessoOrcamento must be true');
          assertEqual(res.data.acessoMedicao, false, 'acessoMedicao must be false');
        }
      }
    });

    await test('1.5 Defensive defaults correctly infer permissions when flags are completely omitted', () => {
      const adminDefault = createUserSchema.safeParse({
        name: 'Default Admin',
        email: 'def.admin@test.com',
        password: 'Password123',
        role: 'ADMIN',
      });
      assertEqual(adminDefault.success, true, 'Admin with omitted flags must succeed');
      if (adminDefault.success) {
        assertEqual(adminDefault.data.acessoOrcamento, true, 'Admin default acessoOrcamento must be true');
        assertEqual(adminDefault.data.acessoMedicao, true, 'Admin default acessoMedicao must be true');
      }

      const orcDefault = createUserSchema.safeParse({
        name: 'Default Orc',
        email: 'def.orc@test.com',
        password: 'Password123',
        role: 'ORCAMENTISTA',
      });
      assertEqual(orcDefault.success, true, 'Orc with omitted flags must succeed');
      if (orcDefault.success) {
        assertEqual(orcDefault.data.acessoOrcamento, true, 'Orc default acessoOrcamento must be true');
        assertEqual(orcDefault.data.acessoMedicao, false, 'Orc default acessoMedicao must be false');
      }

      const engDefault = createUserSchema.safeParse({
        name: 'Default Eng',
        email: 'def.eng@test.com',
        password: 'Password123',
        role: 'ENGENHEIRO',
      });
      assertEqual(engDefault.success, true, 'Eng with omitted flags must succeed');
      if (engDefault.success) {
        assertEqual(engDefault.data.acessoOrcamento, false, 'Eng default acessoOrcamento must be false');
        assertEqual(engDefault.data.acessoMedicao, true, 'Eng default acessoMedicao must be true');
      }

      const aptDefault = createUserSchema.safeParse({
        name: 'Default Apt',
        email: 'def.apt@test.com',
        password: 'Password123',
        role: 'APONTADOR',
      });
      assertEqual(aptDefault.success, true, 'Apt with omitted flags must succeed');
      if (aptDefault.success) {
        assertEqual(aptDefault.data.acessoOrcamento, false, 'Apt default acessoOrcamento must be false');
        assertEqual(aptDefault.data.acessoMedicao, true, 'Apt default acessoMedicao must be true');
      }
    });

    await test('1.6 Malformed and boundary name payloads are rejected', () => {
      const invalidNames = ['', '   ', 'A', null, undefined, 123];
      for (const name of invalidNames) {
        const res = createUserSchema.safeParse({
          name,
          email: 'valid@test.com',
          password: 'Password123',
          role: 'ORCAMENTISTA',
          acessoOrcamento: true,
          acessoMedicao: false,
        });
        assertEqual(res.success, false, `Name ${JSON.stringify(name)} must be rejected`);
      }

      // Valid name with surrounding spaces is trimmed
      const trimmed = createUserSchema.safeParse({
        name: '  Ana Clara  ',
        email: 'ana@test.com',
        password: 'Password123',
        role: 'ORCAMENTISTA',
        acessoOrcamento: true,
        acessoMedicao: false,
      });
      assertEqual(trimmed.success, true, 'Valid name must be accepted');
      if (trimmed.success) {
        assertEqual(trimmed.data.name, 'Ana Clara', 'Name must be trimmed');
      }
    });

    await test('1.7 Malformed and boundary email payloads are rejected and normalized', () => {
      const invalidEmails = ['', 'notanemail', '@test.com', 'user@', 'user @test.com', null, undefined];
      for (const email of invalidEmails) {
        const res = createUserSchema.safeParse({
          name: 'Valid Name',
          email,
          password: 'Password123',
          role: 'ORCAMENTISTA',
          acessoOrcamento: true,
          acessoMedicao: false,
        });
        assertEqual(res.success, false, `Email ${JSON.stringify(email)} must be rejected`);
      }

      // Normalized to lowercase
      const upper = createUserSchema.safeParse({
        name: 'Valid Name',
        email: '  JOAO.SILVA@RBT.COM.BR  ',
        password: 'Password123',
        role: 'ORCAMENTISTA',
        acessoOrcamento: true,
        acessoMedicao: false,
      });
      assertEqual(upper.success, true, 'Valid uppercase email must pass');
      if (upper.success) {
        assertEqual(upper.data.email, 'joao.silva@rbt.com.br', 'Email must be trimmed and lowercased');
      }
    });

    await test('1.8 Short passwords (< 6 chars) are rejected, valid passwords accepted', () => {
      const shortRes = createUserSchema.safeParse({
        name: 'Valid Name',
        email: 'valid@test.com',
        password: '12345',
        role: 'ORCAMENTISTA',
        acessoOrcamento: true,
        acessoMedicao: false,
      });
      assertEqual(shortRes.success, false, '5 character password must be rejected');

      const okRes = createUserSchema.safeParse({
        name: 'Valid Name',
        email: 'valid@test.com',
        password: '123456',
        role: 'ORCAMENTISTA',
        acessoOrcamento: true,
        acessoMedicao: false,
      });
      assertEqual(okRes.success, true, '6 character password must be accepted');
    });

    await test('1.9 Unknown roles are rejected and valid roles normalized case-insensitively', () => {
      const invalidRoles = ['ROOT', 'SUPERADMIN', 'OPERATOR', 'GUEST', 123];
      for (const role of invalidRoles) {
        const res = createUserSchema.safeParse({
          name: 'Valid Name',
          email: 'valid@test.com',
          password: 'Password123',
          role,
          acessoOrcamento: true,
          acessoMedicao: false,
        });
        assertEqual(res.success, false, `Role ${JSON.stringify(role)} must be rejected`);
      }

      const caseVariations = ['admin', 'Administrador', '  orcamentista  ', 'engenheiro', 'apontador'];
      for (const role of caseVariations) {
        const res = createUserSchema.safeParse({
          name: 'Valid Name',
          email: 'valid@test.com',
          password: 'Password123',
          role,
          acessoOrcamento: true,
          acessoMedicao: false,
        });
        assertEqual(res.success, true, `Role variation "${role}" must be accepted`);
      }
    });

    await test('1.10 updateUserSchema allows partial fields and empty password while rejecting short password', () => {
      const updateName = updateUserSchema.safeParse({ name: 'Updated Name' });
      assertEqual(updateName.success, true, 'Partial update with name only must be valid');

      const updateEmptyPass = updateUserSchema.safeParse({ password: '' });
      assertEqual(updateEmptyPass.success, true, 'Empty password on update must be accepted as no-op');

      const updateShortPass = updateUserSchema.safeParse({ password: '123' });
      assertEqual(updateShortPass.success, false, 'Short password on update must be rejected');

      const updateGoodPass = updateUserSchema.safeParse({ password: 'StrongNewPass1' });
      assertEqual(updateGoodPass.success, true, 'Valid password on update must be accepted');
    });

    // =======================================================================
    // SUITE 2: HTTP SECURITY, AUTHENTICATION & ROLE ACCESS CONTROLS
    // =======================================================================
    suite('2. HTTP Security, Authentication & Role Access Controls');

    await test('2.1 Unauthenticated requests to /api/usuarios are rejected with HTTP 401', async () => {
      // POST without session
      const reqPost = new NextRequest('http://localhost:3000/api/usuarios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Hacker', email: 'hacker@test.com', password: 'Password123' }),
      });
      const resPost = await runWithSessionCookie(null, () => postUsuarios(reqPost));
      assertEqual(resPost.status, 401, 'Unauthenticated POST must return 401');

      // GET without session
      const resGet = await runWithSessionCookie(null, () => getUsuarios());
      assertEqual(resGet.status, 401, 'Unauthenticated GET must return 401');

      // PATCH without session
      const reqPatch = new NextRequest('http://localhost:3000/api/usuarios/any_id', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Hacker Edit' }),
      });
      const resPatch = await runWithSessionCookie(null, () =>
        patchUsuario(reqPatch, { params: { id: 'any_id' } })
      );
      assertEqual(resPatch.status, 401, 'Unauthenticated PATCH must return 401');

      // DELETE without session
      const reqDel = new NextRequest('http://localhost:3000/api/usuarios/any_id', {
        method: 'DELETE',
      });
      const resDel = await runWithSessionCookie(null, () =>
        deleteUsuario(reqDel, { params: { id: 'any_id' } })
      );
      assertEqual(resDel.status, 401, 'Unauthenticated DELETE must return 401');
    });

    await test('2.2 Non-admin (ORCAMENTISTA) attempting user management is rejected with HTTP 403', async () => {
      // POST by ORCAMENTISTA
      const reqPost = new NextRequest('http://localhost:3000/api/usuarios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Unauthorized Create',
          email: 'unauth@test.com',
          password: 'Password123',
          role: 'ORCAMENTISTA',
          acessoOrcamento: true,
          acessoMedicao: false,
        }),
      });
      const resPost = await runWithSessionCookie(orcToken, () => postUsuarios(reqPost));
      assertEqual(resPost.status, 403, 'ORCAMENTISTA POST must return 403');
      const postBody = await resPost.json();
      assertIncludes(postBody.error, 'Apenas Gestores (ADMIN)', 'Error must indicate admin permission required');

      // PATCH by ORCAMENTISTA
      const reqPatch = new NextRequest(`http://localhost:3000/api/usuarios/${orcUser.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: 'ADMIN' }), // Attempt privilege escalation
      });
      const resPatch = await runWithSessionCookie(orcToken, () =>
        patchUsuario(reqPatch, { params: { id: orcUser.id } })
      );
      assertEqual(resPatch.status, 403, 'ORCAMENTISTA PATCH must return 403');

      // DELETE by ORCAMENTISTA
      const reqDel = new NextRequest(`http://localhost:3000/api/usuarios/${adminUser.id}`, {
        method: 'DELETE',
      });
      const resDel = await runWithSessionCookie(orcToken, () =>
        deleteUsuario(reqDel, { params: { id: adminUser.id } })
      );
      assertEqual(resDel.status, 403, 'ORCAMENTISTA DELETE must return 403');
    });

    await test('2.3 Non-admin (ENGENHEIRO) attempting user management is rejected with HTTP 403', async () => {
      const reqPost = new NextRequest('http://localhost:3000/api/usuarios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Eng Unauthorized',
          email: 'eng_unauth@test.com',
          password: 'Password123',
        }),
      });
      const resPost = await runWithSessionCookie(engToken, () => postUsuarios(reqPost));
      assertEqual(resPost.status, 403, 'ENGENHEIRO POST must return 403');
    });

    // =======================================================================
    // SUITE 3: POST /api/usuarios BOUNDARY, ZERO-MODULE & DB INTEGRITY
    // =======================================================================
    suite('3. POST /api/usuarios Boundary, Zero-Module Payloads & DB Integrity');

    await test('3.1 Admin POST with explicit zero modules { acessoOrcamento: false, acessoMedicao: false } returns HTTP 400', async () => {
      const req = new NextRequest('http://localhost:3000/api/usuarios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Zero Module User',
          email: 'zero.module@test.com',
          password: 'Password123',
          role: 'ORCAMENTISTA',
          acessoOrcamento: false,
          acessoMedicao: false,
        }),
      });
      const res = await runWithSessionCookie(adminToken, () => postUsuarios(req));
      assertEqual(res.status, 400, 'Zero module creation must return HTTP 400');
      const body = await res.json();
      assertIncludes(
        body.error,
        'Pelo menos um módulo de acesso deve ser selecionado',
        'Error must state minimum 1 module requirement'
      );

      // Verify user was NOT created in DB
      const dbCheck = await prisma.user.findUnique({ where: { email: 'zero.module@test.com' } });
      assertEqual(dbCheck, null, 'Rejected user must not exist in database');
    });

    await test('3.2 Admin POST with malformed fields (short password, invalid email) returns HTTP 400', async () => {
      // Short password
      const reqShortPass = new NextRequest('http://localhost:3000/api/usuarios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Short Pass User',
          email: 'shortpass@test.com',
          password: '123',
          role: 'ORCAMENTISTA',
          acessoOrcamento: true,
          acessoMedicao: false,
        }),
      });
      const resShortPass = await runWithSessionCookie(adminToken, () => postUsuarios(reqShortPass));
      assertEqual(resShortPass.status, 400, 'Short password must return 400');

      // Invalid email
      const reqBadEmail = new NextRequest('http://localhost:3000/api/usuarios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Bad Email User',
          email: 'not-an-email',
          password: 'Password123',
          role: 'ORCAMENTISTA',
          acessoOrcamento: true,
          acessoMedicao: false,
        }),
      });
      const resBadEmail = await runWithSessionCookie(adminToken, () => postUsuarios(reqBadEmail));
      assertEqual(resBadEmail.status, 400, 'Invalid email must return 400');
    });

    await test('3.3 Admin POST with existing duplicate email returns HTTP 409 Conflict', async () => {
      const req = new NextRequest('http://localhost:3000/api/usuarios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Duplicate Admin',
          email: adminUser.email, // existing email
          password: 'Password123',
          role: 'ADMIN',
          acessoOrcamento: true,
          acessoMedicao: true,
        }),
      });
      const res = await runWithSessionCookie(adminToken, () => postUsuarios(req));
      assertEqual(res.status, 409, 'Duplicate email must return HTTP 409 Conflict');
      const body = await res.json();
      assertIncludes(body.error, 'Já existe um usuário cadastrado', 'Error must state duplicate email');
    });

    let createdSingleOrcId = '';
    await test('3.4 Admin successfully creates single-module user (Orçamentos only) -> HTTP 201', async () => {
      const uniqueEmail = `valid.orc.${Date.now()}@test.com`;
      const req = new NextRequest('http://localhost:3000/api/usuarios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Novo Orçamentista RBT',
          email: uniqueEmail,
          password: 'Password123',
          role: 'ORCAMENTISTA',
          acessoOrcamento: true,
          acessoMedicao: false,
        }),
      });
      const res = await runWithSessionCookie(adminToken, () => postUsuarios(req));
      assertEqual(res.status, 201, 'Valid creation must return HTTP 201');
      const body = await res.json();
      assertEqual(body.success, true, 'Response must indicate success');
      assertEqual(body.user.acessoOrcamento, true, 'acessoOrcamento must be true');
      assertEqual(body.user.acessoMedicao, false, 'acessoMedicao must be false');
      createdSingleOrcId = body.user.id;
      createdUserIds.push(createdSingleOrcId);

      // Verify in DB
      const dbRecord = await prisma.user.findUnique({ where: { id: createdSingleOrcId } });
      assert(dbRecord !== null, 'User must exist in DB');
      assertEqual(dbRecord!.acessoOrcamento, true, 'DB acessoOrcamento must be true');
      assertEqual(dbRecord!.acessoMedicao, false, 'DB acessoMedicao must be false');
    });

    let createdDualId = '';
    await test('3.5 Admin successfully creates dual-module user -> HTTP 201', async () => {
      const uniqueEmail = `valid.dual.${Date.now()}@test.com`;
      const req = new NextRequest('http://localhost:3000/api/usuarios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Novo Gestor Dual RBT',
          email: uniqueEmail,
          password: 'Password123',
          role: 'ADMIN',
          acessoOrcamento: true,
          acessoMedicao: true,
        }),
      });
      const res = await runWithSessionCookie(adminToken, () => postUsuarios(req));
      assertEqual(res.status, 201, 'Valid dual-module creation must return HTTP 201');
      const body = await res.json();
      assertEqual(body.user.acessoOrcamento, true, 'Dual user acessoOrcamento must be true');
      assertEqual(body.user.acessoMedicao, true, 'Dual user acessoMedicao must be true');
      createdDualId = body.user.id;
      createdUserIds.push(createdDualId);
    });

    // =======================================================================
    // SUITE 4: INVALID PATCH ATTEMPTS & PARTIAL MERGES (/api/usuarios/[id])
    // =======================================================================
    suite('4. Invalid PATCH Attempts & Partial Merges');

    await test('4.1 PATCH non-existent user returns HTTP 404', async () => {
      const req = new NextRequest('http://localhost:3000/api/usuarios/usr_nonexistent_999', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Ghost' }),
      });
      const res = await runWithSessionCookie(adminToken, () =>
        patchUsuario(req, { params: { id: 'usr_nonexistent_999' } })
      );
      assertEqual(res.status, 404, 'Non-existent user PATCH must return 404');
    });

    await test('4.2 Explicit zero-module PATCH { acessoOrcamento: false, acessoMedicao: false } returns HTTP 400', async () => {
      const req = new NextRequest(`http://localhost:3000/api/usuarios/${createdDualId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          acessoOrcamento: false,
          acessoMedicao: false,
        }),
      });
      const res = await runWithSessionCookie(adminToken, () =>
        patchUsuario(req, { params: { id: createdDualId } })
      );
      assertEqual(res.status, 400, 'Dual false PATCH must return HTTP 400');
      const body = await res.json();
      assertIncludes(
        body.error,
        'Pelo menos um módulo de acesso deve ser selecionado',
        'Error must state minimum 1 module requirement'
      );

      // Verify DB unchanged
      const dbCheck = await prisma.user.findUnique({ where: { id: createdDualId } });
      assertEqual(dbCheck!.acessoOrcamento, true, 'acessoOrcamento must remain true');
      assertEqual(dbCheck!.acessoMedicao, true, 'acessoMedicao must remain true');
    });

    await test('4.3 Partial merge guard: User with only Orçamentos active CANNOT be patched to acessoOrcamento: false', async () => {
      // createdSingleOrcId has acessoOrcamento: true, acessoMedicao: false
      const req = new NextRequest(`http://localhost:3000/api/usuarios/${createdSingleOrcId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          acessoOrcamento: false, // omitting acessoMedicao -> targetMedicao remains false from DB
        }),
      });
      const res = await runWithSessionCookie(adminToken, () =>
        patchUsuario(req, { params: { id: createdSingleOrcId } })
      );
      assertEqual(res.status, 400, 'Partial transition resulting in zero modules must return HTTP 400');
      const body = await res.json();
      assertIncludes(
        body.error,
        'Pelo menos um módulo de acesso deve ser selecionado',
        'Error must state minimum 1 module requirement'
      );

      // Verify DB was NOT updated
      const dbCheck = await prisma.user.findUnique({ where: { id: createdSingleOrcId } });
      assertEqual(dbCheck!.acessoOrcamento, true, 'DB record must preserve acessoOrcamento: true');
      assertEqual(dbCheck!.acessoMedicao, false, 'DB record must preserve acessoMedicao: false');
    });

    await test('4.4 Partial merge guard: User with only Medição active CANNOT be patched to acessoMedicao: false', async () => {
      // engUser has acessoOrcamento: false, acessoMedicao: true
      const req = new NextRequest(`http://localhost:3000/api/usuarios/${engUser.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          acessoMedicao: false, // omitting acessoOrcamento -> targetOrcamento remains false from DB
        }),
      });
      const res = await runWithSessionCookie(adminToken, () =>
        patchUsuario(req, { params: { id: engUser.id } })
      );
      assertEqual(res.status, 400, 'Partial transition resulting in zero modules must return HTTP 400');

      // Verify DB unchanged
      const dbCheck = await prisma.user.findUnique({ where: { id: engUser.id } });
      assertEqual(dbCheck!.acessoMedicao, true, 'DB record must preserve acessoMedicao: true');
    });

    await test('4.5 Dual-module user CAN have one module toggled off while keeping the other', async () => {
      // createdDualId has both true. Revoke Medição -> Orçamentos remains true
      const req = new NextRequest(`http://localhost:3000/api/usuarios/${createdDualId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          acessoMedicao: false,
        }),
      });
      const res = await runWithSessionCookie(adminToken, () =>
        patchUsuario(req, { params: { id: createdDualId } })
      );
      assertEqual(res.status, 200, 'Revoking one module when other is active must succeed');
      const body = await res.json();
      assertEqual(body.user.acessoOrcamento, true, 'acessoOrcamento must remain true');
      assertEqual(body.user.acessoMedicao, false, 'acessoMedicao must now be false');

      // Now attempt to revoke Orçamentos as well -> MUST BE BLOCKED!
      const reqBlock = new NextRequest(`http://localhost:3000/api/usuarios/${createdDualId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          acessoOrcamento: false,
        }),
      });
      const resBlock = await runWithSessionCookie(adminToken, () =>
        patchUsuario(reqBlock, { params: { id: createdDualId } })
      );
      assertEqual(resBlock.status, 400, 'Second revocation must be blocked as it leaves 0 modules');

      // Restore dual access
      const reqRestore = new NextRequest(`http://localhost:3000/api/usuarios/${createdDualId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          acessoMedicao: true,
        }),
      });
      const resRestore = await runWithSessionCookie(adminToken, () =>
        patchUsuario(reqRestore, { params: { id: createdDualId } })
      );
      assertEqual(resRestore.status, 200, 'Restoring module must succeed');
    });

    // =======================================================================
    // SUITE 5: ACTIVE ADMIN SELF-PROTECTION & ANTI-SABOTAGE GUARDS
    // =======================================================================
    suite('5. Active Admin Self-Protection & Anti-Sabotage Guards');

    await test('5.1 Logged-in Admin CANNOT deactivate their own account { ativo: false } -> HTTP 400', async () => {
      const req = new NextRequest(`http://localhost:3000/api/usuarios/${adminUser.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ativo: false,
        }),
      });
      const res = await runWithSessionCookie(adminToken, () =>
        patchUsuario(req, { params: { id: adminUser.id } })
      );
      assertEqual(res.status, 400, 'Self-deactivation must return HTTP 400');
      const body = await res.json();
      assertIncludes(
        body.error,
        'Você não pode desativar o seu próprio usuário atual',
        'Error must state self-deactivation prohibition'
      );

      // Verify DB state
      const dbAdmin = await prisma.user.findUnique({ where: { id: adminUser.id } });
      assertEqual(dbAdmin!.ativo, true, 'Admin ativo status in DB must remain true');
    });

    await test('5.2 Logged-in Admin CANNOT demote themselves from ADMIN role -> HTTP 400', async () => {
      const req = new NextRequest(`http://localhost:3000/api/usuarios/${adminUser.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: 'ORCAMENTISTA',
        }),
      });
      const res = await runWithSessionCookie(adminToken, () =>
        patchUsuario(req, { params: { id: adminUser.id } })
      );
      assertEqual(res.status, 400, 'Self-demotion must return HTTP 400');
      const body = await res.json();
      assertIncludes(
        body.error,
        'Você não pode rebaixar o seu próprio perfil de Administrador',
        'Error must state self-demotion prohibition'
      );

      // Verify DB state
      const dbAdmin = await prisma.user.findUnique({ where: { id: adminUser.id } });
      assertEqual(dbAdmin!.role, 'ADMIN', 'Admin role in DB must remain ADMIN');
    });

    await test('5.3 Logged-in Admin CANNOT delete their own account via DELETE -> HTTP 400', async () => {
      const req = new NextRequest(`http://localhost:3000/api/usuarios/${adminUser.id}`, {
        method: 'DELETE',
      });
      const res = await runWithSessionCookie(adminToken, () =>
        deleteUsuario(req, { params: { id: adminUser.id } })
      );
      assertEqual(res.status, 400, 'Self-deletion must return HTTP 400');
      const body = await res.json();
      assertIncludes(
        body.error,
        'Você não pode excluir o seu próprio usuário em uso',
        'Error must state self-deletion prohibition'
      );

      // Verify DB record still exists
      const dbAdmin = await prisma.user.findUnique({ where: { id: adminUser.id } });
      assert(dbAdmin !== null, 'Admin record must remain in database');
    });

    await test('5.4 Admin CAN successfully delete another test user via DELETE -> HTTP 200', async () => {
      // Create a temporary user to be deleted
      const tempUser = await prisma.user.create({
        data: {
          name: 'Temp To Delete',
          email: `temp.del.${Date.now()}@test.com`,
          passwordHash: defaultPasswordHash,
          role: 'ORCAMENTISTA',
          ativo: true,
          acessoOrcamento: true,
          acessoMedicao: false,
        },
      });

      const req = new NextRequest(`http://localhost:3000/api/usuarios/${tempUser.id}`, {
        method: 'DELETE',
      });
      const res = await runWithSessionCookie(adminToken, () =>
        deleteUsuario(req, { params: { id: tempUser.id } })
      );
      assertEqual(res.status, 200, 'Deleting other user must return HTTP 200');
      const body = await res.json();
      assertEqual(body.success, true, 'Delete response must indicate success');

      // Verify DB record removed
      const checkDb = await prisma.user.findUnique({ where: { id: tempUser.id } });
      assertEqual(checkDb, null, 'Deleted user must no longer exist in DB');
    });

    // =======================================================================
    // SUITE 6: GET /api/usuarios PROJECTION & CREDENTIAL MASKING
    // =======================================================================
    suite('6. GET /api/usuarios Projection & Credential Masking');

    await test('6.1 GET /api/usuarios returns modular access properties and excludes passwords', async () => {
      const res = await runWithSessionCookie(adminToken, () => getUsuarios());
      assertEqual(res.status, 200, 'GET /api/usuarios must return 200');
      const body = await res.json();
      assert(Array.isArray(body.users), 'body.users must be an array');
      assert(body.users.length > 0, 'Users list must not be empty');

      for (const u of body.users) {
        assertEqual(
          typeof u.acessoOrcamento,
          'boolean',
          `User ${u.email} must have boolean acessoOrcamento`
        );
        assertEqual(
          typeof u.acessoMedicao,
          'boolean',
          `User ${u.email} must have boolean acessoMedicao`
        );
        assertEqual(u.password, undefined, `User ${u.email} must NOT expose password field`);
        assertEqual(u.passwordHash, undefined, `User ${u.email} must NOT expose passwordHash field`);
      }
    });

    // =======================================================================
    // SUITE 7: UI COMPONENT INTEGRITY & SELF-PROTECTION CONTRACTS (UsuariosClient)
    // =======================================================================
    suite('7. UI Component Integrity & Self-Protection Contracts (UsuariosClient)');

    await test('7.1 UsuariosClient renders table header with "Módulos Habilitados" column', () => {
      const initialUsers: Usuario[] = [
        {
          id: adminUser.id,
          name: adminUser.name,
          email: adminUser.email,
          role: 'ADMIN',
          ativo: true,
          acessoOrcamento: true,
          acessoMedicao: true,
          createdAt: new Date().toISOString(),
          _count: { orcamentos: 5 },
        },
        {
          id: orcUser.id,
          name: orcUser.name,
          email: orcUser.email,
          role: 'ORCAMENTISTA',
          ativo: true,
          acessoOrcamento: true,
          acessoMedicao: false,
          createdAt: new Date().toISOString(),
          _count: { orcamentos: 2 },
        },
      ];

      const html = renderToStaticMarkup(
        React.createElement(
          ToastProvider,
          null,
          React.createElement(UsuariosClient, {
            initialUsers,
            currentUser: {
              id: adminUser.id,
              name: adminUser.name,
              email: adminUser.email,
              role: 'ADMIN',
            },
          })
        )
      );

      assertIncludes(html, 'Módulos Habilitados', 'Table must have Módulos Habilitados header');
      assertIncludes(html, 'Gestão de Orçamentos', 'Orçamentos module text must be present');
      assertIncludes(html, 'Medição Diária (RDP)', 'Medição module text must be present');
    });

    await test('7.2 UsuariosClient displays "Você" badge and suppresses delete/deactivate on own row', () => {
      const initialUsers: Usuario[] = [
        {
          id: adminUser.id,
          name: adminUser.name,
          email: adminUser.email,
          role: 'ADMIN',
          ativo: true,
          acessoOrcamento: true,
          acessoMedicao: true,
          createdAt: new Date().toISOString(),
        },
      ];

      const html = renderToStaticMarkup(
        React.createElement(
          ToastProvider,
          null,
          React.createElement(UsuariosClient, {
            initialUsers,
            currentUser: {
              id: adminUser.id,
              name: adminUser.name,
              email: adminUser.email,
              role: 'ADMIN',
            },
          })
        )
      );

      assertIncludes(html, 'Você', 'Current logged in admin row must display "Você" tag');
      // Should NOT render delete button for own row
      assertNotIncludes(
        html,
        `title="Excluir definitivamente ${adminUser.name}"`,
        'Delete button must NOT be rendered for current admin row'
      );
    });

    await test('7.3 UsuariosClient renders distinct badges for Orçamentos and Medição', () => {
      const initialUsers: Usuario[] = [
        {
          id: 'u_orc_only',
          name: 'Orc Only User',
          email: 'orconly@test.com',
          role: 'ORCAMENTISTA',
          ativo: true,
          acessoOrcamento: true,
          acessoMedicao: false,
          createdAt: new Date().toISOString(),
        },
        {
          id: 'u_med_only',
          name: 'Med Only User',
          email: 'medonly@test.com',
          role: 'ENGENHEIRO',
          ativo: true,
          acessoOrcamento: false,
          acessoMedicao: true,
          createdAt: new Date().toISOString(),
        },
      ];

      const html = renderToStaticMarkup(
        React.createElement(
          ToastProvider,
          null,
          React.createElement(UsuariosClient, {
            initialUsers,
            currentUser: {
              id: adminUser.id,
              name: adminUser.name,
              email: adminUser.email,
              role: 'ADMIN',
            },
          })
        )
      );

      assertIncludes(html, 'Orçamentos', 'Must render Orçamentos badge');
      assertIncludes(html, 'Medição', 'Must render Medição badge');
    });

  } finally {
    // -----------------------------------------------------------------------
    // TEARDOWN: CLEAN UP TEST DATA
    // -----------------------------------------------------------------------
    console.log(`\n🧹 Cleaning up test users and active sessions...`);
    for (const token of createdSessionTokens) {
      await prisma.session.deleteMany({ where: { tokenHash: hashToken(token) } }).catch(() => {});
    }
    for (const userId of createdUserIds) {
      await prisma.user.deleteMany({ where: { id: userId } }).catch(() => {});
    }
    console.log(`✅ Test cleanup complete.`);
  }

  // =========================================================================
  // SUMMARY REPORT
  // =========================================================================
  const total = testResults.length;
  const passed = testResults.filter((r) => r.passed).length;
  const failed = testResults.filter((r) => !r.passed).length;

  console.log(`\n===============================================================`);
  console.log(`        CHALLENGER M3-1 ADVERSARIAL VERIFICATION SUMMARY      `);
  console.log(`===============================================================`);
  console.log(`  Total Tests Run:  ${total}`);
  console.log(`  Tests Passed:     ${passed}`);
  console.log(`  Tests Failed:     ${failed}`);
  console.log(`  Success Rate:     ${((passed / total) * 100).toFixed(1)}%`);
  console.log(`===============================================================`);

  if (failed > 0) {
    console.error(`\n❌ VERDICT: REJECT — ${failed} test(s) failed.`);
    process.exit(1);
  } else {
    console.log(`\n✅ VERDICT: APPROVE — All adversarial validation & access rules verified!`);
    process.exit(0);
  }
}

main().catch((err) => {
  console.error('Fatal error in test suite:', err);
  process.exit(1);
});
