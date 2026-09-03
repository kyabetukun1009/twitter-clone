import { getServiceClient } from '@lib/supabase/server';
import { PAGE_SIZE } from '@lib/supabase/tables';
import type { NextApiRequest, NextApiResponse } from 'next';

// GET /api/yajuter/timeline?before=<id>&limit=<n>
// Mirrors the PHP timeline: pinned first, then newest first,
// excluding soft-deleted and not-yet-published (scheduled) posts.
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<void> {
  if (req.method !== 'GET') {
    res.status(405).json({ ok: false });
    return;
  }

  // Defense in depth: the Middleware gate already ran, but API routes
  // are also callable directly, so re-check the gate cookie here.
  if (
    process.env.YAJUTER_GATE_PASSWORD &&
    req.cookies['yajuter_gate'] !== process.env.YAJUTER_GATE_PASSWORD
  ) {
    res.status(401).json({ ok: false });
    return;
  }

  const limit = Math.max(
    1,
    Math.min(100, Number(req.query.limit) || PAGE_SIZE)
  );
  const before = Number(req.query.before) || null;

  const sb = getServiceClient();
  let query = sb
    .from('posts')
    .select('*')
    .is('deleted_at', null)
    .or(`scheduled_at.is.null,scheduled_at.lte.${new Date().toISOString()}`)
    .order('pinned', { ascending: false })
    .order('id', { ascending: false })
    .limit(limit);

  if (before) query = query.lt('id', before);

  const { data, error } = await query;

  if (error) {
    res.status(500).json({ ok: false, error: error.message });
    return;
  }

  // Reply counts for the returned posts (single extra query).
  const rows = data ?? [];
  const ids = rows.map((p) => p.id);
  const replyCounts: Record<number, number> = {};
  if (ids.length) {
    const { data: replyRows } = await sb
      .from('posts')
      .select('reply_to')
      .in('reply_to', ids)
      .is('deleted_at', null);
    for (const r of replyRows ?? []) {
      if (r.reply_to == null) continue;
      replyCounts[r.reply_to] = (replyCounts[r.reply_to] ?? 0) + 1;
    }
  }

  const posts = rows.map((p) => ({
    ...p,
    reply_count: replyCounts[p.id] ?? 0
  }));

  res.status(200).json({ ok: true, count: posts.length, posts });
}
