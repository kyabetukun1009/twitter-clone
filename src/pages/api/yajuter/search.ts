import { requireGate } from '@lib/api-auth';
import { getServiceClient, OWNER_USER_ID } from '@lib/supabase/server';
import { withReplyCounts } from '@lib/supabase/queries';
import type { NextApiRequest, NextApiResponse } from 'next';

// GET /api/yajuter/search?q= — LIKE search (mirrors PHP search.php).
// Records the query in search_history (badge metric).
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<void> {
  if (!requireGate(req, res)) return;
  if (req.method !== 'GET') {
    res.status(405).json({ ok: false });
    return;
  }

  const sb = getServiceClient();

  const { data: suggestRows } = await sb
    .from('search_history')
    .select('query')
    .eq('user_id', OWNER_USER_ID)
    .order('created_at', { ascending: false })
    .limit(200);
  const seen = new Set<string>();
  const suggests: string[] = [];
  for (const row of suggestRows ?? []) {
    if (!seen.has(row.query)) {
      seen.add(row.query);
      suggests.push(row.query);
    }
    if (suggests.length >= 10) break;
  }

  const q = (typeof req.query.q === 'string' ? req.query.q : '')
    .trim()
    .slice(0, 100);
  if (!q) {
    res.status(200).json({ ok: true, q: '', total: 0, posts: [], suggests });
    return;
  }

  await sb.from('search_history').insert({ user_id: OWNER_USER_ID, query: q });

  // Escape PostgREST LIKE wildcards in the keyword.
  const kw = q.replace(/[%_\\]/g, (c) => `\\${c}`);
  const { data, error } = await sb
    .from('posts')
    .select('*')
    .eq('user_id', OWNER_USER_ID)
    .is('deleted_at', null)
    .ilike('content', `%${kw}%`)
    .order('id', { ascending: false })
    .limit(100);

  if (error) {
    res.status(500).json({ ok: false, error: error.message });
    return;
  }

  const posts = await withReplyCounts(sb, data ?? []);
  res.status(200).json({ ok: true, q, total: posts.length, posts, suggests });
}
