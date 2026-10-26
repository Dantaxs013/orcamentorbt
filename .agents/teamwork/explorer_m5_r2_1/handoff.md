# Remediation Blueprint: `src/lib/token-utils.ts` & Edge Cryptographic Authentication

- **Agent**: `explorer_m5_r2_1` (Read-only Explorer & Synthesizer)
- **Target**: `src/lib/token-utils.ts` (Portal Unificado RBT Fundações)
- **Recipient**: Parent Orchestrator (`e65a3c02-8d0d-46b7-ac87-62b0077928ce`)
- **Handoff Type**: Hard Handoff
- **Date**: 2026-10-21

---

## Executive Summary

This report establishes the empirical investigation and precise engineering remediation blueprint for `src/lib/token-utils.ts`. 
1. **Root Cause Confirmation**: We directly reproduced the vulnerability identified by `challenger_m5_1` where `verifyUserMeta` accepts future-dated tokens indefinitely because negative deltas (`Date.now() - parsed.ts`) bypass `(Date.now() - parsed.ts) > maxAgeMs`.
2. **Clock Drift Resolution**: We designed and empirically validated the mathematical upper bound `parsed.ts <= Date.now() + 60000` (60-second skew tolerance) combined with strict finite numeric typing and the 12-hour expiration window.
3. **Edge Runtime Compatibility**: We audited every cryptographic and buffer primitive in `src/lib/token-utils.ts` against the W3C Web Cryptography API and Next.js Edge Runtime specifications, confirming full compatibility with zero Node.js-only dependencies.
4. **Additional Hardening**: We discovered that Base64 padding bits in 43-character HMAC digests permit malleable signatures without modifying decoded bytes; we designed a canonical roundtrip check `toBase64Url(sigBytes) === sigB64` that cleanly neutralizes this vector.

---

## 1. Observation

Direct observations and evidence from code analysis, test execution, and runtime evaluation:

### 1.1 Vulnerability in `src/lib/token-utils.ts` (Lines 125–129)
In `src/lib/token-utils.ts`, lines 125–129 contain:
```typescript
125:     const maxAgeMs = 12 * 60 * 60 * 1000; // 12 horas
126:     if (!parsed.ts || typeof parsed.ts !== 'number' || (Date.now() - parsed.ts) > maxAgeMs) {
127:       return null;
128:     }
```
- **Observed Behavior**: If an attacker mints or replays a token where `parsed.ts` is in the future (e.g. `Date.now() + 300_000` or `Date.now() + 31_536_000_000`), the expression `Date.now() - parsed.ts` yields a negative number (e.g. `-300000`).
- Because `-300000 > 43200000` is `false`, line 126 evaluates to `false`. The function continues and returns valid user claims for future timestamps.
- **Specification Contrast**: In `scripts/verify-portal-unified.ts` (lines 220–222), the verification oracle specifies:
```typescript
220:     const now = Date.now();
221:     if (now - parsed.ts > maxAgeMs) return null; // Expired
222:     if (parsed.ts > now + 60 * 1000) return null; // Clock drift > 1 minute in future
```
Production `src/lib/token-utils.ts` omitted line 222.

### 1.2 Reproduction in `scripts/challenger-m5-adversarial.ts`
Running `npx tsx scripts/challenger-m5-adversarial.ts` reproduced the failure:
```
--- VECTOR 5: Future Timestamp Drift ---
  ✗ [VULNERABILITY] Timestamp Drift :: Future timestamp drift: Drift 5 minutes in future (+300s) (0.58ms)
      ALERT: VULNERABILITY: Token with future timestamp accepted! (ts: +300s, claims returned: {"userId":"usr_timetraveler",...})
  ✗ [VULNERABILITY] Timestamp Drift :: Future timestamp drift: Drift 1 hour in future (+3600s) (0.41ms)
  ✗ [VULNERABILITY] Timestamp Drift :: Future timestamp drift: Drift 24 hours in future (+1 day) (0.40ms)
  ✗ [VULNERABILITY] Timestamp Drift :: Future timestamp drift: Drift 30 days in future (+30 days) (0.34ms)
  ✗ [VULNERABILITY] Timestamp Drift :: Future timestamp drift: Drift 1 year in future (+365 days) (0.30ms)
```

