#!/bin/bash
set -e
echo "========================================"
echo "  高考数学备考资料商店 - 启动脚本"
echo "========================================"
echo ""
echo "📋 检查环境..."
if ! command -v node &> /dev/null; then
    echo "❌ Node.js 未安装"
    exit 1
fi
echo "  ✅ Node $(node --version)"
echo ""
echo "📦 无外部依赖，无需 npm install"
echo ""
echo "🚀 启动服务器..."
echo "  🌐 http://localhost:3000"
echo "  💡 Ctrl+C 停止服务"
echo ""
cd "$(dirname "$0")/server"
node server.js
