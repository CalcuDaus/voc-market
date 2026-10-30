export const SECURITY_HEADERS: Record<string, string> = {
  'X-Frame-Options': 'SAMEORIGIN',
  'X-Content-Type-Options': 'nosniff',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()'
};

export function applySecurityHeaders(headers: Record<string, string | number | undefined>): void {
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    headers[key] = value;
  }
}

