import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
// eslint-disable-next-line import/no-extraneous-dependencies
import postgres from 'postgres';

export const DRIZZLE_DATABASE = 'DRIZZLE_DATABASE';
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

        // Parse connection string to handle URL-encoded credentials properly
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

        // Create announcement table if not exists
        queryClient`CREATE TABLE IF NOT EXISTS announcement (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          title varchar(255) NOT NULL,
          content text NOT NULL,
          publisher varchar(100),
          publish_date timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
          attachment_url varchar(500),
          attachment_name varchar(255),
          is_published boolean NOT NULL DEFAULT true,
          created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
          created_by varchar(64),
          updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_by varchar(64)
        )`.then(() => {
          console.log('Announcement table ready');
        }).catch((err: unknown) => {
          console.error('Migration failed: create announcement table', err);
        });

        // Reset admin password on startup (temporary fix)
        queryClient`UPDATE app_user SET password_hash = '$2b$12$rrGuBLgnQwjQ4MwuFE7Veu85cUcl4q78R8Ad.uXydj1LQ.c0bqYzW' WHERE username = 'admin'`.then(() => {
          console.log('Admin password reset to Admin@2026');
        }).catch((err: unknown) => {
          console.error('Failed to reset admin password', err);
        });

        return drizzle(queryClient);
      },
    },
  ],
  exports: [DRIZZLE_DATABASE],
})
export class DatabaseModule {}
