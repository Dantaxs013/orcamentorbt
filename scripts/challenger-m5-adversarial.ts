/**
 * Challenger M5-1: Empirical Adversarial Token & Edge Authentication Suite
 * Portal Unificado RBT Fundações — Gestão de Orçamentos + Medição Diária (RDP)
 * Milestone M5: Route Protection Middleware & Permission Enforcement
 *
 * Adversarial Testing Scope:
 * 1. Bit-flip privilege escalation in claims payload (acessoOrcamento: false -> true, role: APONTADOR -> ADMIN).
 * 2. Signature truncation and character tampering.
 * 3. Secret substitution (signed with unauthorized key).
 * 4. Expired token replay (>12 hours).
 * 5. Future timestamp drift.
 * 6. Malformed/oversized payload injection (50KB).
 * 7. Edge Middleware integration: Confirm all adversarial attempts fail verification and redirect to /login.
 */

import { NextRequest } from 'next/server';
import crypto from 'crypto';
import {
  signUserMeta,
  verifyUserMeta,
  USER_META_COOKIE_NAME,
  UserMetaClaims,
} from '../src/lib/token-utils';
import { middleware, SESSION_COOKIE_NAME } from '../src/middleware';

const DEFAULT_SECRET = process.env.SESSION_SECRET || 'rbt_fundacoes_default_secret_key_at_least_32_chars';

interface AdversarialResult {
  id: string;
  category: string;
  name: string;
  passed: boolean;
  verdict: 'PASS' | 'FAIL' | 'VULNERABILITY' | 'HARDENED';
  details: string;
  attackPayload?: string;
  durationMs: number;
}

const results: AdversarialResult[] = [];

function record(res: AdversarialResult) {
  results.push(res);
  const icon = res.passed ? '✓' : '✗';
  console.log(`  ${icon} [${res.verdict}] ${res.category} :: ${res.name} (${res.durationMs.toFixed(2)}ms)`);
  if (!res.passed || res.verdict === 'VULNERABILITY') {
    console.error(`      ALERT: ${res.details}`);
    if (res.attackPayload) {
      const truncated = res.attackPayload.length > 120 ? res.attackPayload.slice(0, 120) + '...[truncated]' : res.attackPayload;
      console.error(`      PAYLOAD: ${truncated}`);
    }
  }
}

