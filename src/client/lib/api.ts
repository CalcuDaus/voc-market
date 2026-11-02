import { treaty } from '@elysiajs/eden';
import type { App } from '../../server/app';

const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';

export const eden = treaty<App>(origin, {
  fetch: {
    credentials: 'include'
  }
});

type UnauthorizedHandler = (data: any) => void;
let unauthorizedHandler: UnauthorizedHandler | null = null;

export function onUnauthorized(handler: UnauthorizedHandler): void {
  unauthorizedHandler = handler;
}

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

  if (
    res.status === 401 &&
    path !== '/api/auth/login' &&
    path !== '/api/auth/register' &&
    path !== '/api/auth/me' &&
    path !== '/api/auth/session'
  ) {
    if (unauthorizedHandler) {
      unauthorizedHandler(data);
    }
  }

  return {
    ok: res.ok,
    status: res.status,
    data
  };
}

