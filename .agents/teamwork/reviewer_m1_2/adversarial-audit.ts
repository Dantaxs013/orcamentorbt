import { signUserMeta, verifyUserMeta, USER_META_COOKIE_NAME } from '../../../src/lib/token-utils';
import { hashToken, createSession, validateSession, destroySession, buildSessionCookies, buildClearSessionCookies } from '../../../src/lib/session';
import { checkRateLimit, resetRateLimit, getClientIp } from '../../../src/lib/rate-limit';
import { hashPassword, verifyPassword, stripFinancialData, FINANCIAL_KEYS } from '../../../src/lib/auth';
import { prisma } from '../../../src/lib/db';
import { NextRequest } from 'next/server';

async function runAdversarialAudit() {
  console.log('=== STARTING ADVERSARIAL STRESS TEST ===\n');

  let passed = 0;
  let failed = 0;

  function assert(cond: boolean, desc: string) {
    if (cond) {
      console.log(`[PASS] ${desc}`);
      passed++;
    } else {
      console.error(`[FAIL] ${desc}`);
      failed++;
    }
  }

  // 1. Token Tampering
  console.log('--- 1. Cryptographic HMAC Token Attacks ---');
  const validToken = await signUserMeta({
    userId: 'user_123',
    role: 'ORCAMENTISTA',
    email: 'test@rbt.com.br',
    acessoOrcamento: true,
    acessoMedicao: false,
  });

  const verified = await verifyUserMeta(validToken);
  assert(verified !== null && verified.userId === 'user_123', 'Valid token verifies correctly');

  // Payload tampering
  const [dataB64, sigB64] = validToken.split('.');
  const decoded = JSON.parse(Buffer.from(dataB64, 'base64url').toString('utf8'));
  decoded.acessoMedicao = true; // Attacker grants itself medicao access
  const tamperedDataB64 = Buffer.from(JSON.stringify(decoded)).toString('base64url');
  const tamperedToken = `${tamperedDataB64}.${sigB64}`;
  const tamperedVerified = await verifyUserMeta(tamperedToken);
  assert(tamperedVerified === null, 'Tampered payload is rejected by HMAC verify');

  // Signature bit flip
  const sigBuffer = Buffer.from(sigB64, 'base64url');
  sigBuffer[0] ^= 0xff; // Flip first byte
  const corruptedSigB64 = sigBuffer.toString('base64url');
  const corruptedToken = `${dataB64}.${corruptedSigB64}`;
  const corruptedVerified = await verifyUserMeta(corruptedToken);
  assert(corruptedVerified === null, 'Bit-flipped signature is rejected');

  // Truncated signature
  const truncatedToken = `${dataB64}.${sigB64.slice(0, 10)}`;
  const truncatedVerified = await verifyUserMeta(truncatedToken);
  assert(truncatedVerified === null, 'Truncated signature is rejected');

  // Empty string / invalid inputs
  assert((await verifyUserMeta('')) === null, 'Empty token returns null');
  assert((await verifyUserMeta('invalid.token.structure')) === null, '3-part token returns null');
  assert((await verifyUserMeta('nodotsatall')) === null, '0-dot token returns null');
  assert((await verifyUserMeta(null)) === null, 'Null returns null');
  assert((await verifyUserMeta(undefined)) === null, 'Undefined returns null');

  // NextRequest compatibility
  const mockReq = {
    cookies: {
      get: (name: string) => (name === USER_META_COOKIE_NAME ? { value: validToken } : undefined),
    },
  };
  const verifiedFromReq = await verifyUserMeta(mockReq as any);
  assert(verifiedFromReq !== null && verifiedFromReq.email === 'test@rbt.com.br', 'verifyUserMeta accepts NextRequest cookies object');

  // 2. Cookie Security
  console.log('\n--- 2. Cookie Security Header Audit ---');
  const cookies = await buildSessionCookies('test_token_xyz', {
    id: 'usr_1',
    role: 'ADMIN',
    email: 'admin@rbt.com.br',
    acessoOrcamento: true,
    acessoMedicao: true,
  });

  assert(cookies.length === 3, 'buildSessionCookies returns exactly 3 cookies');
  const orcCookie = cookies.find(c => c.startsWith('rbt_orcamentos_session='));
  const legCookie = cookies.find(c => c.startsWith('rbt_session='));
  const metaCookie = cookies.find(c => c.startsWith('rbt_user_meta='));

  assert(Boolean(orcCookie), 'rbt_orcamentos_session emitted');
  assert(Boolean(legCookie), 'rbt_session emitted');
  assert(Boolean(metaCookie), 'rbt_user_meta emitted');

  for (const c of cookies) {
    assert(c.includes('HttpOnly'), `Cookie ${c.split('=')[0]} contains HttpOnly`);
    assert(c.includes('SameSite=Lax'), `Cookie ${c.split('=')[0]} contains SameSite=Lax`);
    assert(c.includes('Path=/'), `Cookie ${c.split('=')[0]} contains Path=/`);
    assert(c.includes('Max-Age=43200'), `Cookie ${c.split('=')[0]} has 12h Max-Age`);
  }

  const clearCookies = buildClearSessionCookies();
  assert(clearCookies.length === 3, 'buildClearSessionCookies returns 3 cookies');
  for (const c of clearCookies) {
    assert(c.includes('Max-Age=0'), `Clear cookie ${c.split('=')[0]} has Max-Age=0`);
    assert(c.includes('Expires=Thu, 01 Jan 1970 00:00:00 GMT'), `Clear cookie has past expiry`);
  }

  // 3. Financial Data Stripping for APONTADOR
  console.log('\n--- 3. Financial Data Stripping Security ---');
  const complexContract = {
    id: 'ctr_1',
    numeroContrato: 'CTR-001',
    valorTotalContratual: 500000,
    retencaoINSS: 3.5,
    retencaoISS: 5.0,
    descricao: 'Obra de fundações',
    itens: [
      {
        id: 'item_1',
        descricao: 'Estaca W150',
        valorUnitario: 250,
        valorTotal: 25000,
        quantidadeContratada: 100,
      },
    ],
  };

  const stripped = stripFinancialData(complexContract) as any;
  assert(stripped.valorTotalContratual === undefined, 'valorTotalContratual stripped');
  assert(stripped.retencaoINSS === undefined, 'retencaoINSS stripped');
  assert(stripped.retencaoISS === undefined, 'retencaoISS stripped');
  assert(stripped.itens[0].valorUnitario === undefined, 'itens[0].valorUnitario stripped');
  assert(stripped.itens[0].valorTotal === undefined, 'itens[0].valorTotal stripped');
  assert(stripped.itens[0].descricao === 'Estaca W150', 'Non-financial description preserved');
  assert(stripped.itens[0].quantidadeContratada === 100, 'Non-financial quantity preserved');

  // 4. Rate Limiting sliding window
  console.log('\n--- 4. Rate Limiting Edge Cases ---');
  const testKey = 'test_ip_' + Date.now();
  resetRateLimit(testKey);

  for (let i = 1; i <= 5; i++) {
    const res = checkRateLimit(testKey, 5, 10000);
    assert(res.allowed === true && res.remaining === 5 - i, `Call ${i} allowed, remaining: ${5 - i}`);
  }
  const blocked = checkRateLimit(testKey, 5, 10000);
  assert(blocked.allowed === false, 'Call 6 is blocked');
  assert(blocked.retryAfterSeconds > 0, `retryAfterSeconds is ${blocked.retryAfterSeconds}`);

  // Test client IP extraction
  const reqWithMultipleIps = new NextRequest('http://localhost:3000/api/auth/login', {
    headers: { 'x-forwarded-for': '203.0.113.195, 70.41.3.18, 150.172.238.178' },
  });
  const extractedIp = getClientIp(reqWithMultipleIps);
  assert(extractedIp === '203.0.113.195', `Extracts first IP from x-forwarded-for: ${extractedIp}`);

  // 5. Database Records & Integrity
  console.log('\n--- 5. Database Records & Integrity Verification ---');
  const users = await prisma.user.findMany({
    select: {
      email: true,
      role: true,
      acessoOrcamento: true,
      acessoMedicao: true,
      sessions: true,
    },
  });

  assert(users.length >= 4, `At least 4 seeded users found: ${users.length}`);
  for (const u of users) {
    assert(typeof u.acessoOrcamento === 'boolean', `${u.email} has boolean acessoOrcamento`);
    assert(typeof u.acessoMedicao === 'boolean', `${u.email} has boolean acessoMedicao`);
  }

  // Session create & validate & destroy lifecycle
  const testUser = users[0];
  const dbUser = await prisma.user.findUnique({ where: { email: testUser.email } });
  const rawSessionToken = await createSession(dbUser!.id, { ipAddress: '127.0.0.1', userAgent: 'AdversarialTest/1.0' });
  assert(typeof rawSessionToken === 'string' && rawSessionToken.length === 64, 'Raw session token is 64 hex chars (32 bytes)');

  const validSessionRes = await validateSession(rawSessionToken);
  assert(validSessionRes !== null, 'Created session validates successfully against DB');
  assert(validSessionRes!.user.email === testUser.email, 'Validated session user email matches');
  assert(validSessionRes!.user.acessoOrcamento === testUser.acessoOrcamento, 'acessoOrcamento matches DB');
  assert(validSessionRes!.user.acessoMedicao === testUser.acessoMedicao, 'acessoMedicao matches DB');

  const destroyed = await destroySession(rawSessionToken);
  assert(destroyed === true, 'Session destroyed successfully');
  const revalidated = await validateSession(rawSessionToken);
  assert(revalidated === null, 'Destroyed session is invalid');

  console.log(`\n=== ADVERSARIAL AUDIT SUMMARY ===`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);

  if (failed > 0) {
    process.exit(1);
  }
}

runAdversarialAudit().catch((err) => {
  console.error('Fatal in adversarial audit:', err);
  process.exit(1);
});
