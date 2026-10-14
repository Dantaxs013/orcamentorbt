import { z } from 'zod';

export const solicitacaoInicialSchema = z.object({
  nome: z.string().min(2, 'O nome deve ter pelo menos 2 caracteres'),
  email: z.string().email('E-mail corporativo inválido'),
  telefone: z.string().optional().nullable(),
  empresa: z.string().optional().nullable(),
  mensagemInicial: z.string().optional().nullable(),
});

export type SolicitacaoInicialInput = z.infer<typeof solicitacaoInicialSchema>;

export const respostaFormularioSchema = z.object({
  // 1. Dados Cadastrais e de Contato
  empresa: z.string().min(2, 'Informe o nome da empresa contratante'),
  contatoNome: z.string().min(2, 'Informe o nome do responsável técnico ou de compras'),
  email: z.string().email('Informe um e-mail corporativo válido'),
  telefone: z.string().min(8, 'Informe um telefone de contato válido com DDD'),

  // 2. Caracterização e Planejamento da Obra
  naturezaContratacao: z.string().min(2, 'Selecione se é obra própria ou concorrência'),
  dataLimiteConcorrencia: z.string().optional().nullable(),
  previsaoInicio: z.string().min(2, 'Informe a previsão de início das obras'),

  // 3. Dados Técnicos de Engenharia e Geotecnia
  sondagensStatus: z.string().min(2, 'Informe o status das sondagens de solo (SPT)'),
  sondagensArquivoUrl: z.string().optional().nullable(),
  sondagensDetalhes: z.string().optional().nullable(),

  projetosStatus: z.string().min(2, 'Informe a disponibilidade dos projetos de fundação'),
  projetosArquivoUrl: z.string().optional().nullable(),

  // 4. Quantitativos e Especificação Técnica
  tipoFundacao: z.string().min(2, 'Selecione o tipo de fundação previsto'),
  especificacoes: z.string().optional().nullable(),
  quantidadeEstacas: z.coerce.number().int().min(1, 'A quantidade de estacas deve ser no mínimo 1'),
  profundidadeMedia: z.coerce.number().min(0).optional().nullable(),
  metragemTotalEstimada: z.coerce.number().min(0).optional().nullable(),
  ensaiosRequeridos: z.string().optional().nullable(),
  observacoes: z.string().optional().nullable(),
});

export type RespostaFormularioInput = z.infer<typeof respostaFormularioSchema>;

export const propostaComercialSchema = z.object({
  custoMaoDeObra: z.coerce.number().min(0, 'Custo de mão de obra não pode ser negativo'),
  custoMateriais: z.coerce.number().min(0, 'Custo de materiais não pode ser negativo'),
  custosExtras: z.coerce.number().min(0, 'Custos extras não podem ser negativos').default(0),
  bdiMargemPerc: z.coerce.number().min(0).max(100, 'Margem BDI deve estar entre 0% e 100%').default(15),
  valorTotal: z.coerce.number().min(0, 'Valor final deve ser maior ou igual a zero'),
  condicoesPagamento: z.string().min(3, 'Informe as condições comerciais de pagamento'),
  prazoExecucaoDias: z.coerce.number().int().min(1, 'Prazo de execução deve ser de ao menos 1 dia'),
  validadePropostaDias: z.coerce.number().int().min(1, 'Validade da proposta deve ser de ao menos 1 dia').default(10),
  observacoes: z.string().optional().nullable(),
  enviarEmailCliente: z.boolean().default(true),
});

export type PropostaComercialInput = z.infer<typeof propostaComercialSchema>;
