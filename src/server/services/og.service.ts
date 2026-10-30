import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { eq } from 'drizzle-orm';
import { db } from '../db';
import { certificates, challenges, jobRequests, products, schools, users } from '../db/schema';
import { getAvatarUrl } from '../middleware/auth';
import { formatIdrPlain } from './whatsapp.service';
import { CERTIFICATE_TYPE_LABELS, POST_TYPE_LABELS } from '../../shared/constants';

function escapeHtmlAttr(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

async function getHtmlTemplate(): Promise<string> {
  const distHtml = join(process.cwd(), 'dist', 'index.html');
  if (existsSync(distHtml)) {
    return readFile(distHtml, 'utf-8');
  }
  return readFile(join(process.cwd(), 'index.html'), 'utf-8');
}

function injectMeta(
  html: string,
  meta: { title: string; description: string; image: string; url: string; type?: string }
): string {
  const safeTitle = escapeHtmlAttr(meta.title);
  const safeDesc = escapeHtmlAttr(meta.description.slice(0, 200));
  const safeImg = escapeHtmlAttr(meta.image);
  const safeUrl = escapeHtmlAttr(meta.url);
  const safeType = escapeHtmlAttr(meta.type || 'website');

  return html
    .replace(/<title>.*?<\/title>/s, `<title>${safeTitle}</title>`)
    .replace(
      /<meta name="description" content=".*?"\s*\/?>/,
      `<meta name="description" content="${safeDesc}" />`
    )
    .replace(
      /<meta property="og:type" content=".*?"\s*\/?>/,
      `<meta property="og:type" content="${safeType}" />`
    )
    .replace(
      /<meta property="og:title" content=".*?"\s*\/?>/,
      `<meta property="og:title" content="${safeTitle}" />`
    )
    .replace(
      /<meta property="og:description" content=".*?"\s*\/?>/,
      `<meta property="og:description" content="${safeDesc}" />`
    )
    .replace(
      /<meta property="og:image" content=".*?"\s*\/?>/,
      `<meta property="og:image" content="${safeImg}" />`
    )
    .replace(
      /<meta property="og:url" content=".*?"\s*\/?>/,
      `<meta property="og:url" content="${safeUrl}" />`
    );
}

export async function renderSpaHtmlWithOg(requestUrl: string): Promise<string> {
  const html = await getHtmlTemplate();
  const parsed = new URL(requestUrl);
  const baseUrl = process.env.APP_URL || `${parsed.protocol}//${parsed.host}`;
  const path = parsed.pathname;

  // 1. /karya/:id
  const postMatch = path.match(/^\/karya\/(\d+)$/);
  if (postMatch) {
    const postId = Number(postMatch[1]);
    const rows = await db
      .select({ post: products, author: users })
      .from(products)
      .innerJoin(users, eq(products.userId, users.id))
      .where(eq(products.id, postId))
      .limit(1);

    if (rows[0]) {
      const { post, author } = rows[0];
      const typeLabel = POST_TYPE_LABELS[post.type] || 'Karya';
      const priceText =
        post.type === 'portfolio'
          ? 'Portofolio Karya SMK'
          : formatIdrPlain(post.type === 'service' ? post.priceMin || post.price : post.price);
      const schoolInfo = author.schoolName ? ` — ${author.schoolName}` : '';
      const rawImg = post.ogImage || post.image;
      const imgUrl = rawImg.startsWith('http') ? rawImg : `${baseUrl}${rawImg}`;

      const schemaLd = {
        '@context': 'https://schema.org',
        '@type': post.type === 'service' ? 'Service' : 'Product',
        name: post.name,
        description: post.description,
        image: imgUrl,
        offers: {
          '@type': 'Offer',
          priceCurrency: 'IDR',
          price: post.price,
          availability: 'https://schema.org/InStock',
          seller: {
            '@type': 'Person',
            name: author.name
          }
        }
      };

      const metaInjected = injectMeta(html, {
        title: `${post.name} (${priceText}) — VOC-Market`,
        description: `[${typeLabel}] Oleh ${author.name}${schoolInfo}. ${post.description}`,
        image: imgUrl,
        url: `${baseUrl}/karya/${post.id}`,
        type: 'product'
      });

      return metaInjected.replace(
        '</head>',
        `  <script type="application/ld+json">${JSON.stringify(schemaLd)}</script>\n</head>`
      );
    }
  }

  // 2. /paspor-kerja/:username
  const passportMatch = path.match(/^\/paspor-kerja\/([a-zA-Z0-9_-]+)$/);
  if (passportMatch) {
    const uname = passportMatch[1].toLowerCase();
    const rows = await db.select().from(users).where(eq(users.username, uname)).limit(1);
    if (rows[0] && rows[0].userType === 'smk') {
      const u = rows[0];
      const avatar = getAvatarUrl(u);
      const imgUrl = avatar.startsWith('http') ? avatar : `${baseUrl}${avatar}`;
      const school = u.schoolName || 'Siswa SMK';
      const major = u.major ? ` (${u.major})` : '';

      return injectMeta(html, {
        title: `Paspor Kerja Digital: ${u.name} — ${school}`,
        description: `Rekam jejak pengalaman kerja nyata & portofolio terverifikasi dari ${u.name}, ${school}${major} di VOC-Market.`,
        image: imgUrl,
        url: `${baseUrl}/paspor-kerja/${u.username}`,
        type: 'profile'
      });
    }
  }

  // 3. /sekolah/:slug
  const schoolMatch = path.match(/^\/sekolah\/([a-zA-Z0-9_-]+)$/);
  if (schoolMatch) {
    const slug = schoolMatch[1].toLowerCase();
    const [school] = await db.select().from(schools).where(eq(schools.slug, slug)).limit(1);
    if (school) {
      const rawImg = school.coverImage || school.logo || '/images/voc-logo.png';
      const imgUrl = rawImg.startsWith('http') ? rawImg : `${baseUrl}${rawImg}`;
      return injectMeta(html, {
        title: `Etalase Sekolah: ${school.name} — VOC-Market`,
        description:
          school.description ||
          `Jelajahi karya terbaik siswa, layanan Unit Produksi Teaching Factory (TeFa), dan talenta unggulan dari ${school.name}.`,
        image: imgUrl,
        url: `${baseUrl}/sekolah/${school.slug}`,
        type: 'website'
      });
    }
  }

  // 4. /tantangan/:slug
  const challengeMatch = path.match(/^\/tantangan\/([a-zA-Z0-9_-]+)$/);
  if (challengeMatch && challengeMatch[1] !== 'buat') {
    const slug = challengeMatch[1].toLowerCase();
    const rows = await db
      .select({ challenge: challenges, company: users })
      .from(challenges)
      .innerJoin(users, eq(challenges.companyId, users.id))
      .where(eq(challenges.slug, slug))
      .limit(1);

    if (rows[0] && ['open', 'judging', 'finished'].includes(rows[0].challenge.status)) {
      const { challenge, company } = rows[0];
      const rawImg = challenge.coverImage || '/images/voc-logo.png';
      const imgUrl = rawImg.startsWith('http') ? rawImg : `${baseUrl}${rawImg}`;
      const companyTitle = company.companyName || company.name;
      return injectMeta(html, {
        title: `Tantangan Industri: ${challenge.title} — ${companyTitle}`,
        description: `${challenge.summary} Hadiah: ${challenge.prizeDescription}`,
        image: imgUrl,
        url: `${baseUrl}/tantangan/${challenge.slug}`,
        type: 'article'
      });
    }
  }

  // 5. /sertifikat/:code
  const certMatch = path.match(/^\/sertifikat\/([a-zA-Z0-9_-]+)$/);
  if (certMatch) {
    const code = certMatch[1].toUpperCase();
    const rows = await db
      .select({ cert: certificates, student: users })
      .from(certificates)
      .innerJoin(users, eq(certificates.userId, users.id))
      .where(eq(certificates.code, code))
      .limit(1);

    if (rows[0]) {
      const { cert, student } = rows[0];
      const label = CERTIFICATE_TYPE_LABELS[cert.type] || 'Sertifikat Kompetisi';
      const avatar = getAvatarUrl(student);
      const imgUrl = avatar.startsWith('http') ? avatar : `${baseUrl}${avatar}`;
      return injectMeta(html, {
        title: `${label}: ${student.name} (${cert.code}) — VOC-Market`,
        description: `${cert.title} diterbitkan secara resmi oleh ${cert.issuerName} melalui VOC-Market.`,
        image: imgUrl,
        url: `${baseUrl}/sertifikat/${cert.code}`,
        type: 'article'
      });
    }
  }

  // 6. /butuh-bantuan/:code
  const reqMatch = path.match(/^\/butuh-bantuan\/([a-zA-Z0-9_-]+)$/);
  if (reqMatch && reqMatch[1] !== 'buat') {
    const code = reqMatch[1].toUpperCase();
    const [reqRow] = await db
      .select()
      .from(jobRequests)
      .where(eq(jobRequests.code, code))
      .limit(1);
    if (reqRow && reqRow.status !== 'hidden') {
      const rawImg = reqRow.image || '/images/voc-logo.png';
      const imgUrl = rawImg.startsWith('http') ? rawImg : `${baseUrl}${rawImg}`;
      return injectMeta(html, {
        title: `Butuh Bantuan: ${reqRow.title} — VOC-Market`,
        description: reqRow.description,
        image: imgUrl,
        url: `${baseUrl}/butuh-bantuan/${reqRow.code}`,
        type: 'website'
      });
    }
  }

  return html;
}
