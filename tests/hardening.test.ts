import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';

import { onRequest as secureAPI } from '../functions/api/_middleware';
import { onRequestGet } from '../functions/api/gigs';
import { getAllConcerts, loadManualConcerts, scrapeConcerts } from '../lib/concerts';
import { readManualConcertText } from '../lib/manual-concert-file';
import { securityHeaders } from '../lib/security-headers';
import { themeInitializationScript } from '../lib/theme-init';

test('theme initializes before React, honors saved preferences and survives blocked storage', () => {
  for (const saved of [null, 'light', 'dark', 'invalid', 'blocked']) {
    for (const systemDark of [false, true]) {
      // Run twice to exercise fresh loads and reloads with the same preference.
      for (let load = 0; load < 2; load++) {
        let dark: boolean | undefined;
        runInNewContext(themeInitializationScript, {
          localStorage: { getItem() {
            if (saved === 'blocked') throw new Error('Storage unavailable');
            return saved;
          } },
          matchMedia: () => ({ matches: systemDark }),
          document: { documentElement: { classList: { toggle(name: string, value: boolean) {
            assert.equal(name, 'dark');
            dark = value;
          } } } },
        });
        assert.equal(dark, saved === 'dark' || (saved !== 'light' && systemDark));
      }
    }
  }
});

test('static and API policies agree; API errors and redirects retain contracts', async () => {
  const rules = readFileSync('public/_headers', 'utf8');
  for (const [name, value] of Object.entries(securityHeaders)) {
    assert.ok(rules.includes(`  ${name}: ${value}\n`));
  }
  for (const status of [200, 303, 400, 503]) {
    const response = await secureAPI({
      request: new Request('https://www.georgehadow.com/api/contact'),
      next: async () => new Response('payload', { status, headers: {
        'Cache-Control': 'no-store', Location: '/contact?sent=1',
      } }),
    });
    assert.equal(response.status, status);
    assert.equal(await response.text(), 'payload');
    assert.equal(response.headers.get('Cache-Control'), 'no-store');
    assert.equal(response.headers.get('Location'), '/contact?sent=1');
    for (const [name, value] of Object.entries(securityHeaders)) {
      assert.equal(response.headers.get(name), value);
    }
    assert.equal(response.headers.get('Strict-Transport-Security'), 'max-age=31536000');
  }
  for (const url of ['http://localhost/api/gigs', 'https://preview.pages.dev/api/gigs']) {
    const response = await secureAPI({ request: new Request(url),
      next: async () => Response.json([]) });
    assert.equal(response.headers.has('Strict-Transport-Security'), false);
  }
});

const kuhnHTML = `<title>Tour Dates</title>${' '.repeat(1100)}
  <table><tr><td>Not a concert</td></tr></table>
  <table><tr><td>03.01.2027</td><td>Test City</td>
  <td><a href="/tickets">Test Venue</a></td></tr></table>`;
const labHTML = `<div class="event_listing"><a class="wpem-event-action-url" href="https://example.com">
  <h3 class="wpem-heading-text">Lab Venue</h3>
  <span class="wpem-event-date-time-text">02-01-2027 &gt; 19:00</span>
  <span class="wpem-event-location-text">Lab City</span></a></div>`;

test('shared scraper merges text/JSON concerts, sorts, and isolates upstream failures', async () => {
  const originalFetch = globalThis.fetch;
  try {
    const manualText = await readManualConcertText();
    const manual = loadManualConcerts(manualText);
    assert.ok(manual.some(gig => gig.venue === 'Rabbit Hole Theater'));
    assert.ok(manual.some(gig => gig.venue === 'Gramigna ARCI'));
    assert.equal(loadManualConcerts('# Comment\ninvalid\n\n').length,
      loadManualConcerts().length);

    globalThis.fetch = async input => new Response(
      String(input).includes('kuhnfumusic') ? kuhnHTML : labHTML);
    const gigs = await getAllConcerts(manualText);
    assert.ok(gigs.some(gig => gig.link === 'https://kuhnfumusic.com/tickets'));
    assert.ok(gigs.some(gig => gig.band === 'Labasheeda'));
    const timestamps = gigs.map(gig => {
      const [day, month, year] = gig.date.split('.').map(Number);
      return new Date(year, month - 1, day).getTime();
    });
    assert.deepEqual(timestamps, [...timestamps].sort((a, b) => a - b));

    // Invalid KUHN FU content must not prevent independent Labasheeda loading.
    globalThis.fetch = async input => new Response(
      String(input).includes('kuhnfumusic') ? 'Blocked' : labHTML);
    assert.equal((await scrapeConcerts())[0].band, 'Labasheeda');
    globalThis.fetch = async () => { throw new Error('Offline fixture'); };
    assert.deepEqual(await getAllConcerts(manualText), [...manual].sort((a, b) => {
      const date = (value: string) => value.split('.').reverse().join('');
      return date(a.date).localeCompare(date(b.date));
    }));
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('edge cache stores scraped gigs only; runtime text concerts stay fresh', async () => {
  const originalFetch = globalThis.fetch;
  const originalCaches = globalThis.caches;
  const cache = new Map<string, Response>();
  const pending: Promise<unknown>[] = [];
  let calls = 0;
  let manualText = '01.01.2027|Runtime Venue|Runtime City|';
  try {
    Object.defineProperty(globalThis, 'caches', { configurable: true, value: { default: {
      async match(key: Request) { return cache.get(key.url)?.clone(); },
      async put(key: Request, value: Response) { cache.set(key.url, value); },
    } } });
    globalThis.fetch = async input => {
      calls++;
      return new Response(String(input).includes('kuhnfumusic') ? kuhnHTML : labHTML);
    };
    const context = {
      request: new Request('https://www.georgehadow.com/api/gigs'),
      env: { ASSETS: { async fetch() { return new Response(manualText); } } },
      waitUntil(promise: Promise<unknown>) { pending.push(promise); },
    };
    const first = await onRequestGet(context);
    await Promise.all(pending);
    assert.equal(first.headers.get('Cache-Control'), 'no-store');
    assert.ok((await first.json()).some((gig: { venue: string }) => gig.venue === 'Runtime Venue'));
    manualText = '01.01.2027|Updated Venue|Runtime City|';
    const second = await onRequestGet(context);
    assert.ok((await second.json()).some((gig: { venue: string }) => gig.venue === 'Updated Venue'));
    assert.equal(calls, 2);
    const cached = await [...cache.values()][0].clone().json();
    assert.ok(cached.every((gig: { source: string }) => gig.source !== 'manual'));
  } finally {
    globalThis.fetch = originalFetch;
    Object.defineProperty(globalThis, 'caches', { configurable: true, value: originalCaches });
  }
});
