import mysql from 'mysql2/promise';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { SCHEMA_DDL_STATEMENTS } from './reset';
import { runSeed } from './seed';

async function waitForConnection(
  uri: string,
  maxRetries = 30,
  intervalMs = 2000
): Promise<mysql.Connection> {
  const parsed = new URL(uri);
  const host = parsed.hostname || '127.0.0.1';
  const port = Number(parsed.port || 3306);
  const user = decodeURIComponent(parsed.username || 'root');
  const password = decodeURIComponent(parsed.password || '');
  const database = parsed.pathname.replace(/^\//, '');

  console.log(`[VOC-Market DB] Connecting to MySQL at ${host}:${port}/${database}...`);

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const conn = await mysql.createConnection({
        host,
        port,
        user,
        password
      });

      if (database) {
        await conn.query(
          `CREATE DATABASE IF NOT EXISTS \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`
        );
        await conn.query(`USE \`${database}\`;`);
      }
      return conn;
    } catch (err: any) {
      console.log(
        `[VOC-Market DB] Waiting for MySQL... (${attempt}/${maxRetries}): ${err?.message || err}`
      );
      if (attempt === maxRetries) {
        throw new Error(`Failed to connect to MySQL after ${maxRetries} attempts.`);
      }
      await new Promise((r) => setTimeout(r, intervalMs));
    }
  }
  throw new Error('Connection failed');
}

export async function ensureUploadDirectories(): Promise<void> {
  const root = process.cwd();
  const dirs = [
    join(root, 'public', 'images'),
    join(root, 'public', 'uploads'),
    join(root, 'public', 'uploads', 'avatars'),
    join(root, 'public', 'uploads', 'posts'),
    join(root, 'public', 'uploads', 'proofs'),
    join(root, 'public', 'uploads', 'schools'),
    join(root, 'public', 'uploads', 'requests'),
    join(root, 'public', 'uploads', 'challenges'),
    join(root, 'public', 'uploads', 'og'),
    join(root, 'public', 'uploads', 'models'),
    join(root, 'public', 'uploads', 'videos'),
    join(root, 'public', 'uploads', 'lottie')
  ];
  for (const dir of dirs) {
    await mkdir(dir, { recursive: true });
  }
}

export const SHOWCASE_DDL_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS \`project_details\` (
    \`product_id\` BIGINT UNSIGNED NOT NULL,
    \`tagline\` VARCHAR(255) NULL,
    \`major\` VARCHAR(80) NULL,
    \`problem\` TEXT NULL,
    \`process\` TEXT NULL,
    \`result\` TEXT NULL,
    \`role\` VARCHAR(160) NULL,
    \`tools\` JSON NULL,
    \`team_members\` JSON NULL,
    \`demo_url\` VARCHAR(500) NULL,
    \`repo_url\` VARCHAR(500) NULL,
    \`model_url\` VARCHAR(500) NULL,
    \`created_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    \`updated_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (\`product_id\`),
    KEY \`idx_project_details_major\` (\`major\`),
    CONSTRAINT \`fk_project_details_product\` FOREIGN KEY (\`product_id\`) REFERENCES \`products\`(\`id\`) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

  `CREATE TABLE IF NOT EXISTS \`project_media\` (
    \`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    \`product_id\` BIGINT UNSIGNED NOT NULL,
    \`kind\` ENUM('image', 'video', 'model3d', 'lottie', 'embed', 'pdf') NOT NULL DEFAULT 'image',
    \`url\` VARCHAR(500) NOT NULL,
    \`poster_url\` VARCHAR(500) NULL,
    \`title\` VARCHAR(200) NULL,
    \`caption\` TEXT NULL,
    \`sort_order\` INT NOT NULL DEFAULT 0,
    \`meta\` JSON NULL,
    \`created_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (\`id\`),
    KEY \`idx_project_media_product\` (\`product_id\`, \`sort_order\`),
    CONSTRAINT \`fk_project_media_product\` FOREIGN KEY (\`product_id\`) REFERENCES \`products\`(\`id\`) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`
];

export async function ensureShowcaseTables(conn: mysql.Connection): Promise<void> {
  for (const stmt of SHOWCASE_DDL_STATEMENTS) {
    try {
      await conn.query(stmt);
    } catch (e) {
      console.warn('[Skill-Hub DB] Warning ensuring showcase table:', e);
    }
  }
}

export async function initDatabase(): Promise<void> {
  const dbUri = process.env.DATABASE_URL || 'mysql://root@127.0.0.1:3306/voc_market';
  await ensureUploadDirectories();

  const conn = await waitForConnection(dbUri);
  try {
    const [tables] = await conn.query<mysql.RowDataPacket[]>('SHOW TABLES LIKE "users";');
    if (tables.length > 0) {
      console.log(
        '[Skill-Hub DB] Existing database tables detected. Ensuring latest showcase schema tables...'
      );
      await ensureShowcaseTables(conn);
      return;
    }

    console.log('[VOC-Market DB] Empty database detected. Creating schema tables...');
    await conn.query('SET FOREIGN_KEY_CHECKS = 0;');
    for (const stmt of SCHEMA_DDL_STATEMENTS) {
      await conn.query(stmt);
    }
    await conn.query('SET FOREIGN_KEY_CHECKS = 1;');
    console.log('[VOC-Market DB] Tables created successfully.');

    const shouldSeed = process.env.SEED_ON_INIT !== 'false';
    if (shouldSeed) {
      console.log(
        '[VOC-Market DB] Seeding initial data (demo users, categories, products, regions)...'
      );
      await runSeed();
      console.log('[VOC-Market DB] Seeding completed.');
    }
  } finally {
    await conn.end();
  }
}

if (import.meta.main) {
  initDatabase()
    .then(() => {
      console.log('[VOC-Market DB] Initialization finished successfully.');
      process.exit(0);
    })
    .catch((err) => {
      console.error('[VOC-Market DB] Initialization failed:', err);
      process.exit(1);
    });
}

