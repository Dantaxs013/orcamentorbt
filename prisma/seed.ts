import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed do banco de dados RBT Orçamentos...');

  const passwordHash = await bcrypt.hash('Rbt@2026', 10);

  // 1. Criar Usuário Administrador
  const admin = await prisma.user.upsert({
    where: { email: 'admin@rbt.com.br' },
    update: {
      name: 'Gestor Geral RBT',
      passwordHash,
      role: 'ADMIN',
      ativo: true,
    },
    create: {
      name: 'Gestor Geral RBT',
      email: 'admin@rbt.com.br',
      passwordHash,
      role: 'ADMIN',
      ativo: true,
    },
  });

  // 2. Criar Usuário Orçamentista
  const orcamentista = await prisma.user.upsert({
    where: { email: 'orcamentista@rbt.com.br' },
    update: {
      name: 'Engenheiro Orçamentista',
      passwordHash,
      role: 'ORCAMENTISTA',
      ativo: true,
    },
    create: {
      name: 'Engenheiro Orçamentista',
      email: 'orcamentista@rbt.com.br',
      passwordHash,
      role: 'ORCAMENTISTA',
      ativo: true,
    },
  });

  console.log(`✅ Usuários criados: ${admin.email} (ADMIN), ${orcamentista.email} (ORCAMENTISTA)`);
  console.log('Senha padrão para ambos: Rbt@2026');
}

main()
  .catch((e) => {
    console.error('❌ Erro durante seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
