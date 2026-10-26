# Handoff Report: Explorer M3-2 — User Permissions API Specification

**Author**: `explorer_m3_2`  
**Milestone**: M3 (User Management UI & Permissions API)  
**Target Routes**:
- `src/app/api/usuarios/route.ts` (`GET`, `POST`)
- `src/app/api/usuarios/[id]/route.ts` (`PATCH`, `DELETE`)
- `src/lib/validations/usuario.schema.ts` (Zod schemas & types)

---

## 1. Observation

Direct investigation of the codebase and test harness revealed:

1. **Prisma User Schema (`prisma/schema.prisma:70-83`)**:
   ```prisma
   model User {
     id              String      @id @default(uuid())
     name            String
     nome            String?
     email           String      @unique
     passwordHash    String
     role            String      @default("ORCAMENTISTA")
     telefone        String?
     ativo           Boolean     @default(true)
     acessoOrcamento Boolean     @default(true)
     acessoMedicao   Boolean     @default(false)
     createdAt       DateTime    @default(now())
     updatedAt       DateTime    @updatedAt
     ...
   ```
   Both `acessoOrcamento` and `acessoMedicao` fields already exist in the SQLite database schema and Prisma Client model (seeded in M1).

2. **Existing `GET /api/usuarios` (`src/app/api/usuarios/route.ts:18-35`)**:
   ```ts
   const users = await prisma.user.findMany({
     select: {
       id: true,
       name: true,
       email: true,
       role: true,
       ativo: true,
       createdAt: true,
       _count: {
         select: {
           orcamentos: true,
         },
       },
     },
     orderBy: { createdAt: 'desc' },
   });
   ```
   Currently, `acessoOrcamento` and `acessoMedicao` are missing from the `select` projection.

3. **Existing `POST /api/usuarios` (`src/app/api/usuarios/route.ts:61-109`)**:
   - Only reads `name, email, password, role`.
   - Forces `const validRole = role === 'ADMIN' ? 'ADMIN' : 'ORCAMENTISTA';` ignoring valid roles `ENGENHEIRO` and `APONTADOR`.
   - Does not parse `acessoOrcamento` or `acessoMedicao`.
   - Does not enforce the `>= 1 module` business rule.
   - Does not persist `acessoOrcamento` or `acessoMedicao` to `prisma.user.create`.
   - Does not return `acessoOrcamento` or `acessoMedicao` in the response projection.

4. **Existing `PATCH /api/usuarios/[id]` (`src/app/api/usuarios/[id]/route.ts:31-78`)**:
   - Only updates `role, ativo, name, password`.
   - Has a partial self-lockout guard:
     ```ts
     if (id === session.user.id && !ativo) {
       return NextResponse.json(
         { error: 'Você não pode desativar o seu próprio usuário atual.' },
         { status: 400 }
       );
     }
     ```
   - Does not allow updating `acessoOrcamento` or `acessoMedicao`.
   - Does not guard against a user being updated to 0 modules.
   - Does not guard against the logged-in admin revoking all modules from themselves.
   - Returns `select` omitting `acessoOrcamento` and `acessoMedicao`.

5. **Existing `page.tsx` (`src/app/dashboard/usuarios/page.tsx:15-30`)**:
   The SSR page loads `initialUsers` for `UsuariosClient`, using a `prisma.user.findMany` that also lacks `acessoOrcamento` and `acessoMedicao`.

6. **Oracle Contracts in Verification Harness (`scripts/verify-portal-unified.ts`)**:
   - Suite 1.4 (`verify-portal-unified.ts:279-308` & `640-695`):
     - Validates payload requires `name` (>=2 chars), `email` (valid), and `(acessoOrcamento || acessoMedicao) === true`.
     - Explicit error string test: `assertIncludes(validation.errors[0], 'Pelo menos um módulo de acesso deve ser selecionado')`.
   - Suite 2.3 (`verify-portal-unified.ts:983-1025`):
     - Evaluates full Cartesian product: `{ orc: false, med: false }` -> invalid; `{ orc: true, med: false }`, `{ orc: false, med: true }`, `{ orc: true, med: true }` -> valid.
     - Coerces non-boolean truthy/falsy values safely.

