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

        return drizzle(queryClient);
      },
    },
  ],
  exports: [DRIZZLE_DATABASE],
})
export class DatabaseModule {}
