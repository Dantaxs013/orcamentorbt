import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/session';
import { prisma } from '@/lib/db';
import bcrypt from 'bcryptjs';

const isAdmin = (role?: string) => role === 'ADMINISTRADOR' || role === 'ADMIN';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  const resolvedParams = await Promise.resolve(params);
  const session = await getServerSession();
  if (!session?.user || !isAdmin(session.user.role)) {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
  }

  const body = await req.json();
  const { name, role, ativo, password } = body;

  let passwordHash: string | undefined = undefined;
  if (password && typeof password === 'string' && password.trim().length >= 6) {
    passwordHash = await bcrypt.hash(password.trim(), 12);
  }

  const user = await prisma.user.update({
    where: { id: resolvedParams.id },
    data: {
      ...(name !== undefined && { name, nome: name }),
      ...(role !== undefined && { role }),
      ...(ativo !== undefined && { ativo }),
      ...(passwordHash && { passwordHash }),
    },
    select: { id: true, name: true, email: true, role: true, ativo: true },
  });

  return NextResponse.json({ user });
}
