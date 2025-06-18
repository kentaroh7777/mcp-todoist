// MCP JSON-RPC 2.0 基本型
export interface MCPRequest {
  jsonrpc: '2.0'
  id: string | number
  method: string
  params?: any
}

export interface MCPResponse {
  jsonrpc: '2.0'
  id: string | number
  result?: any
  error?: MCPError
}

export interface MCPError {
  code: number
  message: string
  data?: any
}

// MCP initialize
export interface MCPCapabilities {
  tools?: Record<string, any>
  resources?: Record<string, any>
  prompts?: Record<string, any>
}

export interface MCPServerInfo {
  name: string
  version: string
}

export interface MCPInitializeResponse {
  protocolVersion: string
  capabilities: MCPCapabilities
  serverInfo: MCPServerInfo
}

// JSON Schema 型
export interface JSONSchema {
  type: string
  properties?: Record<string, any>
  required?: string[]
  items?: JSONSchema
  description?: string
  minimum?: number
  maximum?: number
  minLength?: number
  maxLength?: number
  pattern?: string
  enum?: any[]
}

// MCP tools
export interface MCPTool {
  name: string
  description?: string
  inputSchema: JSONSchema
}

// MCP resources
export interface MCPResource {
  uri: string
  name: string
  description?: string
  mimeType?: string
}

export interface MCPResourceContent {
  uri: string
  mimeType: string
  text?: string
  blob?: string
}

// MCP prompts
export interface MCPPromptArgument {
  name: string
  description: string
  required?: boolean
}

export interface MCPPrompt {
  name: string
  description?: string
  arguments?: MCPPromptArgument[]
}

export interface MCPPromptMessage {
  role: string
  content: {
    type: string
    text: string
  }
}

export interface MCPPromptContent {
  name?: string
  description?: string
  messages: MCPPromptMessage[]
}

// Todoist統合型
export interface TodoistTool extends MCPTool {
  name: 'todoist_get_tasks' | 'todoist_create_task' | 'todoist_update_task' | 'todoist_delete_task' | 'todoist_get_projects'
}

// UI状態管理型
export interface MCPMessage {
  id: string
  timestamp: Date
  direction: 'sent' | 'received'
  type: 'request' | 'response' | 'notification'
  content: MCPRequest | MCPResponse
}

export interface MCPTesterState {
  connected: boolean
  serverUrl: string
  tools: MCPTool[]
  resources: MCPResource[]
  prompts: MCPPrompt[]
  logs: MCPMessage[]
  selectedTool?: MCPTool
  selectedResource?: MCPResource
  selectedPrompt?: MCPPrompt
  loading: boolean
  error?: string
}

// 接続状態型
export type MCPConnectionState = 'disconnected' | 'connecting' | 'connected' | 'reconnecting'

// イベント型
export interface MCPEventMap {
  connect: () => void
  disconnect: () => void
  error: (error: Error) => void
  message: (message: MCPMessage) => void
  notification: (notification: any) => void
  reconnect: () => void
  sync: (data: any) => void
}

// MCPClient用の設定型
export interface MCPClientConfig {
  reconnectInterval?: number
  maxReconnectAttempts?: number
  requestTimeout?: number
  enableLogging?: boolean
}

// サーバー情報拡張型
export interface MCPServerInfoExtended extends MCPServerInfo {
  protocolVersion?: string
  capabilities?: MCPCapabilities
  connected?: boolean
  lastConnected?: Date
}