import { Elysia, t } from 'elysia';
import { and, desc, eq, inArray, like, or, sql } from 'drizzle-orm';
import { existsSync } from 'node:fs';
import { unlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import sharp from 'sharp';
import { db } from '../db';
import {
  categories,
  products,
  projectDetails,
  projectMedia,
  schools,
  users
} from '../db/schema';
import {
  getAvatarUrl,
  parseSkills,
  resolveUserFromRequest
} from '../middleware/auth';

export const showcaseRoutes = new Elysia({ prefix: '/api/showcase' })

  /**
   * GET /api/showcase/majors
   * Returns list of popular vocational majors with active portfolio counts
   */
  .get('/majors', async () => {
    const defaultMajors = [
      'Rekayasa Perangkat Lunak (RPL)',
      'Desain Komunikasi Visual (DKV)',
      'Animasi & 3D Modeling',
      'Teknik Komputer & Jaringan (TKJ)',
      'Teknik Mesin & Manufaktur',
      'Teknik Otomotif',
      'Tata Boga & Kuliner',
      'Tata Busana & Kriya Kreatif',
      'Elektronika Industri'
    ];

    try {
      const rows = await db
        .select({
          major: projectDetails.major,
          count: sql<number>`count(*)`
        })
        .from(projectDetails)
        .groupBy(projectDetails.major);

      const map = new Map<string, number>();
      for (const m of defaultMajors) map.set(m, 0);
      for (const r of rows) {
        if (r.major) map.set(r.major, Number(r.count));
      }

      return Array.from(map.entries()).map(([name, count]) => ({ name, count }));
    } catch {
      return defaultMajors.map((name) => ({ name, count: 0 }));
    }
  })

  /**
   * GET /api/showcase
   * Gallery feed for interactive portfolios & 3D showcases
   */
  .get(
    '/',
    async ({ query }: { query: Record<string, string | undefined> }) => {
      const page = Math.max(1, Number(query.page || 1));
      const limit = Math.min(24, Math.max(1, Number(query.limit || 12)));
      const offset = (page - 1) * limit;

      const conditions: any[] = [
        eq(products.type, 'portfolio'),
        eq(products.status, 'published')
      ];

      if (query.major) {
        conditions.push(eq(projectDetails.major, query.major));
      }

      if (query.schoolId) {
        conditions.push(eq(products.schoolId, Number(query.schoolId)));
      }

      if (query.isVerified === 'true') {
        conditions.push(eq(products.isVerifiedByTeacher, true));
      }

      if (query.search) {
        const s = `%${query.search.trim()}%`;
        conditions.push(
          or(
            like(products.name, s),
            like(products.description, s),
            like(projectDetails.tagline, s),
            like(users.name, s)
          )!
        );
      }

      if (query.hasModel3d === 'true') {
        conditions.push(sql`${projectDetails.modelUrl} IS NOT NULL OR EXISTS (
          SELECT 1 FROM project_media pm WHERE pm.product_id = ${products.id} AND pm.kind = 'model3d'
        )`);
      }

      let orderClause: any = desc(products.createdAt);
      if (query.sort === 'popular') {
        orderClause = desc(products.likesCount);
      } else if (query.sort === 'verified') {
        orderClause = desc(products.isVerifiedByTeacher);
      }

      const rows = await db
        .select({
          id: products.id,
          name: products.name,
          description: products.description,
          coverImage: products.image,
          likesCount: products.likesCount,
          viewsCount: products.viewsCount,
          isVerifiedByTeacher: products.isVerifiedByTeacher,
          teacherNote: products.teacherNote,
          projectLink: products.projectLink,
          createdAt: products.createdAt,
          authorId: users.id,
          authorName: users.name,
          authorUsername: users.username,
          authorAvatar: users.avatar,
          authorMajor: users.major,
          authorStudentStatus: users.studentStatus,
          schoolId: schools.id,
          schoolName: schools.name,
          schoolLogo: schools.logo,
          tagline: projectDetails.tagline,
          major: projectDetails.major,
          role: projectDetails.role,
          tools: projectDetails.tools,
          demoUrl: projectDetails.demoUrl,
          modelUrl: projectDetails.modelUrl
        })
        .from(products)
        .leftJoin(users, eq(products.userId, users.id))
        .leftJoin(schools, eq(products.schoolId, schools.id))
        .leftJoin(projectDetails, eq(products.id, projectDetails.productId))
        .where(and(...conditions))
        .orderBy(orderClause)
        .limit(limit)
        .offset(offset);

      // Fetch primary media kinds for badge previews
      const productIds = rows.map((r) => r.id);
      const mediaMap = new Map<number, string[]>();
      if (productIds.length > 0) {
        const mediaKinds = await db
          .select({
            productId: projectMedia.productId,
            kind: projectMedia.kind
          })
          .from(projectMedia)
          .where(inArray(projectMedia.productId, productIds));

        for (const m of mediaKinds) {
          const list = mediaMap.get(m.productId) || [];
          if (!list.includes(m.kind)) list.push(m.kind);
          mediaMap.set(m.productId, list);
        }
      }

      const items = rows.map((r) => {
        const kinds = mediaMap.get(r.id) || [];
        if (r.modelUrl && !kinds.includes('model3d')) kinds.push('model3d');
        if (r.demoUrl && !kinds.includes('embed')) kinds.push('embed');
        return {
          ...r,
          authorAvatar: getAvatarUrl({
            avatar: r.authorAvatar,
            name: r.authorName || 'Kreator',
            username: r.authorUsername || 'kreator'
          }),
          mediaKinds: kinds
        };
      });

      return {
        items,
        page,
        limit,
        hasMore: items.length === limit
      };
    },
    {
      query: t.Object({
        search: t.Optional(t.String()),
        major: t.Optional(t.String()),
        schoolId: t.Optional(t.String()),
        isVerified: t.Optional(t.String()),
        hasModel3d: t.Optional(t.String()),
        sort: t.Optional(t.String()),
        page: t.Optional(t.String()),
        limit: t.Optional(t.String())
      })
    }
  )

  /**
   * GET /api/showcase/:id
   * Complete Interactive Portfolio Case Study
   */
  .get('/:id', async ({ params, set }: { params: { id: string }; set: any }) => {
    const id = Number(params.id);
    if (!id) {
      set.status = 400;
      return { error: 'ID karya tidak valid' };
    }

    const [post] = await db
      .select({
        id: products.id,
        name: products.name,
        description: products.description,
        coverImage: products.image,
        ogImage: products.ogImage,
        likesCount: products.likesCount,
        viewsCount: products.viewsCount,
        sharesCount: products.sharesCount,
        isVerifiedByTeacher: products.isVerifiedByTeacher,
        verifiedBy: products.verifiedBy,
        teacherNote: products.teacherNote,
        projectLink: products.projectLink,
        status: products.status,
        createdAt: products.createdAt,
        userId: products.userId,
        schoolId: products.schoolId,
        authorName: users.name,
        authorUsername: users.username,
        authorAvatar: users.avatar,
        authorBio: users.bio,
        authorMajor: users.major,
        authorSkills: users.skills,
        authorPhone: users.phoneNumber,
        authorIsOpenToWork: users.openToWork,
        schoolName: schools.name,
        schoolLogo: schools.logo,
        schoolAddress: schools.address
      })
      .from(products)
      .leftJoin(users, eq(products.userId, users.id))
      .leftJoin(schools, eq(products.schoolId, schools.id))
      .where(eq(products.id, id));

    if (!post) {
      set.status = 404;
      return { error: 'Karya portofolio tidak ditemukan' };
    }

    // Increment views count asynchronously
    db.update(products)
      .set({ viewsCount: sql`${products.viewsCount} + 1` })
      .where(eq(products.id, id))
      .catch(() => {});

    // Fetch details
    const [details] = await db
      .select()
      .from(projectDetails)
      .where(eq(projectDetails.productId, id));

    // Fetch all media items
    const media = await db
      .select()
      .from(projectMedia)
      .where(eq(projectMedia.productId, id))
      .orderBy(projectMedia.sortOrder, projectMedia.id);

    // Fetch related works from same author or other portfolios
    const relatedRows = await db
      .select({
        id: products.id,
        name: products.name,
        coverImage: products.image,
        authorName: users.name,
        authorUsername: users.username,
        authorAvatar: users.avatar,
        isVerifiedByTeacher: products.isVerifiedByTeacher
      })
      .from(products)
      .leftJoin(users, eq(products.userId, users.id))
      .where(
        and(
          eq(products.type, 'portfolio'),
          eq(products.status, 'published'),
          sql`${products.id} != ${id}`
        )
      )
      .limit(4);

    const related = relatedRows.map((r) => ({
      ...r,
      authorAvatar: getAvatarUrl({
        avatar: r.authorAvatar,
        name: r.authorName || 'Kreator',
        username: r.authorUsername || 'kreator'
      })
    }));

    return {
      post: {
        ...post,
        authorAvatar: getAvatarUrl({
          avatar: post.authorAvatar,
          name: post.authorName || 'Kreator',
          username: post.authorUsername || 'kreator'
        }),
        authorSkills: parseSkills(post.authorSkills)
      },
      details: details || null,
      media,
      related
    };
  })

  /**
   * PUT /api/showcase/:id/details
   * Save or update case study details (problem, process, result, tools, etc.)
   */
  .put(
    '/:id/details',
    async ({
      params,
      body,
      request,
      set
    }: {
      params: { id: string };
      body: any;
      request: Request;
      set: any;
    }) => {
      const user = await resolveUserFromRequest(request);
      if (!user) {
        set.status = 401;
        return { error: 'Silakan masuk untuk mengelola karya' };
      }

      const id = Number(params.id);
      const [existing] = await db
        .select()
        .from(products)
        .where(eq(products.id, id));

      if (!existing) {
        set.status = 404;
        return { error: 'Karya tidak ditemukan' };
      }

      // Check ownership
      const isOwner = existing.userId === user.id;
      const isAdmin = user.userType === 'admin';
      const isTeacher =
        user.userType === 'teacher' &&
        user.schoolId &&
        existing.schoolId &&
        user.schoolId === existing.schoolId;

      if (!isOwner && !isAdmin && !isTeacher) {
        set.status = 403;
        return { error: 'Anda tidak memiliki hak untuk mengedit karya ini' };
      }

      // Clean & validate tools
      const tools = Array.isArray(body.tools)
        ? body.tools.map((t: string) => String(t).trim()).filter(Boolean).slice(0, 15)
        : [];

      // Clean & validate team members
      const teamMembers = Array.isArray(body.teamMembers)
        ? body.teamMembers.slice(0, 10).map((m: any) => ({
            userId: m.userId ? Number(m.userId) : undefined,
            name: String(m.name || '').trim().slice(0, 80),
            role: String(m.role || '').trim().slice(0, 80)
          }))
        : [];

      const [existingDetails] = await db
        .select()
        .from(projectDetails)
        .where(eq(projectDetails.productId, id));

      if (existingDetails) {
        await db
          .update(projectDetails)
          .set({
            tagline: body.tagline ? String(body.tagline).trim().slice(0, 255) : null,
            major: body.major ? String(body.major).trim().slice(0, 80) : null,
            problem: body.problem ? String(body.problem).trim() : null,
            process: body.process ? String(body.process).trim() : null,
            result: body.result ? String(body.result).trim() : null,
            role: body.role ? String(body.role).trim().slice(0, 160) : null,
            tools,
            teamMembers,
            demoUrl: body.demoUrl ? String(body.demoUrl).trim().slice(0, 500) : null,
            repoUrl: body.repoUrl ? String(body.repoUrl).trim().slice(0, 500) : null,
            modelUrl: body.modelUrl ? String(body.modelUrl).trim().slice(0, 500) : null
          })
          .where(eq(projectDetails.productId, id));
      } else {
        await db.insert(projectDetails).values({
          productId: id,
          tagline: body.tagline ? String(body.tagline).trim().slice(0, 255) : null,
          major: body.major ? String(body.major).trim().slice(0, 80) : null,
          problem: body.problem ? String(body.problem).trim() : null,
          process: body.process ? String(body.process).trim() : null,
          result: body.result ? String(body.result).trim() : null,
          role: body.role ? String(body.role).trim().slice(0, 160) : null,
          tools,
          teamMembers,
          demoUrl: body.demoUrl ? String(body.demoUrl).trim().slice(0, 500) : null,
          repoUrl: body.repoUrl ? String(body.repoUrl).trim().slice(0, 500) : null,
          modelUrl: body.modelUrl ? String(body.modelUrl).trim().slice(0, 500) : null
        });
      }

      return { success: true, message: 'Detail studi kasus berhasil disimpan' };
    },
    {
      body: t.Object({
        tagline: t.Optional(t.String()),
        major: t.Optional(t.String()),
        problem: t.Optional(t.String()),
        process: t.Optional(t.String()),
        result: t.Optional(t.String()),
        role: t.Optional(t.String()),
        tools: t.Optional(t.Array(t.String())),
        teamMembers: t.Optional(t.Array(t.Any())),
        demoUrl: t.Optional(t.String()),
        repoUrl: t.Optional(t.String()),
        modelUrl: t.Optional(t.String())
      })
    }
  )

  /**
   * POST /api/showcase/:id/media
   * Upload interactive media (3D Model .glb, Video .mp4/.webm, Image, or Embed URL)
   */
  .post(
    '/:id/media',
    async ({
      params,
      request,
      set
    }: {
      params: { id: string };
      request: Request;
      set: any;
    }) => {
      const user = await resolveUserFromRequest(request);
      if (!user) {
        set.status = 401;
        return { error: 'Silakan masuk untuk mengunggah media' };
      }

      const id = Number(params.id);
      const [existing] = await db
        .select()
        .from(products)
        .where(eq(products.id, id));

      if (!existing) {
        set.status = 404;
        return { error: 'Karya tidak ditemukan' };
      }

      if (existing.userId !== user.id && user.userType !== 'admin') {
        set.status = 403;
        return { error: 'Anda tidak memiliki hak untuk mengunggah media ke karya ini' };
      }

      const contentType = request.headers.get('content-type') || '';

      // 1. JSON Body (Embed URL / External Demo)
      if (contentType.includes('application/json')) {
        const body = (await request.json()) as any;
        const kind = body.kind || 'embed';
        const url = String(body.url || '').trim();
        if (!url || (!url.startsWith('http://') && !url.startsWith('https://'))) {
          set.status = 400;
          return { error: 'URL embed tidak valid' };
        }

        const [inserted] = await db
          .insert(projectMedia)
          .values({
            productId: id,
            kind: kind === 'demo' ? 'embed' : kind,
            url,
            title: body.title ? String(body.title).trim().slice(0, 200) : null,
            caption: body.caption ? String(body.caption).trim() : null,
            posterUrl: body.posterUrl ? String(body.posterUrl).trim() : null,
            sortOrder: Number(body.sortOrder || 0),
            meta: body.meta || {}
          })
          .$returningId();

        return {
          success: true,
          media: { id: inserted.id, productId: id, kind, url }
        };
      }

      // 2. Multipart Form Upload (File)
      const formData = await request.formData();
      const file = formData.get('file') as File | null;
      const kind = (formData.get('kind') as string) || 'image';
      const title = (formData.get('title') as string) || '';
      const caption = (formData.get('caption') as string) || '';

      if (!file || typeof file === 'string') {
        set.status = 400;
        return { error: 'File media tidak ditemukan' };
      }

      const buffer = Buffer.from(await file.arrayBuffer());
      const timestamp = Date.now();
      const randomHex = Math.random().toString(16).slice(2, 10);
      const root = process.cwd();
      let savedUrl = '';
      const posterUrl: string | null = null;
      const meta: any = { sizeBytes: buffer.length };

      if (kind === 'model3d') {
        // 3D Model: .glb binary glTF (max 25MB)
        if (buffer.length > 25 * 1024 * 1024) {
          set.status = 400;
          return { error: 'Ukuran file model 3D maksimal 25 MB' };
        }

        const filename = `${timestamp}_${randomHex}.glb`;
        const targetPath = join(root, 'public', 'uploads', 'models', filename);
        await writeFile(targetPath, buffer);
        savedUrl = `/uploads/models/${filename}`;

        // Update projectDetails.modelUrl if empty
        await db
          .update(projectDetails)
          .set({ modelUrl: savedUrl })
          .where(
            and(
              eq(projectDetails.productId, id),
              sql`${projectDetails.modelUrl} IS NULL OR ${projectDetails.modelUrl} = ''`
            )
          );
      } else if (kind === 'video') {
        // Video: mp4, webm (max 50MB)
        if (buffer.length > 50 * 1024 * 1024) {
          set.status = 400;
          return { error: 'Ukuran file video maksimal 50 MB' };
        }

        const ext = file.name.toLowerCase().endsWith('.webm') ? 'webm' : 'mp4';
        const filename = `${timestamp}_${randomHex}.${ext}`;
        const targetPath = join(root, 'public', 'uploads', 'videos', filename);
        await writeFile(targetPath, buffer);
        savedUrl = `/uploads/videos/${filename}`;
      } else if (kind === 'lottie') {
        // Lottie JSON animation (max 5MB)
        if (buffer.length > 5 * 1024 * 1024) {
          set.status = 400;
          return { error: 'Ukuran animasi Lottie maksimal 5 MB' };
        }

        const filename = `${timestamp}_${randomHex}.json`;
        const targetPath = join(root, 'public', 'uploads', 'lottie', filename);
        await writeFile(targetPath, buffer);
        savedUrl = `/uploads/lottie/${filename}`;
      } else {
        // Default: Image (convert to WebP via sharp)
        if (buffer.length > 10 * 1024 * 1024) {
          set.status = 400;
          return { error: 'Ukuran gambar maksimal 10 MB' };
        }

        const filename = `${timestamp}_${randomHex}.webp`;
        const targetPath = join(root, 'public', 'uploads', 'posts', filename);
        const webpBuffer = await sharp(buffer)
          .resize({ width: 1920, height: 1080, fit: 'inside', withoutEnlargement: true })
          .webp({ quality: 85 })
          .toBuffer();

        await writeFile(targetPath, webpBuffer);
        savedUrl = `/uploads/posts/${filename}`;
        meta.sizeBytes = webpBuffer.length;
      }

      const [inserted] = await db
        .insert(projectMedia)
        .values({
          productId: id,
          kind: kind as any,
          url: savedUrl,
          posterUrl,
          title: title ? title.trim().slice(0, 200) : null,
          caption: caption ? caption.trim() : null,
          meta
        })
        .$returningId();

      return {
        success: true,
        media: {
          id: inserted.id,
          productId: id,
          kind,
          url: savedUrl,
          title,
          caption
        }
      };
    }
  )

  /**
   * DELETE /api/showcase/:id/media/:mediaId
   * Remove media item from project
   */
  .delete(
    '/:id/media/:mediaId',
    async ({
      params,
      request,
      set
    }: {
      params: { id: string; mediaId: string };
      request: Request;
      set: any;
    }) => {
      const user = await resolveUserFromRequest(request);
      if (!user) {
        set.status = 401;
        return { error: 'Silakan masuk terlebih dahulu' };
      }

      const id = Number(params.id);
      const mediaId = Number(params.mediaId);

      const [mediaItem] = await db
        .select()
        .from(projectMedia)
        .where(and(eq(projectMedia.id, mediaId), eq(projectMedia.productId, id)));

      if (!mediaItem) {
        set.status = 404;
        return { error: 'Media tidak ditemukan' };
      }

      const [post] = await db
        .select({ userId: products.userId })
        .from(products)
        .where(eq(products.id, id));

      if (post && post.userId !== user.id && user.userType !== 'admin') {
        set.status = 403;
        return { error: 'Anda tidak memiliki hak untuk menghapus media ini' };
      }

      await db.delete(projectMedia).where(eq(projectMedia.id, mediaId));

      // Try deleting local file safely
      try {
        if (mediaItem.url.startsWith('/uploads/')) {
          const fullPath = join(process.cwd(), 'public', mediaItem.url.replace(/^\//, ''));
          if (existsSync(fullPath)) {
            await unlink(fullPath);
          }
        }
      } catch {}

      return { success: true, message: 'Media berhasil dihapus' };
    }
  );
