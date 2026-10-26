import { z } from 'zod';

export const userRoleEnum = z.enum([
  'ADMIN',
  'ADMINISTRADOR',
  'ORCAMENTISTA',
  'ENGENHEIRO',
  'APONTADOR',
]);

export type UserRoleType = z.infer<typeof userRoleEnum>;

/**
 * Zod schema for POST /api/usuarios
 */
export const createUserSchema = z
  .object({
    name: z
      .string({ required_error: 'Nome é obrigatório.' })
      .trim()
      .min(2, 'O nome deve ter pelo menos 2 caracteres.'),
    email: z
      .string({ required_error: 'E-mail é obrigatório.' })
      .trim()
      .toLowerCase()
      .email('Informe um e-mail válido.'),
    password: z
      .string({ required_error: 'Senha é obrigatória.' })
      .min(6, 'A senha deve conter no mínimo 6 caracteres.'),
    role: z
      .preprocess(
        (val) => (typeof val === 'string' ? val.trim().toUpperCase() : val),
        userRoleEnum
      )
      .default('ORCAMENTISTA'),
    telefone: z.string().trim().optional().nullable(),
    ativo: z.boolean().default(true),
    acessoOrcamento: z.preprocess(
      (val) => (val === undefined ? undefined : Boolean(val)),
      z.boolean().optional()
    ),
    acessoMedicao: z.preprocess(
      (val) => (val === undefined ? undefined : Boolean(val)),
      z.boolean().optional()
    ),
  })
  .transform((data) => {
    // Role-based defensive defaults when flags are omitted
    const roleUpper = String(data.role || '').toUpperCase();
    const fallbackOrcamento =
      roleUpper === 'ADMIN' ||
      roleUpper === 'ADMINISTRADOR' ||
      roleUpper === 'ORCAMENTISTA';
    const fallbackMedicao =
      roleUpper === 'ADMIN' ||
      roleUpper === 'ADMINISTRADOR' ||
      roleUpper === 'APONTADOR' ||
      roleUpper === 'ENGENHEIRO';

    const acessoOrcamento =
      typeof data.acessoOrcamento === 'boolean'
        ? data.acessoOrcamento
        : fallbackOrcamento;
    const acessoMedicao =
      typeof data.acessoMedicao === 'boolean'
        ? data.acessoMedicao
        : fallbackMedicao;

    return {
      ...data,
      acessoOrcamento,
      acessoMedicao,
    };
  })
  .refine(
    (data) => data.acessoOrcamento || data.acessoMedicao,
    {
      message:
        'Pelo menos um módulo de acesso deve ser selecionado (Orçamentos ou Medição Diária).',
      path: ['acessoOrcamento'],
    }
  );

export type CreateUserInput = z.infer<typeof createUserSchema>;

/**
 * Zod schema for PATCH /api/usuarios/[id]
 */
export const updateUserSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, 'O nome deve ter pelo menos 2 caracteres.')
      .optional(),
    email: z
      .string()
      .trim()
      .toLowerCase()
      .email('Informe um e-mail válido.')
      .optional(),
    role: z
      .preprocess(
        (val) => (typeof val === 'string' ? val.trim().toUpperCase() : val),
        userRoleEnum
      )
      .optional(),
    password: z
      .string()
      .min(6, 'A senha deve conter no mínimo 6 caracteres.')
      .optional()
      .or(z.literal('')),
    telefone: z.string().trim().optional().nullable(),
    ativo: z.boolean().optional(),
    acessoOrcamento: z.preprocess(
      (val) => (val === undefined ? undefined : Boolean(val)),
      z.boolean().optional()
    ),
    acessoMedicao: z.preprocess(
      (val) => (val === undefined ? undefined : Boolean(val)),
      z.boolean().optional()
    ),
  })
  .refine(
    (data) => {
      // Reject if both flags are explicitly set to false
      if (data.acessoOrcamento === false && data.acessoMedicao === false) {
        return false;
      }
      return true;
    },
    {
      message:
        'Pelo menos um módulo de acesso deve ser selecionado (Orçamentos ou Medição Diária).',
      path: ['acessoOrcamento'],
    }
  );

export type UpdateUserInput = z.infer<typeof updateUserSchema>;
