import sharp from 'sharp';
import { randomBytes } from 'node:crypto';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';

const ALLOWED_MIMES = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp']);

export class ImageValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ImageValidationError';
  }
}

export async function saveUploadedWebp(
  file: unknown,
  subdir: 'avatars' | 'posts' | 'proofs' | 'schools' | 'requests' | 'challenges',
  options: { maxWidth?: number; maxBytes?: number } = {}
): Promise<string> {
  if (!(file instanceof Blob) || file.size === 0) {
    throw new ImageValidationError('File gambar wajib diunggah.');
  }

  const maxBytes = options.maxBytes ?? 5 * 1024 * 1024;
  const maxWidth = options.maxWidth ?? 1280;

  if (file.size > maxBytes) {
    const mb = Math.round(maxBytes / (1024 * 1024));
    throw new ImageValidationError(`Ukuran gambar maksimal ${mb} MB.`);
  }

  if (file.type && !ALLOWED_MIMES.has(file.type.toLowerCase())) {
    throw new ImageValidationError('Format gambar harus JPG, PNG, atau WebP.');
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const outDir = join(process.cwd(), 'public', 'uploads', subdir);
  await mkdir(outDir, { recursive: true });

  const filename = `${Date.now()}_${randomBytes(8).toString('hex')}.webp`;
  const fullPath = join(outDir, filename);

  try {
    await sharp(buffer)
      .rotate() // Auto-rotate smartphone EXIF orientation
      .resize({ width: maxWidth, withoutEnlargement: true })
      .webp({ quality: 88 })
      .toFile(fullPath);
  } catch {
    throw new ImageValidationError('File gambar rusak atau format tidak didukung.');
  }

  return `/uploads/${subdir}/${filename}`;
}

