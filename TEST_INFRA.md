# Test Infrastructure & Specification Verification Architecture
# Portal Unificado RBT Fundações (Orçamentos + Medição Diária)

**Project**: RBT Fundações — Portal Unificado de Gestão de Orçamentos e Medição Diária (RDP)  
**Framework**: TypeScript strict, Next.js 14 (App Router & Edge Runtime), Node.js, Web Crypto API  
**Test Harness**: `scripts/verify-portal-unified.ts`  
**Integrity Mode**: Opaque-box, requirement-driven, zero coupling to transient internal implementations  
**Date**: 2026-10-20  
**Version**: 1.0.0  

---

## 1. Test Philosophy & Design Principles

The end-to-end test infrastructure for the Portal Unificado RBT Fundações is engineered to enforce total behavioral and architectural compliance. It guarantees that the integration of **Gestão de Orçamentos** and **Medição Diária (RDP)** preserves complete domain decoupling, eliminates security vulnerabilities, and adheres strictly to corporate branding and access control mandates.

All assertions and expected outputs are authoritatively derived from:
1. `ORIGINAL_REQUEST.md`: Customer requirements R1 through R4 and Acceptance Criteria.
2. `PROJECT.md`: System architecture, 9-feature inventory, milestone roadmap, and formal interface contracts.
3. Corporate Design Standards: Official RBT color tokens (`#BA1A1A`, `#111827`, `#0A0F1D`, `#1E3A5F`), selection hub card specs, and typography.
4. Edge Runtime Specifications: Sub-millisecond cryptographic authorization via Web Crypto HMAC SHA-256 tokens without database queries.

### Core Testing Pillars:
- **Authoritative Expected Output Derivation**: Every test assertion is derived from statutory business rules or documented interface contracts. Arbitrary or facade assertions are strictly prohibited.
- **Progressive Testability & Isolation**: Tests are self-contained and idempotent. Test execution is independent of previous state or execution sequence.
- **Adversarial & Cryptographic Verification**: Includes active attack simulations: HMAC signature tampering, bit flips in base64 payloads, expired token replays, URL path traversal, permission matrix edge cases, and rate limit exhaustion.
- **4-Tier Structured Hierarchy**:
  - **Tier 1 (Feature Isolation)**: Discrete verification of all 9 features defined in `PROJECT.md`.
  - **Tier 2 (Boundary, Corner Cases & Adversarial Security)**: Parameter extremes, invalid combinations, evasion tactics, and security perimeter stress.
  - **Tier 3 (Pairwise Feature Combinations & Cross-Module Transitions)**: Multi-step cross-boundary workflows (login -> root triaging -> switcher navigation -> dynamic permission revocation -> email independence).
  - **Tier 4 (Real-World Workloads & Production Personas)**: End-to-end full day simulations of three production personas (Engenheiro Carlos, Orçamentista Lucas, and Diretoria Roberto) plus forensic database decoupling audit.

---

## 2. Feature Inventory Coverage Matrix (Features 1 to 9)

