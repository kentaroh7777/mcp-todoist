# Task 2-1 Step 2: WebUI認証・アカウント管理 (Green Phase)

## 概要
Red Phaseで作成したテストを通すため、Firebase Auth統合とマルチアカウント管理の実装を行います。TDDのGreen Phaseとして、最小限の実装ですべてのテストを通すことを目標とします。

## 依存関係
- 前Phase: Task 2-1 Step 1 (Red Phase) - テストケース作成完了
- 本実装の元となる設計書: doc/design/mcp-todoist.md

### 前提条件
- packages/web-ui/test/ 内のテストファイルが存在すること
- Firebase Auth・テスト依存関係がインストール済みであること
- 29件のテストが現在失敗していること

### 成果物
- packages/web-ui/lib/auth/auth-manager.ts - AuthManager実装
- packages/web-ui/lib/auth/account-manager.ts - AccountManager実装
- packages/web-ui/lib/auth/types.ts - 認証関連型定義
- packages/web-ui/components/auth/SignInForm.tsx - サインインフォーム
- packages/web-ui/components/auth/SignUpForm.tsx - サインアップフォーム
- packages/web-ui/components/auth/AccountSwitcher.tsx - アカウント切り替え
- packages/web-ui/components/auth/AuthProvider.tsx - 認証プロバイダー
- packages/web-ui/lib/config/firebase.ts - Firebase設定

### 影響範囲
- packages/web-ui/lib/ - 認証ライブラリ実装
- packages/web-ui/components/ - 認証UIコンポーネント実装

## 実装要件

### 【必須制約】TDD Green Phase厳守
- **テスト優先**: 既存のテストケースをすべて通すことが最優先
- **最小実装**: テストを通す最小限の実装に留める
- **リファクタリング禁止**: Green Phaseではリファクタリングしない

### 技術仕様

#### 型定義 (lib/auth/types.ts)
```typescript
export interface User {
  uid: string;
  email: string | null;
  displayName: string | null;
}

export interface Account {
  id: string;
  user: User;
  todoistToken: string;
  displayName: string;
  createdAt: Date;
  isActive: boolean;
}

export interface AccountData {
  preferences: Record<string, any>;
  lastSync: Date | null;
  cacheData: Record<string, any>;
}
```

#### AuthManager実装仕様
```typescript
// lib/auth/auth-manager.ts
export class AuthManager {
  // Firebase Auth統合
  async signInWithEmail(email: string, password: string): Promise<User>;
  async signUpWithEmail(email: string, password: string): Promise<User>;
  async signOut(): Promise<void>;
  getCurrentUser(): User | null;
  onAuthStateChanged(callback: (user: User | null) => void): () => void;
  
  // トークン管理
  async getIdToken(): Promise<string>;
  async refreshToken(): Promise<string>;
  
  // バリデーション
  validateEmail(email: string): boolean;
  validatePassword(password: string): boolean;
}
```

#### AccountManager実装仕様
```typescript
// lib/auth/account-manager.ts
export class AccountManager {
  // マルチアカウント管理
  async addAccount(user: User, todoistToken: string): Promise<Account>;
  async removeAccount(accountId: string): Promise<void>;
  async switchAccount(accountId: string): Promise<void>;
  getCurrentAccount(): Account | null;
  listAccounts(): Account[];
  
  // データ分離
  async getAccountData(accountId: string): Promise<AccountData>;
  async saveAccountData(accountId: string, data: AccountData): Promise<void>;
}
```

#### UIコンポーネント実装仕様
```typescript
// SignInForm: メール・パスワード入力、サインイン処理
// SignUpForm: 新規アカウント作成、パスワード確認
// AccountSwitcher: アカウント一覧表示、切り替え機能
// AuthProvider: Context APIによる認証状態管理
```

### 設計パターン
**参考**: Firebase Auth + Context API + localStorage パターン
**理由**: Next.js 14 App Routerとの親和性、クライアントサイド認証状態管理

## 実装ガイド

### ステップ1: Firebase設定
```typescript
// lib/config/firebase.ts
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  // 環境変数から設定を読み込み
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'demo-key',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || 'demo.firebaseapp.com',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'demo-project',
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
```

### ステップ2: 型定義実装
```typescript
// lib/auth/types.ts
export interface User {
  uid: string;
  email: string | null;
  displayName: string | null;
}

export interface Account {
  id: string;
  user: User;
  todoistToken: string;
  displayName: string;
  createdAt: Date;
  isActive: boolean;
}

export interface AccountData {
  preferences: Record<string, any>;
  lastSync: Date | null;
  cacheData: Record<string, any>;
}
```

### ステップ3: AuthManager実装
テストケースの要求に合わせて最小実装

### ステップ4: AccountManager実装
localStorage使用、マルチアカウント管理実装

### ステップ5: UIコンポーネント実装
Ant Design使用、テストケースに対応

## 検証基準

### 機能検証
- [ ] 全29件のテストケースが成功する
- [ ] Firebase Auth統合が正常動作する
- [ ] マルチアカウント管理が動作する
- [ ] UIコンポーネントが期待通りレンダリングされる

### 技術検証
- [ ] TypeScript strict modeでコンパイルエラーがない
- [ ] ESLintエラーがない
- [ ] npm test で全テスト成功
- [ ] npm run build でビルド成功

### TDD検証
- [ ] **すべてのテストが成功する**
- [ ] 実装が最小限に留められている
- [ ] テストケースを満たす必要最小限の機能のみ実装

## 注意事項

### 【厳守事項】
- **テスト優先**: 既存テストを通すことが最優先
- **最小実装**: テストを通す最小限の実装のみ
- **リファクタリング禁止**: Green Phaseでは構造改善しない
- **テスト修正禁止**: 既存のテストケースを変更しない

### 【推奨事項】
- エラーハンドリングは基本的なもののみ
- パフォーマンス最適化は後回し
- ユーザビリティ向上は後回し
- セキュリティは基本レベル

### 【実装ポイント】
- localStorage使用でアカウント永続化
- Context APIで認証状態管理
- Ant Designコンポーネント活用
- 'use client'ディレクティブ適切配置

## 参考情報
- 設計書: doc/design/mcp-todoist.md の Task 2-1
- Firebase Auth: https://firebase.google.com/docs/auth/web/start
- Next.js 14 Client Components: https://nextjs.org/docs/app/building-your-application/rendering/client-components
- Ant Design Components: https://ant.design/components/overview 