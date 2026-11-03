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
    join(root, 'public', 'uploads', 'og')
  ];
  for (const dir of dirs) {
    await mkdir(dir, { recursive: true });
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
        '[VOC-Market DB] Existing database tables detected. Skipping schema creation to preserve data.'
      );
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

