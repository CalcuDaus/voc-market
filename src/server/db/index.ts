import mysql from 'mysql2/promise';
import { drizzle } from 'drizzle-orm/mysql2';
import * as schema from './schema';

const isTest = process.env.NODE_ENV === 'test' || Boolean(process.env.BUN_TEST);

export const activeDatabaseUrl = isTest
  ? process.env.TEST_DATABASE_URL || 'mysql://root@127.0.0.1:3306/voc_market_test'
  : process.env.DATABASE_URL || 'mysql://root@127.0.0.1:3306/voc_market';

export const pool = mysql.createPool({
  uri: activeDatabaseUrl,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  timezone: '+00:00'
});

export const db = drizzle(pool, { schema, mode: 'default' });

