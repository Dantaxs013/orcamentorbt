# Milestone M5 Adversarial Challenge Report: Cryptographic Tokens & Edge Authentication

- **Agent**: `challenger_m5_1` (Empirical Challenger / Critic / Specialist)
- **Target**: Milestone M5 (Route Protection Middleware & Permission Enforcement)
- **Subject**: Cryptographic Tokens, Tampering Prevention, and Edge Authentication
- **Recipient**: Parent Orchestrator (`e65a3c02-8d0d-46b7-ac87-62b0077928ce`)
- **Handoff Type**: Hard Handoff
- **Date**: 2026-10-21
- **Verdict**: **REJECT** (3 confirmed empirical vulnerabilities identified; remediation required)

---

## Challenge Summary

**Overall risk assessment**: **HIGH**

Empirical testing was conducted via an independent adversarial harness (`scripts/challenger-m5-adversarial.ts`) executing 35 rigorous attack vectors against `src/lib/token-utils.ts` and `src/middleware.ts`. While the HMAC-SHA256 signature algorithm successfully repels bit-flip privilege escalation, signature truncation, secret substitution, and expired tokens, **3 critical vulnerabilities / architectural perimeter gaps** were empirically confirmed:
1. **Future Timestamp Drift Vulnerability**: Tokens minted with future timestamps are accepted indefinitely because negative time deltas bypass the expiration check.
2. **Edge Middleware Legacy Bypass**: Tampered/forged metadata tokens accompanied by an arbitrary session cookie access `/dashboard` with synthetic permissions instead of redirecting to `/login`.
3. **Synchronous Unverified Payload Bypass**: Synchronous execution of `middleware(req)` relies on `parsePayloadUnsafe`, granting access to forged payloads without HMAC verification.

---

## 1. Observation

Direct observations and evidence from the codebase, implementation files, and adversarial test harness:

### 1.1 Test Suite Execution
- **Harness Path**: `scripts/challenger-m5-adversarial.ts`
- **Execution Command**: `npx tsx scripts/challenger-m5-adversarial.ts`
- **Exit Code**: `1` (Non-zero, failed security gates)
- **Verbatim Summary**:
  ```
  ========================================================================
                   ADVERSARIAL CHALLENGE SUMMARY                          
  ========================================================================
    Total Vectors Executed: 35
    Passed (Hardened):      28
    Failed / Vulnerable:    7
    Total Execution Time:   28.66ms
  ========================================================================

  CRITICAL: Identified 7 potential vulnerabilities or gaps:
  - [ADV-FUTURE-01] Future timestamp drift: Drift 5 minutes in future (+300s): VULNERABILITY: Token with future timestamp accepted! (ts: +300s, claims returned: {"userId":"usr_timetraveler","role":"ADMIN","email":"future@rbt.com.br","acessoOrcamento":true,"acessoMedicao":true,"ts":1792585101631})
  - [ADV-FUTURE-02] Future timestamp drift: Drift 1 hour in future (+3600s): VULNERABILITY: Token with future timestamp accepted! (ts: +3600s, claims returned: {"userId":"usr_timetraveler","role":"ADMIN","email":"future@rbt.com.br","acessoOrcamento":true,"acessoMedicao":true,"ts":1792588401631})
  - [ADV-FUTURE-03] Future timestamp drift: Drift 24 hours in future (+1 day): VULNERABILITY: Token with future timestamp accepted! (ts: +86400s, claims returned: {"userId":"usr_timetraveler","role":"ADMIN","email":"future@rbt.com.br","acessoOrcamento":true,"acessoMedicao":true,"ts":1792671201632})
  - [ADV-FUTURE-04] Future timestamp drift: Drift 30 days in future (+30 days): VULNERABILITY: Token with future timestamp accepted! (ts: +2592000s, claims returned: {"userId":"usr_timetraveler","role":"ADMIN","email":"future@rbt.com.br","acessoOrcamento":true,"acessoMedicao":true,"ts":1795176801632})
  - [ADV-FUTURE-05] Future timestamp drift: Drift 1 year in future (+365 days): VULNERABILITY: Token with future timestamp accepted! (ts: +31536000s, claims returned: {"userId":"usr_timetraveler","role":"ADMIN","email":"future@rbt.com.br","acessoOrcamento":true,"acessoMedicao":true,"ts":1824120801632})
  - [ADV-EDGE-05] Tampered token on /dashboard WITH unverified session cookie redirects to /login: VULNERABILITY: Legacy bypass triggered! Returned status 200 allowing pass-through without redirecting to /login!
  - [ADV-EDGE-06] Synchronous response evaluation on forged token blocks access (does not trust parsePayloadUnsafe): VULNERABILITY: Synchronous evaluation trusted parsePayloadUnsafe! (Status was 200 instead of 307 redirect to /login)
  ```

