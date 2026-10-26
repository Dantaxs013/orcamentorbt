# Handoff Report — Blueprint for APIs, Domain Calculations, Validations, and Email Consolidation

- **Author**: `explorer_m4_2`
- **Working Directory**: `c:/Users/aaaaa/OneDrive - Piatec/TI_CODIGOS/T.I/orçamento RBT/.agents/teamwork/explorer_m4_2`
- **Date**: 2026-10-20
- **Recipient**: Parent Agent (`e65a3c02-8d0d-46b7-ac87-62b0077928ce`)
- **Status**: Complete Blueprint Formulation

---

## 1. Observation

A detailed comparative inspection of `..\Medicaodiaria` (source) and `..\orçamento RBT` (destination) was conducted across API routes, domain math modules, validation schemas, email services, session handlers, and database definitions.

### 1.1 API Routes Inventory
In `Medicaodiaria/src/app/api`:
- Produção/RDP:
  - `/api/rdp/route.ts` (`GET`, `POST`) — 271 lines. Imports `getServerSession`, `applySecurityHeaders`, `stripFinancialData`, `RelatorioDiarioSchema`, `validateRdpSubmission`, `calculateLineMetrics`.
  - `/api/rdp/[id]/route.ts` (`GET`, `PUT`) — 226 lines. Scoped editing for `APONTADOR` (`RASCUNHO` or `REJEITADO` only); sanitized with `stripFinancialData`.
  - `/api/rdp/[id]/aprovar/route.ts` (`POST`) — 82 lines. Validates actions `APROVAR` or `REJEITAR`, registers reviewer (`revisadoPorId`), triggers email notification, returns JSON or redirects to `/engenheiro/validacao?sucesso=1`.
  - `/api/rdp/[id]/pdf/route.ts` (`GET`) — 207 lines. Generates printable HTML representation of the physical 25-row RDP sheet with totals, emendas, and signature blocks.
- Estacas:
  - `/api/estacas/route.ts` (`GET`, `POST`) — 117 lines. Lists active estacas by `obraId` and creates new `estacaPrincipal`.
  - `/api/estacas/[id]/route.ts` (`PATCH`, `DELETE`) — 82 lines. Updates and deletes estacas.
- Obras:
  - `/api/obras/route.ts` (`GET`, `POST`) — 65 lines. Role-scoped query (`ENGENHEIRO` vs `ADMINISTRADOR`) and creates obras.
- Contratos:
  - `/api/contratos/route.ts` (`GET`, `POST`) — 88 lines. Manages contractual agreements and line items (`ItemContrato`) with unit prices and tax deduction bases.
- Medições:
  - `/api/medicoes/route.ts` (`GET`, `POST`) — 138 lines. Lists and creates measurement bulletins (`Medicao`), computes cumulative history (`itensAnteriores`), creates items with calculated initial balances.
  - `/api/medicoes/[id]/route.ts` (`GET`, `PATCH`, `POST`) — 179 lines. `GET` returns bulletin; `PATCH` recalculates retention taxes (`recalcularMedicao`: INSS, ISS, IRRF, CSLL, PIS, COFINS, outras deduções); `POST` submits to management (`SUBMETIDA_GESTAO`) and notifies administrators.
  - `/api/medicoes/[id]/excel/route.ts` (`GET`) — 259 lines. **Uses `exceljs` (`import ExcelJS from 'exceljs'`)** to generate formatted `.xlsx` binary spreadsheet with 14 columns, corporate palette (`#111827`, `#BA1A1A`), formulas, and returns `new NextResponse(buffer as ArrayBuffer, { headers: { 'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' } })`.
- Marca & Saúde:
  - `/api/marca/pdf/route.ts` (`GET`) — 394 lines. Renders RBT brand manual with corporate color palette and typography.
  - `/api/health/route.ts` (`GET`) — 31 lines. Database healthcheck via `prisma.$queryRaw\`SELECT 1\``.
