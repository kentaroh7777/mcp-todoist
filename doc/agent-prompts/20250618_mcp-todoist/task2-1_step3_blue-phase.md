# Task 2-1 Step 3: WebUI認証・アカウント管理 (Blue Phase)

## 概要
Green Phaseで実装した基本機能を改善し、UX向上・セキュリティ強化・エラーハンドリング改善・統合テスト追加を行います。TDDのBlue Phaseとして、品質向上とリファクタリングを実施します。

## 依存関係
- 前Phase: Task 2-1 Step 2 (Green Phase) - 基本実装完了、29件テスト成功
- 本実装の元となる設計書: doc/design/mcp-todoist.md

### 前提条件
- Firebase Auth統合とマルチアカウント管理が実装済み
- 29件のテストがすべて成功していること
- AuthManager・AccountManager・UIコンポーネントが動作すること

### 成果物
- 統合テスト追加 (`test/integration/auth-flow.integration.test.ts`)
- エラーハンドリング強化
- セキュリティ機能追加
- UX/UI改善
- パフォーマンス最適化

### 影響範囲
- packages/web-ui/test/integration/ - 統合テスト追加
- packages/web-ui/lib/auth/ - セキュリティ・エラーハンドリング強化
- packages/web-ui/components/auth/ - UX改善
- packages/web-ui/lib/config/ - 設定強化

## 実装要件

### 【必須制約】TDD Blue Phase厳守
- **品質優先**: 既存機能を壊すことなく品質向上
- **リファクタリング推奨**: コード構造の改善
- **テスト追加**: 統合テストとエッジケーステスト追加
- **既存テスト維持**: 既存29件のテストはすべて成功し続けること

### 技術仕様

#### 統合テスト追加
```typescript
// test/integration/auth-flow.integration.test.ts
describe('認証フロー統合テスト', () => {
  // サインアップ → アカウント追加 → 切り替え のフルフロー
  // エラー発生時のリカバリー
  // マルチアカウント環境での競合状態テスト
  // localStorage永続化テスト
  // Firebase Auth接続エラーテスト
});
```

#### セキュリティ強化
```typescript
// lib/auth/security.ts
export class SecurityManager {
  // パスワード強度検証強化
  // セッション管理
  // トークン有効期限管理
  // 不正アクセス検知
  // データ暗号化
}
```

#### エラーハンドリング強化
```typescript
// lib/auth/error-handler.ts
export class AuthErrorHandler {
  // Firebase Auth特有のエラー分類
  // ユーザーフレンドリーなエラーメッセージ
  // エラー復旧機能
  // ログ記録
}
```

#### UX/UI改善
```typescript
// components/auth/improvements/
// - ローディング状態の改善
// - エラー表示の改善
// - フォームバリデーションの改善
// - アクセシビリティ対応
// - レスポンシブデザイン改善
```

## 実装ガイド

