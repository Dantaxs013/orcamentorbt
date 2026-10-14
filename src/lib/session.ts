import crypto from 'crypto';
import { cookies } from 'next/headers';
import { prisma } from './db';
import type { AuthUser, UserRole } from './auth';

export const SESSION_COOKIE_NAME = 'rbt_orcamentos_session';
export const SESSION_DURATION_SECONDS = 12 * 60 * 60; // 12 horas

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
 * Valida o token de sessão da requisição
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
          email: true,
          role: true,
          ativo: true,
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

  return {
    session: {
      id: session.id,
      expiresAt: session.expiresAt,
    },
    user: {
      id: session.user.id,
      name: session.user.name,
      email: session.user.email,
      role: session.user.role as UserRole,
      ativo: session.user.ativo,
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
 * Gera cabeçalho Set-Cookie para Route Handlers
 */
export function buildSessionCookie(token: string): string {
  const isProd = process.env.NODE_ENV === 'production';
  const flags = `Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_DURATION_SECONDS}${isProd ? '; Secure' : ''}`;
  return `${SESSION_COOKIE_NAME}=${token}; ${flags}`;
}

/**
 * Recupera o usuário logado em Server Components
 */
export async function getServerSession(): Promise<{ user: AuthUser } | null> {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    if (!token) return null;

    const validated = await validateSession(token);
    if (!validated) return null;

    return { user: validated.user };
  } catch {
    return null;
  }
}
