import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import cn from 'clsx';
import { fetchQuotes } from '@lib/yajuter/api';
import { ProtectedLayout } from '@components/layout/common-layout';
import { MainLayout } from '@components/layout/main-layout';
import { Aside } from '@components/aside/aside';
import { SEO } from '@components/common/seo';
import { MainContainer } from '@components/home/main-container';
import { MainHeader } from '@components/home/main-header';
import { Loading } from '@components/ui/loading';
import { YajuterAside } from '@components/yajuter/yajuter-aside';
import type { QuoteRow } from '@lib/supabase/tables';
import type { ReactElement, ReactNode } from 'react';

const CATS: { key: string; label: string }[] = [
  { key: 'all', label: 'すべて' },
  { key: 'wild', label: '野獣先輩' },
  { key: 'imn', label: '淫夢ファミリー' },
  { key: 'common', label: '汎用スラング' },
  { key: 'number', label: '数字' },
  { key: 'other', label: 'その他' }
];

const SORTS: { key: string; label: string }[] = [
  { key: 'id', label: '通常' },
  { key: 'usage', label: '使用回数順' },
  { key: 'reading', label: '五十音順' }
];

export default function Quotes(): JSX.Element {
  const { query, push } = useRouter();
  const cat = typeof query.cat === 'string' ? query.cat : 'all';
  const q = typeof query.q === 'string' ? query.q : '';
  const sort = typeof query.sort === 'string' ? query.sort : 'id';

  const [input, setInput] = useState(q);
  const [quotes, setQuotes] = useState<QuoteRow[]>([]);
  const [usage, setUsage] = useState<Record<number, number>>({});
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState<number | null>(null);

  useEffect(() => {
    setInput(q);
    setLoading(true);
    fetchQuotes({ cat, q, sort })
      .then((body) => {
        setQuotes(body.quotes);
        setUsage(body.usage);
      })
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, [cat, q, sort]);

  function go(params: { cat?: string; q?: string; sort?: string }): void {
    const qs = new URLSearchParams();
    const nextCat = params.cat ?? cat;
    const nextSort = params.sort ?? sort;
    const nextQ =
      params.q ??
      (params.cat !== undefined || params.sort !== undefined ? '' : q);
    if (nextCat !== 'all') qs.set('cat', nextCat);
    if (nextQ) qs.set('q', nextQ);
    if (nextSort !== 'id') qs.set('sort', nextSort);
    const suffix = qs.toString();
    void push(`/quotes${suffix ? `?${suffix}` : ''}`);
  }

  async function copyQuote(quote: QuoteRow): Promise<void> {
    try {
      await navigator.clipboard.writeText(quote.text);
      setCopied(quote.id);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      // clipboard unavailable; ignore
    }
  }

  return (
    <MainContainer>
      <SEO title='淫夢語録辞典 / yajuter' description='投稿に使える語録集' />
      <MainHeader title='淫夢語録辞典' />
      <div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          className='h-32 w-full object-cover'
          src='/images/header-quotes.png'
          alt='夜の窓'
        />
      </div>
      <div className='border-b border-light-border px-4 py-3 dark:border-dark-border'>
        <p className='text-sm text-light-secondary dark:text-dark-secondary'>
          カードを押すと語録がコピーされるゾ。
        </p>
        <form
          className='mt-2 flex gap-2'
          onSubmit={(e): void => {
            e.preventDefault();
            go({ q: input.trim() });
          }}
        >
          <input
            className='min-w-0 flex-1 rounded-full border border-light-border bg-transparent px-4 py-2 text-sm outline-none focus:border-main-accent dark:border-dark-border'
            type='search'
            value={input}
            placeholder='語録・読み・意味で検索（例: やったぜ）'
            onChange={(e): void => setInput(e.target.value)}
          />
          <button
            className='shrink-0 rounded-full bg-main-accent px-4 py-2 text-sm font-bold text-white'
            type='submit'
          >
            探す
          </button>
        </form>
        {q && (
          <p className='mt-2 text-sm text-light-secondary dark:text-dark-secondary'>
            「{q}」の検索結果: {quotes.length}件
          </p>
        )}
        <div className='mt-2 flex flex-wrap gap-1.5'>
          {CATS.map(({ key, label }) => (
            <button
              key={key}
              className={cn(
                'rounded-full px-3 py-1 text-sm transition',
                cat === key && !q
                  ? 'bg-main-accent font-bold text-white'
                  : 'bg-light-primary/5 dark:bg-dark-primary/10'
              )}
              onClick={(): void => go({ cat: key })}
            >
              {label}
            </button>
          ))}
        </div>
        <div className='mt-1.5 flex gap-1.5'>
          {SORTS.map(({ key, label }) => (
            <button
              key={key}
              className={cn(
                'rounded-full px-3 py-1 text-xs transition',
                sort === key
                  ? 'bg-main-accent font-bold text-white'
                  : 'bg-light-primary/5 dark:bg-dark-primary/10'
              )}
              onClick={(): void => go({ sort: key })}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <section className='grid gap-2 p-3 xs:grid-cols-2'>
        {loading ? (
          <Loading className='col-span-full mt-5' />
        ) : (
          quotes.map((quote) => (
            <button
              key={quote.id}
              className='rounded-2xl border border-light-border p-3 text-left transition hover:border-main-accent dark:border-dark-border'
              onClick={(): void => void copyQuote(quote)}
              title='クリックでコピー'
            >
              <p className='font-bold'>「{quote.text}」</p>
              {quote.reading && (
                <p className='mt-0.5 text-xs text-light-secondary dark:text-dark-secondary'>
                  {quote.reading}
                </p>
              )}
              {quote.meaning && (
                <p className='mt-1 text-sm text-light-secondary dark:text-dark-secondary'>
                  {quote.meaning}
                </p>
              )}
              <p className='mt-1 text-xs text-main-accent'>
                {copied === quote.id
                  ? 'コピーしたゾ！'
                  : `${quote.source ?? ''} · ${usage[quote.id] ?? 0}回使用`}
              </p>
            </button>
          ))
        )}
      </section>
    </MainContainer>
  );
}

Quotes.getLayout = (page: ReactElement): ReactNode => (
  <ProtectedLayout>
    <MainLayout>
      {page}
      <Aside>
        <YajuterAside />
      </Aside>
    </MainLayout>
  </ProtectedLayout>
);
