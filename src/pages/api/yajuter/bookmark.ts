import { requireGate } from '@lib/api-auth';
import { getServiceClient, OWNER_USER_ID } from '@lib/supabase/server';
import type { NextApiRequest, NextApiResponse } from 'next';

// POST /api/yajuter/bookmark — toggle お気に入り (mirrors PHP bookmark.php).
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
    .select('id, bookmarked')
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
    .update({ bookmarked: !post.bookmarked })
    .eq('id', post_id)
    .select('id, bookmarked')
    .single();

  if (error) {
    res.status(500).json({ ok: false, error: error.message });
    return;
  }

  res.status(200).json({ ok: true, post: data });
}
