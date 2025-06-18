# Task 2-2 Step 1: MCPテスター画面 (Red Phase)

## 概要
WebUIのMCPテスター画面のテストケースを先行実装します。TDDのRed Phaseとして、実装前にテストコードを作成し、すべてのテストが期待通り失敗することを確認します。

## 依存関係
- 前Task: Task 2-1 (WebUI認証・アカウント管理) - 完了済み
- 本実装の元となる設計書: doc/design/mcp-todoist.md

### 前提条件
- Firebase Auth統合とマルチアカウント管理が実装済み
- packages/web-ui/ の基本構造が存在すること
- 認証コンポーネントが動作していること

### 成果物
- `packages/web-ui/test/components/mcp-tester.test.tsx` - MCPテスターUIテスト
- `packages/web-ui/test/lib/mcp-client.test.ts` - MCPクライアントテスト
- `packages/web-ui/test/integration/mcp-communication.integration.test.ts` - MCP通信統合テスト
- テスト設定・モック・依存関係の追加

### 影響範囲
- packages/web-ui/test/ - テストファイル追加
- packages/web-ui/package.json - テスト依存関係追加
- packages/web-ui/vitest.config.ts - テスト設定更新

## 実装要件

### 【必須制約】TDD Red Phase厳守
- **テスト先行**: 実装は一切行わず、テストコードのみ作成
- **期待する失敗**: 全テストが実装不足で失敗することを確認
- **網羅的テスト**: 設計書の全要件をテストでカバー
- **実装指針明確化**: Green Phaseでの実装方針をテストで示す

### 【技術制約】
- **フレームワーク**: Vitest + React Testing Library
- **モック戦略**: WebSocket・Firebase・Next.js API Route
- **テスト環境**: jsdom with WebSocket simulation
- **日本語対応**: テスト名・エラーメッセージは日本語

## テスト要件

### 1. MCPクライアントテスト (packages/web-ui/test/lib/mcp-client.test.ts)

#### 基本機能テスト
```typescript
describe('MCPClient', () => {
  describe('接続管理', () => {
    it('WebSocket接続を確立できる')
    it('接続失敗時にエラーをスローする')
    it('接続切断を検知して再接続を試行する')
    it('接続状態を正確に報告する')
  })

  describe('MCPプロトコル通信', () => {
    it('initialize リクエストを送信できる')
    it('tools/list リクエストでツール一覧を取得できる')
    it('tools/call でツールを実行できる')
    it('resources/list でリソース一覧を取得できる')
    it('resources/read でリソースを読み取れる')
    it('prompts/list でプロンプト一覧を取得できる')
    it('prompts/get でプロンプトを取得できる')
  })

  describe('エラーハンドリング', () => {
    it('MCPエラーレスポンスを適切に処理する')
    it('ネットワークエラーを検知してリトライする')
    it('タイムアウト時に適切なエラーを返す')
    it('無効なレスポンスを検出してエラーを出す')
  })

  describe('認証統合', () => {
    it('Firebase認証トークンを自動付与する')
    it('認証失敗時に適切なエラーを出す')
    it('トークン更新を自動実行する')
    it('ログアウト時に接続を切断する')
  })
})
```

#### 期待されるMCPClientクラス構造
```typescript
interface MCPClient {
  connect(serverUrl: string): Promise<void>
  disconnect(): void
  isConnected(): boolean
  initialize(): Promise<MCPInitializeResponse>
  listTools(): Promise<MCPTool[]>
  callTool(name: string, arguments: Record<string, any>): Promise<any>
  listResources(): Promise<MCPResource[]>
  readResource(uri: string): Promise<MCPResourceContent>
  listPrompts(): Promise<MCPPrompt[]>
  getPrompt(name: string): Promise<MCPPromptContent>
  on(event: string, callback: Function): void
  off(event: string, callback: Function): void
}
```

### 2. MCPテスターUIテスト (packages/web-ui/test/components/mcp-tester.test.tsx)

#### UI コンポーネントテスト
```typescript
describe('MCPTester', () => {
  describe('接続セクション', () => {
    it('サーバーURL入力フィールドが表示される')
    it('接続ボタンでMCPサーバーに接続する')
    it('切断ボタンで接続を終了する')
    it('接続状態インジケーターが正確に表示される')
    it('接続エラー時にエラーメッセージを表示する')
  })

  describe('ツール実行セクション', () => {
    it('利用可能ツール一覧を表示する')
    it('ツール選択でパラメーター入力フォームを表示する')
    it('ツール実行ボタンでツールを呼び出す')
    it('実行結果をJSON形式で表示する')
    it('実行エラー時にエラー詳細を表示する')
  })

  describe('リソース管理セクション', () => {
    it('利用可能リソース一覧を表示する')
    it('リソース選択で内容を表示する')
    it('リソース内容をテキスト・JSON形式で表示する')
    it('大きなリソースでページネーションを表示する')
  })

  describe('プロンプト管理セクション', () => {
    it('利用可能プロンプト一覧を表示する')
    it('プロンプト選択でテンプレートを表示する')
    it('プロンプト変数入力フォームを表示する')
    it('プロンプト実行結果を表示する')
  })

  describe('デバッグセクション', () => {
    it('送受信メッセージログを表示する')
    it('メッセージタイムスタンプを表示する')
    it('メッセージをJSON形式で整形表示する')
    it('ログクリアボタンでログを削除する')
    it('ログエクスポートボタンでJSONダウンロードする')
  })

  describe('認証統合', () => {
    it('ログイン状態でのみアクセスできる')
    it('アカウント切り替え時にMCP接続をリセットする')
    it('ログアウト時にMCP接続を切断する')
  })
})
```