7. **Baseline Diagnostics**:
   - `npm test` -> 29/29 tests PASS.
   - `npx tsx scripts/verify-portal-unified.ts --tier=1` -> 28/28 tests PASS.
   - `npx tsx scripts/verify-portal-unified.ts --tier=2` -> 12/12 tests PASS.
   - `npx tsc --noEmit` -> 1 error in `src/app/layout.tsx(13,13)` (`Cannot find namespace 'React'`).

---

## 2. Logic Chain

1. **Database Readiness (Observation 1)**: Because `prisma/schema.prisma` already defines `acessoOrcamento Boolean @default(true)` and `acessoMedicao Boolean @default(false)`, no additional database migrations or schema alterations are required.
2. **Data Consistency in UI (Observations 2 & 5)**: When `GET /api/usuarios` (and `src/app/dashboard/usuarios/page.tsx`) select `acessoOrcamento` and `acessoMedicao`, the frontend `UsuariosClient` can display accurate badges for Orçamentos and Medição without undefined values or stale defaults.
3. **Zod Validation & Defaults (Observations 3 & 6)**:
   - When creating a user via `POST /api/usuarios`, if `acessoOrcamento` and `acessoMedicao` are omitted by legacy callers, the API must apply role-based defaults:
     - `ADMIN` / `ADMINISTRADOR` -> dual access (`acessoOrcamento: true, acessoMedicao: true`)
     - `ORCAMENTISTA` -> `acessoOrcamento: true, acessoMedicao: false`
     - `ENGENHEIRO` / `APONTADOR` -> `acessoOrcamento: false, acessoMedicao: true`
   - If both flags are explicitly `false` (or result in both `false`), the API must reject with HTTP 400 and return the canonical error message: `"O usuário deve possuir acesso a pelo menos um módulo do sistema (pelo menos um módulo de acesso deve ser selecionado)."`
4. **State-Aware PATCH Protection (Observation 4)**:
   - A `PATCH` request may provide only one flag (e.g. `{ acessoOrcamento: false }`). Checking only the request body is insufficient: the API must merge the incoming patch with the existing record in the database:
     ```ts
     const finalOrc = typeof data.acessoOrcamento === 'boolean' ? data.acessoOrcamento : user.acessoOrcamento;
     const finalMed = typeof data.acessoMedicao === 'boolean' ? data.acessoMedicao : user.acessoMedicao;
     ```
   - If `!finalOrc && !finalMed`, the update would leave the user with zero access. Reject with HTTP 400.
5. **Self-Lockout Immunity (Observation 4)**:
   - If `id === session.user.id`:
     - Disallow deactivation: `if (data.ativo === false) -> HTTP 400` ("Você não pode desativar o seu próprio usuário atual.").
     - Disallow total revocation: `if (!finalOrc && !finalMed) -> HTTP 400` ("Você não pode revogar todos os seus próprios acessos a módulos.").
     - Disallow self-demotion from Admin: `if (data.role && !isAdmin(data.role)) -> HTTP 400` ("Você não pode rebaixar o seu próprio perfil de Administrador.").
6. **Role Support Expansion (Observation 3)**:
   - Next.js portal integrates Orçamentos and Medição Diária. The valid roles must include `ADMIN`, `ADMINISTRADOR`, `ORCAMENTISTA`, `ENGENHEIRO`, and `APONTADOR`.
   - `sendNovoUsuarioEmail` properly maps roles to friendly titles (`Gestor (ADMIN)`, `Engenheiro Orçamentista`, `Engenheiro de Obras`, `Apontador de Campo`).

---

## 3. Caveats

1. **Pre-existing Typecheck Defect**: `src/app/layout.tsx(13,13)` fails `npx tsc --noEmit` because `import React from 'react';` is missing. The implementer should add this import to achieve clean 0-error `tsc` output.
2. **Session Meta Sync on Self-Update**: If an admin modifies their own module permissions, the current Edge HMAC cookie (`rbt_user_meta`) retains the old claims until re-login or cookie refresh. Because the admin is prevented from removing all their own access, navigation remains viable.
3. **No Database Migration Needed**: `dev.db` already has columns `acessoOrcamento` and `acessoMedicao`. `npx prisma db push` is not needed unless schema changes.

