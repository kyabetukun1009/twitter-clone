import Link from 'next/link';
import { SEO } from '@components/common/seo';

export default function NotFound(): JSX.Element {
  return (
    <main className='mx-auto flex min-h-screen w-full max-w-xl flex-col items-center justify-center gap-4 px-4 text-center'>
      <SEO
        title='見つからない / yajuter'
        description='そのページは存在しないゾ'
        image='/images/ogp.png'
      />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        className='w-full max-w-md rounded-2xl border border-light-border dark:border-dark-border'
        src='/images/art-404.png'
        alt='空っぽの球場'
      />
      <h1 className='text-2xl font-extrabold'>ここには何もないゾ…</h1>
      <p className='text-light-secondary dark:text-dark-secondary'>
        終わり！閉廷！以上！皆解散！
      </p>
      <Link href='/home'>
        <a className='rounded-full bg-main-accent px-6 py-2 font-bold text-white transition hover:brightness-110'>
          ホームに戻る
        </a>
      </Link>
    </main>
  );
}
