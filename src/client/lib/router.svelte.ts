class RouterState {
  pathname = $state(typeof window !== 'undefined' ? window.location.pathname : '/');
  search = $state(typeof window !== 'undefined' ? window.location.search : '');

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('popstate', () => {
        this.pathname = window.location.pathname;
        this.search = window.location.search;
      });
    }
  }

  get query(): URLSearchParams {
    return new URLSearchParams(this.search);
  }
}

export const router = new RouterState();

export function navigate(to: string, replace = false): void {
  if (typeof window === 'undefined') return;
  const url = new URL(to, window.location.origin);
  if (replace) {
    window.history.replaceState({}, '', url.pathname + url.search);
  } else {
    window.history.pushState({}, '', url.pathname + url.search);
  }
  router.pathname = url.pathname;
  router.search = url.search;
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

