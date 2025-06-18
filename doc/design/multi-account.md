# マルチアカウント設計

## 概要

ユーザーが複数のTodoistアカウントを管理し、アカウント間でのデータ分離とセキュアな操作を実現する機能です。

## 要件

### 機能要件
- 複数Todoistアカウントの登録・管理
- アカウント別設定管理
- 動的なアカウント切り替え
- アカウント別データ分離
- 一括操作（複数アカウントへの同時実行）

### 非機能要件
- セキュリティ: アカウント間データ漏洩防止
- パフォーマンス: アカウント切り替えの高速化
- 可用性: 一部アカウントエラー時の継続動作
- 拡張性: アカウント数制限の回避

## データモデル

### User（ユーザー）
```typescript
interface User {
  id: string;                // UUID
  email: string;             // ユニークメールアドレス
  name: string;              // 表示名
  passwordHash: string;      // ハッシュ化パスワード
  createdAt: Date;
  updatedAt: Date;
}
```

### Account（アカウント）
```typescript
interface Account {
  id: string;                // UUID
  userId: string;            // User.id への外部キー
  name: string;              // アカウント表示名
  provider: 'todoist';       // プロバイダー種別
  apiToken: string;          // 暗号化済みAPIトークン
  settings: AccountSettings; // アカウント別設定
  isActive: boolean;         // アクティブ状態
  lastSyncAt?: Date;         // 最終同期日時
  createdAt: Date;
  updatedAt: Date;
}
```

### AccountSettings（アカウント設定）
```typescript
interface AccountSettings {
  timezone: string;          // タイムゾーン (Asia/Tokyo)
  language: string;          // 言語 (ja, en)
  dateFormat: string;        // 日付フォーマット
  weekStart: number;         // 週開始日 (0=Sunday, 1=Monday)
  syncEnabled: boolean;      // 自動同期有効化
  syncInterval: number;      // 同期間隔（分）
  notifications: {
    email: boolean;
    push: boolean;
  };
}
```

### UserSession（セッション）
```typescript
interface UserSession {
  id: string;
  userId: string;
  activeAccountId?: string;  // 現在選択中のアカウント
  accountIds: string[];      // アクセス可能アカウント一覧
  token: string;             // JWTトークン
  refreshToken: string;      // リフレッシュトークン
  expiresAt: Date;
  createdAt: Date;
}
```

## アカウント管理機能

### 1. アカウント登録
```typescript
interface CreateAccountRequest {
  name: string;              // アカウント名
  apiToken: string;          // Todoist APIトークン
  settings?: Partial<AccountSettings>;
}

// 処理フロー
1. APIトークンの有効性検証
2. トークンの暗号化保存
3. アカウント情報の登録
4. 初期同期の実行
```

### 2. アカウント切り替え
```typescript
interface SwitchAccountRequest {
  accountId: string;
}

// 処理フロー
1. ユーザーのアカウント所有権確認
2. セッション情報の更新
3. アカウントコンテキストの設定
4. 新しいJWTトークンの発行
```

### 3. アカウント設定更新
```typescript
interface UpdateAccountRequest {
  accountId: string;
  name?: string;
  apiToken?: string;
  settings?: Partial<AccountSettings>;
}

// 処理フロー
1. 所有権確認
2. APIトークン更新時の再検証
3. 設定値のバリデーション
4. 暗号化保存
```

## セキュリティ設計

### データ分離
```typescript
// MCP操作時のコンテキスト確認
interface OperationContext {
  userId: string;
  accountId: string;
  permissions: Permission[];
}

// データアクセス制御
function validateAccess(context: OperationContext, resource: string) {
  // 1. ユーザー認証確認
  // 2. アカウント所有権確認
  // 3. リソースアクセス権限確認
  // 4. アカウント間データ漏洩防止
}
```

### APIトークン管理
```typescript
class TokenManager {
  // AES-256-GCM による暗号化
  encrypt(token: string): string;
  decrypt(encryptedToken: string): string;
  
  // トークンローテーション
  rotateToken(accountId: string, newToken: string): Promise<void>;
  
  // トークン検証
  validateToken(accountId: string): Promise<boolean>;
}
```

