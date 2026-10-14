# Project: Orçamento RBT — Segurança, Usabilidade e Refinamento Visual

## Architecture
- **Framework**: Next.js 14.2.15 (App Router, `src/app`)
- **Language**: TypeScript 5.6.3 (Strict mode)
- **Styling**: Tailwind CSS 3.4.14, Lucide React icons
- **Database/ORM**: PostgreSQL, Prisma Client
- **Authentication**: Session cookie `rbt_orcamentos_session` with SHA-256 tokens in database
- **Security Perimeter**: Edge middleware `src/middleware.ts` intercepting `/dashboard/:path*`, Next.js security headers in `next.config.mjs`, in-memory sliding window rate limiter in `src/lib/rate-limit.ts`
- **UX & Feedback Architecture**: React Context Toast Provider in `src/components/ui/toast-provider.tsx` mounted in `RootLayout`, custom masking utilities in `src/lib/masks.ts`, reusable Confirmation Modal `src/components/ui/confirm-modal.tsx`
- **Kanban Architecture**: Modularized Kanban board in `src/components/kanban/` with horizontal scroll container, responsive mobile column switcher, contextual SLA & category badges, stylized empty states

## Code Layout
```
src/
├── app/
│   ├── layout.tsx                     # Root layout with ToastProvider [IMPLEMENTED & VERIFIED]
│   ├── middleware.ts                  # Edge security middleware (/dashboard protection) [IMPLEMENTED & VERIFIED]
│   ├── (auth)/login/page.tsx          # Login page
│   ├── dashboard/
│   │   ├── layout.tsx                 # Dashboard shell & navigation
│   │   ├── page.tsx                   # Main dashboard with Kanban board [IMPLEMENTED & VERIFIED]
│   │   └── orcamentos/[id]/page.tsx   # Budget details & calculation
│   ├── formulario/[token]/page.tsx    # Public magic-link submission page [IMPLEMENTED & VERIFIED]
│   └── api/
│       ├── auth/login/route.ts        # Login endpoint (rate-limited) [IMPLEMENTED & VERIFIED]
│       ├── solicitacoes/route.ts      # Lead requests (rate-limited) [IMPLEMENTED & VERIFIED]
│       ├── formulario/[token]/route.ts# Magic link submission (rate-limited) [IMPLEMENTED & VERIFIED]
│       └── orcamentos/
│           └── [id]/proposta/route.ts # PDF generator (session-protected) [IMPLEMENTED & VERIFIED]
├── components/
│   ├── ui/
│   │   ├── toast-provider.tsx         # Toast notification system [IMPLEMENTED & VERIFIED]
│   │   ├── confirm-modal.tsx          # Generic confirmation modal [IMPLEMENTED & VERIFIED]
│   │   └── masked-input.tsx           # Masked input components
│   ├── kanban/
│   │   ├── kanban-board.tsx           # Kanban board container & columns [IMPLEMENTED & VERIFIED]
│   │   ├── kanban-column.tsx          # Status column & empty states [IMPLEMENTED & VERIFIED]
│   │   └── kanban-card.tsx            # Proposal card with SLA badges & micro-interactions [IMPLEMENTED & VERIFIED]
│   └── orcamentos/
│       ├── detalhes-orcamento-client.tsx # Budget cost forms & dispatch actions [IMPLEMENTED & VERIFIED]
│       └── nova-solicitacao-modal.tsx    # New request modal with phone/client masks [IMPLEMENTED & VERIFIED]
├── lib/
│   ├── auth.ts                        # Session verification utilities
│   ├── masks.ts                       # Currency, phone, and measure formatters [IMPLEMENTED & VERIFIED]
│   ├── rate-limit.ts                  # Sliding-window rate limiter [IMPLEMENTED & VERIFIED]
│   └── prisma.ts                      # Prisma client instance
next.config.mjs                        # Security headers (CSP, HSTS, X-Frame-Options, etc.) [IMPLEMENTED & VERIFIED]
scripts/
├── verify-security-routes.ts          # Automated verification script for criteria (29/29 PASS) [IMPLEMENTED]
└── challenger-security.ts             # Adversarial attack and stress test suite (PASS) [IMPLEMENTED]
```

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Middleware de Proteção de Rotas | Interceptar acessos diretos não autenticados a `/dashboard` e redirecionar para `/login?redirect=...` | M1 | ORIGINAL_REQUEST § R1 |
| 2 | Rate Limiting em Endpoints Críticos | Controle de taxa (HTTP 429 com Retry-After) para `/api/auth/login`, `/api/solicitacoes` e `/api/formulario/[token]` | M1 | ORIGINAL_REQUEST § R1 |
| 3 | Headers de Segurança HTTP | Configurar CSP, HSTS, X-Frame-Options (DENY), X-Content-Type-Options (nosniff), Referrer-Policy em `next.config.mjs` | M1 | ORIGINAL_REQUEST § R1 |
| 4 | Proteção de Rota de Proposta PDF | Adicionar validação de sessão em `GET /api/orcamentos/[id]/proposta` para impedir vazamento de dados sem login | M1 | Survey Explorer 1 |
| 5 | Máscaras de Entrada em Tempo Real | Formatação em tempo real para moeda (R$), telefone/WhatsApp e medidas de engenharia | M2 | ORIGINAL_REQUEST § R2 |
| 6 | Sistema Global de Notificações (Toasts) | Provedor e hook de toasts visuais (sucesso, erro, aviso) integrados na aplicação | M2 | ORIGINAL_REQUEST § R2 |
| 7 | Modais de Confirmação para Ações Críticas | Confirmação explícita antes de envio de proposta por e-mail, alteração de status e submissão pública | M2 | ORIGINAL_REQUEST § R2 |
| 8 | Cobertura Total de Status no Kanban | Exibir todos os 7 status do Prisma (`NOVO`, `EM_ANALISE`, `VISITA_TECNICA`, `PROPOSTA_ENVIADA`, `APROVADO`, `REJEITADO`, `CANCELADO`) no Kanban | M3 | Survey Explorer 3 |
| 9 | Badges Contextuais nos Cards | Badges de SLA/tempo decorrido, categoria de serviço, orçamentista e borda lateral colorida por status | M3 | ORIGINAL_REQUEST § R3 |
| 10 | Estados Vazios Estilizados | Ilustrações e mensagens estilizadas por coluna vazia e estado de busca sem resultados | M3 | ORIGINAL_REQUEST § R3 |
| 11 | Micro-interações e Acessibilidade | Efeitos suaves de hover nos cards, anéis de foco visíveis (`focus-visible`), transições fluidas | M3 | ORIGINAL_REQUEST § R3 |
| 12 | Layout Responsivo (Mobile e Widescreen) | Barra de rolagem horizontal otimizada para desktops e seletor/abas de colunas fluido em dispositivos móveis | M3 | ORIGINAL_REQUEST § R3 |
| 13 | Verificação Automatizada e Build | Execução com 0 erros de `tsc --noEmit`, build de produção `npm run build` e script automatizado de teste de segurança/rotas | M4 | ORIGINAL_REQUEST § Acceptance Criteria |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | M1: Segurança e Acesso em Camadas | Middleware, Headers HTTP, Rate Limiting, Proteção de rotas e APIs | none | DONE |
| 2 | M2: Usabilidade, Máscaras e Feedback | Máscaras R$, Telefone, Medidas, Sistema Toast global, Modais de confirmação | none | DONE |
| 3 | M3: Refinamento Visual e Kanban | Cobertura 7 status, badges SLA/categoria, empty states, micro-interactions, responsividade mobile/wide | none | DONE |
| 4 | M4: Verificação Final e Testes Automatizados | Script automatizado de validação de rotas/segurança, checagem estrita de tipos e build Next.js | M1, M2, M3 | DONE |