### 1.2 Vulnerability Observations in Code
1. **Missing Clock Drift Upper Bound in `src/lib/token-utils.ts` (Lines 125-129)**:
   ```typescript
   125:     const maxAgeMs = 12 * 60 * 60 * 1000; // 12 horas
   126:     if (!parsed.ts || typeof parsed.ts !== 'number' || (Date.now() - parsed.ts) > maxAgeMs) {
   127:       return null;
   128:     }
   ```
   *Observation*: When `parsed.ts` is in the future, `Date.now() - parsed.ts` yields a negative number. Because a negative number is never greater than `maxAgeMs` (`43,200,000`), the condition evaluates to `false`. There is no check for `parsed.ts > Date.now() + tolerance`. Consequently, tokens with timestamps in the future (+5 min, +1 hour, +24 hours, +30 days, +1 year) are parsed as valid and returned.
   *Specification Contrast*: In `scripts/verify-portal-unified.ts` line 222, the verification oracle explicitly defined:
   `if (parsed.ts > now + 60 * 1000) return null; // Clock drift > 1 minute in future`
   The production code in `src/lib/token-utils.ts` omitted this required contract check.

2. **Unconditional Legacy Fallback on `/dashboard` in `src/middleware.ts` (Lines 275-286)**:
   ```typescript
   275:     // Compatibilidade retroativa com sessões legadas / mocks onde userMetaToken está ausente ou expirado
   276:     // Se a sessão SQLite existir no cookie e a rota for /dashboard/*, permite pass-through aos Server Components
   277:     if (hasSession && !claims && request.nextUrl.pathname.startsWith('/dashboard')) {
   278:       claims = {
   279:         userId: 'legacy_user',
   280:         role: 'ORCAMENTISTA',
   281:         email: 'legacy@rbt.com.br',
   282:         acessoOrcamento: true,
   283:         acessoMedicao: false,
   284:         ts: Date.now(),
   285:       };
   286:     }
   ```
   *Observation*: When an adversary supplies an arbitrary session cookie (`rbt_orcamentos_session="forged_attacker_cookie"`) together with a tampered `rbt_user_meta` token where HMAC verification fails (`claims === null`), line 277 matches because `hasSession` is true. Instead of rejecting the request with HTTP 307 redirect to `/login`, the middleware synthesizes `claims` with `acessoOrcamento: true` and returns HTTP 200 pass-through.
   *Dispatch Rule Violation*: Requirement 2 specifically mandates: *"Confirm all adversarial attempts fail verification and redirect to /login."*

