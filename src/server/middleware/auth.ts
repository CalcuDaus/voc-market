import { createHash, randomBytes } from 'node:crypto';
import { and, eq, gt } from 'drizzle-orm';
import { db } from '../db';
import { sessions, users, type JobPreferences } from '../db/schema';

export type UserRow = typeof users.$inferSelect;

export interface PublicUserDto {
  id: number;
  name: string;
  username: string;
  avatarUrl: string;
  userType: UserRow['userType'];
  schoolName: string | null;
  schoolId: number | null;
  regionId: number | null;
  isSchoolAdmin: boolean;
  isAdmin: boolean;
  major: string | null;
  skills: string[];
  businessName: string | null;
  businessType: string | null;
  companyName: string | null;
  companySector: string | null;
  companyWebsite: string | null;
  isCompanyVerified: boolean;
  companyVerifiedAt: string | null;
  studentStatus: UserRow['studentStatus'];
  graduationYear: number | null;
  openToWork: boolean;
  headline: string | null;
  jobPreferences: JobPreferences | null;
  statCompletedOrders: number;
  statAvgRating: number;
  statReviewsCount: number;
  statCertificatesCount: number;
  talentScore: number;
  bio: string | null;
  acceptingOrders: boolean;
  isVerified: boolean;
  verifiedAt: string | null;
  createdAt: string;
}

export interface SelfUserDto extends PublicUserDto {
  firstName: string | null;
  lastName: string | null;
  email: string;
  phoneNumber: string | null;
  nisn: string | null;
  nip: string | null;
  companyNib: string | null;
}

const COOKIE_NAME = process.env.SESSION_COOKIE_NAME || 'voc_session';

export function hashToken(raw: string): string {
  return createHash('sha256').update(raw).digest('hex');
}

export function getAvatarUrl(user: Pick<UserRow, 'avatar' | 'name' | 'username'>): string {
  if (user.avatar) {
    if (
      user.avatar.startsWith('http://') ||
      user.avatar.startsWith('https://') ||
      user.avatar.startsWith('/')
    ) {
      return user.avatar;
    }
    return `/uploads/${user.avatar}`;
  }
  const label = encodeURIComponent(user.name || user.username || 'VOC');
  return `https://ui-avatars.com/api/?name=${label}&background=2563eb&color=fff&rounded=true&bold=true`;
}

