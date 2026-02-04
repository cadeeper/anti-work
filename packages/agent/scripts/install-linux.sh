#!/bin/bash

# Anti-Work Agent Linux 安装脚本 (systemd)

set -e

SERVICE_FILE="$HOME/.config/systemd/user/anti-work-agent.service"
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

# 创建目录
mkdir -p "$HOME/.config/systemd/user"
mkdir -p "$LOG_DIR"

# 生成 service 文件
cat > "$SERVICE_FILE" << EOF
[Unit]
Description=Anti-Work Agent
After=network.target

[Service]
Type=simple
ExecStart=$(which node) $AGENT_PATH/dist/index.js start --uuid $UUID --server $SERVER_URL
WorkingDirectory=$AGENT_PATH
Restart=always
RestartSec=10
StandardOutput=append:$LOG_DIR/agent.log
StandardError=append:$LOG_DIR/agent.error.log

[Install]
WantedBy=default.target
EOF

echo "✓ 配置文件已创建: $SERVICE_FILE"

# 重新加载 systemd
systemctl --user daemon-reload

# 启用并启动服务
systemctl --user enable anti-work-agent
systemctl --user start anti-work-agent

echo "✓ Agent 服务已启动"
echo ""
echo "常用命令:"
echo "  查看状态: systemctl --user status anti-work-agent"
echo "  查看日志: journalctl --user -u anti-work-agent -f"
echo "  停止服务: systemctl --user stop anti-work-agent"
echo "  启动服务: systemctl --user start anti-work-agent"
echo "  禁用开机启动: systemctl --user disable anti-work-agent"
