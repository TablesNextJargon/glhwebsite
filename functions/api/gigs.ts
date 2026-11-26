import { loadManualConcerts, scrapeConcerts, sortGigsByDate } from '../../lib/concerts';
import { mergeGigs } from '../../lib/concert-dates';

interface GigsContext {
  request: Request;
  env: { ASSETS: { fetch(request: Request): Promise<Response> } };
  waitUntil(promise: Promise<unknown>): void;
}

// The Pages runtime provides the default edge cache.
declare const caches: CacheStorage & { default: Cache };

type Gig = Awaited<ReturnType<typeof scrapeConcerts>>[number];

// Only scraped gigs are cached. Manual gigs live in JSON and public/concerts.txt
// and are merged on every request, so a stale edge entry can never hide them.
const SCRAPED_CACHE_KEY = '/api/gigs/scraped';

async function readScrapedCache(key: Request): Promise<Gig[] | null> {
  const cached = await caches.default.match(key);
  if (!cached) return null;
  try {
    const data = await cached.json();
    return Array.isArray(data) ? data : null;
  } catch {
    return null;
  }
}

export async function onRequestGet(context: GigsContext): Promise<Response> {
  const key = new Request(new URL(SCRAPED_CACHE_KEY, context.request.url));
  let scrapedGigs = await readScrapedCache(key);

  if (!scrapedGigs || scrapedGigs.length === 0) {
    try {
      const freshGigs = await scrapeConcerts();
      if (freshGigs.length > 0) {
        scrapedGigs = freshGigs;
        const cacheResponse = Response.json(freshGigs, {
          headers: { 'Cache-Control': 'public, max-age=300, s-maxage=86400' }
        });
        context.waitUntil(caches.default.put(key, cacheResponse));
      } else {
        scrapedGigs = [];
      }
    } catch (error) {
      console.error('Concert scrape failed', error);
      scrapedGigs = [];
    }
  }

  let manualText = '';
  try {
    const response = await context.env.ASSETS.fetch(
      new Request(new URL('/concerts.txt', context.request.url))
    );
    if (!response.ok) throw new Error(`concerts.txt returned ${response.status}`);
    manualText = await response.text();
  } catch (error) {
    console.error('Failed to load concerts.txt:', error);
  }
  const gigs = sortGigsByDate(mergeGigs(loadManualConcerts(manualText), scrapedGigs));

  // The merged payload includes fresh manual gigs, so it must not be cached.
  return Response.json(gigs, {
    headers: { 'Cache-Control': 'no-store' }
  });
}
