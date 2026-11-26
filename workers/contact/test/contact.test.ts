import assert from 'node:assert/strict';
import { test } from 'node:test';

import { handleContact } from '../src/index.ts';
import { onRequest } from '../../../functions/api/contact.ts';

const validFields = {
  name: 'A Music Promoter', email: 'promoter@example.com', enquiry: 'Booking',
  subject: 'Concert enquiry', message: 'Please get in touch about our festival.',
  website: '', 'cf-turnstile-response': 'fresh-token',
};

function harness(options = {}) {
  const sent = [];
  const verified = [];
  const env = {
    CONTACT_TO: 'private@example.com', CONTACT_FROM: 'website@example.com',
    TURNSTILE_SECRET: 'test-secret', TURNSTILE_HOSTNAMES: 'www.georgehadow.com',
    EMAIL: { send: async message => { sent.push(message); return { messageId: 'test' }; } },
    ...options,
  };
  const verify = async (_url, init) => {
    verified.push(init);
    return Response.json({ success: true, hostname: 'www.georgehadow.com', action: 'contact' });
  };
  const request = (fields = validFields, headers = {}) => new Request(
    'https://www.georgehadow.com/api/contact', {
      method: 'POST', headers: { Origin: 'https://www.georgehadow.com', ...headers },
      body: new URLSearchParams(fields),
    },
  );
  return { env, sent, verified, verify, request };
}

test('native form fields are forwarded only after verification, using a private recipient and Reply-To', async () => {
  const h = harness();
  const response = await handleContact(h.request({ ...validFields, to: 'attacker@example.com' }), h.env, h.verify);
  assert.equal(response.status, 200);
  assert.equal(h.verified.length, 1);
  assert.equal(h.verified[0].body.get('secret'), 'test-secret');
  assert.equal(h.verified[0].body.get('response'), 'fresh-token');
  assert.equal(h.sent.length, 1);
  assert.equal(h.sent[0].to, 'private@example.com');
  assert.equal(h.sent[0].replyTo.email, validFields.email);
  assert.equal(h.sent[0].subject, '[Booking] Concert enquiry');
  assert.equal(h.sent[0].text.includes(validFields.message), true);
  assert.equal((await response.text()).includes('private@example.com'), false);
});

test('JSON submissions are supported', async () => {
  const h = harness();
  const request = new Request('https://www.georgehadow.com/api/contact', {
    method: 'POST', headers: { Origin: 'https://www.georgehadow.com', 'Content-Type': 'application/json' },
    body: JSON.stringify(validFields),
  });
  assert.equal((await handleContact(request, h.env, h.verify)).status, 200);
});

test('native browser submission redirects after delivery and does not expose the recipient', async () => {
  const h = harness();
  const response = await handleContact(h.request(validFields, { Accept: 'text/html' }), h.env, h.verify);
  assert.equal(response.status, 303);
  assert.equal(response.headers.get('Location'), '/contact?sent=1');
  assert.equal(response.headers.get('Cache-Control'), 'no-store');
});

test('unverified, forged, expired, replayed, wrong-action and wrong-host tokens never send mail', async () => {
  for (const result of [
    { success: false, 'error-codes': ['timeout-or-duplicate'] },
    { success: false, 'error-codes': ['invalid-input-response'] },
    { success: 'true', hostname: 'www.georgehadow.com', action: 'contact' },
    { success: true, hostname: 'attacker.example', action: 'contact' },
    { success: true, hostname: 'localhost', action: 'contact' },
    { success: true, hostname: 'www.georgehadow.com', action: 'login' }, null,
  ]) {
    const h = harness();
    assert.equal((await handleContact(h.request(), h.env, async () => Response.json(result))).status, 403);
    assert.equal(h.sent.length, 0);
  }
});

test('missing tokens are rejected without calling Siteverify', async () => {
  const h = harness();
  const response = await handleContact(h.request({ ...validFields, 'cf-turnstile-response': '' }), h.env, h.verify);
  assert.equal(response.status, 403);
  assert.equal(h.verified.length, 0);
  assert.equal(h.sent.length, 0);
});

