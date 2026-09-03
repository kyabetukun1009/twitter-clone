// Full post lifecycle: create -> timeline -> like -> bookmark -> delete.
// Usage: (server running) node scripts/smoke-posts.mjs
const BASE = 'http://localhost:3000';

const login = await fetch(BASE + '/api/yajuter/gate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ password: 'dev-gate-810' })
});
const cookie = login.headers.get('set-cookie').split(';')[0];
console.log('login', login.status);
const H = { 'Content-Type': 'application/json', Cookie: cookie };
const check = (name, cond) => console.log(cond ? `OK ${name}` : `NG ${name}`);

// home shell renders
const home = await fetch(BASE + '/home', { headers: { Cookie: cookie } });
const html = await home.text();
check('home 200 + header', home.status === 200 && html.includes('"/home"'));
console.log('home', home.status, 'len', html.length);

// create
const created = await (
  await fetch(BASE + '/api/yajuter/posts', {
    method: 'POST',
    headers: H,
    body: JSON.stringify({ content: '自動テストだゾ〜(小並感)', emotion_tag: '(迫真)' })
  })
).json();
check('create', created.ok && created.post.id > 114596);
console.log('create', JSON.stringify(created).slice(0, 200));
const id = created.post?.id;

// visible in timeline head
const tl1 = await (
  await fetch(BASE + '/api/yajuter/timeline', { headers: H })
).json();
check('timeline has post', tl1.posts.some((p) => p.id === id));

// like +1
const liked = await (
  await fetch(BASE + '/api/yajuter/like', {
    method: 'POST',
    headers: H,
    body: JSON.stringify({ post_id: id })
  })
).json();
check('like +1', liked.ok && liked.post.like_count === 1);

// bookmark toggle on
const bm = await (
  await fetch(BASE + '/api/yajuter/bookmark', {
    method: 'POST',
    headers: H,
    body: JSON.stringify({ post_id: id })
  })
).json();
check('bookmark on', bm.ok && bm.post.bookmarked === true);

// me counters moved
const me = await (await fetch(BASE + '/api/yajuter/me', { headers: H })).json();
check('me totalTweets >= 15', me.ok && me.user.totalTweets >= 15);

// delete + gone from timeline
const del = await (
  await fetch(BASE + `/api/yajuter/posts/${id}`, {
    method: 'DELETE',
    headers: H
  })
).json();
const tl2 = await (
  await fetch(BASE + '/api/yajuter/timeline', { headers: H })
).json();
check('delete + gone', del.ok && !tl2.posts.some((p) => p.id === id));
