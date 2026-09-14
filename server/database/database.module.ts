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
        const queryClient = postgres(databaseUrl);
        return drizzle(queryClient);
      },
    },
  ],
  exports: [DRIZZLE_DATABASE],
})
export class DatabaseModule {}
