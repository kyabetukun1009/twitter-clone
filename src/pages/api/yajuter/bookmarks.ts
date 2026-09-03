import { requireGate } from '@lib/api-auth';
import { getServiceClient, OWNER_USER_ID } from '@lib/supabase/server';
import { withReplyCounts } from '@lib/supabase/queries';
import type { NextApiRequest, NextApiResponse } from 'next';

// GET /api/yajuter/bookmarks — bookmarked posts, newest first.
// DELETE /api/yajuter/bookmarks — clear all bookmarks.
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<void> {
  if (!requireGate(req, res)) return;

  const sb = getServiceClient();

  if (req.method === 'GET') {
    const { data, error } = await sb
      .from('posts')
      .select('*')
      .eq('user_id', OWNER_USER_ID)
      .eq('bookmarked', true)
      .is('deleted_at', null)
      .order('id', { ascending: false });

    if (error) {
      res.status(500).json({ ok: false, error: error.message });
      return;
    }

    const posts = await withReplyCounts(sb, data ?? []);
    res.status(200).json({ ok: true, count: posts.length, posts });
    return;
  }

  if (req.method === 'DELETE') {
    const { data, error } = await sb
      .from('posts')
      .update({ bookmarked: false })
      .eq('user_id', OWNER_USER_ID)
      .eq('bookmarked', true)
      .select('id');

    if (error) {
      res.status(500).json({ ok: false, error: error.message });
      return;
    }

    res.status(200).json({ ok: true, cleared: data?.length ?? 0 });
    return;
  }

  res.status(405).json({ ok: false });
}
