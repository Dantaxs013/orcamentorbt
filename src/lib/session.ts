import crypto from 'crypto';
import { cookies } from 'next/headers';
import { prisma } from './db';
import type { AuthUser, UserRole } from './auth';
import { signUserMeta, USER_META_COOKIE_NAME } from './token-utils';

export const SESSION_COOKIE_NAME = 'rbt_orcamentos_session';
export const LEGACY_SESSION_COOKIE_NAME = 'rbt_session';
export { USER_META_COOKIE_NAME };
export const SESSION_DURATION_SECONDS = 12 * 60 * 60; // 12 horas
export const SLIDING_WINDOW_THRESHOLD_SECONDS = 2 * 60 * 60; // 2 horas

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Cria uma nova sessão no banco de dados
 */
export async function createSession(
  userId: string,
  metadata?: { ipAddress?: string; userAgent?: string }
): Promise<string> {
  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + SESSION_DURATION_SECONDS * 1000);

  await prisma.session.create({
    data: {
      userId,
      tokenHash,
      ipAddress: metadata?.ipAddress,
      userAgent: metadata?.userAgent,
      expiresAt,
    },
  });

  return rawToken;
}

/**
 * Valida o token de sessão da requisição contra o banco de dados
 */
export async function validateSession(rawToken: string): Promise<{
  session: { id: string; expiresAt: Date };
  user: AuthUser;
} | null> {
  if (!rawToken || typeof rawToken !== 'string') return null;

  const tokenHash = hashToken(rawToken);
  const session = await prisma.session.findUnique({
    where: { tokenHash },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          nome: true,
          email: true,
          role: true,
          ativo: true,
          telefone: true,
          acessoOrcamento: true,
          acessoMedicao: true,
        },
      },
    },
  });

  if (!session) return null;

  // Verifica expiração
  if (session.expiresAt.getTime() < Date.now()) {
    await prisma.session.delete({ where: { id: session.id } }).catch(() => {});
    return null;
  }

  // Verifica se usuário está ativo
  if (!session.user.ativo) {
    await prisma.session.delete({ where: { id: session.id } }).catch(() => {});
    return null;
  }

  // Sliding window refresh se restar menos que o threshold de tempo
  const timeLeftSeconds = (session.expiresAt.getTime() - Date.now()) / 1000;
  if (timeLeftSeconds < SLIDING_WINDOW_THRESHOLD_SECONDS) {
    const newExpiresAt = new Date(Date.now() + SESSION_DURATION_SECONDS * 1000);
    await prisma.session.update({
      where: { id: session.id },
      data: { expiresAt: newExpiresAt },
    }).catch(() => {});
  }

  const u = session.user as any;
  const name = u.name || u.nome || '';
  const role = u.role as UserRole;

  // Inferência defensiva de permissões caso registros antigos tenham valores indefinidos
  const roleUpper = String(role || '').toUpperCase();
  const fallbackOrcamento = roleUpper === 'ADMIN' || roleUpper === 'ADMINISTRADOR' || roleUpper === 'ORCAMENTISTA';
  const fallbackMedicao = roleUpper === 'ADMIN' || roleUpper === 'ADMINISTRADOR' || roleUpper === 'APONTADOR' || roleUpper === 'ENGENHEIRO';

  const acessoOrcamento = typeof u.acessoOrcamento === 'boolean' ? u.acessoOrcamento : fallbackOrcamento;
  const acessoMedicao = typeof u.acessoMedicao === 'boolean' ? u.acessoMedicao : fallbackMedicao;

  return {
    session: {
      id: session.id,
      expiresAt: session.expiresAt,
    },
    user: {
      id: u.id,
      name,
      nome: u.nome || name,
      email: u.email,
      role,
      ativo: Boolean(u.ativo),
      telefone: u.telefone || null,
      acessoOrcamento,
      acessoMedicao,
    },
  };
}

/**
 * Destrói uma sessão ativa (Logout)
 */
export async function destroySession(rawToken: string): Promise<boolean> {
  if (!rawToken) return false;
  try {
    const tokenHash = hashToken(rawToken);
    await prisma.session.deleteMany({
      where: { tokenHash },
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Revoga todas as sessões ativas de um determinado usuário
 */
export async function destroyAllUserSessions(userId: string): Promise<void> {
  try {
    await prisma.session.deleteMany({
      where: { userId },
    });
  } catch {
    // Ignore errors
  }
}

/**
 * Gera headers Set-Cookie para emissão simultânea de:
 * 1. rbt_orcamentos_session (cookie primário compatível com testes e rotas legadas)
 * 2. rbt_session (cookie secundário para compatibilidade com rotas de Medição Diária)
 * 3. rbt_user_meta (token assinado HMAC SHA-256 para o Edge Middleware)
 */
export async function buildSessionCookies(
  token: string,
  user?: {
    id: string;
    role: string;
    email: string;
    acessoOrcamento?: boolean;
    acessoMedicao?: boolean;
  }
): Promise<string[]> {
  const isProd = process.env.NODE_ENV === 'production';
  const flags = `Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_DURATION_SECONDS}${isProd ? '; Secure' : ''}`;

  const cookieHeaders: string[] = [
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
    cookieHeaders.push(`${USER_META_COOKIE_NAME}=${metaToken}; ${flags}`);
  }

  return cookieHeaders;
}

/**
 * @deprecated Utilize buildSessionCookies para emissão de ambos os cookies (sessão + user meta)
 */
export function buildSessionCookie(token: string): string {
  const isProd = process.env.NODE_ENV === 'production';
  const flags = `Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_DURATION_SECONDS}${isProd ? '; Secure' : ''}`;
  return `${SESSION_COOKIE_NAME}=${token}; ${flags}`;
}

/**
 * Retorna os headers Set-Cookie configurados para expirar e limpar todos os cookies de autenticação
 */
export function buildClearSessionCookies(): string[] {
  const isProd = process.env.NODE_ENV === 'production';
  const flags = `Path=/; HttpOnly; SameSite=Lax; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT${isProd ? '; Secure' : ''}`;
  return [
    `${SESSION_COOKIE_NAME}=; ${flags}`,
    `${USER_META_COOKIE_NAME}=; ${flags}`,
    `${LEGACY_SESSION_COOKIE_NAME}=; ${flags}`,
  ];
}

/**
 * Limpa os cookies na store do Next.js (em contextos compatíveis como Server Actions)
 */
export async function clearSessionCookie(): Promise<void> {
  try {
    const cookieStore = cookies();
    cookieStore.delete(SESSION_COOKIE_NAME);
    cookieStore.delete(USER_META_COOKIE_NAME);
    cookieStore.delete(LEGACY_SESSION_COOKIE_NAME);
  } catch {
    // cookies().delete() pode falhar em determinados contextos de renderização
  }
}

/**
 * Recupera o usuário logado em Server Components com 100% de compatibilidade retroativa
 */
export async function getServerSession(): Promise<{ user: AuthUser } | null> {
  try {
    const cookieStore = cookies();
    const token =
      cookieStore.get(SESSION_COOKIE_NAME)?.value ||
      cookieStore.get(LEGACY_SESSION_COOKIE_NAME)?.value;

    if (!token) return null;

    const validated = await validateSession(token);
    if (!validated) return null;

    return { user: validated.user };
  } catch {
    return null;
  }
}
