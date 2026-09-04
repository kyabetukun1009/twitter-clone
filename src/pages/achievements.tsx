import { useState, useEffect } from 'react';
import { fetchBadges } from '@lib/yajuter/api';
import { ProtectedLayout } from '@components/layout/common-layout';
import { MainLayout } from '@components/layout/main-layout';
import { Aside } from '@components/aside/aside';
import { SEO } from '@components/common/seo';
import { MainContainer } from '@components/home/main-container';
import { MainHeader } from '@components/home/main-header';
import { Loading } from '@components/ui/loading';
import { YajuterAside } from '@components/yajuter/yajuter-aside';
import type { BadgeView } from '@lib/yajuter/api';
import type { ReactElement, ReactNode } from 'react';

const RARITY_STYLE: Record<string, string> = {
  legend: 'bg-accent-yellow/20 text-accent-yellow',
  epic: 'bg-accent-purple/20 text-accent-purple',
  rare: 'bg-accent-blue/20 text-accent-blue',
  normal:
    'bg-light-primary/5 text-light-secondary dark:bg-dark-primary/10 dark:text-dark-secondary'
};

export default function Achievements(): JSX.Element {
  const [badges, setBadges] = useState<BadgeView[]>([]);
  const [stats, setStats] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetchBadges()
      .then((body) => {
        if (cancelled) return;
        setBadges(body.badges);
        setStats(body.stats);
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const unlockedCount = badges.filter((b) => b.unlocked).length;

  return (
    <MainContainer>
      <SEO title='実績 / yajuter' description='解除した実績の一覧' />
      <MainHeader title='実績' />
      <div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          className='h-32 w-full bg-black object-cover'
          src='/images/header-badges.png'
          alt='実績'
        />
      </div>
      <div className='border-b border-light-border px-4 py-3 dark:border-dark-border'>
        <p className='text-sm text-light-secondary dark:text-dark-secondary'>
          解除済み: <b className='text-main-accent'>{unlockedCount}</b> /{' '}
          {badges.length}
          種類 総投稿数・連続日数・文字数などで自動解除されるゾ。
        </p>
      </div>
      {loading ? (
        <Loading className='mt-5' />
      ) : (
        <section className='grid gap-2 p-3 xs:grid-cols-2'>
          {badges.map((badge) => {
            const locked = !badge.unlocked;
            const current = stats[badge.metric] ?? 0;
            return (
              <div
                key={badge.code}
                className={`flex gap-3 rounded-2xl border p-3 ${
                  locked
                    ? 'border-light-border opacity-60 dark:border-dark-border'
                    : 'border-main-accent/50'
                }`}
              >
                <div className='bg-main-accent/15 grid h-12 w-12 shrink-0 place-items-center rounded-2xl text-2xl font-extrabold text-main-accent'>
                  {locked ? '？' : badge.icon}
                </div>
                <div className='min-w-0 flex-1'>
                  <p className='font-bold'>
                    {badge.name}{' '}
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        RARITY_STYLE[badge.rarity ?? 'normal']
                      }`}
                    >
                      {badge.rarity}
                    </span>
                  </p>
                  <p className='mt-0.5 text-sm text-light-secondary dark:text-dark-secondary'>
                    {badge.description}
                  </p>
                  {badge.unlocked ? (
                    <p className='mt-1 text-xs text-main-accent'>
                      ✓ {badge.unlocked.unlocked_at.slice(0, 10)} に解除
                    </p>
                  ) : (
                    <p className='mt-1 text-xs text-light-secondary dark:text-dark-secondary'>
                      {Math.min(current, badge.threshold).toLocaleString()} /{' '}
                      {badge.threshold.toLocaleString()}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </section>
      )}
    </MainContainer>
  );
}

Achievements.getLayout = (page: ReactElement): ReactNode => (
  <ProtectedLayout>
    <MainLayout>
      {page}
      <Aside>
        <YajuterAside />
      </Aside>
    </MainLayout>
  </ProtectedLayout>
);
