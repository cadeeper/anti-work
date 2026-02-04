#!/bin/bash

# Anti-Work Agent macOS 安装脚本

set -e

PLIST_FILE="$HOME/Library/LaunchAgents/com.anti-work.agent.plist"
AGENT_PATH="$(cd "$(dirname "$0")/.." && pwd)"
LOG_DIR="$HOME/.anti-work/logs"

# 检查参数
if [ -z "$1" ]; then
  echo "用法: $0 <YOUR_UUID> [SERVER_URL]"
  echo "示例: $0 abc-123-def http://localhost:3000"
  exit 1
fi

UUID=$1
SERVER_URL=${2:-"http://localhost:3000"}

# 创建日志目录
mkdir -p "$LOG_DIR"

# 生成 plist 文件
cat > "$PLIST_FILE" << EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.anti-work.agent</string>
    <key>ProgramArguments</key>
    <array>
        <string>$(which node)</string>
        <string>$AGENT_PATH/dist/index.js</string>
        <string>start</string>
        <string>--uuid</string>
        <string>$UUID</string>
        <string>--server</string>
        <string>$SERVER_URL</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>StandardOutPath</key>
    <string>$LOG_DIR/agent.log</string>
    <key>StandardErrorPath</key>
    <string>$LOG_DIR/agent.error.log</string>
    <key>WorkingDirectory</key>
    <string>$AGENT_PATH</string>
</dict>
</plist>
EOF

echo "✓ 配置文件已创建: $PLIST_FILE"

# 加载服务
launchctl unload "$PLIST_FILE" 2>/dev/null || true
launchctl load "$PLIST_FILE"

echo "✓ Agent 服务已启动"
echo ""
echo "常用命令:"
echo "  查看状态: launchctl list | grep anti-work"
echo "  查看日志: tail -f $LOG_DIR/agent.log"
echo "  停止服务: launchctl unload $PLIST_FILE"
echo "  启动服务: launchctl load $PLIST_FILE"
echo "  卸载服务: rm $PLIST_FILE && launchctl unload $PLIST_FILE"
