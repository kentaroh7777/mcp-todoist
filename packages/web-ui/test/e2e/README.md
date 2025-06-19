# E2Eテスト

このディレクトリには、MCP Todoist WebUIのブラウザアプリケーション用E2Eテストが含まれています。

## テストフレームワーク

- **Playwright**: マルチブラウザ対応のE2Eテストフレームワーク
- **テスト対象ブラウザ**: Chromium, Firefox, WebKit (Safari), Mobile Chrome, Mobile Safari

## テストファイル構成

### `auth.spec.ts`
Firebase認証フローのテスト
- サインイン/サインアップフォームの表示
- バリデーション機能
- フォーム切り替え
- エラーハンドリング

### `mcp-tester.spec.ts`
MCPテスター画面の機能テスト
- MCP接続機能
- タブナビゲーション
- 初期化、ツール、リソース、プロンプト操作
- フォーム入力とレスポンス表示

### `navigation.spec.ts`
アプリケーション全体のナビゲーションテスト
- ページ間遷移
- URL検証
- 404ハンドリング
- レスポンシブデザイン

### `accessibility.spec.ts`
アクセシビリティ機能のテスト
- キーボードナビゲーション
- フォーカス管理
- スクリーンリーダー対応
- セマンティックHTML

## 実行方法

### 全テスト実行
```bash
npm run test:e2e
```

### UIモードで実行（推奨）
```bash
npm run test:e2e:ui
```

### ヘッド付きモードで実行（ブラウザ表示あり）
```bash
npm run test:e2e:headed
```

### デバッグモード
```bash
npm run test:e2e:debug
```

### 特定のブラウザのみ実行
```bash
npx playwright test --project=chromium
npx playwright test --project=firefox
npx playwright test --project=webkit
```

### 特定のテストファイル実行
```bash
npx playwright test auth.spec.ts
npx playwright test mcp-tester.spec.ts
```

## 前提条件

### 開発サーバー起動
テスト実行前に、以下のサーバーが起動している必要があります：

