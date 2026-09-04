// Batch D checks: quiz Q&A, archive, review, review-svg.
// Usage: (server running, migration-002 applied) node scripts/smoke-d.mjs
const BASE = 'http://localhost:3000';

const login = await fetch(BASE + '/api/yajuter/gate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ password: 'dev-gate-810' })
});
const cookie = login.headers.get('set-cookie').split(';')[0];
const H = { 'Content-Type': 'application/json', Cookie: cookie };
const check = (name, cond) => console.log(cond ? `OK ${name}` : `NG ${name}`);
const get = (path) => fetch(BASE + path, { headers: H }).then((r) => r.json());

const q = await get('/api/yajuter/quiz?mode=normal');
check(
  'quiz question',
  q.ok && q.question.options.length === 4 && q.question.answerId > 0
);
const a = await fetch(BASE + '/api/yajuter/quiz', {
  method: 'POST',
  headers: H,
  body: JSON.stringify({ mode: 'normal', streak: 3 })
}).then((r) => r.json());
check('quiz answer recorded', a.ok && a.streak === 3 && a.best >= 3);

const ar = await get('/api/yajuter/archive?y=2026');
// NOTE: seed post 114595 (2026-12-31 23:59Z) is 2027 in JST.
check(
  'archive',
  ar.ok && ar.total === 13 && ar.months.length === 12 && ar.best3.length > 0
);
const ar27 = await get('/api/yajuter/archive?y=2027');
check('archive JST year', ar27.ok && ar27.total === 1);

const rv = await get('/api/yajuter/review?y=2026');
check('review', rv.ok && rv.total === 13 && rv.monthly.length === 12);

const svg = await fetch(BASE + '/api/yajuter/review-svg?y=2026', {
  headers: H
});
const svgText = await svg.text();
check(
  'review-svg',
  svg.status === 200 &&
    svg.headers.get('content-type').includes('svg') &&
    svgText.includes('yajuter 2026')
);
console.log('done');
