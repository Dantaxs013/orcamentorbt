import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { signUserMeta, verifyUserMeta, USER_META_COOKIE_NAME } from '../../../src/lib/token-utils';
import { createSession, validateSession, destroySession, hashToken, buildSessionCookies } from '../../../src/lib/session';
import { hashPassword, verifyPassword, stripFinancialData, FINANCIAL_KEYS } from '../../../src/lib/auth';

const prisma = new PrismaClient();

async function runForensicAudit() {
  console.log('=== FORENSIC INTEGRITY AUDIT EXECUTION ===\n');

  // ----------------------------------------------------
  // TEST 1: SQLite Database Tables and Structure
  // ----------------------------------------------------
  console.log('--- TEST 1: Database Inspection ---');
  const tables = await prisma.$queryRaw<Array<{ name: string }>>`
    SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_prisma_%'
  `;
  const tableNames = tables.map(t => t.name).sort();
  console.log('Discovered tables in dev.db:', tableNames);

  const requiredTables = [
    'users',
    'sessions',
    'leads',
    'orcamentos',
    'magic_links',
    'respostas_formulario',
    'propostas_comerciais',
    'status_logs',
    'Obra',
    'Contrato',
    'ItemContrato',
    'RelatorioDiario',
    'LinhaProducao',
    'Medicao',
    'ItemMedicao',
    'MedicaoRelatorioVinculo',
    'Notificacao',
    'AuditLog',
    'RateLimitRecord',
    'EstacaPrincipal',
  ];

  for (const req of requiredTables) {
    if (!tableNames.includes(req)) {
      throw new Error(`INTEGRITY VIOLATION: Missing required table ${req}`);
    }
  }
  console.log(`[PASS] All ${requiredTables.length} required domain tables verified in SQLite dev.db.`);

  // Check columns of 'users'
  const userColumns = await prisma.$queryRaw<Array<{ name: string; type: string }>>`
    PRAGMA table_info('users')
  `;
  const colNames = userColumns.map(c => c.name);
  console.log('Columns in users table:', colNames);
  if (!colNames.includes('acessoOrcamento') || !colNames.includes('acessoMedicao')) {
    throw new Error('INTEGRITY VIOLATION: Column acessoOrcamento or acessoMedicao missing in users table');
  }
  console.log('[PASS] User columns acessoOrcamento and acessoMedicao verified.');

  // ----------------------------------------------------
  // TEST 2: Seeded Accounts and Password Hash Integrity
  // ----------------------------------------------------
  console.log('\n--- TEST 2: Seeded Data & Password Hash Verification ---');
  const users = await prisma.user.findMany();
  console.log(`Found ${users.length} users in database.`);
  if (users.length < 5) {
    throw new Error(`INTEGRITY VIOLATION: Expected at least 5 seeded users, got ${users.length}`);
  }

  for (const u of users) {
    console.log(`  User: ${u.email} | Role: ${u.role} | Orcamento: ${u.acessoOrcamento} | Medicao: ${u.acessoMedicao}`);
    // Check that password hash is valid bcrypt hash starting with $2
    if (!u.passwordHash.startsWith('$2a$') && !u.passwordHash.startsWith('$2b$')) {
      throw new Error(`INTEGRITY VIOLATION: User ${u.email} does not have valid bcrypt hash: ${u.passwordHash}`);
    }
    // Verify password with bcrypt
    const match = await bcrypt.compare('Rbt@2026', u.passwordHash);
    if (!match) {
      throw new Error(`INTEGRITY VIOLATION: Password hash for ${u.email} does not match Rbt@2026`);
    }
    const wrongMatch = await bcrypt.compare('WrongPassword999', u.passwordHash);
    if (wrongMatch) {
      throw new Error(`INTEGRITY VIOLATION: Password comparison accepted wrong password for ${u.email}`);
    }
  }
  console.log('[PASS] All seeded users have authentic bcrypt hashes with verified comparison.');

  // Check Obra, Contrato, RDP
  const obras = await prisma.obra.findMany({ include: { contratos: { include: { itens: true } }, relatoriosDiarios: { include: { linhasProducao: true } } } });
  console.log(`Found ${obras.length} obras in database.`);
  if (obras.length < 2) {
    throw new Error(`INTEGRITY VIOLATION: Expected 2 obras, found ${obras.length}`);
  }
  const rdpCount = await prisma.relatorioDiario.count();
  const linhasCount = await prisma.linhaProducao.count();
  console.log(`RelatoriosDiarios count: ${rdpCount}, LinhasProducao count: ${linhasCount}`);
  if (rdpCount < 1 || linhasCount < 25) {
    throw new Error(`INTEGRITY VIOLATION: Expected at least 1 RDP and 25 LinhasProducao, found ${rdpCount} / ${linhasCount}`);
  }
  console.log('[PASS] Medição models and relationships verified in SQLite.');

  // ----------------------------------------------------
  // TEST 3: Cryptographic HMAC Token Tracing
  // ----------------------------------------------------
  console.log('\n--- TEST 3: Cryptographic HMAC Tracing (token-utils.ts) ---');
  const claimsInput = {
    userId: 'audit-user-001',
    role: 'ADMIN',
    email: 'auditor@rbt.com.br',
    acessoOrcamento: true,
    acessoMedicao: false,
  };

  const token = await signUserMeta(claimsInput);
  console.log('Generated token:', token);
  const parts = token.split('.');
  if (parts.length !== 2) {
    throw new Error(`INTEGRITY VIOLATION: Token is not in format <payload>.<signature>`);
  }

  // Verify valid token
  const verified = await verifyUserMeta(token);
  if (!verified || verified.userId !== claimsInput.userId || verified.acessoOrcamento !== true || verified.acessoMedicao !== false) {
    throw new Error('INTEGRITY VIOLATION: Valid token verification failed or claims mismatch');
  }
  console.log('[PASS] Valid token verified successfully.');

  // Verify with NextRequest-like cookie container
  const reqContainer = {
    cookies: {
      get: (name: string) => (name === USER_META_COOKIE_NAME ? { value: token } : undefined),
    },
  };
  const verifiedCookie = await verifyUserMeta(reqContainer);
  if (!verifiedCookie || verifiedCookie.userId !== claimsInput.userId) {
    throw new Error('INTEGRITY VIOLATION: Cookie container verification failed');
  }
  console.log('[PASS] Cookie container verification verified successfully.');

  // Tamper signature
  const badSigToken = parts[0] + '.' + 'A'.repeat(parts[1].length);
  const tamperedSigResult = await verifyUserMeta(badSigToken);
  if (tamperedSigResult !== null) {
    throw new Error('INTEGRITY VIOLATION: Tampered signature accepted!');
  }
  console.log('[PASS] Tampered signature correctly rejected.');

  // Tamper payload
  const badPayloadToken = parts[0].slice(0, -2) + 'XX.' + parts[1];
  const tamperedPayloadResult = await verifyUserMeta(badPayloadToken);
  if (tamperedPayloadResult !== null) {
    throw new Error('INTEGRITY VIOLATION: Tampered payload correctly rejected!');
  }
  console.log('[PASS] Tampered payload correctly rejected.');

  // Expired token
  const enc = new TextEncoder();
  const expiredPayload = {
    userId: 'audit-user-001',
    role: 'ADMIN',
    email: 'auditor@rbt.com.br',
    acessoOrcamento: true,
    acessoMedicao: false,
    ts: Date.now() - 13 * 60 * 60 * 1000, // 13h ago
  };
  const b64Json = Buffer.from(JSON.stringify(expiredPayload)).toString('base64url');
  // compute real HMAC with same secret
  const secret = process.env.SESSION_SECRET || 'rbt_fundacoes_default_secret_key_at_least_32_chars';
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const expSig = await crypto.subtle.sign('HMAC', cryptoKey, enc.encode(b64Json));
  const expSigB64 = Buffer.from(expSig).toString('base64url');
  const expiredToken = `${b64Json}.${expSigB64}`;

  const expiredResult = await verifyUserMeta(expiredToken);
  if (expiredResult !== null) {
    throw new Error('INTEGRITY VIOLATION: Expired token accepted!');
  }
  console.log('[PASS] Expired token correctly rejected (> 12h threshold).');

  // ----------------------------------------------------
  // TEST 4: SQLite Database Session Writes and SHA-256
  // ----------------------------------------------------
  console.log('\n--- TEST 4: SQLite Session Lifecycle & SHA-256 Tracing ---');
  const testUser = users[0];
  const sessionToken = await createSession(testUser.id, {
    ipAddress: '192.168.1.100',
    userAgent: 'ForensicAuditor/1.0',
  });

  console.log('Session raw token generated:', sessionToken);
  const expectedHash = crypto.createHash('sha256').update(sessionToken).digest('hex');

  // Verify directly from SQLite
  const dbSession = await prisma.session.findUnique({
    where: { tokenHash: expectedHash },
  });
  if (!dbSession) {
    throw new Error(`INTEGRITY VIOLATION: Session was not stored in SQLite with SHA-256 tokenHash ${expectedHash}`);
  }
  if (dbSession.userId !== testUser.id) {
    throw new Error(`INTEGRITY VIOLATION: Session userId mismatch: ${dbSession.userId} vs ${testUser.id}`);
  }
  console.log('[PASS] Session physically persisted to SQLite with correct SHA-256 hash.');

  // Validate session through validateSession
  const validated = await validateSession(sessionToken);
  if (!validated) {
    throw new Error('INTEGRITY VIOLATION: validateSession returned null for active session');
  }
  if (validated.user.email !== testUser.email) {
    throw new Error(`INTEGRITY VIOLATION: validateSession returned incorrect user email: ${validated.user.email}`);
  }
  console.log('[PASS] validateSession retrieved user and session successfully.');

  // Destroy session
  const destroyed = await destroySession(sessionToken);
  if (!destroyed) {
    throw new Error('INTEGRITY VIOLATION: destroySession returned false');
  }
  const checkDeleted = await prisma.session.findUnique({
    where: { tokenHash: expectedHash },
  });
  if (checkDeleted) {
    throw new Error('INTEGRITY VIOLATION: Session still present in SQLite after destroySession');
  }
  console.log('[PASS] Session physically deleted from SQLite upon destroySession.');

  // ----------------------------------------------------
  // TEST 5: Password Hashing and Financial Sanitization
  // ----------------------------------------------------
  console.log('\n--- TEST 5: Password Hashing & Financial Sanitization ---');
  const testPlain = 'SecretPass@2026!';
  const customHash = await hashPassword(testPlain);
  console.log('Generated hash:', customHash);
  if (!customHash.startsWith('$2a$') && !customHash.startsWith('$2b$')) {
    throw new Error('INTEGRITY VIOLATION: hashPassword did not generate valid bcrypt hash');
  }
  const customValid = await verifyPassword(testPlain, customHash);
  const customInvalid = await verifyPassword('IncorrectPassword', customHash);
  if (!customValid || customInvalid) {
    throw new Error('INTEGRITY VIOLATION: verifyPassword logic is broken or bypassed');
  }
  console.log('[PASS] hashPassword and verifyPassword function authentically.');

  // Test financial sanitization
  const sensitiveObj = {
    id: 'rdp-1',
    numeroSequencial: 1,
    valorTotal: 50000,
    itens: [
      { codigo: '01.01', valorUnitario: 1500, descricao: 'Bate-estacas' },
      { codigo: '02.01', valorTotalContratual: 200000, descricao: 'Perfis' },
    ],
    metadata: {
      retencaoINSS: 3.5,
      outrasDeducoesValor: 120,
      autor: 'Carlos',
    },
  };
  const sanitized = stripFinancialData(sensitiveObj);
  console.log('Sanitized object:', JSON.stringify(sanitized));
  if ('valorTotal' in sanitized || 'valorUnitario' in (sanitized as any).itens[0] || 'valorTotalContratual' in (sanitized as any).itens[1] || 'retencaoINSS' in (sanitized as any).metadata) {
    throw new Error('INTEGRITY VIOLATION: stripFinancialData failed to strip financial keys');
  }
  if ((sanitized as any).numeroSequencial !== 1 || (sanitized as any).itens[0].descricao !== 'Bate-estacas' || (sanitized as any).metadata.autor !== 'Carlos') {
    throw new Error('INTEGRITY VIOLATION: stripFinancialData corrupted non-financial fields');
  }
  console.log('[PASS] stripFinancialData successfully sanitized all financial fields without data corruption.');

  console.log('\n=== ALL FORENSIC INTEGRITY CHECKS PASSED EMPIRICALLY ===');
}

runForensicAudit()
  .catch((e) => {
    console.error('\n❌ AUDIT FAILURE:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
