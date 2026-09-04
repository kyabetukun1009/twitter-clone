// Batch B lifecycle: stamp/pin/edit + pilgrimage.
// Usage: (server running) node scripts/smoke-b.mjs
const BASE = 'http://localhost:3000';

const login = await fetch(BASE + '/api/yajuter/gate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ password: 'dev-gate-810' })
});
const cookie = login.headers.get('set-cookie').split(';')[0];
const H = { 'Content-Type': 'application/json', Cookie: cookie };
const check = (name, cond) => console.log(cond ? `OK ${name}` : `NG ${name}`);
const post = (path, body, method = 'POST') =>
  fetch(BASE + path, {
    method,
    headers: H,
    body: body ? JSON.stringify(body) : undefined
  }).then((r) => r.json());

// fresh post for action tests
const created = await post('/api/yajuter/posts', { content: 'Bテストだゾ' });
const id = created.post.id;

// stamp toggle on/off
const s1 = await post('/api/yajuter/stamp', { post_id: id, stamp: '草' });
const s2 = await post('/api/yajuter/stamp', { post_id: id, stamp: '草' });
check('stamp toggle', s1.ok && s1.stamps['草'] === 1 && s2.ok && !s2.stamps['草']);
const bad = await post('/api/yajuter/stamp', { post_id: id, stamp: 'nope' });
check('stamp invalid 400', bad.ok === false);

// pin on/off
const p1 = await post('/api/yajuter/pin', { post_id: id });
const p2 = await post('/api/yajuter/pin', { post_id: id });
check('pin toggle', p1.ok && p1.pinned === true && p2.ok && p2.pinned === false);

// edit within 5 min, then bad edit
const e1 = await fetch(BASE + `/api/yajuter/posts/${id}`, {
  method: 'PUT',
  headers: H,
  body: JSON.stringify({ content: 'Bテスト編集したゾ', emotion_tag: '迫真' })
}).then((r) => r.json());
check(
  'edit ok',
  e1.ok && e1.post.content === 'Bテスト編集したゾ' && !!e1.post.edited_at
);
const e2 = await fetch(BASE + '/api/yajuter/posts/114581', {
  method: 'PUT',
  headers: H,
  body: JSON.stringify({ content: 'x' })
}).then((r) => r.json());
check('edit old post rejected', e2.ok === false);

// pilgrimage: list, add, delete
const pg = await fetch(BASE + '/api/yajuter/pilgrimage', { headers: H }).then((r) =>
  r.json()
);
check('pilgrimage spots', pg.ok && pg.spots.length === 3);
const added = await post('/api/yajuter/pilgrimage', {
  spot_id: 1,
  visited_at: '2026-09-04',
  digital_only: true,
  memo: 'テスト巡礼だゾ'
});
check('pilgrimage add', added.ok && added.log.id > 0);
const del = await fetch(BASE + '/api/yajuter/pilgrimage', {
  method: 'DELETE',
  headers: H,
  body: JSON.stringify({ id: added.log.id })
}).then((r) => r.json());
check('pilgrimage delete', del.ok);

// cleanup test post
await fetch(`${BASE}/api/yajuter/posts/${id}`, { method: 'DELETE', headers: H });
console.log('done');
