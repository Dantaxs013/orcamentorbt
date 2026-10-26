import { NextRequest } from 'next/server';
import { POST as loginPost } from '../../../src/app/api/auth/login/route';
import { GET as meGet } from '../../../src/app/api/auth/me/route';
import { POST as logoutPost } from '../../../src/app/api/auth/logout/route';
import { resetRateLimit } from '../../../src/lib/rate-limit';
import { prisma } from '../../../src/lib/db';

async function testApiRoutes() {
  console.log('--- TEST 6: Auth API Routes Verification ---');
  resetRateLimit();

  // 1. Invalid Login
  const badLoginReq = new NextRequest('http://localhost:3000/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'admin@rbt.com.br', password: 'WrongPassword' }),
  });
  const badLoginRes = await loginPost(badLoginReq);
  if (badLoginRes.status !== 401) {
    throw new Error(`INTEGRITY VIOLATION: Login with wrong password returned status ${badLoginRes.status}`);
  }
  console.log('[PASS] Login rejects invalid password with 401.');

  // 2. Valid Login (Admin -> /portal)
  resetRateLimit();
  const adminLoginReq = new NextRequest('http://localhost:3000/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'admin@rbt.com.br', password: 'Rbt@2026' }),
  });
  const adminLoginRes = await loginPost(adminLoginReq);
  if (adminLoginRes.status !== 200) {
    throw new Error(`INTEGRITY VIOLATION: Admin login failed with status ${adminLoginRes.status}`);
  }
  const adminBody = await adminLoginRes.json();
  if (adminBody.redirectUrl !== '/portal') {
    throw new Error(`INTEGRITY VIOLATION: Admin redirectUrl expected /portal, got ${adminBody.redirectUrl}`);
  }
  const setCookieHeaders = adminLoginRes.headers.getSetCookie?.() || [];
  console.log('Admin Set-Cookie headers count:', setCookieHeaders.length);
  const hasOrcamentoCookie = setCookieHeaders.some(h => h.includes('rbt_orcamentos_session='));
  const hasLegacyCookie = setCookieHeaders.some(h => h.includes('rbt_session='));
  const hasMetaCookie = setCookieHeaders.some(h => h.includes('rbt_user_meta='));
  if (!hasOrcamentoCookie || !hasLegacyCookie || !hasMetaCookie) {
    throw new Error('INTEGRITY VIOLATION: Login did not emit all 3 required cookies');
  }
  console.log('[PASS] Admin login returned 200, redirect /portal, and all 3 session/meta cookies.');

  // Extract raw session token for me/logout tests
  const orcamentoCookieStr = setCookieHeaders.find(h => h.includes('rbt_orcamentos_session='))!;
  const rawSessionToken = orcamentoCookieStr.split(';')[0].split('=')[1];

  // 3. Valid Login (Orcamentista -> /dashboard)
  resetRateLimit();
  const orcLoginReq = new NextRequest('http://localhost:3000/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'orcamentista@rbt.com.br', password: 'Rbt@2026' }),
  });
  const orcLoginRes = await loginPost(orcLoginReq);
  const orcBody = await orcLoginRes.json();
  if (orcBody.redirectUrl !== '/dashboard') {
    throw new Error(`INTEGRITY VIOLATION: Orcamentista redirectUrl expected /dashboard, got ${orcBody.redirectUrl}`);
  }
  console.log('[PASS] Orcamentista login returned redirect /dashboard.');

  // 4. Valid Login (Apontador -> /medicao/apontador/rdp)
  resetRateLimit();
  const apLoginReq = new NextRequest('http://localhost:3000/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'apontador@rbtfundacoes.com.br', password: 'Rbt@2026' }),
  });
  const apLoginRes = await loginPost(apLoginReq);
  const apBody = await apLoginRes.json();
  if (apBody.redirectUrl !== '/medicao/apontador/rdp') {
    throw new Error(`INTEGRITY VIOLATION: Apontador redirectUrl expected /medicao/apontador/rdp, got ${apBody.redirectUrl}`);
  }
  console.log('[PASS] Apontador login returned redirect /medicao/apontador/rdp.');

  // 5. Valid Login (Engenheiro -> /medicao/engenheiro/validacao)
  resetRateLimit();
  const engLoginReq = new NextRequest('http://localhost:3000/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'engenheiro@rbtfundacoes.com.br', password: 'Rbt@2026' }),
  });
  const engLoginRes = await loginPost(engLoginReq);
  const engBody = await engLoginRes.json();
  if (engBody.redirectUrl !== '/medicao/engenheiro/validacao') {
    throw new Error(`INTEGRITY VIOLATION: Engenheiro redirectUrl expected /medicao/engenheiro/validacao, got ${engBody.redirectUrl}`);
  }
  console.log('[PASS] Engenheiro login returned redirect /medicao/engenheiro/validacao.');

  // 6. Test /api/auth/me without cookies
  const meNoCookieReq = new NextRequest('http://localhost:3000/api/auth/me');
  const meNoCookieRes = await meGet(meNoCookieReq);
  if (meNoCookieRes.status !== 401) {
    throw new Error(`INTEGRITY VIOLATION: /api/auth/me without cookies returned ${meNoCookieRes.status}`);
  }
  console.log('[PASS] /api/auth/me without cookies returns 401.');

  // 7. Test /api/auth/me with primary cookie
  const meValidReq = new NextRequest('http://localhost:3000/api/auth/me', {
    headers: { cookie: `rbt_orcamentos_session=${rawSessionToken}` },
  });
  const meValidRes = await meGet(meValidReq);
  if (meValidRes.status !== 200) {
    throw new Error(`INTEGRITY VIOLATION: /api/auth/me with primary cookie returned ${meValidRes.status}`);
  }
  const meBody = await meValidRes.json();
  if (!meBody.authenticated || meBody.user.email !== 'admin@rbt.com.br') {
    throw new Error(`INTEGRITY VIOLATION: /api/auth/me body invalid: ${JSON.stringify(meBody)}`);
  }
  console.log('[PASS] /api/auth/me with primary cookie returns authenticated user.');

  // 8. Test /api/auth/me with legacy cookie
  const meLegacyReq = new NextRequest('http://localhost:3000/api/auth/me', {
    headers: { cookie: `rbt_session=${rawSessionToken}` },
  });
  const meLegacyRes = await meGet(meLegacyReq);
  if (meLegacyRes.status !== 200) {
    throw new Error(`INTEGRITY VIOLATION: /api/auth/me with legacy cookie returned ${meLegacyRes.status}`);
  }
  console.log('[PASS] /api/auth/me with legacy cookie returns authenticated user.');

  // 9. Test /api/auth/logout
  const logoutReq = new NextRequest('http://localhost:3000/api/auth/logout', {
    method: 'POST',
    headers: { cookie: `rbt_orcamentos_session=${rawSessionToken}` },
  });
  const logoutRes = await logoutPost(logoutReq);
  if (logoutRes.status !== 200) {
    throw new Error(`INTEGRITY VIOLATION: /api/auth/logout returned ${logoutRes.status}`);
  }
  // Verify session is now invalid
  const meAfterLogoutReq = new NextRequest('http://localhost:3000/api/auth/me', {
    headers: { cookie: `rbt_orcamentos_session=${rawSessionToken}` },
  });
  const meAfterLogoutRes = await meGet(meAfterLogoutReq);
  if (meAfterLogoutRes.status !== 401) {
    throw new Error(`INTEGRITY VIOLATION: Session still valid after logout!`);
  }
  console.log('[PASS] Logout destroyed session and subsequent /api/auth/me returns 401.');

  console.log('\n=== ALL API AUTH CHECKS PASSED EMPIRICALLY ===');
}

testApiRoutes()
  .catch((e) => {
    console.error('\n❌ API AUDIT FAILURE:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
