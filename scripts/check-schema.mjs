// Schema + seed verification via service_role (server-side only).
// Usage: node scripts/check-schema.mjs
import { readFileSync } from 'node:fs';
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

const EXPECT = {
  users: 1,
  posts: 0, // filled by migration later
  pilgrimage_spots: 3,
  pilgrimage_logs: 0,
  anniversaries: 5,
  events: 0,
  quotes: 55,
  badges: 15,
  badge_unlocks: 0,
  search_history: 0,
  settings: 1,
  post_stamps: 0,
  notices: 0
};

let ng = 0;
for (const [table, want] of Object.entries(EXPECT)) {
  const { count, error } = await sb
    .from(table)
    .select('*', { count: 'exact', head: true });
  if (error) {
    console.log(`NG ${table}: ${error.code} ${error.message}`);
    ng++;
  } else if (count !== want) {
    console.log(`WARN ${table}: got ${count}, want ${want}`);
  } else {
    console.log(`OK ${table}: ${count}`);
  }
}
process.exit(ng ? 1 : 0);
