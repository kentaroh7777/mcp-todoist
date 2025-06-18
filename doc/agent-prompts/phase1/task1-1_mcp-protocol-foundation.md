# Task 1-1: MCPプロトコル基盤実装

## 概要
MCPサーバーの基盤となるプロトコル処理機能を、TDD開発フローに従って実装する。

## 依存関係
- 本実装の元となる設計書: [doc/design/mcp-todoist.md](../design/mcp-todoist.md)

### 前提条件
- なし（初期実装）

### 成果物
- `packages/mcp-server/src/server/mcp-handler.ts` - MCPプロトコル処理
- `packages/mcp-server/src/types/mcp.ts` - MCP型定義
- `packages/mcp-server/src/server/index.ts` - メインサーバー
- `packages/mcp-server/test/` - テスト実装

### 影響範囲
- 後続のTask 1-2, 1-3で使用される基盤

## 実装要件

### 【必須制約】TDD開発フロー
- **テスト実装 → 実装 → テスト通過** の順序で進める
- 各機能に対して単体テストを必須で作成
- Red → Green → Refactor サイクルを厳守

### 技術仕様
```typescript
// MCP基本プロトコル型定義
interface MCPRequest {
  jsonrpc: "2.0";
  id: string | number;
  method: string;
  params?: Record<string, any>;
}

interface MCPResponse {
  jsonrpc: "2.0";
  id: string | number;
  result?: any;
  error?: MCPError;
}

interface MCPError {
  code: number;
  message: string;
  data?: any;
}

// MCPサーバー基盤クラス
class MCPProtocolHandler {
  handleRequest(request: MCPRequest): Promise<MCPResponse>;
  validateRequest(request: any): boolean;
  createResponse(id: string | number, result?: any): MCPResponse;
  createErrorResponse(id: string | number, error: MCPError): MCPResponse;
}
```

### 設計パターン
**参考**: 既存の`src/lib/mcp/server.ts`の構造を参考にしつつ、分離型設計に適応
**理由**: プロトコル処理とビジネスロジックの明確な分離

## 実装ガイド

### Step 1: TDD準備 - テスト環境セットアップ
```bash
cd packages/mcp-server
npm init -y
npm install -D vitest @types/node typescript
npm install express ws zod
```

### Step 2: TDD Red Phase - テスト実装
```typescript
// test/mcp-handler.test.ts
import { describe, it, expect } from 'vitest';
import { MCPProtocolHandler } from '../src/server/mcp-handler';

describe('MCPProtocolHandler', () => {
  it('should handle initialize request', async () => {
    const handler = new MCPProtocolHandler();
    const request = {
      jsonrpc: "2.0" as const,
      id: 1,
      method: "initialize",
      params: {}
    };
    
    const response = await handler.handleRequest(request);
    
    expect(response.jsonrpc).toBe("2.0");
    expect(response.id).toBe(1);
    expect(response.result).toHaveProperty('protocolVersion');
    expect(response.result).toHaveProperty('capabilities');
    expect(response.result).toHaveProperty('serverInfo');
  });

  it('should validate request format', () => {
    const handler = new MCPProtocolHandler();
    
    // 有効なリクエスト
    expect(handler.validateRequest({
      jsonrpc: "2.0",
      id: 1,
      method: "test"
    })).toBe(true);
    
    // 無効なリクエスト
    expect(handler.validateRequest({})).toBe(false);
    expect(handler.validateRequest({ jsonrpc: "1.0" })).toBe(false);
  });

  it('should handle unknown method', async () => {
    const handler = new MCPProtocolHandler();
    const request = {
      jsonrpc: "2.0" as const,
      id: 1,
      method: "unknown_method"
    };
    
    const response = await handler.handleRequest(request);
    
    expect(response.error).toBeDefined();
    expect(response.error?.code).toBe(-32601); // Method not found
  });
});
```

### Step 3: TDD Green Phase - 最小実装
```typescript
// src/types/mcp.ts
export interface MCPRequest {
  jsonrpc: "2.0";
  id: string | number;
  method: string;
  params?: Record<string, any>;
}

export interface MCPResponse {
  jsonrpc: "2.0";
  id: string | number;
  result?: any;
  error?: MCPError;
}

export interface MCPError {
  code: number;
  message: string;
  data?: any;
}

export enum MCPErrorCode {
  ParseError = -32700,
  InvalidRequest = -32600,
  MethodNotFound = -32601,
  InvalidParams = -32602,
  InternalError = -32603,
}
```

