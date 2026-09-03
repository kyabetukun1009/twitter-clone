import { useState } from 'react';
import { useRouter } from 'next/router';
import { SEO } from '@components/common/seo';

export default function Gate(): JSX.Element {
  const router = useRouter();
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
      await router.replace('/home');
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
        <h1 className='text-xl font-bold text-white'>yajuter − 合言葉</h1>
        <p className='mt-1 text-sm text-gray-400'>
          推し活記録の入口だゾ。合言葉を入れてくれ。
        </p>
        <input
          className='mt-4 w-full rounded-xl border border-gray-700 bg-black px-4 py-3 text-white outline-none focus:border-[#f5a623]'
          type='password'
          autoComplete='current-password'
          placeholder='合言葉'
          value={password}
          onChange={(e) => setPassword(e.target.value)}
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