---

## 4. Conclusion & Drop-In Code Recipes

Below are the exact, complete, production-ready code recipes for Milestone M3.

### 4.1 Schema Definition: `src/lib/validations/usuario.schema.ts`

```ts
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
    role: userRoleEnum.default('ORCAMENTISTA'),
    telefone: z.string().trim().optional().nullable(),
    ativo: z.boolean().default(true),
    acessoOrcamento: z.boolean().optional(),
    acessoMedicao: z.boolean().optional(),
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
        'O usuário deve possuir acesso a pelo menos um módulo do sistema (pelo menos um módulo de acesso deve ser selecionado).',
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
    role: userRoleEnum.optional(),
    password: z
      .string()
      .min(6, 'A senha deve conter no mínimo 6 caracteres.')
      .optional(),
    telefone: z.string().trim().optional().nullable(),
    ativo: z.boolean().optional(),
    acessoOrcamento: z.boolean().optional(),
    acessoMedicao: z.boolean().optional(),
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
        'O usuário deve possuir acesso a pelo menos um módulo do sistema (pelo menos um módulo de acesso deve ser selecionado).',
      path: ['acessoOrcamento'],
    }
  );

export type UpdateUserInput = z.infer<typeof updateUserSchema>;
```

---

### 4.2 Endpoint Implementation: `src/app/api/usuarios/route.ts`

```ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from '@/lib/session';
import { hashPassword, isAdmin } from '@/lib/auth';
import { sendNovoUsuarioEmail } from '@/lib/email';
import { createUserSchema } from '@/lib/validations/usuario.schema';

/**
 * GET /api/usuarios
 * Retorna a lista de usuários cadastrados com permissões modulares
 */
export async function GET() {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: 'Acesso restrito. Faça login.' }, { status: 401 });
  }

  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        ativo: true,
        acessoOrcamento: true,
        acessoMedicao: true,
        createdAt: true,
        _count: {
          select: {
            orcamentos: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ users });
  } catch (error) {
    console.error('Erro ao listar usuários:', error);
    return NextResponse.json({ error: 'Erro ao carregar lista de usuários.' }, { status: 500 });
  }
}

/**
 * POST /api/usuarios
 * Cria um novo usuário com validação de permissões de módulos (>= 1 módulo obrigatório)
 */
export async function POST(req: NextRequest) {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: 'Acesso restrito. Faça login.' }, { status: 401 });
  }

  // Apenas Gestores (ADMIN / ADMINISTRADOR) podem cadastrar novos usuários
  if (!isAdmin(session.user.role)) {
    return NextResponse.json(
      { error: 'Apenas Gestores (ADMIN) possuem permissão para criar novos usuários.' },
      { status: 403 }
    );
  }

  try {
    const body = await req.json();
    const parseResult = createUserSchema.safeParse(body);

    if (!parseResult.success) {
      const issue = parseResult.error.issues[0];
      return NextResponse.json(
        { error: issue?.message || 'Dados de usuário inválidos.' },
        { status: 400 }
      );
    }

    const {
      name,
      email,
      password,
      role,
      telefone,
      ativo,
      acessoOrcamento,
      acessoMedicao,
    } = parseResult.data;

    const emailNormalizado = email.toLowerCase().trim();
    const existing = await prisma.user.findUnique({
      where: { email: emailNormalizado },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'Já existe um usuário cadastrado com este e-mail.' },
        { status: 409 }
      );
    }

    const passwordHash = await hashPassword(password);

    const novoUsuario = await prisma.user.create({
      data: {
        name: name.trim(),
        email: emailNormalizado,
        passwordHash,
        role,
        telefone: telefone || null,
        ativo: ativo ?? true,
        acessoOrcamento,
        acessoMedicao,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        ativo: true,
        acessoOrcamento: true,
        acessoMedicao: true,
        createdAt: true,
      },
    });

    // Mapeamento amigável de perfil para e-mail institucional
    const perfilMap: Record<string, string> = {
      ADMIN: 'Gestor (ADMIN)',
      ADMINISTRADOR: 'Gestor (ADMIN)',
      ORCAMENTISTA: 'Engenheiro Orçamentista',
      ENGENHEIRO: 'Engenheiro de Obras',
      APONTADOR: 'Apontador de Campo',
    };

    const baseUrl = process.env.APP_URL || 'https://orcamentos.rbtfundacoes.com.br';
    const loginUrl = `${baseUrl}/login`;

    await sendNovoUsuarioEmail({
      to: novoUsuario.email,
      nome: novoUsuario.name,
      email: novoUsuario.email,
      senhaTemporaria: password,
      perfil: perfilMap[novoUsuario.role] || novoUsuario.role,
      loginUrl,
    }).catch((err) => {
      console.error('Falha ao enviar e-mail de novo usuário (não bloqueante):', err);
    });

    return NextResponse.json(
      {
        success: true,
        message: `Usuário ${novoUsuario.name} cadastrado com sucesso e credenciais enviadas por e-mail.`,
        user: novoUsuario,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Erro ao cadastrar usuário:', error);
    return NextResponse.json(
      { error: 'Erro interno ao cadastrar usuário.' },
      { status: 500 }
    );
  }
}
```

