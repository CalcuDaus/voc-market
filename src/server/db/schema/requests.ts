import {
  bigint,
  index,
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  uniqueIndex,
  varchar
} from 'drizzle-orm/mysql-core';
import { users } from './users';
import { categories, products } from './posts';
import { regions } from './schools';

export const jobRequests = mysqlTable(
  'job_requests',
  {
    id: bigint('id', { mode: 'number', unsigned: true }).autoincrement().primaryKey(),
    code: varchar('code', { length: 28 }).notNull().unique(),
    userId: bigint('user_id', { mode: 'number', unsigned: true })
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    categoryId: bigint('category_id', { mode: 'number', unsigned: true }).references(
      () => categories.id,
      { onDelete: 'set null' }
    ),
    title: varchar('title', { length: 140 }).notNull(),
    description: text('description').notNull(),
    image: varchar('image', { length: 255 }),
    budgetType: mysqlEnum('budget_type', ['fixed', 'range', 'negotiable'])
      .notNull()
      .default('negotiable'),
    budgetMin: bigint('budget_min', { mode: 'number', unsigned: true }),
    budgetMax: bigint('budget_max', { mode: 'number', unsigned: true }),
    workMode: mysqlEnum('work_mode', ['onsite', 'remote', 'dropoff']).notNull().default('remote'),
    regionId: bigint('region_id', { mode: 'number', unsigned: true }).references(
      () => regions.id,
      { onDelete: 'set null' }
    ),
    locationDetail: varchar('location_detail', { length: 255 }),
    fullAddress: varchar('full_address', { length: 255 }),
    neededBy: timestamp('needed_by'),
    maxProposals: int('max_proposals', { unsigned: true }).notNull().default(10),
    status: mysqlEnum('status', ['open', 'assigned', 'completed', 'closed', 'expired', 'hidden'])
      .notNull()
      .default('open'),
    assignedProposalId: bigint('assigned_proposal_id', { mode: 'number', unsigned: true }),
    proposalsCount: int('proposals_count', { unsigned: true }).notNull().default(0),
    viewsCount: int('views_count', { unsigned: true }).notNull().default(0),
    expiresAt: timestamp('expires_at').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull()
  },
  (table) => [
    index('idx_job_requests_status').on(table.status, table.categoryId, table.regionId),
    index('idx_job_requests_user').on(table.userId)
  ]
);

export const jobProposals = mysqlTable(
  'job_proposals',
  {
    id: bigint('id', { mode: 'number', unsigned: true }).autoincrement().primaryKey(),
    jobRequestId: bigint('job_request_id', { mode: 'number', unsigned: true })
      .notNull()
      .references(() => jobRequests.id, { onDelete: 'cascade' }),
    userId: bigint('user_id', { mode: 'number', unsigned: true })
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    message: text('message').notNull(),
    offeredPrice: bigint('offered_price', { mode: 'number', unsigned: true }).notNull(),
    estimatedDays: int('estimated_days', { unsigned: true }).notNull(),
    portfolioProductId: bigint('portfolio_product_id', { mode: 'number', unsigned: true }).references(
      () => products.id,
      { onDelete: 'set null' }
    ),
    status: mysqlEnum('status', ['pending', 'accepted', 'rejected', 'withdrawn'])
      .notNull()
      .default('pending'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull()
  },
  (table) => [
    uniqueIndex('uq_job_proposals_request_user').on(table.jobRequestId, table.userId),
    index('idx_job_proposals_user').on(table.userId)
  ]
);

