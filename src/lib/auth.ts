import bcrypt from 'bcryptjs';

export type UserRole =
  | 'ADMIN'
  | 'ADMINISTRADOR'
  | 'ORCAMENTISTA'
  | 'APONTADOR'
  | 'ENGENHEIRO'
  | string;

export interface AuthUser {
  id: string;
  name: string;
  nome?: string | null;
  email: string;
  role: UserRole;
  ativo: boolean;
  telefone?: string | null;
  acessoOrcamento: boolean;
  acessoMedicao: boolean;
}

/**
 * Hash de senha utilizando bcryptjs com salt de 10 rounds
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

/**
 * Verificação de senha com suporte a hashes bcrypt ($2a$, $2b$, $2y$)
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  if (!password || !hash) return false;
  try {
    return await bcrypt.compare(password, hash);
  } catch {
    return false;
  }
}

/**
 * Verificadores de papel (Role Helpers)
 */
export function isAdmin(role: UserRole | string): boolean {
  return role === 'ADMIN' || role === 'ADMINISTRADOR';
}

export function isOrcamentista(role: UserRole | string): boolean {
  return role === 'ORCAMENTISTA';
}

export function isApontador(role: UserRole | string): boolean {
  return role === 'APONTADOR';
}

export function isEngenheiro(role: UserRole | string): boolean {
  return role === 'ENGENHEIRO' || role === 'ADMIN' || role === 'ADMINISTRADOR';
}

export function hasRole(currentRole: UserRole | string, targetRole: UserRole | string): boolean {
  if (currentRole === 'ADMIN' || currentRole === 'ADMINISTRADOR') return true;
  if (currentRole === 'ENGENHEIRO' && (targetRole === 'ENGENHEIRO' || targetRole === 'APONTADOR')) return true;
  if (currentRole === 'APONTADOR' && targetRole === 'APONTADOR') return true;
  if (currentRole === 'ORCAMENTISTA' && targetRole === 'ORCAMENTISTA') return true;
  return false;
}

/**
 * Chaves financeiras que nunca devem ser expostas para o perfil APONTADOR
 * Preserva compatibilidade integral com código transplantado de Medicaodiaria
 */
export const FINANCIAL_KEYS = new Set([
  'valorUnitario',
  'valorTotal',
  'valorTotalContratual',
  'retencaoINSS',
  'retencaoISS',
  'retencaoIRRF',
  'retencaoCSLL',
  'retencaoPIS',
  'retencaoCOFINS',
  'outrasDeducoesPerc',
  'baseMaoDeObra',
  'valorBruto',
  'retencaoINSSValor',
  'retencaoISSValor',
  'retencaoIRRFValor',
  'retencaoCSLLValor',
  'retencaoPISValor',
  'retencaoCOFINSValor',
  'outrasDeducoesValor',
  'totalDeducoes',
  'valorLiquido',
  'valorPeriodo',
  'valorAcumulado',
  'saldoValor',
  'precoUnitario',
  'valorGlobal',
]);

/**
 * Sanitizador recursivo para remover campos financeiros em visualizações de APONTADOR
 */
export function stripFinancialData<T>(data: T): T {
  if (data === null || data === undefined) return data;
  if (data instanceof Date) return data;
  if (data && typeof data === 'object' && ('d' in data && 'e' in data && 's' in data)) return data;

  if (Array.isArray(data)) {
    return data.map((item) => stripFinancialData(item)) as unknown as T;
  }

  if (typeof data === 'object') {
    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
      if (FINANCIAL_KEYS.has(key)) {
        continue;
      }
      sanitized[key] = stripFinancialData(value);
    }
    return sanitized as T;
  }

  return data;
}
