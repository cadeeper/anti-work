#!/bin/bash

# Anti-Work Agent macOS 卸载脚本

PLIST_FILE="$HOME/Library/LaunchAgents/com.anti-work.agent.plist"

if [ -f "$PLIST_FILE" ]; then
  launchctl unload "$PLIST_FILE" 2>/dev/null || true
  rm "$PLIST_FILE"
  echo "✓ Agent 服务已卸载"
else
  echo "Agent 服务未安装"
fi
