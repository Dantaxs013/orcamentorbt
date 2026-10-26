/**
 * Challenger M5-R2 Deep Stress & Boundary Verification Script
 * Validates edge cases, strict clock bounds, base64url non-malleability,
 * and middleware dual response consistency.
 */

import { NextRequest } from 'next/server';
import crypto from 'crypto';
import {
  signUserMeta,
  verifyUserMeta,
  USER_META_COOKIE_NAME,
} from '../src/lib/token-utils';
import { middleware, SESSION_COOKIE_NAME } from '../src/middleware';

const SECRET = process.env.SESSION_SECRET || 'rbt_fundacoes_default_secret_key_at_least_32_chars';

async function createSignedTokenWithCustomPayload(payload: any, secret: string = SECRET): Promise<string> {
  const enc = new TextEncoder();
  const jsonStr = JSON.stringify(payload);
  const dataB64 = Buffer.from(jsonStr, 'utf-8').toString('base64url');

  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(dataB64));
  const sigB64 = Buffer.from(sig).toString('base64url');
  return `${dataB64}.${sigB64}`;
}

async function runDeepStress() {
  console.log('========================================================================');
  console.log(' CHALLENGER M5-R2: DEEP STRESS & BOUNDARY EMPIRICAL HARNESS             ');
  console.log('========================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(name: string, condition: boolean, detail?: string) {
    if (condition) {
      passed++;
      console.log(`  ✓ [PASS] ${name}`);
    } else {
      failed++;
      console.error(`  ✗ [FAIL] ${name} ${detail ? `(${detail})` : ''}`);
    }
  }

  // 1. Clock skew precision boundaries
  console.log('--- 1. Clock Skew Precision Boundaries ---');
  const now = Date.now();

  // now + 50s should PASS
  {
    const tok = await createSignedTokenWithCustomPayload({
      userId: 'u1', role: 'ADMIN', email: 'u1@rbt.com.br', acessoOrcamento: true, acessoMedicao: true,
      ts: now + 50_000
    });
    const res = await verifyUserMeta(tok);
    assert('Timestamp at now + 50s (within 60s skew) is accepted', res !== null);
  }

  // now + 60s should PASS (boundary)
  {
    const tok = await createSignedTokenWithCustomPayload({
      userId: 'u1', role: 'ADMIN', email: 'u1@rbt.com.br', acessoOrcamento: true, acessoMedicao: true,
      ts: now + 60_000
    });
    const res = await verifyUserMeta(tok);
    assert('Timestamp at now + 60s exactly is accepted', res !== null);
  }

  // now + 65s must be REJECTED (guaranteed beyond 60s tolerance)
  {
    const tok = await createSignedTokenWithCustomPayload({
      userId: 'u1', role: 'ADMIN', email: 'u1@rbt.com.br', acessoOrcamento: true, acessoMedicao: true,
      ts: Date.now() + 65_000
    });
    const res = await verifyUserMeta(tok);
    assert('Timestamp at now + 65s (beyond 60s skew) is rejected', res === null);
  }

  // now + 61_000ms must be REJECTED
  {
    const tok = await createSignedTokenWithCustomPayload({
      userId: 'u1', role: 'ADMIN', email: 'u1@rbt.com.br', acessoOrcamento: true, acessoMedicao: true,
      ts: Date.now() + 61_000
    });
    const res = await verifyUserMeta(tok);
    assert('Timestamp at now + 61s is strictly rejected', res === null);
  }

  // 12 hours boundary: now - 12h + 1s should PASS
  {
    const tok = await createSignedTokenWithCustomPayload({
      userId: 'u1', role: 'ADMIN', email: 'u1@rbt.com.br', acessoOrcamento: true, acessoMedicao: true,
      ts: now - (12 * 3600 * 1000 - 1000)
    });
    const res = await verifyUserMeta(tok);
    assert('Timestamp at 11h 59m 59s is accepted', res !== null);
  }

  // 12 hours + 1ms must be REJECTED
  {
    const tok = await createSignedTokenWithCustomPayload({
      userId: 'u1', role: 'ADMIN', email: 'u1@rbt.com.br', acessoOrcamento: true, acessoMedicao: true,
      ts: now - (12 * 3600 * 1000 + 1)
    });
    const res = await verifyUserMeta(tok);
    assert('Timestamp at 12h + 1ms is strictly rejected', res === null);
  }

  // 2. Corrupt / Fuzzed Timestamps
  console.log('\n--- 2. Fuzzed & Invalid Timestamp Types ---');
  const badTimestamps = [
    { label: 'Zero (1970-01-01)', val: 0 },
    { label: 'Negative timestamp', val: -100000 },
    { label: 'String timestamp', val: '1792585101631' },
    { label: 'ISO string timestamp', val: '2026-10-21T13:00:00Z' },
    { label: 'Boolean true', val: true },
    { label: 'Boolean false', val: false },
    { label: 'Null', val: null },
    { label: 'NaN', val: NaN },
    { label: 'Infinity', val: Infinity },
    { label: '-Infinity', val: -Infinity },
  ];

  for (const tc of badTimestamps) {
    const tok = await createSignedTokenWithCustomPayload({
      userId: 'u1', role: 'ADMIN', email: 'u1@rbt.com.br', acessoOrcamento: true, acessoMedicao: true,
      ts: tc.val
    });
    const res = await verifyUserMeta(tok);
    assert(`Invalid timestamp [${tc.label}] is strictly rejected`, res === null);
  }

  // 3. Signature Malleability & Format Fuzzing
  console.log('\n--- 3. Signature Malleability & Format Fuzzing ---');
  {
    const validTok = await signUserMeta({
      userId: 'usr_malleable',
      role: 'ADMIN',
      email: 'malleable@rbt.com.br'
    });
    const [d, s] = validTok.split('.');

    // Adding '=' padding to signature
    assert('Signature with appended "=" padding is rejected', (await verifyUserMeta(`${d}.${s}=`)) === null);
    assert('Signature with appended "==" padding is rejected', (await verifyUserMeta(`${d}.${s}==`)) === null);

    // Padding manipulation inside signature
    if (s.includes('-')) {
      const swapped = s.replace(/-/g, '+');
      assert('Signature with non-base64url char "+" is rejected', (await verifyUserMeta(`${d}.${swapped}`)) === null);
    }
    if (s.includes('_')) {
      const swapped = s.replace(/_/g, '/');
      assert('Signature with non-base64url char "/" is rejected', (await verifyUserMeta(`${d}.${swapped}`)) === null);
    }

    // Token format mutations
    assert('Token with no dot is rejected', (await verifyUserMeta(`${d}${s}`)) === null);
    assert('Token with two dots is rejected', (await verifyUserMeta(`${d}.${s}.extra`)) === null);
    assert('Token with only dot is rejected', (await verifyUserMeta('.')) === null);
    assert('Empty token string is rejected', (await verifyUserMeta('')) === null);
    assert('Whitespace token is rejected', (await verifyUserMeta('    ')) === null);
  }

  // 4. Non-object JSON Payloads
  console.log('\n--- 4. Non-object JSON Payloads ---');
  const nonObjectPayloads = [
    { label: 'Array payload', val: ['ADMIN', true, Date.now()] },
    { label: 'Primitive number', val: 123456 },
    { label: 'Primitive string', val: 'ADMIN' },
    { label: 'Primitive boolean', val: true },
    { label: 'Null literal', val: null },
  ];

  for (const nop of nonObjectPayloads) {
    const tok = await createSignedTokenWithCustomPayload(nop.val);
    const res = await verifyUserMeta(tok);
    assert(`Non-object payload [${nop.label}] is safely rejected`, res === null);
  }

  // 5. Edge Middleware Perimeter Tests
  console.log('\n--- 5. Edge Middleware Route Protection Scenarios ---');

  // 5.1 Legitimate legacy session (cookie present, userMetaToken ABSENT) on /dashboard -> PASS (status 200)
  {
    const req = new NextRequest('http://localhost:3000/dashboard', {
      headers: { cookie: `${SESSION_COOKIE_NAME}=legacy_valid_session_cookie` }
    });
    const res = await middleware(req);
    assert('Legacy session without user_meta accesses /dashboard with 200', res.status === 200);
  }

  // 5.2 Legacy session (cookie present, userMetaToken ABSENT) on /medicao/rdp -> REDIRECT 307
  // (legacy sessions do NOT grant medicao access!)
  {
    const req = new NextRequest('http://localhost:3000/medicao/rdp', {
      headers: { cookie: `${SESSION_COOKIE_NAME}=legacy_valid_session_cookie` }
    });
    const res = await middleware(req);
    const loc = res.headers.get('location') || '';
    assert('Legacy session without user_meta blocked from /medicao -> 307 to /login', res.status === 307 && loc.includes('/login'));
  }

  // 5.3 Legitimate dual-access user on /dashboard -> PASS (status 200)
  {
    const validDualToken = await signUserMeta({
      userId: 'u_dual', role: 'ADMIN', email: 'dual@rbt.com.br', acessoOrcamento: true, acessoMedicao: true
    });
    const req = new NextRequest('http://localhost:3000/dashboard', {
      headers: {
        cookie: `${SESSION_COOKIE_NAME}=valid_session; ${USER_META_COOKIE_NAME}=${validDualToken}`
      }
    });
    const res = await middleware(req);
    assert('Legitimate dual user accesses /dashboard with 200', res.status === 200);
  }

  // 5.4 Legitimate dual-access user on /medicao/rdp -> PASS (status 200)
  {
    const validDualToken = await signUserMeta({
      userId: 'u_dual', role: 'ADMIN', email: 'dual@rbt.com.br', acessoOrcamento: true, acessoMedicao: true
    });
    const req = new NextRequest('http://localhost:3000/medicao/rdp', {
      headers: {
        cookie: `${SESSION_COOKIE_NAME}=valid_session; ${USER_META_COOKIE_NAME}=${validDualToken}`
      }
    });
    const res = await middleware(req);
    assert('Legitimate dual user accesses /medicao/rdp with 200', res.status === 200);
  }

  // 5.5 Orcamentos-only user on /medicao/rdp -> REDIRECT to /portal?unauthorized=medicao (307)
  {
    const orcOnlyToken = await signUserMeta({
      userId: 'u_orc', role: 'ORCAMENTISTA', email: 'orc@rbt.com.br', acessoOrcamento: true, acessoMedicao: false
    });
    const req = new NextRequest('http://localhost:3000/medicao/rdp', {
      headers: {
        cookie: `${SESSION_COOKIE_NAME}=valid_session; ${USER_META_COOKIE_NAME}=${orcOnlyToken}`
      }
    });
    const res = await middleware(req);
    const loc = res.headers.get('location') || '';
    assert('Orcamento-only user blocked from /medicao -> 307 to /portal?unauthorized=medicao',
      res.status === 307 && loc.includes('/portal') && loc.includes('unauthorized=medicao'));
  }

  // 5.6 Medicao-only user on /dashboard -> REDIRECT to /portal?unauthorized=orcamentos (307)
  {
    const medOnlyToken = await signUserMeta({
      userId: 'u_med', role: 'APONTADOR', email: 'med@rbt.com.br', acessoOrcamento: false, acessoMedicao: true
    });
    const req = new NextRequest('http://localhost:3000/dashboard', {
      headers: {
        cookie: `${SESSION_COOKIE_NAME}=valid_session; ${USER_META_COOKIE_NAME}=${medOnlyToken}`
      }
    });
    const res = await middleware(req);
    const loc = res.headers.get('location') || '';
    assert('Medicao-only user blocked from /dashboard -> 307 to /portal?unauthorized=orcamentos',
      res.status === 307 && loc.includes('/portal') && loc.includes('unauthorized=orcamentos'));
  }

  // 5.7 Tampered token with session on /medicao/admin -> ASYNC must be 307 redirect to /login
  {
    const fakeToken = 'eyJhbGciOiJIUzI1NiJ9.fake_sig_12345';
    const req = new NextRequest('http://localhost:3000/medicao/admin', {
      headers: {
        cookie: `${SESSION_COOKIE_NAME}=valid_session; ${USER_META_COOKIE_NAME}=${fakeToken}`
      }
    });
    const res = await middleware(req);
    const loc = res.headers.get('location') || '';
    assert('Tampered token on /medicao/admin async redirects to /login', res.status === 307 && loc.includes('/login'));
  }

  // 5.8 Tampered token with session on /medicao/admin -> SYNC must be 307 redirect to /login
  {
    const fakeToken = 'eyJhbGciOiJIUzI1NiJ9.fake_sig_12345';
    const req = new NextRequest('http://localhost:3000/medicao/admin', {
      headers: {
        cookie: `${SESSION_COOKIE_NAME}=valid_session; ${USER_META_COOKIE_NAME}=${fakeToken}`
      }
    });
    const syncRes: any = middleware(req);
    const loc = syncRes.headers?.get('location') || '';
    assert('Tampered token on /medicao/admin sync redirects to /login', syncRes.status === 307 && loc.includes('/login'));
  }

  console.log('\n========================================================================');
  console.log(' DEEP STRESS VERIFICATION SUMMARY                                       ');
  console.log('========================================================================');
  console.log(`  Passed: ${passed}`);
  console.log(`  Failed: ${failed}`);
  console.log('========================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runDeepStress().catch((err) => {
  console.error('Fatal deep stress error:', err);
  process.exit(1);
});
