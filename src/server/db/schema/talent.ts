import {
  bigint,
  index,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  uniqueIndex,
  varchar
} from 'drizzle-orm/mysql-core';
import { users } from './users';
import { regions } from './schools';

export const hiringInvitations = mysqlTable(
  'hiring_invitations',
  {
    id: bigint('id', { mode: 'number', unsigned: true }).autoincrement().primaryKey(),
    companyId: bigint('company_id', { mode: 'number', unsigned: true })
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    studentId: bigint('student_id', { mode: 'number', unsigned: true })
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    type: mysqlEnum('type', ['pkl', 'magang', 'kerja', 'freelance']).notNull(),
    position: varchar('position', { length: 120 }).notNull(),
    message: text('message').notNull(),
    regionId: bigint('region_id', { mode: 'number', unsigned: true }).references(
      () => regions.id,
      { onDelete: 'set null' }
    ),
    salaryInfo: varchar('salary_info', { length: 120 }),
    status: mysqlEnum('status', ['pending', 'accepted', 'declined', 'expired', 'withdrawn'])
      .notNull()
      .default('pending'),
    declineReason: varchar('decline_reason', { length: 255 }),
    respondedAt: timestamp('responded_at'),
    expiresAt: timestamp('expires_at').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull()
  },
  (table) => [
    index('idx_invitations_student').on(table.studentId, table.status),
    index('idx_invitations_company').on(table.companyId, table.status)
  ]
);

export const savedTalents = mysqlTable(
  'saved_talents',
  {
    id: bigint('id', { mode: 'number', unsigned: true }).autoincrement().primaryKey(),
    companyId: bigint('company_id', { mode: 'number', unsigned: true })
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    studentId: bigint('student_id', { mode: 'number', unsigned: true })
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    note: varchar('note', { length: 255 }),
    createdAt: timestamp('created_at').defaultNow().notNull()
  },
  (table) => [uniqueIndex('uq_saved_talents_pair').on(table.companyId, table.studentId)]
);