#### 期待されるMCPTesterコンポーネント構造
```typescript
interface MCPTesterProps {
  initialServerUrl?: string
  onConnectionChange?: (connected: boolean) => void
}

interface MCPTesterState {
  connected: boolean
  serverUrl: string
  tools: MCPTool[]
  resources: MCPResource[]
  prompts: MCPPrompt[]
  logs: MCPMessage[]
  selectedTool?: MCPTool
  selectedResource?: MCPResource
  selectedPrompt?: MCPPrompt
  loading: boolean
  error?: string
}
```

### 3. MCP通信統合テスト (packages/web-ui/test/integration/mcp-communication.integration.test.ts)

#### フルフロー統合テスト
```typescript
describe('MCP通信統合', () => {
  describe('初期化フロー', () => {
    it('WebSocket接続→initialize→ツール一覧取得の流れが動作する')
    it('サーバーエラー時に適切なフォールバック処理をする')
    it('ネットワーク切断時に自動再接続を試行する')
  })

  describe('Todoistツール統合', () => {
    it('todoist_get_tasks ツールでタスク一覧を取得できる')
    it('todoist_create_task ツールでタスクを作成できる')
    it('todoist_update_task ツールでタスクを更新できる')
    it('todoist_delete_task ツールでタスクを削除できる')
    it('todoist_get_projects ツールでプロジェクト一覧を取得できる')
  })

  describe('リソース統合', () => {
    it('task://123 形式でタスクリソースを取得できる')
    it('project://456 形式でプロジェクトリソースを取得できる')
    it('存在しないリソースで404エラーを取得する')
  })

  describe('プロンプト統合', () => {
    it('task_summary プロンプトでタスク要約を生成できる')
    it('project_analysis プロンプトでプロジェクト分析を生成できる')
    it('プロンプト変数を正しく置換する')
  })

  describe('マルチアカウント統合', () => {
    it('アカウント切り替え時にコンテキストを切り替える')
    it('異なるアカウントで異なるデータを取得する')
    it('権限不足時に適切なエラーを表示する')
  })

  describe('リアルタイム通信', () => {
    it('サーバー側イベントを受信して画面を更新する')
    it('複数タブ間でリアルタイム同期する')
    it('長時間接続でメモリリークしない')
  })

  describe('エラー復旧', () => {
    it('一時的な接続切断後に自動復旧する')
    it('MCPサーバー再起動後に接続を復旧する')
    it('Todoistサーバーエラー後にリトライする')
  })
})
```

## テスト設定要件

### vitest.config.ts 追加設定
```typescript
// WebSocket mock support
global.WebSocket = MockWebSocket
global.fetch = vi.fn()

// Ant Design component testing
setupAntdTesting()

// Firebase Auth mock
mockFirebaseAuth()

// Next.js API Route mock  
mockNextApiRoutes()
```

### 依存関係追加 (package.json)
```json
{
  "devDependencies": {
    "ws": "^8.14.0",
    "@types/ws": "^8.5.7",
    "mock-websocket": "^1.0.0",
    "whatwg-fetch": "^3.6.2"
  }
}
```

### モック要件
- WebSocket クライアント/サーバー両方
- Firebase Auth (getIdToken, onAuthStateChanged)
- Next.js API Routes (/api/mcp/*)
- Ant Design フォームバリデーション
- JSON Schema バリデーション

## 成功基準

### 定量的目標
- **テスト数**: 45件以上（15 unit + 15 component + 15 integration）
- **失敗率**: 100%（実装前なので全テストが期待通り失敗）
- **テストカバレッジ**: 0%（実装ファイルが存在しないため）
- **実行時間**: < 10秒（モックベースのため高速）

### 定性的目標
- 設計書の全要件がテストでカバーされている
- Green Phaseでの実装方針がテストから明確
- エラーケース・エッジケースも十分テストされている
- 日本語のテスト名・エラーメッセージで理解しやすい

## Green Phase 実装指針

テストが示すインターフェース仕様：
1. **MCPClient**: WebSocket + Firebase Auth統合クライアント
2. **MCPTester**: リアルタイム通信テスト用React UI
3. **API Route**: /api/mcp/* でプロキシ・認証・ログ
4. **型定義**: MCP protocol + Todoist API 統合型
5. **エラーハンドリング**: ネットワーク・認証・MCP全般

**想定所要時間**: 2時間（テスト作成）

## 実装時の注意点

1. **実装禁止**: このPhaseでは.test.ts以外のファイル作成禁止
2. **モック中心**: 外部依存は全てモックで代替
3. **明確な期待値**: テストの期待動作を明確に記述
4. **エラーメッセージ**: 失敗時に何が実装されていないか明示
5. **段階的テスト**: 複雑なテストを小さなテストに分割 