- Admin Usuários:
  - `/api/admin/usuarios/route.ts` (`GET`, `POST`) — 54 lines. Queried by `Medicaodiaria/src/components/admin/gestao-usuarios-client.tsx`.
  - `/api/admin/usuarios/[id]/route.ts` (`PATCH`) — 33 lines. Updates user details and password hash.

### 1.2 Package & Dependency Verification
In `orçamento RBT/package.json`:
- `"exceljs": "^4.4.0"` is confirmed installed in dependencies (line 24).
- `"bcryptjs": "^2.4.3"`, `"nodemailer": "^6.9.15"`, `"zod": "^3.23.8"`, `"@prisma/client": "^5.21.1"` are all installed with identical versions.

### 1.3 Session & Auth Helper Alignment
In `orçamento RBT/src/lib/session.ts`:
- `getServerSession()` (lines 231-247) checks both `rbt_orcamentos_session` and `rbt_session` cookies:
  ```typescript
  const token =
    cookieStore.get(SESSION_COOKIE_NAME)?.value ||
    cookieStore.get(LEGACY_SESSION_COOKIE_NAME)?.value;
  ```
- `validateSession(rawToken)` (lines 44-123) retrieves `User` including `acessoOrcamento` and `acessoMedicao`, and returns `{ session: { id, expiresAt }, user: AuthUser }`.
- `buildSessionCookies` (lines 160-190) sets both `rbt_orcamentos_session` and `rbt_session`, plus `rbt_user_meta` signed with HMAC SHA-256 for Edge Middleware.

In `orçamento RBT/src/lib/auth.ts`:
- `stripFinancialData<T>(data: T): T` (lines 106-127) and `FINANCIAL_KEYS` (lines 74-101) are already implemented and match the exact specification required by Medição Diária.
- Role helpers `isAdmin`, `isEngenheiro`, `isApontador`, `isOrcamentista`, `hasRole` are present.
- Role equivalence: In `orçamento RBT`, the admin role can be `'ADMIN'` or `'ADMINISTRADOR'`, whereas `Medicaodiaria` strictly checked `'ADMINISTRADOR'`.

### 1.4 Email Service State
In `orçamento RBT/src/lib/email.ts` (365 lines):
- Currently implements:
  - `getMailTransporter()`: Nodemailer transporter with Office365 support, timeout handling, and simulation fallback when SMTP env vars are absent.
  - `sendMagicLinkEmail`: Dispatches Magic Link email for technical form completion.
  - `sendPropostaEmail`: Dispatches proposal email with attached commercial proposal PDF buffer.
  - `sendNovoUsuarioEmail`: Dispatches welcome email with credentials, role, and login URL.
- Currently missing:
  - `sendEmail({ to, subject, html })` generic sender.
  - `notifyEngenheiroRdpSubmetido(engEmail, rdpInfo)` for RDP submission/validation alerts.
  - `notifyGestorMedicaoSubmetida(gestorEmail, medicaoInfo)` for measurement bulletin approvals.
  - `sendNovoLeadEmail(props)` helper.

### 1.5 Missing Supporting Libs in `orçamento RBT`
- `src/lib/security-headers.ts`: Does not exist in `orçamento RBT`. Required by `api/rdp`, `api/rdp/[id]`, `api/health`.
- `src/lib/calculations/rdp-math.ts`: Does not exist in `orçamento RBT`.
- `src/lib/validations/rdp.schema.ts`, `contrato.schema.ts`, `medicao.schema.ts`, `auth.schema.ts`, `index.ts`: Do not exist in `orçamento RBT`.
- `src/types/enums.ts`: Does not exist in `orçamento RBT`.

---

## 2. Logic Chain

