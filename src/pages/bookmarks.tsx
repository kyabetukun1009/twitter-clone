import { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import { useAuth } from '@lib/context/auth-context';
import { useModal } from '@lib/hooks/useModal';
import { fetchBookmarks, clearBookmarks } from '@lib/yajuter/api';
import { ProtectedLayout } from '@components/layout/common-layout';
import { MainLayout } from '@components/layout/main-layout';
import { Aside } from '@components/aside/aside';
import { SEO } from '@components/common/seo';
import { MainHeader } from '@components/home/main-header';
import { MainContainer } from '@components/home/main-container';
import { Modal } from '@components/modal/modal';
import { ActionModal } from '@components/modal/action-modal';
import { StatsEmpty } from '@components/tweet/stats-empty';
import { Button } from '@components/ui/button';
import { ToolTip } from '@components/ui/tooltip';
import { HeroIcon } from '@components/ui/hero-icon';
import { Loading } from '@components/ui/loading';
import { YajuterTweet } from '@components/yajuter/yajuter-tweet';
import { YajuterAside } from '@components/yajuter/yajuter-aside';
import type { YPost } from '@lib/yajuter/api';
import type { ReactElement, ReactNode } from 'react';

export default function Bookmarks(): JSX.Element {
  const { user } = useAuth();
  const { open, openModal, closeModal } = useModal();

  const [posts, setPosts] = useState<YPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetchBookmarks()
      .then(({ posts }) => {
        if (!cancelled) setPosts(posts);
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const patchPost = useCallback((id: number, patch: Partial<YPost>): void => {
    // Unbookmarked here disappears from the list.
    setPosts((current) =>
      current
        .map((p) => (p.id === id ? { ...p, ...patch } : p))
        .filter((p) => p.id !== id || p.bookmarked)
    );
  }, []);

  const removePost = useCallback((id: number): void => {
    setPosts((current) => current.filter((p) => p.id !== id));
  }, []);

  const handleClear = async (): Promise<void> => {
    try {
      await clearBookmarks();
      setPosts([]);
      toast.success('お気に入りを空にしたゾ');
    } catch {
      toast.error('まずいですよ！（解除に失敗）');
    } finally {
      closeModal();
    }
  };

  return (
    <MainContainer>
      <SEO title='お気に入り / yajuter' description='☆をつけた投稿' />
      <Modal
        modalClassName='max-w-xs bg-main-background w-full p-8 rounded-2xl'
        open={open}
        closeModal={closeModal}
      >
        <ActionModal
          title='お気に入りを全部外す？'
          description='取り消せないゾ。☆をつけた投稿が全部外れるよ。'
          mainBtnClassName='bg-accent-red hover:bg-accent-red/90 active:bg-accent-red/75 accent-tab
                            focus-visible:bg-accent-red/90'
          mainBtnLabel='外す'
          action={handleClear}
          closeModal={closeModal}
        />
      </Modal>
      <MainHeader className='flex items-center justify-between'>
        <div className='-mb-1 flex flex-col'>
          <h2 className='-mt-1 text-xl font-bold'>お気に入り</h2>
          <p className='text-xs text-light-secondary dark:text-dark-secondary'>
            @{user?.username}
          </p>
        </div>
        <Button
          className='dark-bg-tab group relative p-2 hover:bg-light-primary/10
                     active:bg-light-primary/20 dark:hover:bg-dark-primary/10
                     dark:active:bg-dark-primary/20'
          onClick={openModal}
        >
          <HeroIcon className='h-5 w-5' iconName='ArchiveBoxXMarkIcon' />
          <ToolTip
            className='!-translate-x-20 translate-y-3 md:-translate-x-1/2'
            tip='お気に入りを全部外す'
          />
        </Button>
      </MainHeader>
      <section className='mt-0.5'>
        {loading || !user ? (
          <Loading className='mt-5' />
        ) : posts.length === 0 ? (
          <StatsEmpty
            title='☆をつけて保存しよう'
            description='いいゾ〜これと思った投稿に☆をつけると、ここに集まるよ。'
            imageData={{ src: '/images/empty-posts.png', alt: 'No bookmarks' }}
          />
        ) : (
          <>
            {posts.map((post) => (
              <YajuterTweet
                key={post.id}
                post={post}
                owner={user}
                onPatch={patchPost}
                onRemove={removePost}
              />
            ))}
          </>
        )}
      </section>
    </MainContainer>
  );
}

Bookmarks.getLayout = (page: ReactElement): ReactNode => (
  <ProtectedLayout>
    <MainLayout>
      {page}
      <Aside>
        <YajuterAside />
      </Aside>
    </MainLayout>
  </ProtectedLayout>
);
