import type { InferEnv, UnwrapConfig } from 'cf/config';
import type { contactWorker } from '../cloudflare.config';

export type ContactEnv = InferEnv<UnwrapConfig<typeof contactWorker>>;

interface Verification {
  success?: boolean;
  action?: string;
  hostname?: string;
}

const MAX_BODY_BYTES = 16384;
const enquiryTypes = new Set(['Booking', 'Collaboration', 'Press', 'Other']);

function respond(request: Request, status: number, message: string): Response {
  const headers = { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' };
  if (request.headers.get('Accept')?.includes('text/html')) {
    if (status === 200) {
      return new Response(null, {
        status: 303, headers: { ...headers, Location: '/contact?sent=1' },
      });
    }
    // Only fixed application messages are rendered here, never submitted data.
    return new Response(
      `<!doctype html><html lang="en"><meta charset="utf-8">` +
      `<meta name="viewport" content="width=device-width,initial-scale=1">` +
      `<title>Contact | George Hadow</title><main><h1>Message could not be sent</h1>` +
      `<p>${message}</p><p><a href="/contact">Return to the contact form</a></p></main></html>`,
      { status, headers: { ...headers, 'Content-Type': 'text/html; charset=utf-8' } },
    );
  }
  return Response.json(
    status === 200 ? { success: true, message } : { success: false, error: message },
    { status, headers },
  );
}

async function readBody(request: Request): Promise<string> {
  const reader = request.body?.getReader();
  if (!reader) return '';
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_BODY_BYTES) {
      await reader.cancel();
      throw new RangeError('Body too large');
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder('utf-8', { fatal: true, ignoreBOM: false }).decode(bytes);
}

export async function handleContact(
  request: Request,
  env: ContactEnv,
  verifyFetch: typeof fetch = fetch,
): Promise<Response> {
  if (new URL(request.url).pathname !== '/api/contact') {
    return new Response('Not found', { status: 404 });
  }
  if (request.method !== 'POST') {
    return new Response('Method not allowed', {
      status: 405, headers: { Allow: 'POST', 'Cache-Control': 'no-store' },
    });
  }
  const hostnames = new Set((env.TURNSTILE_HOSTNAMES || '')
    .split(',').map(h => h.trim()).filter(Boolean));
  const origins = new Set(Array.from(hostnames, hostname =>
    hostname === 'localhost' || hostname === '127.0.0.1'
      ? `http://${hostname}:3000` : `https://${hostname}`,
  ));
  if (!env.TURNSTILE_SECRET || !env.EMAIL || !env.CONTACT_TO ||
      !env.CONTACT_FROM || !hostnames.size) {
    return respond(request, 503, 'The contact form is temporarily unavailable. Please try again later.');
  }
  if (!origins.has(request.headers.get('Origin') || '')) {
    return respond(request, 403, 'Please submit your message from the contact page.');
  }
  if (Number(request.headers.get('Content-Length')) > MAX_BODY_BYTES) {
    return respond(request, 413, 'Your message is too large. Please shorten it and try again.');
  }
  const contentType = request.headers.get('Content-Type')?.split(';')[0].trim();
  if (contentType !== 'application/x-www-form-urlencoded' && contentType !== 'application/json') {
    return respond(request, 415, 'Unsupported form submission. Please use the contact page.');
  }
  let fields: Record<string, unknown>;
  try {
    const body = await readBody(request);
    if (contentType === 'application/json') {
      const parsed: unknown = JSON.parse(body);
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        throw new Error('Invalid form');
      }
      fields = parsed as Record<string, unknown>;
    } else {
      const params = new URLSearchParams(body);
      if (new Set(params.keys()).size !== Array.from(params.keys()).length) {
        throw new Error('Duplicate fields');
      }
      fields = Object.fromEntries(params);
    }
  } catch (error) {
    return respond(request, error instanceof RangeError ? 413 : 400, 'Invalid submission. Please try again.');
  }
  if (typeof fields.website !== 'undefined' &&
      (typeof fields.website !== 'string' || fields.website.trim())) {
    return respond(request, 400, 'Invalid submission. Please try again.');
  }
  const limits: Record<string, number> = {
    name: 100, email: 254, enquiry: 30, subject: 200, message: 2000,
  };
  const clean: Record<string, string> = {};
  for (const [field, limit] of Object.entries(limits)) {
    const value = fields[field];
    if (typeof value !== 'string' || !value.trim() || value.length > limit || value.includes('\0')) {
      return respond(request, 400, 'Please complete all required fields within the displayed limits.');
    }
    clean[field] = value.trim();
  }
  if (!enquiryTypes.has(clean.enquiry) ||
      !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(clean.email) ||
      [clean.name, clean.email, clean.subject].some(value => /[\r\n]/.test(value))) {
    return respond(request, 400, 'Please check your name, email address, enquiry type, and subject.');
  }
  const token = fields['cf-turnstile-response'];
  if (typeof token !== 'string' || !token.trim() || token.length > 2048) {
    return respond(request, 403, 'Please complete the security check and try again.');
  }
  try {
    const body = new URLSearchParams({ secret: env.TURNSTILE_SECRET, response: token });
    const ip = request.headers.get('CF-Connecting-IP');
    if (ip) body.set('remoteip', ip);
    const response = await verifyFetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST', body, signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) throw new Error('Verification unavailable');
    const result: Verification | null = await response.json();
    if (result?.success !== true || result.action !== 'contact' ||
        typeof result.hostname !== 'string' || !hostnames.has(result.hostname)) {
      return respond(request, 403, 'The security check expired or failed. Please verify again.');
    }
  } catch {
    return respond(request, 503, 'The security check is temporarily unavailable. Please try again.');
  }
  const text = [
    'New website enquiry', '', `Enquiry: ${clean.enquiry}`, `Name: ${clean.name}`,
    `Email: ${clean.email}`, `Subject: ${clean.subject}`, '', clean.message,
  ].join('\n');
  try {
    await env.EMAIL.send({
      to: env.CONTACT_TO,
      from: { email: env.CONTACT_FROM, name: 'George Hadow Website' },
      replyTo: { email: clean.email, name: clean.name },
      subject: `[${clean.enquiry}] ${clean.subject}`,
      text,
    });
    return respond(request, 200, 'Thank you for your message! George will get back to you soon.');
  } catch {
    console.error(JSON.stringify({ event: 'contact_email_failed' }));
    return respond(request, 502, 'Your message could not be sent. Please try again later.');
  }
}

export default {
  fetch(request: Request, env: ContactEnv): Promise<Response> {
    return handleContact(request, env);
  },
};
