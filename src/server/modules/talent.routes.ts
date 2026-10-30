import { Elysia } from 'elysia';
import { and, desc, eq, gte, inArray, like, or, sql } from 'drizzle-orm';
import { db } from '../db';
import {
  hiringInvitations,
  products,
  regions,
  savedTalents,
  schools,
  users,
  type JobPreferences
} from '../db/schema';
import {
  parseSkills,
  resolveUserFromRequest,
  sanitizePublicUser,
  sanitizeSelfUser,
  type UserRow
} from '../middleware/auth';
import { resolveOrCreateSchool } from '../db/backfill-schools';
import { escapeLikePattern, formatPostPrice, isSameSchool } from './posts.routes';
import { NotifyService } from '../services/notify.service';
import { StatsService } from '../services/stats.service';
import { normalizeIndoPhone } from '../services/whatsapp.service';
import { JOB_PREF_TYPE_LABELS, POST_TYPE_LABELS } from '../../shared/constants';

function isVerifiedCompanyOrAdmin(user: UserRow | null): boolean {
  if (!user) return false;
  if (user.isAdmin || user.userType === 'admin') return true;
  return user.userType === 'company' && user.companyVerifiedAt !== null;
}

function buildRecruitmentWaUrl(params: {
  studentPhone: string | null;
  studentName: string;
  companyName: string;
  position: string;
}): string | null {
  const norm = normalizeIndoPhone(params.studentPhone);
  if (!norm) return null;
  const text = [
    `Halo ${params.studentName}, kami dari *${params.companyName}* menghubungi Anda melalui VOC-Market.`,
    `Terima kasih telah menerima undangan kami untuk posisi *${params.position}*. Mari kita jadwalkan diskusi lebih lanjut.`
  ].join('\n\n');
  return `https://wa.me/${norm}?text=${encodeURIComponent(text)}`;
}

