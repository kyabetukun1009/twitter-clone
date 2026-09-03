import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { SEO } from '@components/common/seo';
import { Loading } from '@components/ui/loading';

// Single-user mode: no login screen, the gate already authenticated.
// Land straight on the timeline.
export default function Index(): JSX.Element {
  const { replace } = useRouter();

  useEffect(() => {
    void replace('/home');
  }, [replace]);

  return (
    <div className='grid min-h-screen place-items-center'>
      <SEO title='yajuter' description='推しかつ記録。野獣先輩ファンのための1人用SNS' />
      <Loading />
    </div>
  );
}
