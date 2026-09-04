import { useState } from 'react';
import { SEO } from '@components/common/seo';

export default function Gate(): JSX.Element {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const res = await fetch('/api/yajuter/gate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });
      if (!res.ok) {
        setError('まずいですよ！（合言葉が違う）');
        return;
      }
      // Full reload so AuthContextProvider remounts with the fresh cookie.
      // (router.replace would reuse the already-mounted provider, which
      // fetched /me cookieless on /gate and would never retry.)
      window.location.assign('/home');
    } catch {
      setError('これもうわかんねぇな（通信失敗）');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className='grid min-h-screen place-items-center bg-black px-4'>
      <SEO title='合言葉 / yajuter' description='yajuter単独ゲート' />
      <form
        className='w-full max-w-sm rounded-2xl border border-gray-800 bg-[#0f1419] p-6'
        onSubmit={onSubmit}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          className='mx-auto h-16 w-16 rounded-full'
          src='/images/logo.png'
          alt='yajuter'
        />
        <h1 className='mt-2 text-center text-xl font-bold text-white'>
          yajuter − 合言葉
        </h1>
        <p className='mt-1 text-sm text-gray-400'>
          推し活記録の入口だゾ。合言葉を入れてくれ。
        </p>
        <input
          className='mt-4 w-full rounded-xl border border-gray-700 bg-black px-4 py-3 text-white outline-none focus:border-[#f5a623]'
          type='password'
          autoComplete='current-password'
          placeholder='合言葉'
          value={password}
          onChange={(e): void => setPassword(e.target.value)}
        />
        {error && <p className='mt-2 text-sm text-red-400'>{error}</p>}
        <button
          className='mt-4 w-full rounded-full bg-[#f5a623] py-3 font-bold text-black transition hover:brightness-110 disabled:opacity-50'
          type='submit'
          disabled={busy || !password}
        >
          {busy ? '確認中…' : 'やったぜ。（入る）'}
        </button>
      </form>
    </div>
  );
}
