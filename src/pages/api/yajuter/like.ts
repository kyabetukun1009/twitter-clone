import { requireGate } from '@lib/api-auth';
import { getServiceClient, OWNER_USER_ID } from '@lib/supabase/server';
import { refreshBadges } from '@lib/supabase/queries';
import type { NextApiRequest, NextApiResponse } from 'next';

// POST /api/yajuter/like — いいゾ (mirrors PHP like.php: +1 per tap).
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<void> {
  if (!requireGate(req, res)) return;
  if (req.method !== 'POST') {
    res.status(405).json({ ok: false });
    return;
  }

  const body = req.body as { post_id?: unknown };
  const post_id = typeof body.post_id === 'number' ? body.post_id : 0;
  if (!post_id) {
    res.status(400).json({ ok: false });
    return;
  }

  const sb = getServiceClient();
  const { data: post, error: getError } = await sb
    .from('posts')
    .select('id, like_count')
    .eq('id', post_id)
    .eq('user_id', OWNER_USER_ID)
    .is('deleted_at', null)
    .single();

  if (getError || !post) {
    res.status(404).json({ ok: false });
    return;
  }

  const { data, error } = await sb
    .from('posts')
    .update({ like_count: (post.like_count ?? 0) + 1 })
    .eq('id', post_id)
    .select('id, like_count')
    .single();

  if (error) {
    res.status(500).json({ ok: false, error: error.message });
    return;
  }

  refreshBadges(sb).catch(() => undefined);

  res.status(200).json({ ok: true, post: data });
}