---

### 4.3 Endpoint Implementation: `src/app/api/usuarios/[id]/route.ts`

```ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from '@/lib/session';
import { hashPassword, isAdmin } from '@/lib/auth';
import { updateUserSchema } from '@/lib/validations/usuario.schema';

interface RouteContext {
  params: {
    id: string;
  };
}

/**
 * PATCH /api/usuarios/[id]
 * Atualiza dados, papéis e permissões modulares de acesso (acessoOrcamento, acessoMedicao).
 * Protegido contra auto-bloqueio do admin em sessão.
 */
export async function PATCH(req: NextRequest, { params }: RouteContext) {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: 'Acesso restrito. Faça login.' }, { status: 401 });
  }

  if (!isAdmin(session.user.role)) {
    return NextResponse.json(
      { error: 'Apenas Gestores (ADMIN) possuem permissão para alterar usuários.' },
      { status: 403 }
    );
  }

  try {
    const { id } = params;
    const body = await req.json();

    const parseResult = updateUserSchema.safeParse(body);
    if (!parseResult.success) {
      const issue = parseResult.error.issues[0];
      return NextResponse.json(
        { error: issue?.message || 'Dados de atualização inválidos.' },
        { status: 400 }
      );
    }

    const data = parseResult.data;

    const user = await prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      return NextResponse.json({ error: 'Usuário não encontrado.' }, { status: 404 });
    }

    // Calcula os estados finais de permissão após o merge com o estado atual do banco
    const targetOrcamento =
      typeof data.acessoOrcamento === 'boolean'
        ? data.acessoOrcamento
        : user.acessoOrcamento;
    const targetMedicao =
      typeof data.acessoMedicao === 'boolean'
        ? data.acessoMedicao
        : user.acessoMedicao;

    // REGRA UNIVERSAL: Pelo menos um módulo de acesso deve ser mantido
    if (!targetOrcamento && !targetMedicao) {
      return NextResponse.json(
        {
          error:
            'O usuário deve possuir acesso a pelo menos um módulo do sistema (pelo menos um módulo de acesso deve ser selecionado).',
        },
        { status: 400 }
      );
    }

    // PROTEÇÃO ATIVA DE AUTO-BLOQUEIO DO GESTOR LOGADO
    if (id === session.user.id) {
      if (typeof data.ativo === 'boolean' && !data.ativo) {
        return NextResponse.json(
          { error: 'Você não pode desativar o seu próprio usuário atual.' },
          { status: 400 }
        );
      }
      if (!targetOrcamento && !targetMedicao) {
        return NextResponse.json(
          { error: 'Você não pode revogar todos os seus próprios acessos a módulos.' },
          { status: 400 }
        );
      }
      if (data.role && !isAdmin(data.role)) {
        return NextResponse.json(
          { error: 'Você não pode rebaixar o seu próprio perfil de Administrador.' },
          { status: 400 }
        );
      }
    }

    const dataToUpdate: Record<string, any> = {};

    if (data.name !== undefined) {
      dataToUpdate.name = data.name.trim();
    }
    if (data.role !== undefined) {
      dataToUpdate.role = data.role;
    }
    if (typeof data.ativo === 'boolean') {
      dataToUpdate.ativo = data.ativo;
    }
    if (data.telefone !== undefined) {
      dataToUpdate.telefone = data.telefone;
    }
    if (typeof data.acessoOrcamento === 'boolean') {
      dataToUpdate.acessoOrcamento = data.acessoOrcamento;
    }
    if (typeof data.acessoMedicao === 'boolean') {
      dataToUpdate.acessoMedicao = data.acessoMedicao;
    }
    if (data.password) {
      dataToUpdate.passwordHash = await hashPassword(data.password);
    }

    const updated = await prisma.user.update({
      where: { id },
      data: dataToUpdate,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        ativo: true,
        acessoOrcamento: true,
        acessoMedicao: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Dados do usuário atualizados com sucesso.',
      user: updated,
    });
  } catch (error) {
    console.error('Erro ao atualizar usuário:', error);
    return NextResponse.json(
      { error: 'Erro interno ao atualizar usuário.' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/usuarios/[id]
 * Exclui permanentemente o usuário do sistema
 */
export async function DELETE(req: NextRequest, { params }: RouteContext) {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: 'Acesso restrito. Faça login.' }, { status: 401 });
  }

  if (!isAdmin(session.user.role)) {
    return NextResponse.json(
      { error: 'Apenas Gestores (ADMIN) possuem permissão para excluir usuários.' },
      { status: 403 }
    );
  }

  try {
    const { id } = params;

    // Impede o gestor de deletar a sua própria conta ativa
    if (id === session.user.id) {
      return NextResponse.json(
        { error: 'Você não pode excluir o seu próprio usuário em uso.' },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      return NextResponse.json({ error: 'Usuário não encontrado.' }, { status: 404 });
    }

    await prisma.user.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: `Usuário ${user.name} (${user.email}) foi excluído permanentemente do sistema.`,
    });
  } catch (error) {
    console.error('Erro ao excluir usuário:', error);
    return NextResponse.json(
      { error: 'Erro interno ao excluir usuário.' },
      { status: 500 }
    );
  }
}
```

