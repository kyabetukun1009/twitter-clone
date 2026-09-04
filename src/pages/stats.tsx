import { useState, useEffect, useCallback } from 'react';
import { fetchStats } from '@lib/yajuter/api';
import { useAuth } from '@lib/context/auth-context';
import { ProtectedLayout } from '@components/layout/common-layout';
import { MainLayout } from '@components/layout/main-layout';
import { Aside } from '@components/aside/aside';
import { SEO } from '@components/common/seo';
import { MainContainer } from '@components/home/main-container';
import { MainHeader } from '@components/home/main-header';
import { Loading } from '@components/ui/loading';
import { YajuterTweet } from '@components/yajuter/yajuter-tweet';
import { YajuterAside } from '@components/yajuter/yajuter-aside';
import type { StatsData, YPost } from '@lib/yajuter/api';
import type { ReactElement, ReactNode } from 'react';

function Bar({ value, max }: { value: number; max: number }): JSX.Element {
  return (
    <div className='h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-light-primary/10 dark:bg-dark-primary/10'>
      <div
        className='h-full rounded-full bg-main-accent'
        style={{ width: `${max ? Math.round((value / max) * 100) : 0}%` }}
      />
    </div>
  );
}

export default function Stats(): JSX.Element {
  const { user } = useAuth();
  const [data, setData] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const load = useCallback((f?: string, t?: string): void => {
    setLoading(true);
    fetchStats(f ?? undefined, t ?? undefined)
      .then((body) => setData(body))
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const patchPost = useCallback((id: number, patch: Partial<YPost>): void => {
    setData((current) => {
      if (!current) return current;
      const apply = (p: YPost): YPost => (p.id === id ? { ...p, ...patch } : p);
      return { ...current, best: current.best.map(apply) };
    });
  }, []);

  const removePost = useCallback((id: number): void => {
    setData((current) => {
      if (!current) return current;
      return { ...current, best: current.best.filter((p) => p.id !== id) };
    });
  }, []);

  const maxMonthly = Math.max(1, ...(data?.monthly ?? []).map((m) => m.count));
  const maxHour = Math.max(1, ...(data?.hourly ?? [0]));

  return (
    <MainContainer>
      <SEO title='統計 / yajuter' description='推しかつの記録' />
      <MainHeader title='統計' />
      <div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          className='h-32 w-full object-cover'
          src='/images/header-stats.png'
          alt='トロフィー'
        />
      </div>
      <div className='border-b border-light-border px-4 py-3 dark:border-dark-border'>
        <form
          className='flex flex-wrap items-center gap-2 text-sm'
          onSubmit={(e): void => {
            e.preventDefault();
            load(from, to);
          }}
        >
          <input
            className='rounded-xl border border-light-border bg-transparent px-2 py-1 outline-none dark:border-dark-border'
            type='date'
            value={from}
            onChange={(e): void => setFrom(e.target.value)}
          />
          <span>〜</span>
          <input
            className='rounded-xl border border-light-border bg-transparent px-2 py-1 outline-none dark:border-dark-border'
            type='date'
            value={to}
            onChange={(e): void => setTo(e.target.value)}
          />
          <button
            className='rounded-full bg-main-accent px-4 py-1 font-bold text-white'
            type='submit'
          >
            絞り込む
          </button>
          {(from || to) && (
            <button
              className='text-light-secondary dark:text-dark-secondary'
              type='button'
              onClick={(): void => {
                setFrom('');
                setTo('');
                load();
              }}
            >
              クリア
            </button>
          )}
        </form>
      </div>
      {loading || !data || !user ? (
        <Loading className='mt-5' />
      ) : (
        <>
          <section className='grid grid-cols-2 gap-2 p-3 xs:grid-cols-4'>
            {[
              ['投稿数', data.totals.post_count],
              ['総文字数', data.totals.total_chars],
              ['いいゾ合計', data.totals.like_count_total],
              ['連続日数', data.totals.streak_days]
            ].map(([label, value]) => (
              <div
                key={label as string}
                className='rounded-2xl border border-light-border p-3 text-center dark:border-dark-border'
              >
                <p className='text-2xl font-extrabold text-main-accent'>
                  {Number(value).toLocaleString()}
                </p>
                <p className='text-xs text-light-secondary dark:text-dark-secondary'>
                  {label as string}
                </p>
              </div>
            ))}
          </section>
          <section className='px-4 pb-2'>
            <h3 className='font-extrabold'>
              期間内: {data.period.posts}件 /{' '}
              {data.period.chars.toLocaleString()}字
              {data.firstPost && (
                <span className='ml-2 text-xs font-normal text-light-secondary dark:text-dark-secondary'>
                  初投稿 {data.firstPost}
                </span>
              )}
            </h3>
          </section>
          <section className='px-4 pb-3'>
            <h3 className='mb-1 font-extrabold'>月別（直近12ヶ月）</h3>
            <div className='flex flex-col gap-1'>
              {data.monthly.map((m) => (
                <div key={m.ym} className='flex items-center gap-2 text-xs'>
                  <span className='w-14 shrink-0'>{m.ym}</span>
                  <Bar value={m.count} max={maxMonthly} />
                  <span className='w-8 shrink-0 text-right'>{m.count}</span>
                </div>
              ))}
            </div>
          </section>
          <section className='px-4 pb-3'>
            <h3 className='mb-1 font-extrabold'>時間帯別（JST）</h3>
            <div className='flex items-end gap-0.5' style={{ height: 72 }}>
              {data.hourly.map((count, h) => (
                <div
                  key={h}
                  className='min-w-0 flex-1 rounded-t bg-main-accent/80'
                  style={{ height: `${Math.round((count / maxHour) * 100)}%` }}
                  title={`${h}時: ${count}件`}
                />
              ))}
            </div>
            <div className='flex justify-between text-[10px] text-light-secondary dark:text-dark-secondary'>
              <span>0時</span>
              <span>12時</span>
              <span>23時</span>
            </div>
          </section>
          {data.tags.length > 0 && (
            <section className='px-4 pb-3'>
              <h3 className='mb-1 font-extrabold'>感情タグ</h3>
              <div className='flex flex-wrap gap-1.5'>
                {data.tags.map(({ tag, count }) => (
                  <span
                    key={tag}
                    className='bg-main-accent/15 rounded-full px-3 py-1 text-xs font-bold text-main-accent'
                  >
                    {tag} ×{count}
                  </span>
                ))}
              </div>
            </section>
          )}
          {data.stamps.length > 0 && (
            <section className='px-4 pb-3'>
              <h3 className='mb-1 font-extrabold'>スタンプ</h3>
              <div className='flex flex-wrap gap-1.5'>
                {data.stamps.map(({ stamp, count }) => (
                  <span
                    key={stamp}
                    className='rounded-full border border-light-border px-3 py-1 text-xs dark:border-dark-border'
                  >
                    {stamp} ×{count}
                  </span>
                ))}
              </div>
            </section>
          )}
          {data.best.length > 0 && (
            <section>
              <h3 className='px-4 font-extrabold'>ベスト投稿</h3>
              {data.best.map((post) => (
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

Stats.getLayout = (page: ReactElement): ReactNode => (
  <ProtectedLayout>
    <MainLayout>
      {page}
      <Aside>
        <YajuterAside />
      </Aside>
    </MainLayout>
  </ProtectedLayout>
);
