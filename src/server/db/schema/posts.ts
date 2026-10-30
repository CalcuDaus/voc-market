import {
  bigint,
  boolean,
  decimal,
  index,
  int,
  json,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  uniqueIndex,
  varchar
} from 'drizzle-orm/mysql-core';
import { users } from './users';
import { schools } from './schools';
import { subdistricts } from './learning';

export interface CostBreakdown {
  material: number;
  packaging: number;
  overhead: number;
  labor: number;
}

export const categories = mysqlTable('categories', {
  id: bigint('id', { mode: 'number', unsigned: true }).autoincrement().primaryKey(),
  name: varchar('name', { length: 120 }).notNull().unique(),
  slug: varchar('slug', { length: 130 }).notNull().unique(),
  icon: varchar('icon', { length: 40 }).notNull().default('sparkles'),
  createdAt: timestamp('created_at').defaultNow().notNull()
});

export const products = mysqlTable(
  'products',
  {
    id: bigint('id', { mode: 'number', unsigned: true }).autoincrement().primaryKey(),
    userId: bigint('user_id', { mode: 'number', unsigned: true })
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    schoolId: bigint('school_id', { mode: 'number', unsigned: true }).references(
      () => schools.id,
      { onDelete: 'set null' }
    ),
    subdistrictId: bigint('subdistrict_id', { mode: 'number', unsigned: true }).references(
      () => subdistricts.id,
      { onDelete: 'set null' }
    ),
    type: mysqlEnum('type', ['product', 'service', 'portfolio']).notNull().default('product'),
    name: varchar('name', { length: 200 }).notNull(),
    code: varchar('barcode', { length: 40 }).notNull().unique(),
    categoryId: bigint('category_id', { mode: 'number', unsigned: true }).references(
      () => categories.id,
      { onDelete: 'set null' }
    ),
    description: text('description').notNull(),
    image: varchar('image', { length: 255 }).notNull(),
    ogImage: varchar('og_image', { length: 255 }),
    costPrice: bigint('cost_price', { mode: 'number', unsigned: true }).notNull().default(0),
    costBreakdown: json('cost_breakdown').$type<CostBreakdown>(),
    estimatedHours: decimal('estimated_hours', { precision: 5, scale: 1 }),
    price: bigint('price', { mode: 'number', unsigned: true }).notNull().default(0),
    priceMin: bigint('price_min', { mode: 'number', unsigned: true }),
    priceMax: bigint('price_max', { mode: 'number', unsigned: true }),
    serviceAreaType: mysqlEnum('service_area_type', [
      'onsite',
      'workshop',
      'delivery',
      'digital'
    ])
      .notNull()
      .default('delivery'),
    maxDistanceKm: int('max_distance_km', { unsigned: true }),
    stock: int('stock').notNull().default(1),
    projectLink: varchar('project_link', { length: 255 }),
    likesCount: int('likes_count', { unsigned: true }).notNull().default(0),
    viewsCount: int('views_count', { unsigned: true }).notNull().default(0),
    sharesCount: int('shares_count', { unsigned: true }).notNull().default(0),
    isVerifiedByTeacher: boolean('is_verified_by_teacher').notNull().default(false),
    verifiedBy: bigint('verified_by', { mode: 'number', unsigned: true }),
    teacherNote: varchar('teacher_note', { length: 255 }),
    isTefa: boolean('is_tefa').notNull().default(false),
    tefaUnit: varchar('tefa_unit', { length: 120 }),
    status: mysqlEnum('status', ['published', 'archived']).notNull().default('published'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull()
  },
  (table) => [
    index('idx_products_catalog').on(table.status, table.type, table.categoryId),
    index('idx_products_user').on(table.userId),
    index('idx_products_school').on(table.schoolId, table.status),
    index('idx_products_subdistrict').on(table.subdistrictId)
  ]
);

export const postLikes = mysqlTable(
  'post_likes',
  {
    id: bigint('id', { mode: 'number', unsigned: true }).autoincrement().primaryKey(),
    productId: bigint('product_id', { mode: 'number', unsigned: true })
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    actorKey: varchar('actor_key', { length: 80 }).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull()
  },
  (table) => [uniqueIndex('uq_post_likes_actor').on(table.productId, table.actorKey)]
);
