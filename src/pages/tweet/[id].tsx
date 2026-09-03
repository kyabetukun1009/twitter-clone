import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@lib/context/auth-context';
import { fetchThread } from '@lib/yajuter/api';
import { ProtectedLayout } from '@components/layout/common-layout';
import { MainLayout } from '@components/layout/main-layout';
import { Aside } from '@components/aside/aside';
import { MainContainer } from '@components/home/main-container';
import { MainHeader } from '@components/home/main-header';
import { SEO } from '@components/common/seo';
import { Loading } from '@components/ui/loading';
import { Error } from '@components/ui/error';
import { YajuterTweet } from '@components/yajuter/yajuter-tweet';
import { YajuterComposer } from '@components/yajuter/yajuter-composer';
import { YajuterAside } from '@components/yajuter/yajuter-aside';
import type { YPost, YThread } from '@lib/yajuter/api';
import type { ReactElement, ReactNode } from 'react';

export default function TweetId(): JSX.Element {
  const {
    query: { id },
    back
  } = useRouter();
  const { user } = useAuth();

  const [thread, setThread] = useState<YThread | null>(null);
  const [loading, setLoading] = useState(true);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setLoading(true);
    setMissing(false);
    fetchThread(Number(id))
      .then((data) => {
        if (!cancelled) setThread(data);
      })
      .catch(() => {
        if (!cancelled) setMissing(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  const patchIn = useCallback((postId: number, patch: Partial<YPost>): void => {
    setThread((current) => {
      if (!current) return current;
      const apply = (p: YPost): YPost =>
        p.id === postId ? { ...p, ...patch } : p;
      return {
        post: apply(current.post),
        parents: current.parents.map(apply),
        replies: current.replies.map(apply)
      };
    });
  }, []);

  const removeFrom = useCallback((postId: number): void => {
    setThread((current) => {
      if (!current) return current;
      if (current.post.id === postId) {
        setMissing(true);
        return current;
      }
      return {
        ...current,
        replies: current.replies.filter((p) => p.id !== postId)
      };
    });
  }, []);

  const appendReply = useCallback((post: YPost): void => {
    setThread((current) => {
      if (!current) return current;
      return {
        ...current,
        post: {
          ...current.post,
          reply_count: current.post.reply_count + 1
        },
        replies: [...current.replies, post]
      };
    });
  }, []);

  const main = thread?.post;
  const pageTitle = main
    ? `${user?.name ?? 'yajuter'}: 「${main.content.slice(0, 40)}」 / yajuter`
    : null;

  return (
    <MainContainer>
      <MainHeader
        useActionButton
        title={thread && thread.parents.length ? 'スレッド' : 'つぶやき'}
        tip='戻る'
        action={back}
      />
      <section>
        {loading || !user ? (
          <Loading className='mt-5' />
        ) : missing || !thread || !main ? (
          <>
            <SEO title='見つからない / yajuter' />
            <Error message='これもうわかんねぇな（投稿が見つからない）' />
          </>
        ) : (
          <>
            {pageTitle && <SEO title={pageTitle} />}
            {thread.parents.map((parent) => (
              <YajuterTweet
                key={parent.id}
                post={parent}
                owner={user}
                onPatch={patchIn}
                onRemove={removeFrom}
              />
            ))}
            <div className='border-b-4 border-light-border dark:border-dark-border'>
              <YajuterTweet
                post={main}
                owner={user}
                onPatch={patchIn}
                onRemove={removeFrom}
              />
            </div>
            <YajuterComposer
              owner={user}
              replyTo={main.id}
              onPosted={appendReply}
            />
            {thread.replies.map((reply) => (
              <YajuterTweet
                key={reply.id}
                post={reply}
                owner={user}
                onPatch={patchIn}
                onRemove={removeFrom}
              />
            ))}
          </>
        )}
      </section>
    </MainContainer>
  );
}

TweetId.getLayout = (page: ReactElement): ReactNode => (
  <ProtectedLayout>
    <MainLayout>
      {page}
      <Aside>
        <YajuterAside />
      </Aside>
    </MainLayout>
  </ProtectedLayout>
);
