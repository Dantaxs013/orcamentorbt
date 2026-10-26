## 2026-10-21T11:56:40Z
You are worker_m5.
Your working directory is: c:/Users/aaaaa/OneDrive - Piatec/TI_CODIGOS/T.I/orçamento RBT/.agents/teamwork/worker_m5
Read DISPATCH.md in your working directory, PROJECT.md at c:/Users/aaaaa/OneDrive - Piatec/TI_CODIGOS/T.I/orçamento RBT/PROJECT.md, ORIGINAL_REQUEST.md at c:/Users/aaaaa/OneDrive - Piatec/TI_CODIGOS/T.I/orçamento RBT/.agents/teamwork/ORIGINAL_REQUEST.md, and the blueprints provided by the three M5 Explorers:
- c:/Users/aaaaa/OneDrive - Piatec/TI_CODIGOS/T.I/orçamento RBT/.agents/teamwork/explorer_m5_1/proposed_middleware.ts and handoff.md
- c:/Users/aaaaa/OneDrive - Piatec/TI_CODIGOS/T.I/orçamento RBT/.agents/teamwork/explorer_m5_2/handoff.md
- c:/Users/aaaaa/OneDrive - Piatec/TI_CODIGOS/T.I/orçamento RBT/.agents/teamwork/explorer_m5_3/handoff.md

Implement Milestone M5 (Route Protection Middleware & Permission Enforcement):
1. Replace src/middleware.ts using the architecture demonstrated in explorer_m5_1/proposed_middleware.ts:
   - Use createDualResponse proxy pattern so middleware(req) seamlessly satisfies both Next.js App Router (asynchronous V8 Edge Runtime) and unit tests (scripts/verify-security-routes.ts synchronous const res = middleware(req)).
   - Apply HTTP security headers via applySecurityHeaders from '@/lib/security-headers'.
   - Extract session token (rbt_orcamentos_session or rbt_session) and HMAC user metadata cookie (rbt_user_meta).
   - If not authenticated:
     - Unauthenticated API calls return HTTP 401 JSON { error: 'Não autenticado. Faça login para continuar.' }.
     - Unauthenticated page requests redirect to /login?redirect=<targetPath> with 307.
   - If authenticated user visits /login:
     - Redirect immediately to /portal with 307.
   - Root / path:
     - Redirect authenticated users unconditionally to /portal with 307 (User Priority UX rule).
   - /portal:
     - Allow pass-through for all authenticated sessions.
   - /dashboard/*:
     - If !hasOrcamento (!acessoOrcamento and not admin): redirect to /portal?unauthorized=orcamentos with 307.
   - /medicao/*:
     - If !hasMedicao (!acessoMedicao and not admin): redirect to /portal?unauthorized=medicao with 307.
     - Role sub-route perimeter: If user is APONTADOR, prevent access to /medicao/engenheiro/* and /medicao/admin/*, redirecting to /medicao/apontador/rdp with 307.
     - If user is ENGENHEIRO, prevent access to /medicao/admin/*, redirecting to /medicao/engenheiro/validacao with 307.
   - API Route Security:
     - /api/orcamentos/*: 403 Forbidden JSON if !hasOrcamento.
     - /api/medicoes/*: 403 Forbidden JSON if !hasMedicao or if APONTADOR.
     - /api/contratos/*: 403 Forbidden JSON if !hasMedicao or if APONTADOR.
     - /api/rdp/*, /api/obras/*, /api/estacas/*: 403 Forbidden JSON if !hasMedicao.
     - /api/admin/*: 403 Forbidden JSON if !isAdmin.
   - Backward compatibility:
     - If rbt_orcamentos_session is present and rbt_user_meta is absent/expired (legacy test mock), allow /dashboard/* pass-through to Server Components (getServerSession()).
   - Configure Next.js matcher:
     - Cover '/', '/portal', '/portal/:path*', '/dashboard', '/dashboard/:path*', '/medicao', '/medicao/:path*', '/login', and all protected /api/:path*.
2. Role Normalization Fixes:
   - In src/components/medicao/rdp/rdp-view-actions.tsx:70: ensure ['ENGENHEIRO', 'ADMINISTRADOR', 'ADMIN'].includes(userRole).
   - In src/components/medicao/obras/nova-obra-modal.tsx:243: ensure (userRole === 'ADMINISTRADOR' || userRole === 'ADMIN').
3. Run full verification commands:
   - npx tsc --noEmit (must exit code 0, 0 type errors)
   - npm test (all 29 tests must pass)
   - npx tsx scripts/verify-portal-unified.ts (all 54 tests across Tiers 1-4 must pass)
   - Clean production build: powershell -Command "if (Test-Path .next) { Remove-Item -Recurse -Force .next }; npm run build" (must exit code 0)
