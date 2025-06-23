#!/usr/bin/env tsx

import { spawn, ChildProcess } from 'child_process';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

console.log('🚀 MCPサーバーを起動しています...');

// 環境変数の設定
const env: NodeJS.ProcessEnv = {
  ...process.env,
  TODOIST_API_TOKEN: process.env.TODOIST_API_TOKEN || '61dae250699e84eb85b9c2ab9461c0581873566d',
  MCP_SERVER_PORT: process.env.MCP_SERVER_PORT || '4000'
};

// MCPサーバーの起動
const mcpServer: ChildProcess = spawn('npm', ['run', 'dev'], {
  cwd: join(projectRoot, 'packages/mcp-server'),
  env,
  stdio: 'inherit'
});

mcpServer.on('close', (code: number | null) => {
  console.log(`📤 MCPサーバーが終了しました (コード: ${code})`);
  process.exit(code || 0);
});

mcpServer.on('error', (error: Error) => {
  console.error('❌ MCPサーバーの起動に失敗:', error);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('📤 MCPサーバーを停止しています...');
  if (mcpServer.pid) {
    mcpServer.kill('SIGTERM');
  }
});

process.on('SIGINT', () => {
  console.log('📤 MCPサーバーを停止しています...');
  if (mcpServer.pid) {
    mcpServer.kill('SIGINT');
  }
}); 