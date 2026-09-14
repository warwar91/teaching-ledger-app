import { sql } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

export async function runMigrations(db: PostgresJsDatabase): Promise<void> {
  // app_user
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS app_user (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id varchar(64) NOT NULL UNIQUE,
      username varchar(100) NOT NULL,
      role varchar(20) NOT NULL DEFAULT 'user',
      password_hash varchar(255) NOT NULL,
      created_at timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      created_by varchar(64),
      updated_at timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_by varchar(64)
    );
  `);
  await db.execute(sql`
    CREATE UNIQUE INDEX IF NOT EXISTS app_user_user_id_key
    ON app_user (user_id);
  `);

  // app_session
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS app_session (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id varchar(64) NOT NULL,
      session_token varchar(255) NOT NULL UNIQUE,
      login_at timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      last_active_at timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      status varchar(20) NOT NULL DEFAULT 'active',
      created_at timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);
  await db.execute(sql`
    CREATE UNIQUE INDEX IF NOT EXISTS app_session_session_token_key
    ON app_session (session_token);
  `);

  // login_attempt
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS login_attempt (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      username varchar(100) NOT NULL UNIQUE,
      attempt_count integer NOT NULL DEFAULT 0,
      locked_until timestamptz(6),
      last_attempt_at timestamptz(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      created_at timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);
  await db.execute(sql`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_login_attempt_username
    ON login_attempt (username);
  `);

  // ledger
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS ledger (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      owner_user_id varchar(64) NOT NULL,
      ledger_type varchar(20) NOT NULL,
      name varchar(255) NOT NULL,
      is_deleted boolean NOT NULL DEFAULT false,
      deleted_at timestamptz(3),
      created_at timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      created_by varchar(64),
      updated_at timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_by varchar(64)
    );
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS idx_ledger_owner_type
    ON ledger (owner_user_id, ledger_type);
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS idx_ledger_deleted
    ON ledger (deleted_at);
  `);

  // ledger_record
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS ledger_record (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      ledger_id uuid NOT NULL,
      seq_no integer NOT NULL,
      content text NOT NULL,
      image_urls text[] NOT NULL DEFAULT '{}',
      expected_date date,
      main_executor varchar(255),
      progress_status varchar(20) NOT NULL DEFAULT 'pending',
      skip_reminder boolean NOT NULL DEFAULT false,
      created_at timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      created_by varchar(64),
      updated_at timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_by varchar(64)
    );
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS idx_record_ledger
    ON ledger_record (ledger_id, seq_no);
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS idx_record_expected
    ON ledger_record (expected_date);
  `);
  await db.execute(sql`
    ALTER TABLE ledger_record
    DROP CONSTRAINT IF EXISTS ledger_record_ledger_id_fkey,
    ADD CONSTRAINT ledger_record_ledger_id_fkey
    FOREIGN KEY (ledger_id) REFERENCES ledger(id) ON DELETE CASCADE;
  `);
}
