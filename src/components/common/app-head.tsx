import Head from 'next/head';

export function AppHead(): JSX.Element {
  return (
    <Head>
      <title>yajuter</title>
      <meta name='og:title' content='yajuter' />
      <meta property='og:image' content='/images/ogp.png' />
      <link rel='icon' href='/images/yajuter-emblem.png' />
      <link rel='manifest' href='/site.webmanifest' key='site-manifest' />
      <meta name='twitter:card' content='summary_large_image' />
    </Head>
  );
}