1. **Next.js開発サーバー** (http://localhost:3001)
   ```bash
   npm run dev
   ```

2. **Convexサーバー** (バックエンド)
   ```bash
   npx convex dev
   ```

### 環境変数
`.env.local`ファイルに以下の設定が必要です：
```bash
CONVEX_DEPLOYMENT=confident-yak-98
NEXT_PUBLIC_CONVEX_URL=https://confident-yak-98.convex.cloud
```

## テスト結果

### レポート確認
テスト実行後、HTMLレポートが生成されます：
```bash
npx playwright show-report
```

### スクリーンショット・動画
失敗したテストのスクリーンショットと動画は `test-results/` ディレクトリに保存されます。

## 設定

### `playwright.config.ts`
- ベースURL: http://localhost:3001
- 自動的にNext.js開発サーバーを起動
- トレース記録: 失敗時のみ
- 並列実行: 有効

### `setup.ts`
- テスト用の共通設定とヘルパー関数
- モックデータやテスト定数

## CI/CD統合

GitHub ActionsやCI環境では以下のように実行：

```bash
# CI環境用設定
CI=true npm run test:e2e
```

CI環境では：
- ヘッドレスモードで実行
- リトライ: 2回
- 並列実行: 無効

## トラブルシューティング

### よくある問題

1. **サーバーが起動していない**
   ```
   Error: connect ECONNREFUSED 127.0.0.1:3001
   ```
   → `npm run dev` でNext.jsサーバーを起動してください

2. **Convexエラー**
   ```
   ConvexError: Deployment not found
   ```
   → `npx convex dev` でConvexサーバーを起動してください

3. **ブラウザインストールエラー**
   ```bash
   npx playwright install
   ```

### デバッグ方法

1. **ステップバイステップ実行**
   ```bash
   npx playwright test --debug
   ```

2. **スローモーション実行**
   ```bash
   npx playwright test --headed --slowMo=1000
   ```

3. **特定要素の確認**
   ```bash
   npx playwright codegen http://localhost:3001
   ```

## 開発者向け

### 新しいテスト追加
1. 適切なカテゴリの`.spec.ts`ファイルに追加
2. `test.describe()`でグループ化
3. `test()`で個別テストケース作成
4. `expect()`でアサーション

### ベストプラクティス
- Page Object Modelパターンの使用検討
- data-testid属性の活用
- 安定したセレクタの使用
- 適切な待機（waitFor）の実装
- エラーメッセージの具体的記述

## リンク

- [Playwright Documentation](https://playwright.dev/docs/intro)
- [Best Practices](https://playwright.dev/docs/best-practices)
- [Debugging Guide](https://playwright.dev/docs/debug) 

このディレクトリには、MCP Todoist WebUIのブラウザアプリケーション用E2Eテストが含まれています。

## テストフレームワーク

- **Playwright**: マルチブラウザ対応のE2Eテストフレームワーク
- **テスト対象ブラウザ**: Chromium, Firefox, WebKit (Safari), Mobile Chrome, Mobile Safari

## テストファイル構成

### `auth.spec.ts`
Firebase認証フローのテスト
- サインイン/サインアップフォームの表示
- バリデーション機能
- フォーム切り替え
- エラーハンドリング

### `mcp-tester.spec.ts`
MCPテスター画面の機能テスト
- MCP接続機能
- タブナビゲーション
- 初期化、ツール、リソース、プロンプト操作
- フォーム入力とレスポンス表示

### `navigation.spec.ts`
アプリケーション全体のナビゲーションテスト
- ページ間遷移
- URL検証
- 404ハンドリング
- レスポンシブデザイン

### `accessibility.spec.ts`
アクセシビリティ機能のテスト
- キーボードナビゲーション
- フォーカス管理
- スクリーンリーダー対応
- セマンティックHTML

## 実行方法

### 全テスト実行
```bash
npm run test:e2e
```

### UIモードで実行（推奨）
```bash
npm run test:e2e:ui
```

### ヘッド付きモードで実行（ブラウザ表示あり）
```bash
npm run test:e2e:headed
```

### デバッグモード
```bash
npm run test:e2e:debug
```

### 特定のブラウザのみ実行
```bash
npx playwright test --project=chromium
npx playwright test --project=firefox
npx playwright test --project=webkit
```

### 特定のテストファイル実行
```bash
npx playwright test auth.spec.ts
npx playwright test mcp-tester.spec.ts
```

## 前提条件

### 開発サーバー起動
テスト実行前に、以下のサーバーが起動している必要があります：

1. **Next.js開発サーバー** (http://localhost:3001)
   ```bash
   npm run dev
   ```

2. **Convexサーバー** (バックエンド)
   ```bash
   npx convex dev
   ```

### 環境変数
`.env.local`ファイルに以下の設定が必要です：
```bash
CONVEX_DEPLOYMENT=confident-yak-98
NEXT_PUBLIC_CONVEX_URL=https://confident-yak-98.convex.cloud
```

## テスト結果

### レポート確認
テスト実行後、HTMLレポートが生成されます：
```bash
npx playwright show-report
```

### スクリーンショット・動画
失敗したテストのスクリーンショットと動画は `test-results/` ディレクトリに保存されます。

## 設定

### `playwright.config.ts`
- ベースURL: http://localhost:3001
- 自動的にNext.js開発サーバーを起動
- トレース記録: 失敗時のみ
- 並列実行: 有効

### `setup.ts`
- テスト用の共通設定とヘルパー関数
- モックデータやテスト定数

## CI/CD統合

GitHub ActionsやCI環境では以下のように実行：

```bash
# CI環境用設定
CI=true npm run test:e2e
```

CI環境では：
- ヘッドレスモードで実行
- リトライ: 2回
- 並列実行: 無効

## トラブルシューティング

### よくある問題

1. **サーバーが起動していない**
   ```
   Error: connect ECONNREFUSED 127.0.0.1:3001
   ```
   → `npm run dev` でNext.jsサーバーを起動してください

2. **Convexエラー**
   ```
   ConvexError: Deployment not found
   ```
   → `npx convex dev` でConvexサーバーを起動してください

3. **ブラウザインストールエラー**
   ```bash
   npx playwright install
   ```

### デバッグ方法

1. **ステップバイステップ実行**
   ```bash
   npx playwright test --debug
   ```

2. **スローモーション実行**
   ```bash
   npx playwright test --headed --slowMo=1000
   ```

3. **特定要素の確認**
   ```bash
   npx playwright codegen http://localhost:3001
   ```

## 開発者向け

### 新しいテスト追加
1. 適切なカテゴリの`.spec.ts`ファイルに追加
2. `test.describe()`でグループ化
3. `test()`で個別テストケース作成
4. `expect()`でアサーション

### ベストプラクティス
- Page Object Modelパターンの使用検討
- data-testid属性の活用
- 安定したセレクタの使用
- 適切な待機（waitFor）の実装
- エラーメッセージの具体的記述

## リンク

- [Playwright Documentation](https://playwright.dev/docs/intro)
- [Best Practices](https://playwright.dev/docs/best-practices)
- [Debugging Guide](https://playwright.dev/docs/debug) 