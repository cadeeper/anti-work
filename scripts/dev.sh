#!/bin/bash

# =============================================================================
# Anti-Work 开发环境启动脚本
# 同时启动 Server + Web 开发服务器
# =============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_ROOT"

echo ""
echo "🔥 Anti-Work Development Server"
echo "================================"
echo ""

# 检查 .env 文件
if [ ! -f ".env" ]; then
  if [ -f ".env.example" ]; then
    echo "📋 未找到 .env 文件，正在从 .env.example 复制..."
    cp .env.example .env
    echo "✓ 已创建 .env 文件，请根据需要修改配置"
    echo ""
  fi
fi

# 检查依赖
if [ ! -d "node_modules" ]; then
  echo "📦 安装依赖..."
  pnpm install
  echo ""
fi

# 生成 Prisma Client
echo "🔧 生成 Prisma Client..."
pnpm db:generate
echo ""

# 初始化数据库
echo "🗄️  初始化数据库..."
pnpm db:push
echo ""

# 启动开发服务器
echo "🚀 启动开发服务器..."
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📌 开发时请访问: http://localhost:5173"
echo ""
echo "   5173 - 前端 (Vite 热更新，自动代理 API)"
echo "   3000 - 后端 API (仅供内部调用)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "按 Ctrl+C 停止所有服务"
echo ""

# 使用 turbo 同时启动 server 和 web
pnpm turbo run dev --filter=@anti-work/server --filter=@anti-work/web --parallel