### ステップ1: 統合テスト追加
```typescript
// test/integration/auth-flow.integration.test.ts
import { AuthManager } from '@/lib/auth/auth-manager';
import { AccountManager } from '@/lib/auth/account-manager';

describe('認証フロー統合テスト', () => {
  let authManager: AuthManager;
  let accountManager: AccountManager;

  beforeEach(() => {
    authManager = new AuthManager();
    accountManager = new AccountManager();
    // テスト用のクリーンアップ
  });

  describe('完全な認証フロー', () => {
    it('サインアップ → アカウント追加 → 切り替え フローが動作する', async () => {
      // 1. 新規ユーザー作成
      const user1 = await authManager.signUpWithEmail('user1@example.com', 'password123');
      expect(user1.uid).toBeDefined();

      // 2. アカウント追加
      const account1 = await accountManager.addAccount(user1, 'todoist_token_1');
      expect(account1.user.uid).toBe(user1.uid);

      // 3. 2つ目のユーザー作成
      const user2 = await authManager.signUpWithEmail('user2@example.com', 'password456');
      const account2 = await accountManager.addAccount(user2, 'todoist_token_2');

      // 4. アカウント切り替え
      await accountManager.switchAccount(account2.id);
      const currentAccount = accountManager.getCurrentAccount();
      expect(currentAccount?.id).toBe(account2.id);

      // 5. 永続化確認
      const newAccountManager = new AccountManager();
      expect(newAccountManager.getCurrentAccount()?.id).toBe(account2.id);
    });

    it('エラー発生時のリカバリーが動作する', async () => {
      // 無効なメールでサインアップ試行
      await expect(authManager.signUpWithEmail('invalid-email', 'password'))
        .rejects.toThrow('Invalid email format');

      // 正常なメールでリトライ
      const user = await authManager.signUpWithEmail('valid@example.com', 'password123');
      expect(user.uid).toBeDefined();
    });

    it('localStorage破損時の復旧が動作する', async () => {
      // アカウント作成
      const user = await authManager.signUpWithEmail('test@example.com', 'password123');
      const account = await accountManager.addAccount(user, 'token');

      // localStorage破損をシミュレート
      localStorage.setItem('mcp-todoist-accounts', 'invalid-json');

      // 新しいAccountManagerで復旧テスト
      const newAccountManager = new AccountManager();
      expect(newAccountManager.listAccounts()).toEqual([]);
    });
  });

  describe('並行処理テスト', () => {
    it('複数のアカウント操作が並行して動作する', async () => {
      const user1 = await authManager.signUpWithEmail('user1@example.com', 'password1');
      const user2 = await authManager.signUpWithEmail('user2@example.com', 'password2');

      // 並行してアカウント追加
      const [account1, account2] = await Promise.all([
        accountManager.addAccount(user1, 'token1'),
        accountManager.addAccount(user2, 'token2')
      ]);

      expect(account1.id).not.toBe(account2.id);
      expect(accountManager.listAccounts()).toHaveLength(2);
    });
  });
});
```

### ステップ2: セキュリティ強化
```typescript
// lib/auth/security.ts
export class SecurityManager {
  private static readonly MIN_PASSWORD_LENGTH = 8;
  private static readonly PASSWORD_COMPLEXITY_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/;

  static validatePasswordStrength(password: string): {
    isValid: boolean;
    issues: string[];
  } {
    const issues: string[] = [];

    if (password.length < this.MIN_PASSWORD_LENGTH) {
      issues.push(`Password must be at least ${this.MIN_PASSWORD_LENGTH} characters`);
    }

    if (!this.PASSWORD_COMPLEXITY_REGEX.test(password)) {
      issues.push('Password must contain uppercase, lowercase, number, and special character');
    }

    return {
      isValid: issues.length === 0,
      issues
    };
  }

  static encryptSensitiveData(data: string): string {
    // 簡単な暗号化（実装では適切な暗号化ライブラリを使用）
    return btoa(data);
  }

  static decryptSensitiveData(encryptedData: string): string {
    try {
      return atob(encryptedData);
    } catch {
      throw new Error('Failed to decrypt data');
    }
  }

  static sanitizeUserInput(input: string): string {
    return input.trim().toLowerCase();
  }
}
```

