import sharp from 'sharp';
import { sql } from 'drizzle-orm';
import { activeDatabaseUrl, db } from '../src/server/db';
import { rebuildDatabaseFromUri } from '../src/server/db/reset';
import { resetAllRateLimits } from '../src/server/middleware/rate-limit';
import { resetViewTracker } from '../src/server/modules/posts.routes';
import { createApp } from '../src/server/app';

if (!activeDatabaseUrl.includes('voc_market_test')) {
  throw new Error(
    `SAFETY ABORT: Tests must run against voc_market_test, got: ${activeDatabaseUrl}`
  );
}

let schemaInitialized = false;

export const testApp = createApp();

export async function resetTestState(): Promise<void> {
  if (!schemaInitialized) {
    await rebuildDatabaseFromUri(activeDatabaseUrl);
    schemaInitialized = true;
  } else {
    await db.execute(sql`SET FOREIGN_KEY_CHECKS = 0;`);
    await db.execute(sql`TRUNCATE TABLE product_daily_stats;`);
    await db.execute(sql`TRUNCATE TABLE user_badges;`);
    await db.execute(sql`TRUNCATE TABLE badges;`);
    await db.execute(sql`TRUNCATE TABLE subdistricts;`);
    await db.execute(sql`TRUNCATE TABLE reports;`);
    await db.execute(sql`TRUNCATE TABLE notifications;`);
    await db.execute(sql`TRUNCATE TABLE certificates;`);
    await db.execute(sql`TRUNCATE TABLE challenge_submissions;`);
    await db.execute(sql`TRUNCATE TABLE challenges;`);
    await db.execute(sql`TRUNCATE TABLE saved_talents;`);
    await db.execute(sql`TRUNCATE TABLE hiring_invitations;`);
    await db.execute(sql`TRUNCATE TABLE reviews;`);
    await db.execute(sql`TRUNCATE TABLE orders;`);
    await db.execute(sql`TRUNCATE TABLE job_proposals;`);
    await db.execute(sql`TRUNCATE TABLE job_requests;`);
    await db.execute(sql`TRUNCATE TABLE post_likes;`);
    await db.execute(sql`TRUNCATE TABLE products;`);
    await db.execute(sql`TRUNCATE TABLE categories;`);
    await db.execute(sql`TRUNCATE TABLE sessions;`);
    await db.execute(sql`TRUNCATE TABLE users;`);
    await db.execute(sql`TRUNCATE TABLE schools;`);
    await db.execute(sql`TRUNCATE TABLE regions;`);
    await db.execute(sql`SET FOREIGN_KEY_CHECKS = 1;`);
  }
  resetAllRateLimits();
  resetViewTracker();
}

export async function createFakePngFile(filename = 'test.png'): Promise<File> {
  const buf = await sharp({
    create: {
      width: 320,
      height: 240,
      channels: 3,
      background: { r: 37, g: 99, b: 235 }
    }
  })
    .png()
    .toBuffer();

  return new File([new Uint8Array(buf)], filename, { type: 'image/png' });
}

export function extractSessionCookie(res: Response): string {
  const raw = res.headers.get('set-cookie') || '';
  const match = raw.match(/voc_session=[^;]+/);
  return match ? match[0] : '';
}
