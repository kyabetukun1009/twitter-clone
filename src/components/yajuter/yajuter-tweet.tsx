import { useState } from 'react';
import Link from 'next/link';
import cn from 'clsx';
import { fromISO } from '@lib/supabase/timestamp';
import {
  likePost,
  toggleBookmark,
  deletePost,
  toggleStamp,
  togglePin,
  editPost,
  imageUrl
} from '@lib/yajuter/api';
import { STAMPS, EMOTION_TAGS, MAX_POST_LEN } from '@lib/supabase/tables';
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
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(post.content);
  const [editTag, setEditTag] = useState(post.emotion_tag ?? '');
  const [editError, setEditError] = useState('');
  const tweetLink = `/tweet/${post.id}`;
  const liked = post.like_count > 0;
  const editable =
    (Date.now() - new Date(post.created_at).getTime()) / 1000 < 300;

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

  async function onStamp(stamp: string): Promise<void> {
    if (busy) return;
    setBusy(true);
    try {
      const { stamps } = await toggleStamp(post.id, stamp);
      onPatch(post.id, { stamps });
    } catch {
      // keep current stamps on failure
    } finally {
      setBusy(false);
    }
  }

  async function onPin(): Promise<void> {
    if (busy) return;
    setBusy(true);
    try {
      const { pinned } = await togglePin(post.id);
      onPatch(post.id, { pinned });
    } catch {
      // keep current pin on failure
    } finally {
      setBusy(false);
    }
  }

  async function onEditSave(): Promise<void> {
    if (busy) return;
    const text = editText.trim();
    if (!text || Array.from(text).length > MAX_POST_LEN) {
      setEditError('まずいですよ！（1〜810文字で）');
      return;
    }
    setBusy(true);
    setEditError('');
    try {
      const { post: updated } = await editPost(post.id, {
        content: text,
        emotion_tag: editTag || undefined
      });
      onPatch(post.id, {
        content: updated.content,
        emotion_tag: updated.emotion_tag,
        edited_at: updated.edited_at
      });
      setEditing(false);
    } catch {
      setEditError('これもうわかんねぇな（5分を過ぎたかも）');
    } finally {
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
          {post.image_path && (
            <a
              className='mt-2 block overflow-hidden rounded-2xl border border-light-border dark:border-dark-border'
              href={imageUrl(post.image_path)}
              target='_blank'
              rel='noreferrer'
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                className='max-h-96 w-full object-cover'
                src={imageUrl(post.image_path)}
                alt='投稿画像'
                loading='lazy'
              />
            </a>
          )}
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
            <button
              className={cn(
                'group flex items-center outline-none transition hover:text-accent-yellow',
                post.pinned && 'text-accent-yellow'
              )}
              title={post.pinned ? '📌ピン留め中' : 'ピン留め'}
              onClick={onPin}
              disabled={busy}
            >
              <i className='grid h-8 w-8 place-items-center rounded-full group-hover:bg-accent-yellow/10'>
                <HeroIcon
                  className='h-5 w-5'
                  iconName='BookmarkSquareIcon'
                  solid={post.pinned}
                />
              </i>
            </button>
            {editable && (
              <button
                className='group flex items-center outline-none transition hover:text-accent-blue'
                title='編集（投稿から5分以内）'
                onClick={(): void => {
                  setEditText(post.content);
                  setEditTag(post.emotion_tag ?? '');
                  setEditError('');
                  setEditing((v) => !v);
                }}
              >
                <i className='grid h-8 w-8 place-items-center rounded-full group-hover:bg-accent-blue/10'>
                  <HeroIcon className='h-5 w-5' iconName='PencilIcon' />
                </i>
              </button>
            )}
          </div>
          <div className='mt-1 flex flex-wrap gap-1.5'>
            {STAMPS.map((stamp) => {
              const count = post.stamps[stamp] ?? 0;
              return (
                <button
                  key={stamp}
                  className={cn(
                    'rounded-full border px-2.5 py-0.5 text-xs transition',
                    count > 0
                      ? 'border-main-accent bg-main-accent/10 font-bold text-main-accent'
                      : 'border-light-border text-light-secondary dark:border-dark-border dark:text-dark-secondary'
                  )}
                  title={`${stamp}スタンプを${count > 0 ? '外す' : '付ける'}`}
                  onClick={(): void => void onStamp(stamp)}
                  disabled={busy}
                >
                  {stamp}
                  {count > 0 && ` ${count}`}
                </button>
              );
            })}
          </div>
          {post.pinned && (
            <p className='mt-1 text-xs font-bold text-accent-yellow'>
              📌 タイムラインにピン留め中
            </p>
          )}
          {editing && (
            <div className='mt-2 flex flex-col gap-2 rounded-2xl border border-light-border p-3 dark:border-dark-border'>
              <textarea
                className='min-h-[64px] w-full resize-y bg-transparent outline-none'
                value={editText}
                onChange={(e): void => setEditText(e.target.value)}
              />
              <div className='flex items-center justify-between gap-2'>
                <select
                  className='rounded-full border border-light-border bg-transparent px-2 py-1 text-xs outline-none dark:border-dark-border'
                  value={editTag}
                  onChange={(e): void => setEditTag(e.target.value)}
                >
                  <option value=''>タグなし</option>
                  {EMOTION_TAGS.map((tag) => (
                    <option key={tag} value={`(${tag})`}>
                      ({tag})
                    </option>
                  ))}
                </select>
                <div className='flex gap-2'>
                  <button
                    className='rounded-full px-3 py-1 text-xs text-light-secondary dark:text-dark-secondary'
                    onClick={(): void => setEditing(false)}
                  >
                    やめる
                  </button>
                  <button
                    className='rounded-full bg-main-accent px-3 py-1 text-xs font-bold text-white disabled:opacity-50'
                    onClick={(): void => void onEditSave()}
                    disabled={busy}
                  >
                    保存
                  </button>
                </div>
              </div>
              {editError && (
                <p className='text-xs text-accent-red'>{editError}</p>
              )}
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
