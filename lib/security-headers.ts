// Keep the static Pages rules in public/_headers in sync (checked by test:hardening).
export const securityHeaders: Record<string, string> = {
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-Frame-Options': 'DENY',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https://i.ytimg.com",
    'frame-src https://www.youtube.com https://challenges.cloudflare.com',
    "connect-src 'self' https://challenges.cloudflare.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join('; '),
};

export function applySecurityHeaders(response: Response, request: Request): Response {
  const secured = new Response(response.body, response);
  for (const [name, value] of Object.entries(securityHeaders)) secured.headers.set(name, value);
  const url = new URL(request.url);
  if (url.protocol === 'https:' &&
      ['www.georgehadow.com', 'georgehadow.com'].includes(url.hostname)) {
    secured.headers.set('Strict-Transport-Security', 'max-age=31536000');
  }
  return secured;
}
