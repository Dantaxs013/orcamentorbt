const maxAgeMs = 12 * 60 * 60 * 1000;
const maxClockSkewMs = 60 * 1000;

function validateTs(ts: any, evaluationNow: number = Date.now()): boolean {
  if (
    !ts ||
    typeof ts !== 'number' ||
    Number.isNaN(ts) ||
    ts > evaluationNow + maxClockSkewMs ||
    (evaluationNow - ts) > maxAgeMs
  ) {
    return false;
  }
  return true;
}

const now = Date.now();
const tests: Array<{ name: string; ts: any; expected: boolean }> = [
  { name: 'Current timestamp', ts: now, expected: true },
  { name: '30s in future (tolerated drift)', ts: now + 30000, expected: true },
  { name: '60s in future (exact boundary)', ts: now + 60000, expected: true },
  { name: '61s in future (exceeds drift)', ts: now + 61000, expected: false },
  { name: '5m in future (+300s, ADV-FUTURE-01)', ts: now + 300000, expected: false },
  { name: '1h in future (+3600s, ADV-FUTURE-02)', ts: now + 3600000, expected: false },
  { name: '24h in future (ADV-FUTURE-03)', ts: now + 86400000, expected: false },
  { name: '30d in future (ADV-FUTURE-04)', ts: now + 30 * 86400000, expected: false },
  { name: '1y in future (ADV-FUTURE-05)', ts: now + 365 * 86400000, expected: false },
  { name: '11h 59m ago (valid session)', ts: now - (maxAgeMs - 60000), expected: true },
  { name: '12h ago (boundary)', ts: now - maxAgeMs, expected: true },
  { name: '12h + 1s ago (expired, ADV-TIME-01)', ts: now - (maxAgeMs + 1000), expected: false },
  { name: '24h ago (expired, ADV-TIME-02)', ts: now - 24 * 3600000, expected: false },
  { name: '7d ago (expired, ADV-TIME-03)', ts: now - 7 * 86400000, expected: false },
  { name: 'Negative timestamp', ts: -1000, expected: false },
  { name: 'Zero timestamp', ts: 0, expected: false },
  { name: 'NaN timestamp', ts: NaN, expected: false },
  { name: 'Null timestamp', ts: null, expected: false },
  { name: 'String timestamp', ts: '1792586471325', expected: false },
];

let allPassed = true;
for (const t of tests) {
  const result = validateTs(t.ts, now);
  const ok = result === t.expected;
  if (!ok) {
    allPassed = false;
    console.error(`FAILED: ${t.name} (got: ${result}, expected: ${t.expected})`);
  } else {
    console.log(`PASS: ${t.name}`);
  }
}

if (!allPassed) {
  console.error('\nFAIL: Some test cases failed');
  process.exit(1);
} else {
  console.log('\nSUCCESS: All 19 timestamp test cases passed!');
  process.exit(0);
}
