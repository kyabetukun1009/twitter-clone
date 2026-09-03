import { requireGate } from '@lib/api-auth';
import { getServiceClient } from '@lib/supabase/server';
import type { NextApiRequest, NextApiResponse } from 'next';

// GET /api/yajuter/quote — random quote of the day for the aside widget.
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<void> {
  if (!requireGate(req, res)) return;
  if (req.method !== 'GET') {
    res.status(405).json({ ok: false });
    return;
  }

  const sb = getServiceClient();
  const { count } = await sb
    .from('quotes')
    .select('*', { count: 'exact', head: true });

  if (!count) {
    res.status(200).json({ ok: true, quote: null });
    return;
  }

  const offset = Math.floor(Math.random() * count);
  const { data, error } = await sb
    .from('quotes')
    .select('*')
    .range(offset, offset);

  if (error) {
    res.status(500).json({ ok: false, error: error.message });
    return;
  }

  const rows = data ?? [];
  res.status(200).json({ ok: true, quote: rows[0] ?? null });
}