1. **API Non-Collision**: The 8 Medição API routes (`/api/rdp`, `/api/estacas`, `/api/obras`, `/api/contratos`, `/api/medicoes`, `/api/marca/pdf`, `/api/health`, `/api/admin/usuarios`) have zero collision with existing Orçamentos API routes (`/api/orcamentos`, `/api/solicitacoes`, `/api/formulario`, `/api/usuarios`).
2. **Path Fidelity**: Maintaining the exact path `/api/admin/usuarios` in parallel with `/api/usuarios` ensures that Medição's client components (`gestao-usuarios-client.tsx`) and Orçamentos' client components (`usuarios-client.tsx`) continue to function without rewriting client fetch URLs.
3. **Session Compatibility**: Because `orçamento RBT`'s `getServerSession()` inspects both `rbt_orcamentos_session` and `rbt_session`, every transplanted route importing `getServerSession` from `@/lib/session` will authenticate seamlessly across both modules.
4. **Role Generalization**: In `Medicaodiaria`, several endpoints check `session.user.role === 'ADMINISTRADOR'`. In `orçamento RBT`, admin users may have `role === 'ADMIN'` or `role === 'ADMINISTRADOR'`. Generalizing these checks to `session.user.role === 'ADMINISTRADOR' || session.user.role === 'ADMIN'` (or `isAdmin(session.user.role)`) prevents false 403 Forbidden errors.
5. **Perimeter Module Authorization**: In addition to role validation, all Medição API routes must verify `session.user.acessoMedicao === true` (or `isAdmin(session.user.role)`), returning HTTP 403 if unauthorized.
6. **ExcelJS Readiness**: Because `exceljs` is already installed in `package.json`, `/api/medicoes/[id]/excel` can be transplanted directly, utilizing `wb.xlsx.writeBuffer()` and returning `new NextResponse(buffer as ArrayBuffer, ...)`.
7. **Email Consolidation Safety**: Appending `sendEmail`, `notifyEngenheiroRdpSubmetido`, `notifyGestorMedicaoSubmetida`, and `sendNovoLeadEmail` to `src/lib/email.ts` while leaving `sendMagicLinkEmail`, `sendPropostaEmail`, and `sendNovoUsuarioEmail` intact preserves 100% of Orçamentos email capabilities. Updating the links in Medição emails from `/engenheiro/validacao` to `/medicao/engenheiro/validacao` ensures that recipients land on the correct unified portal URLs.

---

## 3. Caveats

1. **Role Strings in SQLite**: The database stores roles as `VARCHAR/TEXT`. Both `'ADMIN'` and `'ADMINISTRADOR'` must be treated as administrative superusers.
2. **Form vs JSON in `/api/rdp/[id]/aprovar`**: This endpoint handles both JSON fetch and HTML `application/x-www-form-urlencoded` form submissions. When redirecting after HTML form submissions, the redirect target must be `/medicao/engenheiro/validacao?sucesso=1` rather than the old root `/engenheiro/validacao`.
3. **Notification Recipients Query**: In `/api/medicoes/[id]/route.ts` line 163, administrators are queried to receive notifications. The query must look for `where: { role: { in: ['ADMINISTRADOR', 'ADMIN'] }, ativo: true, acessoMedicao: true }` so that it reaches active administrators who have access to Medição.
4. **Security Headers vs Next.js Config**: `applySecurityHeaders` applies explicit headers on API responses. Creating `src/lib/security-headers.ts` satisfies route imports without interfering with `next.config.mjs` security headers.

---

## 4. Conclusion & Complete Blueprint

### Part 1: API Routes Blueprint

The following table specifies all 15 API route handlers to be transplanted into `src/app/api/`:

