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
  varchar
} from 'drizzle-orm/mysql-core';
import { regions, schools } from './schools';
import { subdistricts } from './learning';

export interface JobPreferences {
  types: ('pkl' | 'magang' | 'kerja' | 'freelance')[];
  regionIds: number[];
  willingToRelocate: boolean;
}

export const users = mysqlTable(
  'users',
  {
    id: bigint('id', { mode: 'number', unsigned: true }).autoincrement().primaryKey(),
    name: varchar('name', { length: 150 }).notNull(),
    username: varchar('username', { length: 50 }).notNull().unique(),
    firstName: varchar('first_name', { length: 100 }),
    lastName: varchar('last_name', { length: 100 }),
    email: varchar('email', { length: 191 }).notNull().unique(),
    password: varchar('password', { length: 255 }).notNull(),
    avatar: varchar('foto_profil', { length: 255 }),
    phoneNumber: varchar('phone_number', { length: 25 }),
    userType: mysqlEnum('user_type', ['smk', 'public', 'teacher', 'company', 'admin'])
      .notNull()
      .default('smk'),
    schoolName: varchar('school_name', { length: 180 }),
    schoolId: bigint('school_id', { mode: 'number', unsigned: true }).references(
      () => schools.id,
      { onDelete: 'set null' }
    ),
    regionId: bigint('region_id', { mode: 'number', unsigned: true }).references(
      () => regions.id,
      { onDelete: 'set null' }
    ),
    subdistrictId: bigint('subdistrict_id', { mode: 'number', unsigned: true }).references(
      () => subdistricts.id,
      { onDelete: 'set null' }
    ),
    creatorLevel: int('creator_level', { unsigned: true }).notNull().default(1),
    isSchoolAdmin: boolean('is_school_admin').notNull().default(false),
    isAdmin: boolean('is_admin').notNull().default(false),
    nisn: varchar('nisn', { length: 30 }),
    nip: varchar('nip', { length: 40 }),
    major: varchar('major', { length: 120 }),
    skills: varchar('skills', { length: 255 }),
    businessName: varchar('business_name', { length: 150 }),
    businessType: varchar('business_type', { length: 100 }),
    companyName: varchar('company_name', { length: 160 }),
    companySector: varchar('company_sector', { length: 100 }),
    companyWebsite: varchar('company_website', { length: 255 }),
    companyNib: varchar('company_nib', { length: 30 }),
    companyVerifiedAt: timestamp('company_verified_at'),
    studentStatus: mysqlEnum('student_status', ['active', 'final_year', 'alumni']),
    graduationYear: int('graduation_year', { unsigned: true }),
    openToWork: boolean('open_to_work').notNull().default(false),
    openToWorkSince: timestamp('open_to_work_since'),
    headline: varchar('headline', { length: 140 }),
    jobPreferences: json('job_preferences').$type<JobPreferences>(),
    statCompletedOrders: int('stat_completed_orders', { unsigned: true }).notNull().default(0),
    statAvgRating: decimal('stat_avg_rating', { precision: 3, scale: 2 })
      .notNull()
      .default('0.00'),
    statReviewsCount: int('stat_reviews_count', { unsigned: true }).notNull().default(0),
    statCertificatesCount: int('stat_certificates_count', { unsigned: true })
      .notNull()
      .default(0),
    talentScore: decimal('talent_score', { precision: 6, scale: 2 }).notNull().default('0.00'),
    lastActiveAt: timestamp('last_active_at'),
    bio: text('bio'),
    acceptingOrders: boolean('accepting_orders').notNull().default(true),
    isVerified: boolean('is_verified').notNull().default(false),
    verifiedBy: bigint('verified_by', { mode: 'number', unsigned: true }),
    verifiedAt: timestamp('verified_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull()
  },
  (table) => [
    index('idx_users_school').on(table.schoolName),
    index('idx_users_school_id').on(table.schoolId),
    index('idx_users_region_id').on(table.regionId),
    index('idx_users_subdistrict_id').on(table.subdistrictId),
    index('idx_users_type').on(table.userType),
    index('idx_users_talent').on(table.userType, table.openToWork)
  ]
);

export const sessions = mysqlTable(
  'sessions',
  {
    id: varchar('id', { length: 64 }).primaryKey(),
    userId: bigint('user_id', { mode: 'number', unsigned: true })
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    expiresAt: timestamp('expires_at').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull()
  },
  (table) => [index('idx_sessions_user').on(table.userId)]
);
