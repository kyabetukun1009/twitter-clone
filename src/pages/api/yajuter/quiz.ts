import { requireGate } from '@lib/api-auth';
import { getServiceClient } from '@lib/supabase/server';
import type { NextApiRequest, NextApiResponse } from 'next';

const MODES = ['normal', 'number', 'wild', 'hard'] as const;
type Mode = (typeof MODES)[number];

function pickMode(raw: unknown): Mode {
  return typeof raw === 'string' && (MODES as readonly string[]).includes(raw)
    ? (raw as Mode)
    : 'normal';
}

// GET /api/yajuter/quiz?mode= — new question (answer included; single-user).
// POST /api/yajuter/quiz {mode, streak} — record result, return bests.
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<void> {
  if (!requireGate(req, res)) return;

  const sb = getServiceClient();

  if (req.method === 'POST') {
    const body = req.body as { mode?: unknown; streak?: unknown };
    const mode = pickMode(body.mode);
    const streak =
      typeof body.streak === 'number' && body.streak >= 0
        ? Math.floor(body.streak)
        : 0;

    const { data: settings } = await sb
      .from('settings')
      .select('*')
      .eq('user_id', 1)
      .single();
    const played = (settings?.quiz_played ?? 0) + 1;
    const patch = {
      quiz_best:
        mode === 'normal'
          ? Math.max(settings?.quiz_best ?? 0, streak)
          : (settings?.quiz_best ?? 0),
      quiz_best_number:
        mode === 'number'
          ? Math.max(settings?.quiz_best_number ?? 0, streak)
          : (settings?.quiz_best_number ?? 0),
      quiz_best_wild:
        mode === 'wild'
          ? Math.max(settings?.quiz_best_wild ?? 0, streak)
          : (settings?.quiz_best_wild ?? 0),
      quiz_best_hard:
        mode === 'hard'
          ? Math.max(settings?.quiz_best_hard ?? 0, streak)
          : (settings?.quiz_best_hard ?? 0),
      quiz_played: played
    };
    await sb.from('settings').update(patch).eq('user_id', 1);
    const best =
      mode === 'number'
        ? patch.quiz_best_number
        : mode === 'wild'
          ? patch.quiz_best_wild
          : mode === 'hard'
            ? patch.quiz_best_hard
            : patch.quiz_best;

    const { data: fresh } = await sb
      .from('settings')
      .select(
        'quiz_best, quiz_best_number, quiz_best_wild, quiz_best_hard, quiz_played'
      )
      .eq('user_id', 1)
      .single();
    res.status(200).json({ ok: true, streak, best, score: fresh });
    return;
  }

  if (req.method !== 'GET') {
    res.status(405).json({ ok: false });
    return;
  }

  const mode = pickMode(req.query.mode);
  const category =
    mode === 'number' ? 'number' : mode === 'wild' ? 'wild' : null;

  const { data: all } = await sb.from('quotes').select('*');
  let pool = (all ?? []).filter((q) => q.meaning);
  if (category) {
    const narrowed = pool.filter((q) => q.category === category);
    if (narrowed.length) {
      pool = narrowed;
    }
  }
  if (!pool.length) {
    res.status(500).json({ ok: false });
    return;
  }

  const choice = pool[Math.floor(Math.random() * pool.length)];
  const others = pool.filter((q) => q.id !== choice.id);
  for (let i = others.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [others[i], others[j]] = [others[j], others[i]];
  }
  const options = [...others.slice(0, 3), choice];
  for (let i = options.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [options[i], options[j]] = [options[j], options[i]];
  }

  const { data: score } = await sb
    .from('settings')
    .select(
      'quiz_best, quiz_best_number, quiz_best_wild, quiz_best_hard, quiz_played'
    )
    .eq('user_id', 1)
    .single();

  res.status(200).json({
    ok: true,
    mode,
    total: all?.length ?? 0,
    question: {
      qid: choice.id,
      // hard mode: source only (fewer hints, like PHP).
      meaning: mode === 'hard' ? null : choice.meaning,
      usage_note: choice.usage_note,
      source: choice.source,
      answerId: choice.id,
      answerText: choice.text,
      options: options.map((o) => ({ id: o.id, text: o.text }))
    },
    score: score ?? {
      quiz_best: 0,
      quiz_best_number: 0,
      quiz_best_wild: 0,
      quiz_best_hard: 0,
      quiz_played: 0
    }
  });
}
