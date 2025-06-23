#!/usr/bin/env tsx

import { MCPProtocolHandler } from '../packages/mcp-server/dist/index.js'
import * as readline from 'readline'

// 環境変数からTodoist APIトークンを取得
const todoistApiToken = process.env.TODOIST_API_TOKEN || '61dae250699e84eb85b9c2ab9461c0581873566d'

// MCPハンドラーを初期化
const handler = new MCPProtocolHandler(todoistApiToken)

// stdinからのJSONRPCメッセージを処理
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false
})

// 各行をJSONRPCリクエストとして処理
rl.on('line', async (line: string) => {
  try {
    const request = JSON.parse(line.trim())
    const response = await handler.handleRequest(request)
    
    // レスポンスをstdoutに送信
    console.log(JSON.stringify(response))
  } catch (error) {
    // エラーレスポンスを送信
    const errorResponse = {
      jsonrpc: '2.0',
      id: null,
      error: {
        code: -32700,
        message: 'Parse error'
      }
    }
    console.log(JSON.stringify(errorResponse))
  }
})

// プロセス終了時のクリーンアップ
process.on('SIGINT', () => {
  rl.close()
  process.exit(0)
})

process.on('SIGTERM', () => {
  rl.close()
  process.exit(0)
}) 