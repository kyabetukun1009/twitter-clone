import { requireGate } from '@lib/api-auth';
import { getServiceClient } from '@lib/supabase/server';
import { STAMPS } from '@lib/supabase/tables';
import type { NextApiRequest, NextApiResponse } from 'next';

// POST /api/yajuter/stamp — toggle a stamp (mirrors PHP stamp.php).
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<void> {
  if (!requireGate(req, res)) return;
  if (req.method !== 'POST') {
    res.status(405).json({ ok: false });
    return;
  }

  const body = req.body as { post_id?: unknown; stamp?: unknown };
  const post_id = typeof body.post_id === 'number' ? body.post_id : 0;
  const stamp = typeof body.stamp === 'string' ? body.stamp : '';
  if (!post_id || !(STAMPS as readonly string[]).includes(stamp)) {
    res.status(400).json({ ok: false });
    return;
  }

  const sb = getServiceClient();
  const { data: post } = await sb
    .from('posts')
    .select('id')
    .eq('id', post_id)
    .is('deleted_at', null)
    .single();
  if (!post) {
    res.status(404).json({ ok: false });
    return;
  }

  const { data: existing } = await sb
    .from('post_stamps')
    .select('id')
    .eq('post_id', post_id)
    .eq('stamp', stamp)
    .maybeSingle();

  if (existing) {
    await sb.from('post_stamps').delete().eq('id', existing.id);
  } else {
    await sb.from('post_stamps').insert({ post_id, stamp });
  }

  const { data: rows } = await sb
    .from('post_stamps')
    .select('stamp')
    .eq('post_id', post_id);
  const stamps: Record<string, number> = {};
  for (const row of rows ?? []) {
    stamps[row.stamp] = (stamps[row.stamp] ?? 0) + 1;
  }

  res.status(200).json({ ok: true, post_id, stamps });
}
