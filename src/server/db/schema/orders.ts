import {
  bigint,
  index,
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar
} from 'drizzle-orm/mysql-core';
import { users } from './users';
import { products } from './posts';
import { jobRequests } from './requests';

export const orders = mysqlTable(
  'orders',
  {
    id: bigint('id', { mode: 'number', unsigned: true }).autoincrement().primaryKey(),
    orderCode: varchar('order_code', { length: 32 }).notNull().unique(),
    source: mysqlEnum('source', ['product', 'job_request']).notNull().default('product'),
    productId: bigint('product_id', { mode: 'number', unsigned: true }).references(
      () => products.id,
      { onDelete: 'set null' }
    ),
    jobRequestId: bigint('job_request_id', { mode: 'number', unsigned: true }).references(
      () => jobRequests.id,
      { onDelete: 'set null' }
    ),
    sellerId: bigint('seller_id', { mode: 'number', unsigned: true })
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    buyerId: bigint('buyer_id', { mode: 'number', unsigned: true }).references(() => users.id, {
      onDelete: 'set null'
    }),
    buyerName: varchar('buyer_name', { length: 120 }).notNull(),
    buyerPhone: varchar('buyer_phone', { length: 30 }).notNull(),
    buyerAddress: varchar('buyer_address', { length: 255 }),
    buyerNotes: text('buyer_notes'),
    quantity: int('quantity', { unsigned: true }).notNull().default(1),
    agreedPrice: bigint('agreed_price', { mode: 'number', unsigned: true }).notNull().default(0),
    unitCostSnapshot: bigint('unit_cost_snapshot', { mode: 'number', unsigned: true })
      .notNull()
      .default(0),
    status: mysqlEnum('status', ['requested', 'accepted', 'in_progress', 'completed', 'cancelled'])
      .notNull()
      .default('requested'),
    progressNote: text('progress_note'),
    proofImage: varchar('proof_image', { length: 255 }),
    reviewToken: varchar('review_token', { length: 64 }).notNull().unique(),
    acceptedAt: timestamp('accepted_at'),
    completedAt: timestamp('completed_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull()
  },
  (table) => [
    index('idx_orders_seller_status').on(table.sellerId, table.status),
    index('idx_orders_buyer').on(table.buyerId),
    index('idx_orders_product').on(table.productId),
    index('idx_orders_job_request').on(table.jobRequestId)
  ]
);

export const reviews = mysqlTable(
  'reviews',
  {
    id: bigint('id', { mode: 'number', unsigned: true }).autoincrement().primaryKey(),
    orderId: bigint('order_id', { mode: 'number', unsigned: true })
      .notNull()
      .unique()
      .references(() => orders.id, { onDelete: 'cascade' }),
    productId: bigint('product_id', { mode: 'number', unsigned: true }).references(
      () => products.id,
      { onDelete: 'set null' }
    ),
    sellerId: bigint('seller_id', { mode: 'number', unsigned: true })
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    reviewerName: varchar('reviewer_name', { length: 120 }).notNull(),
    rating: int('rating', { unsigned: true }).notNull(),
    comment: text('comment').notNull(),
    endorsementTags: varchar('endorsement_tags', { length: 255 }),
    createdAt: timestamp('created_at').defaultNow().notNull()
  },
  (table) => [
    index('idx_reviews_seller').on(table.sellerId),
    index('idx_reviews_product').on(table.productId)
  ]
);
