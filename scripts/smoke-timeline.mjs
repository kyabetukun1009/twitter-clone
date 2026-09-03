// Timeline API smoke test (gate login -> authed fetch).
// Usage: (server running) node scripts/smoke-timeline.mjs
const BASE = 'http://localhost:3000';

const login = await fetch(BASE + '/api/yajuter/gate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ password: 'dev-gate-810' })
});
const cookie = login.headers.get('set-cookie');
console.log('login ->', login.status, cookie ? '(cookie)' : '(NO COOKIE)');

// no cookie -> 401
const r1 = await fetch(BASE + '/api/yajuter/timeline');
console.log('timeline(no cookie) ->', r1.status, (await r1.text()).slice(0, 200));

// with cookie -> 200 (0 posts until migration)
const r2 = await fetch(BASE + '/api/yajuter/timeline', {
  headers: { Cookie: cookie.split(';')[0] }
});
const body = await r2.json();
console.log('timeline(cookie) ->', r2.status, JSON.stringify(body));
