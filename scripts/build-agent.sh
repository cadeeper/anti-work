#!/bin/bash

# =============================================================================
# Anti-Work Agent 构建脚本
# =============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
AGENT_DIR="$PROJECT_ROOT/packages/agent"

cd "$PROJECT_ROOT"

echo ""
echo "🤖 Anti-Work Agent Builder"
echo "=========================="
echo ""

# 检查依赖
if [ ! -d "node_modules" ]; then
  echo "📦 安装依赖..."
  pnpm install
  echo ""
fi

# 构建 Agent
echo "🔧 构建 Agent..."
pnpm --filter @anti-work/agent build
echo ""

# 输出结果
echo "✅ 构建完成！"
echo ""
echo "📁 Agent 目录: $AGENT_DIR"
echo "📁 可执行文件: $AGENT_DIR/dist/index.js"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📌 下一步操作："
echo ""
echo "   方式一：一键安装（推荐，使用 PM2）"
echo "   ─────────────────────────────────────"
echo "   ./scripts/install-agent.sh --uuid YOUR_UUID"
echo ""
echo "   方式二：直接运行（前台调试）"
echo "   ─────────────────────────────"
echo "   cd $AGENT_DIR"
echo "   node dist/index.js start --uuid YOUR_UUID"
echo ""
echo "   方式三：手动 PM2 启动"
echo "   ─────────────────────"
echo "   npm install -g pm2"
echo "   pm2 start $AGENT_DIR/dist/index.js --name anti-work-agent -- start --uuid YOUR_UUID"
echo "   pm2 save"
echo ""
echo "   ⚠️  请将 YOUR_UUID 替换为你在服务端用户管理页面获取的 UUID"
echo "   ⚠️  监控目录从服务端配置获取，请在服务端用户设置中配置 watchPaths"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
