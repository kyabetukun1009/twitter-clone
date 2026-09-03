import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import cn from 'clsx';
import { useAuth } from '@lib/context/auth-context';
import { fetchProfile } from '@lib/yajuter/api';
import { ProtectedLayout } from '@components/layout/common-layout';
import { MainLayout } from '@components/layout/main-layout';
import { Aside } from '@components/aside/aside';
import { SEO } from '@components/common/seo';
import { MainContainer } from '@components/home/main-container';
import { MainHeader } from '@components/home/main-header';
import { Loading } from '@components/ui/loading';
import { Error } from '@components/ui/error';
import { UserAvatar } from '@components/user/user-avatar';
import { YajuterTweet } from '@components/yajuter/yajuter-tweet';
import { YajuterAside } from '@components/yajuter/yajuter-aside';
import type { YPost } from '@lib/yajuter/api';
import type { ReactElement, ReactNode } from 'react';

type Tab = 'posts' | 'media' | 'liked';

const TABS: { key: Tab; label: string }[] = [
  { key: 'posts', label: '投稿' },
  { key: 'media', label: 'メディア' },
  { key: 'liked', label: 'いいゾ順' }
];

function joinedJa(createdAt: { toDate(): Date }): string {
  const d = createdAt.toDate();
  return `${d.getFullYear()}年${d.getMonth() + 1}月`;
}

export default function UserProfile(): JSX.Element {
  const {
    query: { id },
    back
  } = useRouter();
  const { user } = useAuth();

  const [tab, setTab] = useState<Tab>('posts');
  const [posts, setPosts] = useState<YPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ totalTweets: 0, totalPhotos: 0 });

  const isOwner = id === '1' || id === user?.username;

  useEffect(() => {
    if (!isOwner) return;
    let cancelled = false;
    setLoading(true);
    fetchProfile(tab)
      .then((body) => {
        if (cancelled) return;
        setPosts(body.posts);
        setStats(body.stats);
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [tab, isOwner]);

  const patchPost = useCallback(
    (postId: number, patch: Partial<YPost>): void => {
      setPosts((current) =>
        current.map((p) => (p.id === postId ? { ...p, ...patch } : p))
      );
    },
    []
  );

  const removePost = useCallback((postId: number): void => {
    setPosts((current) => current.filter((p) => p.id !== postId));
  }, []);

  return (
    <MainContainer>
      <SEO title={user ? `${user.name} / yajuter` : 'プロフィール / yajuter'} />
      <MainHeader useActionButton tip='戻る' action={back} title={user?.name} />
      {!user || !id ? (
        <Loading className='mt-5' />
      ) : !isOwner ? (
        <Error message='1人用モードだゾ（他のユーザーは存在しない）' />
      ) : (
        <>
          <div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              className='h-48 w-full object-cover'
              src='/images/yajuter-cover.svg'
              alt='カバー'
            />
          </div>
          <div className='px-4'>
            <div className='-mt-10 mb-2'>
              <UserAvatar
                src={user.photoURL}
                alt={user.name}
                size={88}
                className='rounded-full ring-4 ring-main-background'
              />
            </div>
            <p className='text-xl font-extrabold'>{user.name}</p>
            <p className='text-sm text-light-secondary dark:text-dark-secondary'>
              @{user.username}
            </p>
            {user.bio && (
              <p className='mt-2 whitespace-pre-line break-words'>{user.bio}</p>
            )}
            <p className='mt-2 text-sm text-light-secondary dark:text-dark-secondary'>
              📅 {joinedJa(user.createdAt)}に登録 · {stats.totalTweets}
              件の投稿 · {stats.totalPhotos}枚の画像
            </p>
          </div>
          <nav className='mt-2 flex border-b border-light-border dark:border-dark-border'>
            {TABS.map(({ key, label }) => (
              <button
                key={key}
                className={cn(
                  'flex-1 py-3 text-sm font-bold outline-none transition hover:bg-light-primary/5 dark:hover:bg-dark-primary/5',
                  tab === key
                    ? 'text-light-primary dark:text-dark-primary'
                    : 'text-light-secondary dark:text-dark-secondary'
                )}
                onClick={(): void => setTab(key)}
              >
                <span
                  className={cn(
                    'inline-block pb-1',
                    tab === key && 'border-b-4 border-main-accent'
                  )}
                >
                  {label}
                </span>
              </button>
            ))}
          </nav>
          <section>
            {loading ? (
              <Loading className='mt-5' />
            ) : posts.length === 0 ? (
              <p className='px-4 py-8 text-center text-light-secondary dark:text-dark-secondary'>
                まだないゾ…
              </p>
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
        </>
      )}
    </MainContainer>
  );
}

UserProfile.getLayout = (page: ReactElement): ReactNode => (
  <ProtectedLayout>
    <MainLayout>
      {page}
      <Aside>
        <YajuterAside />
      </Aside>
    </MainLayout>
  </ProtectedLayout>
);
