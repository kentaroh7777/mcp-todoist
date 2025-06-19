# Task 1: ExtendedConvexMCPClient実装

## 概要
ConvexMCPClientを拡張し、Firebase認証を無効化可能な設計に変更する。将来的にFirebase認証を追加しやすいアーキテクチャを構築する。

## 依存関係
- 本実装の元となる設計書: `doc/design/mcp-tester.md`

### 前提条件
- `packages/web-ui/lib/mcp/convex-client.ts`: 既存のConvexMCPClient - 拡張のベースとして使用
- `convex/mcp.ts`: Convex Actions - サーバーサイドMCP通信機能

### 成果物
- `packages/web-ui/lib/mcp/extended-convex-client.ts` - 認証無効化対応のExtendedConvexMCPClient

### 影響範囲
- MCPTesterコンポーネントで使用される新しいクライアント

## 実装要件

### 【必須制約】認証レイヤーの抽象化
- **認証スキップフラグ**: `skipAuthentication?: boolean` オプション
- **テスト用ユーザーID**: 認証スキップ時に使用する `testUserId?: string`
- **将来拡張性**: Firebase認証を後から追加しやすい設計

### 技術仕様
```typescript
// 拡張設定インターフェース
interface ExtendedConvexMCPClientConfig extends MCPClientConfig {
  skipAuthentication?: boolean;
  testUserId?: string;
}

// ExtendedConvexMCPClient実装例
export class ExtendedConvexMCPClient extends ConvexMCPClient {
  private config: ExtendedConvexMCPClientConfig;
  
  constructor(config: ExtendedConvexMCPClientConfig = {}) {
    super(config);
    this.config = {
      skipAuthentication: false,
      testUserId: 'test-user',
      ...config
    };
  }
  
  // 認証処理をオーバーライド
  protected async ensureAuthentication(): Promise<void> {
    if (this.config.skipAuthentication) {
      this.userId = this.config.testUserId || 'test-user';
      return;
    }
    // 既存の認証処理を呼び出し
    return super.ensureAuthentication();
  }
}
```

### 設計パターン
**参考**: `packages/web-ui/lib/mcp/convex-client.ts`の`ConvexMCPClient`パターンを踏襲
**理由**: 既存のConvex統合パターンとの一貫性を保持しつつ、認証レイヤーのみを抽象化

## 実装ガイド

### ステップ1: ExtendedConvexMCPClientConfig定義
```typescript
import type { MCPClientConfig } from '@/types/mcp';

interface ExtendedConvexMCPClientConfig extends MCPClientConfig {
  skipAuthentication?: boolean;
  testUserId?: string;
}
```

### ステップ2: クラス拡張と認証メソッドオーバーライド
```typescript
import { ConvexMCPClient } from './convex-client';

export class ExtendedConvexMCPClient extends ConvexMCPClient {
  private extendedConfig: ExtendedConvexMCPClientConfig;
  
  constructor(config: ExtendedConvexMCPClientConfig = {}) {
    super(config);
    this.extendedConfig = {
      skipAuthentication: false,
      testUserId: 'test-user',
      ...config
    };
  }
  
  protected async ensureAuthentication(): Promise<void> {
    if (this.extendedConfig.skipAuthentication) {
      this.userId = this.extendedConfig.testUserId || 'test-user';
      return;
    }
    
    // 既存の認証処理
    return super.ensureAuthentication();
  }
}
```

### ステップ3: エクスポートとReact Hook作成
```typescript
// React Hook for using ExtendedConvexMCPClient
export function useExtendedConvexMCPClient(config?: ExtendedConvexMCPClientConfig) {
  const client = new ExtendedConvexMCPClient(config);
  
  // 既存のConvex hooks初期化パターンを踏襲
  client.initializeConvexHooks({
    action: useAction(api.mcp.handleMCPRequest),
    mutation: useMutation(api.mcp.createMCPSession),
    query: useQuery
  });
  
  return client;
}
```

## 検証基準

### 機能検証
- [ ] 認証スキップモードでMCPセッション作成が成功する
- [ ] 認証有効モードで既存の認証フローが動作する
- [ ] testUserIdが正しく設定される

### 技術検証
- [ ] TypeScript strict modeでコンパイル成功
- [ ] ESLintエラー0件
- [ ] 既存のConvexMCPClientとの互換性維持

### 統合検証
- [ ] 既存のconvex-client.tsファイルとの共存
- [ ] ConvexAction(`api.mcp.handleMCPRequest`)との正常な通信

## 実装例
```typescript
import { useMutation, useQuery, useAction } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { ConvexMCPClient } from './convex-client';
import type { MCPClientConfig } from '@/types/mcp';
import { getIdToken } from 'firebase/auth';
import { auth } from '@/lib/config/firebase';

interface ExtendedConvexMCPClientConfig extends MCPClientConfig {
  skipAuthentication?: boolean;
  testUserId?: string;
}

export class ExtendedConvexMCPClient extends ConvexMCPClient {
  private extendedConfig: ExtendedConvexMCPClientConfig;

  constructor(config: ExtendedConvexMCPClientConfig = {}) {
    super(config);
    this.extendedConfig = {
      skipAuthentication: false,
      testUserId: 'test-user',
      ...config
    };
  }

  protected async ensureAuthentication(): Promise<void> {
    if (this.extendedConfig.skipAuthentication) {
      this.userId = this.extendedConfig.testUserId || 'test-user';
      return;
    }
    
    // 既存の認証処理
    const user = auth.currentUser;
    if (!user) {
      throw new Error('User not authenticated');
    }
    
    this.userId = user.uid;
    
    try {
      await getIdToken(user);
    } catch (error) {
      throw new Error('Failed to get authentication token');
    }
  }
}

export function useExtendedConvexMCPClient(config?: ExtendedConvexMCPClientConfig) {
  const client = new ExtendedConvexMCPClient(config);
  
  client.initializeConvexHooks({
    action: useAction(api.mcp.handleMCPRequest),
    mutation: useMutation(api.mcp.createMCPSession),
    query: useQuery
  });
  
  return client;
}
```

## 注意事項

### 【厳守事項】
- 既存のConvexMCPClientの動作を変更しないこと
- 認証スキップは設定による明示的な有効化のみ
- 既存のconvex-client.tsファイルを変更しないこと

### 【推奨事項】
- 型安全性を最優先に実装
- 既存のConvex統合パターンとの一貫性保持
- エラーハンドリングの適切な実装

### 【禁止事項】
- Firebase認証の完全削除
- 既存のConvexMCPClientの破壊的変更
- 設計書に記載されていない機能追加

## 参考情報
- `packages/web-ui/lib/mcp/convex-client.ts`: 拡張元のクラス
- `convex/mcp.ts`: サーバーサイドMCP Actions
- `@/types/mcp`: MCP関連の型定義 