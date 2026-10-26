import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// Local constants to avoid circular/missing dependencies during seed
const Role = {
  ADMIN: 'ADMIN',
  ORCAMENTISTA: 'ORCAMENTISTA',
  ENGENHEIRO: 'ENGENHEIRO',
  APONTADOR: 'APONTADOR',
} as const;

const StatusContrato = {
  ATIVO: 'ATIVO',
  PAUSADO: 'PAUSADO',
  FINALIZADO: 'FINALIZADO',
} as const;

const StatusRelatorio = {
  RASCUNHO: 'RASCUNHO',
  SUBMETIDO: 'SUBMETIDO',
  APROVADO: 'APROVADO',
  REJEITADO: 'REJEITADO',
} as const;

const CondicaoClimatica = {
  BOM_SOL: 'BOM_SOL',
  NUBLADO: 'NUBLADO',
  CHUVA_LEVE: 'CHUVA_LEVE',
  CHUVA_FORTE: 'CHUVA_FORTE',
  IMPRACTICAVEL: 'IMPRACTICAVEL',
} as const;

async function main() {
  console.log('🌱 Iniciando seed unificado RBT Fundações (Orçamentos + Medição)...');

  const salt = await bcrypt.genSalt(10);
  const defaultHash = await bcrypt.hash('Rbt@2026', salt);

  // ====================================================
  // 1. USUÁRIOS COM CONTROLE DE ACESSO MODULAR
  // ====================================================

  // 1.1 Administrador / Gestor Geral (Acesso a AMBOS os módulos)
  const admin = await prisma.user.upsert({
    where: { email: 'admin@rbt.com.br' },
    update: {
      name: 'Gestor Geral RBT',
      nome: 'Gestor Geral RBT',
      passwordHash: defaultHash,
      role: Role.ADMIN,
      ativo: true,
      telefone: '(41) 99999-3333',
      acessoOrcamento: true,
      acessoMedicao: true,
    },
    create: {
      name: 'Gestor Geral RBT',
      nome: 'Gestor Geral RBT',
      email: 'admin@rbt.com.br',
      passwordHash: defaultHash,
      role: Role.ADMIN,
      ativo: true,
      telefone: '(41) 99999-3333',
      acessoOrcamento: true,
      acessoMedicao: true,
    },
  });

  // Alias institucional para Medição Diária
  await prisma.user.upsert({
    where: { email: 'admin@rbtfundacoes.com.br' },
    update: {
      name: 'Dra. Mariana Costa (Gestora)',
      nome: 'Dra. Mariana Costa (Gestora)',
      passwordHash: defaultHash,
      role: Role.ADMIN,
      ativo: true,
      telefone: '(41) 99999-3333',
      acessoOrcamento: true,
      acessoMedicao: true,
    },
    create: {
      name: 'Dra. Mariana Costa (Gestora)',
      nome: 'Dra. Mariana Costa (Gestora)',
      email: 'admin@rbtfundacoes.com.br',
      passwordHash: defaultHash,
      role: Role.ADMIN,
      ativo: true,
      telefone: '(41) 99999-3333',
      acessoOrcamento: true,
      acessoMedicao: true,
    },
  });
  console.log('✅ Usuário Administrador configurado (Acesso: Orçamentos + Medição)');

  // 1.2 Engenheiro Orçamentista (Acesso EXCLUSIVO a Orçamentos)
  const orcamentista = await prisma.user.upsert({
    where: { email: 'orcamentista@rbt.com.br' },
    update: {
      name: 'Engenheiro Orçamentista',
      nome: 'Engenheiro Orçamentista',
      passwordHash: defaultHash,
      role: Role.ORCAMENTISTA,
      ativo: true,
      telefone: '(41) 98888-2222',
      acessoOrcamento: true,
      acessoMedicao: false,
    },
    create: {
      name: 'Engenheiro Orçamentista',
      nome: 'Engenheiro Orçamentista',
      email: 'orcamentista@rbt.com.br',
      passwordHash: defaultHash,
      role: Role.ORCAMENTISTA,
      ativo: true,
      telefone: '(41) 98888-2222',
      acessoOrcamento: true,
      acessoMedicao: false,
    },
  });
  console.log('✅ Usuário Orçamentista configurado (Acesso: Somente Orçamentos)');

  // 1.3 Apontador de Campo (Acesso EXCLUSIVO a Medição Diária)
  const apontador = await prisma.user.upsert({
    where: { email: 'apontador@rbtfundacoes.com.br' },
    update: {
      name: 'Carlos Oliveira (Apontador)',
      nome: 'Carlos Oliveira (Apontador)',
      passwordHash: defaultHash,
      role: Role.APONTADOR,
      ativo: true,
      telefone: '(41) 98888-1111',
      acessoOrcamento: false,
      acessoMedicao: true,
    },
    create: {
      name: 'Carlos Oliveira (Apontador)',
      nome: 'Carlos Oliveira (Apontador)',
      email: 'apontador@rbtfundacoes.com.br',
      passwordHash: defaultHash,
      role: Role.APONTADOR,
      ativo: true,
      telefone: '(41) 98888-1111',
      acessoOrcamento: false,
      acessoMedicao: true,
    },
  });
  console.log('✅ Usuário Apontador configurado (Acesso: Somente Medição)');

  // 1.4 Engenheiro de Obras / Fiscal (Acesso a Medição Diária)
  const engenheiro = await prisma.user.upsert({
    where: { email: 'engenheiro@rbtfundacoes.com.br' },
    update: {
      name: 'Eng. Roberto Mendes',
      nome: 'Eng. Roberto Mendes',
      passwordHash: defaultHash,
      role: Role.ENGENHEIRO,
      ativo: true,
      telefone: '(41) 99999-2222',
      acessoOrcamento: false,
      acessoMedicao: true,
    },
    create: {
      name: 'Eng. Roberto Mendes',
      nome: 'Eng. Roberto Mendes',
      email: 'engenheiro@rbtfundacoes.com.br',
      passwordHash: defaultHash,
      role: Role.ENGENHEIRO,
      ativo: true,
      telefone: '(41) 99999-2222',
      acessoOrcamento: false,
      acessoMedicao: true,
    },
  });
  console.log('✅ Usuário Engenheiro configurado (Acesso: Somente Medição)');

  // ====================================================
  // 2. DADOS INICIAIS DO MÓDULO DE MEDIÇÃO DIÁRIA
  // ====================================================

  // 2.1 Obras de Demonstração
  const obra1 = await prisma.obra.upsert({
    where: { codigo: 'OBR-2026-001' },
    update: {
      nome: 'Edifício Horizonte Azul',
      cliente: 'Construtora Horizonte Ltda',
      endereco: 'Av. Sete de Setembro, 4500 - Batel',
      cidade: 'Curitiba',
      estado: 'PR',
      engenheiroResponsavelId: engenheiro.id,
      ativo: true,
      dataInicio: new Date('2026-01-15'),
      dataPrevisaoFim: new Date('2026-08-30'),
    },
    create: {
      codigo: 'OBR-2026-001',
      nome: 'Edifício Horizonte Azul',
      cliente: 'Construtora Horizonte Ltda',
      endereco: 'Av. Sete de Setembro, 4500 - Batel',
      cidade: 'Curitiba',
      estado: 'PR',
      engenheiroResponsavelId: engenheiro.id,
      ativo: true,
      dataInicio: new Date('2026-01-15'),
      dataPrevisaoFim: new Date('2026-08-30'),
    },
  });

  const obra2 = await prisma.obra.upsert({
    where: { codigo: 'OBR-2026-002' },
    update: {
      nome: 'Condomínio Reserva dos Ipês',
      cliente: 'Ipês Incorporações Imobiliárias',
      endereco: 'Rua das Araucárias, 1200',
      cidade: 'São José dos Pinhais',
      estado: 'PR',
      engenheiroResponsavelId: engenheiro.id,
      ativo: true,
      dataInicio: new Date('2026-02-01'),
      dataPrevisaoFim: new Date('2026-10-15'),
    },
    create: {
      codigo: 'OBR-2026-002',
      nome: 'Condomínio Reserva dos Ipês',
      cliente: 'Ipês Incorporações Imobiliárias',
      endereco: 'Rua das Araucárias, 1200',
      cidade: 'São José dos Pinhais',
      estado: 'PR',
      engenheiroResponsavelId: engenheiro.id,
      ativo: true,
      dataInicio: new Date('2026-02-01'),
      dataPrevisaoFim: new Date('2026-10-15'),
    },
  });
  console.log('✅ Obras de exemplo cadastradas (OBR-2026-001 e OBR-2026-002)');

  // 2.2 Contrato com Itens PPU
  const contrato1 = await prisma.contrato.upsert({
    where: { numeroContrato: 'CTR-RBT-2026-001' },
    update: {
      obraId: obra1.id,
      descricao: 'Execução de Cravação de Perfis Metálicos e Fundações Profundas',
      dataContrato: new Date('2026-01-10'),
      valorTotalContratual: 385000.00,
      status: StatusContrato.ATIVO,
      retencaoINSS: 3.50,
      baseMaoDeObra: 40.00,
      retencaoISS: 5.00,
      retencaoIRRF: 1.50,
      retencaoCSLL: 1.00,
      retencaoPIS: 0.65,
      retencaoCOFINS: 3.00,
      outrasDeducoesPerc: 0.00,
      observacoes: 'Contrato padrão RBT com medições quinzenais e retenções legais destacadas.',
    },
    create: {
      obraId: obra1.id,
      numeroContrato: 'CTR-RBT-2026-001',
      descricao: 'Execução de Cravação de Perfis Metálicos e Fundações Profundas',
      dataContrato: new Date('2026-01-10'),
      valorTotalContratual: 385000.00,
      status: StatusContrato.ATIVO,
      retencaoINSS: 3.50,
      baseMaoDeObra: 40.00,
      retencaoISS: 5.00,
      retencaoIRRF: 1.50,
      retencaoCSLL: 1.00,
      retencaoPIS: 0.65,
      retencaoCOFINS: 3.00,
      outrasDeducoesPerc: 0.00,
      observacoes: 'Contrato padrão RBT com medições quinzenais e retenções legais destacadas.',
    },
  });

  const ppuItems = [
    {
      codigoItem: '01.01',
      descricao: 'Mobilização e Instalação de Bate-Estacas / Perfuratriz',
      unidadeMedida: 'vb',
      quantidadeContratada: 1,
      valorUnitario: 15000.00,
      valorTotal: 15000.00,
      ordem: 1,
    },
    {
      codigoItem: '02.01',
      descricao: 'Cravação de Perfil Metálico W150x22,5',
      unidadeMedida: 'm',
      quantidadeContratada: 1200,
      valorUnitario: 185.00,
      valorTotal: 222000.00,
      ordem: 2,
    },
    {
      codigoItem: '02.02',
      descricao: 'Cravação de Perfil Metálico W310x38,7',
      unidadeMedida: 'm',
      quantidadeContratada: 350,
      valorUnitario: 310.00,
      valorTotal: 108500.00,
      ordem: 3,
    },
    {
      codigoItem: '03.01',
      descricao: 'Emenda Soldada Perfil W150',
      unidadeMedida: 'un',
      quantidadeContratada: 80,
      valorUnitario: 120.00,
      valorTotal: 9600.00,
      ordem: 4,
    },
    {
      codigoItem: '03.02',
      descricao: 'Emenda Soldada Perfil W310',
      unidadeMedida: 'un',
      quantidadeContratada: 40,
      valorUnitario: 180.00,
      valorTotal: 7200.00,
      ordem: 5,
    },
    {
      codigoItem: '04.01',
      descricao: 'Tala de Junção Fixada',
      unidadeMedida: 'un',
      quantidadeContratada: 120,
      valorUnitario: 65.00,
      valorTotal: 7800.00,
      ordem: 6,
    },
    {
      codigoItem: '05.01',
      descricao: 'Arrasamento / Corte de Perfil Metálico',
      unidadeMedida: 'un',
      quantidadeContratada: 110,
      valorUnitario: 45.00,
      valorTotal: 4950.00,
      ordem: 7,
    },
  ];

  for (const item of ppuItems) {
    const existing = await prisma.itemContrato.findFirst({
      where: { contratoId: contrato1.id, codigoItem: item.codigoItem },
    });
    if (existing) {
      await prisma.itemContrato.update({
        where: { id: existing.id },
        data: item,
      });
    } else {
      await prisma.itemContrato.create({
        data: {
          ...item,
          contratoId: contrato1.id,
        },
      });
    }
  }
  console.log(`✅ ${ppuItems.length} Itens de Contrato PPU configurados para CTR-RBT-2026-001`);

  // 2.3 RDP Inicial de Exemplo com 25 Linhas
  const existingRdp = await prisma.relatorioDiario.findUnique({
    where: {
      obraId_numeroSequencial: {
        obraId: obra1.id,
        numeroSequencial: 1,
      },
    },
  });

  if (!existingRdp) {
    const rdp = await prisma.relatorioDiario.create({
      data: {
        obraId: obra1.id,
        apontadorId: apontador.id,
        revisadoPorId: engenheiro.id,
        numeroSequencial: 1,
        data: new Date('2026-03-01'),
        turno: 'DIURNO',
        horaInicio: '07:30',
        horaFim: '17:30',
        maquinaEquipamento: 'Bate-Estacas Hidráulico RBT-01',
        operador: 'José Carlos da Silva',
        encarregado: 'Antônio Ferreira',
        equipeDescricao: 'Operador + 2 Ajudantes + 1 Soldador',
        condicaoClimatica: CondicaoClimatica.BOM_SOL,
        status: StatusRelatorio.APROVADO,
        observacoes: 'Produção executada sem incidentes. Solo firme conforme sondagem SPT.',
        assinadoApontador: true,
        dataAssinaturaApontador: new Date('2026-03-01T17:45:00'),
        assinadoEngenheiro: true,
        dataAssinaturaEngenheiro: new Date('2026-03-01T18:30:00'),
      },
    });

    const lines = [];
    for (let i = 1; i <= 25; i++) {
      if (i <= 5) {
        lines.push({
          relatorioId: rdp.id,
          numeroLinha: i,
          numeroEstaca: `E-${String(i).padStart(2, '0')}`,
          perfil: i % 2 === 0 ? 'W310' : 'W150',
          horaInicio: `0${7 + i}:00`,
          horaFim: `0${7 + i}:45`,
          profundidade: 14.50,
          cotaTerreno: 915.20,
          cotaArrasamento: 914.80,
          comprimentoUtil: 14.10,
          diametro: null,
          emendaW150: i % 2 === 1 ? 1 : 0,
          emendaW310: i % 2 === 0 ? 1 : 0,
          talas: 2,
          arrasamento: 0.40,
          tempoParadaMinutos: 0,
          motivoParada: null,
          observacao: 'Solo com boa penetração',
        });
      } else {
        lines.push({
          relatorioId: rdp.id,
          numeroLinha: i,
          numeroEstaca: null,
          perfil: null,
          horaInicio: null,
          horaFim: null,
          profundidade: 0.00,
          cotaTerreno: null,
          cotaArrasamento: null,
          comprimentoUtil: null,
          diametro: null,
          emendaW150: 0,
          emendaW310: 0,
          talas: 0,
          arrasamento: 0.00,
          tempoParadaMinutos: 0,
          motivoParada: null,
          observacao: null,
        });
      }
    }

    await prisma.linhaProducao.createMany({
      data: lines,
    });
    console.log('✅ RDP #1 criado com 25 linhas de produção (5 cravadas)');
  }

  console.log('✨ Seed unificado concluído com sucesso!');
  console.log('🔑 Credenciais padrão: Senha para todos os usuários é "Rbt@2026"');
}

main()
  .catch((e) => {
    console.error('❌ Erro durante execução do seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
