# Task 1-1 Step 2: Green Phase - 最小実装でテストを通す

## 🟢 Green Phase: テストを通すための最小実装

### 【重要】最小限の実装でテストを通すことが目標
- 過度な機能追加は禁止
- テストが通る最小限のコードのみ実装
- リファクタリングは次のステップ（Blue Phase）で行う

## 実装指示

### 1. ディレクトリ構造作成
- `packages/mcp-server/src/server/` ディレクトリを作成
- `packages/mcp-server/src/types/` ディレクトリを作成

### 2. 型定義実装

#### src/types/mcp.ts
**MCP プロトコルの型定義を実装**
- MCPRequest インターフェース（jsonrpc, id, method, params?）
- MCPResponse インターフェース（jsonrpc, id, result?, error?）
- MCPError インターフェース（code, message, data?）
- InitializeResult インターフェース（protocolVersion, capabilities, serverInfo）
- ServerInfo インターフェース（name, version）

### 3. MCPProtocolHandler 実装

#### src/server/mcp-handler.ts
**MCPProtocolHandler クラスを実装**

**必須メソッド：**
- `handleRequest(request: any): Promise<MCPResponse>` - メインのリクエスト処理
- `validateRequest(request: any): boolean` - リクエスト形式の検証
- `createResponse(id: any, result: any): MCPResponse` - 成功レスポンス作成
- `createErrorResponse(id: any, error: MCPError): MCPResponse` - エラーレスポンス作成

**handleRequest の実装要件：**
- リクエスト検証（validateRequestを使用）
- initialize メソッドの処理（protocolVersion="2024-11-05", capabilities={}, serverInfo={name:"mcp-todoist", version:"1.0.0"}）
- 未知のメソッドへの -32601 エラー応答
- 不正なリクエストへの -32600 エラー応答

**validateRequest の実装要件：**
- オブジェクト型チェック
- jsonrpc="2.0" チェック
- id 存在チェック
- method 存在チェック

### 4. MCPServer 実装

#### src/server/index.ts
**MCPServer クラスを実装**

**必須メソッド・プロパティ：**
- `app` プロパティ（Express アプリケーション、テスト用に公開）
- コンストラクタでExpressアプリケーション初期化
- `/mcp` POST エンドポイント実装

**エンドポイント実装要件：**
- JSON パースエラーの適切な処理（400エラー）
- MCPProtocolHandler を使用したリクエスト処理
- JSON-RPC レスポンスの返却（200ステータス、application/json）
- エラーハンドリングの実装

### 5. インデックスファイル作成

#### src/index.ts
**メインエントリーポイント**
- MCPServer のエクスポート
- MCPProtocolHandler のエクスポート
- 型定義のエクスポート

## 実行確認の指示

### テスト実行
`npm test` を実行して以下を確認：
- ✅ すべてのテストが成功する
- ✅ MCPProtocolHandler の12個のテストが通る
- ✅ MCPServer の5個の統合テストが通る

### 実装品質チェック
- 各テストケースが期待通りの動作をする
- エラーコードが正確（-32600, -32601）
- レスポンス形式がJSON-RPC 2.0仕様に準拠
- Express アプリケーションが正常に動作する

## 完了条件

### ✅ チェックリスト
- [ ] src/types/mcp.ts に型定義が実装されている
- [ ] src/server/mcp-handler.ts に MCPProtocolHandler が実装されている
- [ ] src/server/index.ts に MCPServer が実装されている
- [ ] src/index.ts にエクスポートが実装されている
- [ ] `npm test` ですべてのテストが成功する
- [ ] JSON-RPC 2.0 仕様に準拠している

## 【重要】実装原則
- **最小限の実装**: テストを通すのに必要な最低限のコードのみ
- **機能過多禁止**: 要求されていない追加機能は実装しない
- **エラーハンドリング**: テストで要求されるエラーケースのみ対応
- **コード品質**: 動作することを最優先（美しさは次ステップ）

## 【重要】次のステップ
このGreen Phaseが完了したら、**Blue Phase（task1-1_step3_blue-phase.md）** に進み、コードのリファクタリングと品質向上を行う。 