import { requireGate } from '@lib/api-auth';
import { getServiceClient, OWNER_USER_ID } from '@lib/supabase/server';
import { withExtras, jstParts } from '@lib/supabase/queries';
import type { NextApiRequest, NextApiResponse } from 'next';

const DICT = [
  'やったぜ',
  'いいゾ',
  '微レ存',
  'ファッ!?',
  '草',
  '114514',
  '810',
  'やりますねぇ',
  '迫真',
  'まずい'
];

// GET /api/yajuter/review?y= — yearly review numbers (mirrors PHP review.php).
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<void> {
  if (!requireGate(req, res)) return;
  if (req.method !== 'GET') {
    res.status(405).json({ ok: false });
    return;
  }

  let year = Number(req.query.y) || new Date().getFullYear();
  if (year < 2001 || year > 2100) {
    year = new Date().getFullYear();
  }

  const sb = getServiceClient();
  const { data: posts } = await sb
    .from('posts')
    .select('*')
    .eq('user_id', OWNER_USER_ID)
    .is('deleted_at', null);

  const inYear = (posts ?? []).filter(
    (p) => Number(jstParts(new Date(p.created_at)).ym.slice(0, 4)) === year
  );

  const monthMap = new Array<number>(12).fill(0);
  for (const p of inYear) {
    monthMap[Number(jstParts(new Date(p.created_at)).ym.slice(5, 7)) - 1]++;
  }

  const [best] = await withExtras(
    sb,
    [...inYear]
      .filter((p) => p.like_count > 0)
      .sort((a, b) => b.like_count - a.like_count || b.id - a.id)
      .slice(0, 1)
  );

  const freq: Record<string, number> = {};
  for (const word of DICT) {
    let count = 0;
    for (const p of inYear) {
      count += p.content.split(word).length - 1;
    }
    if (count > 0) {
      freq[word] = count;
    }
  }
  const topWords = Object.entries(freq)
    .map(([word, count]) => ({ word, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  res.status(200).json({
    ok: true,
    year,
    total: inYear.length,
    maxLikes: best?.like_count ?? 0,
    best: best ?? null,
    monthly: monthMap,
    topWords
  });
}