### 1.3 Web Cryptography API & Edge Runtime Compatibility Audit
We inspected all APIs invoked in `src/lib/token-utils.ts`:
| API / Primitive | Standard / Source | Edge Runtime Compatible? | Node.js 18+ Compatible? | Notes |
|---|---|---|---|---|
| `crypto.subtle.importKey` | W3C Web Cryptography | **YES** | **YES** | Imports HMAC SHA-256 key with `extractable: false` |
| `crypto.subtle.sign` | W3C Web Cryptography | **YES** | **YES** | Computes 256-bit HMAC signature returning `ArrayBuffer` |
| `crypto.subtle.verify` | W3C Web Cryptography | **YES** | **YES** | Constant-time timing-safe verification |
| `TextEncoder` / `TextDecoder` | WHATWG Encoding API | **YES** | **YES** | Globally available; no imports required |
| `btoa` / `atob` | WHATWG HTML Living Standard | **YES** | **YES** | Globally available; handles Base64 without `Buffer` |
| `Uint8Array` | ECMAScript Standard | **YES** | **YES** | Universal TypedArray; zero dependencies |
| `process.env.SESSION_SECRET` | Next.js Environment | **YES** | **YES** | Statically inlined or evaluated at runtime |

- **Zero Node Built-in Dependencies**: `src/lib/token-utils.ts` does NOT import `node:crypto`, `node:fs`, `node:buffer`, or `node:path`. It relies entirely on standard Web APIs available in V8 isolates and Next.js Edge Runtime.
- **Type Safety**: `npx tsc --noEmit` exited with code 0 (zero TypeScript errors).

### 1.4 Base64URL Padding Malleability Discovery
- HMAC-SHA256 outputs 32 bytes (256 bits).
- Base64URL represents 32 bytes as 43 characters (`32 = 10 * 3 + 2 bytes` -> 10 4-character blocks + 3 characters for the remaining 2 bytes).
- The 43rd character encodes 4 bits of payload and 2 bits of padding zeros.
- Standard `atob` decodes only the upper 4 bits and ignores the lower 2 bits. Consequently, altering the 2 padding bits produces the exact same 32 bytes in `fromBase64Url`, passing `crypto.subtle.verify`.
- By enforcing `toBase64Url(sigBytes) === sigB64`, any alteration of padding bits or non-canonical encoding is strictly detected and rejected.

---

## 2. Logic Chain

1. **Premise 1 (Two-Sided Temporal Window Requirement)**:
   - Cryptographic session validation requires bounding the timestamp from below (`now - ts <= maxAgeMs`) to prevent replay of expired sessions, and from above (`ts <= now + clockTolerance`) to prevent forging tokens that never expire.
   - *Observation 1.1*: `src/lib/token-utils.ts` only checked `(Date.now() - parsed.ts) > maxAgeMs`.
   - *Logical Inference*: Future timestamps yield negative deltas, bypassing `> maxAgeMs`.
   - *Conclusion 1*: Validating `parsed.ts <= Date.now() + 60000` closes this security gap while accommodating up to 60 seconds of legitimate multi-server clock skew.

2. **Premise 2 (Edge Runtime Isolation & Portability)**:
   - Next.js Edge Middleware executes in a restricted V8 isolate environment without Node.js standard libraries.
   - *Observation 1.3*: `src/lib/token-utils.ts` uses only global `crypto.subtle`, `TextEncoder`, `TextDecoder`, `atob`, `btoa`, and `Uint8Array`.
   - *Logical Inference*: The code executes identically across Edge Middleware, Next.js Server Components, API routes, and testing environments.
   - *Conclusion 2*: No polyfills or runtime guards are needed; the Web Cryptography implementation is fully compliant with Edge constraints.

