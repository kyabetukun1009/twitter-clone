import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@lib/context/auth-context';
import { fetchReview, reviewSvgUrl } from '@lib/yajuter/api';
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
import type { ReactElement, ReactNode } from 'react';

export default function Review(): JSX.Element {
  const { user } = useAuth();
  const [year, setYear] = useState(new Date().getFullYear());
  const [total, setTotal] = useState(0);
  const [maxLikes, setMaxLikes] = useState(0);
  const [best, setBest] = useState<YPost | null>(null);
  const [monthly, setMonthly] = useState<number[]>([]);
  const [topWords, setTopWords] = useState<{ word: string; count: number }[]>(
    []
  );
  const [loading, setLoading] = useState(true);

  const load = useCallback((y?: number): void => {
    setLoading(true);
    fetchReview(y)
      .then((body) => {
        setYear(body.year);
        setTotal(body.total);
        setMaxLikes(body.maxLikes);
        setBest(body.best);
        setMonthly(body.monthly);
        setTopWords(body.topWords);
      })
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const maxM = Math.max(1, ...monthly);

  return (
    <MainContainer>
      <SEO title={`${year}年の振り返り / yajuter`} description='年間レビュー' />
      <MainHeader title={`${year}年の振り返り`} />
      <div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          className='h-32 w-full object-cover'
          src='/images/header-review.png'
          alt='振り返り'
        />
      </div>
      <div className='flex items-center justify-between border-b border-light-border px-4 py-3 dark:border-dark-border'>
        <div className='flex items-center gap-3'>
          <button
            className='custom-underline text-main-accent'
            onClick={(): void => load(year - 1)}
          >
            ← {year - 1}
          </button>
          <span className='text-2xl font-extrabold text-main-accent'>
            {year}
          </span>
          <button
            className='custom-underline text-main-accent'
            onClick={(): void => load(year + 1)}
          >
            {year + 1} →
          </button>
        </div>
        <a
          className='rounded-full bg-main-accent px-4 py-1.5 text-sm font-bold text-white'
          href={reviewSvgUrl(year)}
          target='_blank'
          rel='noreferrer'
        >
          🖼 シェア画像
        </a>
      </div>
      {loading || !user ? (
        <Loading className='mt-5' />
      ) : (
        <>
          <section className='grid grid-cols-2 gap-2 p-3'>
            <div className='rounded-2xl border border-light-border p-3 text-center dark:border-dark-border'>
              <p className='text-2xl font-extrabold text-main-accent'>
                {total}
              </p>
              <p className='text-xs text-light-secondary dark:text-dark-secondary'>
                {year}年の投稿数
              </p>
            </div>
            <div className='rounded-2xl border border-light-border p-3 text-center dark:border-dark-border'>
              <p className='text-2xl font-extrabold text-main-accent'>
                {maxLikes}
              </p>
              <p className='text-xs text-light-secondary dark:text-dark-secondary'>
                最多いいゾ
              </p>
            </div>
          </section>
          <section className='px-4 pb-3'>
            <div className='flex items-end gap-1' style={{ height: 96 }}>
              {monthly.map((count, m) => (
                <div
                  key={m}
                  className='flex min-w-0 flex-1 flex-col items-center gap-1'
                >
                  <span className='text-[10px]'>{count > 0 ? count : ''}</span>
                  <div
                    className='w-full rounded-t bg-main-accent/80'
                    style={{ height: `${Math.round((count / maxM) * 64)}px` }}
                    title={`${m + 1}月: ${count}投稿`}
                  />
                  <span className='text-[10px] text-light-secondary dark:text-dark-secondary'>
                    {m + 1}
                  </span>
                </div>
              ))}
            </div>
          </section>
          {topWords.length > 0 && (
            <section className='px-4 pb-3'>
              <h3 className='mb-1 font-extrabold'>よく使った語録</h3>
              <div className='flex flex-wrap gap-1.5'>
                {topWords.map(({ word, count }) => (
                  <span
                    key={word}
                    className='bg-main-accent/15 rounded-full px-3 py-1 text-xs font-bold text-main-accent'
                  >
                    {word} ×{count}
                  </span>
                ))}
              </div>
            </section>
          )}
          {best && (
            <section>
              <h3 className='px-4 font-extrabold'>ベスト投稿</h3>
              <YajuterTweet
                post={best}
                owner={user}
                onPatch={(id, patch): void =>
                  setBest((current) =>
                    current && current.id === id
                      ? { ...current, ...patch }
                      : current
                  )
                }
                onRemove={(): void => setBest(null)}
              />
            </section>
          )}
        </>
      )}
    </MainContainer>
  );
}

Review.getLayout = (page: ReactElement): ReactNode => (
  <ProtectedLayout>
    <MainLayout>
      {page}
      <Aside>
        <YajuterAside />
      </Aside>
    </MainLayout>
  </ProtectedLayout>
);
