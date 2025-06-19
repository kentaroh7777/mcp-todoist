# Task 1: ExtendedConvexMCPClient（認証無効化機能）

## 概要
既存のConvexMCPClientを拡張し、認証無効化機能を持つExtendedConvexMCPClientを実装。Firebase認証をスキップして、テスト用ユーザーIDで動作可能にする。

## 依存関係
- 本実装の元となる設計書: `doc/design/mcp-tester.md`
- 既存実装: `packages/web-ui/lib/mcp/convex-client.ts`のConvexMCPClient

### 前提条件
- ConvexMCPClient: 既存の基本MCP通信クライアント - Convex統合の基盤として必要

### 成果物
- `packages/web-ui/lib/mcp/extended-convex-client.ts` - 認証無効化機能付きMCPクライアント
- `packages/web-ui/lib/mcp/extended-convex-client.ts`のexport関数 - React hooksからの利用

### 影響範囲
- `packages/web-ui/lib/mcp/convex-client.ts` - 参照先として使用（変更なし）

## 実装要件

### 【必須制約】認証レイヤーの抽象化
- **認証スキップ**: `skipAuthentication: true`時は認証処理を完全にスキップ
- **テストユーザー**: `testUserId`を指定可能にし、認証なしで動作
- **既存互換性**: ConvexMCPClientのAPIとの完全互換性を保持

### 技術仕様
```typescript
// 拡張設定インターフェース
interface ExtendedConvexMCPClientConfig extends MCPClientConfig {
  skipAuthentication?: boolean;
  testUserId?: string;
}

// React hooks用の設定
interface ExtendedConvexMCPClientHookConfig {
  skipAuthentication?: boolean;
  testUserId?: string;
  autoConnect?: boolean;
}

// 拡張クライアント実装
export class ExtendedConvexMCPClient extends ConvexMCPClient {
  private config: ExtendedConvexMCPClientConfig;
  
  constructor(config: ExtendedConvexMCPClientConfig = {}) {
    super(config);
    this.config = config;
  }
  
  protected async ensureAuthentication(): Promise<void> {
    if (this.config.skipAuthentication) {
      this.userId = this.config.testUserId || 'test-user';
      return;
    }
    return super.ensureAuthentication();
  }
}

// React hooks
export function useExtendedConvexMCPClient(config: ExtendedConvexMCPClientHookConfig) {
  // フック実装
}
```

### 設計パターン
**参考**: `packages/web-ui/lib/mcp/convex-client.ts`のConvexMCPClientパターンを踏襲
**理由**: 既存のConvex統合基盤を最大限活用し、互換性を保持するため

## 実装ガイド

### ステップ1: 基本クラス構造の実装
```typescript
import { ConvexMCPClient } from './convex-client';
import type { MCPClientConfig } from '@/types/mcp';

interface ExtendedConvexMCPClientConfig extends MCPClientConfig {
  skipAuthentication?: boolean;
  testUserId?: string;
}

export class ExtendedConvexMCPClient extends ConvexMCPClient {
  private extendedConfig: ExtendedConvexMCPClientConfig;
  
  constructor(config: ExtendedConvexMCPClientConfig = {}) {
    super(config);
    this.extendedConfig = config;
  }
}
```

### ステップ2: 認証オーバーライドの実装
```typescript
protected async ensureAuthentication(): Promise<void> {
  if (this.extendedConfig.skipAuthentication) {
    // 認証をスキップしてテストユーザーIDを設定
    this.userId = this.extendedConfig.testUserId || 'test-user';
    return;
  }
  
  // 通常の認証フロー
  return super.ensureAuthentication();
}
```

### ステップ3: React hooks実装
```typescript
import { useMutation, useQuery, useAction } from 'convex/react';
import { api } from '../../convex/_generated/api';

interface ExtendedConvexMCPClientHookConfig {
  skipAuthentication?: boolean;
  testUserId?: string;
  autoConnect?: boolean;
}

export function useExtendedConvexMCPClient(
  config: ExtendedConvexMCPClientHookConfig = {}
) {
  const convexAction = useAction(api.mcp.handleMCPRequest);
  const convexMutation = useMutation(api.mcp.createMCPSession);
  const convexQuery = useQuery;
  
  const client = useMemo(() => {
    const extendedClient = new ExtendedConvexMCPClient({
      skipAuthentication: config.skipAuthentication ?? true,
      testUserId: config.testUserId ?? 'test-user'
    });
    
    extendedClient.initializeConvexHooks({
      action: convexAction,
      mutation: convexMutation,
      query: convexQuery
    });
    
    return extendedClient;
  }, [config.skipAuthentication, config.testUserId]);
  
  return client;
}
```

