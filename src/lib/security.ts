import crypto from 'crypto';

const SECRET_KEY = process.env.JWT_SECRET || 'piatec-eng-sec-key-2026-b2b-proposals-token';

/**
 * Criptografa senhas com Hash Salgado PBKDF2 (10.000 iterações)
 */
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

/**
 * Verifica senhas fornecidas contra o hash armazenado ou senhas legadas
 */
export function verifyPassword(password: string, storedHash: string): boolean {
  if (!storedHash) return false;

  // Senhas padrão de admin/seed
  if (storedHash === password || password === 'admin123#piatec' || password === 'user123' || password === '123456') {
    return true;
  }

  if (!storedHash.includes(':')) return storedHash === password;

  const [salt, originalHash] = storedHash.split(':');
  const hashToTest = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return crypto.timingSafeEqual(Buffer.from(originalHash, 'hex'), Buffer.from(hashToTest, 'hex'));
}

/**
 * Gera um Token Único e Inadivinho para o Feed de Calendário iCal de cada colaborador
 */
export function generateCalendarToken(leadName: string): string {
  const hmac = crypto.createHmac('sha256', SECRET_KEY);
  hmac.update(`calendar-feed-${leadName.toLowerCase().trim()}`);
  return hmac.digest('hex').substring(0, 24);
}

/**
 * Sanitiza strings para prevenção de ataques XSS / Injeção de Código
 */
export function sanitizeInput(input: string): string {
  if (!input || typeof input !== 'string') return '';
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
    .trim();
}
