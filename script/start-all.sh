#!/bin/bash

# MCP Todoist - 全サーバー起動スクリプト

set -e

echo "🚀 MCP Todoist システムを起動しています..."

# ルートディレクトリに移動
cd "$(dirname "$0")/.."

# 既存プロセス確認と警告
EXISTING_CONVEX=$(ps aux | grep "convex dev" | grep -v grep | wc -l)
EXISTING_MCP=$(ps aux | grep "tsx script/run-mcp-server" | grep -v grep | wc -l)
EXISTING_NEXT=$(ps aux | grep "next dev" | grep -v grep | wc -l)

if [ $EXISTING_CONVEX -gt 0 ] || [ $EXISTING_MCP -gt 0 ] || [ $EXISTING_NEXT -gt 0 ]; then
    echo "⚠️  既存のサーバーが起動中です。自動停止してから起動します..."
    ./script/stop-all.sh
    sleep 3
fi

# ログディレクトリ作成
mkdir -p logs

echo "📦 Step 1/3: Convex起動中 (ポート3210)..."
# Convexを非対話的モードで起動（アップグレードプロンプトに自動応答）
nohup sh -c 'printf "Y\n" | npx convex dev --configure existing --team kentaro-hayashi --project mcptodoist --dev-deployment local' > logs/convex.log 2>&1 &
CONVEX_PID=$!
echo $CONVEX_PID > logs/convex.pid
echo "   Convex PID: $CONVEX_PID"

# Convexの起動を待つ（60秒タイムアウト）
echo "   Convexの起動を待機中..."
CONVEX_TIMEOUT=60
for i in $(seq 1 $CONVEX_TIMEOUT); do
    if curl -s --connect-timeout 3 --max-time 5 http://127.0.0.1:3210 >/dev/null 2>&1; then
        echo "   ✅ Convex起動完了 (${i}秒)"
        break
    fi
    if [ $i -eq $CONVEX_TIMEOUT ]; then
        echo "   ❌ Convexの起動がタイムアウトしました ($CONVEX_TIMEOUT秒)"
        echo "   ログを確認: tail -f logs/convex.log"
        ./script/stop-all.sh
        exit 1
    fi
    sleep 1
done

echo "🔧 Step 2/3: MCPサーバー起動中 (ポート4000)..."
nohup env TODOIST_API_TOKEN=61dae250699e84eb85b9c2ab9461c0581873566d tsx script/run-mcp-server.ts > logs/mcp-server.log 2>&1 &
MCP_PID=$!
echo $MCP_PID > logs/mcp-server.pid
echo "   MCP Server PID: $MCP_PID"

# MCPサーバーの起動を待つ（30秒タイムアウト）
echo "   MCPサーバーの起動を待機中..."
MCP_TIMEOUT=30
for i in $(seq 1 $MCP_TIMEOUT); do
    if curl -s --connect-timeout 2 --max-time 3 http://localhost:4000 >/dev/null 2>&1; then
        echo "   ✅ MCPサーバー起動完了 (${i}秒)"
        break
    fi
    if [ $i -eq $MCP_TIMEOUT ]; then
        echo "   ❌ MCPサーバーの起動がタイムアウトしました ($MCP_TIMEOUT秒)"
        echo "   ログを確認: tail -f logs/mcp-server.log"
        ./script/stop-all.sh
        exit 1
    fi
    sleep 1
done

echo "🌐 Step 3/3: Next.js WebUI起動中 (ポート3000)..."
cd packages/web-ui
nohup npm run dev > ../../logs/nextjs.log 2>&1 &
NEXTJS_PID=$!
echo "   Next.js PID: $NEXTJS_PID"

# Next.jsの起動を待つ（45秒タイムアウト）
echo "   Next.js WebUIの起動を待機中..."
NEXTJS_TIMEOUT=45
for i in $(seq 1 $NEXTJS_TIMEOUT); do
    if curl -s --connect-timeout 3 --max-time 5 http://localhost:3000 >/dev/null 2>&1; then
        echo "   ✅ Next.js WebUI起動完了 (${i}秒)"
        break
    fi
    if [ $i -eq $NEXTJS_TIMEOUT ]; then
        echo "   ❌ Next.js WebUIの起動がタイムアウトしました ($NEXTJS_TIMEOUT秒)"
        echo "   ログを確認: tail -f logs/nextjs.log"
        cd ../..
        ./script/stop-all.sh
        exit 1
    fi
    sleep 1
done

# PIDファイルに保存
cd ../..
echo $NEXTJS_PID > logs/nextjs.pid

echo ""
echo "✅ 全サーバーが正常に起動しました！"
echo ""
echo "📋 サービス状況:"
echo "   • Convex:      http://127.0.0.1:3210 (PID: $CONVEX_PID)"
echo "   • MCP Server:  http://localhost:4000 (PID: $MCP_PID)"
echo "   • Next.js UI:  http://localhost:3000 (PID: $NEXTJS_PID)"
echo ""
echo "📊 ログ確認:"
echo "   • Convex:      tail -f logs/convex.log"
echo "   • MCP Server:  tail -f logs/mcp-server.log"
echo "   • Next.js:     tail -f logs/nextjs.log"
echo ""
echo "🛑 停止するには:"
echo "   ./script/stop-all.sh"
echo "" 