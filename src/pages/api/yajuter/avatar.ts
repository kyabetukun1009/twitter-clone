import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { requireGate } from '@lib/api-auth';
import type { NextApiRequest, NextApiResponse } from 'next';

// GET /api/yajuter/avatar — owner avatar (user-supplied art, gate-kept).
export default function handler(
  req: NextApiRequest,
  res: NextApiResponse
): void {
  if (!requireGate(req, res)) return;
  if (req.method !== 'GET') {
    res.status(405).json({ ok: false });
    return;
  }

  const file = join(process.cwd(), 'public', 'images', 'avatar.png');
  res.setHeader('Content-Type', 'image/png');
  res.setHeader('Cache-Control', 'private, max-age=300');
  res.status(200).send(readFileSync(file));
}
