import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
// eslint-disable-next-line import/no-extraneous-dependencies
import postgres from 'postgres';

export const DRIZZLE_DATABASE = 'DRIZZLE_DATABASE';
export const PG_CLIENT = 'PG_CLIENT';
export type DbType = PostgresJsDatabase;

@Global()
@Module({
  imports: [],
  providers: [
    {
      provide: DRIZZLE_DATABASE,
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const databaseUrl =
          configService.get<string>('DATABASE_URL') ||
          configService.get<string>('SUDA_DATABASE_URL');
        if (!databaseUrl) {
          throw new Error('DATABASE_URL environment variable is required');
        }

        const url = new URL(databaseUrl);
        const queryClient = postgres({
          host: url.hostname,
          port: parseInt(url.port, 10) || 5432,
          database: url.pathname.slice(1),
          username: decodeURIComponent(url.username),
          password: decodeURIComponent(url.password),
          ssl: { rejectUnauthorized: false },
          max: 10,
        });

        // Run lightweight migrations on startup (idempotent)
        queryClient`ALTER TABLE ledger_record ADD COLUMN IF NOT EXISTS remark text`.catch((err: unknown) => {
          console.error('Migration failed: add remark column', err);
        });

        queryClient`CREATE EXTENSION IF NOT EXISTS pgcrypto`.then(() => {
          return queryClient`CREATE TABLE IF NOT EXISTS announcement (
            id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            title varchar(255) NOT NULL,
            content text NOT NULL DEFAULT '',
            publisher varchar(100),
            publish_date timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
            attachment_url varchar(500),
            attachment_name varchar(255),
            is_published boolean NOT NULL DEFAULT true,
            announcement_type varchar(20) NOT NULL DEFAULT 'regular',
            created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
            created_by varchar(64),
            updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_by varchar(64)
          )`;
        }).then(() => {
          return queryClient`ALTER TABLE announcement ADD COLUMN IF NOT EXISTS announcement_type varchar(20) NOT NULL DEFAULT 'regular'`;
        }).then(() => {
          return queryClient`CREATE TABLE IF NOT EXISTS announcement_item (
            id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            announcement_id uuid NOT NULL REFERENCES announcement(id) ON DELETE CASCADE,
            content text NOT NULL,
            deadline date,
            sort_order integer NOT NULL DEFAULT 0
          )`;
        }).then(() => {
          console.log('Announcement tables ready');
        }).catch((err: unknown) => {
          console.error('Migration failed: announcement tables', err);
        });

        queryClient`CREATE TABLE IF NOT EXISTS year_summary (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          owner_user_id varchar(64) NOT NULL,
          academic_year varchar(20) NOT NULL,
          title varchar(255) NOT NULL,
          file_url varchar(500) NOT NULL,
          file_name varchar(255) NOT NULL,
          file_size integer,
          created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
        )`.then(() => {
          return queryClient`CREATE INDEX IF NOT EXISTS idx_year_summary_owner_year ON year_summary (owner_user_id, academic_year)`;
        }).then(() => {
          console.log('Year summary table ready');
        }).catch((err: unknown) => {
          console.error('Migration failed: year_summary table', err);
        });

        queryClient`UPDATE app_user SET password_hash = '$2b$12$rrGuBLgnQwjQ4MwuFE7Veu85cUcl4q78R8Ad.uXydj1LQ.c0bqYzW' WHERE username = 'admin'`.then(() => {
          console.log('Admin password reset to Admin@2026');
        }).catch((err: unknown) => {
          console.error('Failed to reset admin password', err);
        });

        return drizzle(queryClient);
      },
    },
    {
      provide: PG_CLIENT,
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const databaseUrl =
          configService.get<string>('DATABASE_URL') ||
          configService.get<string>('SUDA_DATABASE_URL');
        if (!databaseUrl) {
          throw new Error('DATABASE_URL environment variable is required');
        }
        const url = new URL(databaseUrl);
        return postgres({
          host: url.hostname,
          port: parseInt(url.port, 10) || 5432,
          database: url.pathname.slice(1),
          username: decodeURIComponent(url.username),
          password: decodeURIComponent(url.password),
          ssl: { rejectUnauthorized: false },
          max: 5,
        });
      },
    },
  ],
  exports: [DRIZZLE_DATABASE, PG_CLIENT],
})
export class DatabaseModule {}