3. **Insecure Synchronous Proxy Fallback in `src/middleware.ts` (Lines 292-302 and Lines 31-50)**:
   ```typescript
   31: function parsePayloadUnsafe(token: string): Partial<UserMetaClaims> | null {
   ...
   41:     const parsed = JSON.parse(dec.decode(bytes));
   ...
   47:     return parsed;
   ...
   292:   // Resposta síncrona preliminar para inspeção imediata em harnesses de teste síncronos
   293:   let previewClaims: Partial<UserMetaClaims> | null = null;
   294:   if (hasSession && userMetaToken) {
   295:     previewClaims = parsePayloadUnsafe(userMetaToken);
   296:   }
   ...
   301:   const syncRes = evaluateRoutePolicy(request, previewClaims, Boolean(hasSession && previewClaims));
   302:   return createDualResponse(syncRes, asyncPromise);
   ```
   *Observation*: `parsePayloadUnsafe` decodes base64 and JSON without any HMAC verification. When `middleware(req)` is invoked synchronously or its properties (`res.status`, `res.headers`) are inspected without awaiting the promise, `syncRes` accepts forged claims (e.g. `role: 'ADMIN'`, `acessoMedicao: true`) with an invalid signature as valid, returning status 200 instead of 307 redirect to `/login`.

### 1.3 Hardened & Robust Areas Observed
The following attack vectors were successfully mitigated and passed all verification checks:
- **Bit-flip Privilege Escalation** (`ADV-ESC-01` to `ADV-ESC-04`): Flipping `acessoOrcamento: false -> true`, `acessoMedicao: false -> true`, `role: APONTADOR -> ADMIN`, or spoofing `userId` causes HMAC SHA-256 validation to fail; `verifyUserMeta` returns `null`.
- **Signature Tampering & Truncation** (`ADV-SIG-01` to `ADV-SIG-05`): Single-character bit flips at start, middle, and end, truncations to 0, 4, 16, 32 characters, and all-zero byte signatures are all strictly rejected.
- **Secret Substitution** (`ADV-KEY-01` to `ADV-KEY-05`): Tokens signed with foreign 256-bit keys, standard weak keys ("secret", "password"), empty secrets, or 1-character altered secrets are all strictly rejected.
- **Expired Token Replay** (`ADV-TIME-01` to `ADV-TIME-03`): Tokens older than 12 hours (12h + 1s, 24h, 7 days) are strictly rejected.
- **Malformed & Oversized Payloads** (`ADV-SIZE-01` to `ADV-FUZZ-02`): 50KB payload and 100-level nested JSON are handled safely without unhandled exceptions or stack overflows; 50KB with corrupted signature is rejected.
- **Edge Route Redirection** (`ADV-EDGE-01` to `ADV-EDGE-04`): Tampered tokens on `/portal` and `/medicao/rdp` redirect to `/login` with 307; tampered tokens on `/api/orcamentos` return 401.

---

## 2. Logic Chain

1. **Premise 1 (Cryptographic Expiration Integrity)**:
   - A cryptographic session token must enforce both past expiration (`ts < now - maxAge`) and future validity (`ts <= now + clockSkew`).
   - If future timestamps are unchecked, an attacker or compromised secret could mint tokens with `ts = 2099-01-01` that never expire within the 12-hour session policy, creating permanent backdoor tokens.
   - *Direct Observation 1.2.1*: `verifyUserMeta` accepts future drift up to 1 year without rejection.
   - *Conclusion 1*: The timestamp verification algorithm is flawed and fails requirement 1 ("Future timestamp drift").

2. **Premise 2 (Edge Perimeter Gatekeeping)**:
   - The primary objective of Edge Middleware in Next.js is to intercept and reject unauthenticated or tampered traffic at the network edge before requests touch backend database connections or Server Components.
   - Dispatch requirement 2 explicitly requires: *"Confirm all adversarial attempts fail verification and redirect to /login."*
   - *Direct Observation 1.2.2*: Supplying a tampered `rbt_user_meta` token alongside a forged session cookie to `/dashboard` causes the middleware to invoke line 277, granting synthetic pass-through status 200 instead of redirecting to `/login`.
   - *Conclusion 2*: An adversary with a tampered token can bypass the Edge barrier on `/dashboard`.

