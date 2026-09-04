import type { PostRow, BadgeRow } from './tables';
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

// JST calendar helpers (the PHP version ran on Asia/Tokyo).
export function jstParts(date: Date): { ymd: string; ym: string; h: number } {
  const jst = new Date(date.getTime() + 9 * 3_600_000);
  const ymd = jst.toISOString().slice(0, 10);
  return { ymd, ym: ymd.slice(0, 7), h: jst.getUTCHours() };
}

export function jstToday(): string {
  return jstParts(new Date()).ymd;
}

export type UserStats = {
  post_count: number;
  total_chars: number;
  like_count_total: number;
  pilgrimage_count: number;
  event_count: number;
  search_count: number;
  yajuday_post: number;
  streak_days: number;
};

// Mirrors PHP user_stats() (single user id = 1).
export async function computeStats(
  sb: ServiceClient
): Promise<UserStats> {
  const [
    { data: posts },
    { count: pilgrimageCount },
    { count: searchCount },
    { count: eventCount }
  ] = await Promise.all([
      sb
        .from('posts')
        .select('content, like_count, created_at')
        .eq('user_id', 1)
        .is('deleted_at', null)
        .is('scheduled_at', null),
      sb
        .from('pilgrimage_logs')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', 1),
      sb
        .from('search_history')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', 1),
      sb
        .from('events')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', 1)
    ]);

  const rows = posts ?? [];
  let total_chars = 0;
  let like_count_total = 0;
  let yajuday_post = 0;
  const daySet = new Set<string>();
  for (const p of rows) {
    total_chars += Array.from(p.content).length;
    like_count_total += p.like_count ?? 0;
    const { ymd } = jstParts(new Date(p.created_at));
    daySet.add(ymd);
    if (ymd.slice(5) === '08-10') {
      yajuday_post++;
    }
  }

  // Streak ending today-or-yesterday (JST), like PHP get_streak().
  let streak_days = 0;
  const cursor = new Date(`${jstToday()}T00:00:00Z`);
  if (!daySet.has(jstParts(cursor).ymd)) {
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  while (daySet.has(jstParts(cursor).ymd)) {
    streak_days++;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }

  return {
    post_count: rows.length,
    total_chars,
    like_count_total,
    pilgrimage_count: pilgrimageCount ?? 0,
    event_count: eventCount ?? 0,
    search_count: searchCount ?? 0,
    yajuday_post,
    streak_days
  };
}

// Mirrors PHP check_badges(): unlock newly earned badges, return them.
export async function refreshBadges(
  sb: ServiceClient
): Promise<BadgeRow[]> {
  const stats = await computeStats(sb);
  const [{ data: defs }, { data: owned }] = await Promise.all([
    sb.from('badges').select('*'),
    sb.from('badge_unlocks').select('badge_code').eq('user_id', 1)
  ]);
  const ownedSet = new Set((owned ?? []).map((o) => o.badge_code));
  const fresh: BadgeRow[] = [];
  for (const badge of defs ?? []) {
    if (ownedSet.has(badge.code)) continue;
    const value = stats[badge.metric as keyof UserStats] ?? 0;
    if (value >= badge.threshold) {
      const { error } = await sb
        .from('badge_unlocks')
        .insert({ user_id: 1, badge_code: badge.code, seen: false });
      if (!error) {
        fresh.push(badge);
      }
    }
  }
  return fresh;
}
