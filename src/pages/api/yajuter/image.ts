import { requireGate } from '@lib/api-auth';
import { getServiceClient } from '@lib/supabase/server';
import type { NextApiRequest, NextApiResponse } from 'next';

// GET /api/yajuter/image?path=<storage path> — private bucket proxy.
// The gate + RLS-deny design means browsers can never fetch Storage directly.
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<void> {
  if (!requireGate(req, res)) return;
  if (req.method !== 'GET') {
    res.status(405).json({ ok: false });
    return;
  }

  const path = typeof req.query.path === 'string' ? req.query.path : '';
  if (!path || path.includes('..') || path.startsWith('/')) {
    res.status(400).json({ ok: false });
    return;
  }

  const bucket = path.startsWith('pilgrimage/') ? 'pilgrimage' : 'uploads';
  const key = path.startsWith('pilgrimage/')
    ? path.slice('pilgrimage/'.length)
    : path;

  const sb = getServiceClient();
  const { data, error } = await sb.storage.from(bucket).download(key);

  if (error || !data) {
    res.status(404).json({ ok: false });
    return;
  }

  const buffer = Buffer.from(await data.arrayBuffer());
  res.setHeader('Content-Type', data.type || 'application/octet-stream');
  res.setHeader('Cache-Control', 'private, max-age=86400');
  res.status(200).send(buffer);
}
