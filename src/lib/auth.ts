import bcrypt from 'bcryptjs';

export type UserRole = 'ADMIN' | 'ORCAMENTISTA';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  ativo: boolean;
}

/**
 * Hash de senha utilizando bcryptjs com salt de 10 rounds
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

/**
 * Verificação de senha
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  if (!password || !hash) return false;
  return bcrypt.compare(password, hash);
}

export function isAdmin(role: UserRole): boolean {
  return role === 'ADMIN';
}
