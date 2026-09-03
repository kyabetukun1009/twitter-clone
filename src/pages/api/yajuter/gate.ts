import type { NextApiRequest, NextApiResponse } from 'next';

const GATE_COOKIE = 'yajuter_gate';

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse
): void {
  if (req.method === 'DELETE') {
    res.setHeader(
      'Set-Cookie',
      'yajuter_gate=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0'
    );
    res.status(200).json({ ok: true });
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ ok: false });
    return;
  }

  const expected = process.env.YAJUTER_GATE_PASSWORD;
  const { password } = req.body as { password?: string };

  if (!expected || password !== expected) {
    res.status(401).json({ ok: false });
    return;
  }

  const parts = [
    `${GATE_COOKIE}=${encodeURIComponent(expected)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Strict',
    `Max-Age=${60 * 60 * 24 * 30}`
  ];
  if (process.env.NODE_ENV === 'production') parts.push('Secure');
  res.setHeader('Set-Cookie', parts.join('; '));
  res.status(200).json({ ok: true });
}
