import { applySecurityHeaders } from '../../lib/security-headers';

interface SecurityContext {
  request: Request;
  next(): Promise<Response>;
}

// Pages _headers covers assets only; wrap all API responses, including errors/redirects.
export async function onRequest(context: SecurityContext): Promise<Response> {
  return applySecurityHeaders(await context.next(), context.request);
}
