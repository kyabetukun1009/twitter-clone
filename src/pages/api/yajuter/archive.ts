import { requireGate } from '@lib/api-auth';
import { getServiceClient, OWNER_USER_ID } from '@lib/supabase/server';
import { withExtras, jstParts } from '@lib/supabase/queries';
import type { NextApiRequest, NextApiResponse } from 'next';

// GET /api/yajuter/archive?y= — yearly chronicle (mirrors PHP archive.php).
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
  const { data: posts } = await sb
    .from('posts')
    .select('*')
    .eq('user_id', OWNER_USER_ID)
    .is('deleted_at', null)
    .order('id');

  const rows = posts ?? [];
  const years = new Set<number>();
  for (const p of rows) {
    years.add(Number(jstParts(new Date(p.created_at)).ym.slice(0, 4)));
  }
  const yearList = Array.from(years).sort((a, b) => a - b);
  const nowYear = new Date().getFullYear();
  if (!yearList.includes(nowYear)) {
    yearList.push(nowYear);
  }
  yearList.sort((a, b) => a - b);

  let year = Number(req.query.y) || nowYear;
  year = Math.max(yearList[0], Math.min(yearList[yearList.length - 1], year));

  const inYear = rows.filter(
    (p) => Number(jstParts(new Date(p.created_at)).ym.slice(0, 4)) === year
  );
  const months: { m: number; count: number; avg: number | null }[] = [];
  for (let m = 1; m <= 12; m++) {
    const list = inYear.filter(
      (p) => Number(jstParts(new Date(p.created_at)).ym.slice(5, 7)) === m
    );
    const chars = list.reduce(
      (sum, p) => sum + Array.from(p.content).length,
      0
    );
    months.push({
      m,
      count: list.length,
      avg: list.length ? Math.round(chars / list.length) : null
    });
  }

  const best3 = await withExtras(
    sb,
    [...inYear]
      .sort((a, b) => b.like_count - a.like_count || b.id - a.id)
      .slice(0, 3)
  );

  const { data: anniversaries } = await sb
    .from('anniversaries')
    .select('*')
    .order('month')
    .order('day');

  res.status(200).json({
    ok: true,
    years: yearList,
    year,
    total: inYear.length,
    months,
    best3,
    anniversaries: anniversaries ?? []
  });
}
