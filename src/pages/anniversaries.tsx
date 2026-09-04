import { useState, useEffect } from 'react';
import { fetchAnniversaries } from '@lib/yajuter/api';
import { ProtectedLayout } from '@components/layout/common-layout';
import { MainLayout } from '@components/layout/main-layout';
import { Aside } from '@components/aside/aside';
import { SEO } from '@components/common/seo';
import { MainContainer } from '@components/home/main-container';
import { MainHeader } from '@components/home/main-header';
import { Loading } from '@components/ui/loading';
import { YajuterAside } from '@components/yajuter/yajuter-aside';
import type { AnniversaryRow } from '@lib/supabase/tables';
import type { ReactElement, ReactNode } from 'react';

function daysUntil(month: number, day: number, now: Date): number {
  const today = new Date(now.toDateString()).getTime();
  const thisYear = new Date(now.getFullYear(), month - 1, day).getTime();
  const target =
    thisYear >= today
      ? thisYear
      : new Date(now.getFullYear() + 1, month - 1, day).getTime();
  return Math.round((target - today) / 86_400_000);
}

export default function Anniversaries(): JSX.Element {
  const [rows, setRows] = useState<AnniversaryRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetchAnniversaries()
      .then(({ anniversaries }) => {
        if (!cancelled) setRows(anniversaries);
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const now = new Date();
  const withDays = rows
    .map((row) => ({ row, days: daysUntil(row.month, row.day, now) }))
    .sort((a, b) => a.days - b.days);

  return (
    <MainContainer>
      <SEO title='記念日 / yajuter' description='野獣先輩ゆかりの記念日' />
      <MainHeader title='記念日' />
      <div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          className='h-32 w-full object-cover'
          src='/images/header-anniv.png'
          alt='夜の競技場'
        />
      </div>
      <section className='flex flex-col gap-2 p-3'>
        {loading ? (
          <Loading className='mt-5' />
        ) : (
          withDays.map(({ row, days }) => (
            <div
              key={row.id}
              className='rounded-2xl border border-light-border p-4 dark:border-dark-border'
            >
              <div className='flex items-baseline justify-between gap-2'>
                <p className='text-lg font-extrabold'>{row.name}</p>
                <p className='shrink-0 rounded-full bg-main-accent px-3 py-1 text-sm font-bold text-white'>
                  {days === 0 ? '今日だゾ！' : `あと${days}日`}
                </p>
              </div>
              <p className='text-sm text-light-secondary dark:text-dark-secondary'>
                毎年{row.month}月{row.day}日
              </p>
              {row.description && (
                <p className='mt-1 text-sm'>{row.description}</p>
              )}
            </div>
          ))
        )}
      </section>
    </MainContainer>
  );
}

Anniversaries.getLayout = (page: ReactElement): ReactNode => (
  <ProtectedLayout>
    <MainLayout>
      {page}
      <Aside>
        <YajuterAside />
      </Aside>
    </MainLayout>
  </ProtectedLayout>
);
