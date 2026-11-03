import sharp from 'sharp';
import { existsSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { eq } from 'drizzle-orm';
import { db } from '../db';
import { products, users } from '../db/schema';
import { formatRupiah } from '../../shared/format';
import { POST_TYPE_LABELS } from '../../shared/constants';

function escapeXml(text: string | null | undefined): string {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export class OgCardService {
  /**
   * Generates a 1200x630 WebP preview image for a post by its ID.
   */
  static async generateForPostId(postId: number): Promise<string | null> {
    const [row] = await db
      .select({
        post: products,
        author: users
      })
      .from(products)
      .innerJoin(users, eq(products.userId, users.id))
      .where(eq(products.id, postId))
      .limit(1);

    if (!row) return null;
    return this.generateForPost(row.post, row.author);
  }

  /**
   * Generates a 1200x630 WebP preview image for WhatsApp / Open Graph sharing.
   */
  static async generateForPost(
    post: {
      id: number;
      name: string;
      type: 'product' | 'service' | 'portfolio';
      price?: number | null;
      image: string;
      isVerifiedByTeacher?: boolean | null;
      isTefa?: boolean | null;
      tefaUnit?: string | null;
    },
    author: {
      name: string;
      schoolName?: string | null;
      isVerified?: boolean | null;
    }
  ): Promise<string> {
    const root = process.cwd();
    const ogDir = join(root, 'public', 'uploads', 'og');
    await mkdir(ogDir, { recursive: true });

    const filename = `post-${post.id}.webp`;
    const outputPath = join(ogDir, filename);
    const publicPath = `/uploads/og/${filename}`;

    // 1. Prepare left cover photo (600x630)
    let leftImageBuffer: Buffer;
    try {
      let rawImageBuffer: Buffer | null = null;
      if (post.image.startsWith('http://') || post.image.startsWith('https://')) {
        const resp = await fetch(post.image);
        if (resp.ok) {
          rawImageBuffer = Buffer.from(await resp.arrayBuffer());
        }
      } else {
        const localPath = join(root, 'public', post.image.replace(/^\//, ''));
        if (existsSync(localPath)) {
          const file = Bun.file(localPath);
          rawImageBuffer = Buffer.from(await file.arrayBuffer());
        }
      }

      if (rawImageBuffer) {
        leftImageBuffer = await sharp(rawImageBuffer)
          .resize(600, 630, { fit: 'cover', position: 'center' })
          .toBuffer();
      } else {
        throw new Error('Image source not readable');
      }
    } catch {
      // Fallback: Gradient background on the left
      const svgFallbackLeft = `
        <svg width="600" height="630" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="gLeft" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stop-color="#1e3a8a" />
              <stop offset="100%" stop-color="#3b82f6" />
            </linearGradient>
          </defs>
          <rect width="600" height="630" fill="url(#gLeft)" />
          <text x="300" y="325" fill="#ffffff" font-family="sans-serif" font-size="28" font-weight="bold" text-anchor="middle">
            VOC-MARKET
          </text>
        </svg>
      `;
      leftImageBuffer = await sharp(Buffer.from(svgFallbackLeft)).png().toBuffer();
    }

    // 2. Prepare right side content (600x630)
    const typeLabel = (POST_TYPE_LABELS[post.type] || 'Karya Siswa').toUpperCase();
    const cleanTitle = post.name.length > 55 ? post.name.slice(0, 52) + '...' : post.name;

    let priceText = 'Portofolio Karya Siswa';
    if (post.type !== 'portfolio' && (post.price || 0) > 0) {
      priceText = formatRupiah(post.price);
    }

    const isVerified = Boolean(
      post.isVerifiedByTeacher || post.isTefa || author.isVerified
    );
    const verifiedBadge = isVerified
      ? `<g transform="translate(48, 510)">
           <rect width="260" height="38" rx="19" fill="#e6f4ea" stroke="#34a853" stroke-width="2"/>
           <circle cx="28" cy="19" r="9" fill="#34a853"/>
           <path d="M24 19 l3 3 l6 -6" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
           <text x="148" y="24" fill="#137333" font-family="sans-serif" font-size="14" font-weight="bold" text-anchor="middle">
             Terverifikasi Guru / TeFa
           </text>
         </g>`
      : '';

    const authorSchool = author.schoolName
      ? `${author.name} • ${author.schoolName}`
      : author.name;

    const rightSvg = `
      <svg width="600" height="630" xmlns="http://www.w3.org/2000/svg">
        <rect width="600" height="630" fill="#FFFFFF" />

        <!-- Top Platform Branding -->
        <rect x="48" y="48" width="280" height="30" rx="15" fill="#e8f0fe" />
        <text x="188" y="68" fill="#1a73e8" font-family="sans-serif" font-size="11" font-weight="900" letter-spacing="1.5" text-anchor="middle">
          VOC-MARKET INDONESIA
        </text>

        <!-- Category/Type Pill -->
        <rect x="48" y="96" width="160" height="34" rx="8" fill="#f1f3f4" stroke="#dadce0" stroke-width="2" />
        <text x="128" y="118" fill="#3c4043" font-family="sans-serif" font-size="13" font-weight="bold" text-anchor="middle">
          ${escapeXml(typeLabel)}
        </text>

        <!-- Post Title -->
        <text x="48" y="195" fill="#202124" font-family="sans-serif" font-size="28" font-weight="900" width="500">
          ${escapeXml(cleanTitle)}
        </text>

        <!-- Big Price Pill -->
        <g transform="translate(48, 260)">
          <rect width="360" height="64" rx="16" fill="#1a73e8" />
          <text x="180" y="42" fill="#FFFFFF" font-family="sans-serif" font-size="28" font-weight="900" text-anchor="middle">
            ${escapeXml(priceText)}
          </text>
        </g>

        <!-- Creator Info -->
        <text x="48" y="380" fill="#70757a" font-family="sans-serif" font-size="13" font-weight="bold">
          KREATOR SISWA VOKASI:
        </text>
        <text x="48" y="415" fill="#1a73e8" font-family="sans-serif" font-size="20" font-weight="bold">
          ${escapeXml(author.name)}
        </text>
        <text x="48" y="445" fill="#5f6368" font-family="sans-serif" font-size="15" font-weight="600">
          ${escapeXml(author.schoolName || 'SMK Berprestasi')}
        </text>

        <!-- Verification Badge -->
        ${verifiedBadge}

        <!-- Bottom URL watermark -->
        <text x="552" y="590" fill="#9aa0a6" font-family="sans-serif" font-size="13" font-weight="bold" text-anchor="end">
          Pesan &amp; Lacak Resmi di voc-market.id
        </text>
      </svg>
    `;

    const rightImageBuffer = await sharp(Buffer.from(rightSvg)).png().toBuffer();

    // 3. Composite Left + Right into 1200x630
    await sharp({
      create: {
        width: 1200,
        height: 630,
        channels: 4,
        background: { r: 255, g: 255, b: 255, alpha: 1 }
      }
    })
      .composite([
        { input: leftImageBuffer, left: 0, top: 0 },
        { input: rightImageBuffer, left: 600, top: 0 }
      ])
      .webp({ quality: 90 })
      .toFile(outputPath);

    // 4. Update database
    await db
      .update(products)
      .set({ ogImage: publicPath })
      .where(eq(products.id, post.id));

    return publicPath;
  }
}
