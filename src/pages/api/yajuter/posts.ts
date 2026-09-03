import { requireGate } from '@lib/api-auth';
import { getServiceClient, OWNER_USER_ID } from '@lib/supabase/server';
import { EMOTION_TAGS, MAX_POST_LEN } from '@lib/supabase/tables';
import type { Database } from '@lib/supabase/database';
import type { NextApiRequest, NextApiResponse } from 'next';

type PostInsert = Database['public']['Tables']['posts']['Insert'];

// POST /api/yajuter/posts — create a post (mirrors PHP index.php composer).
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<void> {
  if (!requireGate(req, res)) return;
  if (req.method !== 'POST') {
    res.status(405).json({ ok: false });
    return;
  }

  const body = req.body as {
    content?: unknown;
    emotion_tag?: unknown;
    reply_to?: unknown;
  };
  const rawContent = typeof body.content === 'string' ? body.content : '';
  const rawTag = typeof body.emotion_tag === 'string' ? body.emotion_tag : '';
  const rawReplyTo = typeof body.reply_to === 'number' ? body.reply_to : null;

  const text = rawContent.trim();
  if (!text || Array.from(text).length > MAX_POST_LEN) {
    res.status(400).json({ ok: false, error: 'これもうわかんねぇな' });
    return;
  }
  // Emotion tags are stored with parens like PHP ('(迫真)'), but the API
  // also accepts the bare form ('迫真').
  const bareTag = rawTag.replace(/^[（(]/, '').replace(/[）)]$/, '');
  const tagWithParens = bareTag ? `(${bareTag})` : null;
  if (bareTag && !(EMOTION_TAGS as readonly string[]).includes(bareTag)) {
    res.status(400).json({ ok: false, error: 'これもうわかんねぇな' });
    return;
  }

  const sb = getServiceClient();
  const newPost: PostInsert = {
    user_id: OWNER_USER_ID,
    content: text,
    emotion_tag: tagWithParens,
    reply_to: rawReplyTo ?? null
  };
  const { data, error } = await sb
    .from('posts')
    .insert(newPost)
    .select('*')
    .single();

  if (error) {
    res.status(500).json({ ok: false, error: error.message });
    return;
  }

  res.status(200).json({ ok: true, post: data });
}