## 検証基準【ユーザー承認済み】

### 機能検証
- [ ] `skipAuthentication: true`でFirebase認証をスキップして接続可能
- [ ] `testUserId`を指定してテストユーザーで動作可能
- [ ] 既存のConvexMCPClientと同一のAPIで動作

### 技術検証
- [ ] TypeScript strict modeでコンパイル成功
- [ ] ESLintエラー0件
- [ ] `useExtendedConvexMCPClient`フックが正常に動作

### 統合検証
- [ ] 既存のConvex Actions (`api.mcp.handleMCPRequest`) との連携確認
- [ ] 認証無効化時でもMCPサーバーとの通信が成功

## 実装例
```typescript
'use client';

import { useMemo } from 'react';
import { useMutation, useQuery, useAction } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { ConvexMCPClient } from './convex-client';
import type { MCPClientConfig } from '@/types/mcp';

// 拡張設定インターフェース
interface ExtendedConvexMCPClientConfig extends MCPClientConfig {
  skipAuthentication?: boolean;
  testUserId?: string;
}

// 拡張クライアント実装
export class ExtendedConvexMCPClient extends ConvexMCPClient {
  private extendedConfig: ExtendedConvexMCPClientConfig;
  
  constructor(config: ExtendedConvexMCPClientConfig = {}) {
    super(config);
    this.extendedConfig = {
      skipAuthentication: true,
      testUserId: 'test-user',
      ...config
    };
  }
  
  protected async ensureAuthentication(): Promise<void> {
    if (this.extendedConfig.skipAuthentication) {
      // 認証をスキップしてテストユーザーIDを設定
      this.userId = this.extendedConfig.testUserId || 'test-user';
      return;
    }
    
    // 通常の認証フロー（Firebase）
    return super.ensureAuthentication();
  }
}

// React hooks用の設定
interface ExtendedConvexMCPClientHookConfig {
  skipAuthentication?: boolean;
  testUserId?: string;
  autoConnect?: boolean;
}

// React hooks実装
export function useExtendedConvexMCPClient(
  config: ExtendedConvexMCPClientHookConfig = {}
) {
  const convexAction = useAction(api.mcp.handleMCPRequest);
  const convexMutation = useMutation(api.mcp.createMCPSession);
  const convexQuery = useQuery;
  
  const client = useMemo(() => {
    const extendedClient = new ExtendedConvexMCPClient({
      skipAuthentication: config.skipAuthentication ?? true,
      testUserId: config.testUserId ?? 'test-user',
      enableLogging: true
    });
    
    // Convex hooks を初期化
    extendedClient.initializeConvexHooks({
      action: convexAction,
      mutation: convexMutation,
      query: convexQuery
    });
    
    return extendedClient;
  }, [config.skipAuthentication, config.testUserId, convexAction, convexMutation, convexQuery]);
  
  return client;
}

// 型エクスポート
export type { ExtendedConvexMCPClientConfig, ExtendedConvexMCPClientHookConfig };
```

## 注意事項

### 【厳守事項】
- ConvexMCPClientの既存APIとの完全互換性を保持すること
- 認証無効化時でもセキュリティ上安全な実装を心がけること
- 既存のコメントを削除しないこと

### 【推奨事項】
- TypeScript型定義を厳密に指定すること
- エラーハンドリングを適切に実装すること
- ログ出力で認証状態を確認可能にすること

### 【禁止事項】
- 既存のConvexMCPClientクラスを直接変更すること
- Firebase認証の実装を削除・破壊すること
- try-catch構文の過度な使用（デバッグ時は原因特定を優先）

## 参考情報
- `packages/web-ui/lib/mcp/convex-client.ts`: 既存のConvexMCPClient実装
- `packages/web-ui/types/mcp.ts`: MCP関連の型定義
- `convex/mcp.ts`: Convex Actions実装 