/**
 * Client-Side XSS Protection & Input Sanitizer (Industry Standard)
 */

export function sanitizeInput(val: string): string {
  if (!val || typeof val !== 'string') return val;

  let cleaned = val;
  // Remove script tags and embedded content
  cleaned = cleaned.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  // Remove dangerous HTML tags
  cleaned = cleaned.replace(/<\/?(iframe|object|embed|applet|meta|base|form|link|style)\b[^>]*>/gi, '');
  // Neutralize javascript: or data: URIs
  cleaned = cleaned.replace(/(javascript|vbscript|data:text\/html)\s*:/gi, 'blocked:');
  // Strip inline event attributes
  cleaned = cleaned.replace(/\s+on[a-z]+\s*=\s*(?:'[^']*'|"[^"]*"|[^\s>]+)/gi, '');
  // Strip HTML comments
  cleaned = cleaned.replace(/<!--[\s\S]*?-->/g, '');

  return cleaned.trim();
}

/**
 * Escapes characters that could break out of HTML context.
 */
export function escapeHtml(str: string): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

