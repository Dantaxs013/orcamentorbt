import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/session';
import { prisma } from '@/lib/db';
import { z } from 'zod';
import bcrypt from 'bcryptjs';

const isAdmin = (role?: string) => role === 'ADMINISTRADOR' || role === 'ADMIN';

const userSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(['APONTADOR', 'ENGENHEIRO', 'ADMINISTRADOR', 'ADMIN', 'ORCAMENTISTA']),
});

export async function GET(req: NextRequest) {
  const session = await getServerSession();
  if (!session?.user || !isAdmin(session.user.role)) {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
  }

  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true, role: true, ativo: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json({ users });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession();
  if (!session?.user || !isAdmin(session.user.role)) {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
  }

  const body = await req.json();
  const parsed = userSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const exists = await prisma.user.findUnique({ where: { email: parsed.data.email.toLowerCase() } });
  if (exists) return NextResponse.json({ error: 'Email já cadastrado' }, { status: 409 });

  const passwordHash = await bcrypt.hash(parsed.data.password, 12);
  const user = await prisma.user.create({
    data: {
      name: parsed.data.name,
      nome: parsed.data.name,
      email: parsed.data.email.toLowerCase(),
      passwordHash,
      role: parsed.data.role,
      acessoMedicao: true,
      acessoOrcamento: parsed.data.role === 'ADMIN' || parsed.data.role === 'ADMINISTRADOR' || parsed.data.role === 'ORCAMENTISTA',
    },
    select: { id: true, name: true, email: true, role: true, ativo: true },
  });

  return NextResponse.json({ user }, { status: 201 });
}
