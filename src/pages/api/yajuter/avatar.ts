import { requireGate } from '@lib/api-auth';
import { getServiceClient, OWNER_USER_ID } from '@lib/supabase/server';
import type { NextApiRequest, NextApiResponse } from 'next';

// GET /api/yajuter/avatar — owner emoji avatar as SVG (keeps <img> usage working).
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
  const { data } = await sb
    .from('users')
    .select('avatar_emoji')
    .eq('id', OWNER_USER_ID)
    .single();

  const emoji = (data?.avatar_emoji as string) || '野';
  const svg =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">' +
    '<rect width="100" height="100" rx="50" fill="#f5a623"/>' +
    `<text x="50" y="68" font-size="52" text-anchor="middle" fill="#000">${emoji}</text>` +
    '</svg>';

  res.setHeader('Content-Type', 'image/svg+xml');
  res.setHeader('Cache-Control', 'private, max-age=300');
  res.status(200).send(svg);
}
