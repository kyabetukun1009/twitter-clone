import { requireGate } from '@lib/api-auth';
import { getServiceClient, OWNER_USER_ID } from '@lib/supabase/server';
import type { NextApiRequest, NextApiResponse } from 'next';

// GET /api/yajuter/quotes?cat=&q=&sort= — quote dictionary (mirrors PHP quotes.php).
// sort: id | usage | reading. Usage counts come from post contents.
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<void> {
  if (!requireGate(req, res)) return;
  if (req.method !== 'GET') {
    res.status(405).json({ ok: false });
    return;
  }

  const cats = ['all', 'wild', 'imn', 'common', 'number', 'other'] as const;
  const catRaw = typeof req.query.cat === 'string' ? req.query.cat : 'all';
  const cat = (cats as readonly string[]).includes(catRaw) ? catRaw : 'all';
  const q = (typeof req.query.q === 'string' ? req.query.q : '').trim();
  const sortRaw = typeof req.query.sort === 'string' ? req.query.sort : 'id';
  const sort: string = ['id', 'usage', 'reading'].includes(sortRaw)
    ? sortRaw
    : 'id';

  const sb = getServiceClient();
  let query = sb.from('quotes').select('*');
  if (q) {
    const kw = q.replace(/[%_\\]/g, (c) => `\\${c}`);
    query = query.or(
      `text.ilike.%${kw}%,reading.ilike.%${kw}%,meaning.ilike.%${kw}%`
    );
  } else if (cat !== 'all') {
    query = query.eq('category', cat);
  }
  const { data, error } = await query.order('id');

  if (error) {
    res.status(500).json({ ok: false, error: error.message });
    return;
  }

  const quotes = data ?? [];

  // Usage: how many of my posts contain each quote text.
  const { data: postRows } = await sb
    .from('posts')
    .select('content')
    .eq('user_id', OWNER_USER_ID)
    .is('deleted_at', null);
  const contents = (postRows ?? []).map((p) => p.content);
  const usage: Record<number, number> = {};
  for (const quote of quotes) {
    let count = 0;
    for (const content of contents) {
      if (content.includes(quote.text)) {
        count++;
      }
    }
    usage[quote.id] = count;
  }

  const sorted = [...quotes];
  if (sort === 'usage') {
    sorted.sort(
      (a, b) => (usage[b.id] ?? 0) - (usage[a.id] ?? 0) || a.id - b.id
    );
  } else if (sort === 'reading') {
    sorted.sort((a, b) =>
      (a.reading ?? '').localeCompare(b.reading ?? '', 'ja')
    );
  }

  res.status(200).json({ ok: true, cat, q, sort, quotes: sorted, usage });
}
