/**
 * Automated Verification Suite for Security, Routes, Headers, Rate Limiting & Input Masks
 * RBT Fundações — Gestão e Automação de Orçamentos
 * Milestone 4 — Acceptance Criteria Verification
 *
 * Verifies:
 * 1. Route Protection Middleware (src/middleware.ts)
 * 2. HTTP Security Headers (next.config.mjs)
 * 3. Sliding Window Rate Limiting (src/lib/rate-limit.ts)
 * 4. Input Formatting Masks & Parsers (src/lib/masks.ts)
 */

import { NextRequest } from 'next/server';
import { middleware, config as middlewareConfig } from '../src/middleware';
import {
  checkRateLimit,
  resetRateLimit,
  createRateLimitResponse,
  getClientIp,
} from '../src/lib/rate-limit';
import {
  formatCurrencyBRL,
  parseCurrencyBRL,
  maskCurrencyKeystroke,
  formatPhoneBR,
  formatDimension,
  DIMENSION_GUIDES,
} from '../src/lib/masks';

// Interface for test results
interface TestResult {
  suite: string;
  name: string;
  passed: boolean;
  error?: string;
  durationMs: number;
}

const results: TestResult[] = [];
let currentSuite = '';

function suite(name: string) {
  currentSuite = name;
  console.log(`\n===============================================================`);
  console.log(`  SUITE: ${name}`);
  console.log(`===============================================================`);
}

async function test(name: string, fn: () => void | Promise<void>) {
  const start = performance.now();
  try {
    await fn();
    const durationMs = Number((performance.now() - start).toFixed(2));
    results.push({ suite: currentSuite, name, passed: true, durationMs });
    console.log(`  ✓ [PASS] ${name} (${durationMs}ms)`);
  } catch (err: any) {
    const durationMs = Number((performance.now() - start).toFixed(2));
    const errorMessage = err?.message || String(err);
    results.push({ suite: currentSuite, name, passed: false, error: errorMessage, durationMs });
    console.error(`  ✗ [FAIL] ${name} (${durationMs}ms)`);
    console.error(`         Error: ${errorMessage}`);
  }
}

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

function assertEqual<T>(actual: T, expected: T, message: string) {
  if (actual !== expected) {
    throw new Error(`${message} — Expected: ${JSON.stringify(expected)}, Got: ${JSON.stringify(actual)}`);
  }
}

function assertIncludes(haystack: string, needle: string, message: string) {
  if (!haystack.includes(needle)) {
    throw new Error(`${message} — String does not include "${needle}". Got: "${haystack}"`);
  }
}

