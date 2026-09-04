import { requireGate } from '@lib/api-auth';
import { getServiceClient, OWNER_USER_ID } from '@lib/supabase/server';
import {
  computeStats,
  withExtras,
  jstParts,
  jstToday
} from '@lib/supabase/queries';
import type { NextApiRequest, NextApiResponse } from 'next';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// GET /api/yajuter/stats?from=&to= — dashboard numbers (mirrors PHP stats.php).
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<void> {
  if (!requireGate(req, res)) return;
  if (req.method !== 'GET') {
    res.status(405).json({ ok: false });
    return;
  }

  const today = jstToday();
  const from =
    typeof req.query.from === 'string' &&
    DATE_RE.test(req.query.from) &&
    req.query.from <= today
      ? req.query.from
      : null;
  const to =
    typeof req.query.to === 'string' &&
    DATE_RE.test(req.query.to) &&
    req.query.to >= '2000-01-01'
      ? req.query.to
      : null;

  const sb = getServiceClient();
  const { data: posts } = await sb
    .from('posts')
    .select('*')
    .eq('user_id', OWNER_USER_ID)
    .is('deleted_at', null)
    .is('scheduled_at', null)
    .order('id', { ascending: false });
  const rows = posts ?? [];

  const inPeriod = (created_at: string): boolean => {
    const { ymd } = jstParts(new Date(created_at));
    if (from && ymd < from) return false;
    if (to && ymd > to) return false;
    return true;
  };
  const scoped = from || to ? rows.filter((p) => inPeriod(p.created_at)) : rows;

  // Monthly (last 12) from full history.
  const byMonth = new Map<string, number>();
  for (const p of rows) {
    const { ym } = jstParts(new Date(p.created_at));
    byMonth.set(ym, (byMonth.get(ym) ?? 0) + 1);
  }
  const monthly = Array.from(byMonth.entries())
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .slice(0, 12)
    .reverse()
    .map(([ym, count]) => ({ ym, count }));

  // Hourly (JST) + tags + best, scoped.
  const hourly = new Array<number>(24).fill(0);
  const tagMap = new Map<string, number>();
  let periodChars = 0;
  for (const p of scoped) {
    const { h } = jstParts(new Date(p.created_at));
    hourly[h]++;
    periodChars += Array.from(p.content).length;
    if (p.emotion_tag) {
      tagMap.set(p.emotion_tag, (tagMap.get(p.emotion_tag) ?? 0) + 1);
    }
  }
  const best = await withExtras(
    sb,
    [...scoped]
      .filter((p) => p.like_count > 0)
      .sort((a, b) => b.like_count - a.like_count || b.id - a.id)
      .slice(0, 3)
  );
  const tags = Array.from(tagMap.entries())
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count);

  // Stamps across visible posts.
  const visibleIds = new Set(rows.map((p) => p.id));
  const { data: stampRows } = await sb
    .from('post_stamps')
    .select('post_id, stamp');
  const stampMap = new Map<string, number>();
  for (const s of stampRows ?? []) {
    if (!visibleIds.has(s.post_id)) continue;
    stampMap.set(s.stamp, (stampMap.get(s.stamp) ?? 0) + 1);
  }
  const stamps = Array.from(stampMap.entries())
    .map(([stamp, count]) => ({ stamp, count }))
    .sort((a, b) => b.count - a.count);

  const firstPost = rows.length
    ? rows[rows.length - 1].created_at.slice(0, 10)
    : null;
  const totals = await computeStats(sb);

  res.status(200).json({
    ok: true,
    from,
    to,
    totals,
    period: { posts: scoped.length, chars: periodChars },
    firstPost,
    monthly,
    hourly,
    best,
    tags,
    stamps
  });
}
