interface ContactContext {
  request: Request;
  env: { CONTACT_WORKER?: { fetch(request: Request): Promise<Response> } };
}

// Keep submissions same-origin and forward through a private Worker service binding.
export async function onRequest({ request, env }: ContactContext): Promise<Response> {
  if (!env.CONTACT_WORKER) {
    return Response.json({
      success: false,
      error: 'The contact form is temporarily unavailable. Please try again later.',
    }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }
  try {
    return await env.CONTACT_WORKER.fetch(request);
  } catch {
    return Response.json({
      success: false, error: 'Unable to send your message. Please try again later.',
    }, { status: 502, headers: { 'Cache-Control': 'no-store' } });
  }
}
