# Task 2-1 Step 1: WebUI認証・アカウント管理 (Red Phase)

## 概要
WebUI側でFirebase Auth統合とマルチアカウント管理のテストを先行実装します。TDDのRed Phaseとして、実装前にテストケースを作成し、すべてのテストが失敗することを確認します。

## 依存関係
- 本実装の元となる設計書: doc/design/mcp-todoist.md

### 前提条件
- packages/web-ui のNext.js基盤が存在すること
- Firebase Auth設定の準備ができていること

### 成果物
- `packages/web-ui/test/auth.test.ts` - AuthManager、AccountManagerのテスト
- `packages/web-ui/test/components/auth.test.tsx` - 認証UIコンポーネントのテスト
- `packages/web-ui/vitest.config.ts` - テスト設定ファイル
- 必要な依存関係の追加

### 影響範囲
- packages/web-ui/package.json - テスト関連依存関係の追加
- packages/web-ui/lib/* - 認証ライブラリの設定準備

## 実装要件

### 【必須制約】TDD Red Phase厳守
- **実装禁止**: テスト対象となるコンポーネント・ライブラリは一切実装しない
- **テスト先行**: テストケースのみを作成し、すべてが失敗することを確認
- **具体的テスト**: 具体的な仕様をテストコードで表現

### 技術仕様

#### AuthManager テスト仕様
```typescript
// packages/web-ui/test/auth.test.ts に実装
interface AuthManager {
  // Firebase Auth統合
  signInWithEmail(email: string, password: string): Promise<User>;
  signUpWithEmail(email: string, password: string): Promise<User>;
  signOut(): Promise<void>;
  getCurrentUser(): User | null;
  onAuthStateChanged(callback: (user: User | null) => void): () => void;
  
  // トークン管理
  getIdToken(): Promise<string>;
  refreshToken(): Promise<string>;
}

interface AccountManager {
  // マルチアカウント管理
  addAccount(user: User, todoistToken: string): Promise<Account>;
  removeAccount(accountId: string): Promise<void>;
  switchAccount(accountId: string): Promise<void>;
  getCurrentAccount(): Account | null;
  listAccounts(): Account[];
  
  // データ分離
  getAccountData(accountId: string): Promise<AccountData>;
  saveAccountData(accountId: string, data: AccountData): Promise<void>;
}
```

#### 認証UIコンポーネント テスト仕様
```typescript
// packages/web-ui/test/components/auth.test.tsx に実装
// テスト対象コンポーネント：
// - SignInForm: メール・パスワードでのサインイン
// - SignUpForm: 新規アカウント作成
// - AccountSwitcher: アカウント切り替えUI
// - AuthProvider: 認証状態管理プロバイダー
```

### 設計パターン
**参考**: React Testing Library + Vitest パターンを使用
**理由**: Next.js 14 App Routerとの親和性が高く、コンポーネントテストに適している

## 実装ガイド

### ステップ1: 依存関係の追加
```bash
npm install -D vitest @vitejs/plugin-react @testing-library/react @testing-library/jest-dom @testing-library/user-event
npm install firebase
```

### ステップ2: vitest.config.ts作成
```typescript
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./test/setup.ts'],
    globals: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
})
```

### ステップ3: AuthManager テストの作成
```typescript
// packages/web-ui/test/auth.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

describe('AuthManager', () => {
  describe('Firebase Auth統合', () => {
    it('メール・パスワードでサインインできる', async () => {
      // テスト実装 - 実装がないため失敗する
    })
    
    it('新規アカウントを作成できる', async () => {
      // テスト実装 - 実装がないため失敗する
    })
    
    it('サインアウトできる', async () => {
      // テスト実装 - 実装がないため失敗する
    })
    
    it('認証状態の変更を監視できる', async () => {
      // テスト実装 - 実装がないため失敗する
    })
  })
  
  describe('トークン管理', () => {
    it('IDトークンを取得できる', async () => {
      // テスト実装 - 実装がないため失敗する
    })
    
    it('トークンをリフレッシュできる', async () => {
      // テスト実装 - 実装がないため失敗する
    })
  })
})

describe('AccountManager', () => {
  describe('マルチアカウント管理', () => {
    it('新しいアカウントを追加できる', async () => {
      // テスト実装 - 実装がないため失敗する
    })
    
    it('アカウントを削除できる', async () => {
      // テスト実装 - 実装がないため失敗する
    })
    
    it('アカウントを切り替えできる', async () => {
      // テスト実装 - 実装がないため失敗する
    })
    
    it('現在のアカウントを取得できる', () => {
      // テスト実装 - 実装がないため失敗する
    })
    
    it('全アカウントをリストできる', () => {
      // テスト実装 - 実装がないため失敗する
    })
  })
  
  describe('データ分離', () => {
    it('アカウント固有のデータを取得できる', async () => {
      // テスト実装 - 実装がないため失敗する
    })
    
    it('アカウント固有のデータを保存できる', async () => {
      // テスト実装 - 実装がないため失敗する
    })
  })
  
  describe('バリデーション', () => {
    it('不正なメールアドレスでエラーを出す', async () => {
      // テスト実装 - 実装がないため失敗する
    })
    
    it('弱いパスワードでエラーを出す', async () => {
      // テスト実装 - 実装がないため失敗する
    })
    
    it('重複するアカウント追加でエラーを出す', async () => {
      // テスト実装 - 実装がないため失敗する
    })
  })
})
```

### ステップ4: UIコンポーネント テストの作成
```typescript
// packages/web-ui/test/components/auth.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

describe('SignInForm', () => {
  it('メールとパスワード入力フィールドが表示される', () => {
    // テスト実装 - コンポーネントがないため失敗する
  })
  
  it('フォーム送信時にサインイン処理が呼ばれる', async () => {
    // テスト実装 - コンポーネントがないため失敗する
  })
  
  it('バリデーションエラーが表示される', async () => {
    // テスト実装 - コンポーネントがないため失敗する
  })
  
  it('ローディング状態が表示される', async () => {
    // テスト実装 - コンポーネントがないため失敗する
  })
})

describe('SignUpForm', () => {
  it('必要な入力フィールドが表示される', () => {
    // テスト実装 - コンポーネントがないため失敗する
  })
  
  it('パスワード確認機能が動作する', async () => {
    // テスト実装 - コンポーネントがないため失敗する
  })
  
  it('アカウント作成成功時にリダイレクトする', async () => {
    // テスト実装 - コンポーネントがないため失敗する
  })
})

describe('AccountSwitcher', () => {
  it('登録済みアカウント一覧が表示される', () => {
    // テスト実装 - コンポーネントがないため失敗する
  })
  
  it('アカウント選択時に切り替え処理が呼ばれる', async () => {
    // テスト実装 - コンポーネントがないため失敗する
  })
  
  it('新しいアカウント追加ボタンが表示される', () => {
    // テスト実装 - コンポーネントがないため失敗する
  })
})

describe('AuthProvider', () => {
  it('認証状態を子コンポーネントに提供する', () => {
    // テスト実装 - プロバイダーがないため失敗する
  })
  
  it('ログイン状態変更時に再レンダリングされる', async () => {
    // テスト実装 - プロバイダーがないため失敗する
  })
})
```

## 検証基準

### 機能検証
- [ ] すべてのテストケースが作成されている
- [ ] テスト実行時にすべてのテストが失敗する（実装がないため）
- [ ] テストケースが具体的な仕様を表現している
- [ ] エラーメッセージが「モジュールが見つからない」等の期待された内容

### 技術検証
- [ ] vitest.config.ts が正しく設定されている
- [ ] TypeScript strict modeでコンパイルエラーがない
- [ ] テスト用依存関係が正しくインストールされている
- [ ] `npm test` コマンドでテストが実行できる

### TDD検証
- [ ] **実装ファイルが一切作成されていない**
- [ ] テストが具体的な機能要件を表現している
- [ ] テスト失敗の理由が明確（モジュール未実装）
- [ ] 次のGreen Phaseで実装すべき内容が明確

## 実装例

### test/setup.ts
```typescript
import '@testing-library/jest-dom'
import { vi } from 'vitest'

// Firebase Auth モックセットアップ
vi.mock('firebase/auth', () => ({
  getAuth: vi.fn(),
  signInWithEmailAndPassword: vi.fn(),
  createUserWithEmailAndPassword: vi.fn(),
  signOut: vi.fn(),
  onAuthStateChanged: vi.fn(),
}))

// Next.js router モック
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
  }),
  usePathname: () => '/',
}))
```

### package.json スクリプト追加
```json
{
  "scripts": {
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest --coverage"
  }
}
```

## 注意事項

### 【厳守事項】
- **実装禁止**: lib/auth.ts、components/auth/* 等の実装ファイルを作成しない
- **テスト先行**: テストケースのみを作成し、実装は一切行わない
- **具体的仕様**: 曖昧なテストではなく、具体的な動作を検証するテスト
- **失敗確認**: すべてのテストが失敗することを確認する

### 【推奨事項】
- モックは最小限に留める
- テストケース名は動作を明確に表現する
- エラーハンドリングのテストも含める
- 非同期処理のテストは適切にwaitForを使用

### 【禁止事項】
- 実装コードの作成
- テスト用の仮実装
- 既存のテストファイルの削除・修正

## 参考情報
- 設計書: doc/design/mcp-todoist.md の Task 2-1
- Next.js 14 Testing: https://nextjs.org/docs/app/building-your-application/testing/vitest
- React Testing Library: https://testing-library.com/docs/react-testing-library/intro
- Firebase Auth: https://firebase.google.com/docs/auth/web/start 