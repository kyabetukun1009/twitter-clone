import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@lib/context/auth-context';
import { fetchSearch } from '@lib/yajuter/api';
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

export default function Search(): JSX.Element {
  const { user } = useAuth();
  const { query, push } = useRouter();
  const initialQ = typeof query.q === 'string' ? query.q : '';

  const [input, setInput] = useState(initialQ);
  const [posts, setPosts] = useState<YPost[]>([]);
  const [total, setTotal] = useState(0);
  const [searched, setSearched] = useState('');
  const [suggests, setSuggests] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const run = useCallback((q: string): void => {
    setLoading(true);
    fetchSearch(q)
      .then((body) => {
        setPosts(body.posts);
        setTotal(body.total);
        setSuggests(body.suggests);
        setSearched(body.q);
      })
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    setInput(initialQ);
    if (initialQ) run(initialQ);
    else {
      setPosts([]);
      setSearched('');
      fetchSearch('')
        .then((body) => setSuggests(body.suggests))
        .catch(() => undefined);
    }
  }, [initialQ, run]);

  function onSubmit(e: React.FormEvent): void {
    e.preventDefault();
    void push(
      `/search${input.trim() ? `?q=${encodeURIComponent(input.trim())}` : ''}`
    );
  }

  const patchPost = useCallback((id: number, patch: Partial<YPost>): void => {
    setPosts((current) =>
      current.map((p) => (p.id === id ? { ...p, ...patch } : p))
    );
  }, []);

  const removePost = useCallback((id: number): void => {
    setPosts((current) => current.filter((p) => p.id !== id));
  }, []);

  return (
    <MainContainer>
      <SEO title='検索 / yajuter' description='投稿を掘る' />
      <MainHeader title='検索' />
      <div className='border-b border-light-border px-4 py-3 dark:border-dark-border'>
        <form className='flex gap-2' onSubmit={onSubmit}>
          <input
            className='min-w-0 flex-1 rounded-full border border-light-border bg-transparent px-4 py-2 outline-none focus:border-main-accent dark:border-dark-border'
            type='search'
            value={input}
            placeholder='語録・キーワードで投稿を探す（例: 810）'
            onChange={(e): void => setInput(e.target.value)}
          />
          <button
            className='shrink-0 rounded-full bg-main-accent px-4 py-2 text-sm font-bold text-white transition hover:brightness-110'
            type='submit'
          >
            ここ掘るのは得だゾ〜
          </button>
        </form>
        {suggests.length > 0 && !searched && (
          <p className='mt-2 text-xs text-light-secondary dark:text-dark-secondary'>
            よく検索してるワード:{' '}
            {suggests.slice(0, 5).map((s, i) => (
              <span key={s}>
                {i > 0 && ' ・ '}
                <button
                  className='custom-underline text-main-accent'
                  onClick={(): void => {
                    setInput(s);
                    void push(`/search?q=${encodeURIComponent(s)}`);
                  }}
                >
                  {s}
                </button>
              </span>
            ))}
          </p>
        )}
        {searched && (
          <p className='mt-2 text-sm text-light-secondary dark:text-dark-secondary'>
            「{searched}」の検索結果: {total}件
          </p>
        )}
      </div>
      <section>
        {loading || !user ? (
          loading && <Loading className='mt-5' />
        ) : searched && posts.length === 0 ? (
          <div className='flex flex-col items-center gap-2 px-4 py-8 text-center'>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              className='w-full max-w-xs rounded-2xl border border-light-border dark:border-dark-border'
              src='/images/empty-posts.png'
              alt='空っぽの箱'
            />
            <p className='text-light-secondary dark:text-dark-secondary'>
              1件も見つからなかったゾ…微レ存…？
            </p>
          </div>
        ) : (
          posts.map((post) => (
            <YajuterTweet
              key={post.id}
              post={post}
              owner={user}
              onPatch={patchPost}
              onRemove={removePost}
            />
          ))
        )}
      </section>
    </MainContainer>
  );
}

Search.getLayout = (page: ReactElement): ReactNode => (
  <ProtectedLayout>
    <MainLayout>
      {page}
      <Aside>
        <YajuterAside />
      </Aside>
    </MainLayout>
  </ProtectedLayout>
);
