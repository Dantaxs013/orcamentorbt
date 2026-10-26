# DISPATCH — Worker M5-R2 (Middleware Hardening & Adversarial Remediation)

## Mission
Implement the cryptographic and perimeter mitigations required to resolve the 3 vulnerabilities identified by `challenger_m5_1` and achieve 100% pass across all test suites, including `scripts/challenger-m5-adversarial.ts`.

## Working Directory
`c:/Users/aaaaa/OneDrive - Piatec/TI_CODIGOS/T.I/orçamento RBT/.agents/teamwork/worker_m5_r2`

## Mandatory Reference Documents
1. `c:/Users/aaaaa/OneDrive - Piatec/TI_CODIGOS/T.I/orçamento RBT/.agents/teamwork/ORIGINAL_REQUEST.md`
2. `c:/Users/aaaaa/OneDrive - Piatec/TI_CODIGOS/T.I/orçamento RBT/PROJECT.md`
3. `c:/Users/aaaaa/OneDrive - Piatec/TI_CODIGOS/T.I/orçamento RBT/.agents/teamwork/challenger_m5_1/handoff.md` (Forensic vulnerability evidence & attack vectors)
4. `c:/Users/aaaaa/OneDrive - Piatec/TI_CODIGOS/T.I/orçamento RBT/.agents/teamwork/explorer_m5_r2_1/handoff.md`
5. `c:/Users/aaaaa/OneDrive - Piatec/TI_CODIGOS/T.I/orçamento RBT/.agents/teamwork/explorer_m5_r2_2/handoff.md`
6. `c:/Users/aaaaa/OneDrive - Piatec/TI_CODIGOS/T.I/orçamento RBT/.agents/teamwork/explorer_m5_r2_3/handoff.md`

## Exclusive Write Ownership
You have exclusive write ownership of:
- `src/lib/token-utils.ts`
- `src/middleware.ts`

## Specific Remediation Instructions

### 1. In `src/lib/token-utils.ts` (Clock Drift Upper Bound)
In `verifyUserMeta`, add validation that `parsed.ts` does not drift into the future:
```typescript
const now = Date.now();
const maxClockSkewMs = 60 * 1000; // 60s tolerance for clock drift
const maxAgeMs = 12 * 60 * 60 * 1000; // 12 hours lifetime

if (
  !parsed.ts ||
  typeof parsed.ts !== 'number' ||
  parsed.ts > now + maxClockSkewMs ||
  (now - parsed.ts) > maxAgeMs
) {
  return null;
}
```

### 2. In `src/middleware.ts` (Edge Middleware Hardening)
1. **Restrict `/dashboard` Legacy Fallback**:
   - The legacy fallback (which synthesizes `{ role: 'ORCAMENTISTA', acessoOrcamento: true }`) must ONLY be applied if `userMetaToken` was **completely absent** from the cookies (`!userMetaToken`).
   - If `userMetaToken` was present but HMAC verification failed (`claims === null`), this indicates token tampering. Do NOT apply fallback! Allow the request to be treated as unauthenticated and redirect to `/login` with status 307.
   ```typescript
   // Only apply legacy fallback when userMetaToken is completely absent
   if (hasSession && !userMetaToken && request.nextUrl.pathname.startsWith('/dashboard')) {
     claims = {
       userId: 'legacy_user',
       role: 'ORCAMENTISTA',
       email: 'legacy@rbt.com.br',
       acessoOrcamento: true,
       acessoMedicao: false,
       ts: Date.now(),
     };
   }
   ```
2. **Harden Synchronous Evaluation in `middleware(req)`**:
   - Update `parsePayloadUnsafe` to reject future timestamp drift (`parsed.ts > Date.now() + 60000`).
   - In synchronous evaluation (`syncRes`), do NOT grant elevated or admin permissions based on unverified `parsePayloadUnsafe` claims.
   - For `/medicao/*` and protected routes, unverified sync evaluation must not return status 200 pass-through for forged tokens.
   - Ensure backward compatibility with `npm test` (`scripts/verify-security-routes.ts`):
     - Unauthenticated `/dashboard` redirects to `/login` (307).
     - Legacy session `cookie: rbt_orcamentos_session=...` without `rbt_user_meta` on `/dashboard` returns status 200.

