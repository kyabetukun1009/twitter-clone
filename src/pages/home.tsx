import { useAuth } from '@lib/context/auth-context';
import { useYajuterTimeline } from '@lib/yajuter/use-timeline';
import { ProtectedLayout } from '@components/layout/common-layout';
import { MainLayout } from '@components/layout/main-layout';
import { Aside } from '@components/aside/aside';
import { SEO } from '@components/common/seo';
import { MainContainer } from '@components/home/main-container';
import { MainHeader } from '@components/home/main-header';
import { Loading } from '@components/ui/loading';
import { YajuterTweet } from '@components/yajuter/yajuter-tweet';
import { YajuterComposer } from '@components/yajuter/yajuter-composer';
import { YajuterAside } from '@components/yajuter/yajuter-aside';
import type { ReactElement, ReactNode } from 'react';

export default function Home(): JSX.Element {
  const { user } = useAuth();
  const {
    posts,
    loading,
    loadingMore,
    hasMore,
    sentinelRef,
    patchPost,
    removePost,
    prependPost
  } = useYajuterTimeline();

  return (
    <MainContainer>
      <SEO title='ホーム / yajuter' description='推しかつ記録タイムライン' />
      <MainHeader title='ホーム' />
      {user && <YajuterComposer owner={user} onPosted={prependPost} />}
      <section className='mt-0.5 xs:mt-0'>
        {loading || !user ? (
          <Loading className='mt-5' />
        ) : posts.length === 0 ? (
          <div className='flex flex-col items-center gap-2 px-4 py-8 text-center'>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              className='w-full max-w-xs rounded-2xl border border-light-border dark:border-dark-border'
              src='/images/empty-posts.png'
              alt='空っぽの箱'
            />
            <p className='text-light-secondary dark:text-dark-secondary'>
              まだ投稿がないゾ…おっそうだな（適当）
            </p>
          </div>
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
            <div ref={sentinelRef}>
              {loadingMore && <Loading className='mt-5' />}
              {!hasMore && (
                <p className='py-6 text-center text-sm text-light-secondary dark:text-dark-secondary'>
                  以上だゾ（終わり！閉廷！）
                </p>
              )}
            </div>
          </>
        )}
      </section>
    </MainContainer>
  );
}

Home.getLayout = (page: ReactElement): ReactNode => (
  <ProtectedLayout>
    <MainLayout>
      {page}
      <Aside>
        <YajuterAside />
      </Aside>
    </MainLayout>
  </ProtectedLayout>
);
