import { z } from 'zod';

export const LoginSchema = z.object({
  email: z
    .string()
    .min(1, 'E-mail é obrigatório')
    .email('Formato de e-mail inválido')
    .transform((val) => val.toLowerCase().trim()),
  password: z
    .string()
    .min(6, 'A senha deve ter pelo menos 6 caracteres'),
});

export type LoginInput = z.infer<typeof LoginSchema>;

export const CreateUserSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  email: z.string().email('E-mail inválido').transform((v) => v.toLowerCase().trim()),
  password: z.string().min(8, 'Senha deve ter pelo menos 8 caracteres'),
  role: z.enum(['APONTADOR', 'ENGENHEIRO', 'ADMINISTRADOR', 'ADMIN']),
  telefone: z.string().optional(),
});

export type CreateUserInput = z.infer<typeof CreateUserSchema>;
