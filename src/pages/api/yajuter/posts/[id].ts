import { requireGate } from '@lib/api-auth';
import { getServiceClient, OWNER_USER_ID } from '@lib/supabase/server';
import { fetchThread, withReplyCounts } from '@lib/supabase/queries';
import type { NextApiRequest, NextApiResponse } from 'next';

// GET /api/yajuter/posts/[id] — thread (post + ancestors + replies).
// DELETE /api/yajuter/posts/[id] — soft delete (mirrors PHP delete.php).
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<void> {
  if (!requireGate(req, res)) return;

  const id = Number(req.query.id);
  if (!id) {
    res.status(400).json({ ok: false });
    return;
  }

  const sb = getServiceClient();

  if (req.method === 'GET') {
    const thread = await fetchThread(sb, id);
    if (!thread) {
      res.status(404).json({ ok: false });
      return;
    }
    const [post] = await withReplyCounts(sb, [thread.post]);
    const parents = await withReplyCounts(sb, thread.parents);
    const replies = await withReplyCounts(sb, thread.replies);
    res.status(200).json({ ok: true, post, parents, replies });
    return;
  }

  if (req.method !== 'DELETE') {
    res.status(405).json({ ok: false });
    return;
  }
  const { error } = await sb
    .from('posts')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', OWNER_USER_ID)
    .is('deleted_at', null);

  if (error) {
    res.status(500).json({ ok: false, error: error.message });
    return;
  }

  res.status(200).json({ ok: true, id });
}
