const SECRET = process.env.SESSION_SECRET || 'rbt_fundacoes_default_secret_key_at_least_32_chars';

function toBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(str: string): Uint8Array {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) base64 += '=';
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
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

interface SignUserMetaInput {
  userId: string;
  role: string;
  email: string;
  acessoOrcamento?: boolean;
  acessoMedicao?: boolean;
}

interface UserMetaClaims {
  userId: string;
  role: string;
  email: string;
  acessoOrcamento: boolean;
  acessoMedicao: boolean;
  ts: number;
}

async function signUserMeta(payload: SignUserMetaInput): Promise<string> {
  const enc = new TextEncoder();
  const roleUpper = String(payload.role || '').toUpperCase();
  const defaultOrcamento = roleUpper === 'ADMIN' || roleUpper === 'ADMINISTRADOR' || roleUpper === 'ORCAMENTISTA';
  const defaultMedicao = roleUpper === 'ADMIN' || roleUpper === 'ADMINISTRADOR' || roleUpper === 'APONTADOR' || roleUpper === 'ENGENHEIRO';

  const claims = {
    userId: payload.userId,
    role: payload.role,
    email: payload.email,
    acessoOrcamento: typeof payload.acessoOrcamento === 'boolean' ? payload.acessoOrcamento : defaultOrcamento,
    acessoMedicao: typeof payload.acessoMedicao === 'boolean' ? payload.acessoMedicao : defaultMedicao,
    ts: Date.now(),
  };

  const jsonStr = JSON.stringify(claims);
  const dataB64 = toBase64Url(enc.encode(jsonStr));
  const key = await getCryptoKey();
  const signature = await crypto.subtle.sign('HMAC', key, enc.encode(dataB64));
  const sigB64 = toBase64Url(new Uint8Array(signature));

  return dataB64 + '.' + sigB64;
}

async function verifyUserMeta(input: string | { cookies: { get: (name: string) => { value: string } | undefined } } | null | undefined): Promise<UserMetaClaims | null> {
  if (!input) return null;
  const token = typeof input === 'string' ? input : input.cookies?.get('rbt_user_meta')?.value;
  if (!token || typeof token !== 'string') return null;

  const parts = token.split('.');
  if (parts.length !== 2) return null;

  const [dataB64, sigB64] = parts;

  try {
    const enc = new TextEncoder();
    const dec = new TextDecoder();
    const key = await getCryptoKey();
    const sigBytes = fromBase64Url(sigB64);

    const isValid = await crypto.subtle.verify(
      'HMAC',
      key,
      sigBytes,
      enc.encode(dataB64)
    );

    if (!isValid) return null;

    const jsonStr = dec.decode(fromBase64Url(dataB64));
    const parsed = JSON.parse(jsonStr);

    const maxAgeMs = 12 * 60 * 60 * 1000; // 12 hours
    if (!parsed.ts || typeof parsed.ts !== 'number' || (Date.now() - parsed.ts) > maxAgeMs) {
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

async function testAll() {
  console.log('Testing signUserMeta...');
  const token = await signUserMeta({
    userId: 'user-123',
    role: 'ADMIN',
    email: 'admin@rbtfundacoes.com.br',
    acessoOrcamento: true,
    acessoMedicao: true,
  });
  console.log('Signed token:', token);
  
  console.log('Testing verifyUserMeta (string)...');
  const verified = await verifyUserMeta(token);
  console.log('Verified claims:', verified);
  if (!verified || !verified.acessoOrcamento || !verified.acessoMedicao) throw new Error('Failed verified claims');

  console.log('Testing verifyUserMeta (NextRequest-like cookies object)...');
  const mockReq = { cookies: { get: (name: string) => (name === 'rbt_user_meta' ? { value: token } : undefined) } };
  const verifiedReq = await verifyUserMeta(mockReq);
  console.log('Verified request claims:', verifiedReq);
  if (!verifiedReq || verifiedReq.userId !== 'user-123') throw new Error('Failed mockReq claims');

  console.log('Testing tampered signature...');
  const tampered = token.slice(0, -4) + 'zzzz';
  const tamperedResult = await verifyUserMeta(tampered);
  console.log('Tampered result (should be null):', tamperedResult);
  if (tamperedResult !== null) throw new Error('Tampered token should not verify!');

  console.log('Testing tampered payload...');
  const [dataPart, sigPart] = token.split('.');
  const modifiedData = dataPart.slice(0, -2) + 'AA';
  const tamperedPayloadResult = await verifyUserMeta(modifiedData + '.' + sigPart);
  console.log('Tampered payload result (should be null):', tamperedPayloadResult);
  if (tamperedPayloadResult !== null) throw new Error('Tampered payload should not verify!');

  console.log('Testing expired token...');
  const expiredEnc = new TextEncoder();
  const expiredClaims = {
    userId: 'user-123',
    role: 'ADMIN',
    email: 'admin@rbt.com',
    acessoOrcamento: true,
    acessoMedicao: true,
    ts: Date.now() - (13 * 60 * 60 * 1000), // 13 hours ago (max is 12)
  };
  const expDataB64 = toBase64Url(expiredEnc.encode(JSON.stringify(expiredClaims)));
  const key = await getCryptoKey();
  const expSig = await crypto.subtle.sign('HMAC', key, expiredEnc.encode(expDataB64));
  const expSigB64 = toBase64Url(new Uint8Array(expSig));
  const expiredToken = expDataB64 + '.' + expSigB64;
  const expiredResult = await verifyUserMeta(expiredToken);
  console.log('Expired token result (should be null):', expiredResult);
  if (expiredResult !== null) throw new Error('Expired token should not verify!');

  console.log('\n✅ ALL 5 TOKEN UTILITY TESTS PASSED PERFECTLY!');
}

testAll().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
