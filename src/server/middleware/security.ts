export const SECURITY_HEADERS: Record<string, string> = {
  'X-Frame-Options': 'SAMEORIGIN',
  'X-Content-Type-Options': 'nosniff',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Content-Security-Policy':
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: https: blob:; connect-src 'self' ws: wss: http: https:; frame-ancestors 'self'; object-src 'none'; base-uri 'self';",
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Resource-Policy': 'same-origin'
};

export function applySecurityHeaders(headers: Record<string, string | number | undefined>): void {
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    headers[key] = value;
  }
}

/**
 * Enterprise-grade XSS Sanitization filter.
 * Neutralizes executable scripts, dangerous HTML tags, inline event attributes,
 * and malicious pseudo-protocols like javascript: and data:text/html.
 */
export function sanitizeXss(val: string): string {
  if (!val || typeof val !== 'string') return val;

  let cleaned = val;

  // 1. Remove script tags and embedded content
  cleaned = cleaned.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');

  // 2. Remove high-risk HTML tags
  cleaned = cleaned.replace(/<\/?(iframe|object|embed|applet|meta|base|form|link|style)\b[^>]*>/gi, '');

  // 3. Neutralize executable pseudo-protocols (javascript:, vbscript:, data:text/html)
  cleaned = cleaned.replace(/(javascript|vbscript|data:text\/html)\s*:/gi, 'blocked:');

  // 4. Strip inline event handlers: onclick, onerror, onload, onmouseover, onfocus, etc.
  cleaned = cleaned.replace(/\s+on[a-z]+\s*=\s*(?:'[^']*'|"[^"]*"|[^\s>]+)/gi, '');

  // 5. Remove HTML comments which could be used to bypass parsers
  cleaned = cleaned.replace(/<!--[\s\S]*?-->/g, '');

  return cleaned.trim();
}

/**
 * Deep recursive payload sanitizer for JSON bodies, query params, and route params.
 * Protects against XSS injection across all endpoints while preserving password strings.
 */
export function sanitizePayload<T>(
  input: T,
  skipKeys: string[] = ['password', 'confirmPassword', 'confirm_password']
): T {
  if (typeof input === 'string') {
    return sanitizeXss(input) as unknown as T;
  }

  if (Array.isArray(input)) {
    return input.map((item) => sanitizePayload(item, skipKeys)) as unknown as T;
  }

  if (
    input !== null &&
    typeof input === 'object' &&
    !(input instanceof Blob) &&
    !(input instanceof Date) &&
    typeof (input as any).pipe !== 'function'
  ) {
    const rec = input as Record<string, unknown>;
    for (const [key, value] of Object.entries(rec)) {
      if (!skipKeys.includes(key)) {
        rec[key] = sanitizePayload(value, skipKeys);
      }
    }
    return input;
  }

  return input;
}
