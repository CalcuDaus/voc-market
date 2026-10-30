import { and, eq, isNull, sql } from 'drizzle-orm';
import { db, pool } from './index';
import { products, schools, users } from './schema';

const UPPER_ACRONYMS = new Set([
  'SMK',
  'SMKN',
  'SMKS',
  'TI',
  'IT',
  'PGRI',
  'NU',
  'YP',
  'YPK',
  'BPPK',
  'DKI',
  'DIY',
  'II',
  'III',
  'IV',
  'VI',
  'VII',
  'VIII',
  'IX',
  'XI',
  'XII'
]);

export function normalizeSchoolName(raw: string): string {
  let cleaned = raw.trim().replace(/\s+/g, ' ');
  if (!cleaned) return '';

  cleaned = cleaned
    .replace(/^smk\s+negeri\b/i, 'SMKN')
    .replace(/^smk\s+swasta\b/i, 'SMKS')
    .replace(/^smkn\b/i, 'SMKN')
    .replace(/^smks\b/i, 'SMKS')
    .replace(/^smk\b/i, 'SMK');

  const words = cleaned.split(' ').map((word) => {
    const upper = word.toUpperCase();
    if (UPPER_ACRONYMS.has(upper) || /^\d+$/.test(word)) {
      return upper;
    }
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
  });

  return words.join(' ');
}

export function slugifyText(raw: string): string {
  return raw
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export async function resolveOrCreateSchool(params: {
  schoolId?: number | null;
  schoolName?: string | null;
  regionId?: number | null;
}): Promise<{ id: number; name: string; slug: string } | null> {
  if (params.schoolId && params.schoolId > 0) {
    const [byId] = await db
      .select()
      .from(schools)
      .where(eq(schools.id, params.schoolId))
      .limit(1);
    if (byId) {
      return { id: byId.id, name: byId.name, slug: byId.slug };
    }
  }

  const rawName = (params.schoolName || '').trim();
  if (!rawName) return null;

  const canonicalName = normalizeSchoolName(rawName);
  const slug = slugifyText(canonicalName);
  if (!slug) return null;

  const [existing] = await db.select().from(schools).where(eq(schools.slug, slug)).limit(1);
  if (existing) {
    return { id: existing.id, name: existing.name, slug: existing.slug };
  }

  const [inserted] = await db.insert(schools).values({
    name: canonicalName,
    slug,
    regionId: params.regionId ?? null,
    majors: []
  });

  return {
    id: inserted.insertId,
    name: canonicalName,
    slug
  };
}

export async function backfillSchools(): Promise<{
  schoolsCreatedOrLinked: number;
  usersUpdated: number;
  productsUpdated: number;
}> {
  const allUsers = await db.select().from(users);
  const touchedSchoolIds = new Set<number>();
  let usersUpdated = 0;

  for (const u of allUsers) {
    if (!u.schoolName || !u.schoolName.trim()) continue;
    const resolved = await resolveOrCreateSchool({
      schoolId: u.schoolId,
      schoolName: u.schoolName,
      regionId: u.regionId
    });
    if (!resolved) continue;

    touchedSchoolIds.add(resolved.id);

    if (u.schoolId !== resolved.id || u.schoolName !== resolved.name) {
      await db
        .update(users)
        .set({
          schoolId: resolved.id,
          schoolName: resolved.name
        })
        .where(eq(users.id, u.id));
      usersUpdated += 1;
    }
  }

  // Populate majors list & promote first verified teacher to isSchoolAdmin if none exists
  const allSchools = await db.select().from(schools);
  for (const sc of allSchools) {
    const members = await db.select().from(users).where(eq(users.schoolId, sc.id));
    if (members.length === 0) continue;

    const existingMajors = new Set<string>(Array.isArray(sc.majors) ? sc.majors : []);
    for (const m of members) {
      if (m.userType === 'smk' && m.major?.trim()) {
        existingMajors.add(m.major.trim());
      }
    }

    if (existingMajors.size > (sc.majors?.length ?? 0)) {
      await db
        .update(schools)
        .set({ majors: Array.from(existingMajors) })
        .where(eq(schools.id, sc.id));
    }

    const hasAdminTeacher = members.some((m) => m.userType === 'teacher' && m.isSchoolAdmin);
    if (!hasAdminTeacher) {
      const candidateTeacher =
        members.find((m) => m.userType === 'teacher' && m.isVerified) ||
        members.find((m) => m.userType === 'teacher');

      if (candidateTeacher) {
        await db
          .update(users)
          .set({ isSchoolAdmin: true })
          .where(eq(users.id, candidateTeacher.id));
      }
    }
  }

  // Sync products.schoolId from author's schoolId when missing
  const unlinkedPosts = await db
    .select({ postId: products.id, authorSchoolId: users.schoolId })
    .from(products)
    .innerJoin(users, eq(products.userId, users.id))
    .where(and(isNull(products.schoolId), sql`${users.schoolId} IS NOT NULL`));

  let productsUpdated = 0;
  for (const row of unlinkedPosts) {
    if (row.authorSchoolId) {
      await db
        .update(products)
        .set({ schoolId: row.authorSchoolId })
        .where(eq(products.id, row.postId));
      productsUpdated += 1;
    }
  }

  return {
    schoolsCreatedOrLinked: touchedSchoolIds.size,
    usersUpdated,
    productsUpdated
  };
}

if (import.meta.main) {
  console.log('Running backfillSchools()...');
  const summary = await backfillSchools();
  console.log('Backfill complete:', summary);
  await pool.end();
}

