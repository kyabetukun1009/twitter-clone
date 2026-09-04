import { useState, useEffect, useCallback } from 'react';
import cn from 'clsx';
import { fetchQuiz, answerQuiz } from '@lib/yajuter/api';
import { ProtectedLayout } from '@components/layout/common-layout';
import { MainLayout } from '@components/layout/main-layout';
import { Aside } from '@components/aside/aside';
import { SEO } from '@components/common/seo';
import { MainContainer } from '@components/home/main-container';
import { MainHeader } from '@components/home/main-header';
import { Loading } from '@components/ui/loading';
import { YajuterAside } from '@components/yajuter/yajuter-aside';
import type { QuizMode, QuizQuestion, QuizScore } from '@lib/yajuter/api';
import type { ReactElement, ReactNode } from 'react';

const MODES: { key: QuizMode; label: string }[] = [
  { key: 'normal', label: '全ジャンル' },
  { key: 'number', label: '数字限定' },
  { key: 'wild', label: '野獣語録限定' },
  { key: 'hard', label: '鬼畜モード' }
];

const BEST_OF: Record<QuizMode, keyof QuizScore> = {
  normal: 'quiz_best',
  number: 'quiz_best_number',
  wild: 'quiz_best_wild',
  hard: 'quiz_best_hard'
};

export default function Quiz(): JSX.Element {
  const [mode, setMode] = useState<QuizMode>('normal');
  const [question, setQuestion] = useState<QuizQuestion | null>(null);
  const [score, setScore] = useState<QuizScore | null>(null);
  const [total, setTotal] = useState(0);
  const [streak, setStreak] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback((m: QuizMode): void => {
    setLoading(true);
    setPicked(null);
    fetchQuiz(m)
      .then((body) => {
        setQuestion(body.question);
        setScore(body.score);
        setTotal(body.total);
      })
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load(mode);
  }, [mode, load]);

  async function pick(id: number): Promise<void> {
    if (!question || picked !== null) return;
    setPicked(id);
    const ok = id === question.answerId;
    const nextStreak = ok ? streak + 1 : 0;
    setStreak(nextStreak);
    try {
      const body = await answerQuiz(mode, nextStreak);
      setScore(body.score);
    } catch {
      // score save failed; streak still counts locally
    }
    setTimeout(() => load(mode), 1800);
  }

  return (
    <MainContainer>
      <SEO title='114514検定 / yajuter' description='語録クイズ' />
      <MainHeader title='114514検定' />
      <div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          className='h-32 w-full object-cover'
          src='/images/header-quiz.png'
          alt='クイズ'
        />
      </div>
      <div className='border-b border-light-border px-4 py-3 dark:border-dark-border'>
        <p className='text-sm text-light-secondary dark:text-dark-secondary'>
          {total}語録から出題。4択だ、どうぞ。
          {score && (
            <span className='ml-2'>
              {streak}連続正解中 / ベスト{score[BEST_OF[mode]]} /{' '}
              {score.quiz_played}回プレイ
            </span>
          )}
        </p>
        <div className='mt-2 flex flex-wrap gap-1.5'>
          {MODES.map(({ key, label }) => (
            <button
              key={key}
              className={cn(
                'rounded-full px-3 py-1 text-sm transition',
                mode === key
                  ? 'bg-main-accent font-bold text-white'
                  : 'bg-light-primary/5 dark:bg-dark-primary/10'
              )}
              onClick={(): void => {
                setMode(key);
                setStreak(0);
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <section className='p-3'>
        {loading || !question ? (
          <Loading className='mt-5' />
        ) : (
          <div className='rounded-2xl border border-light-border p-4 dark:border-dark-border'>
            <p className='text-sm text-light-secondary dark:text-dark-secondary'>
              この意味・使い方の語録は？
            </p>
            {question.meaning && (
              <p className='mt-1 font-bold'>意味: {question.meaning}</p>
            )}
            {question.usage_note && (
              <p className='mt-1 text-sm'>使い方: {question.usage_note}</p>
            )}
            {question.source && (
              <p className='mt-1 text-sm text-light-secondary dark:text-dark-secondary'>
                出典: {question.source}
              </p>
            )}
            <div className='mt-3 flex flex-col gap-2'>
              {question.options.map((opt) => {
                const isAnswer = opt.id === question.answerId;
                const isPicked = picked === opt.id;
                const revealed = picked !== null;
                return (
                  <button
                    key={opt.id}
                    className={cn(
                      'rounded-xl border px-4 py-2.5 text-left font-bold transition',
                      revealed && isAnswer
                        ? 'bg-main-accent/15 border-main-accent text-main-accent'
                        : revealed && isPicked
                        ? 'border-accent-red bg-accent-red/10 text-accent-red'
                        : 'border-light-border hover:border-main-accent dark:border-dark-border'
                    )}
                    disabled={revealed}
                    onClick={(): void => void pick(opt.id)}
                  >
                    「{opt.text}」
                  </button>
                );
              })}
            </div>
            {picked !== null && (
              <p className='mt-3 text-center font-extrabold'>
                {picked === question.answerId
                  ? `正解！やったぜ。（${streak}連続正解中）`
                  : `残念、まずいですよ！正解は「${question.answerText}」…†悔い改めて†`}
              </p>
            )}
          </div>
        )}
      </section>
    </MainContainer>
  );
}

Quiz.getLayout = (page: ReactElement): ReactNode => (
  <ProtectedLayout>
    <MainLayout>
      {page}
      <Aside>
        <YajuterAside />
      </Aside>
    </MainLayout>
  </ProtectedLayout>
);
