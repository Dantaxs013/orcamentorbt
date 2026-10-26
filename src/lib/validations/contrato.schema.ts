import { z } from 'zod';

export const ItemContratoSchema = z.object({
  codigoItem: z.string().min(1, 'Código do item é obrigatório'),
  descricao: z.string().min(1, 'Descrição é obrigatória'),
  unidadeMedida: z.string().min(1, 'Unidade de medida é obrigatória'),
  quantidadeContratada: z.coerce.number().min(0, 'Quantidade deve ser positiva'),
  valorUnitario: z.coerce.number().min(0, 'Valor unitário deve ser positivo'),
  ordem: z.number().int().default(0),
});

export type ItemContratoInput = z.infer<typeof ItemContratoSchema>;

export const ContratoSchema = z.object({
  obraId: z.string().min(1, 'Obra vinculada é obrigatória'),
  numeroContrato: z.string().min(1, 'Número do contrato é obrigatório'),
  descricao: z.string().optional(),
  dataContrato: z.coerce.date(),
  valorTotalContratual: z.coerce.number().min(0),
  status: z.enum(['ATIVO', 'PAUSADO', 'FINALIZADO']).default('ATIVO'),
  retencaoINSS: z.coerce.number().min(0).max(100).default(3.50),
  baseMaoDeObra: z.coerce.number().min(0).max(100).default(40.00),
  retencaoISS: z.coerce.number().min(0).max(100).default(5.00),
  retencaoIRRF: z.coerce.number().min(0).max(100).default(1.50),
  retencaoCSLL: z.coerce.number().min(0).max(100).default(1.00),
  retencaoPIS: z.coerce.number().min(0).max(100).default(0.65),
  retencaoCOFINS: z.coerce.number().min(0).max(100).default(3.00),
  outrasDeducoesPerc: z.coerce.number().min(0).max(100).default(0.00),
  observacoes: z.string().optional(),
  itens: z.array(ItemContratoSchema).optional(),
});

export type ContratoInput = z.infer<typeof ContratoSchema>;
