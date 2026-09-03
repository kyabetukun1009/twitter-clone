// Thread + bookmarks lifecycle.
// Usage: (server running) node scripts/smoke-thread.mjs
const BASE = 'http://localhost:3000';

const login = await fetch(BASE + '/api/yajuter/gate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ password: 'dev-gate-810' })
});
const cookie = login.headers.get('set-cookie').split(';')[0];
const H = { 'Content-Type': 'application/json', Cookie: cookie };
const check = (name, cond) => console.log(cond ? `OK ${name}` : `NG ${name}`);
const post = (path, body) =>
  fetch(BASE + path, {
    method: 'POST',
    headers: H,
    body: JSON.stringify(body)
  }).then((r) => r.json());

// parent + reply
const parent = await post('/api/yajuter/posts', { content: '親投稿だゾ' });
const reply = await post('/api/yajuter/posts', {
  content: 'つづきだゾ',
  reply_to: parent.post.id
});
check('reply created', reply.ok && reply.post.reply_to === parent.post.id);

// thread shows both + counts
const thread = await fetch(BASE + `/api/yajuter/posts/${parent.post.id}`, {
  headers: H
}).then((r) => r.json());
check(
  'thread shape',
  thread.ok &&
    thread.post.reply_count === 1 &&
    thread.replies.length === 1 &&
    thread.parents.length === 0
);

// missing id -> 404
const missing = await fetch(BASE + '/api/yajuter/posts/1', { headers: H });
check('missing 404', missing.status === 404);

// bookmark parent -> list -> clear
await post('/api/yajuter/bookmark', { post_id: parent.post.id });
const list1 = await fetch(BASE + '/api/yajuter/bookmarks', { headers: H }).then(
  (r) => r.json()
);
check(
  'bookmarks list',
  list1.ok && list1.posts.some((p) => p.id === parent.post.id)
);
const cleared = await fetch(BASE + '/api/yajuter/bookmarks', {
  method: 'DELETE',
  headers: H
}).then((r) => r.json());
const list2 = await fetch(BASE + '/api/yajuter/bookmarks', { headers: H }).then(
  (r) => r.json()
);
check('bookmarks cleared', cleared.ok && list2.posts.length === 0);

// cleanup
await fetch(BASE + `/api/yajuter/posts/${reply.post.id}`, {
  method: 'DELETE',
  headers: H
});
await fetch(BASE + `/api/yajuter/posts/${parent.post.id}`, {
  method: 'DELETE',
  headers: H
});
const gone = await fetch(BASE + `/api/yajuter/posts/${parent.post.id}`, {
  headers: H
});
check('thread gone after delete', gone.status === 404);
