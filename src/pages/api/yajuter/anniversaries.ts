import { requireGate } from '@lib/api-auth';
import { getServiceClient } from '@lib/supabase/server';
import type { NextApiRequest, NextApiResponse } from 'next';

// GET /api/yajuter/anniversaries — ordered list for the aside countdown.
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
  const { data, error } = await sb
    .from('anniversaries')
    .select('*')
    .order('month')
    .order('day');

  if (error) {
    res.status(500).json({ ok: false, error: error.message });
    return;
  }

  res.status(200).json({ ok: true, anniversaries: data });
}
