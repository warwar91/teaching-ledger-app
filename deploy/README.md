# 教学工作台账管理系统

河南开封科技传媒学院经济学院教学工作台账管理系统。基于 NestJS + React + PostgreSQL 构建的全栈应用，零平台依赖，可独立部署。

## 技术栈

- **后端**：NestJS 10 + TypeScript + Drizzle ORM + PostgreSQL
- **前端**：React 19 + TypeScript + React Router + Tailwind CSS + shadcn/ui
- **认证**：Session Token + bcrypt 密码加密 + 防爆破机制 + 单点登录
- **文件上传**：本地存储（multer）+ JPG/PNG 格式校验
- **部署**：Docker Compose 一键部署

## 功能特性

- 用户注册 / 登录 / 单点登录（同一账号仅一处登录）
- 周台账、学期台账独立管理
- 台账记录增删改查（默认5条、可增减）
- 图片上传与展示
- 进度状态管理（待处理 / 进行中 / 已完成）
- 智能提醒（待处理事项 + 临期2天提醒 + 不再提示选项）
- Excel 导出
- 回收站（14天自动清理、手动永久删除）
- 管理员后台（查看所有用户数据、重置密码、删除用户）
- 安全响应头 + 速率限制 + 输入校验
- 数据完全隔离（用户间互不干扰）

## 快速开始（Docker Compose 推荐）

### 一键启动

```bash
docker compose up -d --build
```

首次启动会自动：
- 创建 PostgreSQL 数据库（16-alpine）
- 自动执行数据库迁移（建表）
- 构建并启动应用（端口 3000）

### 访问

打开浏览器访问：`http://localhost:3000`

### 初始化管理员账号

注册时用户名填 **admin**，该账号自动获得管理员权限。

### 停止服务

```bash
docker compose down
# 保留数据库数据
docker compose down -v
# 同时删除数据库数据（谨慎）
```

## 本地开发运行

### 前置要求

- Node.js >= 20
- PostgreSQL >= 14

### 步骤

1. **准备独立部署代码**
```bash
bash deploy/prepare-standalone.sh
```

2. **安装依赖**
```bash
npm install
```

3. **配置环境变量**
```bash
cp .env.example .env
# 编辑 .env，修改 DATABASE_URL 指向你的 PostgreSQL
```

4. **启动后端（开发模式）**
```bash
npm run dev:server
```

5. **启动前端（开发模式）**
```bash
npm run dev:client
```

前端运行在 http://localhost:5173，API 请求代理到后端 3000 端口。

## 环境变量配置

| 变量名 | 必需 | 默认值 | 说明 |
|--------|------|--------|------|
| `DATABASE_URL` | 是 | - | PostgreSQL 连接字符串，如 `postgresql://user:pass@localhost:5432/db` |
| `SESSION_SECRET` | 是 | - | Session 签名密钥（生产环境请设置复杂随机字符串） |
| `PORT` | 否 | `3000` | 服务监听端口 |
| `NODE_ENV` | 否 | `development` | 运行环境：development / production |
| `UPLOAD_DIR` | 否 | `./uploads` | 上传文件存储目录 |

## 管理员功能

- 用户列表查看（按用户分组展示）
- 查看任意用户的台账详情与记录
- 重置用户密码
- 删除用户及其所有数据
- 导出任意台账为 Excel

## 数据备份

### 数据库备份
```bash
docker exec ledger-postgres pg_dump -U ledger ledger > backup_$(date +%Y%m%d).sql
```

### 数据库恢复
```bash
docker exec -i ledger-postgres psql -U ledger ledger < backup_20240101.sql
```

### 上传文件备份
上传文件存储在 Docker volume `ledger_uploads` 中：
```bash
docker run --rm -v ledger_uploads:/data -v $(pwd):/backup alpine \
  tar czf /backup/uploads_$(date +%Y%m%d).tar.gz -C /data .
```

## 常见问题

### Q: 忘记管理员密码怎么办？
A: 可以通过数据库直接重置密码，或注册新的 admin 用户名账号（admin 用户名唯一，需先删除旧的）。

### Q: 上传图片不显示？
A: 检查 `UPLOAD_DIR` 目录权限，确保应用对该目录有读写权限。Docker 部署时使用 volume 无需手动处理。

### Q: 登录提示"账号已被临时锁定"？
A: 连续输错 5 次密码会被锁定 15 分钟，等待解锁后重试即可。

### Q: 如何修改端口？
A: 修改 `docker-compose.yml` 中 ports 映射（如 `"8080:3000"`），或修改环境变量 `PORT`。

### Q: 回收站多久自动清理？
A: 默认 14 天。删除后进入回收站，超过 14 天的记录会在系统访问时自动清理。

### Q: 同一账号能同时登录吗？
A: 不能。单点登录机制保证同一账号同一时刻只能在一处登录，新登录会使旧会话失效。

## 目录结构

```
├── client/                 # React 前端
│   ├── src/
│   │   ├── pages/          # 页面组件
│   │   ├── components/     # 通用组件
│   │   ├── api/            # API 调用
│   │   └── utils/          # 工具函数
│   └── public/             # 静态资源（含 logo.png）
├── server/                 # NestJS 后端
│   ├── schema/             # 数据库 Schema 定义（独立版本）
│   ├── database/           # 数据库模块 + 迁移脚本
│   ├── common/             # 共享中间件、过滤器
│   └── modules/            # 业务模块
│       ├── auth/           # 认证模块（注册/登录/单点）
│       ├── ledger/         # 台账模块（周/学期/记录/导出）
│       ├── admin/          # 管理员模块
│       ├── upload/         # 文件上传模块
│       └── view/           # 前端视图托管
├── uploads/                # 上传文件目录（运行时创建）
├── deploy/                 # 部署相关文件
│   ├── prepare-standalone.sh    # 独立部署准备脚本
│   ├── Dockerfile.template
│   ├── docker-compose.template.yml
│   ├── vite.config.template.ts
│   ├── .env.example
│   └── README.md
├── shared/                 # 前后端共享类型
├── docker-compose.yml      # （执行准备脚本后生成）
├── Dockerfile              # （执行准备脚本后生成）
└── README.md
```

## 从妙搭平台迁移说明

本项目原始版本基于妙搭全栈模板开发，已完成独立化改造：

- 移除 `@lark-apaas/*` 平台 SDK 依赖
- 数据库改用标准 Drizzle ORM + `DATABASE_URL` 连接
- 文件上传改用本地 multer + 静态目录托管
- 前端使用标准 axios + React Router
- 登录认证使用独立 JWT/Session 方案
- 移除 dataloom、business-ui 等平台组件
- 提供 Docker Compose 一键部署方案

部署执行脚本：`bash deploy/prepare-standalone.sh`

## License

MIT
