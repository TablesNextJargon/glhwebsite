import Head from 'next/head';
import { useRouter } from 'next/router';

const SITE_URL = 'https://www.georgehadow.com';

export default function SEO({ title, description, image = '/og-image-2026.jpg' }) {
  const router = useRouter();
  const canonicalUrl = `${SITE_URL}${router.pathname}`;
  const imageUrl = /^https?:\/\//.test(image)
    ? image
    : `${SITE_URL}${image.startsWith('/') ? '' : '/'}${image}`;

  return (
    <Head>
      <title>{title}</title>
      <link rel="canonical" href={canonicalUrl} />
      <meta name="description" content={description} />
      <meta property="og:image" content={imageUrl} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:image:type" content="image/jpeg" />
      <meta property="og:image:alt" content={title} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={canonicalUrl} />
      <meta name="twitter:image" content={imageUrl} />
      <meta name="twitter:image:alt" content={title} />
    </Head>
  );
}