## Interface Contracts
### M1: Rate Limiter (`src/lib/rate-limit.ts`) [IMPLEMENTED & VERIFIED]
- `checkRateLimit(key: string, limit: number, windowMs: number): { allowed: boolean; retryAfterSeconds: number; remaining: number }`
- Response on limit exceeded: HTTP 429 com header `Retry-After: <retryAfterSeconds>` e JSON `{ error: string, retryAfter: number }`

### M2: Toast System (`src/components/ui/toast-provider.tsx`) [IMPLEMENTED & VERIFIED]
- `useToast(): { toast: { success(title: string, msg?: string): void; error(title: string, msg?: string): void; warning(title: string, msg?: string): void; info(title: string, msg?: string): void } }`

### M2: Mask Utilities (`src/lib/masks.ts`) [IMPLEMENTED & VERIFIED]
- `formatCurrencyBRL(value: number | string): string`
- `parseCurrencyBRL(masked: string): number`
- `formatPhoneBR(value: string): string`
- `formatDimension(value: string): string`

### M2: Confirmation Modal (`src/components/ui/confirm-modal.tsx`) [IMPLEMENTED & VERIFIED]
- Props: `{ isOpen: boolean; title: string; description: string; confirmLabel?: string; cancelLabel?: string; variant?: 'danger' | 'primary' | 'warning'; onConfirm: () => void; onCancel: () => void }`
