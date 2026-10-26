import crypto from 'crypto';

const SESSION_COOKIE_NAME = 'rbt_orcamentos_session';
const USER_META_COOKIE_NAME = 'rbt_user_meta';
const LEGACY_SESSION_COOKIE_NAME = 'rbt_session';
const SESSION_DURATION_SECONDS = 12 * 60 * 60; // 12 hours

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function getCryptoKey(): Promise<CryptoKey> {
  const enc = new TextEncoder();
  return crypto.subtle.importKey(
    'raw',
    enc.encode('secret-test-key-at-least-32-chars-length'),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );
}

async function signUserMeta(payload: {
  userId: string;
  role: string;
  email: string;
  acessoOrcamento?: boolean;
  acessoMedicao?: boolean;
}): Promise<string> {
  const enc = new TextEncoder();
  const claims = {
    userId: payload.userId,
    role: payload.role,
    email: payload.email,
    acessoOrcamento: payload.acessoOrcamento ?? true,
    acessoMedicao: payload.acessoMedicao ?? false,
    ts: Date.now(),
  };
  const jsonStr = JSON.stringify(claims);
  const dataB64 = toBase64Url(enc.encode(jsonStr));
  const key = await getCryptoKey();
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(dataB64));
  const sigB64 = toBase64Url(new Uint8Array(sig));
  return `${dataB64}.${sigB64}`;
}

async function buildSessionCookies(
  token: string,
  user?: {
    id: string;
    role: string;
    email: string;
    acessoOrcamento?: boolean;
    acessoMedicao?: boolean;
  }
): Promise<string[]> {
  const isProd = false;
  const flags = `Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_DURATION_SECONDS}${isProd ? '; Secure' : ''}`;
  const cookies: string[] = [
    `${SESSION_COOKIE_NAME}=${token}; ${flags}`,
    `${LEGACY_SESSION_COOKIE_NAME}=${token}; ${flags}`,
  ];
  if (user) {
    const metaToken = await signUserMeta({
      userId: user.id,
      role: user.role,
      email: user.email,
      acessoOrcamento: user.acessoOrcamento,
      acessoMedicao: user.acessoMedicao,
    });
    cookies.push(`${USER_META_COOKIE_NAME}=${metaToken}; ${flags}`);
  }
  return cookies;
}

function buildClearSessionCookies(): string[] {
  const isProd = false;
  const flags = `Path=/; HttpOnly; SameSite=Lax; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT${isProd ? '; Secure' : ''}`;
  return [
    `${SESSION_COOKIE_NAME}=; ${flags}`,
    `${USER_META_COOKIE_NAME}=; ${flags}`,
    `${LEGACY_SESSION_COOKIE_NAME}=; ${flags}`,
  ];
}

async function run() {
  const token = 'mock-token-raw-12345';
  const cookies = await buildSessionCookies(token, {
    id: 'u1',
    role: 'ADMIN',
    email: 'admin@rbt.com',
    acessoOrcamento: true,
    acessoMedicao: true,
  });

  console.log('Generated Cookies:', cookies);
  if (cookies.length !== 3) throw new Error('Expected 3 cookies');
  if (!cookies[0].startsWith('rbt_orcamentos_session=')) throw new Error('Cookie 0 error');
  if (!cookies[1].startsWith('rbt_session=')) throw new Error('Cookie 1 error');
  if (!cookies[2].startsWith('rbt_user_meta=')) throw new Error('Cookie 2 error');

  const clear = buildClearSessionCookies();
  console.log('Clear Cookies:', clear);
  if (clear.length !== 3) throw new Error('Expected 3 clear cookies');

  console.log('✅ Session cookie tests passed!');
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
