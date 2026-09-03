import { useState } from 'react';
import Link from 'next/link';
import cn from 'clsx';
import { fromISO } from '@lib/supabase/timestamp';
import { likePost, toggleBookmark, deletePost } from '@lib/yajuter/api';
import { UserAvatar } from '@components/user/user-avatar';
import { UserName } from '@components/user/user-name';
import { TweetDate } from '@components/tweet/tweet-date';
import { HeroIcon } from '@components/ui/hero-icon';
import type { YPost } from '@lib/yajuter/api';
import type { User } from '@lib/types/user';

type YajuterTweetProps = {
  post: YPost;
  owner: User;
  onPatch: (id: number, patch: Partial<YPost>) => void;
  onRemove: (id: number) => void;
};

export function YajuterTweet({
  post,
  owner,
  onPatch,
  onRemove
}: YajuterTweetProps): JSX.Element {
  const [busy, setBusy] = useState(false);
  const tweetLink = `/tweet/${post.id}`;
  const liked = post.like_count > 0;

  async function onLike(): Promise<void> {
    if (busy) return;
    setBusy(true);
    try {
      const { post: updated } = await likePost(post.id);
      onPatch(post.id, { like_count: updated.like_count });
    } catch {
      // keep current count on failure
    } finally {
      setBusy(false);
    }
  }

  async function onBookmark(): Promise<void> {
    if (busy) return;
    setBusy(true);
    try {
      const { post: updated } = await toggleBookmark(post.id);
      onPatch(post.id, { bookmarked: updated.bookmarked });
    } catch {
      // keep current state on failure
    } finally {
      setBusy(false);
    }
  }

  async function onDelete(): Promise<void> {
    if (busy) return;
    if (!window.confirm('頭にきますよ（削除すると取り消せません）')) return;
    setBusy(true);
    try {
      await deletePost(post.id);
      onRemove(post.id);
    } catch {
      setBusy(false);
    }
  }

  return (
    <article
      id={`post-${post.id}`}
      className='accent-tab hover-card flex flex-col gap-y-1 border-b border-light-border px-4
                 py-3 outline-none duration-200 dark:border-dark-border'
    >
      <div className='grid grid-cols-[auto,1fr] gap-x-3'>
        <UserAvatar
          src={owner.photoURL}
          alt={owner.name}
          username={owner.username}
        />
        <div className='flex min-w-0 flex-col'>
          <div className='flex items-center gap-1 truncate text-light-secondary dark:text-dark-secondary'>
            <UserName
              name={owner.name}
              username={owner.username}
              verified={false}
              className='text-light-primary dark:text-dark-primary'
            />
            <span className='truncate text-sm'>@{owner.username}</span>
            <TweetDate
              createdAt={fromISO(post.created_at)}
              tweetLink={tweetLink}
            />
          </div>
          {post.emotion_tag && (
            <span className='bg-accent-yellow/15 mt-1 w-fit rounded-full px-2 py-0.5 text-xs font-bold text-accent-yellow'>
              {post.emotion_tag}
            </span>
          )}
          <p className='whitespace-pre-line break-words'>{post.content}</p>
          {post.edited_at && (
            <p className='mt-1 text-xs text-light-secondary dark:text-dark-secondary'>
              ✏️ 編集済み
            </p>
          )}
          <div className='mt-1 flex max-w-md items-center justify-between text-light-secondary dark:text-dark-secondary'>
            <span
              className='group flex items-center gap-1 text-sm'
              title={`${post.reply_count}件のつづき`}
            >
              <i className='grid h-8 w-8 place-items-center rounded-full'>
                <HeroIcon
                  className='h-5 w-5'
                  iconName='ChatBubbleOvalLeftIcon'
                />
              </i>
              {post.reply_count > 0 && post.reply_count}
            </span>
            <button
              className={cn(
                'group flex items-center gap-1 text-sm outline-none transition hover:text-accent-pink',
                liked && 'text-accent-pink'
              )}
              title='いいゾ〜これ'
              onClick={onLike}
              disabled={busy}
            >
              <i className='grid h-8 w-8 place-items-center rounded-full group-hover:bg-accent-pink/10'>
                <HeroIcon
                  className={cn('h-5 w-5', liked && 'fill-accent-pink')}
                  iconName='HeartIcon'
                />
              </i>
              {post.like_count > 0 && post.like_count}
            </button>
            <button
              className={cn(
                'group flex items-center gap-1 text-sm outline-none transition hover:text-accent-yellow',
                post.bookmarked && 'text-accent-yellow'
              )}
              title={post.bookmarked ? '★お気に入り' : '☆お気に入り'}
              onClick={onBookmark}
              disabled={busy}
            >
              <i className='grid h-8 w-8 place-items-center rounded-full group-hover:bg-accent-yellow/10'>
                <HeroIcon
                  className={cn(
                    'h-5 w-5',
                    post.bookmarked && 'fill-accent-yellow'
                  )}
                  iconName={post.bookmarked ? 'StarIcon' : 'StarIcon'}
                  solid={post.bookmarked}
                />
              </i>
            </button>
            <Link href={tweetLink}>
              <a
                className='group flex items-center outline-none transition hover:text-accent-blue'
                title='共有'
              >
                <i className='grid h-8 w-8 place-items-center rounded-full group-hover:bg-accent-blue/10'>
                  <HeroIcon className='h-5 w-5' iconName='ShareIcon' />
                </i>
              </a>
            </Link>
            <button
              className='group flex items-center outline-none transition hover:text-accent-red'
              title='削除'
              onClick={onDelete}
              disabled={busy}
            >
              <i className='grid h-8 w-8 place-items-center rounded-full group-hover:bg-accent-red/10'>
                <HeroIcon className='h-5 w-5' iconName='TrashIcon' />
              </i>
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}