async function runAllVerificationSuites() {
  const overallStart = performance.now();
  console.log('Starting Automated Security & Routing Verification Suite...');
  console.log(`Timestamp: ${new Date().toISOString()}`);

  // =========================================================================
  // SUITE 1: Route Protection Middleware Logic (src/middleware.ts)
  // =========================================================================
  suite('1. Route Protection Middleware (src/middleware.ts)');

  await test('1.1 Unauthenticated access to /dashboard redirects to /login with 307', () => {
    const req = new NextRequest('http://localhost:3000/dashboard');
    const res = middleware(req);

    assertEqual(res.status, 307, 'Response status should be 307 Temporary Redirect');
    const location = res.headers.get('location') || '';
    assertIncludes(location, '/login?redirect=', 'Location header must point to /login with redirect param');
    assertIncludes(location, encodeURIComponent('/dashboard'), 'Redirect param must encode target path /dashboard');
  });

  await test('1.2 Unauthenticated access to deep subroute /dashboard/orcamentos/123 preserves path in redirect', () => {
    const targetPath = '/dashboard/orcamentos/123';
    const req = new NextRequest(`http://localhost:3000${targetPath}`);
    const res = middleware(req);

    assertEqual(res.status, 307, 'Subroute response status should be 307');
    const location = res.headers.get('location') || '';
    assertIncludes(location, encodeURIComponent(targetPath), 'Location header must preserve nested subroute in redirect query');
  });

  await test('1.3 Unauthenticated access preserving query parameters in redirect target', () => {
    const req = new NextRequest('http://localhost:3000/dashboard?tab=kanban&filter=pending');
    const res = middleware(req);

    assertEqual(res.status, 307, 'Response status should be 307');
    const location = res.headers.get('location') || '';
    assertIncludes(location, encodeURIComponent('/dashboard?tab=kanban&filter=pending'), 'Redirect query must preserve full search params');
  });

  await test('1.4 Empty or whitespace session cookie is treated as unauthenticated and redirects', () => {
    const reqEmpty = new NextRequest('http://localhost:3000/dashboard', {
      headers: { cookie: 'rbt_orcamentos_session=' },
    });
    const resEmpty = middleware(reqEmpty);
    assertEqual(resEmpty.status, 307, 'Empty cookie value should be blocked with 307');

    const reqWhitespace = new NextRequest('http://localhost:3000/dashboard', {
      headers: { cookie: 'rbt_orcamentos_session=   ' },
    });
    const resWhitespace = middleware(reqWhitespace);
    assertEqual(resWhitespace.status, 307, 'Whitespace cookie value should be blocked with 307');
  });

  await test('1.5 Authenticated access with valid rbt_orcamentos_session cookie passes through', () => {
    const validToken = 'valid_session_sha256_mock_token_abc123';
    const req = new NextRequest('http://localhost:3000/dashboard', {
      headers: { cookie: `rbt_orcamentos_session=${validToken}` },
    });
    const res = middleware(req);

    assertEqual(res.status, 200, 'Authenticated request status should be 200 (NextResponse.next())');
    assertEqual(res.headers.get('location'), null, 'Authenticated request must not set location redirect header');
  });

  await test('1.6 Authenticated access to nested dashboard sub-route passes through', () => {
    const validToken = 'valid_session_sha256_mock_token_abc123';
    const req = new NextRequest('http://localhost:3000/dashboard/orcamentos/calc-999', {
      headers: { cookie: `rbt_orcamentos_session=${validToken}` },
    });
    const res = middleware(req);

    assertEqual(res.status, 200, 'Authenticated sub-route request status should be 200');
    assertEqual(res.headers.get('location'), null, 'Must not redirect authenticated sub-route');
  });

  await test('1.7 Public routes (e.g. /login, /formulario/token) pass through without authentication', () => {
    const reqLogin = new NextRequest('http://localhost:3000/login');
    const resLogin = middleware(reqLogin);
    assertEqual(resLogin.status, 200, 'Public /login route should pass through');

    const reqForm = new NextRequest('http://localhost:3000/formulario/magic-token-xyz');
    const resForm = middleware(reqForm);
    assertEqual(resForm.status, 200, 'Public /formulario/:token route should pass through');

    const reqFormPublic = new NextRequest('http://localhost:3000/formulario');
    const resFormPublic = middleware(reqFormPublic);
    assertEqual(resFormPublic.status, 200, 'Public /formulario route should pass through without token');
  });

  await test('1.8 Middleware configuration matches required route patterns', () => {
    assert(Array.isArray(middlewareConfig.matcher), 'Matcher should be an array');
    assert(middlewareConfig.matcher.includes('/dashboard'), 'Matcher must include /dashboard');
    assert(middlewareConfig.matcher.includes('/dashboard/:path*'), 'Matcher must include /dashboard/:path*');
  });

  // =========================================================================
  // SUITE 2: HTTP Security Headers (next.config.mjs)
  // =========================================================================
  suite('2. HTTP Security Headers (next.config.mjs)');

  const nextConfigModule = await import('../next.config.mjs');
  const nextConfig = nextConfigModule.default;

  await test('2.1 next.config.mjs exports valid configuration with headers() and poweredByHeader disabled', async () => {
    assert(typeof nextConfig === 'object' && nextConfig !== null, 'nextConfig must be an object');
    assertEqual(nextConfig.poweredByHeader, false, 'poweredByHeader must be explicitly false (prevents X-Powered-By leakage)');
    assert(typeof nextConfig.headers === 'function', 'nextConfig must define async headers() function');
  });

  const headerConfigs = typeof nextConfig.headers === 'function' ? await nextConfig.headers() : [];
  const globalHeaderConfig = headerConfigs?.find((c: any) => c.source === '/(.*)');

  await test('2.2 Security headers rule covers all application routes /(.*)', () => {
    assert(!!globalHeaderConfig, 'Header rules must include source "/(.*)"');
    assert(Array.isArray(globalHeaderConfig?.headers), 'Headers must be an array of key-value objects');
    assert((globalHeaderConfig?.headers?.length ?? 0) >= 6, 'Must define at least 6 core security headers');
  });

  const headersMap = new Map<string, string>();
  if (globalHeaderConfig?.headers) {
    for (const h of globalHeaderConfig.headers) {
      headersMap.set(h.key, h.value);
    }
  }

  await test('2.3 Content-Security-Policy (CSP) is properly configured with defense-in-depth directives', () => {
    const csp = headersMap.get('Content-Security-Policy');
    assert(!!csp, 'Content-Security-Policy header must be present');
    assertIncludes(csp!, "script-src 'self'", 'CSP must restrict scripts to self');
    assertIncludes(csp!, "style-src 'self'", 'CSP must restrict styles to self');
    assertIncludes(csp!, "img-src 'self'", 'CSP must allow self images');
    assertIncludes(csp!, "font-src 'self'", 'CSP must restrict fonts to self');
    assertIncludes(csp!, "connect-src 'self'", 'CSP must restrict fetch/XHR connections to self');
    assertIncludes(csp!, "frame-ancestors 'none'", 'CSP must prohibit framing via frame-ancestors none');
  });

  await test('2.4 X-Frame-Options is set to DENY (clickjacking protection)', () => {
    const xfo = headersMap.get('X-Frame-Options');
    assertEqual(xfo, 'DENY', 'X-Frame-Options must be DENY');
  });

  await test('2.5 X-Content-Type-Options is set to nosniff (MIME-sniffing protection)', () => {
    const xcto = headersMap.get('X-Content-Type-Options');
    assertEqual(xcto, 'nosniff', 'X-Content-Type-Options must be nosniff');
  });

  await test('2.6 Referrer-Policy is strict-origin-when-cross-origin', () => {
    const ref = headersMap.get('Referrer-Policy');
    assertEqual(ref, 'strict-origin-when-cross-origin', 'Referrer-Policy must be strict-origin-when-cross-origin');
  });

  await test('2.7 Permissions-Policy restricts sensitive device APIs', () => {
    const perm = headersMap.get('Permissions-Policy');
    assert(!!perm, 'Permissions-Policy header must be present');
    assertIncludes(perm!, 'camera=()', 'Permissions-Policy must disable camera');
    assertIncludes(perm!, 'microphone=()', 'Permissions-Policy must disable microphone');
    assertIncludes(perm!, 'geolocation=()', 'Permissions-Policy must disable geolocation');
  });

  await test('2.8 Strict-Transport-Security (HSTS) enforces HTTPS with long max-age and preload', () => {
    const hsts = headersMap.get('Strict-Transport-Security');
    assert(!!hsts, 'Strict-Transport-Security header must be present');
    assertIncludes(hsts!, 'max-age=', 'HSTS must specify max-age');
    assertIncludes(hsts!, 'includeSubDomains', 'HSTS must include includeSubDomains');
    assertIncludes(hsts!, 'preload', 'HSTS must include preload');
  });

  // =========================================================================
  // SUITE 3: Sliding Window Rate Limiting (src/lib/rate-limit.ts)
  // =========================================================================
  suite('3. Rate Limiting Functionality (src/lib/rate-limit.ts)');

  await test('3.1 Sequential requests within threshold are allowed with decremented remaining count', () => {
    const testKey = 'test:rate:user_allow';
    resetRateLimit(testKey);

    const limit = 3;
    const windowMs = 5000;

    const r1 = checkRateLimit(testKey, limit, windowMs);
    assertEqual(r1.allowed, true, 'Request 1 should be allowed');
    assertEqual(r1.remaining, 2, 'Remaining should be 2');
    assertEqual(r1.retryAfterSeconds, 0, 'Retry after should be 0');

    const r2 = checkRateLimit(testKey, limit, windowMs);
    assertEqual(r2.allowed, true, 'Request 2 should be allowed');
    assertEqual(r2.remaining, 1, 'Remaining should be 1');

    const r3 = checkRateLimit(testKey, limit, windowMs);
    assertEqual(r3.allowed, true, 'Request 3 should be allowed');
    assertEqual(r3.remaining, 0, 'Remaining should be 0');
  });

  await test('3.2 Requests exceeding the threshold are blocked with retryAfterSeconds > 0', () => {
    const testKey = 'test:rate:user_block';
    resetRateLimit(testKey);

    const limit = 2;
    const windowMs = 10000;

    checkRateLimit(testKey, limit, windowMs); // 1
    checkRateLimit(testKey, limit, windowMs); // 2

    const rBlocked = checkRateLimit(testKey, limit, windowMs); // 3 (exceeded)
    assertEqual(rBlocked.allowed, false, '3rd request must be blocked');
    assertEqual(rBlocked.success, false, 'success alias must be false');
    assertEqual(rBlocked.remaining, 0, 'Remaining must be 0');
    assert(rBlocked.retryAfterSeconds >= 1, `retryAfterSeconds must be at least 1, got ${rBlocked.retryAfterSeconds}`);
    assert(rBlocked.retryAfterSeconds <= 10, `retryAfterSeconds should not exceed windowMs in seconds`);
  });

  await test('3.3 createRateLimitResponse produces HTTP 429 response with Retry-After header and JSON body', async () => {
    const response = createRateLimitResponse('Muitas tentativas. Tente novamente em instantes.', 45);

    assertEqual(response.status, 429, 'Response status code must be 429 Too Many Requests');
    assertEqual(response.headers.get('Retry-After'), '45', 'Retry-After header must match retry seconds');

    const body = await response.json();
    assertEqual(body.error, 'Muitas tentativas. Tente novamente em instantes.', 'JSON body must contain error message');
    assertEqual(body.retryAfter, 45, 'JSON body must contain retryAfter field');
  });

  await test('3.4 Rate limiting isolates independent client keys', () => {
    const keyA = 'test:client:ip_a';
    const keyB = 'test:client:ip_b';
    resetRateLimit(keyA);
    resetRateLimit(keyB);

    // Exhaust keyA limit
    checkRateLimit(keyA, 1, 10000);
    const blockedA = checkRateLimit(keyA, 1, 10000);
    assertEqual(blockedA.allowed, false, 'Key A must be blocked');

    // Key B should remain completely allowed
    const allowedB = checkRateLimit(keyB, 1, 10000);
    assertEqual(allowedB.allowed, true, 'Key B must still be allowed independently');
  });

  await test('3.5 resetRateLimit clears throttle state for specific key and globally', () => {
    const testKey = 'test:reset:single';
    checkRateLimit(testKey, 1, 10000);
    checkRateLimit(testKey, 1, 10000); // blocked

    resetRateLimit(testKey);
    const retry = checkRateLimit(testKey, 1, 10000);
    assertEqual(retry.allowed, true, 'Request must be allowed again after key reset');

    const key1 = 'test:reset:global1';
    const key2 = 'test:reset:global2';
    checkRateLimit(key1, 1, 10000);
    checkRateLimit(key1, 1, 10000); // blocked
    checkRateLimit(key2, 1, 10000);
    checkRateLimit(key2, 1, 10000); // blocked

    resetRateLimit(); // Global clear
    assertEqual(checkRateLimit(key1, 1, 10000).allowed, true, 'Key 1 allowed after global reset');
    assertEqual(checkRateLimit(key2, 1, 10000).allowed, true, 'Key 2 allowed after global reset');
  });

  await test('3.6 getClientIp extracts real client IP from forward proxy headers with fallback', () => {
    // 1. x-forwarded-for with multi-proxy chain
    const reqForwarded = new NextRequest('http://localhost:3000/api/auth/login', {
      headers: { 'x-forwarded-for': '189.40.85.12, 10.0.0.1, 172.16.0.1' },
    });
    assertEqual(getClientIp(reqForwarded), '189.40.85.12', 'Should extract first client IP from x-forwarded-for');

    // 2. x-real-ip
    const reqReal = new NextRequest('http://localhost:3000/api/auth/login', {
      headers: { 'x-real-ip': '200.150.10.5' },
    });
    assertEqual(getClientIp(reqReal), '200.150.10.5', 'Should extract x-real-ip header');

    // 3. cf-connecting-ip (Cloudflare)
    const reqCf = new NextRequest('http://localhost:3000/api/auth/login', {
      headers: { 'cf-connecting-ip': '177.20.30.40' },
    });
    assertEqual(getClientIp(reqCf), '177.20.30.40', 'Should extract cf-connecting-ip header');

    // 4. Fallback when no headers present
    const reqEmpty = new NextRequest('http://localhost:3000/api/auth/login');
    assertEqual(getClientIp(reqEmpty), '127.0.0.1', 'Should fallback to 127.0.0.1');
  });

  // =========================================================================
  // SUITE 4: Input Masks & Parsers (src/lib/masks.ts)
  // =========================================================================
  suite('4. Input Masks & Parsers (src/lib/masks.ts)');

  await test('4.1 formatCurrencyBRL formats numerical and string inputs to Brazilian Real (R$)', () => {
    assertEqual(formatCurrencyBRL(0), 'R$ 0,00', 'Zero formatted to R$ 0,00');
    assertEqual(formatCurrencyBRL(1250.5), 'R$ 1.250,50', 'Float 1250.5 formatted to R$ 1.250,50');
    assertEqual(formatCurrencyBRL(1000000), 'R$ 1.000.000,00', 'One million formatted to R$ 1.000.000,00');
    assertEqual(formatCurrencyBRL(0.05), 'R$ 0,05', 'Cents 0.05 formatted to R$ 0,05');

    // String float input
    assertEqual(formatCurrencyBRL('1250.50'), 'R$ 1.250,50', 'String "1250.50" formatted to R$ 1.250,50');
    // Pre-formatted brazilian string
    assertEqual(formatCurrencyBRL('1.250,50'), 'R$ 1.250,50', 'String "1.250,50" formatted to R$ 1.250,50');
    // Digit-only keystroke string
    assertEqual(formatCurrencyBRL('125050'), 'R$ 1.250,50', 'Raw digits "125050" formatted to R$ 1.250,50');

    // Edge cases
    assertEqual(formatCurrencyBRL(null), 'R$ 0,00', 'Null formatted to R$ 0,00');
    assertEqual(formatCurrencyBRL(undefined), 'R$ 0,00', 'Undefined formatted to R$ 0,00');
    assertEqual(formatCurrencyBRL(''), 'R$ 0,00', 'Empty string formatted to R$ 0,00');
    assertEqual(formatCurrencyBRL(NaN), 'R$ 0,00', 'NaN formatted to R$ 0,00');
  });

  await test('4.2 parseCurrencyBRL parses masked strings into clean float numbers', () => {
    assertEqual(parseCurrencyBRL('R$ 1.250,50'), 1250.5, 'Parsed "R$ 1.250,50" -> 1250.5');
    assertEqual(parseCurrencyBRL('1.250,50'), 1250.5, 'Parsed "1.250,50" -> 1250.5');
    assertEqual(parseCurrencyBRL('1250.50'), 1250.5, 'Parsed "1250.50" -> 1250.5');
    assertEqual(parseCurrencyBRL('R$ 0,00'), 0, 'Parsed "R$ 0,00" -> 0');
    assertEqual(parseCurrencyBRL('R$ 1.000.000,00'), 1000000, 'Parsed "R$ 1.000.000,00" -> 1000000');
    assertEqual(parseCurrencyBRL(500), 500, 'Direct number returns same number');
    assertEqual(parseCurrencyBRL(null), 0, 'Null returns 0');
    assertEqual(parseCurrencyBRL(undefined), 0, 'Undefined returns 0');
    assertEqual(parseCurrencyBRL(''), 0, 'Empty string returns 0');
  });

  await test('4.3 Bidirectional roundtrip test: parseCurrencyBRL(formatCurrencyBRL(n)) === n', () => {
    const testValues = [0, 0.01, 10.5, 99.99, 1250.5, 45290.75, 1000000, 9999999.99];
    for (const val of testValues) {
      const formatted = formatCurrencyBRL(val);
      const parsed = parseCurrencyBRL(formatted);
      assertEqual(parsed, val, `Roundtrip failed for value ${val} (formatted: ${formatted})`);
    }
  });

  await test('4.4 maskCurrencyKeystroke handles progressive typing for monetary inputs', () => {
    const step1 = maskCurrencyKeystroke('1');
    assertEqual(step1.masked, 'R$ 0,01', 'Digit "1" -> R$ 0,01');
    assertEqual(step1.numericValue, 0.01, 'Numeric value -> 0.01');

    const step2 = maskCurrencyKeystroke('12');
    assertEqual(step2.masked, 'R$ 0,12', 'Digits "12" -> R$ 0,12');
    assertEqual(step2.numericValue, 0.12, 'Numeric value -> 0.12');

    const step3 = maskCurrencyKeystroke('125');
    assertEqual(step3.masked, 'R$ 1,25', 'Digits "125" -> R$ 1,25');
    assertEqual(step3.numericValue, 1.25, 'Numeric value -> 1.25');

    const step4 = maskCurrencyKeystroke('1250');
    assertEqual(step4.masked, 'R$ 12,50', 'Digits "1250" -> R$ 12,50');
    assertEqual(step4.numericValue, 12.5, 'Numeric value -> 12.50');

    const step5 = maskCurrencyKeystroke('125050');
    assertEqual(step5.masked, 'R$ 1.250,50', 'Digits "125050" -> R$ 1.250,50');
    assertEqual(step5.numericValue, 1250.5, 'Numeric value -> 1250.50');

    const empty = maskCurrencyKeystroke('');
    assertEqual(empty.masked, 'R$ 0,00', 'Empty keystroke -> R$ 0,00');
    assertEqual(empty.numericValue, 0, 'Empty keystroke numeric -> 0');
  });

  await test('4.5 formatPhoneBR formats 10-digit landline and 11-digit mobile/WhatsApp numbers', () => {
    // 11 digits (Mobile / WhatsApp)
    assertEqual(formatPhoneBR('11987654321'), '(11) 98765-4321', '11 digits formatted to (11) 98765-4321');
    // 10 digits (Landline)
    assertEqual(formatPhoneBR('1134567890'), '(11) 3456-7890', '10 digits formatted to (11) 3456-7890');

    // Partial keystroke masking
    assertEqual(formatPhoneBR('1'), '(1', '1 digit -> (1');
    assertEqual(formatPhoneBR('11'), '(11', '2 digits -> (11');
    assertEqual(formatPhoneBR('119'), '(11) 9', '3 digits -> (11) 9');
    assertEqual(formatPhoneBR('119876'), '(11) 9876', '6 digits -> (11) 9876');
    assertEqual(formatPhoneBR('1198765'), '(11) 9876-5', '7 digits -> (11) 9876-5');
    assertEqual(formatPhoneBR('11987654'), '(11) 9876-54', '8 digits -> (11) 9876-54');

    // Strips existing formatting symbols properly
    assertEqual(formatPhoneBR('(11) 98765-4321'), '(11) 98765-4321', 'Input with symbols stripped and formatted');
    assertEqual(formatPhoneBR('11 98765 4321'), '(11) 98765-4321', 'Input with spaces stripped and formatted');

    // Null/undefined/empty
    assertEqual(formatPhoneBR(''), '', 'Empty string returns empty string');
    assertEqual(formatPhoneBR(null), '', 'Null returns empty string');
    assertEqual(formatPhoneBR(undefined), '', 'Undefined returns empty string');
  });

  await test('4.6 formatDimension normalizes engineering and dimensional input strings', () => {
    assertEqual(formatDimension('10x20'), '10 x 20', 'Multiplication "x" spaced properly');
    assertEqual(formatDimension('10X20'), '10 x 20', 'Uppercase "X" spaced properly');
    assertEqual(formatDimension('10*20'), '10 x 20', 'Asterisk "*" converted to "x"');
    assertEqual(formatDimension('10×20'), '10 x 20', 'Unicode multiplication "×" normalized');
    assertEqual(formatDimension('1000  x  2000  x  500 mm'), '1000 x 2000 x 500 mm', 'Redundant spaces collapsed');
    assertEqual(formatDimension('  Ø 310mm x 12m  '), 'Ø 310mm x 12m', 'Trims whitespace around technical string');
    assertEqual(formatDimension(''), '', 'Empty string returns empty string');
    assertEqual(formatDimension(null), '', 'Null returns empty string');
  });

  await test('4.7 DIMENSION_GUIDES exposes pre-configured engineering dimension templates', () => {
    assert(Array.isArray(DIMENSION_GUIDES), 'DIMENSION_GUIDES must be an array');
    assert(DIMENSION_GUIDES.length >= 5, 'Must contain at least 5 dimension templates');
    const hasDiameter = DIMENSION_GUIDES.some(g => g.template.includes('Ø 310mm'));
    assert(hasDiameter, 'Guides must include foundation diameter template');
  });

  // =========================================================================
  // SUMMARY AND REPORTING
  // =========================================================================
  const totalDurationMs = Number((performance.now() - overallStart).toFixed(2));
  const passedCount = results.filter(r => r.passed).length;
  const failedCount = results.filter(r => !r.passed).length;
  const totalCount = results.length;

  console.log('\n===============================================================');
  console.log('                 VERIFICATION TEST SUMMARY                     ');
  console.log('===============================================================');
  console.log(`  Total Tests Run:  ${totalCount}`);
  console.log(`  Tests Passed:     ${passedCount}`);
  console.log(`  Tests Failed:     ${failedCount}`);
  console.log(`  Total Execution:  ${totalDurationMs}ms`);
  console.log('===============================================================\n');

  if (failedCount > 0) {
    console.error(`VERIFICATION SUITE FAILED with ${failedCount} errors.`);
    for (const failure of results.filter(r => !r.passed)) {
      console.error(`- [${failure.suite}] ${failure.name}: ${failure.error}`);
    }
    process.exit(1);
  } else {
    console.log('ALL VERIFICATION CHECKS PASSED SUCCESSFULLY! ✓');
    process.exit(0);
  }
}

// Execute suite
runAllVerificationSuites().catch((err) => {
  console.error('Fatal unhandled error during verification run:', err);
  process.exit(1);
});
