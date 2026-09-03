import { requireGate } from '@lib/api-auth';
import { getServiceClient, OWNER_USER_ID } from '@lib/supabase/server';
import type { NextApiRequest, NextApiResponse } from 'next';

// GET /api/yajuter/me — single-owner profile + counters.
// Shape mirrors the fork's User type where the UI needs it.
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
  const { data: user, error } = await sb
    .from('users')
    .select('*')
    .eq('id', OWNER_USER_ID)
    .single();

  if (error || !user) {
    res.status(500).json({ ok: false, error: error?.message });
    return;
  }

  const [tweetsRes, photosRes] = await Promise.all([
    sb
      .from('posts')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', OWNER_USER_ID)
      .is('deleted_at', null),
    sb
      .from('posts')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', OWNER_USER_ID)
      .is('deleted_at', null)
      .not('image_path', 'is', null)
  ]);

  const owner = user;

  res.status(200).json({
    ok: true,
    user: {
      ...owner,
      totalTweets: tweetsRes.count ?? 0,
      totalPhotos: photosRes.count ?? 0
    }
  });
}
