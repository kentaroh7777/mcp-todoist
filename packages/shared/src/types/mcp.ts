// MCP Protocol types
export type MCPRequest = {
  jsonrpc: "2.0";
  id: string | number;
  method: string;
  params?: Record<string, any>;
};

export type MCPResponse = {
  jsonrpc: "2.0";
  id: string | number;
  result?: any;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
};

export type MCPTool = {
  name: string;
  description: string;
  inputSchema: {
    type: "object";
    properties: Record<string, any>;
    required?: string[];
  };
};

export type MCPServerCapabilities = {
  tools?: Record<string, any>;
  resources?: Record<string, any>;
  prompts?: Record<string, any>;
};

export type MCPServerInfo = {
  name: string;
  version: string;
  description?: string;
  author?: string;
  license?: string;
};

export type MCPInitializeResult = {
  protocolVersion: string;
  capabilities: MCPServerCapabilities;
  serverInfo: MCPServerInfo;
};

// MCP Error codes
export enum MCPErrorCode {
  ParseError = -32700,
  InvalidRequest = -32600,
  MethodNotFound = -32601,
  InvalidParams = -32602,
  InternalError = -32603,
  // Custom error codes
  Unauthorized = -32001,
  Forbidden = -32002,
  NotFound = -32003,
  RateLimited = -32004,
}

// MCP Tool execution context
export type MCPToolContext = {
  userId?: string;
  accountId?: string;
  sessionId?: string;
  metadata?: Record<string, any>;
}; 