export function parseSkills(skills: string | null): string[] {
  if (!skills) return [];
  return skills
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

export function sanitizePublicUser(user: UserRow): PublicUserDto {
  return {
    id: user.id,
    name: user.name,
    username: user.username,
    avatarUrl: getAvatarUrl(user),
    userType: user.userType,
    schoolName: user.schoolName,
    schoolId: user.schoolId ?? null,
    regionId: user.regionId ?? null,
    isSchoolAdmin: Boolean(user.isSchoolAdmin),
    isAdmin: Boolean(user.isAdmin) || user.userType === 'admin',
    major: user.major,
    skills: parseSkills(user.skills),
    businessName: user.businessName,
    businessType: user.businessType,
    companyName: user.companyName,
    companySector: user.companySector,
    companyWebsite: user.companyWebsite,
    isCompanyVerified: Boolean(user.companyVerifiedAt),
    companyVerifiedAt: user.companyVerifiedAt ? user.companyVerifiedAt.toISOString() : null,
    studentStatus: user.studentStatus ?? null,
    graduationYear: user.graduationYear ?? null,
    openToWork: Boolean(user.openToWork),
    headline: user.headline ?? null,
    jobPreferences: user.jobPreferences ?? null,
    statCompletedOrders: Number(user.statCompletedOrders ?? 0),
    statAvgRating: Number(user.statAvgRating ?? 0),
    statReviewsCount: Number(user.statReviewsCount ?? 0),
    statCertificatesCount: Number(user.statCertificatesCount ?? 0),
    talentScore: Number(user.talentScore ?? 0),
    bio: user.bio,
    acceptingOrders: Boolean(user.acceptingOrders),
    isVerified: Boolean(user.isVerified),
    verifiedAt: user.verifiedAt ? user.verifiedAt.toISOString() : null,
    createdAt: user.createdAt.toISOString()
  };
}

export function sanitizeSelfUser(user: UserRow): SelfUserDto {
  return {
    ...sanitizePublicUser(user),
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    phoneNumber: user.phoneNumber,
    nisn: user.nisn,
    nip: user.nip,
    companyNib: user.companyNib
  };
}

export function extractSessionTokenFromCookieHeader(
  cookieHeader: string | null | undefined
): string | null {
  if (!cookieHeader) return null;
  const parts = cookieHeader.split(';');
  for (const part of parts) {
    const [k, ...rest] = part.trim().split('=');
    if (k === COOKIE_NAME) {
      return decodeURIComponent(rest.join('='));
    }
  }
  return null;
}

export function extractSessionTokenFromRequest(request: Request): string | null {
  return extractSessionTokenFromCookieHeader(request.headers.get('cookie'));
}

export async function createSession(
  userId: number,
  remember = false
): Promise<{ rawToken: string; maxAgeSec: number; expiresAt: Date }> {
  const rawToken = randomBytes(32).toString('hex');
  const hashed = hashToken(rawToken);
  // Remember Me: 30 days (2,592,000 sec). Normal Session: 2 hours (7,200 sec)
  const maxAgeSec = remember ? 30 * 86400 : 2 * 3600;
  const expiresAt = new Date(Date.now() + maxAgeSec * 1000);

  await db.insert(sessions).values({
    id: hashed,
    userId,
    expiresAt
  });

  return { rawToken, maxAgeSec, expiresAt };
}

export interface SessionContext {
  user: UserRow | null;
  session: {
    id: string;
    expiresAt: Date;
    remainingSeconds: number;
    isRemembered: boolean;
  } | null;
}

export async function resolveSessionContextFromRequest(request: Request): Promise<SessionContext> {
  const rawToken = extractSessionTokenFromRequest(request);
  if (!rawToken) return { user: null, session: null };
  const hashed = hashToken(rawToken);

  const rows = await db
    .select({ user: users, session: sessions })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(and(eq(sessions.id, hashed), gt(sessions.expiresAt, new Date())))
    .limit(1);

  if (!rows[0]) {
    return { user: null, session: null };
  }

  const sess = rows[0].session;
  const remainingSeconds = Math.max(0, Math.round((sess.expiresAt.getTime() - Date.now()) / 1000));
  const totalDuration = sess.expiresAt.getTime() - sess.createdAt.getTime();
  const isRemembered = totalDuration > 86400 * 2 * 1000;

  return {
    user: rows[0].user,
    session: {
      id: sess.id,
      expiresAt: sess.expiresAt,
      remainingSeconds,
      isRemembered
    }
  };
}

export async function touchSession(rawToken: string, extendSec = 7200): Promise<Date | null> {
  const hashed = hashToken(rawToken);
  const rows = await db
    .select()
    .from(sessions)
    .where(and(eq(sessions.id, hashed), gt(sessions.expiresAt, new Date())))
    .limit(1);

  if (!rows[0]) return null;

  const current = rows[0];
  const totalDuration = current.expiresAt.getTime() - current.createdAt.getTime();
  const isRemembered = totalDuration > 86400 * 2 * 1000;

  let newExpiresAt: Date;
  if (!isRemembered) {
    newExpiresAt = new Date(Date.now() + extendSec * 1000);
  } else {
    const remainingMs = current.expiresAt.getTime() - Date.now();
    if (remainingMs < 15 * 86400 * 1000) {
      newExpiresAt = new Date(Date.now() + 30 * 86400 * 1000);
    } else {
      newExpiresAt = current.expiresAt;
    }
  }

  await db.update(sessions).set({ expiresAt: newExpiresAt }).where(eq(sessions.id, hashed));
  return newExpiresAt;
}

export async function resolveUserFromCookieHeader(
  cookieHeader: string | null | undefined
): Promise<UserRow | null> {
  const rawToken = extractSessionTokenFromCookieHeader(cookieHeader);
  if (!rawToken) return null;
  const hashed = hashToken(rawToken);

  const rows = await db
    .select({ user: users })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(and(eq(sessions.id, hashed), gt(sessions.expiresAt, new Date())))
    .limit(1);

  return rows[0]?.user ?? null;
}

export async function resolveUserFromRequest(request: Request): Promise<UserRow | null> {
  return resolveUserFromCookieHeader(request.headers.get('cookie'));
}

export async function destroySessionFromRequest(request: Request): Promise<void> {
  const rawToken = extractSessionTokenFromRequest(request);
  if (!rawToken) return;
  const hashed = hashToken(rawToken);
  await db.delete(sessions).where(eq(sessions.id, hashed));
}

export function buildSessionCookie(rawToken: string, maxAgeSec: number): string {
  return `${COOKIE_NAME}=${encodeURIComponent(rawToken)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAgeSec}`;
}

export function buildClearSessionCookie(): string {
  return `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}
