import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { join } from 'path';
import { NestExpressApplication } from '@nestjs/platform-express';
import { Request, Response, NextFunction } from 'express';
import fs from 'fs';

import { AppModule } from './app.module';
import { DRIZZLE_DATABASE } from './database/database.module';
import { runMigrations } from './database/migrate';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const logger = new Logger('Bootstrap');
  const port = Number(process.env.PORT || 3000);

  app.enableCors({
    origin: true,
    credentials: true,
  });

  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    transform: true,
    forbidUnknownValues: false,
  }));

  const uploadDir = process.env.UPLOAD_DIR || join(process.cwd(), 'uploads');
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
  app.useStaticAssets(uploadDir, { prefix: '/uploads/' });

  const clientDist = join(process.cwd(), 'dist/client');
  app.useStaticAssets(clientDist, { prefix: '/' });

  app.use((req: Request, res: Response, next: NextFunction) => {
    if (
      !req.path.startsWith('/api/') &&
      !req.path.startsWith('/uploads/') &&
      !req.path.includes('.')
    ) {
      res.sendFile(join(clientDist, 'index.html'));
      return;
    }
    next();
  });

  const db = app.get(DRIZZLE_DATABASE);
  await runMigrations(db);
  logger.log('Database migrations completed');

  await app.listen(port, '0.0.0.0');
  logger.log(`Server running on port ${port}`);
}

bootstrap();
