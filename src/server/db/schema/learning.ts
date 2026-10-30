import {
  bigint,
  decimal,
  index,
  int,
  mysqlEnum,
  mysqlTable,
  timestamp,
  uniqueIndex,
  varchar
} from 'drizzle-orm/mysql-core';
import { regions } from './schools';
import { users } from './users';
import { products } from './posts';

export const subdistricts = mysqlTable(
  'subdistricts',
  {
    id: bigint('id', { mode: 'number', unsigned: true }).autoincrement().primaryKey(),
    regionId: bigint('region_id', { mode: 'number', unsigned: true })
      .notNull()
      .references(() => regions.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 120 }).notNull(),
    latitude: decimal('latitude', { precision: 9, scale: 6 }).notNull(),
    longitude: decimal('longitude', { precision: 9, scale: 6 }).notNull()
  },
  (table) => [index('idx_subdistricts_region').on(table.regionId)]
);

export const badges = mysqlTable('badges', {
  id: bigint('id', { mode: 'number', unsigned: true }).autoincrement().primaryKey(),
  slug: varchar('slug', { length: 50 }).notNull().unique(),
  name: varchar('name', { length: 100 }).notNull(),
  description: varchar('description', { length: 255 }).notNull(),
  icon: varchar('icon', { length: 40 }).notNull(),
  color: mysqlEnum('color', ['emerald', 'blue', 'amber', 'violet']).notNull().default('blue'),
  category: mysqlEnum('category', [
    'work_ethic',
    'entrepreneurship',
    'quality',
    'school'
  ]).notNull()
});

export const userBadges = mysqlTable(
  'user_badges',
  {
    id: bigint('id', { mode: 'number', unsigned: true }).autoincrement().primaryKey(),
    userId: bigint('user_id', { mode: 'number', unsigned: true })
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    badgeId: bigint('badge_id', { mode: 'number', unsigned: true })
      .notNull()
      .references(() => badges.id, { onDelete: 'cascade' }),
    contextNote: varchar('context_note', { length: 160 }),
    awardedAt: timestamp('awarded_at').defaultNow().notNull()
  },
  (table) => [uniqueIndex('uq_user_badges_user_badge').on(table.userId, table.badgeId)]
);

export const productDailyStats = mysqlTable(
  'product_daily_stats',
  {
    id: bigint('id', { mode: 'number', unsigned: true }).autoincrement().primaryKey(),
    productId: bigint('product_id', { mode: 'number', unsigned: true })
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    statDate: varchar('stat_date', { length: 10 }).notNull(),
    views: int('views', { unsigned: true }).notNull().default(0),
    shares: int('shares', { unsigned: true }).notNull().default(0),
    ordersCreated: int('orders_created', { unsigned: true }).notNull().default(0)
  },
  (table) => [
    uniqueIndex('uq_product_daily_stats_prod_date').on(table.productId, table.statDate),
    index('idx_product_daily_stats_date').on(table.statDate)
  ]
);