---

### 4.4 SSR Integration Note: `src/app/dashboard/usuarios/page.tsx`

To ensure full end-to-end synchronization on page load, `UsuariosPage` lines 15-30 should be updated to select `acessoOrcamento: true, acessoMedicao: true`:
```ts
  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      ativo: true,
      acessoOrcamento: true,
      acessoMedicao: true,
      createdAt: true,
      _count: {
        select: {
          orcamentos: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
```

---

## 5. Verification Method

To verify these changes after implementation:

1. **Automated Test Suites**:
   - `npm test` -> must pass all 29 tests.
   - `npx tsx scripts/verify-portal-unified.ts --tier=1` -> must pass all 28 tests (specifically Suite 1.4).
   - `npx tsx scripts/verify-portal-unified.ts --tier=2` -> must pass all 12 tests (specifically Suite 2.3).
2. **Typecheck & Production Build**:
   - After adding `import React from 'react';` to `src/app/layout.tsx`:
     `npx tsc --noEmit` -> 0 errors.
   - `npm run build` -> compiles all static pages and API endpoints with zero route collisions.
3. **Invalidation Conditions**:
   - If `POST /api/usuarios` accepts `{ acessoOrcamento: false, acessoMedicao: false }` -> fails validation.
   - If `PATCH /api/usuarios/[id]` allows an admin to deactivate their own account or revoke all modules from themselves -> security failure.
   - If `GET /api/usuarios` omits `acessoOrcamento` or `acessoMedicao` from returned objects -> breaks frontend table badges.
