import { requireGate } from '@lib/api-auth';
import { getServiceClient, OWNER_USER_ID } from '@lib/supabase/server';
import type { NextApiRequest, NextApiResponse } from 'next';

// GET: spots + logs + counts + monthly summary.
// POST: add a log {spot_id, visited_at, digital_only, memo?, photo_path?}.
// PATCH: edit memo {id, memo}. DELETE: remove a log {id}.
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<void> {
  if (!requireGate(req, res)) return;

  const sb = getServiceClient();

  if (req.method === 'GET') {
    const [{ data: spotRows }, { data: logRows }, { count: logCount }] =
      await Promise.all([
        sb
          .from('pilgrimage_spots')
          .select('*')
          .eq('is_public', true)
          .order('id'),
        sb
          .from('pilgrimage_logs')
          .select('*')
          .eq('user_id', OWNER_USER_ID)
          .order('visited_at', { ascending: false })
          .order('id', { ascending: false })
          .limit(200),
        sb
          .from('pilgrimage_logs')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', OWNER_USER_ID)
      ]);

    const spots = spotRows ?? [];
    const nameById = new Map(spots.map((s) => [s.id, s.name] as const));
    const logs = (logRows ?? []).map((log) => ({
      ...log,
      spot: { name: nameById.get(log.spot_id) ?? `聖地#${log.spot_id}` }
    }));

    const monthly: Record<string, { count: number; digital: number }> = {};
    for (const log of logs ?? []) {
      const ym = log.visited_at.slice(0, 7);
      const entry = (monthly[ym] ??= { count: 0, digital: 0 });
      entry.count++;
      if (log.digital_only) entry.digital++;
    }

    res.status(200).json({
      ok: true,
      spots,
      logs,
      logCount: logCount ?? 0,
      monthly
    });
    return;
  }

  if (req.method === 'POST') {
    const body = req.body as {
      spot_id?: unknown;
      visited_at?: unknown;
      digital_only?: unknown;
      memo?: unknown;
      photo_path?: unknown;
    };
    const spot_id = typeof body.spot_id === 'number' ? body.spot_id : 0;
    const visited_at =
      typeof body.visited_at === 'string' ? body.visited_at : '';
    const digital_only = body.digital_only !== false;
    const memo =
      typeof body.memo === 'string' && body.memo.trim()
        ? body.memo.trim().slice(0, 810)
        : null;
    const photo_path =
      typeof body.photo_path === 'string' &&
      body.photo_path &&
      !body.photo_path.includes('..')
        ? body.photo_path
        : null;

    const { data: spot } = await sb
      .from('pilgrimage_spots')
      .select('id')
      .eq('id', spot_id)
      .single();
    if (!spot || !/^\d{4}-\d{2}-\d{2}$/.test(visited_at)) {
      res.status(400).json({ ok: false });
      return;
    }

    const { data, error } = await sb
      .from('pilgrimage_logs')
      .insert({
        user_id: OWNER_USER_ID,
        spot_id,
        visited_at,
        digital_only,
        memo,
        photo_path: photo_path ? `pilgrimage/${photo_path}` : null
      })
      .select('*')
      .single();
    if (error) {
      res.status(500).json({ ok: false, error: error.message });
      return;
    }
    res.status(200).json({ ok: true, log: data });
    return;
  }

  if (req.method === 'PATCH') {
    const body = req.body as { id?: unknown; memo?: unknown };
    const id = typeof body.id === 'number' ? body.id : 0;
    const memo =
      typeof body.memo === 'string' && body.memo.trim()
        ? body.memo.trim().slice(0, 810)
        : null;
    if (!id) {
      res.status(400).json({ ok: false });
      return;
    }
    const { error } = await sb
      .from('pilgrimage_logs')
      .update({ memo })
      .eq('id', id)
      .eq('user_id', OWNER_USER_ID);
    if (error) {
      res.status(500).json({ ok: false, error: error.message });
      return;
    }
    res.status(200).json({ ok: true, id });
    return;
  }

  if (req.method === 'DELETE') {
    const body = (req.body ?? {}) as { id?: unknown };
    const id = typeof body.id === 'number' ? body.id : 0;
    if (!id) {
      res.status(400).json({ ok: false });
      return;
    }
    const { data: log } = await sb
      .from('pilgrimage_logs')
      .select('photo_path')
      .eq('id', id)
      .eq('user_id', OWNER_USER_ID)
      .single();
    if (log?.photo_path?.startsWith('pilgrimage/')) {
      await sb.storage
        .from('pilgrimage')
        .remove([log.photo_path.slice('pilgrimage/'.length)]);
    }
    await sb
      .from('pilgrimage_logs')
      .delete()
      .eq('id', id)
      .eq('user_id', OWNER_USER_ID);
    res.status(200).json({ ok: true, id });
    return;
  }

  res.status(405).json({ ok: false });
}