| Route Path | File Target | Methods | Allowed Roles | Module Guard | Key Operations |
|---|---|---|---|---|---|
| `/api/rdp` | `src/app/api/rdp/route.ts` | `GET`, `POST` | `APONTADOR`, `ENGENHEIRO`, `ADMIN`, `ADMINISTRADOR` | `acessoMedicao === true` | `GET`: List RDPs (scoped to `apontadorId` if Apontador, sanitized via `stripFinancialData`).<br>`POST`: Validate with `RelatorioDiarioSchema` & `validateRdpSubmission`, compute sequential number, create/update RDP and up to 25 `linhasProducao`. |
| `/api/rdp/[id]` | `src/app/api/rdp/[id]/route.ts` | `GET`, `PUT` | `APONTADOR`, `ENGENHEIRO`, `ADMIN`, `ADMINISTRADOR` | `acessoMedicao === true` | `GET`: Fetch RDP with obra, apontador, revisor, linhasProducao.<br>`PUT`: Update RDP fields and lines. Apontador can only edit if status is `RASCUNHO` or `REJEITADO` and own report. |
| `/api/rdp/[id]/aprovar` | `src/app/api/rdp/[id]/aprovar/route.ts` | `POST` | `ENGENHEIRO`, `ADMIN`, `ADMINISTRADOR` | `acessoMedicao === true` | Actions `APROVAR` or `REJEITAR`. Sets `revisadoPorId`, timestamps, signatures. Calls `notifyEngenheiroRdpSubmetido`. Redirects to `/medicao/engenheiro/validacao?sucesso=1` on form submit. |
| `/api/rdp/[id]/pdf` | `src/app/api/rdp/[id]/pdf/route.ts` | `GET` | Authenticated | `acessoMedicao === true` | Returns A4 printable HTML layout of 25-row physical RDP sheet with signatures for Apontador, Engenheiro, and Fiscal. |
| `/api/estacas` | `src/app/api/estacas/route.ts` | `GET`, `POST` | Authenticated | `acessoMedicao === true` | `GET`: List active estacas (optional `obraId` filter).<br>`POST`: Create new `EstacaPrincipal` (`nome`, `perfil`, `comprimento`, `obraId`). |
| `/api/estacas/[id]` | `src/app/api/estacas/[id]/route.ts` | `PATCH`, `DELETE` | Authenticated | `acessoMedicao === true` | `PATCH`: Update estaca fields.<br>`DELETE`: Delete estaca by ID. |
| `/api/obras` | `src/app/api/obras/route.ts` | `GET`, `POST` | `ENGENHEIRO`, `ADMIN`, `ADMINISTRADOR` | `acessoMedicao === true` | `GET`: List obras (scoped to `engenheiroResponsavelId` if Engenheiro).<br>`POST`: Create new obra with client and dates. |
| `/api/contratos` | `src/app/api/contratos/route.ts` | `GET`, `POST` | `ENGENHEIRO`, `ADMIN`, `ADMINISTRADOR` | `acessoMedicao === true` | `GET`: List contracts and items (`ItemContrato`).<br>`POST`: Create contract with tax retention rates and line items. |
| `/api/medicoes` | `src/app/api/medicoes/route.ts` | `GET`, `POST` | `ENGENHEIRO`, `ADMIN`, `ADMINISTRADOR` | `acessoMedicao === true` | `GET`: List measurement bulletins by obra/contrato.<br>`POST`: Initialize next bulletin (`numeroMedicao`), compute accumulated quantities from previous bulletins, generate `ItemMedicao` entries. |
| `/api/medicoes/[id]` | `src/app/api/medicoes/[id]/route.ts` | `GET`, `PATCH`, `POST` | `ENGENHEIRO`, `ADMIN`, `ADMINISTRADOR` | `acessoMedicao === true` | `GET`: Return bulletin details.<br>`PATCH`: Recalculate retentions (INSS, ISS, IRRF, CSLL, PIS, COFINS) via `recalcularMedicao` and update item quantities.<br>`POST`: Submit to management (`status: 'SUBMETIDA_GESTAO'`) and notify admins via `notifyGestorMedicaoSubmetida`. |
| `/api/medicoes/[id]/excel` | `src/app/api/medicoes/[id]/excel/route.ts` | `GET` | `ENGENHEIRO`, `ADMIN`, `ADMINISTRADOR` | `acessoMedicao === true` | Generates 14-column spreadsheet with `ExcelJS.Workbook`, applies RBT styling (`#111827`, `#BA1A1A`), tax retentions block, writes buffer and returns binary XLSX download. |
| `/api/marca/pdf` | `src/app/api/marca/pdf/route.ts` | `GET` | Public / Authenticated | None | Generates RBT brand manual document in printable HTML. |
| `/api/health` | `src/app/api/health/route.ts` | `GET` | Public | None | Database ping via `prisma.$queryRaw\`SELECT 1\`` and returns service health status. |
| `/api/admin/usuarios` | `src/app/api/admin/usuarios/route.ts` | `GET`, `POST` | `ADMIN`, `ADMINISTRADOR` | `acessoMedicao === true` | Used by `gestao-usuarios-client.tsx`. `GET`: Lists users.<br>`POST`: Creates user with bcrypt hash and sets `acessoMedicao: true`. |
| `/api/admin/usuarios/[id]` | `src/app/api/admin/usuarios/[id]/route.ts` | `PATCH` | `ADMIN`, `ADMINISTRADOR` | `acessoMedicao === true` | Updates user details, role, status, or password. |

