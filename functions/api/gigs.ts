import { getAllConcerts } from '../../lib/concerts';

interface GigsContext {
  request: Request;
  waitUntil(promise: Promise<unknown>): void;
}

// The Pages runtime provides the default edge cache.
declare const caches: CacheStorage & { default: Cache };

export async function onRequestGet(context: GigsContext): Promise<Response> {
  const key = new Request(new URL('/api/gigs', context.request.url));
  const cached = await caches.default.match(key);
  if (cached) return cached;

  try {
    const gigs = await getAllConcerts();
    const response = Response.json(gigs, {
      headers: { 'Cache-Control': 'public, max-age=300, s-maxage=86400' }
    });
    context.waitUntil(caches.default.put(key, response.clone()));
    return response;
  } catch (error) {
    console.error('Concert refresh failed', error);
    return Response.json({ error: 'Unable to refresh concerts' }, { status: 502 });
  }
}
