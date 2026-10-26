import crypto from 'crypto';

const SECRET = process.env.SESSION_SECRET || 'rbt_fundacoes_default_secret_key_at_least_32_chars';

export interface UserMetaClaims {
  userId: string;
  role: string;
  email: string;
  acessoOrcamento: boolean;
  acessoMedicao: boolean;
  ts: number;
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function fromBase64Url(str: string): Uint8Array {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function getCryptoKey(): Promise<CryptoKey> {
  const enc = new TextEncoder();
  return crypto.subtle.importKey(
    'raw',
    enc.encode(SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );
}

// Proposed hardened verifyUserMeta
export async function proposedVerifyUserMeta(
  input: string | { cookies: { get: (name: string) => { value: string } | undefined } } | null | undefined
): Promise<UserMetaClaims | null> {
  if (!input) return null;

  const token = typeof input === 'string' ? input : input.cookies?.get('rbt_user_meta')?.value;
  if (!token || typeof token !== 'string') return null;

  const parts = token.split('.');
  if (parts.length !== 2) return null;

  const [dataB64, sigB64] = parts;
  if (!dataB64 || !sigB64) return null;

  try {
    const enc = new TextEncoder();
    const dec = new TextDecoder();
    const key = await getCryptoKey();
    const sigBytes = fromBase64Url(sigB64);

    // Canonical Base64URL check to eliminate signature malleability
    if (toBase64Url(sigBytes) !== sigB64) {
      return null;
    }

    const isValid = await crypto.subtle.verify(
      'HMAC',
      key,
      sigBytes as unknown as BufferSource,
      enc.encode(dataB64)
    );

    if (!isValid) return null;

    const jsonStr = dec.decode(fromBase64Url(dataB64));
    const parsed = JSON.parse(jsonStr);

    const now = Date.now();
    const maxAgeMs = 12 * 60 * 60 * 1000; // 12 horas
    const maxClockSkewMs = 60 * 1000; // 60 segundos tolerância de drift futuro

    // Validar timestamp contra expiração e drift futuro
    if (
      !parsed.ts ||
      typeof parsed.ts !== 'number' ||
      Number.isNaN(parsed.ts) ||
      parsed.ts > now + maxClockSkewMs ||
      (now - parsed.ts) > maxAgeMs
    ) {
      return null;
    }

    const roleUpper = String(parsed.role || '').toUpperCase();
    const defaultOrcamento = roleUpper === 'ADMIN' || roleUpper === 'ADMINISTRADOR' || roleUpper === 'ORCAMENTISTA';
    const defaultMedicao = roleUpper === 'ADMIN' || roleUpper === 'ADMINISTRADOR' || roleUpper === 'APONTADOR' || roleUpper === 'ENGENHEIRO';

    return {
      userId: String(parsed.userId),
      role: String(parsed.role),
      email: String(parsed.email),
      acessoOrcamento: typeof parsed.acessoOrcamento === 'boolean' ? parsed.acessoOrcamento : defaultOrcamento,
      acessoMedicao: typeof parsed.acessoMedicao === 'boolean' ? parsed.acessoMedicao : defaultMedicao,
      ts: Number(parsed.ts),
    };
  } catch {
    return null;
  }
}

// Test harness for proposed function
async function runVerification() {
  console.log('--- Testing proposedVerifyUserMeta ---');
  const enc = new TextEncoder();
  const key = await getCryptoKey();

  async function makeToken(claims: any) {
    const jsonStr = JSON.stringify(claims);
    const dataB64 = toBase64Url(enc.encode(jsonStr));
    const sig = await crypto.subtle.sign('HMAC', key, enc.encode(dataB64));
    const sigB64 = toBase64Url(new Uint8Array(sig));
    return `${dataB64}.${sigB64}`;
  }

  // Test 1: Valid current token
  const t1 = await makeToken({
    userId: 'usr_normal',
    role: 'ADMIN',
    email: 'normal@rbt.com.br',
    acessoOrcamento: true,
    acessoMedicao: true,
    ts: Date.now(),
  });
  const v1 = await proposedVerifyUserMeta(t1);
  console.log('Test 1 (Valid token):', v1 !== null ? 'PASS' : 'FAIL');

  // Test 2: Drift +30s in future
  const t2 = await makeToken({
    userId: 'usr_normal',
    role: 'ADMIN',
    email: 'normal@rbt.com.br',
    acessoOrcamento: true,
    acessoMedicao: true,
    ts: Date.now() + 30000,
  });
  const v2 = await proposedVerifyUserMeta(t2);
  console.log('Test 2 (+30s drift):', v2 !== null ? 'PASS' : 'FAIL');

  // Test 3: Drift +5m in future (ADV-FUTURE-01)
  const t3 = await makeToken({
    userId: 'usr_timetraveler',
    role: 'ADMIN',
    email: 'future@rbt.com.br',
    acessoOrcamento: true,
    acessoMedicao: true,
    ts: Date.now() + 300000,
  });
  const v3 = await proposedVerifyUserMeta(t3);
  console.log('Test 3 (+5m drift rejected):', v3 === null ? 'PASS' : 'FAIL');

  // Test 4: Drift +1h in future (ADV-FUTURE-02)
  const t4 = await makeToken({
    userId: 'usr_timetraveler',
    role: 'ADMIN',
    email: 'future@rbt.com.br',
    acessoOrcamento: true,
    acessoMedicao: true,
    ts: Date.now() + 3600000,
  });
  const v4 = await proposedVerifyUserMeta(t4);
  console.log('Test 4 (+1h drift rejected):', v4 === null ? 'PASS' : 'FAIL');

  // Test 5: Drift +365d in future (ADV-FUTURE-05)
  const t5 = await makeToken({
    userId: 'usr_timetraveler',
    role: 'ADMIN',
    email: 'future@rbt.com.br',
    acessoOrcamento: true,
    acessoMedicao: true,
    ts: Date.now() + 365 * 86400000,
  });
  const v5 = await proposedVerifyUserMeta(t5);
  console.log('Test 5 (+365d drift rejected):', v5 === null ? 'PASS' : 'FAIL');

  // Test 6: Expired 12h + 1s (ADV-TIME-01)
  const t6 = await makeToken({
    userId: 'usr_expired',
    role: 'ADMIN',
    email: 'expired@rbt.com.br',
    acessoOrcamento: true,
    acessoMedicao: true,
    ts: Date.now() - (12 * 3600000 + 1000),
  });
  const v6 = await proposedVerifyUserMeta(t6);
  console.log('Test 6 (12h+1s expired rejected):', v6 === null ? 'PASS' : 'FAIL');

  // Test 7: Tampered signature last character padding
  const [d1, s1] = t1.split('.');
  const flippedLast = s1[s1.length - 1] === 'm' ? 'n' : 'm';
  const t7 = `${d1}.${s1.slice(0, -1)}${flippedLast}`;
  const v7 = await proposedVerifyUserMeta(t7);
  console.log('Test 7 (Tampered sig rejected via canonical check):', v7 === null ? 'PASS' : 'FAIL');
}

runVerification();