#### Route Security Template (Standard Pattern for all Medição APIs):
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/session';
import { isAdmin, isEngenheiro, isApontador, stripFinancialData } from '@/lib/auth';
import { applySecurityHeaders } from '@/lib/security-headers';

// Helper for session & module permission check
async function getAuthenticatedMedicaoUser() {
  const session = await getServerSession();
  if (!session?.user) {
    return { errorResponse: NextResponse.json({ error: 'Não autenticado' }, { status: 401 }) };
  }
  // User must have medicao access or be an admin
  if (!session.user.acessoMedicao && !isAdmin(session.user.role)) {
    return { errorResponse: NextResponse.json({ error: 'Acesso negado ao módulo de Medição' }, { status: 403 }) };
  }
  return { user: session.user };
}
```

---

### Part 2: Domain Calculations and Validation Schemas Blueprint

#### 1. `src/lib/calculations/rdp-math.ts`
Copied directly from `Medicaodiaria/src/lib/calculations/rdp-math.ts`. Contains:
- Interfaces: `LinhaProducaoItem`, `ShiftHours`, `RdpTotals`, `RelatorioDiarioData`.
- Core Functions:
  - `parseBrazilianNumber(val: unknown): number`: Handles `"1.250,50"`, `"12,50"`, `"12.50"`, empty strings, nulls, and negative signs.
  - `round2(val: number): number`: Financial rounding using `Math.round((val + Number.EPSILON) * 100) / 100`.
  - `calculateLineMetrics(line)`: Calculates `comprimentoUtil = Math.max(0, round2(comprimento - arrasamento))`, normalizes emendas, talas, and depth.
  - `calculateRdpTotals(rawLines, shiftHours)`: Computes `totalEstacas`, `metragemTotal`, `totalW150`, `totalW310`, `totalEmendas`, `totalTalas`, `totalArrasamento`, `metragemLiquida`, `horasTrabalhadas` (deducting lunch and idle hours).
  - `validateLineIntegrity(line)`: Validates 1 to 25 line bounds, non-negative values, arrasamento <= comprimento.
  - `validateRdpSubmission(rdp)`: Ensures required header info (obra, date, equipment, operator), calls `validateLineIntegrity`, and verifies idle time justification if 0 piles were driven.

#### 2. `src/lib/security-headers.ts`
Create with:
- `SECURITY_HEADERS`: `X-DNS-Prefetch-Control`, `Strict-Transport-Security`, `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, `Content-Security-Policy`.
- `applySecurityHeaders(res: NextResponse): NextResponse`: Applies all headers to the response object.

#### 3. Validation Schemas in `src/lib/validations/`
- `rdp.schema.ts`:
  - `LinhaProducaoSchema`: Validates line properties (1-25), length, depth, arrasamento, emendas, nega, stops.
  - `RelatorioDiarioSchema`: Validates full report with max 25 lines, turn, climate enum, status enum.
- `contrato.schema.ts`:
  - `ItemContratoSchema`: `codigoItem`, `descricao`, `unidadeMedida`, `quantidadeContratada`, `valorUnitario`, `ordem`.
  - `ContratoSchema`: `obraId`, `numeroContrato`, `dataContrato`, `valorTotalContratual`, tax retention defaults (INSS 3.5%, base MO 40%, ISS 5%, IRRF 1.5%, CSLL 1%, PIS 0.65%, COFINS 3%).
