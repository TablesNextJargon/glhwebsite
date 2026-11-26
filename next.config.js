if (process.env.NODE_ENV === 'production' && !process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY) {
  throw new Error('NEXT_PUBLIC_TURNSTILE_SITE_KEY is required for production builds');
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  reactStrictMode: true,
  images: { unoptimized: true },
};

module.exports = nextConfig;