### 権限管理
```typescript
enum Permission {
  READ_TASKS = 'tasks:read',
  WRITE_TASKS = 'tasks:write',
  READ_PROJECTS = 'projects:read',
  WRITE_PROJECTS = 'projects:write',
  MANAGE_ACCOUNTS = 'accounts:manage',
  ADMIN = 'admin'
}

class PermissionManager {
  checkPermission(
    userId: string,
    accountId: string,
    permission: Permission
  ): Promise<boolean>;
  
  getAccountPermissions(
    userId: string,
    accountId: string
  ): Promise<Permission[]>;
}
```

## MCP操作における対応

### 1. コンテキスト管理
```typescript
interface MCPRequestContext {
  userId: string;
  accountId?: string;        // 未指定時はactiveAccount使用
  permissions: Permission[];
}

class MCPContextManager {
  extractContext(request: MCPRequest): Promise<MCPRequestContext>;
  validateContext(context: MCPRequestContext): Promise<boolean>;
  setAccountContext(accountId: string): Promise<void>;
}
```

### 2. ツール実行時の処理
```typescript
// タスク作成ツールの例
async function createTask(
  params: CreateTaskParams,
  context: MCPRequestContext
): Promise<MCPResponse> {
  
  // 1. アカウントコンテキスト設定
  const account = await getAccount(context.userId, context.accountId);
  
  // 2. 権限確認
  await checkPermission(context, Permission.WRITE_TASKS);
  
  // 3. APIクライアント初期化
  const client = new TodoistClient(account.apiToken);
  
  // 4. 操作実行
  const task = await client.createTask(params);
  
  // 5. ローカルデータ更新
  await updateLocalData(account.id, task);
  
  return { success: true, data: task };
}
```

### 3. 一括操作サポート
```typescript
interface BulkOperationRequest {
  accountIds: string[];      // 対象アカウント
  operation: string;         // 操作種別
  params: any;              // 操作パラメータ
}

async function executeBulkOperation(
  request: BulkOperationRequest,
  context: MCPRequestContext
): Promise<BulkOperationResult> {
  
  const results = await Promise.allSettled(
    request.accountIds.map(async (accountId) => {
      const accountContext = { ...context, accountId };
      return await executeOperation(request.operation, request.params, accountContext);
    })
  );
  
  return {
    total: request.accountIds.length,
    successful: results.filter(r => r.status === 'fulfilled').length,
    failed: results.filter(r => r.status === 'rejected').length,
    results: results
  };
}
```

## UI設計

### アカウント選択UI
- ヘッダーのアカウント切り替えドロップダウン
- アカウント別の色分け表示
- アクティブアカウントの明示

### アカウント管理画面
- アカウント一覧表示
- 新規アカウント追加フォーム
- アカウント設定編集
- APIトークン管理

### 一括操作UI
- 複数アカウント選択チェックボックス
- 一括操作ボタン
- 進捗表示とエラーハンドリング

## エラーハンドリング

### アカウントレベルエラー
```typescript
enum AccountError {
  INVALID_TOKEN = 'INVALID_TOKEN',
  RATE_LIMITED = 'RATE_LIMITED',
  ACCOUNT_SUSPENDED = 'ACCOUNT_SUSPENDED',
  NETWORK_ERROR = 'NETWORK_ERROR'
}

class AccountErrorHandler {
  async handleError(
    accountId: string,
    error: AccountError
  ): Promise<ErrorResolution> {
    
    switch (error) {
      case AccountError.INVALID_TOKEN:
        // トークン無効化、ユーザー通知
        await invalidateAccount(accountId);
        break;
        
      case AccountError.RATE_LIMITED:
        // レート制限回避、リトライ処理
        await scheduleRetry(accountId);
        break;
        
      case AccountError.NETWORK_ERROR:
        // 一時的エラー、自動リトライ
        await retryWithBackoff(accountId);
        break;
    }
  }
}
```

## パフォーマンス最適化

### キャッシュ戦略
- アカウント情報のRedisキャッシュ
- APIレスポンスの短期キャッシュ
- 設定値のメモリキャッシュ

### 同期最適化
- 差分同期によるデータ転送量削減
- 並列同期による処理時間短縮
- 増分バックアップ

### データベース最適化
- アカウントIDによるパーティショニング
- 複合インデックスの活用
- 読み取りレプリカの利用 