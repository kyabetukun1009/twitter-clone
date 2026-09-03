// Image upload lifecycle: upload -> post -> timeline shows -> proxy 200 -> cleanup.
// Usage: (server running) node scripts/smoke-image.mjs
import { writeFileSync } from 'node:fs';
const BASE = 'http://localhost:3000';

// 1x1 red PNG
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64'
);
writeFileSync(new URL('./test-pixel.png', import.meta.url), PNG);

const login = await fetch(BASE + '/api/yajuter/gate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ password: 'dev-gate-810' })
});
const cookie = login.headers.get('set-cookie').split(';')[0];
const H = { Cookie: cookie };
const check = (name, cond) => console.log(cond ? `OK ${name}` : `NG ${name}`);

// bad file rejected (text as image)
const badForm = new FormData();
badForm.append('image', new Blob(['hello'], { type: 'text/plain' }), 'x.txt');
const bad = await fetch(BASE + '/api/yajuter/upload', {
  method: 'POST',
  headers: H,
  body: badForm
});
check('non-image rejected', bad.status === 400);

// upload png
const form = new FormData();
form.append('image', new Blob([PNG], { type: 'image/png' }), 'red.png');
const up = await fetch(BASE + '/api/yajuter/upload', {
  method: 'POST',
  headers: H,
  body: form
}).then((r) => r.json());
check('upload ok', up.ok && typeof up.path === 'string');
const path = up.path;

// post with image
const created = await fetch(BASE + '/api/yajuter/posts', {
  method: 'POST',
  headers: { ...H, 'Content-Type': 'application/json' },
  body: JSON.stringify({ content: '画像テストだゾ', image_path: path })
}).then((r) => r.json());
check('post with image', created.ok && created.post.image_path === path);
const id = created.post?.id;

// proxy serves it
const img = await fetch(
  `${BASE}/api/yajuter/image?path=${encodeURIComponent(path)}`,
  { headers: H }
);
check(
  'image proxy 200 png',
  img.status === 200 && (img.headers.get('content-type') || '').includes('png')
);

// traversal blocked
const trav = await fetch(`${BASE}/api/yajuter/image?path=..%2Fsecret`, {
  headers: H
});
check('traversal blocked', trav.status === 400);

// cleanup: delete post + storage object is left (private bucket, harmless)
await fetch(`${BASE}/api/yajuter/posts/${id}`, { method: 'DELETE', headers: H });
const tl = await fetch(BASE + '/api/yajuter/timeline', { headers: H }).then((r) =>
  r.json()
);
check('post gone', !tl.posts.some((p) => p.id === id));
