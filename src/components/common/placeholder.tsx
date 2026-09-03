import { SEO } from './seo';

export function Placeholder(): JSX.Element {
  return (
    <main className='flex min-h-screen items-center justify-center'>
      <SEO
        title='読み込み中 / yajuter'
        description='推しかつ記録。野獣先輩ファンのための1人用SNS'
        image='/images/ogp.png'
      />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        className='h-20 w-20 animate-pulse rounded-full'
        src='/images/yajuter-emblem.png'
        alt='読み込み中'
      />
    </main>
  );
}