export const talentRoutes = new Elysia({ prefix: '/api' })
  .get('/open-to-work', async ({ request, set }) => {
    const currentUser = await resolveUserFromRequest(request);
    if (!currentUser) {
      set.status = 401;
      return { error: 'Silakan masuk terlebih dahulu.' };
    }
    if (currentUser.userType !== 'smk') {
      set.status = 403;
      return { error: 'Fitur Status Siap Kerja khusus untuk Siswa & Alumni SMK.' };
    }

    const [{ worksCnt }] = await db
      .select({ worksCnt: sql<number>`COUNT(*)` })
      .from(products)
      .where(and(eq(products.userId, currentUser.id), eq(products.status, 'published')));

    const publishedWorksCount = Number(worksCnt || 0);
    const checklist = {
      school: Boolean(currentUser.schoolId || currentUser.schoolName?.trim()),
      major: Boolean(currentUser.major?.trim()),
      skills: parseSkills(currentUser.skills).length >= 1,
      headline: Boolean(currentUser.headline && currentUser.headline.trim().length >= 5),
      publishedWorks: publishedWorksCount >= 1
    };

    const missingFields = (Object.keys(checklist) as (keyof typeof checklist)[]).filter(
      (k) => !checklist[k]
    );

    return {
      user: sanitizeSelfUser(currentUser),
      publishedWorksCount,
      checklist,
      missingFields
    };
  })

  .put('/open-to-work', async ({ request, body, set }) => {
    const currentUser = await resolveUserFromRequest(request);
    if (!currentUser) {
      set.status = 401;
      return { error: 'Silakan masuk terlebih dahulu.' };
    }
    if (currentUser.userType !== 'smk') {
      set.status = 403;
      return { error: 'Fitur Status Siap Kerja khusus untuk Siswa & Alumni SMK.' };
    }

    const data = (body ?? {}) as Record<string, unknown>;

    const nextOpenToWork =
      data.openToWork !== undefined
        ? data.openToWork === true || data.openToWork === 'true' || data.openToWork === 1
        : Boolean(currentUser.openToWork);

    const nextMajor =
      data.major !== undefined ? String(data.major || '').trim() || null : currentUser.major;

    let nextSkills = currentUser.skills;
    if (data.skills !== undefined) {
      if (Array.isArray(data.skills)) {
        nextSkills = data.skills.map((s) => String(s).trim()).filter(Boolean).join(', ') || null;
      } else {
        nextSkills = String(data.skills || '').trim() || null;
      }
    }

    const nextHeadline =
      data.headline !== undefined
        ? String(data.headline || '').trim().slice(0, 140) || null
        : currentUser.headline;

    const nextRegionId =
      data.regionId !== undefined ? Number(data.regionId) || null : currentUser.regionId;

    let nextSchoolId = currentUser.schoolId;
    let nextSchoolName = currentUser.schoolName;
    if (data.schoolId !== undefined || data.schoolName !== undefined) {
      const resolvedSchool = await resolveOrCreateSchool({
        schoolId: Number(data.schoolId || 0) || null,
        schoolName: String(data.schoolName ?? currentUser.schoolName ?? '').trim() || null,
        regionId: nextRegionId
      });
      if (resolvedSchool) {
        nextSchoolId = resolvedSchool.id;
        nextSchoolName = resolvedSchool.name;
      }
    }

    let nextStudentStatus = currentUser.studentStatus;
    if (data.studentStatus !== undefined) {
      const rawStatus = String(data.studentStatus || '').trim();
      if (['active', 'final_year', 'alumni'].includes(rawStatus)) {
        nextStudentStatus = rawStatus as 'active' | 'final_year' | 'alumni';
      }
    }

    const nextGraduationYear =
      data.graduationYear !== undefined
        ? Number(data.graduationYear) || null
        : currentUser.graduationYear;

    let nextJobPrefs: JobPreferences = currentUser.jobPreferences ?? {
      types: nextStudentStatus === 'active' ? ['pkl', 'freelance'] : ['magang', 'kerja'],
      regionIds: nextRegionId ? [nextRegionId] : [],
      willingToRelocate: false
    };

    if (data.jobPreferences && typeof data.jobPreferences === 'object') {
      const jp = data.jobPreferences as Record<string, unknown>;
      const rawTypes = Array.isArray(jp.types) ? jp.types.map((t) => String(t).trim()) : [];
      const validTypes = rawTypes.filter((t) =>
        ['pkl', 'magang', 'kerja', 'freelance'].includes(t)
      ) as ('pkl' | 'magang' | 'kerja' | 'freelance')[];

      const rawRegions = Array.isArray(jp.regionIds)
        ? jp.regionIds.map((r) => Number(r)).filter((n) => Number.isFinite(n) && n > 0)
        : nextJobPrefs.regionIds;

      nextJobPrefs = {
        types: validTypes.length > 0 ? validTypes : nextJobPrefs.types,
        regionIds: rawRegions,
        willingToRelocate: Boolean(jp.willingToRelocate)
      };
    }

    // Strict Protection for Active Grade X/XI Students (Section 4.3 #1)
    if (nextStudentStatus === 'active') {
      const forbiddenTypes = nextJobPrefs.types.filter(
        (t) => t !== 'pkl' && t !== 'freelance'
      );
      if (forbiddenTypes.length > 0) {
        set.status = 422;
        return {
          error:
            'Siswa aktif (Kelas X/XI) hanya diizinkan memilih peluang PKL/Prakerin atau Proyek Lepas (Freelance), bukan kerja penuh waktu.'
        };
      }
    }

    const [{ worksCnt }] = await db
      .select({ worksCnt: sql<number>`COUNT(*)` })
      .from(products)
      .where(and(eq(products.userId, currentUser.id), eq(products.status, 'published')));
    const publishedWorksCount = Number(worksCnt || 0);

    const checklist = {
      school: Boolean(nextSchoolId || nextSchoolName?.trim()),
      major: Boolean(nextMajor?.trim()),
      skills: parseSkills(nextSkills).length >= 1,
      headline: Boolean(nextHeadline && nextHeadline.trim().length >= 5),
      publishedWorks: publishedWorksCount >= 1
    };

    const missingFields = (Object.keys(checklist) as (keyof typeof checklist)[]).filter(
      (k) => !checklist[k]
    );

    if (nextOpenToWork && missingFields.length > 0) {
      set.status = 422;
      return {
        error: 'Lengkapi seluruh syarat profil dan minimal 1 karya terbit sebelum mengaktifkan Siap Kerja.',
        missingFields,
        checklist
      };
    }

    await db
      .update(users)
      .set({
        schoolId: nextSchoolId,
        schoolName: nextSchoolName,
        regionId: nextRegionId,
        major: nextMajor,
        skills: nextSkills,
        headline: nextHeadline,
        studentStatus: nextStudentStatus,
        graduationYear: nextGraduationYear,
        jobPreferences: nextJobPrefs,
        openToWork: nextOpenToWork,
        openToWorkSince: nextOpenToWork ? currentUser.openToWorkSince ?? new Date() : null,
        lastActiveAt: new Date()
      })
      .where(eq(users.id, currentUser.id));

    await StatsService.refreshStudentStats(currentUser.id);

    const [updated] = await db.select().from(users).where(eq(users.id, currentUser.id)).limit(1);

    return {
      success: true,
      user: sanitizeSelfUser(updated),
      checklist,
      missingFields: []
    };
  })

  .get('/talent', async ({ request, query, set }) => {
    const currentUser = await resolveUserFromRequest(request);
    if (!currentUser) {
      set.status = 401;
      return { error: 'Silakan masuk dengan akun Mitra Industri terverifikasi.' };
    }
    if (!isVerifiedCompanyOrAdmin(currentUser)) {
      set.status = 403;
      return {
        error:
          currentUser.userType === 'company'
            ? 'Akun perusahaan Anda masih menunggu verifikasi Admin Platform sebelum dapat mencari talenta siswa.'
            : 'Halaman pencarian talenta khusus untuk Mitra Industri yang telah diverifikasi Admin.'
      };
    }

    const page = Math.max(1, Number(query.page || 1));
    const limit = Math.min(50, Math.max(1, Number(query.limit || 12)));
    const offset = (page - 1) * limit;

    const conditions = [eq(users.userType, 'smk'), eq(users.openToWork, true)];

    const major = String(query.major ?? '').trim();
    if (major) {
      conditions.push(like(users.major, `%${escapeLikePattern(major)}%`));
    }

    const regionId = Number(query.regionId || 0);
    if (regionId > 0) {
      conditions.push(eq(users.regionId, regionId));
    }

    const schoolId = Number(query.schoolId || 0);
    if (schoolId > 0) {
      conditions.push(eq(users.schoolId, schoolId));
    }

    const minRating = Number(query.minRating || 0);
    if (Number.isFinite(minRating) && minRating > 0) {
      conditions.push(gte(users.statAvgRating, minRating.toFixed(2)));
    }

    if (query.verifiedOnly === '1' || query.verifiedOnly === 'true') {
      conditions.push(eq(users.isVerified, true));
    }

    const studentStatus = String(query.studentStatus ?? '').trim();
    if (['active', 'final_year', 'alumni'].includes(studentStatus)) {
      conditions.push(
        eq(users.studentStatus, studentStatus as 'active' | 'final_year' | 'alumni')
      );
    }

    const jobType = String(query.jobType ?? '').trim();
    if (['pkl', 'magang', 'kerja', 'freelance'].includes(jobType)) {
      conditions.push(sql`JSON_CONTAINS(${users.jobPreferences}, JSON_QUOTE(${jobType}), '$.types')`);
    }

    const q = String(query.q ?? '').trim().slice(0, 100);
    if (q.length >= 2) {
      const esc = escapeLikePattern(q);
      conditions.push(
        or(
          like(users.name, `%${esc}%`),
          like(users.headline, `%${esc}%`),
          like(users.skills, `%${esc}%`),
          like(users.major, `%${esc}%`),
          like(users.schoolName, `%${esc}%`)
        )!
      );
    }

    const whereClause = and(...conditions);

    const [{ total }] = await db
      .select({ total: sql<number>`COUNT(*)` })
      .from(users)
      .where(whereClause);

    const rows = await db
      .select({
        student: users,
        school: schools,
        region: regions
      })
      .from(users)
      .leftJoin(schools, eq(users.schoolId, schools.id))
      .leftJoin(regions, eq(users.regionId, regions.id))
      .where(whereClause)
      .orderBy(desc(users.talentScore), desc(users.statCompletedOrders), desc(users.id))
      .limit(limit)
      .offset(offset);

    const studentIds = rows.map((r) => r.student.id);
    const savedSet = new Set<number>();
    const worksByStudent = new Map<
      number,
      { id: number; name: string; imageUrl: string; typeLabel: string; formattedPrice: string }[]
    >();

    if (studentIds.length > 0) {
      const savedRows = await db
        .select({ studentId: savedTalents.studentId })
        .from(savedTalents)
        .where(
          and(
            eq(savedTalents.companyId, currentUser.id),
            inArray(savedTalents.studentId, studentIds)
          )
        );
      for (const sr of savedRows) savedSet.add(sr.studentId);

      const pubWorks = await db
        .select()
        .from(products)
        .where(and(inArray(products.userId, studentIds), eq(products.status, 'published')))
        .orderBy(desc(products.isVerifiedByTeacher), desc(products.likesCount));

      for (const w of pubWorks) {
        const list = worksByStudent.get(w.userId) ?? [];
        if (list.length < 2) {
          list.push({
            id: w.id,
            name: w.name,
            imageUrl: w.image,
            typeLabel: POST_TYPE_LABELS[w.type],
            formattedPrice: formatPostPrice(w)
          });
          worksByStudent.set(w.userId, list);
        }
      }
    }

    return {
      items: rows.map(({ student, school, region }) => ({
        ...sanitizePublicUser(student), // NEVER contains phoneNumber, email, nisn!
        schoolSlug: school?.slug ?? null,
        regionName: region?.name ?? null,
        province: region?.province ?? null,
        isSaved: savedSet.has(student.id),
        featuredWorks: worksByStudent.get(student.id) ?? []
      })),
      total: Number(total || 0),
      page,
      totalPages: Math.max(1, Math.ceil(Number(total || 0) / limit))
    };
  })

  .get('/talent/saved', async ({ request, set }) => {
    const currentUser = await resolveUserFromRequest(request);
    if (!currentUser) {
      set.status = 401;
      return { error: 'Silakan masuk terlebih dahulu.' };
    }
    if (!isVerifiedCompanyOrAdmin(currentUser)) {
      set.status = 403;
      return { error: 'Khusus Mitra Industri terverifikasi.' };
    }

    const rows = await db
      .select({
        saved: savedTalents,
        student: users,
        school: schools,
        region: regions
      })
      .from(savedTalents)
      .innerJoin(users, eq(savedTalents.studentId, users.id))
      .leftJoin(schools, eq(users.schoolId, schools.id))
      .leftJoin(regions, eq(users.regionId, regions.id))
      .where(eq(savedTalents.companyId, currentUser.id))
      .orderBy(desc(savedTalents.createdAt));

    return {
      items: rows.map(({ saved, student, school, region }) => ({
        ...sanitizePublicUser(student),
        schoolSlug: school?.slug ?? null,
        regionName: region?.name ?? null,
        province: region?.province ?? null,
        isSaved: true,
        savedNote: saved.note,
        savedAt: saved.createdAt.toISOString()
      }))
    };
  })

  .post('/talent/:username/save', async ({ request, params, body, set }) => {
    const currentUser = await resolveUserFromRequest(request);
    if (!currentUser) {
      set.status = 401;
      return { error: 'Silakan masuk terlebih dahulu.' };
    }
    if (!isVerifiedCompanyOrAdmin(currentUser)) {
      set.status = 403;
      return { error: 'Khusus Mitra Industri terverifikasi.' };
    }

    const uname = String(params.username || '').trim().toLowerCase();
    const [student] = await db.select().from(users).where(eq(users.username, uname)).limit(1);
    if (!student || student.userType !== 'smk') {
      set.status = 404;
      return { error: 'Kandidat siswa tidak ditemukan.' };
    }

    const data = (body ?? {}) as Record<string, unknown>;
    const note = String(data.note ?? '').trim().slice(0, 255) || null;

    const [existing] = await db
      .select()
      .from(savedTalents)
      .where(
        and(eq(savedTalents.companyId, currentUser.id), eq(savedTalents.studentId, student.id))
      )
      .limit(1);

    if (existing) {
      await db.delete(savedTalents).where(eq(savedTalents.id, existing.id));
      return { success: true, isSaved: false };
    }

    await db.insert(savedTalents).values({
      companyId: currentUser.id,
      studentId: student.id,
      note
    });
    return { success: true, isSaved: true };
  })

  .post('/talent/:username/invite', async ({ request, params, body, set }) => {
    const currentUser = await resolveUserFromRequest(request);
    if (!currentUser) {
      set.status = 401;
      return { error: 'Silakan masuk terlebih dahulu.' };
    }
    if (!isVerifiedCompanyOrAdmin(currentUser)) {
      set.status = 403;
      return {
        error:
          'Hanya akun Mitra Industri yang sudah diverifikasi Admin yang dapat mengirim undangan rekrutmen.'
      };
    }

    const uname = String(params.username || '').trim().toLowerCase();
    const [student] = await db.select().from(users).where(eq(users.username, uname)).limit(1);
    if (!student || student.userType !== 'smk') {
      set.status = 404;
      return { error: 'Kandidat siswa tidak ditemukan.' };
    }
    if (!student.openToWork) {
      set.status = 422;
      return { error: 'Siswa ini sedang tidak mengaktifkan status Siap Kerja.' };
    }

    const data = (body ?? {}) as Record<string, unknown>;
    const typeRaw = String(data.type ?? '').trim();
    const position = String(data.position ?? '').trim();
    const message = String(data.message ?? '').trim();
    const regionId = Number(data.regionId ?? currentUser.regionId ?? 0) || null;
    const salaryInfo = String(data.salaryInfo ?? data.salary_info ?? '').trim().slice(0, 120) || null;

    if (!['pkl', 'magang', 'kerja', 'freelance'].includes(typeRaw)) {
      set.status = 422;
      return { error: 'Pilih jenis undangan yang valid (PKL, Magang, Kerja, atau Freelance).' };
    }
    const type = typeRaw as 'pkl' | 'magang' | 'kerja' | 'freelance';

    if (student.studentStatus === 'active' && type !== 'pkl' && type !== 'freelance') {
      set.status = 422;
      return {
        error:
          'Siswa aktif (Kelas X/XI) hanya dapat diundang untuk program PKL/Prakerin atau Proyek Lepas.'
      };
    }

    if (position.length < 3 || position.length > 120) {
      set.status = 422;
      return { error: 'Nama posisi yang ditawarkan wajib diisi (3–120 karakter).' };
    }
    if (message.length < 15) {
      set.status = 422;
      return { error: 'Tulis rincian penawaran & pesan undangan minimal 15 karakter.' };
    }

    const expiresAt = new Date(Date.now() + 14 * 86_400_000);
    const companyTitle = currentUser.companyName || currentUser.name;

    const [inserted] = await db.insert(hiringInvitations).values({
      companyId: currentUser.id,
      studentId: student.id,
      type,
      position,
      message,
      regionId,
      salaryInfo,
      status: 'pending',
      expiresAt
    });

    // 1. Notify the Student
    await NotifyService.send({
      userId: student.id,
      type: 'hiring_invitation',
      title: `Undangan ${JOB_PREF_TYPE_LABELS[type]} dari ${companyTitle}!`,
      body: `Posisi: ${position}. Tinjau detail penawaran di Kotak Undangan Anda.`,
      actionUrl: '/undangan'
    });

    // 2. Notify ALL Teachers at the Student's School (Section 4.3 #2!)
    const allTeachers = await db
      .select()
      .from(users)
      .where(eq(users.userType, 'teacher'));

    const matchingTeachers = allTeachers.filter((t) => {
      if (student.schoolId && t.schoolId && student.schoolId === t.schoolId) {
        return true;
      }
      return isSameSchool(student.schoolName, t.schoolName);
    });

    for (const teacher of matchingTeachers) {
      await NotifyService.send({
        userId: teacher.id,
        type: 'student_invited',
        title: `Siswa Bimbingan Diundang oleh ${companyTitle}`,
        body: `${student.name} menerima undangan ${JOB_PREF_TYPE_LABELS[type]} (${position}).`,
        actionUrl: '/dashboard/guru'
      });
    }

    set.status = 201;
    return {
      success: true,
      id: inserted.insertId,
      notifiedTeachersCount: matchingTeachers.length
    };
  })

  .get('/invitations', async ({ request, set }) => {
    const currentUser = await resolveUserFromRequest(request);
    if (!currentUser) {
      set.status = 401;
      return { error: 'Silakan masuk terlebih dahulu.' };
    }

    if (currentUser.userType === 'smk') {
      const rows = await db
        .select({
          inv: hiringInvitations,
          company: users,
          region: regions
        })
        .from(hiringInvitations)
        .innerJoin(users, eq(hiringInvitations.companyId, users.id))
        .leftJoin(regions, eq(hiringInvitations.regionId, regions.id))
        .where(eq(hiringInvitations.studentId, currentUser.id))
        .orderBy(desc(hiringInvitations.createdAt));

      return {
        role: 'student',
        items: rows.map(({ inv, company, region }) => ({
          id: inv.id,
          type: inv.type,
          typeLabel: JOB_PREF_TYPE_LABELS[inv.type],
          position: inv.position,
          message: inv.message,
          salaryInfo: inv.salaryInfo,
          regionName: region?.name ?? null,
          province: region?.province ?? null,
          status: inv.status,
          declineReason: inv.declineReason,
          respondedAt: inv.respondedAt ? inv.respondedAt.toISOString() : null,
          expiresAt: inv.expiresAt.toISOString(),
          createdAt: inv.createdAt.toISOString(),
          company: sanitizePublicUser(company)
        }))
      };
    }

    if (currentUser.userType === 'company' || currentUser.isAdmin || currentUser.userType === 'admin') {
      const rows = await db
        .select({
          inv: hiringInvitations,
          student: users,
          region: regions
        })
        .from(hiringInvitations)
        .innerJoin(users, eq(hiringInvitations.studentId, users.id))
        .leftJoin(regions, eq(hiringInvitations.regionId, regions.id))
        .where(eq(hiringInvitations.companyId, currentUser.id))
        .orderBy(desc(hiringInvitations.createdAt));

      const companyTitle = currentUser.companyName || currentUser.name;

      return {
        role: 'company',
        items: rows.map(({ inv, student, region }) => {
          // Student phone is STRICTLY hidden until invitation.status === 'accepted'!
          const unlocked = inv.status === 'accepted';
          return {
            id: inv.id,
            type: inv.type,
            typeLabel: JOB_PREF_TYPE_LABELS[inv.type],
            position: inv.position,
            message: inv.message,
            salaryInfo: inv.salaryInfo,
            regionName: region?.name ?? null,
            province: region?.province ?? null,
            status: inv.status,
            declineReason: inv.declineReason,
            respondedAt: inv.respondedAt ? inv.respondedAt.toISOString() : null,
            expiresAt: inv.expiresAt.toISOString(),
            createdAt: inv.createdAt.toISOString(),
            student: sanitizePublicUser(student),
            studentPhone: unlocked ? student.phoneNumber : null,
            studentWhatsappUrl: unlocked
              ? buildRecruitmentWaUrl({
                  studentPhone: student.phoneNumber,
                  studentName: student.name,
                  companyName: companyTitle,
                  position: inv.position
                })
              : null
          };
        })
      };
    }

    return { role: 'other', items: [] };
  })

  .post('/invitations/:id/accept', async ({ request, params, set }) => {
    const currentUser = await resolveUserFromRequest(request);
    if (!currentUser) {
      set.status = 401;
      return { error: 'Silakan masuk terlebih dahulu.' };
    }

    const invId = Number(params.id);
    const rows = await db
      .select({
        inv: hiringInvitations,
        company: users
      })
      .from(hiringInvitations)
      .innerJoin(users, eq(hiringInvitations.companyId, users.id))
      .where(eq(hiringInvitations.id, invId))
      .limit(1);

    if (!rows[0]) {
      set.status = 404;
      return { error: 'Undangan tidak ditemukan.' };
    }

    const { inv, company } = rows[0];
    if (inv.studentId !== currentUser.id) {
      set.status = 403;
      return { error: 'Anda tidak berhak menanggapi undangan ini.' };
    }
    if (inv.status !== 'pending') {
      set.status = 422;
      return { error: 'Undangan ini sudah ditanggapi atau kedaluwarsa.' };
    }

    await db
      .update(hiringInvitations)
      .set({
        status: 'accepted',
        respondedAt: new Date()
      })
      .where(eq(hiringInvitations.id, inv.id));

    const companyTitle = company.companyName || company.name;
    const studentWhatsappUrl = buildRecruitmentWaUrl({
      studentPhone: currentUser.phoneNumber,
      studentName: currentUser.name,
      companyName: companyTitle,
      position: inv.position
    });

    await NotifyService.send({
      userId: inv.companyId,
      type: 'invitation_accepted',
      title: `${currentUser.name} Menerima Undangan Anda!`,
      body: `Kontak WhatsApp kandidat untuk posisi "${inv.position}" kini telah dibuka di halaman Undangan.`,
      actionUrl: '/undangan'
    });

    return {
      success: true,
      status: 'accepted',
      studentPhone: currentUser.phoneNumber,
      studentWhatsappUrl
    };
  })

  .post('/invitations/:id/decline', async ({ request, params, body, set }) => {
    const currentUser = await resolveUserFromRequest(request);
    if (!currentUser) {
      set.status = 401;
      return { error: 'Silakan masuk terlebih dahulu.' };
    }

    const invId = Number(params.id);
    const [inv] = await db
      .select()
      .from(hiringInvitations)
      .where(eq(hiringInvitations.id, invId))
      .limit(1);

    if (!inv) {
      set.status = 404;
      return { error: 'Undangan tidak ditemukan.' };
    }
    if (inv.studentId !== currentUser.id) {
      set.status = 403;
      return { error: 'Anda tidak berhak menanggapi undangan ini.' };
    }
    if (inv.status !== 'pending') {
      set.status = 422;
      return { error: 'Undangan ini sudah ditanggapi atau kedaluwarsa.' };
    }

    const data = (body ?? {}) as Record<string, unknown>;
    const declineReason = String(data.declineReason ?? '').trim().slice(0, 255) || null;

    await db
      .update(hiringInvitations)
      .set({
        status: 'declined',
        declineReason,
        respondedAt: new Date()
      })
      .where(eq(hiringInvitations.id, inv.id));

    await NotifyService.send({
      userId: inv.companyId,
      type: 'invitation_declined',
      title: `Tanggapan Undangan dari ${currentUser.name}`,
      body: `${currentUser.name} belum dapat menerima tawaran posisi "${inv.position}" saat ini.`,
      actionUrl: '/undangan'
    });

    return {
      success: true,
      status: 'declined'
    };
  });

