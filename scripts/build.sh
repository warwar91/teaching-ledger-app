#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(pwd)"
DIST_DIR="$ROOT_DIR/dist"

echo "🔨 开始构建..."

# 清理
rm -rf "$DIST_DIR"
mkdir -p "$DIST_DIR"

# 构建 server (输出到 dist/server/)
echo "📦 构建后端..."
NODE_ENV=production npx nest build

# 构建 client (输出到 dist/client/)
echo "📦 构建前端..."
NODE_ENV=production npx vite build --config vite.config.ts

# 服务器运行时 cwd=dist/，静态文件目录为 dist/dist/client/
# 将完整前端产物（含 assets）复制到该位置
mkdir -p "$DIST_DIR/dist/client"
if [ -d "$DIST_DIR/client" ]; then
  cp -R "$DIST_DIR/client/." "$DIST_DIR/dist/client/"
fi

# 复制 public 静态资源
if [ -d "$ROOT_DIR/client/public" ]; then
  cp -R "$ROOT_DIR/client/public/." "$DIST_DIR/dist/client/"
fi

# 复制启动脚本
cp "$ROOT_DIR/scripts/run.sh" "$DIST_DIR/"
chmod +x "$DIST_DIR/run.sh"

echo "✅ 构建完成"
ls -la "$DIST_DIR/"
