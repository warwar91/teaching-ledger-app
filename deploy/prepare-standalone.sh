#!/bin/bash
# 独立部署准备脚本
# 将平台相关代码替换为独立版本，用于 Docker 构建或本地独立部署
# 执行方式：bash deploy/prepare-standalone.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "=== 准备独立部署文件 ==="

# ===== 后端 =====

# 1. 写入独立 server/main.ts（含 migration、静态托管、SPA fallback）
cat > "$PROJECT_ROOT/server/main.ts" << 'MAINEOF'
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
MAINEOF
echo "[OK] 独立后端入口已写入"

# 2. 写入独立 app.module.ts（DatabaseModule + ConfigModule，无 PlatformModule）
cat > "$PROJECT_ROOT/server/app.module.ts" << 'APPMODEOF'
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './modules/auth/auth.module';
import { LedgerModule } from './modules/ledger/ledger.module';
import { AdminModule } from './modules/admin/admin.module';
import { UploadModule } from './modules/upload/upload.module';
import { ViewModule } from './modules/view/view.module';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{
      ttl: 60000,
      limit: 300,
    }]),
    DatabaseModule,
    AuthModule,
    LedgerModule,
    AdminModule,
    UploadModule,
    ViewModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
APPMODEOF
echo "[OK] 独立 AppModule 已写入"

# 3. 替换后端各模块的平台导入为独立导入
for f in \
  "$PROJECT_ROOT/server/modules/admin/admin.service.ts" \
  "$PROJECT_ROOT/server/modules/admin/admin.guard.ts" \
  "$PROJECT_ROOT/server/modules/ledger/ledger.service.ts" \
  "$PROJECT_ROOT/server/modules/auth/jwt-auth.guard.ts" \
  "$PROJECT_ROOT/server/modules/auth/auth.service.ts"; do
  if [ -f "$f" ]; then
    sed -i "s|from '@lark-apaas/nestjs-datapaas'|from '@server/database/database.module'|" "$f"
    sed -i "s|from '@server/database/schema'|from '@server/schema'|" "$f"
  fi
done
echo "[OK] 后端导入路径已替换为独立版本"

# 4. 替换安全头中间件（移除平台依赖）
if [ -f "$PROJECT_ROOT/server/common/middleware/security-headers.middleware.ts" ]; then
  sed -i "s|import {.*} from '@lark-apaas/fullstack-nestjs-core';|// 独立部署：无平台依赖|" \
    "$PROJECT_ROOT/server/common/middleware/security-headers.middleware.ts" 2>/dev/null || true
fi

# ===== 前端 =====

# 5. 写入独立入口 index.tsx
cat > "$PROJECT_ROOT/client/src/index.tsx" << 'INDEXEOF'
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './app';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
INDEXEOF
echo "[OK] 独立前端入口已写入"

# 6. 写入独立 index.html（含 LOGO favicon）
cat > "$PROJECT_ROOT/client/index.html" << 'HTMLEOF'
<!DOCTYPE html>
<html lang="zh">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="icon" type="image/png" href="/logo.png">
  <title>教学工作台账管理系统 - 河南开封科技传媒学院 经济学院</title>
</head>
<body>
  <div id="root"></div>
  <script type="module" src="/src/index.tsx"></script>
</body>
</html>
HTMLEOF
echo "[OK] client/index.html 已生成"

# 7. 写入独立 logger.ts（纯 console）
cat > "$PROJECT_ROOT/client/src/utils/logger.ts" << 'LOGGEREOF'
export const logger = {
  info: (message: string, ...args: unknown[]) => {
    console.log(`[INFO] ${message}`, ...args);
  },
  error: (message: string, ...args: unknown[]) => {
    console.error(`[ERROR] ${message}`, ...args);
  },
  warn: (message: string, ...args: unknown[]) => {
    console.warn(`[WARN] ${message}`, ...args);
  },
  debug: (message: string, ...args: unknown[]) => {
    console.debug(`[DEBUG] ${message}`, ...args);
  },
  child: () => logger,
  infoWithValues: (..._args: unknown[]) => {},
  debugWithValues: (..._args: unknown[]) => {},
  warnWithValues: (..._args: unknown[]) => {},
  errorWithValues: (..._args: unknown[]) => {},
};
LOGGEREOF
echo "[OK] logger 已替换为独立版本"

