import { useState, useEffect, useRef } from 'react';
import {
  fetchPilgrimage,
  addPilgrimageLog,
  deletePilgrimageLog,
  uploadImage,
  imageUrl
} from '@lib/yajuter/api';
import { ProtectedLayout } from '@components/layout/common-layout';
import { MainLayout } from '@components/layout/main-layout';
import { Aside } from '@components/aside/aside';
import { SEO } from '@components/common/seo';
import { MainContainer } from '@components/home/main-container';
import { MainHeader } from '@components/home/main-header';
import { Loading } from '@components/ui/loading';
import { HeroIcon } from '@components/ui/hero-icon';
import { YajuterAside } from '@components/yajuter/yajuter-aside';
import type { ReactElement, ReactNode } from 'react';

type Spot = {
  id: number;
  name: string;
  area: string;
  description: string | null;
  caution: string;
};

type Log = {
  id: number;
  spot_id: number;
  visited_at: string;
  digital_only: boolean;
  memo: string | null;
  photo_path: string | null;
  spot: { name: string } | null;
};

export default function Pilgrimage(): JSX.Element {
  const [spots, setSpots] = useState<Spot[]>([]);
  const [logs, setLogs] = useState<Log[]>([]);
  const [logCount, setLogCount] = useState(0);
  const [monthly, setMonthly] = useState<
    Record<string, { count: number; digital: number }>
  >({});
  const [loading, setLoading] = useState(true);

  const [spotId, setSpotId] = useState('');
  const [visitedAt, setVisitedAt] = useState('');
  const [digital, setDigital] = useState(true);
  const [memo, setMemo] = useState('');
  const [photo, setPhoto] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  async function reload(): Promise<void> {
    const body = await fetchPilgrimage();
    setSpots(body.spots);
    setLogs(body.logs);
    setLogCount(body.logCount);
    setMonthly(body.monthly);
  }

  useEffect(() => {
    let cancelled = false;
    reload()
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function onSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    if (!spotId || !visitedAt || busy) return;
    setBusy(true);
    setError('');
    try {
      let photo_path: string | undefined;
      if (photo) {
        const uploaded = await uploadImage(photo, 'pilgrimage');
        photo_path = uploaded.path;
      }
      await addPilgrimageLog({
        spot_id: Number(spotId),
        visited_at: visitedAt,
        digital_only: digital,
        memo: memo.trim() || undefined,
        photo_path
      });
      setSpotId('');
      setVisitedAt('');
      setMemo('');
      setPhoto(null);
      if (fileRef.current) fileRef.current.value = '';
      await reload();
    } catch {
      setError('まずいですよ！（記録に失敗）');
    } finally {
      setBusy(false);
    }
  }

  async function onDelete(id: number): Promise<void> {
    if (!window.confirm('巡礼ログを削除するゾ？')) return;
    await deletePilgrimageLog(id).catch(() => undefined);
    await reload().catch(() => undefined);
  }

  return (
    <MainContainer>
      <SEO title='聖地巡礼 / yajuter' description='デジタル巡礼の記録' />
      <MainHeader title='聖地巡礼' />
      <div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          className='h-32 w-full object-cover'
          src='/images/header-pilgrimage.png'
          alt='競技場の夜'
        />
      </div>
      <div className='border-b border-light-border px-4 py-3 dark:border-dark-border'>
        <p className='text-sm font-bold'>
          †巡礼記録（{logCount}件）† デジタル巡礼推奨だゾ
        </p>
        <form className='mt-2 flex flex-col gap-2' onSubmit={onSubmit}>
          <div className='flex gap-2'>
            <select
              className='min-w-0 flex-1 rounded-xl border border-light-border bg-transparent px-3 py-2 text-sm outline-none dark:border-dark-border'
              value={spotId}
              onChange={(e): void => setSpotId(e.target.value)}
            >
              <option value=''>聖地を選ぶ</option>
              {spots.map((spot) => (
                <option key={spot.id} value={spot.id}>
                  {spot.name}（{spot.area}）
                </option>
              ))}
            </select>
            <input
              className='rounded-xl border border-light-border bg-transparent px-3 py-2 text-sm outline-none dark:border-dark-border'
              type='date'
              value={visitedAt}
              onChange={(e): void => setVisitedAt(e.target.value)}
            />
          </div>
          <textarea
            className='min-h-[56px] w-full resize-y rounded-xl border border-light-border bg-transparent px-3 py-2 text-sm outline-none dark:border-dark-border'
            placeholder='メモ（810字まで）'
            value={memo}
            onChange={(e): void => setMemo(e.target.value)}
          />
          <div className='flex items-center justify-between gap-2'>
            <label className='flex items-center gap-1 text-sm'>
              <input
                type='checkbox'
                checked={digital}
                onChange={(e): void => setDigital(e.target.checked)}
              />
              デジタル巡礼
            </label>
            <div className='flex items-center gap-2'>
              <input
                ref={fileRef}
                className='hidden'
                type='file'
                accept='image/jpeg,image/png,image/gif,image/webp'
                onChange={(e): void => setPhoto(e.target.files?.[0] ?? null)}
              />
              <button
                className='grid h-9 w-9 place-items-center rounded-full text-main-accent hover:bg-main-accent/10'
                type='button'
                title={photo ? photo.name : '写真をつける'}
                onClick={(): void => fileRef.current?.click()}
              >
                <HeroIcon className='h-5 w-5' iconName='PhotoIcon' />
              </button>
              <button
                className='rounded-full bg-main-accent px-5 py-1.5 text-sm font-bold text-white disabled:opacity-50'
                type='submit'
                disabled={!spotId || !visitedAt || busy}
              >
                {busy ? '記録中…' : '記録する'}
              </button>
            </div>
          </div>
          {photo && (
            <p className='text-xs text-light-secondary dark:text-dark-secondary'>
              📷 {photo.name}
            </p>
          )}
          {error && <p className='text-sm text-accent-red'>{error}</p>}
        </form>
      </div>
      <section className='flex flex-col gap-2 p-3'>
        {loading ? (
          <Loading className='mt-5' />
        ) : (
          <>
            {spots.map((spot) => (
              <details
                key={spot.id}
                className='rounded-2xl border border-light-border p-3 dark:border-dark-border'
              >
                <summary className='cursor-pointer font-bold'>
                  {spot.name}
                  <span className='ml-2 text-xs font-normal text-light-secondary dark:text-dark-secondary'>
                    {spot.area}
                  </span>
                </summary>
                {spot.description && (
                  <p className='mt-1 text-sm'>{spot.description}</p>
                )}
                <p className='mt-1 rounded-xl bg-accent-red/10 p-2 text-xs'>
                  ⚠️ {spot.caution}
                </p>
              </details>
            ))}
            <h3 className='mt-2 font-extrabold'>記録ログ</h3>
            {logs.length === 0 && (
              <p className='text-sm text-light-secondary dark:text-dark-secondary'>
                まだないゾ…
              </p>
            )}
            {logs.map((log) => (
              <div
                key={log.id}
                className='rounded-2xl border border-light-border p-3 dark:border-dark-border'
              >
                <div className='flex items-center justify-between gap-2'>
                  <p className='font-bold'>
                    {log.spot?.name ?? `聖地#${log.spot_id}`}
                    {log.digital_only && (
                      <span className='bg-main-accent/15 ml-2 rounded-full px-2 py-0.5 text-xs text-main-accent'>
                        デジタル
                      </span>
                    )}
                  </p>
                  <button
                    className='text-xs text-light-secondary dark:text-dark-secondary'
                    onClick={(): void => void onDelete(log.id)}
                  >
                    削除
                  </button>
                </div>
                <p className='text-xs text-light-secondary dark:text-dark-secondary'>
                  {log.visited_at}
                </p>
                {log.memo && (
                  <p className='mt-1 whitespace-pre-line break-words text-sm'>
                    {log.memo}
                  </p>
                )}
                {log.photo_path && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    className='mt-2 max-h-64 rounded-2xl border border-light-border object-cover dark:border-dark-border'
                    src={imageUrl(log.photo_path)}
                    alt='巡礼写真'
                    loading='lazy'
                  />
                )}
              </div>
            ))}
            {Object.keys(monthly).length > 0 && (
              <>
                <h3 className='mt-2 font-extrabold'>月別</h3>
                <div className='flex flex-wrap gap-1.5'>
                  {Object.entries(monthly).map(([ym, m]) => (
                    <span
                      key={ym}
                      className='rounded-full bg-light-primary/5 px-3 py-1 text-xs dark:bg-dark-primary/10'
                    >
                      {ym}: {m.count}件（デ{m.digital}）
                    </span>
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </section>
    </MainContainer>
  );
}

Pilgrimage.getLayout = (page: ReactElement): ReactNode => (
  <ProtectedLayout>
    <MainLayout>
      {page}
      <Aside>
        <YajuterAside />
      </Aside>
    </MainLayout>
  </ProtectedLayout>
);
