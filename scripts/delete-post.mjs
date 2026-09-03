// Delete a post by id via service_role. Usage: node scripts/delete-post.mjs <id>
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
const id = Number(process.argv[2]);
const { error } = await sb.from('posts').delete().eq('id', id);
console.log(error ? `NG: ${error.message}` : `OK deleted ${id}`);
