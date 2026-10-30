import {
  bigint,
  boolean,
  index,
  json,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar
} from 'drizzle-orm/mysql-core';
import { subdistricts } from './learning';

export const regions = mysqlTable(
  'regions',
  {
    id: bigint('id', { mode: 'number', unsigned: true }).autoincrement().primaryKey(),
    code: varchar('code', { length: 10 }).notNull().unique(),
    name: varchar('name', { length: 100 }).notNull(),
    province: varchar('province', { length: 100 }).notNull(),
    type: mysqlEnum('type', ['kabupaten', 'kota']).notNull()
  },
  (table) => [index('idx_regions_province').on(table.province)]
);

export const schools = mysqlTable(
  'schools',
  {
    id: bigint('id', { mode: 'number', unsigned: true }).autoincrement().primaryKey(),
    npsn: varchar('npsn', { length: 12 }).unique(),
    name: varchar('name', { length: 160 }).notNull(),
    slug: varchar('slug', { length: 180 }).notNull().unique(),
    regionId: bigint('region_id', { mode: 'number', unsigned: true }).references(
      () => regions.id,
      { onDelete: 'set null' }
    ),
    subdistrictId: bigint('subdistrict_id', { mode: 'number', unsigned: true }).references(
      () => subdistricts.id,
      { onDelete: 'set null' }
    ),
    address: varchar('address', { length: 255 }),
    logo: varchar('logo', { length: 255 }),
    coverImage: varchar('cover_image', { length: 255 }),
    description: text('description'),
    majors: json('majors').$type<string[]>(),
    hasTefa: boolean('has_tefa').notNull().default(false),
    tefaDescription: text('tefa_description'),
    officialPhone: varchar('official_phone', { length: 30 }),
    website: varchar('website', { length: 255 }),
    isVerified: boolean('is_verified').notNull().default(false),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull()
  },
  (table) => [
    index('idx_schools_region').on(table.regionId),
    index('idx_schools_subdistrict').on(table.subdistrictId),
    index('idx_schools_name').on(table.name)
  ]
);

