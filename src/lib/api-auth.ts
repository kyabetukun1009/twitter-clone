import type { NextApiRequest, NextApiResponse } from 'next';

// Every /api/yajuter/* route (except the gate itself) must call this first.
// The Middleware gate protects pages; this protects direct API access.
export function requireGate(
  req: NextApiRequest,
  res: NextApiResponse
): boolean {
  if (
    process.env.YAJUTER_GATE_PASSWORD &&
    req.cookies['yajuter_gate'] === process.env.YAJUTER_GATE_PASSWORD
  )
    return true;

  res.status(401).json({ ok: false });
  return false;
}
