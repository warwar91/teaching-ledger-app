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