// Helper to manually create HMAC-SHA256 signed token using crypto.subtle (Edge compatible)
async function createCustomSignedToken(claims: Record<string, any>, secret: string = DEFAULT_SECRET): Promise<string> {
  const enc = new TextEncoder();
  const jsonStr = JSON.stringify(claims);
  const dataB64 = Buffer.from(jsonStr, 'utf-8').toString('base64url');

  let sigB64 = '';
  try {
    const key = await crypto.subtle.importKey(
      'raw',
      enc.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    const sig = await crypto.subtle.sign('HMAC', key, enc.encode(dataB64));
    sigB64 = Buffer.from(sig).toString('base64url');
  } catch {
    sigB64 = 'invalid_due_to_unsupported_key';
  }

  return `${dataB64}.${sigB64}`;
}

async function runAdversarialM5Suite() {
  const startTotal = performance.now();
  console.log('========================================================================');
  console.log(' CHALLENGER M5-1: EMPIRICAL ADVERSARIAL TOKEN & EDGE AUTH SUITE         ');
  console.log('========================================================================\n');

  // =========================================================================
  // VECTOR 1: Bit-flip & Privilege Escalation in Claims Payload
  // =========================================================================
  console.log('--- VECTOR 1: Bit-Flip & Privilege Escalation in Claims Payload ---');

  // 1.1 Flipping acessoOrcamento: false -> true
  {
    const start = performance.now();
    const legitimateToken = await signUserMeta({
      userId: 'usr_apontador_01',
      role: 'APONTADOR',
      email: 'apontador@rbt.com.br',
      acessoOrcamento: false,
      acessoMedicao: true,
    });

    const [dataB64, sigB64] = legitimateToken.split('.');
    const decoded = JSON.parse(Buffer.from(dataB64, 'base64url').toString('utf8'));
    decoded.acessoOrcamento = true; // Bit-flip privilege escalation
    const tamperedDataB64 = Buffer.from(JSON.stringify(decoded), 'utf8').toString('base64url');
    const attackToken = `${tamperedDataB64}.${sigB64}`;

    const verified = await verifyUserMeta(attackToken);
    const passed = verified === null;

    record({
      id: 'ADV-ESC-01',
      category: 'Privilege Escalation',
      name: 'Payload tampering (acessoOrcamento: false -> true) rejected by verifyUserMeta',
      passed,
      verdict: passed ? 'PASS' : 'VULNERABILITY',
      details: passed ? 'HMAC mismatch rejected payload escalation' : 'CRITICAL: Tampered acessoOrcamento accepted!',
      attackPayload: attackToken,
      durationMs: performance.now() - start,
    });
  }

  // 1.2 Flipping role: APONTADOR -> ADMIN
  {
    const start = performance.now();
    const legitimateToken = await signUserMeta({
      userId: 'usr_apontador_02',
      role: 'APONTADOR',
      email: 'field@rbt.com.br',
      acessoOrcamento: false,
      acessoMedicao: true,
    });

    const [dataB64, sigB64] = legitimateToken.split('.');
    const decoded = JSON.parse(Buffer.from(dataB64, 'base64url').toString('utf8'));
    decoded.role = 'ADMIN'; // Elevating role to administrator
    const tamperedDataB64 = Buffer.from(JSON.stringify(decoded), 'utf8').toString('base64url');
    const attackToken = `${tamperedDataB64}.${sigB64}`;

    const verified = await verifyUserMeta(attackToken);
    const passed = verified === null;

    record({
      id: 'ADV-ESC-02',
      category: 'Privilege Escalation',
      name: 'Payload role escalation (APONTADOR -> ADMIN) rejected by verifyUserMeta',
      passed,
      verdict: passed ? 'PASS' : 'VULNERABILITY',
      details: passed ? 'HMAC mismatch caught role elevation' : 'CRITICAL: Role elevation accepted!',
      attackPayload: attackToken,
      durationMs: performance.now() - start,
    });
  }

  // 1.3 Flipping acessoMedicao: false -> true
  {
    const start = performance.now();
    const legitimateToken = await signUserMeta({
      userId: 'usr_orcamentista_01',
      role: 'ORCAMENTISTA',
      email: 'orc@rbt.com.br',
      acessoOrcamento: true,
      acessoMedicao: false,
    });

    const [dataB64, sigB64] = legitimateToken.split('.');
    const decoded = JSON.parse(Buffer.from(dataB64, 'base64url').toString('utf8'));
    decoded.acessoMedicao = true; // Escalating to Medição
    const tamperedDataB64 = Buffer.from(JSON.stringify(decoded), 'utf8').toString('base64url');
    const attackToken = `${tamperedDataB64}.${sigB64}`;

    const verified = await verifyUserMeta(attackToken);
    const passed = verified === null;

    record({
      id: 'ADV-ESC-03',
      category: 'Privilege Escalation',
      name: 'Payload tampering (acessoMedicao: false -> true) rejected by verifyUserMeta',
      passed,
      verdict: passed ? 'PASS' : 'VULNERABILITY',
      details: passed ? 'HMAC mismatch rejected access escalation' : 'CRITICAL: acessoMedicao escalation accepted!',
      attackPayload: attackToken,
      durationMs: performance.now() - start,
    });
  }

  // 1.4 User ID Identity Spoofing
  {
    const start = performance.now();
    const legitimateToken = await signUserMeta({
      userId: 'usr_low_perm',
      role: 'APONTADOR',
      email: 'low@rbt.com.br',
      acessoOrcamento: false,
      acessoMedicao: true,
    });

    const [dataB64, sigB64] = legitimateToken.split('.');
    const decoded = JSON.parse(Buffer.from(dataB64, 'base64url').toString('utf8'));
    decoded.userId = 'usr_super_admin_uuid';
    const tamperedDataB64 = Buffer.from(JSON.stringify(decoded), 'utf8').toString('base64url');
    const attackToken = `${tamperedDataB64}.${sigB64}`;

    const verified = await verifyUserMeta(attackToken);
    const passed = verified === null;

    record({
      id: 'ADV-ESC-04',
      category: 'Privilege Escalation',
      name: 'Identity spoofing (userId swap in claims) rejected by verifyUserMeta',
      passed,
      verdict: passed ? 'PASS' : 'VULNERABILITY',
      details: passed ? 'HMAC prevented identity spoofing' : 'CRITICAL: Spoofed identity accepted!',
      attackPayload: attackToken,
      durationMs: performance.now() - start,
    });
  }

  // =========================================================================
  // VECTOR 2: Signature Truncation and Character Tampering
  // =========================================================================
  console.log('\n--- VECTOR 2: Signature Truncation & Character Tampering ---');

  const baseToken = await signUserMeta({
    userId: 'usr_test_sig',
    role: 'ADMIN',
    email: 'test@rbt.com.br',
    acessoOrcamento: true,
    acessoMedicao: true,
  });
  const [dataPart, sigPart] = baseToken.split('.');

  // 2.1 Single character bit-flip at index 0
  {
    const start = performance.now();
    const flippedChar = sigPart[0] === 'a' ? 'b' : 'a';
    const attackToken = `${dataPart}.${flippedChar}${sigPart.slice(1)}`;
    const verified = await verifyUserMeta(attackToken);
    const passed = verified === null;

    record({
      id: 'ADV-SIG-01',
      category: 'Signature Tampering',
      name: 'Single character bit-flip at signature index 0 rejected',
      passed,
      verdict: passed ? 'PASS' : 'VULNERABILITY',
      details: passed ? 'crypto.subtle.verify returned false' : 'Signature flip at index 0 accepted!',
      attackPayload: attackToken,
      durationMs: performance.now() - start,
    });
  }

  // 2.2 Single character bit-flip at signature midpoint
  {
    const start = performance.now();
    const mid = Math.floor(sigPart.length / 2);
    const flippedChar = sigPart[mid] === 'z' ? 'y' : 'z';
    const attackToken = `${dataPart}.${sigPart.slice(0, mid)}${flippedChar}${sigPart.slice(mid + 1)}`;
    const verified = await verifyUserMeta(attackToken);
    const passed = verified === null;

    record({
      id: 'ADV-SIG-02',
      category: 'Signature Tampering',
      name: 'Single character bit-flip at signature midpoint rejected',
      passed,
      verdict: passed ? 'PASS' : 'VULNERABILITY',
      details: passed ? 'crypto.subtle.verify returned false' : 'Signature flip at midpoint accepted!',
      attackPayload: attackToken,
      durationMs: performance.now() - start,
    });
  }

  // 2.3 Single character bit-flip at signature last character
  {
    const start = performance.now();
    const last = sigPart.length - 1;
    const flippedChar = sigPart[last] === 'm' ? 'n' : 'm';
    const attackToken = `${dataPart}.${sigPart.slice(0, last)}${flippedChar}`;
    const verified = await verifyUserMeta(attackToken);
    const passed = verified === null;

    record({
      id: 'ADV-SIG-03',
      category: 'Signature Tampering',
      name: 'Single character bit-flip at signature end rejected',
      passed,
      verdict: passed ? 'PASS' : 'VULNERABILITY',
      details: passed ? 'crypto.subtle.verify returned false' : 'Signature flip at end accepted!',
      attackPayload: attackToken,
      durationMs: performance.now() - start,
    });
  }

  // 2.4 Signature Truncation to 0, 4, 16, 32 characters
  const truncLengths = [0, 4, 16, 32];
  for (const len of truncLengths) {
    const start = performance.now();
    const truncatedSig = sigPart.slice(0, len);
    const attackToken = `${dataPart}.${truncatedSig}`;
    const verified = await verifyUserMeta(attackToken);
    const passed = verified === null;

    record({
      id: `ADV-SIG-04-${len}`,
      category: 'Signature Tampering',
      name: `Signature truncated to ${len} characters rejected`,
      passed,
      verdict: passed ? 'PASS' : 'VULNERABILITY',
      details: passed ? 'Truncated signature rejected by cryptographic validation' : `Truncated sig (${len} chars) accepted!`,
      attackPayload: attackToken,
      durationMs: performance.now() - start,
    });
  }

  // 2.5 All-zero null bytes signature
  {
    const start = performance.now();
    const zeroSig = Buffer.alloc(32, 0).toString('base64url');
    const attackToken = `${dataPart}.${zeroSig}`;
    const verified = await verifyUserMeta(attackToken);
    const passed = verified === null;

    record({
      id: 'ADV-SIG-05',
      category: 'Signature Tampering',
      name: 'All-zero null bytes signature rejected',
      passed,
      verdict: passed ? 'PASS' : 'VULNERABILITY',
      details: passed ? 'Null-byte signature rejected' : 'Null-byte signature accepted!',
      attackPayload: attackToken,
      durationMs: performance.now() - start,
    });
  }

  // =========================================================================
  // VECTOR 3: Secret Substitution (Signed with Unauthorized Key)
  // =========================================================================
  console.log('\n--- VECTOR 3: Secret Substitution (Unauthorized Key) ---');

  const unauthorizedSecrets = [
    { name: 'Attacker foreign 256-bit secret key', secret: 'attacker_unauthorized_key_98765432101234567890' },
    { name: 'Standard default weak key "secret"', secret: 'secret' },
    { name: 'Null string secret ""', secret: '' },
    { name: 'Public well-known HMAC key "password"', secret: 'password' },
    { name: 'Similar key with single character swapped', secret: DEFAULT_SECRET.slice(0, -1) + 'X' },
  ];

  for (let i = 0; i < unauthorizedSecrets.length; i++) {
    const item = unauthorizedSecrets[i];
    const start = performance.now();
    const forgedToken = await createCustomSignedToken(
      {
        userId: 'usr_imposter',
        role: 'ADMIN',
        email: 'imposter@attacker.com',
        acessoOrcamento: true,
        acessoMedicao: true,
        ts: Date.now(),
      },
      item.secret
    );

    const verified = await verifyUserMeta(forgedToken);
    const passed = verified === null;

    record({
      id: `ADV-KEY-0${i + 1}`,
      category: 'Secret Substitution',
      name: `Foreign key (${item.name}) rejected`,
      passed,
      verdict: passed ? 'PASS' : 'VULNERABILITY',
      details: passed ? 'Key isolation strictly enforced' : `CRITICAL: Foreign key signature accepted!`,
      attackPayload: forgedToken,
      durationMs: performance.now() - start,
    });
  }

  // =========================================================================
  // VECTOR 4: Expired Token Replay (>12 Hours)
  // =========================================================================
  console.log('\n--- VECTOR 4: Expired Token Replay (>12 Hours) ---');

  const maxAgeMs = 12 * 60 * 60 * 1000;

  // 4.1 Token 12h + 1 second ago
  {
    const start = performance.now();
    const expiredTs = Date.now() - (maxAgeMs + 1000);
    const expiredToken = await createCustomSignedToken({
      userId: 'usr_expired_01',
      role: 'ADMIN',
      email: 'expired@rbt.com.br',
      acessoOrcamento: true,
      acessoMedicao: true,
      ts: expiredTs,
    });

    const verified = await verifyUserMeta(expiredToken);
    const passed = verified === null;

    record({
      id: 'ADV-TIME-01',
      category: 'Token Expiration',
      name: 'Token at 12 hours + 1s expired threshold rejected',
      passed,
      verdict: passed ? 'PASS' : 'VULNERABILITY',
      details: passed ? 'Expired token boundary enforced' : 'CRITICAL: Expired token accepted!',
      attackPayload: expiredToken,
      durationMs: performance.now() - start,
    });
  }

  // 4.2 Token 24 hours ago
  {
    const start = performance.now();
    const expiredTs = Date.now() - 24 * 60 * 60 * 1000;
    const expiredToken = await createCustomSignedToken({
      userId: 'usr_expired_24h',
      role: 'ADMIN',
      email: 'expired24h@rbt.com.br',
      acessoOrcamento: true,
      acessoMedicao: true,
      ts: expiredTs,
    });

    const verified = await verifyUserMeta(expiredToken);
    const passed = verified === null;

    record({
      id: 'ADV-TIME-02',
      category: 'Token Expiration',
      name: 'Token 24 hours old rejected',
      passed,
      verdict: passed ? 'PASS' : 'VULNERABILITY',
      details: passed ? 'Expired token rejected' : 'Expired token accepted!',
      attackPayload: expiredToken,
      durationMs: performance.now() - start,
    });
  }

  // 4.3 Token 7 days ago
  {
    const start = performance.now();
    const expiredTs = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const expiredToken = await createCustomSignedToken({
      userId: 'usr_expired_7d',
      role: 'ADMIN',
      email: 'expired7d@rbt.com.br',
      acessoOrcamento: true,
      acessoMedicao: true,
      ts: expiredTs,
    });

    const verified = await verifyUserMeta(expiredToken);
    const passed = verified === null;

    record({
      id: 'ADV-TIME-03',
      category: 'Token Expiration',
      name: 'Ancient token (7 days old) rejected',
      passed,
      verdict: passed ? 'PASS' : 'VULNERABILITY',
      details: passed ? 'Ancient token rejected' : 'Ancient token accepted!',
      attackPayload: expiredToken,
      durationMs: performance.now() - start,
    });
  }

  // =========================================================================
  // VECTOR 5: Future Timestamp Drift
  // =========================================================================
  console.log('\n--- VECTOR 5: Future Timestamp Drift ---');

  const futureDriftCases = [
    { name: 'Drift 5 minutes in future (+300s)', offsetMs: 5 * 60 * 1000 },
    { name: 'Drift 1 hour in future (+3600s)', offsetMs: 60 * 60 * 1000 },
    { name: 'Drift 24 hours in future (+1 day)', offsetMs: 24 * 60 * 60 * 1000 },
    { name: 'Drift 30 days in future (+30 days)', offsetMs: 30 * 24 * 60 * 60 * 1000 },
    { name: 'Drift 1 year in future (+365 days)', offsetMs: 365 * 24 * 60 * 60 * 1000 },
  ];

  for (let i = 0; i < futureDriftCases.length; i++) {
    const item = futureDriftCases[i];
    const start = performance.now();
    const futureTs = Date.now() + item.offsetMs;
    const futureToken = await createCustomSignedToken({
      userId: 'usr_timetraveler',
      role: 'ADMIN',
      email: 'future@rbt.com.br',
      acessoOrcamento: true,
      acessoMedicao: true,
      ts: futureTs,
    });

    const verified = await verifyUserMeta(futureToken);
    // Security Expectation: A token stamped in the future (beyond clock skew tolerance ~60s)
    // MUST BE REJECTED to prevent eternal immortality tokens.
    const passed = verified === null;

    record({
      id: `ADV-FUTURE-0${i + 1}`,
      category: 'Timestamp Drift',
      name: `Future timestamp drift: ${item.name}`,
      passed,
      verdict: passed ? 'PASS' : 'VULNERABILITY',
      details: passed
        ? 'Future timestamp drift successfully rejected'
        : `VULNERABILITY: Token with future timestamp accepted! (ts: +${item.offsetMs / 1000}s, claims returned: ${JSON.stringify(verified)})`,
      attackPayload: futureToken,
      durationMs: performance.now() - start,
    });
  }

  // =========================================================================
  // VECTOR 6: Malformed / Oversized Payload Injection (50KB & Fuzzing)
  // =========================================================================
  console.log('\n--- VECTOR 6: Malformed / Oversized Payload Injection ---');

  // 6.1 Oversized 50KB payload
  {
    const start = performance.now();
    const largeString = 'A'.repeat(50 * 1024); // 50 KB of data
    const oversizedClaims = {
      userId: 'usr_oversized_50k',
      role: 'ADMIN',
      email: 'oversized@rbt.com.br',
      acessoOrcamento: true,
      acessoMedicao: true,
      ts: Date.now(),
      blob: largeString,
    };
    const oversizedToken = await createCustomSignedToken(oversizedClaims);
    let verified: any = null;
    let threw = false;
    let errorMsg = '';
    try {
      verified = await verifyUserMeta(oversizedToken);
    } catch (e: any) {
      threw = true;
      errorMsg = e.message;
    }

    // Check whether system handled or if cookie size limits / parsing should reject or handle gracefully
    const passed = !threw; // Should not crash Node/Edge process with unhandled OOM or fatal error

    record({
      id: 'ADV-SIZE-01',
      category: 'Payload Injection',
      name: '50KB oversized payload injection handled safely without crash',
      passed,
      verdict: passed ? 'PASS' : 'FAIL',
      details: passed
        ? `Handled safely without crash (returned ${verified ? 'claims' : 'null'})`
        : `Unhandled crash on 50KB payload: ${errorMsg}`,
      durationMs: performance.now() - start,
    });
  }

  // 6.2 50KB oversized payload with corrupted HMAC signature
  {
    const start = performance.now();
    const largeString = 'B'.repeat(50 * 1024);
    const oversizedClaims = {
      userId: 'usr_oversized_50k_corrupt',
      role: 'ADMIN',
      blob: largeString,
      ts: Date.now(),
    };
    const token = await createCustomSignedToken(oversizedClaims);
    const [dataPartLarge] = token.split('.');
    const corruptedAttackToken = `${dataPartLarge}.corruptedSignatureHere1234567890`;

    const verified = await verifyUserMeta(corruptedAttackToken);
    const passed = verified === null;

    record({
      id: 'ADV-SIZE-02',
      category: 'Payload Injection',
      name: '50KB oversized payload with invalid HMAC rejected cleanly',
      passed,
      verdict: passed ? 'PASS' : 'FAIL',
      details: passed ? 'Oversized tampered token rejected' : 'Oversized corrupted token accepted!',
      durationMs: performance.now() - start,
    });
  }

  // 6.3 Corrupted Base64 / Invalid JSON injection
  {
    const start = performance.now();
    const malformedToken = 'not_base64_json!@#$%^&*().some_valid_looking_signature';
    const verified = await verifyUserMeta(malformedToken);
    const passed = verified === null;

    record({
      id: 'ADV-FUZZ-01',
      category: 'Payload Injection',
      name: 'Malformed non-base64 token string rejected cleanly',
      passed,
      verdict: passed ? 'PASS' : 'FAIL',
      details: passed ? 'Safely rejected with null' : 'Malformed token accepted!',
      durationMs: performance.now() - start,
    });
  }

  // 6.4 Deeply nested JSON injection
  {
    const start = performance.now();
    let nestedObj: any = { value: 'leaf' };
    for (let i = 0; i < 100; i++) {
      nestedObj = { child: nestedObj };
    }
    const nestedToken = await createCustomSignedToken({
      userId: 'usr_nested',
      role: 'ADMIN',
      ts: Date.now(),
      nested: nestedObj,
    });
    const verified = await verifyUserMeta(nestedToken);
    const passed = verified !== null && verified.userId === 'usr_nested';

    record({
      id: 'ADV-FUZZ-02',
      category: 'Payload Injection',
      name: '100-level nested JSON payload handled without stack overflow',
      passed,
      verdict: passed ? 'PASS' : 'FAIL',
      details: passed ? 'Nested JSON parsed safely' : 'Failed on nested JSON',
      durationMs: performance.now() - start,
    });
  }

  // =========================================================================
  // VECTOR 7: Edge Middleware Redirection & Authentication Enforcement
  // =========================================================================
  console.log('\n--- VECTOR 7: Edge Middleware Redirection & Authentication Enforcement ---');

  // 7.1 Adversarial token to /portal must redirect to /login
  {
    const start = performance.now();
    const tamperedToken = `${dataPart}.fakeSignatureTampered12345`;
    const req = new NextRequest('http://localhost:3000/portal', {
      headers: {
        cookie: `${USER_META_COOKIE_NAME}=${tamperedToken}`,
      },
    });

    const res = await middleware(req);
    const isRedirect = res.status === 307;
    const location = res.headers.get('location') || '';
    const redirectsToLogin = location.includes('/login');
    const passed = isRedirect && redirectsToLogin;

    record({
      id: 'ADV-EDGE-01',
      category: 'Edge Auth Redirection',
      name: 'Tampered token on /portal redirects to /login with 307',
      passed,
      verdict: passed ? 'PASS' : 'VULNERABILITY',
      details: passed
        ? `Status 307 redirected to: ${location}`
        : `CRITICAL: Did not redirect to /login (Status: ${res.status}, Location: ${location})`,
      durationMs: performance.now() - start,
    });
  }

  // 7.2 Adversarial token to /medicao/rdp must redirect to /login
  {
    const start = performance.now();
    const tamperedToken = `${dataPart}.fakeSignatureTampered12345`;
    const req = new NextRequest('http://localhost:3000/medicao/rdp', {
      headers: {
        cookie: `${USER_META_COOKIE_NAME}=${tamperedToken}`,
      },
    });

    const res = await middleware(req);
    const isRedirect = res.status === 307;
    const location = res.headers.get('location') || '';
    const redirectsToLogin = location.includes('/login');
    const passed = isRedirect && redirectsToLogin;

    record({
      id: 'ADV-EDGE-02',
      category: 'Edge Auth Redirection',
      name: 'Tampered token on /medicao/rdp redirects to /login with 307',
      passed,
      verdict: passed ? 'PASS' : 'VULNERABILITY',
      details: passed
        ? `Status 307 redirected to: ${location}`
        : `CRITICAL: Did not redirect to /login (Status: ${res.status}, Location: ${location})`,
      durationMs: performance.now() - start,
    });
  }

  // 7.3 Adversarial token to /api/orcamentos must return 401 Unauthorized
  {
    const start = performance.now();
    const tamperedToken = `${dataPart}.fakeSignatureTampered12345`;
    const req = new NextRequest('http://localhost:3000/api/orcamentos/list', {
      headers: {
        cookie: `${USER_META_COOKIE_NAME}=${tamperedToken}`,
      },
    });

    const res = await middleware(req);
    const is401 = res.status === 401;
    const passed = is401;

    record({
      id: 'ADV-EDGE-03',
      category: 'Edge Auth Redirection',
      name: 'Tampered token on API /api/orcamentos returns 401 Unauthorized',
      passed,
      verdict: passed ? 'PASS' : 'VULNERABILITY',
      details: passed
        ? `Status 401 returned`
        : `CRITICAL: Did not return 401 (Status: ${res.status})`,
      durationMs: performance.now() - start,
    });
  }

  // 7.4 Adversarial token to /dashboard WITHOUT session cookie
  {
    const start = performance.now();
    const tamperedToken = `${dataPart}.fakeSignatureTampered12345`;
    const req = new NextRequest('http://localhost:3000/dashboard', {
      headers: {
        cookie: `${USER_META_COOKIE_NAME}=${tamperedToken}`,
      },
    });

    const res = await middleware(req);
    const isRedirect = res.status === 307;
    const location = res.headers.get('location') || '';
    const redirectsToLogin = location.includes('/login');
    const passed = isRedirect && redirectsToLogin;

    record({
      id: 'ADV-EDGE-04',
      category: 'Edge Auth Redirection',
      name: 'Tampered token on /dashboard (no session cookie) redirects to /login',
      passed,
      verdict: passed ? 'PASS' : 'VULNERABILITY',
      details: passed
        ? `Status 307 redirected to: ${location}`
        : `CRITICAL: Did not redirect to /login (Status: ${res.status}, Location: ${location})`,
      durationMs: performance.now() - start,
    });
  }

  // 7.5 Adversarial token to /dashboard WITH arbitrary/unverified session cookie
  {
    const start = performance.now();
    const tamperedToken = `${dataPart}.fakeSignatureTampered12345`;
    // Attacker supplies a forged session cookie value AND a tampered user_meta cookie
    const req = new NextRequest('http://localhost:3000/dashboard', {
      headers: {
        cookie: `${SESSION_COOKIE_NAME}=attacker_arbitrary_session_cookie; ${USER_META_COOKIE_NAME}=${tamperedToken}`,
      },
    });

    const res = await middleware(req);
    const isRedirect = res.status === 307;
    const location = res.headers.get('location') || '';
    const redirectsToLogin = location.includes('/login');
    const passed = isRedirect && redirectsToLogin;

    record({
      id: 'ADV-EDGE-05',
      category: 'Edge Auth Redirection',
      name: 'Tampered token on /dashboard WITH unverified session cookie redirects to /login',
      passed,
      verdict: passed ? 'PASS' : 'VULNERABILITY',
      details: passed
        ? `Status 307 redirected to /login`
        : `VULNERABILITY: Legacy bypass triggered! Returned status ${res.status} allowing pass-through without redirecting to /login!`,
      durationMs: performance.now() - start,
    });
  }

  // 7.6 Synchronous Inspection Vulnerability (parsePayloadUnsafe bypass)
  {
    const start = performance.now();
    // Create an elevated payload with an invalid/forged signature
    const elevatedPayload = {
      userId: 'attacker_root',
      role: 'ADMIN',
      email: 'attacker@evil.com',
      acessoOrcamento: true,
      acessoMedicao: true,
      ts: Date.now(),
    };
    const b64Data = Buffer.from(JSON.stringify(elevatedPayload)).toString('base64url');
    const attackToken = `${b64Data}.totally_fake_unsigned_garbage_signature`;

    const req = new NextRequest('http://localhost:3000/medicao/admin', {
      headers: {
        cookie: `${SESSION_COOKIE_NAME}=attacker_dummy; ${USER_META_COOKIE_NAME}=${attackToken}`,
      },
    });

    // Synchronously inspect middleware response without awaiting
    const syncRes: any = middleware(req);
    const syncStatus = syncRes.status;
    const isBlockedSync = syncStatus === 307 && (syncRes.headers?.get('location') || '').includes('/login');

    record({
      id: 'ADV-EDGE-06',
      category: 'Synchronous Bypass',
      name: 'Synchronous response evaluation on forged token blocks access (does not trust parsePayloadUnsafe)',
      passed: isBlockedSync,
      verdict: isBlockedSync ? 'PASS' : 'VULNERABILITY',
      details: isBlockedSync
        ? 'Synchronous check blocked forged token'
        : `VULNERABILITY: Synchronous evaluation trusted parsePayloadUnsafe! (Status was ${syncStatus} instead of 307 redirect to /login)`,
      attackPayload: attackToken,
      durationMs: performance.now() - start,
    });
  }

  // =========================================================================
  // SUMMARY
  // =========================================================================
  const totalDuration = performance.now() - startTotal;
  const passCount = results.filter((r) => r.passed).length;
  const failCount = results.filter((r) => !r.passed).length;
  const vulnList = results.filter((r) => r.verdict === 'VULNERABILITY');

  console.log('\n========================================================================');
  console.log('                 ADVERSARIAL CHALLENGE SUMMARY                          ');
  console.log('========================================================================');
  console.log(`  Total Vectors Executed: ${results.length}`);
  console.log(`  Passed (Hardened):      ${passCount}`);
  console.log(`  Failed / Vulnerable:    ${failCount}`);
  console.log(`  Total Execution Time:   ${totalDuration.toFixed(2)}ms`);
  console.log('========================================================================\n');

  if (vulnList.length > 0) {
    console.error(`CRITICAL: Identified ${vulnList.length} potential vulnerabilities or gaps:`);
    for (const v of vulnList) {
      console.error(`- [${v.id}] ${v.name}: ${v.details}`);
    }
  }

  // Return full results for programmatic analysis
  return {
    total: results.length,
    passed: passCount,
    failed: failCount,
    vulnerabilities: vulnList,
    results,
  };
}

runAdversarialM5Suite()
  .then((res) => {
    if (res.failed > 0) {
      process.exit(1);
    }
    process.exit(0);
  })
  .catch((err) => {
    console.error('Fatal unhandled error:', err);
    process.exit(1);
  });
