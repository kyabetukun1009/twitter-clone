import { requireGate } from '@lib/api-auth';
import { getServiceClient, OWNER_USER_ID } from '@lib/supabase/server';
import { fetchThread, withReplyCounts } from '@lib/supabase/queries';
import { EMOTION_TAGS, MAX_POST_LEN } from '@lib/supabase/tables';
import type { NextApiRequest, NextApiResponse } from 'next';

// GET /api/yajuter/posts/[id] — thread (post + ancestors + replies).
// PUT /api/yajuter/posts/[id] — edit within 5 min (mirrors PHP edit-post.php).
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

  if (req.method === 'PUT') {
    const body = req.body as { content?: unknown; emotion_tag?: unknown };
    const rawContent = typeof body.content === 'string' ? body.content : '';
    const rawTag = typeof body.emotion_tag === 'string' ? body.emotion_tag : '';
    const text = rawContent.trim();
    if (!text || Array.from(text).length > MAX_POST_LEN) {
      res.status(400).json({ ok: false });
      return;
    }
    const bareTag = rawTag.replace(/^[（(]/, '').replace(/[）)]$/, '');
    if (bareTag && !(EMOTION_TAGS as readonly string[]).includes(bareTag)) {
      res.status(400).json({ ok: false });
      return;
    }

    const { data: target } = await sb
      .from('posts')
      .select('id, created_at')
      .eq('id', id)
      .eq('user_id', OWNER_USER_ID)
      .is('deleted_at', null)
      .single();
    if (!target) {
      res.status(404).json({ ok: false });
      return;
    }
    const ageSec = (Date.now() - new Date(target.created_at).getTime()) / 1000;
    if (ageSec > 300) {
      res
        .status(400)
        .json({
          ok: false,
          error: 'これもうわかんねぇな（編集は投稿から5分以内です）'
        });
      return;
    }

    const { data, error } = await sb
      .from('posts')
      .update({
        content: text,
        emotion_tag: bareTag ? `(${bareTag})` : null,
        edited_at: new Date().toISOString()
      })
      .eq('id', id)
      .select('*')
      .single();
    if (error) {
      res.status(500).json({ ok: false, error: error.message });
      return;
    }
    const [post] = await withReplyCounts(sb, data ? [data] : []);
    res.status(200).json({ ok: true, post });
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
