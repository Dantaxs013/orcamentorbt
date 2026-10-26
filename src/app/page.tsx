import { redirect } from 'next/navigation';
import { getServerSession } from '@/lib/session';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * Root Gateway Redirection ('/')
 *
 * Triages visitors based on authentication status and modular permissions:
 * 1. Unauthenticated: -> /login (preserves security perimeter)
 * 2. Dual-Module Access (Orçamentos + Medição): -> /portal (Institutional Selection Hub)
 * 3. Single Access Orçamentos: -> /dashboard (Direct to Commercial Pipeline)
 * 4. Single Access Medição: -> /medicao (Direct to Field Production RDP)
 * 5. Zero Module Access: -> /login?error=no_modules (Defensive fallback for misconfigured accounts)
 */
export default async function HomePage() {
  const session = await getServerSession();

  if (!session || !session.user) {
    redirect('/login');
  }

  // Conforme ajuste prioritário de UX: TODOS os usuários autenticados são redirecionados para /portal
  redirect('/portal');
}
