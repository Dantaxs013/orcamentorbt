# BRIEFING — 2026-10-20T20:14:00Z

## Mission
Formulate User Permissions API specification for GET /api/usuarios, POST /api/usuarios, and PATCH /api/usuarios/[id] with >=1 module enforcement and admin self-lockout guard.

## 🔒 My Identity
- Archetype: explorer
- Roles: investigation, synthesis
- Working directory: c:/Users/aaaaa/OneDrive - Piatec/TI_CODIGOS/T.I/orçamento RBT/.agents/teamwork/explorer_m3_2
- Original parent: e65a3c02-8d0d-46b7-ac87-62b0077928ce
- Milestone: M3 (User Management UI & Permissions API)

## 🔒 Key Constraints
- Read-only investigation — do NOT implement directly in project files
- Enforce >= 1 module (acessoOrcamento || acessoMedicao)
- Guard admin against self-lockout/self-deactivation in PATCH
- Return exact code snippets / drop-in recipes with Zod and TypeScript

## Current Parent
- Conversation ID: e65a3c02-8d0d-46b7-ac87-62b0077928ce
- Updated: 2026-10-20T20:14:00Z

## Investigation State
- **Explored paths**:
  - `prisma/schema.prisma` (User model: acessoOrcamento, acessoMedicao, role, etc.)
  - `src/app/api/usuarios/route.ts` (GET & POST handlers)
  - `src/app/api/usuarios/[id]/route.ts` (PATCH & DELETE handlers)
  - `src/app/dashboard/usuarios/page.tsx` (initialUsers query)
  - `src/components/usuarios/usuarios-client.tsx` (frontend interaction)
  - `src/lib/session.ts` & `src/lib/auth.ts` (session & role helpers)
  - `src/lib/email.ts` (sendNovoUsuarioEmail)
  - `scripts/verify-portal-unified.ts` (Suites 1.4 & 2.3 oracle contracts)
- **Key findings**:
  - Prisma User model already has `acessoOrcamento` and `acessoMedicao` fields.
  - `GET /api/usuarios` must add `acessoOrcamento` and `acessoMedicao` to `select`.
  - `POST /api/usuarios` must validate inputs, assign role-based defaults if omitted, reject 0 modules with HTTP 400, and persist to Prisma.
  - `PATCH /api/usuarios/[id]` must validate partial updates, prevent effective 0 modules with HTTP 400, and guard logged-in admin against self-deactivation, self-module-revocation, and self-demotion.
  - Baseline typecheck defect noticed: `src/app/layout.tsx` lacks `import React from 'react';`.
- **Unexplored areas**: None for M3-2 scope.

## Key Decisions Made
- Structured complete Zod validation schemas in `src/lib/validations/usuario.schema.ts`.
- Integrated defensive role-based defaulting: ADMIN -> dual, ORCAMENTISTA -> orçamentos, ENGENHEIRO/APONTADOR -> medição.
- Unified the exact error message: "O usuário deve possuir acesso a pelo menos um módulo do sistema (pelo menos um módulo de acesso deve ser selecionado)."

## Artifact Index
- DISPATCH.md — Task assignment and instructions
- BRIEFING.md — Persistent memory
- progress.md — Heartbeat and progress tracking
- handoff.md — Final handoff report with drop-in code recipes
