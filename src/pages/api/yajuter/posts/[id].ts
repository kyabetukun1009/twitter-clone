import { requireGate } from '@lib/api-auth';
import { getServiceClient, OWNER_USER_ID } from '@lib/supabase/server';
import type { NextApiRequest, NextApiResponse } from 'next';

// DELETE /api/yajuter/posts/[id] — soft delete (mirrors PHP delete.php).
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<void> {
  if (!requireGate(req, res)) return;
  if (req.method !== 'DELETE') {
    res.status(405).json({ ok: false });
    return;
  }

  const id = Number(req.query.id);
  if (!id) {
    res.status(400).json({ ok: false });
    return;
  }

  const sb = getServiceClient();
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
