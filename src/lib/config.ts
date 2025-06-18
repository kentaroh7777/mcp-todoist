// 環境変数の設定管理
export const config = {
  // Convex設定
  convex: {
    deployment: process.env.CONVEX_DEPLOYMENT || '',
    url: process.env.NEXT_PUBLIC_CONVEX_URL || '',
  },
  
  // Todoist API設定
  todoist: {
    apiToken: process.env.TODOIST_API_TOKEN || '',
    baseUrl: 'https://api.todoist.com/rest/v2',
  },
  
  // Next.js設定
  nextAuth: {
    secret: process.env.NEXTAUTH_SECRET || 'default-secret-key',
    url: process.env.NEXTAUTH_URL || 'http://localhost:3000',
  },
  
  // 開発設定
  development: {
    nodeEnv: process.env.NODE_ENV || 'development',
    port: parseInt(process.env.PORT || '3000', 10),
  },
  
  // MCP Server設定
  mcpServer: {
    port: parseInt(process.env.MCP_SERVER_PORT || '3001', 10),
    host: process.env.MCP_SERVER_HOST || 'localhost',
    endpoint: '/api/mcp',
  },
} as const;

// 環境変数の必須チェック
export function validateConfig() {
  const errors: string[] = [];
  
  if (!config.convex.url && process.env.NODE_ENV === 'production') {
    errors.push('NEXT_PUBLIC_CONVEX_URL is required in production');
  }
  
  if (!config.todoist.apiToken && process.env.NODE_ENV === 'production') {
    errors.push('TODOIST_API_TOKEN is required for Todoist integration');
  }
  
  if (errors.length > 0) {
    throw new Error(`Configuration errors:\n${errors.join('\n')}`);
  }
  
  return true;
}

// 設定情報をログ出力（デバッグ用）
export function logConfig() {
  if (process.env.NODE_ENV === 'development') {
    console.log('[CONFIG] Environment variables loaded:');
    console.log('[CONFIG] - Convex URL:', config.convex.url || 'NOT SET');
    console.log('[CONFIG] - Todoist API:', config.todoist.apiToken ? 'SET' : 'NOT SET');
    console.log('[CONFIG] - MCP Server:', `${config.mcpServer.host}:${config.mcpServer.port}`);
  }
} 