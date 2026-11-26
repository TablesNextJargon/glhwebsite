import { Html, Head, Main, NextScript } from 'next/document';

import { themeInitializationScript } from '../lib/theme-init';

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        {/* Blocking by design: apply the theme before the body can paint. */}
        <script dangerouslySetInnerHTML={{ __html: themeInitializationScript }} />
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
