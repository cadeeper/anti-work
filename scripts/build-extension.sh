#!/bin/bash

# =============================================================================
# Anti-Work Chrome 扩展构建脚本
# =============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
EXTENSION_DIR="$PROJECT_ROOT/packages/extension"
DIST_DIR="$EXTENSION_DIR/dist"

cd "$PROJECT_ROOT"

echo ""
echo "🔌 Anti-Work Chrome Extension Builder"
echo "======================================"
echo ""

# 检查依赖
if [ ! -d "node_modules" ]; then
  echo "📦 安装依赖..."
  pnpm install
  echo ""
fi

# 构建扩展
echo "🔧 构建 Chrome 扩展..."
pnpm --filter @anti-work/extension build
echo ""

# 输出结果
echo "✅ 构建完成！"
echo ""
echo "📁 扩展目录: $DIST_DIR"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📌 安装步骤："
echo ""
echo "   1. 打开 Chrome 浏览器，访问 chrome://extensions/"
echo "   2. 开启右上角「开发者模式」"
echo "   3. 点击「加载已解压的扩展程序」"
echo "   4. 选择目录: $DIST_DIR"
echo ""
echo "📌 配置步骤："
echo ""
echo "   1. 点击扩展图标打开设置面板"
echo "   2. 输入服务器地址（默认 http://localhost:3000）"
echo "   3. 输入你的用户 UUID（在服务端用户管理页面获取）"
echo "   4. 点击「保存配置」"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
