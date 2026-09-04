import type { PostRow } from './tables';
import type { getServiceClient } from './server';

type ServiceClient = ReturnType<typeof getServiceClient>;

export type YPostRow = PostRow & {
  reply_count: number;
  stamps: Record<string, number>;
};

// Attach reply counts + stamp counts to a list of posts.
export async function withExtras(
  sb: ServiceClient,
  rows: PostRow[]
): Promise<YPostRow[]> {
  const ids = rows.map((p) => p.id);
  const replyCounts: Record<number, number> = {};
  const stampCounts: Record<number, Record<string, number>> = {};
  if (ids.length) {
    const [{ data: replyRows }, { data: stampRows }] = await Promise.all([
      sb
        .from('posts')
        .select('reply_to')
        .in('reply_to', ids)
        .is('deleted_at', null),
      sb.from('post_stamps').select('post_id, stamp').in('post_id', ids)
    ]);
    for (const r of replyRows ?? []) {
      if (r.reply_to == null) continue;
      replyCounts[r.reply_to] = (replyCounts[r.reply_to] ?? 0) + 1;
    }
    for (const s of stampRows ?? []) {
      const per = (stampCounts[s.post_id] ??= {});
      per[s.stamp] = (per[s.stamp] ?? 0) + 1;
    }
  }
  return rows.map((p) => ({
    ...p,
    reply_count: replyCounts[p.id] ?? 0,
    stamps: stampCounts[p.id] ?? {}
  }));
}

// Back-compat alias (reply counts only use the same shape).
export const withReplyCounts = withExtras;

// A post + its ancestor chain (root first) + its direct replies.
// Returns null when the post is missing, deleted or not yet published.
export async function fetchThread(
  sb: ServiceClient,
  id: number
): Promise<{ post: PostRow; parents: PostRow[]; replies: PostRow[] } | null> {
  const { data: post } = await sb
    .from('posts')
    .select('*')
    .eq('id', id)
    .is('deleted_at', null)
    .single();

  if (!post) return null;
  if (post.scheduled_at && new Date(post.scheduled_at) > new Date())
    return null;

  const parents: PostRow[] = [];
  let cursor = post.reply_to;
  let guard = 0;
  while (cursor && guard++ < 50) {
    const { data: parent } = await sb
      .from('posts')
      .select('*')
      .eq('id', cursor)
      .is('deleted_at', null)
      .single();
    if (!parent) break;
    parents.unshift(parent);
    cursor = parent.reply_to;
  }

  const { data: replyRows } = await sb
    .from('posts')
    .select('*')
    .eq('reply_to', id)
    .is('deleted_at', null)
    .order('id', { ascending: true });

  return { post, parents, replies: replyRows ?? [] };
}

export function isPublished(post: PostRow, now: Date): boolean {
  if (post.deleted_at) return false;
  if (post.scheduled_at && new Date(post.scheduled_at) > now) return false;
  return true;
}