3. **Premise 3 (Canonical Encoding Verification)**:
   - When signature strings are received over HTTP cookies, multiple encodings of the same byte sequence must not be accepted (defense against signature malleability).
   - *Observation 1.4*: Roundtrip check `toBase64Url(fromBase64Url(sigB64)) === sigB64` guarantees canonical representation.
   - *Conclusion 3*: Adding this check hardens `verifyUserMeta` against bit-flipping attacks on the terminal Base64 character.

---

## 3. Caveats

1. **Read-Only Explorer Constraints**: In strict adherence to our read-only investigation mandate, no changes have been committed directly to `src/lib/token-utils.ts` or `src/middleware.ts`. The implementation must be executed by `worker_m5`.
2. **Coordination with `src/middleware.ts`**: While this report specifies the remediation for `src/lib/token-utils.ts`, `src/middleware.ts` contains `parsePayloadUnsafe` and legacy `/dashboard` fallback logic that also require updating by `worker_m5` to pass vectors `ADV-EDGE-05` and `ADV-EDGE-06`.

---

## 4. Conclusion & Remediation Blueprint

### 4.1 Target File: `src/lib/token-utils.ts`

#### Proposed Changes (Lines 125–129):
**Before**:
```typescript
    const maxAgeMs = 12 * 60 * 60 * 1000; // 12 horas
    if (!parsed.ts || typeof parsed.ts !== 'number' || (Date.now() - parsed.ts) > maxAgeMs) {
      return null;
    }
```

**After**:
```typescript
    const now = Date.now();
    const maxAgeMs = 12 * 60 * 60 * 1000; // 12 horas
    const maxClockSkewMs = 60 * 1000; // 60 segundos de tolerância para clock drift futuro

    // Rejeita timestamp ausente, inválido, expirado (>12h) ou adulterado no futuro (>now + 60s)
    if (
      !parsed.ts ||
      typeof parsed.ts !== 'number' ||
      Number.isNaN(parsed.ts) ||
      parsed.ts > now + maxClockSkewMs ||
      (now - parsed.ts) > maxAgeMs
    ) {
      return null;
    }
```

#### Optional Signature Malleability Hardening (Line 112):
```typescript
    const sigBytes = fromBase64Url(sigB64);

    // Validação de Base64URL canônico para prevenir maleabilidade de bits de padding na assinatura
    if (toBase64Url(sigBytes) !== sigB64) {
      return null;
    }
```

### 4.2 Complete Drop-In Replacement for `verifyUserMeta` in `src/lib/token-utils.ts`

```typescript
/**
 * Valida o token assinado e retorna as claims de metadata do usuário ou null se adulterado/expirado/futuro.
 * Suporta tanto a passagem direta da string do token quanto o objeto NextRequest (ou qualquer objeto com cookies.get).
 * Compatível com Edge Runtime e Node.js utilizando W3C Web Cryptography API (crypto.subtle).
 */
export async function verifyUserMeta(
  input: string | { cookies: { get: (name: string) => { value: string } | undefined } } | null | undefined
): Promise<UserMetaClaims | null> {
  if (!input) return null;

  const token = typeof input === 'string' ? input : input.cookies?.get(USER_META_COOKIE_NAME)?.value;
  if (!token || typeof token !== 'string') return null;

  const parts = token.split('.');
  if (parts.length !== 2) return null;

  const [dataB64, sigB64] = parts;
  if (!dataB64 || !sigB64) return null;

  try {
    const enc = new TextEncoder();
    const dec = new TextDecoder();
    const key = await getCryptoKey();
    const sigBytes = fromBase64Url(sigB64);

    // Validação de Base64URL canônico contra maleabilidade de assinatura
    if (toBase64Url(sigBytes) !== sigB64) {
      return null;
    }

    const isValid = await crypto.subtle.verify(
      'HMAC',
      key,
      sigBytes as unknown as BufferSource,
      enc.encode(dataB64)
    );

    if (!isValid) return null;

    const jsonStr = dec.decode(fromBase64Url(dataB64));
    const parsed = JSON.parse(jsonStr);

    const now = Date.now();
    const maxAgeMs = 12 * 60 * 60 * 1000; // 12 horas
    const maxClockSkewMs = 60 * 1000; // 60 segundos tolerância de drift futuro

    // Validação estrita do timestamp: dentro da janela [now - 12h, now + 60s]
    if (
      !parsed.ts ||
      typeof parsed.ts !== 'number' ||
      Number.isNaN(parsed.ts) ||
      parsed.ts > now + maxClockSkewMs ||
      (now - parsed.ts) > maxAgeMs
    ) {
      return null;
    }

    const roleUpper = String(parsed.role || '').toUpperCase();
    const defaultOrcamento = roleUpper === 'ADMIN' || roleUpper === 'ADMINISTRADOR' || roleUpper === 'ORCAMENTISTA';
    const defaultMedicao = roleUpper === 'ADMIN' || roleUpper === 'ADMINISTRADOR' || roleUpper === 'APONTADOR' || roleUpper === 'ENGENHEIRO';

    return {
      userId: String(parsed.userId),
      role: String(parsed.role),
      email: String(parsed.email),
      acessoOrcamento: typeof parsed.acessoOrcamento === 'boolean' ? parsed.acessoOrcamento : defaultOrcamento,
      acessoMedicao: typeof parsed.acessoMedicao === 'boolean' ? parsed.acessoMedicao : defaultMedicao,
      ts: Number(parsed.ts),
    };
  } catch {
    return null;
  }
}
```

