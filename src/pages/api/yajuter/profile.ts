import { requireGate } from '@lib/api-auth';
import { getServiceClient, OWNER_USER_ID } from '@lib/supabase/server';
import { withReplyCounts } from '@lib/supabase/queries';
import type { NextApiRequest, NextApiResponse } from 'next';

// GET /api/yajuter/profile?tab=posts|media|liked
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<void> {
  if (!requireGate(req, res)) return;
  if (req.method !== 'GET') {
    res.status(405).json({ ok: false });
    return;
  }

  const tab =
    req.query.tab === 'media' || req.query.tab === 'liked'
      ? req.query.tab
      : 'posts';

  const sb = getServiceClient();
  let query = sb
    .from('posts')
    .select('*')
    .eq('user_id', OWNER_USER_ID)
    .is('deleted_at', null);

  if (tab === 'media') query = query.not('image_path', 'is', null);
  if (tab === 'liked') query = query.gt('like_count', 0);

  const { data, error } = await (tab === 'liked'
    ? query.order('like_count', { ascending: false }).order('id', {
        ascending: false
      })
    : query.order('id', { ascending: false }));

  if (error) {
    res.status(500).json({ ok: false, error: error.message });
    return;
  }

  const posts = await withReplyCounts(sb, data ?? []);

  const [{ count: totalTweets }, { count: totalPhotos }] = await Promise.all([
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

  res.status(200).json({
    ok: true,
    tab,
    posts,
    stats: {
      totalTweets: totalTweets ?? 0,
      totalPhotos: totalPhotos ?? 0
    }
  });
}
