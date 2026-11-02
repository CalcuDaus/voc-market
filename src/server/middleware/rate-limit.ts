interface BucketEntry {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, BucketEntry>();

// Background interval to prune expired buckets and prevent memory leaks
const cleanupInterval = setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of buckets.entries()) {
    if (entry.resetAt <= now) {
      buckets.delete(key);
    }
  }
}, 30_000);

if (cleanupInterval && typeof cleanupInterval.unref === 'function') {
  cleanupInterval.unref();
}

export interface RateLimitResult {
  allowed: boolean;
  retryAfterSec: number;
  remaining: number;
  limit: number;
  resetEpoch: number;
}

export function checkRateLimit(
  namespace: string,
  identifier: string,
  maxRequests: number,
  windowMs = 60_000
): RateLimitResult {
  const now = Date.now();
  const key = `${namespace}:${identifier}`;
  const existing = buckets.get(key);

  if (!existing || existing.resetAt <= now) {
    const resetAt = now + windowMs;
    buckets.set(key, { count: 1, resetAt });
    return {
      allowed: true,
      retryAfterSec: 0,
      remaining: maxRequests - 1,
      limit: maxRequests,
      resetEpoch: Math.ceil(resetAt / 1000)
    };
  }

  const resetEpoch = Math.ceil(existing.resetAt / 1000);

  if (existing.count >= maxRequests) {
    const retryAfterSec = Math.max(1, Math.ceil((existing.resetAt - now) / 1000));
    return {
      allowed: false,
      retryAfterSec,
      remaining: 0,
      limit: maxRequests,
      resetEpoch
    };
  }

  existing.count += 1;
  const remaining = Math.max(0, maxRequests - existing.count);

  return {
    allowed: true,
    retryAfterSec: 0,
    remaining,
    limit: maxRequests,
    resetEpoch
  };
}

export function attachRateLimitHeaders(
  headers: Record<string, string | number | undefined>,
  result: RateLimitResult
): void {
  headers['X-RateLimit-Limit'] = String(result.limit);
  headers['X-RateLimit-Remaining'] = String(result.remaining);
  headers['X-RateLimit-Reset'] = String(result.resetEpoch);
  if (!result.allowed) {
    headers['Retry-After'] = String(result.retryAfterSec);
  }
}

export function checkGlobalApiRateLimit(request: Request): RateLimitResult {
  const ip = getClientIp(request);
  // High threshold for general browsing/API requests (150 requests per minute per IP)
  return checkRateLimit('global_api', ip, 150, 60_000);
}

export function resetAllRateLimits(): void {
  buckets.clear();
}

export function getClientIp(request: Request): string {
  // Support Cloudflare, reverse proxy, and direct IP
  const cfIp = request.headers.get('cf-connecting-ip');
  if (cfIp) return cfIp.trim();

  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }

  const realIp = request.headers.get('x-real-ip');
  if (realIp) {
    return realIp.trim();
  }

  return '127.0.0.1';
}
