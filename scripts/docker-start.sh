#!/bin/bash

# =============================================================================
# Anti-Work Docker 一键部署脚本 (MySQL 版本)
# =============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
DOCKER_DIR="$PROJECT_ROOT/docker"

cd "$DOCKER_DIR"

echo ""
echo "🐳 Anti-Work Docker Deployment"
echo "==============================="
echo ""

# 检查 Docker
if ! command -v docker &> /dev/null; then
  echo "❌ 错误: 未找到 Docker，请先安装 Docker"
  echo "   https://docs.docker.com/get-docker/"
  exit 1
fi

# 检查 Docker Compose
if ! docker compose version &> /dev/null; then
  echo "❌ 错误: 未找到 Docker Compose，请先安装 Docker Compose"
  exit 1
fi

# 检查 .env 文件
if [ ! -f ".env" ]; then
  if [ -f ".env.example" ]; then
    echo "📋 未找到 .env 文件，正在从 .env.example 复制..."
    cp .env.example .env
    echo "✓ 已创建 .env 文件"
    echo ""
    echo "⚠️  请修改 docker/.env 中的敏感配置（如 JWT_SECRET、MYSQL_PASSWORD）"
    echo ""
  else
    echo "❌ 错误: 未找到 .env.example 文件"
    exit 1
  fi
fi

# 加载环境变量
source .env

# 显示配置
echo "📋 当前配置："
echo "   服务端口: ${SERVER_PORT:-3000}"
echo "   数据库名: ${MYSQL_DATABASE:-antiwork}"
echo "   数据库用户: ${MYSQL_USER:-antiwork}"
echo ""

# 构建并启动
echo "🔧 构建 Docker 镜像..."
docker compose build

echo ""
echo "🚀 启动服务..."
docker compose up -d

echo ""
echo "✅ 部署完成！"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📌 访问地址"
echo ""
echo "   Dashboard: http://localhost:${SERVER_PORT:-3000}"
echo "   API:       http://localhost:${SERVER_PORT:-3000}/api"
echo ""
echo "📌 常用命令（在 docker/ 目录执行）"
echo ""
echo "   查看日志:   docker compose logs -f"
echo "   停止服务:   docker compose down"
echo "   重启服务:   docker compose restart"
echo "   查看状态:   docker compose ps"
echo ""
echo "📌 下一步操作"
echo ""
echo "   1. 访问 Dashboard 创建管理员账号"
echo "   2. 登录后在「用户管理」页面创建用户"
echo "   3. 复制用户的 UUID 用于配置 Agent 和 Chrome 扩展"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
