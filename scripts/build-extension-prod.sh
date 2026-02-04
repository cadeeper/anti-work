#!/bin/bash

# =============================================================================
# Anti-Work Chrome 扩展生产构建脚本
# =============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
EXTENSION_DIR="$PROJECT_ROOT/packages/extension"
DIST_DIR="$EXTENSION_DIR/dist"

cd "$PROJECT_ROOT"

echo ""
echo "🔌 Anti-Work Chrome Extension Builder (Production)"
echo "==================================================="
echo ""

# 检查 Node.js
if ! command -v node &> /dev/null; then
  echo "❌ 错误: 未找到 Node.js，请先安装 Node.js 18+"
  echo "   https://nodejs.org/"
  exit 1
fi

# 检查 pnpm
if ! command -v pnpm &> /dev/null; then
  echo "📦 未找到 pnpm，正在安装..."
  npm install -g pnpm
fi

# 安装依赖
echo "📦 安装依赖..."
pnpm install

# 构建扩展
echo "🔧 构建 Chrome 扩展..."
NODE_ENV=production pnpm --filter @anti-work/extension build

echo ""
echo "✅ 构建完成！"
echo ""
echo "📁 扩展目录: $DIST_DIR"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📌 安装到 Chrome"
echo ""
echo "   1. 打开 Chrome 浏览器"
echo "   2. 访问 chrome://extensions/"
echo "   3. 开启右上角「开发者模式」"
echo "   4. 点击「加载已解压的扩展程序」"
echo "   5. 选择目录:"
echo "      $DIST_DIR"
echo ""
echo "📌 配置扩展"
echo ""
echo "   1. 点击 Chrome 工具栏的 Anti-Work 扩展图标"
echo "   2. 在弹出的设置面板中："
echo "      - 服务器地址: 输入你的服务端地址（如 http://your-server:3000）"
echo "      - 用户 UUID:  输入你在服务端用户管理页面获取的 UUID"
echo "   3. 点击「保存配置」"
echo "   4. 状态显示「已连接」表示配置成功"
echo ""
echo "📌 获取 UUID"
echo ""
echo "   1. 访问服务端 Dashboard（如 http://your-server:3000）"
echo "   2. 使用管理员账号登录"
echo "   3. 进入「用户管理」页面"
echo "   4. 找到你的用户，复制 UUID"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
