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
import { categories } from './posts';

export interface JudgingCriterion {
  name: string;
  weight: number;
}

export type RewardType = 'uang' | 'sertifikat' | 'magang' | 'kerja' | 'produk';

export const challenges = mysqlTable(
  'challenges',
  {
    id: bigint('id', { mode: 'number', unsigned: true }).autoincrement().primaryKey(),
    companyId: bigint('company_id', { mode: 'number', unsigned: true })
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    slug: varchar('slug', { length: 180 }).notNull().unique(),
    title: varchar('title', { length: 160 }).notNull(),
    summary: varchar('summary', { length: 255 }).notNull(),
    brief: text('brief').notNull(),
    requirements: text('requirements').notNull(),
    deliverables: text('deliverables').notNull(),
    judgingCriteria: json('judging_criteria').$type<JudgingCriterion[]>().notNull(),
    categoryId: bigint('category_id', { mode: 'number', unsigned: true }).references(
      () => categories.id,
      { onDelete: 'set null' }
    ),
    targetMajors: json('target_majors').$type<string[]>(),
    coverImage: varchar('cover_image', { length: 255 }),
    rewardTypes: json('reward_types').$type<RewardType[]>().notNull(),
    prizeDescription: text('prize_description').notNull(),
    winnerSlots: int('winner_slots', { unsigned: true }).notNull().default(3),
    submissionDeadline: timestamp('submission_deadline').notNull(),
    announcementDate: timestamp('announcement_date').notNull(),
    ipPolicy: mysqlEnum('ip_policy', ['winner_only', 'none']).notNull().default('winner_only'),
    status: mysqlEnum('status', [
      'draft',
      'pending_review',
      'open',
      'judging',
      'finished',
      'rejected',
      'cancelled'
    ])
      .notNull()
      .default('draft'),
    rejectionReason: varchar('rejection_reason', { length: 255 }),
    submissionsCount: int('submissions_count', { unsigned: true }).notNull().default(0),
    viewsCount: int('views_count', { unsigned: true }).notNull().default(0),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull()
  },
  (table) => [
    index('idx_challenges_status').on(table.status, table.categoryId),
    index('idx_challenges_company').on(table.companyId)
  ]
);

export const challengeSubmissions = mysqlTable(
  'challenge_submissions',
  {
    id: bigint('id', { mode: 'number', unsigned: true }).autoincrement().primaryKey(),
    challengeId: bigint('challenge_id', { mode: 'number', unsigned: true })
      .notNull()
      .references(() => challenges.id, { onDelete: 'cascade' }),
    userId: bigint('user_id', { mode: 'number', unsigned: true })
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    title: varchar('title', { length: 160 }).notNull(),
    description: text('description').notNull(),
    images: json('images').$type<string[]>().notNull(),
    externalLink: varchar('external_link', { length: 255 }),
    isPublicAfterFinish: boolean('is_public_after_finish').notNull().default(true),
    status: mysqlEnum('status', [
      'submitted',
      'shortlisted',
      'winner',
      'runner_up',
      'honorable',
      'participant',
      'disqualified'
    ])
      .notNull()
      .default('submitted'),
    rank: int('rank', { unsigned: true }),
    scores: json('scores').$type<Record<string, number>>(),
    totalScore: decimal('total_score', { precision: 5, scale: 2 }),
    feedback: text('feedback'),
    submittedAt: timestamp('submitted_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull()
  },
  (table) => [
    uniqueIndex('uq_challenge_submissions_user').on(table.challengeId, table.userId),
    index('idx_challenge_submissions_user').on(table.userId)
  ]
);

export const certificates = mysqlTable(
  'certificates',
  {
    id: bigint('id', { mode: 'number', unsigned: true }).autoincrement().primaryKey(),
    code: varchar('code', { length: 24 }).notNull().unique(),
    userId: bigint('user_id', { mode: 'number', unsigned: true })
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    challengeId: bigint('challenge_id', { mode: 'number', unsigned: true }).references(
      () => challenges.id,
      { onDelete: 'set null' }
    ),
    submissionId: bigint('submission_id', { mode: 'number', unsigned: true }).references(
      () => challengeSubmissions.id,
      { onDelete: 'set null' }
    ),
    type: mysqlEnum('type', ['winner', 'runner_up', 'finalist', 'participant']).notNull(),
    title: varchar('title', { length: 200 }).notNull(),
    issuerName: varchar('issuer_name', { length: 160 }).notNull(),
    issuedAt: timestamp('issued_at').defaultNow().notNull(),
    revokedAt: timestamp('revoked_at')
  },
  (table) => [
    index('idx_certificates_user').on(table.userId),
    index('idx_certificates_challenge').on(table.challengeId)
  ]
);