3. **Premise 3 (Synchronous vs Asynchronous Verification Divergence)**:
   - A security perimeter must not present different authorization decisions depending on whether the caller inspects the response synchronously or awaits it.
   - *Direct Observation 1.2.3*: `syncRes` evaluates unverified claims from `parsePayloadUnsafe`. An attacker supplying a tampered token with elevated claims receives status 200 from synchronous inspection.
   - *Conclusion 3*: The dual-response pattern creates an unauthenticated bypass vector under synchronous evaluation.

4. **Verdict Synthesis**:
   - Because 7 out of 35 adversarial tests failed, and 3 distinct vulnerabilities exist across `src/lib/token-utils.ts` and `src/middleware.ts`, Milestone M5 cannot be approved in its current state.
   - Verdict: **REJECT**.

---

## 3. Challenges

### [Critical] Challenge 1: Future Timestamp Drift Bypasses Token Expiration

- **Assumption challenged**: The worker assumed `(Date.now() - parsed.ts) > maxAgeMs` is sufficient to enforce token lifetime.
- **Attack scenario**: An attacker generates or replays a token signed with `ts` set to 1 hour, 1 day, or 1 year in the future. Because `Date.now() - parsed.ts` is negative, the token passes verification indefinitely.
- **Blast radius**: Complete breakdown of session expiration controls; immortal authentication tokens.
- **Mitigation**: Update `src/lib/token-utils.ts` (and `parsePayloadUnsafe` in `src/middleware.ts`) to enforce:
  ```typescript
  const now = Date.now();
  const maxClockSkewMs = 60 * 1000; // 60 seconds tolerance
  const maxAgeMs = 12 * 60 * 60 * 1000; // 12 hours
  if (!parsed.ts || typeof parsed.ts !== 'number' || parsed.ts > now + maxClockSkewMs || (now - parsed.ts) > maxAgeMs) {
    return null;
  }
  ```

### [High] Challenge 2: Edge Middleware Legacy Fallback Allows Dashboard Pass-Through for Tampered Tokens

- **Assumption challenged**: The worker assumed that if `hasSession` is present and `claims` is null, falling back to a synthetic `legacy_user` on `/dashboard` is safe because Server Components will check the database.
- **Attack scenario**: An attacker sends `rbt_orcamentos_session="forged_value"` along with a deliberately tampered `rbt_user_meta` cookie to `/dashboard`. Edge Middleware allows the request through with HTTP 200 instead of redirecting to `/login` with 307.
- **Blast radius**: Edge perimeter bypass; unauthorized requests reach Server Components; violation of Dispatch Requirement 2.
- **Mitigation**: Restrict legacy fallback to cases where `userMetaToken` was **never sent** (i.e. legacy clients), and strictly **reject** when `userMetaToken` was provided but failed verification:
  ```typescript
  // In src/middleware.ts:
  // Only allow legacy pass-through if userMetaToken was COMPLETELY ABSENT from the request
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
  // If userMetaToken was PRESENT but verifyUserMeta returned null -> TAMPERING DETECTED -> REJECT
  ```

### [Medium] Challenge 3: Synchronous `parsePayloadUnsafe` Decodes Unverified Claims Without Signature Check

- **Assumption challenged**: The worker assumed `parsePayloadUnsafe` is only a preview for unit tests and harmless.
- **Attack scenario**: Any middleware consumer, logger, or test harness accessing `middleware(req).status` synchronously evaluates `syncRes` derived from `parsePayloadUnsafe(userMetaToken)`. Forged claims (`role: 'ADMIN'`, `acessoMedicao: true`) evaluate to status 200 without ever verifying the HMAC signature.
- **Blast radius**: Privilege escalation if any component inspects the synchronous properties of the dual response.
- **Mitigation**: `parsePayloadUnsafe` should either not grant elevated permissions synchronously, or `syncRes` should default to unauthenticated unless the request is public. Alternatively, remove `parsePayloadUnsafe` and make `syncRes` default to redirecting unverified tokens to `/login`.

---

## 4. Stress Test Results Matrix