| # | Feature | Milestone | Requirement Source | Test Tier | Test Suite in `verify-portal-unified.ts` | Verification Focus |
|---|---------|-----------|--------------------|-----------|------------------------------------------|---------------------|
| 1 | Dependency & Schema Foundation | M1 | PROJECT.md §F1 | Tier 1 | `1.1 Schema & HMAC Cryptography` | User schema flags (`acessoOrcamento`, `acessoMedicao`), Medição models merge, zero column pollution |
| 2 | Unified Session & Token Auth | M1 | PROJECT.md §F2 | Tier 1, Tier 2 | `1.1 Schema & HMAC Cryptography`, `2.1 HMAC Security` | Web Crypto HMAC SHA-256 signing/verification, `UserMetaClaims`, tampering detection, expiration |
| 3 | Institutional Selection Hub | M2 | ORIGINAL_REQUEST §R1 | Tier 1, Tier 3 | `1.2 Selection Hub & Routing`, `3.1 Root Triaging` | `/portal` card layout, RBT colors (`#BA1A1A`, `#111827`), root `/` triaging (dual vs single module) |
| 4 | Bidirectional Module Switcher | M2 | ORIGINAL_REQUEST §R1 | Tier 1, Tier 3 | `1.3 Module Switcher`, `3.2 Switcher Navigation` | Switcher visibility for dual-module users, suppression for single-module users, cross-module return |
| 5 | User Management & Permission UI | M3 | ORIGINAL_REQUEST §R2 | Tier 1, Tier 2 | `1.4 User Permissions API`, `2.3 Permission Matrix` | At least 1 module requirement, rejection of `{acessoOrcamento: false, acessoMedicao: false}`, partial updates |
| 6 | Medição Diária Code Migration | M4 | ORIGINAL_REQUEST §R3 | Tier 1, Tier 4 | `1.5 Medição Route Isolation`, `4.4 Forensic Decoupling` | `/medicao/*` isolation, independent calculation engine, zero cross-domain state interference |
| 7 | Preservation of Orçamentos & Emails | M4 | ORIGINAL_REQUEST §R3 | Tier 1, Tier 3 | `1.6 Orçamentos & Email Preservation`, `3.5 Concurrency` | Zero regressions on Kanban, proposals, public forms, and SMTP email services |
| 8 | Route Protection Middleware | M5 | ORIGINAL_REQUEST §R4 | Tier 1, Tier 2 | `1.7 Middleware Protection`, `2.2 Route Bypass Evasion` | Edge boundary enforcement, module barriers, `?unauthorized=...` friendly alerts, unauthenticated 307 to login |
| 9 | Verification & Integrity Audit | M6 | Acceptance Criteria | Tier 1, Tier 4 | `1.8 Build Integrity Contract`, `4.4 Forensic Audit` | Typecheck (`tsc --noEmit`), build (`next build`), zero architectural coupling |

---

## 3. Detailed Multi-Tier Test Hierarchy

### Tier 1: Feature Isolation Verification
Validates each feature independently against its formal contract:
- **1.1 Schema & HMAC Cryptography**: Verifies `UserMetaClaims` structure (`userId`, `role`, `email`, `acessoOrcamento`, `acessoMedicao`, `ts`). Confirms HMAC SHA-256 signing and verification using Web Crypto API. Validates that tampering with claims or signature returns `null`.
- **1.2 Selection Hub & Routing**: Validates `/portal` UI properties: white cards, rounded corners, drop shadows, `#BA1A1A` and `#111827` icon containers. Tests root `/` triaging logic.
- **1.3 Module Switcher Contract**: Tests conditional rendering rules: displayed if and only if `acessoOrcamento && acessoMedicao`.
- **1.4 User Management & Permissions**: Tests API schemas: requires at least one module flag set to `true`. Rejects zero-permission states with HTTP 400.
- **1.5 Medição Diária Route Isolation**: Validates route namespace `/medicao/*` and calculation decoupling.
- **1.6 Preservation of Orçamentos & Emails**: Verifies existing budget functions (`formatCurrencyBRL`, `parseCurrencyBRL`, email templates) remain untouched.
- **1.7 Route Protection Middleware**: Tests middleware access table for `/dashboard/*`, `/medicao/*`, `/api/*`, and public paths.
- **1.8 Build Integrity Contract**: Establishes strict typecheck and production build requirements.

### Tier 2: Boundary, Corner Cases & Adversarial Security
Hardens the application against malicious manipulation and edge anomalies:
- **2.1 Cryptographic Attacks**:
  - Bit-flip attacks: Modifying `acessoMedicao: false` to `true` inside base64 payload without valid HMAC key must be rejected.
  - Signature corruption and truncation.
  - Replay attacks: Reject tokens older than max-age (8 hours).
  - Clock skew: Reject tokens with future timestamps beyond acceptable clock drift.
  - Malformed tokens: Separator absence, corrupted base64url characters, non-JSON strings.
- **2.2 Route Evasion & Path Traversal Attacks**:
  - Case sensitivity attacks: `/Dashboard`, `/DASHBOARD`, `/Medicao`, `/MEDICAO`.
  - Encoded traversal attacks: `/dashboard/..%2fmedicao`, `/medicao/../dashboard`.
  - Empty or whitespace session cookies: Blocked with HTTP 307.
  - Query parameter injection: Ensuring query strings do not alter security decision.
