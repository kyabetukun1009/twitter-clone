import { requireGate } from '@lib/api-auth';
import { getServiceClient, OWNER_USER_ID } from '@lib/supabase/server';
import type { NextApiRequest, NextApiResponse } from 'next';

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// GET /api/yajuter/review-svg?y= — shareable SVG card (mirrors PHP review-svg.php).
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<void> {
  if (!requireGate(req, res)) return;
  if (req.method !== 'GET') {
    res.status(405).json({ ok: false });
    return;
  }

  let year = Number(req.query.y) || new Date().getFullYear();
  if (year < 2001 || year > 2100) {
    year = new Date().getFullYear();
  }

  const sb = getServiceClient();
  const { data: posts } = await sb
    .from('posts')
    .select('content, like_count, created_at')
    .eq('user_id', OWNER_USER_ID)
    .is('deleted_at', null);

  const inYear = (posts ?? []).filter(
    (p) => new Date(p.created_at).getFullYear() === year
  );
  const total = inYear.length;
  const maxLikes = inYear.reduce((m, p) => Math.max(m, p.like_count), 0);
  const chars = inYear.reduce(
    (sum, p) => sum + Array.from(p.content).length,
    0
  );
  const best =
    [...inYear]
      .sort((a, b) => b.like_count - a.like_count)[0]
      ?.content.slice(0, 60) ?? '—';

  const svg =
    '<svg xmlns="http://www.w3.org/2000/svg" width="800" height="420" viewBox="0 0 800 420">' +
    '<rect width="800" height="420" rx="24" fill="#0f1419"/>' +
    '<rect x="0" y="0" width="800" height="120" rx="24" fill="#f5a623"/>' +
    `<text x="40" y="70" font-size="52" font-weight="bold" fill="#000">yajuter ${year}</text>` +
    '<text x="40" y="100" font-size="20" fill="#1a1205">年間レビュー — 推しかつ記録</text>' +
    `<text x="40" y="180" font-size="30" fill="#fff">投稿 ${total}件 / ${chars.toLocaleString()}字</text>` +
    `<text x="40" y="225" font-size="30" fill="#f5a623">最多いいゾ ${maxLikes}</text>` +
    `<text x="40" y="280" font-size="20" fill="#aaa">ベスト: ${esc(
      best
    )}</text>` +
    '<text x="40" y="370" font-size="24" font-weight="bold" fill="#f5a623">やったぜ。</text>' +
    '</svg>';

  res.setHeader('Content-Type', 'image/svg+xml');
  res.setHeader('Cache-Control', 'private, max-age=300');
  res.status(200).send(svg);
}
