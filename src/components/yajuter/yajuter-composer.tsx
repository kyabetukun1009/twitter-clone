import { useState, useRef } from 'react';
import { EMOTION_TAGS, MAX_POST_LEN } from '@lib/supabase/tables';
import { createPost, uploadImage } from '@lib/yajuter/api';
import { UserAvatar } from '@components/user/user-avatar';
import { HeroIcon } from '@components/ui/hero-icon';
import type { YPost } from '@lib/yajuter/api';
import type { User } from '@lib/types/user';

type YajuterComposerProps = {
  owner: User;
  replyTo?: number;
  onPosted: (post: YPost) => void;
};

export function YajuterComposer({
  owner,
  replyTo,
  onPosted
}: YajuterComposerProps): JSX.Element {
  const [content, setContent] = useState('');
  const [emotionTag, setEmotionTag] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const len = Array.from(content).length;
  const over = len === 0 || len > MAX_POST_LEN;

  function pickImage(e: React.ChangeEvent<HTMLInputElement>): void {
    const file = e.target.files?.[0] ?? null;
    setPreviewUrl((old) => {
      if (old) URL.revokeObjectURL(old);
      return file ? URL.createObjectURL(file) : null;
    });
    setImageFile(file);
  }

  function clearImage(): void {
    setPreviewUrl((old) => {
      if (old) URL.revokeObjectURL(old);
      return null;
    });
    setImageFile(null);
    if (fileRef.current) fileRef.current.value = '';
  }

  async function onSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    if (over || busy) return;
    setBusy(true);
    setError('');
    try {
      let image_path: string | undefined;
      if (imageFile) {
        const uploaded = await uploadImage(imageFile);
        image_path = uploaded.path;
      }
      const { post } = await createPost({
        content,
        emotion_tag: emotionTag || undefined,
        reply_to: replyTo,
        image_path
      });
      onPosted({ ...post, reply_count: 0, stamps: {} });
      setContent('');
      setEmotionTag('');
      clearImage();
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
            placeholder={
              replyTo ? 'つづきをどうぞ（返信）' : 'いまどうしてる？（迫真）'
            }
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
          {previewUrl && (
            <div className='relative w-fit'>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                className='max-h-48 rounded-2xl border border-light-border dark:border-dark-border'
                src={previewUrl}
                alt='添付プレビュー'
              />
              <button
                className='absolute right-2 top-2 rounded-full bg-black/60 px-2 py-1 text-xs font-bold text-white'
                type='button'
                onClick={clearImage}
              >
                ✕
              </button>
            </div>
          )}
          {error && <p className='text-sm text-accent-red'>{error}</p>}
          <div className='flex items-center justify-between'>
            <div>
              <input
                ref={fileRef}
                className='hidden'
                type='file'
                accept='image/jpeg,image/png,image/gif,image/webp'
                onChange={pickImage}
              />
              <button
                className='grid h-9 w-9 place-items-center rounded-full text-main-accent transition hover:bg-main-accent/10'
                type='button'
                title='画像をつける（5MBまで）'
                onClick={(): void => fileRef.current?.click()}
              >
                <HeroIcon className='h-5 w-5' iconName='PhotoIcon' />
              </button>
            </div>
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
