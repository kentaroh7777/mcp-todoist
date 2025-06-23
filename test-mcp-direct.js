const { spawn } = require('child_process');

// MCPサーバーを起動
const mcpServer = spawn('tsx', ['script/run-mcp-server.ts'], {
  env: {
    ...process.env,
    TODOIST_API_TOKEN: '61dae250699e84eb85b9c2ab9461c0581873566d'
  },
  stdio: ['pipe', 'pipe', 'pipe']
});

let responseBuffer = '';

mcpServer.stdout.on('data', (data) => {
  responseBuffer += data.toString();
  console.log('Server response:', data.toString());
});

mcpServer.stderr.on('data', (data) => {
  console.error('Server error:', data.toString());
});

// 初期化リクエスト
const initRequest = {
  jsonrpc: "2.0",
  id: 1,
  method: "initialize",
  params: {
    protocolVersion: "2024-11-05",
    capabilities: {},
    clientInfo: {
      name: "test-client",
      version: "1.0.0"
    }
  }
};

// タスク取得リクエスト
const getTasksRequest = {
  jsonrpc: "2.0",
  id: 2,
  method: "tools/call",
  params: {
    name: "todoist_get_tasks",
    arguments: {}
  }
};

console.log('Sending initialize request...');
mcpServer.stdin.write(JSON.stringify(initRequest) + '\n');

setTimeout(() => {
  console.log('Sending get tasks request...');
  mcpServer.stdin.write(JSON.stringify(getTasksRequest) + '\n');
}, 2000);

setTimeout(() => {
  console.log('Terminating server...');
  mcpServer.kill();
  process.exit(0);
}, 5000); 