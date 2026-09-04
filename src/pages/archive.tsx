import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@lib/context/auth-context';
import { fetchArchive } from '@lib/yajuter/api';
import { ProtectedLayout } from '@components/layout/common-layout';
import { MainLayout } from '@components/layout/main-layout';
import { Aside } from '@components/aside/aside';
import { SEO } from '@components/common/seo';
import { MainContainer } from '@components/home/main-container';
import { MainHeader } from '@components/home/main-header';
import { Loading } from '@components/ui/loading';
import { YajuterTweet } from '@components/yajuter/yajuter-tweet';
import { YajuterAside } from '@components/yajuter/yajuter-aside';
import type { YPost } from '@lib/yajuter/api';
import type { AnniversaryRow } from '@lib/supabase/tables';
import type { ReactElement, ReactNode } from 'react';

export default function Archive(): JSX.Element {
  const { user } = useAuth();
  const [years, setYears] = useState<number[]>([]);
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [total, setTotal] = useState(0);
  const [months, setMonths] = useState<
    { m: number; count: number; avg: number | null }[]
  >([]);
  const [best3, setBest3] = useState<YPost[]>([]);
  const [anniversaries, setAnniversaries] = useState<AnniversaryRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback((y?: number): void => {
    setLoading(true);
    fetchArchive(y)
      .then((body) => {
        setYears(body.years);
        setYear(body.year);
        setTotal(body.total);
        setMonths(body.months);
        setBest3(body.best3);
        setAnniversaries(body.anniversaries);
      })
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const patchPost = useCallback((id: number, patch: Partial<YPost>): void => {
    setBest3((current) =>
      current.map((p) => (p.id === id ? { ...p, ...patch } : p))
    );
  }, []);

  const removePost = useCallback((id: number): void => {
    setBest3((current) => current.filter((p) => p.id !== id));
  }, []);

  const maxCount = Math.max(1, ...months.map((m) => m.count));

  return (
    <MainContainer>
      <SEO title={`${year}年の年表 / yajuter`} description='年別の記録' />
      <MainHeader title={`${year}年の年表`} />
      <div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          className='h-32 w-full object-cover'
          src='/images/header-archive.png'
          alt='年表'
        />
      </div>
      <div className='border-b border-light-border px-4 py-3 dark:border-dark-border'>
        <div className='flex flex-wrap gap-1.5'>
          {years.map((y) => (
            <button
              key={y}
              className={
                y === year
                  ? 'rounded-full bg-main-accent px-3 py-1 text-sm font-bold text-white'
                  : 'rounded-full bg-light-primary/5 px-3 py-1 text-sm dark:bg-dark-primary/10'
              }
              onClick={(): void => load(y)}
            >
              {y}
            </button>
          ))}
        </div>
        <p className='mt-2 text-sm text-light-secondary dark:text-dark-secondary'>
          {total}投稿
        </p>
      </div>
      {loading || !user ? (
        <Loading className='mt-5' />
      ) : (
        <>
          <section className='px-4 py-3'>
            <div className='flex flex-col gap-1'>
              {months.map(({ m, count, avg }) => (
                <div key={m} className='flex items-center gap-2 text-xs'>
                  <span className='w-10 shrink-0'>{m}月</span>
                  <div className='h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-light-primary/10 dark:bg-dark-primary/10'>
                    <div
                      className='h-full rounded-full bg-main-accent'
                      style={{
                        width: `${Math.round((count / maxCount) * 100)}%`
                      }}
                    />
                  </div>
                  <span className='w-20 shrink-0 text-right'>
                    {count}件{avg !== null && `（平均${avg}字）`}
                  </span>
                </div>
              ))}
            </div>
          </section>
          {anniversaries.length > 0 && (
            <section className='px-4 pb-3'>
              <h3 className='mb-1 font-extrabold'>記念日</h3>
              <div className='flex flex-wrap gap-1.5'>
                {anniversaries.map((a) => (
                  <span
                    key={a.id}
                    className='bg-main-accent/15 rounded-full px-3 py-1 text-xs font-bold text-main-accent'
                  >
                    {a.name}（{a.month}/{a.day}）
                  </span>
                ))}
              </div>
            </section>
          )}
          {best3.length > 0 && (
            <section>
              <h3 className='px-4 font-extrabold'>いいゾTop3</h3>
              {best3.map((post) => (
                <YajuterTweet
                  key={post.id}
                  post={post}
                  owner={user}
                  onPatch={patchPost}
                  onRemove={removePost}
                />
              ))}
            </section>
          )}
        </>
      )}
    </MainContainer>
  );
}

Archive.getLayout = (page: ReactElement): ReactNode => (
  <ProtectedLayout>
    <MainLayout>
      {page}
      <Aside>
        <YajuterAside />
      </Aside>
    </MainLayout>
  </ProtectedLayout>
);
