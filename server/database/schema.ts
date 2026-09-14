/* eslint-disable */
/** auto generated, do not edit */
import { sql } from 'drizzle-orm';
import { boolean, date, foreignKey, index, integer, pgTable, text, uniqueIndex, uuid, varchar, customType } from "drizzle-orm/pg-core"

export const customTimestamptz = customType<{
  data: Date;
  driverData: string;
  config: { precision?: number };
}>({
  dataType(config) {
    const precision = typeof config?.precision !== 'undefined'
      ? ` (${config.precision})`
      : '';
    return `timestamptz${precision}`;
  },
  toDriver(value: Date | string | number) {
    if (value == null) return value as any;
    if (typeof value === 'number') return new Date(value).toISOString();
    if (typeof value === 'string') return value;
    if (value instanceof Date) return value.toISOString();
    throw new Error('Invalid timestamp value');
  },
  fromDriver(value: string | Date): Date {
    if (value instanceof Date) return value;
    return new Date(value);
  },
});

export const userProfile = customType<{
  data: string;
  driverData: string;
}>({
  dataType() {
    return 'user_profile';
  },
  toDriver(value: string) {
    return sql`ROW(${value})::user_profile`;
  },
  fromDriver(value: string) {
    const [userId] = value.slice(1, -1).split(',');
    return userId.trim();
  },
});

export type FileAttachment = {
  bucket_id: string;
  file_path: string;
};

export const fileAttachment = customType<{
  data: FileAttachment;
  driverData: string;
}>({
  dataType() {
    return 'file_attachment';
  },
  toDriver(value: FileAttachment) {
    return sql`ROW(${value.bucket_id},${value.file_path})::file_attachment`;
  },
  fromDriver(value: string): FileAttachment {
    const [bucketId, filePath] = value.slice(1, -1).split(',');
    return { bucket_id: bucketId.trim(), file_path: filePath.trim() };
  },
});

export function escapeLiteral(str: string): string {
  return "'" + str.replace(/'/g, "''") + "'";
}

export const userProfileArray = customType<{
  data: string[];
  driverData: string;
}>({
  dataType() {
    return 'user_profile[]';
  },
  toDriver(value: string[]) {
    if (!value || value.length === 0) {
      return sql`'{}'::user_profile[]`;
    }
    const elements = value.map(id => `ROW(${escapeLiteral(id)})::user_profile`).join(',');
    return sql.raw(`ARRAY[${elements}]::user_profile[]`);
  },
  fromDriver(value: string): string[] {
    if (!value || value === '{}') return [];
    const inner = value.slice(1, -1);
    const matches = inner.match(/\([^)]*\)/g) || [];
    return matches.map(m => m.slice(1, -1).split(',')[0].trim());
  },
});

export const fileAttachmentArray = customType<{
  data: FileAttachment[];
  driverData: string;
}>({
  dataType() {
    return 'file_attachment[]';
  },
  toDriver(value: FileAttachment[]) {
    if (!value || value.length === 0) {
      return sql`'{}'::file_attachment[]`;
    }
    const elements = value.map(f =>
      `ROW(${escapeLiteral(f.bucket_id)},${escapeLiteral(f.file_path)})::file_attachment`
    ).join(',');
    return sql.raw(`ARRAY[${elements}]::file_attachment[]`);
  },
  fromDriver(value: string): FileAttachment[] {
    if (!value || value === '{}') return [];
    const inner = value.slice(1, -1);
    const matches = inner.match(/\([^)]*\)/g) || [];
    return matches.map(m => {
      const [bucketId, filePath] = m.slice(1, -1).split(',');
      return { bucket_id: bucketId.trim(), file_path: filePath.trim() };
    });
  },
});

export const loginAttempt = pgTable("login_attempt", {
  id: uuid("id").primaryKey().defaultRandom(),
  username: varchar("username", { length: 100 }).notNull().unique(),
  attemptCount: integer("attempt_count").notNull().default(0),
  lockedUntil: customTimestamptz("locked_until", { precision: 6 }),
  lastAttemptAt: customTimestamptz("last_attempt_at", { precision: 6 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz("_updated_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  uniqueIndex("idx_login_attempt_username").on(table.username),
]);

export const ledgerRecord = pgTable("ledger_record", {
  id: uuid("id").primaryKey().defaultRandom(),
  ledgerId: uuid("ledger_id").notNull(),
  seqNo: integer("seq_no").notNull(),
  content: text("content").notNull(),
  imageUrls: text("image_urls").array().notNull().default([]),
  expectedDate: date("expected_date"),
  mainExecutor: varchar("main_executor", { length: 255 }),
  progressStatus: varchar("progress_status", { length: 20 }).notNull().default('pending'),
  skipReminder: boolean("skip_reminder").notNull().default(false),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Creator (auto-filled, do not modify)
  createdBy: userProfile("_created_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz("_updated_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Updater (auto-filled, do not modify)
  updatedBy: userProfile("_updated_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
}, (table) => [
  index("idx_record_ledger").on(table.ledgerId, table.seqNo),
  index("idx_record_expected").on(table.expectedDate),
  foreignKey({
    columns: [table.ledgerId],
    foreignColumns: [ledger.id],
    name: "ledger_record_ledger_id_fkey",
  }).onDelete("cascade"),
]);

export const ledger = pgTable("ledger", {
  id: uuid("id").primaryKey().defaultRandom(),
  ownerUserId: varchar("owner_user_id", { length: 64 }).notNull(),
  ledgerType: varchar("ledger_type", { length: 20 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  isDeleted: boolean("is_deleted").notNull().default(false),
  deletedAt: customTimestamptz("deleted_at", { precision: 3 }),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Creator (auto-filled, do not modify)
  createdBy: userProfile("_created_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz("_updated_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Updater (auto-filled, do not modify)
  updatedBy: userProfile("_updated_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
}, (table) => [
  index("idx_ledger_owner_type").on(table.ownerUserId, table.ledgerType),
  index("idx_ledger_deleted").on(table.deletedAt),
]);

export const appSession = pgTable("app_session", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: varchar("user_id", { length: 64 }).notNull(),
  sessionToken: varchar("session_token", { length: 255 }).notNull().unique(),
  loginAt: customTimestamptz("login_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  lastActiveAt: customTimestamptz("last_active_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  status: varchar("status", { length: 20 }).notNull().default('active'),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  uniqueIndex("app_session_session_token_key").on(table.sessionToken),
]);

export const appUser = pgTable("app_user", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: varchar("user_id", { length: 64 }).notNull().unique(),
  username: varchar("username", { length: 100 }).notNull(),
  role: varchar("role", { length: 20 }).notNull().default('user'),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Creator (auto-filled, do not modify)
  createdBy: userProfile("_created_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz("_updated_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Updater (auto-filled, do not modify)
  updatedBy: userProfile("_updated_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
}, (table) => [
  uniqueIndex("app_user_user_id_key").on(table.userId),
]);

// table aliases
export const appSessionTable = appSession;
export const appUserTable = appUser;
export const ledgerTable = ledger;
export const ledgerRecordTable = ledgerRecord;
export const loginAttemptTable = loginAttempt;
