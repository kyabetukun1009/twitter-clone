// Production probe. Usage: node scripts/smoke-prod.mjs <gate-password>
// (password stays on CLI, never committed)
const BASE = 'https://yajuter.vercel.app';
const password = process.argv[2];
if (!password) {
  console.log('usage: node scripts/smoke-prod.mjs <gate-password>');
  process.exit(1);
}

const login = await fetch(BASE + '/api/yajuter/gate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ password })
});
console.log('login', login.status, (await login.text()).slice(0, 100));
const setCookie = login.headers.get('set-cookie');
if (!setCookie) {
  console.log('NO COOKIE — gate rejected');
  process.exit(0);
}
const H = { Cookie: setCookie.split(';')[0] };

for (const path of ['/api/yajuter/me', '/api/yajuter/timeline']) {
  try {
    const r = await fetch(BASE + path, { headers: H });
    const t = await r.text();
    console.log(path, r.status, t.slice(0, 200));
  } catch (e) {
    console.log(path, 'FETCH ERR', e.message);
  }
}

const home = await fetch(BASE + '/home', { headers: H });
const html = await home.text();
console.log('home', home.status, 'len', html.length);
