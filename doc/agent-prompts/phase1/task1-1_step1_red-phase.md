# Task 1-1 Step 1: Red Phase - テスト先行実装

## 🔴 Red Phase: テストを先に実装して失敗させる

### 【重要】このステップでは実装コードを一切書かない
- テストコードのみを実装する
- テストが失敗することを確認する
- 実装は次のステップ（Green Phase）で行う

## 実装指示

### 1. プロジェクト構造準備
- `packages/mcp-server` ディレクトリを作成
- package.json を初期化（npm init -y）
- 開発依存関係をインストール：vitest, @types/node, typescript, supertest, @types/supertest
- 実行時依存関係をインストール：express, ws, zod

### 2. 設定ファイル作成
- package.json にテストスクリプト（test: vitest, test:run: vitest run）を追加
- vitest.config.ts を作成（globals: true, environment: node）
- tsconfig.json を作成（ES2020, commonjs, strict有効）

### 3. テストファイル作成

#### test/mcp-handler.test.ts 
**MCPProtocolHandler クラスの単体テスト（12個のテストケース）**

**handleRequest メソッドのテスト：**
- initialize リクエストの正常処理（protocolVersion, capabilities, serverInfo.name='mcp-todoist' を含む）
- 未知のメソッドのエラーハンドリング（-32601 Method not found）
- 不正なリクエスト形式の処理（jsonrpc="1.0"など、-32600 Invalid Request）
- id が欠けているリクエストの処理（-32600 Invalid Request）

**validateRequest メソッドのテスト：**
- 正しい形式のリクエストの検証（jsonrpc="2.0", id, method必須）
- 間違ったjsonrpcバージョンの拒否
- id が欠けているリクエストの拒否
- method が欠けているリクエストの拒否
- 非オブジェクト（null, string, number, array）の拒否

**createResponse メソッドのテスト：**
- 正常なレスポンス形式の作成（jsonrpc="2.0", id, result）
- 文字列IDの処理

**createErrorResponse メソッドのテスト：**
- エラーレスポンス形式の作成（jsonrpc="2.0", id, error）
- null ID の処理（id=0に変換）

#### test/server.integration.test.ts
**MCPServer の統合テスト（5個のテストケース）**

**HTTP エンドポイントのテスト：**
- `/mcp` への正常なinitializeリクエスト（JSON-RPCフォーマット）
- 不正なJSON-RPCリクエストのエラー処理（-32600）
- 不正なJSONフォーマットの処理（400エラー）
- 存在しないメソッドのエラー処理（-32601）
- サーバーエラーの適切な処理

## 実行確認の指示

### テスト実行
`npm test` を実行して以下を確認：
- ❌ すべてのテストが失敗する
- ❌ `Cannot find module '../src/server/mcp-handler'` エラー
- ❌ `Cannot find module '../src/server/index'` エラー

## 完了条件

### ✅ チェックリスト
- [ ] packages/mcp-server プロジェクトがセットアップされている
- [ ] テスト環境（Vitest + SuperTest）が設定されている
- [ ] MCPProtocolHandler の単体テスト（12個）が実装されている
- [ ] MCPServer の統合テスト（5個）が実装されている
- [ ] `npm test` でテストが実行され、すべて失敗することを確認
- [ ] モジュールが見つからないエラーが出ることを確認

## 【重要】次のステップ
このRed Phaseが完了したら、**Green Phase（task1-1_step2_green-phase.md）** に進み、テストを通すための最小実装を行う。

**絶対に実装コードを書かないこと** - それは次のステップです！ 