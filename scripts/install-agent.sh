#!/bin/bash

# =============================================================================
# Anti-Work Agent 一键安装脚本 (PM2)
# 支持 macOS 和 Linux
# =============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
AGENT_DIR="$PROJECT_ROOT/packages/agent"

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo ""
echo "🤖 Anti-Work Agent Installer (PM2)"
echo "===================================="
echo ""

# 解析参数
UUID=""
SERVER_URL="http://localhost:3000"

print_usage() {
  echo "用法: $0 --uuid <YOUR_UUID> [--server <SERVER_URL>]"
  echo ""
  echo "参数:"
  echo "  --uuid, -u     用户 UUID（必填，在服务端用户管理页面获取）"
  echo "  --server, -s   服务器地址（默认: http://localhost:3000）"
  echo ""
  echo "示例:"
  echo "  $0 --uuid abc-123-def"
  echo "  $0 --uuid abc-123-def --server http://myserver.com:3000"
  echo ""
  echo "注意: 监控目录从服务端配置获取，请在服务端用户设置中配置 watchPaths"
  echo ""
}

while [[ $# -gt 0 ]]; do
  case $1 in
    --uuid|-u)
      UUID="$2"
      shift 2
      ;;
    --server|-s)
      SERVER_URL="$2"
      shift 2
      ;;
    --help|-h)
      print_usage
      exit 0
      ;;
    *)
      echo -e "${RED}未知参数: $1${NC}"
      print_usage
      exit 1
      ;;
  esac
done

# 检查必填参数
if [ -z "$UUID" ]; then
  echo -e "${RED}❌ 错误: 缺少必填参数 --uuid${NC}"
  echo ""
  print_usage
  exit 1
fi

# 检查 Node.js
if ! command -v node &> /dev/null; then
  echo -e "${RED}❌ 错误: 未找到 Node.js，请先安装 Node.js 18+${NC}"
  echo "   https://nodejs.org/"
  exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
  echo -e "${RED}❌ 错误: Node.js 版本过低，需要 18+，当前版本: $(node -v)${NC}"
  exit 1
fi

# 检查 pnpm
if ! command -v pnpm &> /dev/null; then
  echo -e "${YELLOW}📦 未找到 pnpm，正在安装...${NC}"
  npm install -g pnpm
fi

# 检查/安装 PM2
if ! command -v pm2 &> /dev/null; then
  echo -e "${YELLOW}📦 未找到 PM2，正在安装...${NC}"
  npm install -g pm2
fi

cd "$PROJECT_ROOT"

# 安装依赖
echo "📦 安装依赖..."
pnpm install

# 构建 Agent
echo "🔧 构建 Agent..."
pnpm --filter @anti-work/agent build

cd "$AGENT_DIR"

# 停止旧的进程（如果存在）
echo ""
echo "🔧 配置 PM2 服务..."
pm2 delete anti-work-agent 2>/dev/null || true

# 使用 PM2 启动
pm2 start "$AGENT_DIR/dist/index.js" \
  --name "anti-work-agent" \
  --interpreter node \
  -- start --uuid "$UUID" --server "$SERVER_URL"

# 保存 PM2 配置
pm2 save

echo ""
echo -e "${GREEN}✅ Agent 安装完成！${NC}"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📌 配置信息"
echo ""
echo "   用户 UUID:  $UUID"
echo "   服务器地址: $SERVER_URL"
echo "   监控目录:   (从服务端获取)"
echo ""
echo "📌 PM2 常用命令"
echo ""
echo "   查看状态: pm2 status"
echo "   查看日志: pm2 logs anti-work-agent"
echo "   停止服务: pm2 stop anti-work-agent"
echo "   启动服务: pm2 start anti-work-agent"
echo "   重启服务: pm2 restart anti-work-agent"
echo "   删除服务: pm2 delete anti-work-agent"
echo ""
echo "📌 开机自启动（可选）"
echo ""
echo "   pm2 startup"
echo "   pm2 save"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
