# Dispatch: Test Writer (Milestone 4 — Automated Verification Suite)

## Objective
Implement an automated verification test script `scripts/verify-security-routes.ts` and verify all acceptance criteria from ORIGINAL_REQUEST.md.

## Acceptance Criteria to Verify
1. Route Protection Middleware:
   - Request to `/dashboard` without `rbt_orcamentos_session` cookie returns redirect to `/login?redirect=%2Fdashboard` (status 307).
   - Request with session cookie passes through.
2. Security Headers:
   - `next.config.mjs` configures CSP, HSTS, X-Frame-Options (DENY), X-Content-Type-Options (nosniff), Referrer-Policy, Permissions-Policy.
3. Rate Limiting:
   - `checkRateLimit` allows requests up to threshold, blocks on excess with status 429 and `retryAfterSeconds`.
4. Input Masks & Parsers:
   - Currency format & parse (`R$ 1.250,50` <-> `1250.50`), phone masking (`(11) 98765-4321`), dimensions.
5. Typecheck & Build:
   - Run `npx tsc --noEmit` -> 0 errors.
   - Run `npx tsx scripts/verify-security-routes.ts` or `node` equivalent -> all checks PASS.

## Mandatory Integrity Warning
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## Mandatory Constraint
NEVER execute `git commit`.

## Output
Write report to:
`c:/Users/aaaaa/OneDrive - Piatec/TI_CODIGOS/T.I/orçamento RBT/.agents/teamwork/teamwork_preview_test_writer_1/handoff.md`


## 2026-10-07T15:08:34Z
You are the Test Writer (Milestone 4 — Automated Verification Suite).

Your working directory is:
c:/Users/aaaaa/OneDrive - Piatec/TI_CODIGOS/T.I/orçamento RBT/.agents/teamwork/teamwork_preview_test_writer_1

Read instructions at:
1. c:/Users/aaaaa/OneDrive - Piatec/TI_CODIGOS/T.I/orçamento RBT/.agents/teamwork/ORIGINAL_REQUEST.md
2. c:/Users/aaaaa/OneDrive - Piatec/TI_CODIGOS/T.I/orçamento RBT/PROJECT.md
3. c:/Users/aaaaa/OneDrive - Piatec/TI_CODIGOS/T.I/orçamento RBT/.agents/teamwork/teamwork_preview_test_writer_1/DISPATCH.md

Tasks:
1. Create `scripts/verify-security-routes.ts` (or `.js` executable via `node`/`tsx`) that programmatically and independently tests:
   - Route protection middleware logic (`src/middleware.ts`): unauthenticated access to `/dashboard` redirects to `/login` with 307; authenticated with `rbt_orcamentos_session` cookie allowed.
   - HTTP Security headers in `next.config.mjs`: CSP, HSTS, X-Frame-Options, X-Content-Type-Options, etc.
   - Rate limiting functionality (`src/lib/rate-limit.ts`): enforces request limits and returns retryAfterSeconds on breach.
   - Input masks (`src/lib/masks.ts`): currency formatting and parsing, phone formatting, dimension formatting.
2. Execute the verification script and record the full test output.
3. Run `npx tsc --noEmit` and confirm 0 type errors.
4. Run `npm run build` and confirm production build succeeds.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

MANDATORY CONSTRAINT:
NEVER execute `git commit`. All changes remain uncommitted for the user.

Write your handoff report to:
c:/Users/aaaaa/OneDrive - Piatec/TI_CODIGOS/T.I/orçamento RBT/.agents/teamwork/teamwork_preview_test_writer_1/handoff.md
When finished, send a message to the orchestrator.