| Vector ID | Category | Attack Scenario | Expected | Actual | Verdict |
|---|---|---|---|---|---|
| `ADV-ESC-01` | Privilege Escalation | Tampered `acessoOrcamento: false -> true` | Return `null` | Returned `null` | **PASS** |
| `ADV-ESC-02` | Privilege Escalation | Tampered `role: APONTADOR -> ADMIN` | Return `null` | Returned `null` | **PASS** |
| `ADV-ESC-03` | Privilege Escalation | Tampered `acessoMedicao: false -> true` | Return `null` | Returned `null` | **PASS** |
| `ADV-ESC-04` | Privilege Escalation | Spoofed `userId` in claims | Return `null` | Returned `null` | **PASS** |
| `ADV-SIG-01` | Signature Tampering | Bit-flip at signature index 0 | Return `null` | Returned `null` | **PASS** |
| `ADV-SIG-02` | Signature Tampering | Bit-flip at signature midpoint | Return `null` | Returned `null` | **PASS** |
| `ADV-SIG-03` | Signature Tampering | Bit-flip at signature end | Return `null` | Returned `null` | **PASS** |
| `ADV-SIG-04-0` | Signature Tampering | Truncated signature (0 chars) | Return `null` | Returned `null` | **PASS** |
| `ADV-SIG-04-4` | Signature Tampering | Truncated signature (4 chars) | Return `null` | Returned `null` | **PASS** |
| `ADV-SIG-04-16` | Signature Tampering | Truncated signature (16 chars) | Return `null` | Returned `null` | **PASS** |
| `ADV-SIG-04-32` | Signature Tampering | Truncated signature (32 chars) | Return `null` | Returned `null` | **PASS** |
| `ADV-SIG-05` | Signature Tampering | All-zero null bytes signature | Return `null` | Returned `null` | **PASS** |
| `ADV-KEY-01` | Secret Substitution | Foreign 256-bit unauthorized key | Return `null` | Returned `null` | **PASS** |
| `ADV-KEY-02` | Secret Substitution | Standard weak key "secret" | Return `null` | Returned `null` | **PASS** |
| `ADV-KEY-03` | Secret Substitution | Null string secret `""` | Return `null` | Returned `null` | **PASS** |
| `ADV-KEY-04` | Secret Substitution | Public key "password" | Return `null` | Returned `null` | **PASS** |
| `ADV-KEY-05` | Secret Substitution | 1-character altered key | Return `null` | Returned `null` | **PASS** |
| `ADV-TIME-01` | Token Expiration | Expired by 1s (12h + 1s) | Return `null` | Returned `null` | **PASS** |
| `ADV-TIME-02` | Token Expiration | Expired 24 hours ago | Return `null` | Returned `null` | **PASS** |
| `ADV-TIME-03` | Token Expiration | Expired 7 days ago | Return `null` | Returned `null` | **PASS** |
| `ADV-FUTURE-01` | Timestamp Drift | Timestamp +5 minutes in future | Return `null` | Returned Claims | **VULNERABLE** |
| `ADV-FUTURE-02` | Timestamp Drift | Timestamp +1 hour in future | Return `null` | Returned Claims | **VULNERABLE** |
| `ADV-FUTURE-03` | Timestamp Drift | Timestamp +24 hours in future | Return `null` | Returned Claims | **VULNERABLE** |
| `ADV-FUTURE-04` | Timestamp Drift | Timestamp +30 days in future | Return `null` | Returned Claims | **VULNERABLE** |
| `ADV-FUTURE-05` | Timestamp Drift | Timestamp +1 year in future | Return `null` | Returned Claims | **VULNERABLE** |
| `ADV-SIZE-01` | Payload Injection | 50KB payload injection | No crash | Handled safely | **PASS** |
| `ADV-SIZE-02` | Payload Injection | 50KB payload with corrupted HMAC | Return `null` | Returned `null` | **PASS** |
| `ADV-FUZZ-01` | Payload Injection | Malformed non-base64 string | Return `null` | Returned `null` | **PASS** |
| `ADV-FUZZ-02` | Payload Injection | 100-level deeply nested JSON | No crash | Parsed safely | **PASS** |
| `ADV-EDGE-01` | Edge Redirection | Tampered token on `/portal` | 307 -> `/login` | 307 -> `/login` | **PASS** |
| `ADV-EDGE-02` | Edge Redirection | Tampered token on `/medicao/rdp` | 307 -> `/login` | 307 -> `/login` | **PASS** |
| `ADV-EDGE-03` | Edge Redirection | Tampered token on `/api/orcamentos` | 401 Unauthorized | 401 Unauthorized | **PASS** |
| `ADV-EDGE-04` | Edge Redirection | Tampered token on `/dashboard` (no session) | 307 -> `/login` | 307 -> `/login` | **PASS** |
| `ADV-EDGE-05` | Edge Redirection | Tampered token on `/dashboard` (with session) | 307 -> `/login` | Status 200 (allow) | **VULNERABLE** |
| `ADV-EDGE-06` | Synchronous Bypass | Forged token evaluated synchronously | 307 -> `/login` | Status 200 (allow) | **VULNERABLE** |