- `medicao.schema.ts`:
  - `ItemMedicaoInputSchema`: `itemContratoId`, `quantidadeAnterior`, `quantidadePeriodo`.
  - `MedicaoCreateSchema`: `obraId`, `contratoId`, `numeroMedicao`, `periodoInicio`, `periodoFim` (refined: `periodoFim >= periodoInicio`).
- `auth.schema.ts`:
  - `LoginSchema`: `email`, `password`.
  - `CreateUserSchema`: `name`, `email`, `password`, `role: z.enum(['APONTADOR', 'ENGENHEIRO', 'ADMINISTRADOR', 'ADMIN'])`, `telefone`.
- `index.ts` (Barrel export):
  ```typescript
  export * from './auth.schema';
  export * from './rdp.schema';
  export * from './contrato.schema';
  export * from './medicao.schema';
  export * from './orcamento.schema';
  export * from './usuario.schema';
  ```

#### 4. `src/types/enums.ts`
Create runtime constants and TypeScript types:
```typescript
export const Role = {
  APONTADOR: 'APONTADOR',
  ENGENHEIRO: 'ENGENHEIRO',
  ADMINISTRADOR: 'ADMINISTRADOR',
  ADMIN: 'ADMIN',
  ORCAMENTISTA: 'ORCAMENTISTA',
} as const;
export type Role = (typeof Role)[keyof typeof Role];

export const StatusRelatorio = {
  RASCUNHO: 'RASCUNHO',
  SUBMETIDO: 'SUBMETIDO',
  APROVADO: 'APROVADO',
  REJEITADO: 'REJEITADO',
} as const;
export type StatusRelatorio = (typeof StatusRelatorio)[keyof typeof StatusRelatorio];

export const StatusMedicao = {
  EM_ELABORACAO: 'EM_ELABORACAO',
  SUBMETIDA_GESTAO: 'SUBMETIDA_GESTAO',
  APROVADA: 'APROVADA',
  FATURADA: 'FATURADA',
} as const;
export type StatusMedicao = (typeof StatusMedicao)[keyof typeof StatusMedicao];

export const StatusContrato = {
  ATIVO: 'ATIVO',
  PAUSADO: 'PAUSADO',
  FINALIZADO: 'FINALIZADO',
} as const;
export type StatusContrato = (typeof StatusContrato)[keyof typeof StatusContrato];

export const CondicaoClimatica = {
  BOM_SOL: 'BOM_SOL',
  NUBLADO: 'NUBLADO',
  CHUVA_LEVE: 'CHUVA_LEVE',
  CHUVA_FORTE: 'CHUVA_FORTE',
  IMPRACTICAVEL: 'IMPRACTICAVEL',
} as const;
export type CondicaoClimatica = (typeof CondicaoClimatica)[keyof typeof CondicaoClimatica];

export const TipoEmenda = {
  NENHUMA: 'NENHUMA',
  W150: 'W150',
  W310: 'W310',
  OUTRA: 'OUTRA',
} as const;
export type TipoEmenda = (typeof TipoEmenda)[keyof typeof TipoEmenda];

export const TipoNotificacao = {
  RELATORIO_SUBMETIDO: 'RELATORIO_SUBMETIDO',
  RELATORIO_APROVADO: 'RELATORIO_APROVADO',
  RELATORIO_REJEITADO: 'RELATORIO_REJEITADO',
  MEDICAO_SUBMETIDA: 'MEDICAO_SUBMETIDA',
  MEDICAO_APROVADA: 'MEDICAO_APROVADA',
  ALERTA_SISTEMA: 'ALERTA_SISTEMA',
} as const;
export type TipoNotificacao = (typeof TipoNotificacao)[keyof typeof TipoNotificacao];
```

---

### Part 3: Email Consolidation Blueprint (`src/lib/email.ts`)

