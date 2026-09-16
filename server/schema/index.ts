import { sql } from 'drizzle-orm';
import {
  boolean,
  date,
  foreignKey,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

export const appUser = pgTable('app_user', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: varchar('user_id', { length: 64 }).notNull().unique(),
  username: varchar('username', { length: 100 }).notNull(),
  role: varchar('role', { length: 20 }).notNull().default('user'),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true, precision: 3 })
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  createdBy: varchar('created_by', { length: 64 }),
  updatedAt: timestamp('updated_at', { withTimezone: true, precision: 3 })
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  updatedBy: varchar('updated_by', { length: 64 }),
}, (table) => [
  uniqueIndex('app_user_user_id_key').on(table.userId),
]);

export const appSession = pgTable('app_session', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: varchar('user_id', { length: 64 }).notNull(),
  sessionToken: varchar('session_token', { length: 255 }).notNull().unique(),
  loginAt: timestamp('login_at', { withTimezone: true, precision: 3 })
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  lastActiveAt: timestamp('last_active_at', { withTimezone: true, precision: 3 })
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  status: varchar('status', { length: 20 }).notNull().default('active'),
  createdAt: timestamp('created_at', { withTimezone: true, precision: 3 })
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  uniqueIndex('app_session_session_token_key').on(table.sessionToken),
]);

export const loginAttempt = pgTable('login_attempt', {
  id: uuid('id').primaryKey().defaultRandom(),
  username: varchar('username', { length: 100 }).notNull().unique(),
  attemptCount: integer('attempt_count').notNull().default(0),
  lockedUntil: timestamp('locked_until', { withTimezone: true, precision: 6 }),
  lastAttemptAt: timestamp('last_attempt_at', { withTimezone: true, precision: 6 })
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  createdAt: timestamp('created_at', { withTimezone: true, precision: 3 })
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp('updated_at', { withTimezone: true, precision: 3 })
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  uniqueIndex('idx_login_attempt_username').on(table.username),
]);

export const ledger = pgTable('ledger', {
  id: uuid('id').primaryKey().defaultRandom(),
  ownerUserId: varchar('owner_user_id', { length: 64 }).notNull(),
  ledgerType: varchar('ledger_type', { length: 20 }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  semester: varchar('semester', { length: 20 }).notNull().default('2026-2027-1'),
  isDeleted: boolean('is_deleted').notNull().default(false),
  deletedAt: timestamp('deleted_at', { withTimezone: true, precision: 3 }),
  createdAt: timestamp('created_at', { withTimezone: true, precision: 3 })
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  createdBy: varchar('created_by', { length: 64 }),
  updatedAt: timestamp('updated_at', { withTimezone: true, precision: 3 })
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  updatedBy: varchar('updated_by', { length: 64 }),
}, (table) => [
  index('idx_ledger_owner_type').on(table.ownerUserId, table.ledgerType),
  index('idx_ledger_deleted').on(table.deletedAt),
]);

export const ledgerRecord = pgTable('ledger_record', {
  id: uuid('id').primaryKey().defaultRandom(),
  ledgerId: uuid('ledger_id').notNull(),
  seqNo: integer('seq_no').notNull(),
  content: text('content').notNull(),
  remark: text('remark'),
  imageUrls: text('image_urls').array().notNull().default([]),
  expectedDate: date('expected_date'),
  mainExecutor: varchar('main_executor', { length: 255 }),
  progressStatus: varchar('progress_status', { length: 20 }).notNull().default('pending'),
  skipReminder: boolean('skip_reminder').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true, precision: 3 })
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  createdBy: varchar('created_by', { length: 64 }),
  updatedAt: timestamp('updated_at', { withTimezone: true, precision: 3 })
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  updatedBy: varchar('updated_by', { length: 64 }),
}, (table) => [
  index('idx_record_ledger').on(table.ledgerId, table.seqNo),
  index('idx_record_expected').on(table.expectedDate),
  foreignKey({
    columns: [table.ledgerId],
    foreignColumns: [ledger.id],
    name: 'ledger_record_ledger_id_fkey',
  }).onDelete('cascade'),
]);

export const announcement = pgTable('announcement', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: varchar('title', { length: 255 }).notNull(),
  content: text('content').notNull().default(''),
  publisher: varchar('publisher', { length: 100 }),
  publishDate: timestamp('publish_date', { withTimezone: true, precision: 3 })
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  attachmentUrl: varchar('attachment_url', { length: 500 }),
  attachmentName: varchar('attachment_name', { length: 255 }),
  isPublished: boolean('is_published').notNull().default(true),
  announcementType: varchar('announcement_type', { length: 20 }).notNull().default('regular'),
  createdAt: timestamp('created_at', { withTimezone: true, precision: 3 })
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  createdBy: varchar('created_by', { length: 64 }),
  updatedAt: timestamp('updated_at', { withTimezone: true, precision: 3 })
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  updatedBy: varchar('updated_by', { length: 64 }),
}, (table) => [
  index('idx_announcement_publish_date').on(table.publishDate),
]);

export const announcementItem = pgTable('announcement_item', {
  id: uuid('id').primaryKey().defaultRandom(),
  announcementId: uuid('announcement_id').notNull(),
  content: text('content').notNull(),
  deadline: date('deadline'),
  sortOrder: integer('sort_order').notNull().default(0),
});

export const appUserTable = appUser;
export const appSessionTable = appSession;
export const ledgerTable = ledger;
export const ledgerRecordTable = ledgerRecord;
export const loginAttemptTable = loginAttempt;
