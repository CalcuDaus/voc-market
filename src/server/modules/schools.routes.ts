import { Elysia } from 'elysia';
import { and, asc, desc, eq, inArray, isNull, like, or, sql } from 'drizzle-orm';
import { db } from '../db';
import {
  categories,
  certificates,
  challenges,
  orders,
  products,
  regions,
  schools,
  users
} from '../db/schema';
import { resolveUserFromRequest, sanitizePublicUser } from '../middleware/auth';
import { escapeLikePattern, formatPostPrice } from './posts.routes';
import { ImageValidationError, saveUploadedWebp } from '../services/image.service';
import { normalizeIndoPhone } from '../services/whatsapp.service';
import { CERTIFICATE_TYPE_LABELS, POST_TYPE_LABELS } from '../../shared/constants';

function buildOfficialSchoolWaUrl(phone: string | null, schoolName: string): string | null {
  const norm = normalizeIndoPhone(phone);
  if (!norm) return null;
  const text = `Halo Humas / Unit Produksi TeFa ${schoolName}, saya melihat Etalase Sekolah di VOC-Market dan ingin bertanya mengenai kerja sama / pemesanan produk siswa.`;
  return `https://wa.me/${norm}?text=${encodeURIComponent(text)}`;
}

export const schoolsRoutes = new Elysia({ prefix: '/api' })
  .get('/regions', async ({ query }) => {
    const conditions = [];
    const province = String(query.province ?? '').trim();
    if (province) {
      conditions.push(eq(regions.province, province));
    }

    const q = String(query.q ?? '').trim().slice(0, 80);
    if (q.length >= 2) {
      const esc = escapeLikePattern(q);
      conditions.push(or(like(regions.name, `%${esc}%`), like(regions.province, `%${esc}%`))!);
    }

    const rows = await db
      .select()
      .from(regions)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(asc(regions.province), asc(regions.name));

    return {
      items: rows
    };
  })

  .get('/schools', async ({ query }) => {
    const page = Math.max(1, Number(query.page || 1));
    const limit = Math.min(50, Math.max(1, Number(query.limit || 20)));
    const offset = (page - 1) * limit;

    const conditions = [];
    const regionId = Number(query.regionId || 0);
    if (regionId > 0) {
      conditions.push(eq(schools.regionId, regionId));
    }
    if (query.hasTefa === '1' || query.hasTefa === 'true') {
      conditions.push(eq(schools.hasTefa, true));
    }
    if (query.verifiedOnly === '1' || query.verifiedOnly === 'true') {
      conditions.push(eq(schools.isVerified, true));
    }

    const q = String(query.q ?? '').trim().slice(0, 100);
    if (q.length >= 1) {
      const esc = escapeLikePattern(q);
      conditions.push(
        or(
          like(schools.name, `%${esc}%`),
          like(schools.npsn, `%${esc}%`),
          like(schools.address, `%${esc}%`)
        )!
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [{ total }] = await db
      .select({ total: sql<number>`COUNT(*)` })
      .from(schools)
      .where(whereClause);

    const rows = await db
      .select({
        school: schools,
        region: regions
      })
      .from(schools)
      .leftJoin(regions, eq(schools.regionId, regions.id))
      .where(whereClause)
      .orderBy(desc(schools.isVerified), asc(schools.name))
      .limit(limit)
      .offset(offset);

    const schoolIds = rows.map((r) => r.school.id);
    const studentCountMap = new Map<number, number>();
    const worksCountMap = new Map<number, { total: number; tefa: number }>();

    if (schoolIds.length > 0) {
      const stuAgg = await db
        .select({
          schoolId: users.schoolId,
          cnt: sql<number>`COUNT(*)`
        })
        .from(users)
        .where(and(inArray(users.schoolId, schoolIds), eq(users.userType, 'smk')))
        .groupBy(users.schoolId);

      for (const s of stuAgg) {
        if (s.schoolId) studentCountMap.set(s.schoolId, Number(s.cnt || 0));
      }

      const prodAgg = await db
        .select({
          schoolId: products.schoolId,
          total: sql<number>`COUNT(*)`,
          tefa: sql<number>`SUM(CASE WHEN ${products.isTefa} = 1 THEN 1 ELSE 0 END)`
        })
        .from(products)
        .where(and(inArray(products.schoolId, schoolIds), eq(products.status, 'published')))
        .groupBy(products.schoolId);

      for (const p of prodAgg) {
        if (p.schoolId) {
          worksCountMap.set(p.schoolId, {
            total: Number(p.total || 0),
            tefa: Number(p.tefa || 0)
          });
        }
      }
    }

    return {
      items: rows.map(({ school, region }) => {
        const w = worksCountMap.get(school.id) ?? { total: 0, tefa: 0 };
        const fallbackLogo = `https://ui-avatars.com/api/?name=${encodeURIComponent(
          school.name
        )}&background=1d4ed8&color=fff&bold=true&size=256`;

        return {
          id: school.id,
          npsn: school.npsn,
          name: school.name,
          slug: school.slug,
          regionId: school.regionId,
          regionName: region?.name ?? null,
          province: region?.province ?? null,
          address: school.address,
          logoUrl: school.logo || fallbackLogo,
          coverImageUrl: school.coverImage,
          description: school.description,
          majors: school.majors ?? [],
          hasTefa: Boolean(school.hasTefa),
          isVerified: Boolean(school.isVerified),
          studentsCount: studentCountMap.get(school.id) ?? 0,
          worksCount: w.total,
          tefaWorksCount: w.tefa
        };
      }),
      total: Number(total || 0),
      page,
      totalPages: Math.max(1, Math.ceil(Number(total || 0) / limit))
    };
  })

  .get('/schools/:slug', async ({ request, params, set }) => {
    const slug = String(params.slug || '').trim().toLowerCase();
    const currentUser = await resolveUserFromRequest(request);

    const rows = await db
      .select({ school: schools, region: regions })
      .from(schools)
      .leftJoin(regions, eq(schools.regionId, regions.id))
      .where(eq(schools.slug, slug))
      .limit(1);

    if (!rows[0]) {
      set.status = 404;
      return { error: 'Etalase sekolah tidak ditemukan.' };
    }

    const { school, region } = rows[0];

    const schoolStudents = await db
      .select()
      .from(users)
      .where(and(eq(users.schoolId, school.id), eq(users.userType, 'smk')))
      .orderBy(desc(users.talentScore), desc(users.isVerified), desc(users.id));

    const schoolTeachers = await db
      .select()
      .from(users)
      .where(and(eq(users.schoolId, school.id), eq(users.userType, 'teacher')));

    const workRows = await db
      .select({
        post: products,
        author: users,
        category: categories
      })
      .from(products)
      .innerJoin(users, eq(products.userId, users.id))
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .where(
        and(
          eq(products.status, 'published'),
          or(eq(products.schoolId, school.id), eq(users.schoolId, school.id))
        )
      )
      .orderBy(desc(products.isTefa), desc(products.isVerifiedByTeacher), desc(products.createdAt));

    const studentIds = schoolStudents.map((s) => s.id);
    let totalCompletedOrders = 0;
    let schoolCerts: {
      code: string;
      type: 'winner' | 'runner_up' | 'finalist' | 'participant';
      typeLabel: string;
      title: string;
      issuerName: string;
      issuedAt: string;
      challengeSlug: string | null;
      student: { name: string; username: string; avatarUrl: string; major: string | null };
    }[] = [];

    if (studentIds.length > 0) {
      const [{ ordCnt }] = await db
        .select({ ordCnt: sql<number>`COUNT(*)` })
        .from(orders)
        .where(and(inArray(orders.sellerId, studentIds), eq(orders.status, 'completed')));
      totalCompletedOrders = Number(ordCnt || 0);

      const certRows = await db
        .select({
          cert: certificates,
          student: users,
          challengeSlug: challenges.slug
        })
        .from(certificates)
        .innerJoin(users, eq(certificates.userId, users.id))
        .leftJoin(challenges, eq(certificates.challengeId, challenges.id))
        .where(and(inArray(certificates.userId, studentIds), isNull(certificates.revokedAt)))
        .orderBy(desc(certificates.issuedAt));

      schoolCerts = certRows.map(({ cert, student, challengeSlug }) => {
        const pub = sanitizePublicUser(student);
        return {
          code: cert.code,
          type: cert.type,
          typeLabel: CERTIFICATE_TYPE_LABELS[cert.type],
          title: cert.title,
          issuerName: cert.issuerName,
          issuedAt: cert.issuedAt.toISOString(),
          challengeSlug: challengeSlug ?? null,
          student: {
            name: pub.name,
            username: pub.username,
            avatarUrl: pub.avatarUrl,
            major: pub.major
          }
        };
      });
    }

    const formattedWorks = workRows.map(({ post, author, category }) => ({
      id: post.id,
      type: post.type,
      typeLabel: POST_TYPE_LABELS[post.type],
      name: post.name,
      code: post.code,
      categoryId: post.categoryId,
      categoryName: category?.name ?? null,
      description: post.description,
      imageUrl: post.image,
      price: post.price,
      priceMin: post.priceMin,
      priceMax: post.priceMax,
      formattedPrice: formatPostPrice(post),
      stock: post.stock,
      projectLink: post.projectLink,
      likesCount: post.likesCount,
      viewsCount: post.viewsCount,
      sharesCount: post.sharesCount,
      isLiked: false,
      isVerifiedByTeacher: Boolean(post.isVerifiedByTeacher),
      teacherNote: post.teacherNote,
      isTefa: Boolean(post.isTefa),
      tefaUnit: post.tefaUnit,
      avgRating: 0,
      reviewsCount: 0,
      createdAt: post.createdAt.toISOString(),
      author: sanitizePublicUser(author)
    }));

    const tefaWorks = formattedWorks.filter((w) => w.isTefa);

    const canManage = Boolean(
      currentUser &&
        ((currentUser.userType === 'teacher' &&
          currentUser.isSchoolAdmin &&
          currentUser.schoolId === school.id) ||
          currentUser.isAdmin ||
          currentUser.userType === 'admin')
    );

    const fallbackLogo = `https://ui-avatars.com/api/?name=${encodeURIComponent(
      school.name
    )}&background=1d4ed8&color=fff&bold=true&size=256`;

    return {
      school: {
        id: school.id,
        npsn: school.npsn,
        name: school.name,
        slug: school.slug,
        regionId: school.regionId,
        regionName: region?.name ?? null,
        province: region?.province ?? null,
        address: school.address,
        logoUrl: school.logo || fallbackLogo,
        coverImageUrl: school.coverImage,
        description: school.description,
        majors: school.majors ?? [],
        hasTefa: Boolean(school.hasTefa),
        tefaDescription: school.tefaDescription,
        officialPhone: school.officialPhone,
        officialWhatsappUrl: buildOfficialSchoolWaUrl(school.officialPhone, school.name),
        website: school.website,
        isVerified: Boolean(school.isVerified),
        canManage,
        stats: {
          totalStudents: schoolStudents.length,
          verifiedStudents: schoolStudents.filter((s) => s.isVerified).length,
          openToWorkStudents: schoolStudents.filter((s) => s.openToWork).length,
          totalWorks: formattedWorks.length,
          tefaWorksCount: tefaWorks.length,
          totalCompletedOrders,
          certificatesCount: schoolCerts.length
        },
        teachers: schoolTeachers.map(sanitizePublicUser),
        works: formattedWorks,
        tefaWorks,
        topStudents: schoolStudents.map(sanitizePublicUser),
        achievements: schoolCerts
      }
    };
  })

  .put('/schools/:slug/manage', async ({ request, params, body, set }) => {
    const currentUser = await resolveUserFromRequest(request);
    if (!currentUser) {
      set.status = 401;
      return { error: 'Silakan masuk terlebih dahulu.' };
    }

    const slug = String(params.slug || '').trim().toLowerCase();
    const [school] = await db.select().from(schools).where(eq(schools.slug, slug)).limit(1);
    if (!school) {
      set.status = 404;
      return { error: 'Sekolah tidak ditemukan.' };
    }

    const isAuthorizedSchoolAdmin =
      currentUser.userType === 'teacher' &&
      Boolean(currentUser.isSchoolAdmin) &&
      currentUser.schoolId === school.id;
    const isPlatformAdmin = Boolean(currentUser.isAdmin) || currentUser.userType === 'admin';

    if (!isAuthorizedSchoolAdmin && !isPlatformAdmin) {
      set.status = 403;
      return {
        error: 'Hanya Guru Admin Etalase resmi dari sekolah ini yang dapat mengubah informasi etalase.'
      };
    }

    const data = (body ?? {}) as Record<string, unknown>;

    const npsn =
      data.npsn !== undefined ? String(data.npsn || '').trim().slice(0, 12) || null : school.npsn;
    const regionId =
      data.regionId !== undefined ? Number(data.regionId) || null : school.regionId;
    const address =
      data.address !== undefined
        ? String(data.address || '').trim().slice(0, 255) || null
        : school.address;
    const description =
      data.description !== undefined
        ? String(data.description || '').trim() || null
        : school.description;
    const hasTefa =
      data.hasTefa !== undefined
        ? data.hasTefa === true || data.hasTefa === 'true' || data.hasTefa === '1'
        : school.hasTefa;
    const tefaDescription =
      data.tefaDescription !== undefined
        ? String(data.tefaDescription || '').trim() || null
        : school.tefaDescription;
    const officialPhone =
      data.officialPhone !== undefined
        ? String(data.officialPhone || '').trim().slice(0, 30) || null
        : school.officialPhone;
    const website =
      data.website !== undefined
        ? String(data.website || '').trim().slice(0, 255) || null
        : school.website;

    let majors = school.majors ?? [];
    if (data.majors !== undefined) {
      if (Array.isArray(data.majors)) {
        majors = data.majors.map((m) => String(m).trim()).filter(Boolean);
      } else if (typeof data.majors === 'string') {
        const trimmed = data.majors.trim();
        if (trimmed.startsWith('[')) {
          try {
            const parsed = JSON.parse(trimmed);
            if (Array.isArray(parsed)) {
              majors = parsed.map((m) => String(m).trim()).filter(Boolean);
            }
          } catch {
            majors = trimmed.split(',').map((m) => m.trim()).filter(Boolean);
          }
        } else {
          majors = trimmed.split(',').map((m) => m.trim()).filter(Boolean);
        }
      }
    }

    let logoPath = school.logo;
    if (data.logo instanceof Blob && data.logo.size > 0) {
      try {
        logoPath = await saveUploadedWebp(data.logo, 'schools', {
          maxWidth: 400,
          maxBytes: 3 * 1024 * 1024
        });
      } catch (err) {
        if (err instanceof ImageValidationError) {
          set.status = 422;
          return { error: err.message };
        }
        throw err;
      }
    }

    let coverPath = school.coverImage;
    if (data.coverImage instanceof Blob && data.coverImage.size > 0) {
      try {
        coverPath = await saveUploadedWebp(data.coverImage, 'schools', {
          maxWidth: 1400,
          maxBytes: 5 * 1024 * 1024
        });
      } catch (err) {
        if (err instanceof ImageValidationError) {
          set.status = 422;
          return { error: err.message };
        }
        throw err;
      }
    }

    await db
      .update(schools)
      .set({
        npsn,
        regionId,
        address,
        description,
        majors,
        hasTefa,
        tefaDescription,
        officialPhone,
        website,
        logo: logoPath,
        coverImage: coverPath
      })
      .where(eq(schools.id, school.id));

    return {
      success: true,
      slug: school.slug,
      logoUrl: logoPath,
      coverImageUrl: coverPath
    };
  });