- **2.3 Boundary Permission Matrix & API Stress**:
  - Truth table verification: all 4 combinations of `(acessoOrcamento, acessoMedicao)`.
  - Missing fields, unexpected data types, injection strings in user creation payload.
  - Sliding-window rate limit enforcement on sensitive endpoints.

### Tier 3: Pairwise Feature Combinations & Cross-Module State Transitions
Tests integrated sequences spanning multiple subsystems:
- **3.1 Complete Auth & Route Triaging**:
  - Flow: Credentials verification -> HMAC cookie generation -> Root `/` request -> Direct module or portal destination.
- **3.2 Module Switcher Round-Trip Navigation**:
  - Flow: User in `/dashboard` clicks switcher -> Navigates to `/medicao` -> Identity and session validated -> Clicks switcher -> Returns to `/dashboard`.
- **3.3 Dynamic Permission Revocation Flow**:
  - Flow: Active user with dual access has Medição revoked by Admin -> Token invalidated/reissued -> Next request to `/medicao` triggers immediate redirection to `/portal?unauthorized=medicao`.
- **3.4 Concurrent Multi-Session Module Isolation**:
  - Concurrently evaluates two isolated sessions (User A: Orçamentos only; User B: Medição only) attempting to access opposing routes to verify zero cross-talk.
- **3.5 Dual-Channel Notification Concurrency**:
  - Simultaneous dispatch of budget proposal email and Medição RDP notification without channel deadlock.

### Tier 4: Real-World Workloads & Production Persona Simulation
Simulates full production operational lifecycles:
- **4.1 Persona 1: "Engenheiro Carlos" (Medição Exclusive)**:
  - Day in field: Login -> Direct routing to `/medicao` -> RDP creation and calculation -> Attempted access to `/dashboard` blocked with alert banner -> Safe logout.
- **4.2 Persona 2: "Orçamentista Lucas" (Orçamentos Exclusive)**:
  - Commercial day: Login -> Direct routing to `/dashboard` -> Kanban management & proposal generation -> Attempted access to `/medicao` blocked with alert banner -> Safe logout.
- **4.3 Persona 3: "Diretoria Roberto" (Dual-Module Executive)**:
  - Executive workflow: Login -> Lands on `/portal` hub -> Reviews Orçamentos pipeline -> Switches to Medição via header switcher -> Validates field RDPs -> Switches back -> Safe logout.
- **4.4 Forensic Database & Architectural Decoupling Audit**:
  - Structural audit guaranteeing disjoint entity models, zero database foreign key coupling across business boundaries, and clean route namespacing.

---

## 4. Test Harness Execution & Invocation

The test harness is implemented in `scripts/verify-portal-unified.ts` and executed via `tsx`.

### Complete Suite Execution (All 4 Tiers):
```bash
npx tsx scripts/verify-portal-unified.ts
```

### Execution by Specific Tier:
```bash
# Run Tier 1 only (Feature Isolation)
npx tsx scripts/verify-portal-unified.ts --tier=1

# Run Tier 2 only (Boundary & Adversarial)
npx tsx scripts/verify-portal-unified.ts --tier=2

# Run Tier 3 only (Pairwise Combinations)
npx tsx scripts/verify-portal-unified.ts --tier=3

# Run Tier 4 only (Real-World Workloads & Forensic Audit)
npx tsx scripts/verify-portal-unified.ts --tier=4
```

### Verbose Mode:
```bash
npx tsx scripts/verify-portal-unified.ts --verbose
```

### Integration into npm scripts (`package.json`):
```json
{
  "scripts": {
    "test:portal": "tsx scripts/verify-portal-unified.ts",
    "test:security": "tsx scripts/verify-security-routes.ts",
    "test:all": "tsx scripts/verify-portal-unified.ts && tsx scripts/verify-security-routes.ts"
  }
}
```

---

## 5. Certification Standards

A build is certified **READY FOR PRODUCTION** when:
1. `npx tsx scripts/verify-portal-unified.ts` exits with code `0` (100% of tests passing across all 4 tiers).
2. `npx tsc --noEmit` reports 0 type errors.
3. `npm run build` compiles all static pages, server components, and API routes cleanly without errors.
4. Forensic integrity audit confirms zero architectural bleed between Orçamentos and Medição domains.
