import { verifyUserMeta, signUserMeta } from '../../../src/lib/token-utils';
import crypto from 'crypto';

async function debugChallenger() {
  console.log('--- DEBUGGING TEST 5.3 ---');
  const maxAgeMs = 12 * 60 * 60 * 1000;
  const freshTs = Date.now() - (maxAgeMs - 60000); // 11h 59m ago
  const claims = {
    userId: 'fresh-user',
    role: 'ORCAMENTISTA',
    email: 'fresh@rbt.com.br',
    acessoOrcamento: true,
    acessoMedicao: false,
    ts: freshTs,
  };

  const enc = new TextEncoder();
  const secret = process.env.SESSION_SECRET || 'rbt_fundacoes_default_secret_key_at_least_32_chars';
  const jsonStr = JSON.stringify(claims);
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
  const token = `${dataB64}.${sigB64}`;

  const res = await verifyUserMeta(token);
  console.log('Result of verifyUserMeta for fresh token:', res);
  if (!res) {
    console.log('Why did it fail? Let us trace:');
    console.log('ts in claims:', claims.ts);
    console.log('Date.now():', Date.now());
    console.log('diff (Date.now() - ts):', Date.now() - claims.ts);
    console.log('maxAgeMs:', maxAgeMs);
    console.log('Is diff > maxAgeMs?', (Date.now() - claims.ts) > maxAgeMs);

    // Test verifying directly with crypto.subtle.verify
    const dec = new TextDecoder();
    const vKey = await crypto.subtle.importKey(
      'raw',
      enc.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );
    // decode sigB64
    let base64 = sigB64.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) base64 += '=';
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

    const isCryptoValid = await crypto.subtle.verify(
      'HMAC',
      vKey,
      bytes,
      enc.encode(dataB64)
    );
    console.log('isCryptoValid directly:', isCryptoValid);
  }

  console.log('\n--- DEBUGGING BIT-FLIP TEST ---');
  const legitimateToken = await signUserMeta({
    userId: 'fuzz-target-user',
    role: 'ADMIN',
    email: 'fuzz@rbt.com.br',
    acessoOrcamento: true,
    acessoMedicao: true,
  });
  const [dPart, sPart] = legitimateToken.split('.');
  console.log('sPart length:', sPart.length); // usually 43 chars
  const base64Chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

  for (let idx = 0; idx < sPart.length; idx++) {
    const orig = sPart[idx];
    for (const ch of base64Chars) {
      if (ch === orig) continue;
      const testSig = sPart.slice(0, idx) + ch + sPart.slice(idx + 1);
      const testToken = `${dPart}.${testSig}`;
      const v = await verifyUserMeta(testToken);
      if (v !== null) {
        console.log(`Bypass at char index ${idx}: original "${orig}" replaced with "${ch}"!`);
      }
    }
  }
}

debugChallenger().catch(console.error);
