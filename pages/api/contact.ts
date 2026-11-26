import type { NextApiRequest, NextApiResponse } from 'next';

// Local Next.js development only. Production uses the Pages service binding.
export default async function handler(request: NextApiRequest, response: NextApiResponse) {
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    return response.status(405).json({ success: false, error: 'Method not allowed' });
  }
  response.setHeader('Cache-Control', 'no-store');
  if (process.env.NODE_ENV !== 'development') {
    return response.status(503).json({ success: false, error: 'Contact service unavailable.' });
  }
  try {
    const upstream = await fetch('http://127.0.0.1:8787/api/contact', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: request.headers.accept || 'application/json',
        Origin: request.headers.origin || '',
      },
      body: JSON.stringify(request.body),
      redirect: 'manual',
      signal: AbortSignal.timeout(25000),
    });
    response.setHeader('Content-Type', upstream.headers.get('Content-Type') || 'text/plain');
    if (upstream.status === 303) {
      response.setHeader('Location', '/contact?sent=1');
    }
    return response.status(upstream.status).send(await upstream.text());
  } catch {
    return response.status(503).json({
      success: false, error: 'The contact form is temporarily unavailable. Please try again later.',
    });
  }
}

export const config = { api: { bodyParser: { sizeLimit: '16kb' } } };