# 8. 写入独立 show-confirm.ts（纯 window.confirm）
cat > "$PROJECT_ROOT/client/src/utils/show-confirm.ts" << 'CONFIRMEOF'
export async function showConfirm(message: string): Promise<boolean> {
  return window.confirm(message);
}
CONFIRMEOF
echo "[OK] show-confirm 已替换为独立版本"

# 9. 替换 LedgerDetailPage 中的 UniversalLink 为 <a>
if [ -f "$PROJECT_ROOT/client/src/pages/LedgerDetail/LedgerDetailPage.tsx" ]; then
  sed -i "s|import { UniversalLink } from '@lark-apaas/client-toolkit/components/UniversalLink';||" \
    "$PROJECT_ROOT/client/src/pages/LedgerDetail/LedgerDetailPage.tsx"
  sed -i 's|<UniversalLink|<a|g' "$PROJECT_ROOT/client/src/pages/LedgerDetail/LedgerDetailPage.tsx"
  sed -i 's|</UniversalLink>|</a>|g' "$PROJECT_ROOT/client/src/pages/LedgerDetail/LedgerDetailPage.tsx"
  sed -i 's| to=| href=|g' "$PROJECT_ROOT/client/src/pages/LedgerDetail/LedgerDetailPage.tsx"
  echo "[OK] LedgerDetailPage UniversalLink → <a>"
fi

# 10. 替换前端 axios 实例（axiosForBackend → axios.create）
if [ -f "$PROJECT_ROOT/client/src/api/instance.ts" ]; then
  cat > "$PROJECT_ROOT/client/src/api/instance.ts" << 'INSTEOF'
import axios from 'axios';
import { clearAuth, getToken } from '@client/src/utils/auth';
import { logger } from '@client/src/utils/logger';

function redirectToLogin(): void {
  if (typeof window === 'undefined') return;
  if (window.location.pathname.includes('/login')) return;
  window.location.replace('/login');
}

const http = axios.create({
  baseURL: '/api',
  timeout: 30000,
});

http.interceptors.request.use(
  (config) => {
    const token = getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error: unknown) => {
    logger.error('Request error:', error);
    return Promise.reject(error);
  },
);

http.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      clearAuth();
      redirectToLogin();
    }
    return Promise.reject(error);
  },
);

export { http };
export default http;
INSTEOF
  echo "[OK] axios 实例已替换为独立版本"
fi

# ===== 构建配置 =====

# 11. 复制 vite.config.ts
cp "$SCRIPT_DIR/vite.config.template.ts" "$PROJECT_ROOT/vite.config.ts"
echo "[OK] vite.config.ts 已替换"

# 12. 复制 Dockerfile
cp "$SCRIPT_DIR/Dockerfile.template" "$PROJECT_ROOT/Dockerfile"
echo "[OK] Dockerfile 已复制"

# 13. 复制 docker-compose.yml
cp "$SCRIPT_DIR/docker-compose.template.yml" "$PROJECT_ROOT/docker-compose.yml"
echo "[OK] docker-compose.yml 已复制"

# 14. 复制 .env.example
cp "$SCRIPT_DIR/.env.example" "$PROJECT_ROOT/.env.example" 2>/dev/null || true
if [ ! -f "$PROJECT_ROOT/.env.example" ]; then
  cat > "$PROJECT_ROOT/.env.example" << 'ENVEOF'
DATABASE_URL=postgresql://ledger:ledger_password@localhost:5432/ledger
SESSION_SECRET=change_this_to_a_random_secret_string
PORT=3000
UPLOAD_DIR=./uploads
ENVEOF
fi
echo "[OK] .env.example 已就绪"

# 15. 复制 README
cp "$SCRIPT_DIR/README.md" "$PROJECT_ROOT/README.md"
echo "[OK] README.md 已复制"

echo ""
echo "=== 独立部署文件准备完成 ==="
echo ""
echo "部署方式："
echo "  Docker Compose（推荐）："
echo "    docker compose up -d --build"
echo ""
echo "  本地开发："
echo "    npm install"
echo "    npm run dev:server   # 后端端口3000"
echo "    npm run dev:client   # 前端端口5173"
echo ""
echo "管理员账号：注册时用户名为 admin 自动获得管理员权限"