### 4.3 Recommended Alignment in `src/middleware.ts`
For `worker_m5`, mirror the clock drift check in `parsePayloadUnsafe` (lines 42–45 of `src/middleware.ts`):
```typescript
    const now = Date.now();
    const maxAgeMs = 12 * 60 * 60 * 1000;
    const maxClockSkewMs = 60 * 1000;
    if (
      !parsed.ts ||
      typeof parsed.ts !== 'number' ||
      parsed.ts > now + maxClockSkewMs ||
      (now - parsed.ts) > maxAgeMs
    ) {
      return null;
    }
```
And restrict the legacy `/dashboard` fallback (line 277) to activate only if `!userMetaToken` (cookie completely absent), strictly redirecting to `/login` with HTTP 307 if `userMetaToken` was supplied but failed verification.

---

## 5. Verification Method

### 5.1 Standalone Empirical Proof of Fix
We constructed two independent validation suites in our agent directory:
1. `test_timestamp_drift.ts`: Tests 19 discrete boundary conditions for timestamps (current, +30s, +60s, +61s, +5m, +1h, +24h, +30d, +1y, 11h59m ago, 12h ago, 12h+1s, negative, zero, NaN, null, string).
   ```powershell
   npx tsx ".agents/teamwork/explorer_m5_r2_1/test_timestamp_drift.ts"
   # Output: SUCCESS: All 19 timestamp test cases passed!
   ```
2. `test_token_utils_remediation.ts`: Executes cryptographic HMAC signing and verification on the proposed code.
   ```powershell
   npx tsx ".agents/teamwork/explorer_m5_r2_1/test_token_utils_remediation.ts"
   # Output:
   # Test 1 (Valid token): PASS
   # Test 2 (+30s drift): PASS
   # Test 3 (+5m drift rejected): PASS
   # Test 4 (+1h drift rejected): PASS
   # Test 5 (+365d drift rejected): PASS
   # Test 6 (12h+1s expired rejected): PASS
   # Test 7 (Tampered sig rejected via canonical check): PASS
   ```

### 5.2 Independent Project Test Commands
To verify after implementation by `worker_m5`:
1. **Adversarial Test Suite**:
   ```powershell
   npx tsx scripts/challenger-m5-adversarial.ts
   ```
   *Expected*: All 5 future drift vectors (`ADV-FUTURE-01` through `ADV-FUTURE-05`) pass cleanly.
2. **Typecheck & Production Build**:
   ```powershell
   npx tsc --noEmit
   npm run build
   ```
   *Expected*: Zero TypeScript errors, successful Next.js build including Edge Middleware.
