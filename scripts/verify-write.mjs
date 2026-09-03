// Write-path check: insert a probe post (ID should continue the 1145xx
// sequence), read it back, then delete it.
// Usage: node scripts/verify-write.mjs
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

const { data: ins, error: e1 } = await sb
  .from('posts')
  .insert({
    user_id: 1,
    content: '疎通テスト…やったぜ。（この投稿は自動削除されます）'
  })
  .select('id')
  .single();
if (e1) {
  console.log(`NG insert: ${e1.message}`);
  process.exit(1);
}
console.log(`OK insert: id=${ins.id} (want 114596)`);

const { error: e2 } = await sb.from('posts').delete().eq('id', ins.id);
if (e2) {
  console.log(`NG delete: ${e2.message}`);
  process.exit(1);
}
console.log('OK delete: probe removed');