## Mandatory Integrity Warning
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## Verification Requirements
Before delivering your handoff report, execute and confirm 100% pass on:
1. `npx tsc --noEmit` (0 errors, exit 0)
2. `npm test` (29/29 tests pass, exit 0)
3. `npx tsx scripts/verify-portal-unified.ts` (54/54 tests pass across Tiers 1-4, exit 0)
4. `npx tsx scripts/challenger-m5-boundary-stress.ts` (91/91 tests pass, exit 0)
5. `npx tsx scripts/challenger-m5-adversarial.ts` (must pass all 35 attack vectors, 0 vulnerabilities, exit 0)
6. Clean production build:
   `powershell -Command "if (Test-Path .next) { Remove-Item -Recurse -Force .next }; npm run build"` (exit 0)

## Handoff Deliverable
Deliver your completion report to `c:/Users/aaaaa/OneDrive - Piatec/TI_CODIGOS/T.I/orçamento RBT/.agents/teamwork/worker_m5_r2/handoff.md` and notify the orchestrator with `send_message`.


## 2026-10-21T12:47:50Z
You are worker_m5_r2.
Your working directory is: c:/Users/aaaaa/OneDrive - Piatec/TI_CODIGOS/T.I/orçamento RBT/.agents/teamwork/worker_m5_r2
Read DISPATCH.md in your working directory, PROJECT.md at c:/Users/aaaaa/OneDrive - Piatec/TI_CODIGOS/T.I/orçamento RBT/PROJECT.md, ORIGINAL_REQUEST.md at c:/Users/aaaaa/OneDrive - Piatec/TI_CODIGOS/T.I/orçamento RBT/.agents/teamwork/ORIGINAL_REQUEST.md, challenger_m5_1's vulnerability report at c:/Users/aaaaa/OneDrive - Piatec/TI_CODIGOS/T.I/orçamento RBT/.agents/teamwork/challenger_m5_1/handoff.md, and the three M5-R2 Explorer blueprints:
- c:/Users/aaaaa/OneDrive - Piatec/TI_CODIGOS/T.I/orçamento RBT/.agents/teamwork/explorer_m5_r2_1/handoff.md
- c:/Users/aaaaa/OneDrive - Piatec/TI_CODIGOS/T.I/orçamento RBT/.agents/teamwork/explorer_m5_r2_2/handoff.md (and remediation_middleware.patch / proposed_middleware.ts)
- c:/Users/aaaaa/OneDrive - Piatec/TI_CODIGOS/T.I/orçamento RBT/.agents/teamwork/explorer_m5_r2_3/handoff.md

You have exclusive write ownership of:
- src/lib/token-utils.ts
- src/middleware.ts

Implement the fixes:
1. In src/lib/token-utils.ts:
   - Validate parsed.ts does not drift into the future: `parsed.ts > now + maxClockSkewMs` (maxClockSkewMs = 60 * 1000).
   - Ensure strict expiration check: `(now - parsed.ts) > maxAgeMs` (12 hours).
2. In src/middleware.ts:
   - Apply the hardened middleware pattern from explorer_m5_r2_2.
   - Restrict legacy `/dashboard` fallback: ONLY trigger if `hasSession && !userMetaToken && pathname.startsWith('/dashboard')`. If `userMetaToken` was provided but verifyUserMeta returned null (tampered token), do NOT apply fallback; reject and redirect to `/login` with 307.
   - Harden synchronous inspection so unverified tokens never gain unauthorized status 200 pass-through on protected or administrative routes.
   - Preserve 100% backward compatibility with `npm test` (`scripts/verify-security-routes.ts`).

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Run all required verifications:
1. npx tsc --noEmit (must exit code 0)
2. npm test (must pass all 29 tests)
3. npx tsx scripts/verify-portal-unified.ts (must pass all 54 tests)
4. npx tsx scripts/challenger-m5-boundary-stress.ts (must pass all 91 tests)
5. npx tsx scripts/challenger-m5-adversarial.ts (must pass all 35 attack vectors with 0 vulnerabilities, exit 0)
6. Clean production build:
   powershell -Command "if (Test-Path .next) { Remove-Item -Recurse -Force .next }; npm run build" (must exit code 0)

Deliver your completion handoff report to c:/Users/aaaaa/OneDrive - Piatec/TI_CODIGOS/T.I/orçamento RBT/.agents/teamwork/worker_m5_r2/handoff.md and notify with send_message when complete.
