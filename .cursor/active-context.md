> **BrainSync Context Pumper** 🧠
> Dynamically loaded for active file: `src\client\lib\auth.svelte.ts` (Domain: **Frontend (React/UI)**)

### 📐 Frontend (React/UI) Conventions & Fixes
- **[convention] Replaced auth StatsService — wraps unsafe operation in error boundary — confirmed 4x**: - import { challenges, hiringInvitations, jobRequests, sessions } from '../db/schema';
+ import { challenges, hiringInvitations, jobRequests } from '../db/schema';
- import { StatsService } from './stats.service';
+ import { challenges, hiringInvitations, jobRequests, sessions } from '../db/schema';
- 
+ import { StatsService } from './stats.service';
- export async function runCleanupExpiredSessions(): Promise<void> {
+ 
-   await db.delete(sessions).where(lte(sessions.expiresAt, new Date()));
+ export async function runCleanupExpiredSessions(): Promise<void> {
- }
+   await db.delete(sessions).where(lte(sessions.expiresAt, new Date()));
- 
+ }
- export async function runExpireRequests(): Promise<void> {
+ 
-   await db
+ export async function runExpireRequests(): Promise<void> {
-     .update(jobRequests)
+   await db
-     .set({ status: 'expired' })
+     .update(jobRequests)
-     .where(and(eq(jobRequests.status, 'open'), lte(jobRequests.expiresAt, new Date())));
+     .set({ status: 'expired' })
- }
+     .where(and(eq(jobRequests.status, 'open'), lte(jobRequests.expiresAt, new Date())));
- 
+ }
- export async function runSyncChallengeStatus(): Promise<void> {
+ 
-   await db
+ export async function runSyncChallengeStatus(): Promise<void> {
-     .update(challenges)
+   await db
-     .set({ status: 'judging' })
+     .update(challenges)
-     .where(and(eq(challenges.status, 'open'), lte(challenges.submissionDeadline, new Date())));
+     .set({ status: 'judging' })
- }
+     .where(and(eq(challenges.status, 'open'), lte(challenges.submissionDeadline, new Date())));
- 
+ }
- export async function runExpireInvitations(): Promise<void> {
+ 
-   await db
+ export async function runExpireInvitations(): Promise<void> {
-     .update(hiringInvitations)
+   await db
-     .set({ status: 'expired' })
+     .update(hiringInvitations)
-     .where(
+     .set({ status: 'expired' })
-       and(eq(hiringInvitations.status, 'pending'), lte(hiringInvitations.expiresAt, n
… [diff truncated]

📌 IDE AST Context: Modified symbols likely include [runCleanupExpiredSessions, runExpireRequests, runSyncChallengeStatus, runExpireInvitations, runRecalculateStats]
- **[convention] Patched security issue ImageValidationError — uses a proper password hashing ... — confirmed 12x**: -   sanitizeSelfUser,
+   sanitizeSelfUser
-   touchSession
+   sanitizeSelfUser,
- } from '../middleware/auth';
+   touchSession
- import { sanitizeXss } from '../middleware/security';
+ } from '../middleware/auth';
- import { attachRateLimitHeaders, checkRateLimit, getClientIp } from '../middleware/rate-limit';
+ import { checkRateLimit, getClientIp } from '../middleware/rate-limit';
- import { ImageValidationError, saveUploadedWebp } from '../services/image.service';
+ import { sanitizeXss } from '../middleware/security';
- import { getUnreadNotificationsCount } from '../services/notify.service';
+ import { attachRateLimitHeaders, checkRateLimit, getClientIp } from '../middleware/rate-limit';
- import { StatsService } from '../services/stats.service';
+ import { ImageValidationError, saveUploadedWebp } from '../services/image.service';
- 
+ import { getUnreadNotificationsCount } from '../services/notify.service';
- export const authRoutes = new Elysia({ prefix: '/api/auth' })
+ import { StatsService } from '../services/stats.service';
-   .get('/session', async ({ request }) => {
+ 
-     const ctx = await resolveSessionContextFromRequest(request);
+ export const authRoutes = new Elysia({ prefix: '/api/auth' })
-     if (!ctx.user || !ctx.session) {
+   .get('/session', async ({ request }) => {
-       return {
+     const ctx = await resolveSessionContextFromRequest(request);
-         authenticated: false,
+     if (!ctx.user || !ctx.session) {
-         user: null,
+       return {
-         expiresAt: null,
+         authenticated: false,
-         remainingSeconds: 0,
+         user: null,
-         isRemembered: false
+         expiresAt: null,
-       };
+         remainingSeconds: 0,
-     }
+         isRemembered: false
-     return {
+       };
-       authenticated: true,
+     }
-       user: sanitizeSelfUser(ctx.user),
+     return {
-       expiresAt: ctx.session.expiresAt.toISOString(),
+       authenticated: true,
-       remainingSeconds: ctx.ses
… [diff truncated]

📌 IDE AST Context: Modified symbols likely include [authRoutes]
