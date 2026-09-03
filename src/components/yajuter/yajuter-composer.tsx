import { useState } from 'react';
import { EMOTION_TAGS, MAX_POST_LEN } from '@lib/supabase/tables';
import { createPost } from '@lib/yajuter/api';
import { UserAvatar } from '@components/user/user-avatar';
import type { YPost } from '@lib/yajuter/api';
import type { User } from '@lib/types/user';

type YajuterComposerProps = {
  owner: User;
  onPosted: (post: YPost) => void;
};

export function YajuterComposer({
  owner,
  onPosted
}: YajuterComposerProps): JSX.Element {
  const [content, setContent] = useState('');
  const [emotionTag, setEmotionTag] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const len = Array.from(content).length;
  const over = len === 0 || len > MAX_POST_LEN;

  async function onSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    if (over || busy) return;
    setBusy(true);
    setError('');
    try {
      const { post } = await createPost({
        content,
        emotion_tag: emotionTag || undefined
      });
      onPosted({ ...post, reply_count: 0 });
      setContent('');
      setEmotionTag('');
    } catch {
      setError('まずいですよ！（投稿に失敗）');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      className='border-b border-light-border px-4 py-3 dark:border-dark-border'
      onSubmit={onSubmit}
    >
      <div className='grid grid-cols-[auto,1fr] gap-x-3'>
        <UserAvatar
          src={owner.photoURL}
          alt={owner.name}
          username={owner.username}
        />
        <div className='flex min-w-0 flex-col gap-2'>
          <textarea
            className='min-h-[80px] w-full resize-y bg-transparent text-xl outline-none placeholder:text-light-secondary dark:placeholder:text-dark-secondary'
            placeholder='いまどうしてる？（迫真）'
            value={content}
            onChange={(e): void => setContent(e.target.value)}
          />
          <div className='flex items-center justify-between gap-2'>
            <select
              className='rounded-full border border-light-border bg-transparent px-3 py-1 text-sm outline-none dark:border-dark-border'
              value={emotionTag}
              onChange={(e): void => setEmotionTag(e.target.value)}
            >
              <option value=''>感情タグなし</option>
              {EMOTION_TAGS.map((tag) => (
                <option key={tag} value={`(${tag})`}>
                  ({tag})
                </option>
              ))}
            </select>
            <span
              className={
                len > MAX_POST_LEN
                  ? 'text-sm font-bold text-accent-red'
                  : 'text-sm text-light-secondary dark:text-dark-secondary'
              }
            >
              {len} / {MAX_POST_LEN}
            </span>
          </div>
          {error && <p className='text-sm text-accent-red'>{error}</p>}
          <div className='flex justify-end'>
            <button
              className='rounded-full bg-main-accent px-5 py-1.5 font-bold text-white transition enabled:hover:brightness-110 disabled:opacity-50'
              type='submit'
              disabled={over || busy}
            >
              {busy ? '投稿中…' : 'やったぜ。（投稿）'}
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}
