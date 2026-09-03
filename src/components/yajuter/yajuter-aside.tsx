import { useEffect, useState } from 'react';
import { fetchAnniversaries, fetchRandomQuote } from '@lib/yajuter/api';
import type { AnniversaryRow, QuoteRow } from '@lib/supabase/tables';

function daysUntil(month: number, day: number, now: Date): number {
  const thisYear = new Date(now.getFullYear(), month - 1, day);
  const target =
    thisYear.getTime() >= new Date(now.toDateString()).getTime()
      ? thisYear
      : new Date(now.getFullYear() + 1, month - 1, day);
  return Math.round(
    (target.getTime() - new Date(now.toDateString()).getTime()) / 86_400_000
  );
}

function nextAnniversary(list: AnniversaryRow[]): {
  row: AnniversaryRow;
  days: number;
} | null {
  if (!list.length) return null;
  const now = new Date();
  let best: { row: AnniversaryRow; days: number } | null = null;
  for (const row of list) {
    const days = daysUntil(row.month, row.day, now);
    if (!best || days < best.days) best = { row, days };
  }
  return best;
}

export function YajuterAside(): JSX.Element {
  const [anniversaries, setAnniversaries] = useState<AnniversaryRow[]>([]);
  const [quote, setQuote] = useState<QuoteRow | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchAnniversaries()
      .then(({ anniversaries }) => {
        if (!cancelled) setAnniversaries(anniversaries);
      })
      .catch(() => undefined);
    fetchRandomQuote()
      .then(({ quote }) => {
        if (!cancelled) setQuote(quote);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  const upcoming = nextAnniversary(anniversaries);

  return (
    <>
      <section className='rounded-2xl bg-main-sidebar-background pt-3'>
        <h2 className='px-4 pb-2 text-xl font-extrabold'>
          記念日カウントダウン
        </h2>
        {upcoming ? (
          <div className='px-4 py-3 transition hover:bg-white/[0.03] dark:hover:bg-white/[0.03]'>
            <p className='font-bold'>{upcoming.row.name}</p>
            <p className='text-sm text-light-secondary dark:text-dark-secondary'>
              {upcoming.row.month}/{upcoming.row.day}まであと{upcoming.days}日
            </p>
          </div>
        ) : (
          <p className='px-4 py-3 text-sm text-light-secondary dark:text-dark-secondary'>
            読み込み中…
          </p>
        )}
      </section>
      <section className='rounded-2xl bg-main-sidebar-background pt-3'>
        <h2 className='px-4 pb-2 text-xl font-extrabold'>今日の語録</h2>
        {quote ? (
          <div className='px-4 py-3'>
            <p className='font-bold'>「{quote.text}」</p>
            {quote.meaning && (
              <p className='mt-1 text-sm text-light-secondary dark:text-dark-secondary'>
                {quote.meaning}
              </p>
            )}
          </div>
        ) : (
          <p className='px-4 py-3 text-sm text-light-secondary dark:text-dark-secondary'>
            読み込み中…
          </p>
        )}
      </section>
    </>
  );
}
