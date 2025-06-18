export interface MCPRequest {
  jsonrpc: string
  id: any
  method: string
  params?: any
}

export interface MCPResponse {
  jsonrpc: string
  id: any
  result?: any
  error?: MCPError
}

export interface MCPError {
  code: number
  message: string
  data?: any
}

export interface InitializeResult {
  protocolVersion: string
  capabilities: any
  serverInfo: ServerInfo
}

export interface ServerInfo {
  name: string
  version: string
}

export interface ValidationResult {
  isValid: boolean
  error?: MCPError
}