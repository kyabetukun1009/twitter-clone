import { requireGate } from '@lib/api-auth';
import { getServiceClient, OWNER_USER_ID } from '@lib/supabase/server';
import type { NextApiRequest, NextApiResponse } from 'next';

// POST /api/yajuter/pin — toggle single pin (mirrors PHP pin.php).
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
  const { data: post } = await sb
    .from('posts')
    .select('id, pinned')
    .eq('id', post_id)
    .eq('user_id', OWNER_USER_ID)
    .is('deleted_at', null)
    .single();
  if (!post) {
    res.status(404).json({ ok: false });
    return;
  }

  const next = !post.pinned;
  await sb.from('posts').update({ pinned: false }).eq('user_id', OWNER_USER_ID);
  if (next) {
    await sb.from('posts').update({ pinned: true }).eq('id', post_id);
  }

  res.status(200).json({ ok: true, post_id, pinned: next });
}
