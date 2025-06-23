#!/bin/bash

# MCP Todoist - 全サーバー停止スクリプト

echo "🛑 MCP Todoist システムを停止しています..."

# ルートディレクトリに移動
cd "$(dirname "$0")/.."

# PIDファイルから停止
if [ -f "logs/convex.pid" ]; then
    CONVEX_PID=$(cat logs/convex.pid)
    if ps -p $CONVEX_PID > /dev/null 2>&1; then
        echo "📦 Convexを停止中... (PID: $CONVEX_PID)"
        kill $CONVEX_PID
        sleep 2
        if ps -p $CONVEX_PID > /dev/null 2>&1; then
            echo "   強制終了中..."
            kill -9 $CONVEX_PID
        fi
    fi
    rm -f logs/convex.pid
fi

if [ -f "logs/mcp-server.pid" ]; then
    MCP_PID=$(cat logs/mcp-server.pid)
    if ps -p $MCP_PID > /dev/null 2>&1; then
        echo "🔧 MCPサーバーを停止中... (PID: $MCP_PID)"
        kill $MCP_PID
        sleep 2
        if ps -p $MCP_PID > /dev/null 2>&1; then
            echo "   強制終了中..."
            kill -9 $MCP_PID
        fi
    fi
    rm -f logs/mcp-server.pid
fi

if [ -f "logs/nextjs.pid" ]; then
    NEXTJS_PID=$(cat logs/nextjs.pid)
    if ps -p $NEXTJS_PID > /dev/null 2>&1; then
        echo "🌐 Next.js WebUIを停止中... (PID: $NEXTJS_PID)"
        kill $NEXTJS_PID
        sleep 2
        if ps -p $NEXTJS_PID > /dev/null 2>&1; then
            echo "   強制終了中..."
            kill -9 $NEXTJS_PID
        fi
    fi
    rm -f logs/nextjs.pid
fi

# プロセス名で残存プロセスを検索・停止
echo "🧹 残存プロセスをクリーンアップ中..."

# Convex関連プロセス
CONVEX_PROCS=$(ps aux | grep -E "(convex dev|convex-local-backend)" | grep -v grep | awk '{print $2}')
if [ ! -z "$CONVEX_PROCS" ]; then
    echo "   残存Convexプロセスを停止中..."
    echo "$CONVEX_PROCS" | xargs kill -9 2>/dev/null || true
fi

# MCPサーバー関連プロセス
MCP_PROCS=$(ps aux | grep "tsx script/run-mcp-server" | grep -v grep | awk '{print $2}')
if [ ! -z "$MCP_PROCS" ]; then
    echo "   残存MCPサーバープロセスを停止中..."
    echo "$MCP_PROCS" | xargs kill -9 2>/dev/null || true
fi

# Next.js関連プロセス
NEXT_PROCS=$(ps aux | grep "next dev" | grep -v grep | awk '{print $2}')
if [ ! -z "$NEXT_PROCS" ]; then
    echo "   残存Next.jsプロセスを停止中..."
    echo "$NEXT_PROCS" | xargs kill -9 2>/dev/null || true
fi

# nodemonプロセス
NODEMON_PROCS=$(ps aux | grep "nodemon" | grep -v grep | awk '{print $2}')
if [ ! -z "$NODEMON_PROCS" ]; then
    echo "   残存nodemonプロセスを停止中..."
    echo "$NODEMON_PROCS" | xargs kill -9 2>/dev/null || true
fi

# 2秒待ってプロセス確認
sleep 2

# 最終確認
REMAINING_CONVEX=$(ps aux | grep -E "(convex|tsx script/run-mcp-server|next dev)" | grep -v grep | wc -l)
if [ $REMAINING_CONVEX -gt 0 ]; then
    echo "⚠️  一部プロセスが残存している可能性があります:"
    ps aux | grep -E "(convex|tsx script/run-mcp-server|next dev)" | grep -v grep
else
    echo "✅ 全サーバーが正常に停止しました"
fi

echo ""
echo "📋 停止完了"
echo "   🚀 再起動するには: ./script/start-all.sh"
echo "" 