```typescript
// src/server/mcp-handler.ts
import { MCPRequest, MCPResponse, MCPError, MCPErrorCode } from '../types/mcp';

export class MCPProtocolHandler {
  async handleRequest(request: MCPRequest): Promise<MCPResponse> {
    if (!this.validateRequest(request)) {
      return this.createErrorResponse(
        request.id || null,
        {
          code: MCPErrorCode.InvalidRequest,
          message: "Invalid request format"
        }
      );
    }

    try {
      switch (request.method) {
        case "initialize":
          return this.createResponse(request.id, {
            protocolVersion: "2024-11-05",
            capabilities: {
              tools: {},
              resources: {},
              prompts: {}
            },
            serverInfo: {
              name: "mcp-todoist",
              version: "1.0.0"
            }
          });

        default:
          return this.createErrorResponse(request.id, {
            code: MCPErrorCode.MethodNotFound,
            message: `Unknown method: ${request.method}`
          });
      }
    } catch (error) {
      return this.createErrorResponse(request.id, {
        code: MCPErrorCode.InternalError,
        message: "Internal server error",
        data: error instanceof Error ? error.message : "Unknown error"
      });
    }
  }

  validateRequest(request: any): request is MCPRequest {
    return (
      typeof request === 'object' &&
      request !== null &&
      request.jsonrpc === "2.0" &&
      (typeof request.id === 'string' || typeof request.id === 'number') &&
      typeof request.method === 'string'
    );
  }

  createResponse(id: string | number, result?: any): MCPResponse {
    return {
      jsonrpc: "2.0",
      id,
      result
    };
  }

  createErrorResponse(id: string | number | null, error: MCPError): MCPResponse {
    return {
      jsonrpc: "2.0",
      id: id || 0,
      error
    };
  }
}
```

### Step 4: TDD Refactor Phase - Express統合
```typescript
// src/server/index.ts
import express from 'express';
import { MCPProtocolHandler } from './mcp-handler';

export class MCPServer {
  private app: express.Application;
  private handler: MCPProtocolHandler;

  constructor() {
    this.app = express();
    this.handler = new MCPProtocolHandler();
    this.setupMiddleware();
    this.setupRoutes();
  }

  private setupMiddleware() {
    this.app.use(express.json());
  }

  private setupRoutes() {
    this.app.post('/mcp', async (req, res) => {
      try {
        const response = await this.handler.handleRequest(req.body);
        res.json(response);
      } catch (error) {
        res.status(500).json({
          jsonrpc: "2.0",
          id: req.body?.id || null,
          error: {
            code: -32603,
            message: "Internal server error"
          }
        });
      }
    });
  }

  listen(port: number, host: string = 'localhost'): Promise<void> {
    return new Promise((resolve) => {
      this.app.listen(port, host, () => {
        console.log(`MCP Server listening on ${host}:${port}`);
        resolve();
      });
    });
  }
}
```

### Step 5: 結合テスト実装
```typescript
// test/server.integration.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import { MCPServer } from '../src/server/index';

describe('MCP Server Integration', () => {
  let server: MCPServer;
  let app: any;

  beforeEach(() => {
    server = new MCPServer();
    app = (server as any).app; // テスト用にapp露出が必要
  });

  it('should handle MCP initialize request via HTTP', async () => {
    const response = await request(app)
      .post('/mcp')
      .send({
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
        params: {}
      })
      .expect(200)
      .expect('Content-Type', /json/);

    expect(response.body.jsonrpc).toBe("2.0");
    expect(response.body.id).toBe(1);
    expect(response.body.result).toHaveProperty('protocolVersion');
  });

  it('should return error for invalid JSON-RPC request', async () => {
    const response = await request(app)
      .post('/mcp')
      .send({
        invalid: "request"
      })
      .expect(200)
      .expect('Content-Type', /json/);

    expect(response.body.error).toBeDefined();
    expect(response.body.error.code).toBe(-32600);
  });
});
```

## 検証基準

### 機能検証
- [ ] **MCPプロトコル準拠**: initialize リクエストが正しく処理される
- [ ] **エラーハンドリング**: 不正リクエストで適切なエラーレスポンス
- [ ] **バリデーション**: リクエスト形式の検証が動作する

### 技術検証
- [ ] **TDD完了**: 全テストが通る（テスト → 実装の順序で開発）
- [ ] **TypeScript**: strict modeでコンパイル成功
- [ ] **HTTP統合**: Express経由でMCPリクエスト処理が可能

### 統合検証
- [ ] **単体テスト**: MCPProtocolHandler のテストが全て通る
- [ ] **結合テスト**: HTTP経由でのMCPプロトコル処理が動作する
- [ ] **型安全性**: TypeScript型定義が正しく機能する

## 注意事項

### 【厳守事項】
- **TDD順序**: テスト実装を必ず先に行うこと
- **MCPプロトコル準拠**: JSON-RPC 2.0仕様に厳密に従うこと
- 既存のコメントを削除しないこと

### 【推奨事項】
- 段階的実装: 最小限の機能から始めて徐々に拡張
- エラーケースの網羅: 様々な不正入力パターンをテスト

### 【禁止事項】
- テストなしでの実装
- プロトコル仕様からの逸脱

## 参考情報
- [MCP Protocol Specification](https://spec.modelcontextprotocol.io/)
- [JSON-RPC 2.0 Specification](https://www.jsonrpc.org/specification)
- 既存実装: `src/lib/mcp/server.ts` - 参考として活用 