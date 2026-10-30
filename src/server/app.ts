import { Elysia } from 'elysia';
import { cors } from '@elysiajs/cors';
import { existsSync } from 'node:fs';
import { join, normalize } from 'node:path';
import { applySecurityHeaders, SECURITY_HEADERS } from './middleware/security';
import { authRoutes } from './modules/auth.routes';
import { postsRoutes } from './modules/posts.routes';
import { ordersRoutes } from './modules/orders.routes';
import { teacherRoutes } from './modules/teacher.routes';
import { profileRoutes } from './modules/profile.routes';
import { wsRoutes } from './modules/ws.routes';
import { notificationsRoutes } from './modules/notifications.routes';
import { schoolsRoutes } from './modules/schools.routes';
import { requestsRoutes } from './modules/requests.routes';
import { talentRoutes } from './modules/talent.routes';
import { challengesRoutes } from './modules/challenges.routes';
import { adminRoutes } from './modules/admin.routes';
import { locationRoutes } from './modules/location.routes';
import { pricingRoutes } from './modules/pricing.routes';
import { sellerDashboardRoutes } from './modules/seller-dashboard.routes';
import { createCronPlugin } from './services/cron.service';
import { renderSpaHtmlWithOg } from './services/og.service';

function serveSafeStaticFile(baseDir: string, wildcardPath: string) {
  const cleanRel = normalize(wildcardPath).replace(/^(\.\.(\/|\\|$))+/, '');
  const fullPath = join(baseDir, cleanRel);
  if (!fullPath.startsWith(baseDir) || !existsSync(fullPath)) {
    return null;
  }
  return Bun.file(fullPath);
}

export function createApp() {
  const publicDir = join(process.cwd(), 'public');
  const distDir = join(process.cwd(), 'dist');

  const app = new Elysia()
    .use(
      cors({
        origin: true,
        credentials: true
      })
    )
    .use(createCronPlugin())
    .onAfterHandle(({ set }) => {
      applySecurityHeaders(set.headers);
    })
    .onError(({ set, error, code }) => {
      applySecurityHeaders(set.headers);
      if (code === 'NOT_FOUND') {
        set.status = 404;
        return { error: 'Rute tidak ditemukan.' };
      }
      console.error('[Server Error]', error);
      set.status = 500;
      return { error: 'Terjadi kesalahan pada server.' };
    })
    .get('/api/health', () => ({ ok: true }))
    .use(wsRoutes)
    .use(authRoutes)
    .use(postsRoutes)
    .use(ordersRoutes)
    .use(teacherRoutes)
    .use(profileRoutes)
    .use(notificationsRoutes)
    .use(schoolsRoutes)
    .use(requestsRoutes)
    .use(talentRoutes)
    .use(challengesRoutes)
    .use(adminRoutes)
    .use(locationRoutes)
    .use(pricingRoutes)
    .use(sellerDashboardRoutes)
    .get('/uploads/*', ({ params, set }) => {
      const file = serveSafeStaticFile(join(publicDir, 'uploads'), params['*']);
      if (!file) {
        set.status = 404;
        return 'Not Found';
      }
      return file;
    })
    .get('/images/*', ({ params, set }) => {
      const file = serveSafeStaticFile(join(publicDir, 'images'), params['*']);
      if (!file) {
        set.status = 404;
        return 'Not Found';
      }
      return file;
    })
    .get('/assets/*', ({ params, set }) => {
      const file = serveSafeStaticFile(join(distDir, 'assets'), params['*']);
      if (!file) {
        set.status = 404;
        return 'Not Found';
      }
      return file;
    })
    .get('/*', async ({ request, set }) => {
      const url = new URL(request.url);
      if (url.pathname.startsWith('/api/')) {
        set.status = 404;
        return { error: 'Endpoint API tidak ditemukan.' };
      }
      const html = await renderSpaHtmlWithOg(request.url);
      return new Response(html, {
        status: 200,
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          ...SECURITY_HEADERS
        }
      });
    });

  return app;
}

export type App = ReturnType<typeof createApp>;
