import {
  bigint,
  index,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar
} from 'drizzle-orm/mysql-core';
import { users } from './users';

export const notifications = mysqlTable(
  'notifications',
  {
    id: bigint('id', { mode: 'number', unsigned: true }).autoincrement().primaryKey(),
    userId: bigint('user_id', { mode: 'number', unsigned: true })
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    type: varchar('type', { length: 50 }).notNull(),
    title: varchar('title', { length: 160 }).notNull(),
    body: varchar('body', { length: 255 }).notNull(),
    actionUrl: varchar('action_url', { length: 255 }),
    readAt: timestamp('read_at'),
    createdAt: timestamp('created_at').defaultNow().notNull()
  },
  (table) => [index('idx_notifications_user_read').on(table.userId, table.readAt)]
);

export const reports = mysqlTable(
  'reports',
  {
    id: bigint('id', { mode: 'number', unsigned: true }).autoincrement().primaryKey(),
    reporterId: bigint('reporter_id', { mode: 'number', unsigned: true }).references(
      () => users.id,
      { onDelete: 'set null' }
    ),
    targetType: mysqlEnum('target_type', ['post', 'request', 'challenge', 'user']).notNull(),
    targetId: bigint('target_id', { mode: 'number', unsigned: true }).notNull(),
    reason: varchar('reason', { length: 60 }).notNull(),
    details: text('details'),
    status: mysqlEnum('status', ['open', 'reviewed', 'actioned', 'dismissed'])
      .notNull()
      .default('open'),
    handledBy: bigint('handled_by', { mode: 'number', unsigned: true }).references(
      () => users.id,
      { onDelete: 'set null' }
    ),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull()
  },
  (table) => [index('idx_reports_status').on(table.status)]
);

