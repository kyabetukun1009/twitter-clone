// Gate smoke test against local dev server.
// Usage: (server running) node scripts/smoke-gate.mjs
const BASE = 'http://localhost:3000';

async function main() {
  // 1. / redirects to /gate without cookie
  const r1 = await fetch(BASE + '/', { redirect: 'manual' });
  console.log('GET / ->', r1.status, r1.headers.get('location'));

  // 2. gate page renders
  const r2 = await fetch(BASE + '/gate');
  const html = await r2.text();
  console.log('GET /gate ->', r2.status, html.includes('yajuter') ? '(has brand)' : '(NO BRAND)');

  // 3. wrong password rejected
  const r3 = await fetch(BASE + '/api/yajuter/gate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password: 'wrong' })
  });
  console.log('POST gate(wrong) ->', r3.status);

  // 4. dev password accepted
  const r4 = await fetch(BASE + '/api/yajuter/gate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password: 'dev-gate-810' })
  });
  console.log(
    'POST gate(dev) ->',
    r4.status,
    r4.headers.get('set-cookie') ? '(cookie set)' : '(NO COOKIE)'
  );
}

await main();