`src/lib/email.ts` must maintain all existing exports while adding Medição Diária notifications.

```typescript
// ====================================================
// PRESERVED FUNCTIONS (Zero alterations to existing signatures)
// ====================================================
// 1. sendMagicLinkEmail({ to, clienteNome, protocolo, magicLinkUrl })
// 2. sendPropostaEmail({ to, clienteNome, protocolo, valorTotal, pdfBuffer })
// 3. sendNovoUsuarioEmail({ to, nome, email, senhaTemporaria, perfil, loginUrl })
// 4. getMailTransporter()

// ====================================================
// NEW HELPER: sendNovoLeadEmail
// ====================================================
export interface NovoLeadEmailProps {
  to: string;
  leadNome: string;
  protocolo: string;
  telefone?: string;
  empresa?: string;
  tipoFundacao?: string;
}

export async function sendNovoLeadEmail(props: NovoLeadEmailProps): Promise<{ success: boolean }> { ... }

// ====================================================
// NEW GENERIC SENDER: sendEmail (Shared with Medição Diária)
// ====================================================
export interface GenericEmailPayload {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail({ to, subject, html }: GenericEmailPayload): Promise<void> {
  const transporter = getMailTransporter();
  const from = process.env.SMTP_FROM || 'RBT Fundações <noreply@rbtfundacoes.com.br>';

  if (!transporter) {
    console.log(`[EMAIL MOCK] Para: ${to} | Assunto: ${subject}`);
    return;
  }

  try {
    await transporter.sendMail({ from, to, subject, html });
  } catch (err) {
    console.error('[EMAIL ERROR]', err);
  }
}

// ====================================================
// NEW MEDIÇÃO DIÁRIA NOTIFICATIONS
// ====================================================
export async function notifyEngenheiroRdpSubmetido(
  engEmail: string,
  rdpInfo: { obra: string; data: string; apontador: string; totalEstacas: number; rdpId: string }
) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  await sendEmail({
    to: engEmail,
    subject: `[RBT] Novo RDP submetido — ${rdpInfo.obra}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
        <div style="background:#111827;border-bottom:3px solid #BA1A1A;color:white;padding:20px;border-radius:8px 8px 0 0">
          <h2 style="margin:0">RBT Fundações — Novo Relatório Diário</h2>
        </div>
        <div style="padding:20px;border:1px solid #ddd;border-top:none;border-radius:0 0 8px 8px">
          <p>Um novo Relatório Diário de Produção foi submetido e aguarda sua validação:</p>
          <table style="width:100%;border-collapse:collapse">
            <tr><td style="padding:8px;font-weight:bold;color:#555">Obra:</td><td style="padding:8px">${rdpInfo.obra}</td></tr>
            <tr style="background:#f5f5f5"><td style="padding:8px;font-weight:bold;color:#555">Data:</td><td style="padding:8px">${rdpInfo.data}</td></tr>
            <tr><td style="padding:8px;font-weight:bold;color:#555">Apontador:</td><td style="padding:8px">${rdpInfo.apontador}</td></tr>
            <tr style="background:#f5f5f5"><td style="padding:8px;font-weight:bold;color:#555">Total Estacas:</td><td style="padding:8px">${rdpInfo.totalEstacas}</td></tr>
          </table>
          <div style="margin-top:20px;text-align:center">
            <a href="${baseUrl}/medicao/engenheiro/validacao"
               style="background:#BA1A1A;color:white;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:bold;display:inline-block">
              Validar Relatório
            </a>
          </div>
        </div>
      </div>`,
  });
}

export async function notifyGestorMedicaoSubmetida(
  gestorEmail: string,
  medicaoInfo: { obra: string; numero: number; valorLiquido: number; engenheiro: string; medicaoId: string }
) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  await sendEmail({
    to: gestorEmail,
    subject: `[RBT] Boletim de Medição Nº ${medicaoInfo.numero} submetido — ${medicaoInfo.obra}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
        <div style="background:#111827;border-bottom:3px solid #BA1A1A;color:white;padding:20px;border-radius:8px 8px 0 0">
          <h2 style="margin:0">RBT Fundações — Boletim de Medição Submetido</h2>
        </div>
        <div style="padding:20px;border:1px solid #ddd;border-top:none;border-radius:0 0 8px 8px">
          <p>Um Boletim de Medição foi submetido para sua aprovação:</p>
          <table style="width:100%;border-collapse:collapse">
            <tr><td style="padding:8px;font-weight:bold;color:#555">Obra:</td><td style="padding:8px">${medicaoInfo.obra}</td></tr>
            <tr style="background:#f5f5f5"><td style="padding:8px;font-weight:bold;color:#555">Nº Medição:</td><td style="padding:8px">${medicaoInfo.numero}</td></tr>
            <tr><td style="padding:8px;font-weight:bold;color:#555">Engenheiro:</td><td style="padding:8px">${medicaoInfo.engenheiro}</td></tr>
            <tr style="background:#f5f5f5"><td style="padding:8px;font-weight:bold;color:#555">Valor Líquido:</td><td style="padding:8px">R$ ${medicaoInfo.valorLiquido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td></tr>
          </table>
          <div style="margin-top:20px;text-align:center">
            <a href="${baseUrl}/medicao/engenheiro/medicoes/${medicaoInfo.medicaoId}"
               style="background:#BA1A1A;color:white;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:bold;display:inline-block">
              Revisar Medição
            </a>
          </div>
        </div>
      </div>`,
  });
}
```

---

### Part 4: Session & Security Verification

1. **`getServerSession`**:
   - Signature: `export async function getServerSession(): Promise<{ user: AuthUser } | null>`
   - Guaranteed backwards-compatible with `Medicaodiaria` usage (`const session = await getServerSession(); if (!session?.user) ...`).
2. **`stripFinancialData`**:
   - Strips `valorUnitario`, `valorTotal`, `retencaoINSS`, `retencaoISS`, `baseMaoDeObra`, `valorLiquido`, etc., when `session.user.role === 'APONTADOR'`.
3. **Dual Session Cookies**:
   - `buildSessionCookies` sets `rbt_orcamentos_session`, `rbt_session`, and `rbt_user_meta`.
   - `clearSessionCookie` clears all three cookies.
4. **Module Access Authorization**:
   - Transplanted routes check `session.user.acessoMedicao === true` or `isAdmin(session.user.role)`.
   - Returns HTTP 403 JSON: `{ error: 'Acesso negado ao módulo de Medição' }`.

---

## 5. Verification Method

Once implemented in Milestone M4, the blueprint can be verified through the following checks:

### 5.1 Static Typecheck
```powershell
npx tsc --noEmit
```
**Success criteria**: Zero TypeScript errors. All imports (`@/lib/session`, `@/lib/db`, `@/lib/security-headers`, `@/lib/auth`, `@/lib/email`, `@/lib/calculations/rdp-math`, `@/lib/validations/*`, `@/types/enums`, `exceljs`) resolve cleanly.

### 5.2 Build Verification
```powershell
npm run build
```
**Success criteria**: Compiles Next.js routes with zero compilation failures, confirming all 15 transplanted API endpoints are recognized by App Router.

### 5.3 Automated Route Verification Script
Run the project route test script:
```powershell
npx tsx scripts/verify-security-routes.ts
```

### 5.4 Excel Export Functionality Test
Make a GET request to `/api/medicoes/[id]/excel` with an authenticated engineer session:
**Success criteria**: Returns HTTP 200 with header `Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` and valid binary content (> 5000 bytes).

### 5.5 Invalidation Conditions
- Any route handler unable to import from `@/lib/security-headers` or `@/lib/calculations/rdp-math`.
- Any loss of Orçamentos email functions (`sendMagicLinkEmail`, `sendPropostaEmail`, `sendNovoUsuarioEmail`).
- `exceljs` binary buffer failure in Next.js response.
- Apontador receiving unstripped financial fields.