---

## 5. Caveats

1. **Review-Only Role**: In adherence to the agent's constraints, no production files (`src/lib/token-utils.ts`, `src/middleware.ts`) were modified. All fixes must be implemented by `worker_m5`.
2. **Server-Side Mitigation**: For Challenge 2 (`ADV-EDGE-05`), if a request bypasses Edge Middleware to `/dashboard`, Server Components executing `getServerSession()` with SQLite will reject an unrecognized session token at render time. However, allowing tampered traffic to reach backend rendering violates the Edge security perimeter contract.
3. **No Web Crypto Native Crash**: Testing confirmed that Web Crypto in Node.js / Edge Runtime does not crash or exhaust memory on 50KB payloads.

---

## 6. Conclusion

Milestone M5 is **REJECTED**.

Although the HMAC cryptographic primitives in `src/lib/token-utils.ts` reliably detect bit flips, corrupted signatures, and expired tokens, the milestone cannot be certified due to:
1. Complete lack of future timestamp drift validation in `verifyUserMeta`.
2. Edge bypass vulnerability on `/dashboard` when tampered metadata is paired with any session cookie.
3. Synchronous privilege exposure in `middleware.ts` via `parsePayloadUnsafe`.

### Required Actions for `worker_m5`:
1. **In `src/lib/token-utils.ts`**:
   Add clock drift validation:
   ```typescript
   const now = Date.now();
   const maxClockSkewMs = 60 * 1000; // 1 minute tolerance
   const maxAgeMs = 12 * 60 * 60 * 1000; // 12 hours
   if (!parsed.ts || typeof parsed.ts !== 'number' || parsed.ts > now + maxClockSkewMs || (now - parsed.ts) > maxAgeMs) {
     return null;
   }
   ```
2. **In `src/middleware.ts`**:
   - Update `parsePayloadUnsafe` to include the same future timestamp drift check (`parsed.ts > now + 60_000`).
   - Restrict legacy `/dashboard` fallback: ONLY activate if `!userMetaToken` (i.e. cookie completely absent). If `userMetaToken` is present but failed verification (`claims === null`), do NOT apply fallback; allow normal unauthenticated flow to redirect to `/login` with 307.
   - Harden synchronous evaluation so `syncRes` does not grant authorized access to unverified claims.

---

## 7. Verification Method

To independently execute and verify these findings:

```powershell
# 1. Run the empirical adversarial test harness
npx tsx scripts/challenger-m5-adversarial.ts

# 2. Invalidation Conditions:
# - Script must exit with code 0 (currently exits with code 1)
# - All 35 tests must PASS (currently 28 passed, 7 vulnerable)
# - Zero vulnerabilities reported across future drift, dashboard bypass, and synchronous inspection
```
