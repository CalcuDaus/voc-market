import { Elysia } from 'elysia';
import { cron } from '@elysiajs/cron';
import { and, eq, lte } from 'drizzle-orm';
import { activeDatabaseUrl, db } from '../db';
import { challenges, hiringInvitations, jobRequests, sessions } from '../db/schema';
import { StatsService } from './stats.service';

export async function runCleanupExpiredSessions(): Promise<void> {
  await db.delete(sessions).where(lte(sessions.expiresAt, new Date()));
}

export async function runExpireRequests(): Promise<void> {
  await db
    .update(jobRequests)
    .set({ status: 'expired' })
    .where(and(eq(jobRequests.status, 'open'), lte(jobRequests.expiresAt, new Date())));
}

export async function runSyncChallengeStatus(): Promise<void> {
  await db
    .update(challenges)
    .set({ status: 'judging' })
    .where(and(eq(challenges.status, 'open'), lte(challenges.submissionDeadline, new Date())));
}

export async function runExpireInvitations(): Promise<void> {
  await db
    .update(hiringInvitations)
    .set({ status: 'expired' })
    .where(
      and(eq(hiringInvitations.status, 'pending'), lte(hiringInvitations.expiresAt, new Date()))
    );
}

export async function runRecalculateStats(): Promise<void> {
  await StatsService.refreshAllStudents();
}

export function createCronPlugin() {
  const isTestEnv =
    process.env.NODE_ENV === 'test' ||
    process.env.BUN_ENV === 'test' ||
    activeDatabaseUrl.includes('voc_market_test');

  if (isTestEnv) {
    return new Elysia({ name: 'voc-cron-disabled' });
  }

  return new Elysia({ name: 'voc-cron-jobs' })
    .use(
      cron({
        name: 'expireRequests',
        pattern: '*/15 * * * *',
        async run() {
          try {
            await runExpireRequests();
          } catch (err) {
            console.error('[Cron expireRequests]', err);
          }
        }
      })
    )
    .use(
      cron({
        name: 'syncChallengeStatus',
        pattern: '*/10 * * * *',
        async run() {
          try {
            await runSyncChallengeStatus();
          } catch (err) {
            console.error('[Cron syncChallengeStatus]', err);
          }
        }
      })
    )
    .use(
      cron({
        name: 'expireInvitations',
        pattern: '0 * * * *',
        async run() {
          try {
            await runExpireInvitations();
          } catch (err) {
            console.error('[Cron expireInvitations]', err);
          }
        }
      })
    )
    .use(
      cron({
        name: 'recalculateStats',
        pattern: '0 3 * * *',
        async run() {
          try {
            await runRecalculateStats();
          } catch (err) {
            console.error('[Cron recalculateStats]', err);
          }
        }
      })
    )
    .use(
      cron({
        name: 'cleanupExpiredSessions',
        pattern: '0 * * * *',
        async run() {
          try {
            await runCleanupExpiredSessions();
          } catch (err) {
            console.error('[Cron cleanupExpiredSessions]', err);
          }
        }
      })
    );
}

