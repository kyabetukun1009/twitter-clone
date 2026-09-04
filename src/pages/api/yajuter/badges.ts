import { requireGate } from '@lib/api-auth';
import { getServiceClient } from '@lib/supabase/server';
import { computeStats, refreshBadges } from '@lib/supabase/queries';
import type { NextApiRequest, NextApiResponse } from 'next';

const RARITY_ORDER = ['legend', 'epic', 'rare', 'normal'];

// GET: all badges + unlock state + progress (marks seen, like PHP).
// POST: run the unlock engine, return newly unlocked.
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<void> {
  if (!requireGate(req, res)) return;

  const sb = getServiceClient();

  if (req.method === 'POST') {
    const fresh = await refreshBadges(sb).catch(() => []);
    res.status(200).json({ ok: true, fresh });
    return;
  }

  if (req.method !== 'GET') {
    res.status(405).json({ ok: false });
    return;
  }

  const [{ data: badges }, { data: unlocks }] = await Promise.all([
    sb.from('badges').select('*'),
    sb.from('badge_unlocks').select('*').eq('user_id', 1)
  ]);

  const unlockByCode = new Map((unlocks ?? []).map((u) => [u.badge_code, u]));
  const stats = await computeStats(sb);

  await sb
    .from('badge_unlocks')
    .update({ seen: true })
    .eq('user_id', 1)
    .eq('seen', false);

  const order = new Map(RARITY_ORDER.map((r, i) => [r, i]));
  const sorted = [...(badges ?? [])].sort(
    (a, b) =>
      (order.get(a.rarity ?? 'normal') ?? 3) -
        (order.get(b.rarity ?? 'normal') ?? 3) || a.id - b.id
  );

  res.status(200).json({
    ok: true,
    stats,
    badges: sorted.map((b) => ({
      ...b,
      unlocked: unlockByCode.get(b.code) ?? null
    }))
  });
}
