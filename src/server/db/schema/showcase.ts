import {
  bigint,
  index,
  int,
  json,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar
} from 'drizzle-orm/mysql-core';
import { products } from './posts';

export const projectDetails = mysqlTable(
  'project_details',
  {
    productId: bigint('product_id', { mode: 'number', unsigned: true })
      .primaryKey()
      .references(() => products.id, { onDelete: 'cascade' }),
    tagline: varchar('tagline', { length: 255 }),
    major: varchar('major', { length: 80 }),
    problem: text('problem'),
    process: text('process'),
    result: text('result'),
    role: varchar('role', { length: 160 }),
    tools: json('tools').$type<string[]>(),
    teamMembers: json('team_members').$type<{ userId?: number; name: string; role: string }[]>(),
    demoUrl: varchar('demo_url', { length: 500 }),
    repoUrl: varchar('repo_url', { length: 500 }),
    modelUrl: varchar('model_url', { length: 500 }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull()
  },
  (table) => [index('idx_project_details_major').on(table.major)]
);

export const projectMedia = mysqlTable(
  'project_media',
  {
    id: bigint('id', { mode: 'number', unsigned: true }).autoincrement().primaryKey(),
    productId: bigint('product_id', { mode: 'number', unsigned: true })
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    kind: mysqlEnum('kind', ['image', 'video', 'model3d', 'lottie', 'embed', 'pdf'])
      .notNull()
      .default('image'),
    url: varchar('url', { length: 500 }).notNull(),
    posterUrl: varchar('poster_url', { length: 500 }),
    title: varchar('title', { length: 200 }),
    caption: text('caption'),
    sortOrder: int('sort_order').notNull().default(0),
    meta: json('meta').$type<{
      sizeBytes?: number;
      durationSec?: number;
      provider?: string;
      polycount?: number;
      dimensions?: { width: number; height: number };
    }>(),
    createdAt: timestamp('created_at').defaultNow().notNull()
  },
  (table) => [index('idx_project_media_product').on(table.productId, table.sortOrder)]
);
