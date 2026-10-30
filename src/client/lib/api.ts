import { treaty } from '@elysiajs/eden';
import type { App } from '../../server/app';

const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';

export const eden = treaty<App>(origin, {
  fetch: {
    credentials: 'include'
  }
});

export async function apiFetch<T = any>(
  path: string,
  options: RequestInit = {}
): Promise<{ ok: boolean; status: number; data: T }> {
  const headers = new Headers(options.headers || {});
  if (
    options.body &&
    !(options.body instanceof FormData) &&
    !headers.has('Content-Type')
  ) {
    headers.set('Content-Type', 'application/json');
  }

  const res = await fetch(path, {
    ...options,
    headers,
    credentials: 'include'
  });

  let data: any = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }

  return {
    ok: res.ok,
    status: res.status,
    data
  };
}

