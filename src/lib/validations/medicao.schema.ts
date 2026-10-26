import { z } from 'zod';

export const ItemMedicaoInputSchema = z.object({
  itemContratoId: z.string().min(1),
  quantidadeAnterior: z.coerce.number().min(0).default(0),
  quantidadePeriodo: z.coerce.number().min(0).default(0),
});

export const MedicaoCreateSchema = z.object({
  obraId: z.string().min(1, 'Obra é obrigatória'),
  contratoId: z.string().min(1, 'Contrato é obrigatório'),
  numeroMedicao: z.number().int().min(1),
  periodoInicio: z.coerce.date(),
  periodoFim: z.coerce.date(),
  observacoes: z.string().optional(),
  relatorioIds: z.array(z.string()).optional(),
  itens: z.array(ItemMedicaoInputSchema).optional(),
}).refine((data) => data.periodoFim >= data.periodoInicio, {
  message: 'A data final do período deve ser igual ou posterior à data inicial',
  path: ['periodoFim'],
});

export type MedicaoCreateInput = z.infer<typeof MedicaoCreateSchema>;