### ステップ3: エラーハンドリング強化
```typescript
// lib/auth/error-handler.ts
export enum AuthErrorType {
  INVALID_EMAIL = 'INVALID_EMAIL',
  WEAK_PASSWORD = 'WEAK_PASSWORD',
  USER_NOT_FOUND = 'USER_NOT_FOUND',
  WRONG_PASSWORD = 'WRONG_PASSWORD',
  EMAIL_ALREADY_IN_USE = 'EMAIL_ALREADY_IN_USE',
  NETWORK_ERROR = 'NETWORK_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

export interface AuthError {
  type: AuthErrorType;
  message: string;
  originalError?: unknown;
  timestamp: Date;
}

export class AuthErrorHandler {
  static handleFirebaseError(error: any): AuthError {
    const timestamp = new Date();

    switch (error.code) {
      case 'auth/user-not-found':
        return {
          type: AuthErrorType.USER_NOT_FOUND,
          message: 'アカウントが見つかりません。メールアドレスを確認してください。',
          originalError: error,
          timestamp
        };

      case 'auth/wrong-password':
        return {
          type: AuthErrorType.WRONG_PASSWORD,
          message: 'パスワードが正しくありません。',
          originalError: error,
          timestamp
        };

      case 'auth/email-already-in-use':
        return {
          type: AuthErrorType.EMAIL_ALREADY_IN_USE,
          message: 'このメールアドレスは既に使用されています。',
          originalError: error,
          timestamp
        };

      case 'auth/network-request-failed':
        return {
          type: AuthErrorType.NETWORK_ERROR,
          message: 'ネットワークエラーが発生しました。接続を確認してください。',
          originalError: error,
          timestamp
        };

      default:
        return {
          type: AuthErrorType.UNKNOWN_ERROR,
          message: '予期しないエラーが発生しました。',
          originalError: error,
          timestamp
        };
    }
  }

  static logError(error: AuthError): void {
    console.error('[Auth Error]', {
      type: error.type,
      message: error.message,
      timestamp: error.timestamp,
      originalError: error.originalError
    });
  }
}
```

### ステップ4: UX改善
```typescript
// components/auth/hooks/useAuthForm.ts
export function useAuthForm() {
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = async (
    submitFn: () => Promise<void>,
    onSuccess?: () => void,
    onError?: (error: AuthError) => void
  ) => {
    setLoading(true);
    setErrors({});

    try {
      await submitFn();
      onSuccess?.();
    } catch (error) {
      const authError = AuthErrorHandler.handleFirebaseError(error);
      AuthErrorHandler.logError(authError);
      
      setErrors({ general: authError.message });
      onError?.(authError);
    } finally {
      setLoading(false);
    }
  };

  return { loading, errors, handleSubmit };
}
```

### ステップ5: パフォーマンス最適化
```typescript
// lib/auth/cache.ts
export class AuthCache {
  private static cache = new Map<string, any>();
  private static readonly CACHE_TTL = 5 * 60 * 1000; // 5分

  static set(key: string, value: any): void {
    this.cache.set(key, {
      value,
      timestamp: Date.now()
    });
  }

  static get(key: string): any | null {
    const item = this.cache.get(key);
    if (!item) return null;

    if (Date.now() - item.timestamp > this.CACHE_TTL) {
      this.cache.delete(key);
      return null;
    }

    return item.value;
  }

  static clear(): void {
    this.cache.clear();
  }
}
```

## 検証基準

### 機能検証
- [ ] 既存29件のテストがすべて成功し続ける
- [ ] 統合テストが10件以上追加される
- [ ] エラーハンドリングが改善される
- [ ] セキュリティ機能が追加される

### 技術検証
- [ ] TypeScript strict modeでコンパイルエラーがない
- [ ] ESLintエラーがない
- [ ] npm test で全テスト成功（35件以上）
- [ ] npm run build でビルド成功

### 品質検証
- [ ] コードカバレッジの向上
- [ ] パフォーマンスの改善
- [ ] ユーザビリティの向上
- [ ] アクセシビリティの改善

## 注意事項

### 【厳守事項】
- **既存機能維持**: 既存の29件のテストは成功し続けること
- **品質優先**: 機能追加よりも品質向上を優先
- **互換性維持**: 既存のAPIインターフェースを変更しない

### 【推奨事項】
- パフォーマンス計測と改善
- ユーザビリティテストの実施
- セキュリティレビューの実施
- コードレビューによる品質確認

### 【実装ポイント】
- 段階的リファクタリング
- テスト駆動での品質改善
- ユーザーフィードバックに基づく改善
- セキュリティベストプラクティスの適用

## 参考情報
- 設計書: doc/design/mcp-todoist.md の Task 2-1
- Firebase Auth Security: https://firebase.google.com/docs/auth/web/auth-state-persistence
- Next.js Performance: https://nextjs.org/docs/app/building-your-application/optimizing/performance
- React Testing Library: https://testing-library.com/docs/react-testing-library/intro/ 