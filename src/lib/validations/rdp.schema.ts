import { z } from 'zod';

export const LinhaProducaoSchema = z.object({
  numeroLinha: z.number().int().min(1).max(25),
  numeroEstaca: z.string().nullable().optional(),
  perfil: z.string().nullable().optional(), // W150, W310, etc.
  horaInicio: z.string().nullable().optional(),
  horaFim: z.string().nullable().optional(),
  comprimento: z.coerce.number().min(0, 'Comprimento não pode ser negativo').optional(),
  profundidade: z.coerce.number().min(0, 'Profundidade não pode ser negativa').default(0),
  cotaTerreno: z.coerce.number().nullable().optional(),
  cotaArrasamento: z.coerce.number().nullable().optional(),
  comprimentoUtil: z.coerce.number().nullable().optional(),
  diametro: z.coerce.number().int().nullable().optional(),
  emendaW150: z.coerce.number().int().min(0).default(0),
  emendaW310: z.coerce.number().int().min(0).default(0),
  talas: z.coerce.number().int().min(0).default(0),
  arrasamento: z.coerce.number().min(0).default(0),
  negaRepique: z.string().nullable().optional(),
  horarioCravacao: z.string().nullable().optional(),
  tempoParadaMinutos: z.coerce.number().int().min(0).default(0),
  motivoParada: z.string().nullable().optional(),
  observacao: z.string().nullable().optional(),
});

export type LinhaProducaoInput = z.infer<typeof LinhaProducaoSchema>;

export const RelatorioDiarioSchema = z.object({
  id: z.string().optional(),
  obraId: z.string().min(1, 'Obra é obrigatória'),
  numeroSequencial: z.number().int().min(1).optional(),
  data: z.coerce.date(),
  turno: z.string().default('DIURNO'),
  horaInicio: z.string().optional(),
  horaFim: z.string().optional(),
  horarioInicio: z.string().optional(),
  horarioTermino: z.string().optional(),
  intervaloAlmocoInicio: z.string().optional(),
  intervaloAlmocoFim: z.string().optional(),
  horasTrabalhadas: z.coerce.number().optional(),
  horasParadas: z.coerce.number().optional(),
  motivoParada: z.string().optional(),
  maquinaEquipamento: z.string().min(1, 'Máquina/Equipamento é obrigatório'),
  operador: z.string().min(1, 'Nome do operador é obrigatório'),
  encarregado: z.string().nullable().optional(),
  soldador: z.string().nullable().optional(),
  equipeDescricao: z.string().nullable().optional(),
  condicaoClimatica: z.enum(['BOM_SOL', 'NUBLADO', 'CHUVA_LEVE', 'CHUVA_FORTE', 'IMPRACTICAVEL']).default('BOM_SOL'),
  status: z.enum(['RASCUNHO', 'SUBMETIDO', 'APROVADO', 'REJEITADO']).default('RASCUNHO'),
  observacoes: z.string().nullable().optional(),
  motivoRejeicao: z.string().nullable().optional(),
  assinadoApontador: z.boolean().optional(),
  dataAssinaturaApontador: z.coerce.date().nullable().optional(),
  assinadoEngenheiro: z.boolean().optional(),
  dataAssinaturaEngenheiro: z.coerce.date().nullable().optional(),
  linhas: z.array(LinhaProducaoSchema).max(25, 'O relatório permite no máximo 25 linhas de produção'),
});

export type RelatorioDiarioInput = z.infer<typeof RelatorioDiarioSchema>;