test('Siteverify outages and malformed replies fail closed', async () => {
  for (const verify of [
    async () => { throw new Error('timeout'); },
    async () => new Response('unavailable', { status: 503 }),
    async () => new Response('invalid JSON'),
  ]) {
    const h = harness();
    assert.equal((await handleContact(h.request(), h.env, verify)).status, 503);
    assert.equal(h.sent.length, 0);
  }
});

test('required fields, invalid types, limits, email syntax, header injection and honeypots are enforced', async () => {
  for (const fields of [
    { ...validFields, name: '   ' }, { ...validFields, message: 'a'.repeat(2001) },
    { ...validFields, email: 'not-an-email' }, { ...validFields, subject: 'hello\r\nBcc: attack@example.com' },
    { ...validFields, enquiry: 'Unknown' }, { ...validFields, website: 'https://spam.example' },
  ]) {
    const h = harness();
    assert.equal((await handleContact(h.request(fields), h.env, h.verify)).status, 400);
    assert.equal(h.verified.length, 0);
    assert.equal(h.sent.length, 0);
  }
});

test('invalid JSON shapes and duplicate form fields cannot bypass validation', async () => {
  for (const body of ['null', '[]', '"string"', '{', '{"name":{}}']) {
    const h = harness();
    const request = new Request('https://www.georgehadow.com/api/contact', {
      method: 'POST', headers: { Origin: 'https://www.georgehadow.com', 'Content-Type': 'application/json' }, body,
    });
    assert.equal((await handleContact(request, h.env, h.verify)).status, 400);
    assert.equal(h.sent.length, 0);
  }
  const h = harness();
  const request = h.request();
  const duplicate = new Request(request.url, {
    method: 'POST', headers: request.headers, body: new URLSearchParams(validFields).toString() + '&email=other@example.com',
  });
  assert.equal((await handleContact(duplicate, h.env, h.verify)).status, 400);
});

test('streamed oversized bodies are rejected even without a Content-Length', async () => {
  const h = harness();
  const request = h.request({ ...validFields, message: 'x'.repeat(20000) });
  assert.equal(request.headers.has('Content-Length'), false);
  assert.equal((await handleContact(request, h.env, h.verify)).status, 413);
  assert.equal(h.sent.length, 0);
});

test('foreign or missing origins and unsupported methods cannot send mail', async () => {
  const h = harness();
  for (const origin of ['', 'https://evil.example', 'http://www.georgehadow.com']) {
    assert.equal((await handleContact(h.request(validFields, { Origin: origin }), h.env, h.verify)).status, 403);
  }
  assert.equal((await handleContact(new Request('https://www.georgehadow.com/api/contact'), h.env, h.verify)).status, 405);
  assert.equal(h.sent.length, 0);
});

test('missing configuration and delivery failures never report success or expose addresses', async () => {
  for (const options of [{ TURNSTILE_SECRET: '' }, { CONTACT_TO: '' }, { TURNSTILE_HOSTNAMES: '' }]) {
    const h = harness(options);
    assert.equal((await handleContact(h.request(), h.env, h.verify)).status, 503);
    assert.equal(h.sent.length, 0);
  }
  const h = harness({ EMAIL: { send: async () => { throw new Error('private@example.com'); } } });
  const response = await handleContact(h.request(), h.env, h.verify);
  assert.equal(response.status, 502);
  assert.equal((await response.text()).includes('private@example.com'), false);
});

test('Pages forwards the full request to its private service binding and handles a missing binding', async () => {
  const h = harness();
  const response = await onRequest({ request: h.request(), env: {
    CONTACT_WORKER: { fetch: request => handleContact(request, h.env, h.verify) },
  } });
  assert.equal(response.status, 200);
  assert.equal(h.sent.length, 1);
  const unavailable = await onRequest({ request: h.request(), env: {} });
  assert.equal(unavailable.status, 503);
});
