import { Elysia } from 'elysia';
import { and, desc, eq, inArray, or, sql } from 'drizzle-orm';
import { db } from '../db';
import { orders, products, schools, users } from '../db/schema';
import { resolveUserFromRequest, sanitizePublicUser, type UserRow } from '../middleware/auth';
import { formatPostPrice, isSameSchool } from './posts.routes';
import { NotifyService } from '../services/notify.service';
import { StatsService } from '../services/stats.service';
import { formatIdrPlain } from '../services/whatsapp.service';
import { POST_TYPE_LABELS } from '../../shared/constants';

function teacherMatchesStudentSchool(teacher: UserRow, target: UserRow): boolean {
  if (teacher.schoolId && target.schoolId && teacher.schoolId === target.schoolId) {
    return true;
  }
  return isSameSchool(teacher.schoolName, target.schoolName);
}

export const teacherRoutes = new Elysia({ prefix: '/api/teacher' })
  .get('/dashboard', async ({ request, set }) => {
    const teacher = await resolveUserFromRequest(request);
    if (!teacher) {
      set.status = 401;
      return { error: 'Silakan masuk terlebih dahulu.' };
    }
    if (teacher.userType !== 'teacher') {
      set.status = 403;
      return { error: 'Halaman ini khusus untuk Guru Pembimbing SMK.' };
    }

    const normalizedSchool = (teacher.schoolName || '').trim().toLowerCase();
    const schoolMatchCond = teacher.schoolId
      ? or(
          eq(users.schoolId, teacher.schoolId),
          sql`LOWER(TRIM(${users.schoolName})) = ${normalizedSchool}`
        )
      : sql`LOWER(TRIM(${users.schoolName})) = ${normalizedSchool}`;

    const schoolStudents = await db
      .select()
      .from(users)
      .where(and(eq(users.userType, 'smk'), schoolMatchCond))
      .orderBy(desc(users.createdAt));

    let schoolSlug: string | null = null;
    if (teacher.schoolId) {
      const [sc] = await db
        .select({ slug: schools.slug })
        .from(schools)
        .where(eq(schools.id, teacher.schoolId))
        .limit(1);
      schoolSlug = sc?.slug ?? null;
    }

    const studentIds = schoolStudents.map((s) => s.id);

    let schoolPosts: (typeof products.$inferSelect)[] = [];
    const orderStatsByStudent = new Map<number, { completed: number; revenue: number }>();

    if (studentIds.length > 0) {
      schoolPosts = await db
        .select()
        .from(products)
        .where(and(inArray(products.userId, studentIds), eq(products.status, 'published')))
        .orderBy(desc(products.createdAt));

      const orderAgg = await db
        .select({
          sellerId: orders.sellerId,
          completed: sql<number>`COUNT(*)`,
          revenue: sql<number>`COALESCE(SUM(${orders.agreedPrice}), 0)`
        })
        .from(orders)
        .where(and(inArray(orders.sellerId, studentIds), eq(orders.status, 'completed')))
        .groupBy(orders.sellerId);

      for (const row of orderAgg) {
        orderStatsByStudent.set(row.sellerId, {
          completed: Number(row.completed || 0),
          revenue: Number(row.revenue || 0)
        });
      }
    }

    const studentMap = new Map(schoolStudents.map((s) => [s.id, s]));

    let totalCompletedOrders = 0;
    let totalSchoolRevenue = 0;
    for (const st of orderStatsByStudent.values()) {
      totalCompletedOrders += st.completed;
      totalSchoolRevenue += st.revenue;
    }

    return {
      schoolName: teacher.schoolName,
      schoolId: teacher.schoolId ?? null,
      schoolSlug,
      isSchoolAdmin: Boolean(teacher.isSchoolAdmin),
      summary: {
        totalStudents: schoolStudents.length,
        verifiedStudents: schoolStudents.filter((s) => s.isVerified).length,
        totalWorks: schoolPosts.length,
        verifiedWorks: schoolPosts.filter((p) => p.isVerifiedByTeacher).length,
        tefaWorks: schoolPosts.filter((p) => p.isTefa).length,
        totalCompletedOrders,
        totalSchoolRevenue,
        formattedSchoolRevenue: formatIdrPlain(totalSchoolRevenue)
      },
      students: schoolStudents.map((s) => {
        const st = orderStatsByStudent.get(s.id) ?? { completed: 0, revenue: 0 };
        return {
          ...sanitizePublicUser(s),
          nisn: s.nisn,
          completedOrdersCount: st.completed,
          totalRevenue: st.revenue,
          formattedRevenue: formatIdrPlain(st.revenue)
        };
      }),
      posts: schoolPosts.map((p) => {
        const author = studentMap.get(p.userId)!;
        return {
          id: p.id,
          type: p.type,
          typeLabel: POST_TYPE_LABELS[p.type],
          name: p.name,
          imageUrl: p.image,
          formattedPrice: formatPostPrice(p),
          costPrice: p.costPrice,
          isVerifiedByTeacher: Boolean(p.isVerifiedByTeacher),
          teacherNote: p.teacherNote,
          isTefa: Boolean(p.isTefa),
          tefaUnit: p.tefaUnit,
          viewsCount: p.viewsCount,
          likesCount: p.likesCount,
          createdAt: p.createdAt.toISOString(),
          author: {
            id: author.id,
            name: author.name,
            username: author.username,
            major: author.major,
            isVerified: Boolean(author.isVerified)
          }
        };
      })
    };
  })

  .post('/students/:id/verify', async ({ request, params, body, set }) => {
    const teacher = await resolveUserFromRequest(request);
    if (!teacher) {
      set.status = 401;
      return { error: 'Silakan masuk terlebih dahulu.' };
    }
    if (teacher.userType !== 'teacher') {
      set.status = 403;
      return { error: 'Hanya Guru Pembimbing yang dapat memverifikasi siswa.' };
    }

    const studentId = Number(params.id);
    const [student] = await db.select().from(users).where(eq(users.id, studentId)).limit(1);
    if (!student || student.userType !== 'smk') {
      set.status = 404;
      return { error: 'Data siswa tidak ditemukan.' };
    }

    if (!teacherMatchesStudentSchool(teacher, student)) {
      set.status = 403;
      return { error: 'Anda hanya dapat memverifikasi siswa dari sekolah yang sama.' };
    }

    const data = (body ?? {}) as Record<string, unknown>;
    const nextVerified =
      data.isVerified !== undefined ? Boolean(data.isVerified) : !student.isVerified;

    await db
      .update(users)
      .set({
        isVerified: nextVerified,
        verifiedBy: nextVerified ? teacher.id : null,
        verifiedAt: nextVerified ? new Date() : null
      })
      .where(eq(users.id, student.id));

    await StatsService.refreshStudentStats(student.id);

    if (nextVerified) {
      await NotifyService.send({
        userId: student.id,
        type: 'student_verified',
        title: 'Akun Siswa SMK Terverifikasi!',
        body: `${teacher.name} telah memverifikasi status kesiswaan Anda.`,
        actionUrl: `/profil/${student.username}`
      });
    }

    return {
      success: true,
      studentId: student.id,
      isVerified: nextVerified
    };
  })

  .post('/posts/:id/verify', async ({ request, params, body, set }) => {
    const teacher = await resolveUserFromRequest(request);
    if (!teacher) {
      set.status = 401;
      return { error: 'Silakan masuk terlebih dahulu.' };
    }
    if (teacher.userType !== 'teacher') {
      set.status = 403;
      return { error: 'Hanya Guru Pembimbing yang dapat memberi stempel kurasi karya.' };
    }

    const postId = Number(params.id);
    const rows = await db
      .select({ post: products, author: users })
      .from(products)
      .innerJoin(users, eq(products.userId, users.id))
      .where(eq(products.id, postId))
      .limit(1);

    if (!rows[0]) {
      set.status = 404;
      return { error: 'Karya tidak ditemukan.' };
    }

    const { post, author } = rows[0];
    if (!teacherMatchesStudentSchool(teacher, author)) {
      set.status = 403;
      return { error: 'Anda hanya dapat mengkurasi karya siswa dari sekolah yang sama.' };
    }

    const data = (body ?? {}) as Record<string, unknown>;
    const nextVerified =
      data.isVerified !== undefined ? Boolean(data.isVerified) : !post.isVerifiedByTeacher;
    const teacherNote = nextVerified
      ? String(data.teacherNote ?? post.teacherNote ?? '').trim().slice(0, 255) ||
        'Telah ditinjau & direkomendasikan oleh Guru Pembimbing SMK.'
      : null;

    const nextIsTefa =
      data.isTefa !== undefined ? Boolean(data.isTefa) : nextVerified ? Boolean(post.isTefa) : false;
    const nextTefaUnit = nextIsTefa
      ? String(data.tefaUnit ?? post.tefaUnit ?? `Unit Produksi TeFa ${teacher.schoolName || 'SMK'}`)
          .trim()
          .slice(0, 120)
      : null;

    await db
      .update(products)
      .set({
        isVerifiedByTeacher: nextVerified,
        verifiedBy: nextVerified ? teacher.id : null,
        teacherNote,
        isTefa: nextIsTefa,
        tefaUnit: nextTefaUnit,
        schoolId: post.schoolId ?? teacher.schoolId ?? author.schoolId ?? null
      })
      .where(eq(products.id, post.id));

    if (nextVerified) {
      await NotifyService.send({
        userId: author.id,
        type: 'post_verified',
        title: 'Karyamu Mendapat Stempel Kurasi Guru!',
        body: `"${post.name}" telah dikurasi oleh ${teacher.name}.`,
        actionUrl: `/karya/${post.id}`
      });
    }

    return {
      success: true,
      postId: post.id,
      isVerifiedByTeacher: nextVerified,
      teacherNote,
      isTefa: nextIsTefa,
      tefaUnit: nextTefaUnit
    };
  });
