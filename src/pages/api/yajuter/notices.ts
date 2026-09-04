import { requireGate } from '@lib/api-auth';
import { getServiceClient } from '@lib/supabase/server';
import type { NextApiRequest, NextApiResponse } from 'next';

// GET /api/yajuter/notices — currently active notices.
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<void> {
  if (!requireGate(req, res)) return;
  if (req.method !== 'GET') {
    res.status(405).json({ ok: false });
    return;
  }

  const now = new Date().toISOString();
  const sb = getServiceClient();
  const { data, error } = await sb
    .from('notices')
    .select('*')
    .lte('starts_at', now)
    .or(`ends_at.is.null,ends_at.gte.${now}`)
    .order('starts_at', { ascending: false });

  if (error) {
    res.status(500).json({ ok: false, error: error.message });
    return;
  }

  res.status(200).json({ ok: true, notices: data ?? [] });
}
