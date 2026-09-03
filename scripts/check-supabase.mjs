// Supabase connection check (no secrets printed).
// Usage: node scripts/check-supabase.mjs
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
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const anon = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!url || !anon) {
  console.error('NG: .env.local keys missing');
  process.exit(1);
}

const sb = createClient(url, anon);
const { data, error } = await sb.from('users').select('id').limit(1);

if (error) {
  // '42P01' (undefined_table) or PostgREST 'PGRST205' (table not found)
  // both prove network + key are fine and schema is simply not applied yet.
  if (error.code === '42P01' || error.code === 'PGRST205') {
    console.log('OK: connected, schema not applied yet (expected).');
    process.exit(0);
  }
  console.error(`NG: ${error.code} ${error.message}`);
  process.exit(1);
}

console.log(`OK: connected, users rows visible to anon: ${data.length}`);
