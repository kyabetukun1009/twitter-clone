// Migrate PHP/MySQL dump into Supabase (explicit IDs preserved).
// Usage: node scripts/migrate-from-mysql.mjs
// Writes scripts/migration-setval.sql -> run it in Supabase SQL Editor.
import { readFileSync, writeFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

function loadEnv(path) {
  const out = {};
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (m && !line.trim().startsWith('#')) out[m[1]] = m[2];
  }
  return out;
}

const env = loadEnv(new URL('../.env.local', import.meta.url));
const sb = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

const dump = JSON.parse(
  readFileSync(new URL('./migration-dump.json', import.meta.url), 'utf8')
);
const T = dump.tables;
const bool = (v) => v === 1 || v === '1' || v === true;
const nil = (v) => (v === null || v === undefined || v === '' ? null : v);
const num = (v) => (v === null || v === undefined ? null : Number(v));

let ng = 0;
async function upsert(table, rows, label) {
  if (!rows.length) {
    console.log(`SKIP ${table} (0 rows)`);
    return;
  }
  const { error } = await sb.from(table).upsert(rows, { onConflict: 'id' });
  if (error) {
    console.log(`NG ${table}: ${error.message}`);
    ng++;
  } else {
    console.log(`OK ${table}: ${rows.length} ${label || ''}`);
  }
}

// users (id=1 profile sync)
await upsert(
  'users',
  T.users.map((u) => ({
    id: Number(u.id),
    username: u.username,
    display_name: u.display_name,
    bio: u.bio || '',
    avatar_emoji: u.avatar_emoji || '野',
    theme: u.theme || 'yaju-gold'
  }))
);

// posts (id order so reply_to parents land first)
const posts = [...T.posts].sort((a, b) => a.id - b.id);
await upsert(
  'posts',
  posts.map((p) => ({
    id: Number(p.id),
    user_id: Number(p.user_id),
    content: p.content,
    emotion_tag: nil(p.emotion_tag),
    image_path: nil(p.image_path),
    like_count: Number(p.like_count || 0),
    bookmarked: bool(p.bookmarked),
    pinned: bool(p.pinned),
    reply_to: num(p.reply_to),
    scheduled_at: nil(p.scheduled_at),
    edited_at: nil(p.edited_at),
    deleted_at: nil(p.deleted_at),
    created_at: p.created_at
  }))
);

await upsert(
  'badge_unlocks',
  T.badge_unlocks.map((b) => ({
    id: Number(b.id),
    user_id: Number(b.user_id),
    badge_code: b.badge_code,
    seen: bool(b.seen),
    unlocked_at: b.unlocked_at
  }))
);

await upsert(
  'search_history',
  T.search_history.map((s) => ({
    id: Number(s.id),
    user_id: Number(s.user_id),
    query: s.query,
    created_at: s.created_at
  }))
);

// settings (single row, upsert by PK user_id via update-or-insert)
for (const s of T.settings) {
  const row = {
    user_id: Number(s.user_id),
    theme: s.theme || 'yaju-gold',
    daily_goal: Number(s.daily_goal || 1),
    quiz_best_hard: Number(s.quiz_best_hard || 0)
  };
  const { error } = await sb.from('settings').upsert(row, {
    onConflict: 'user_id'
  });
  if (error) {
    console.log(`NG settings: ${error.message}`);
    ng++;
  } else {
    console.log('OK settings: 1');
  }
}

await upsert(
  'post_stamps',
  T.post_stamps.map((s) => ({
    id: Number(s.id),
    post_id: Number(s.post_id),
    stamp: s.stamp,
    created_at: s.created_at
  }))
);

await upsert(
  'pilgrimage_logs',
  (T.pilgrimage_logs || []).map((l) => ({
    id: Number(l.id),
    user_id: Number(l.user_id),
    spot_id: Number(l.spot_id),
    visited_at: l.visited_at,
    digital_only: bool(l.digital_only ?? 1),
    memo: nil(l.memo),
    photo_path: nil(l.photo_path),
    created_at: l.created_at
  }))
);

await upsert(
  'events',
  (T.events || []).map((e) => ({
    id: Number(e.id),
    user_id: Number(e.user_id),
    title: e.title,
    event_date: e.event_date,
    memo: nil(e.memo),
    created_at: e.created_at
  }))
);

await upsert(
  'notices',
  (T.notices || []).map((n) => ({
    id: Number(n.id),
    title: n.title,
    body: n.body,
    kind: n.kind,
    starts_at: n.starts_at,
    ends_at: nil(n.ends_at),
    created_at: n.created_at
  }))
);

// Emit sequence fix-up SQL (PostgREST cannot run setval).
const seqTables = [
  'users',
  'posts',
  'pilgrimage_spots',
  'pilgrimage_logs',
  'anniversaries',
  'events',
  'quotes',
  'badges',
  'badge_unlocks',
  'search_history',
  'post_stamps',
  'notices'
];
const sql = seqTables
  .map(
    (t) =>
      `SELECT setval(pg_get_serial_sequence('${t}', 'id'), COALESCE((SELECT MAX(id) FROM ${t}), 1));`
  )
  .join('\n');
writeFileSync(new URL('./migration-setval.sql', import.meta.url), sql + '\n');
console.log('wrote scripts/migration-setval.sql (run in SQL Editor)');

process.exit(ng ? 1 : 0);
