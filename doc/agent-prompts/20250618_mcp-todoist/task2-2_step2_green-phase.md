# Task 2-2 Step 2: MCPテスター画面 (Green Phase)

## 概要
Red Phaseで作成した189件のテストを通すため、MCPテスター画面の基本実装を行います。TDDのGreen Phaseとして、最小限の実装ですべてのテストを通すことを目標とします。

## 依存関係
- 前Phase: Task 2-2 Step 1 (Red Phase) - テストケース189件作成完了
- 本実装の元となる設計書: doc/design/mcp-todoist.md

### 前提条件
- packages/web-ui/test/ 内のテストファイルが存在すること
- WebSocket・Firebase Auth・Ant Design依存関係がインストール済みであること
- 189件のテストが現在失敗していること

### 成果物
- `packages/web-ui/lib/mcp/client.ts` - MCPクライアント実装
- `packages/web-ui/components/MCPTester.tsx` - MCPテスターUIコンポーネント
- `packages/web-ui/app/api/mcp/route.ts` - MCP API Routeプロキシ
- `packages/web-ui/types/mcp.ts` - MCP関連型定義
- `packages/web-ui/lib/mcp/` - MCPクライアント・サーバー統合ライブラリ

### 影響範囲
- packages/web-ui/lib/mcp/ - MCPクライアント・型定義追加
- packages/web-ui/components/ - MCPTesterコンポーネント追加
- packages/web-ui/app/api/mcp/ - API Route追加
- packages/web-ui/types/ - 型定義追加

## 実装要件

### 【必須制約】TDD Green Phase厳守
- **テスト優先**: 189件のテストをすべて通すことが最優先
- **最小実装**: 機能的だが最低限の実装に留める
- **品質後回し**: Blue Phaseで改善するため、この段階では基本動作重視
- **既存破壊禁止**: Task 2-1の認証機能を壊さないこと

### 【技術制約】
- **フレームワーク**: Next.js 14, React 18, TypeScript
- **UI**: Ant Design (既存コンポーネントと統合)
- **通信**: WebSocket (ws library) + Next.js API Routes
- **認証**: Firebase Auth (既存認証システムと統合)
- **状態管理**: React useState/useEffect (単純なローカル状態)

## 実装要件

### 1. MCPクライアント実装 (packages/web-ui/lib/mcp/client.ts)

#### 基本MCPClientクラス
```typescript
export class MCPClient {
  private ws: WebSocket | null = null
  private connected: boolean = false
  private serverUrl: string = ''
  private eventHandlers: Map<string, Function[]> = new Map()
  private requestId: number = 0
  private pendingRequests: Map<string, {resolve: Function, reject: Function}> = new Map()

  async connect(serverUrl: string): Promise<void> {
    // WebSocket接続確立
    // Firebase Auth トークン取得・ヘッダー設定
    // 接続成功時にconnectedをtrueに
    // エラー時は適切な例外をスロー
  }

  disconnect(): void {
    // WebSocket切断
    // 状態リセット
    // disconnect イベント発火
  }

  isConnected(): boolean {
    return this.connected
  }

  async initialize(): Promise<MCPInitializeResponse> {
    // MCP initialize リクエスト送信
    // サーバー情報取得
    // 初期化完了の確認
  }

  async listTools(): Promise<MCPTool[]> {
    // tools/list リクエスト送信
    // ツール一覧取得
  }

  async callTool(name: string, arguments: Record<string, any>): Promise<any> {
    // tools/call リクエスト送信
    // 実行結果取得
  }

  async listResources(): Promise<MCPResource[]> {
    // resources/list リクエスト送信
    // リソース一覧取得
  }

  async readResource(uri: string): Promise<MCPResourceContent> {
    // resources/read リクエスト送信
    // リソース内容取得
  }

  async listPrompts(): Promise<MCPPrompt[]> {
    // prompts/list リクエスト送信
    // プロンプト一覧取得
  }

  async getPrompt(name: string): Promise<MCPPromptContent> {
    // prompts/get リクエスト送信
    // プロンプト取得
  }

  on(event: string, callback: Function): void {
    // イベントリスナー登録
  }

  off(event: string, callback: Function): void {
    // イベントリスナー削除
  }

  private sendRequest(method: string, params?: any): Promise<any> {
    // JSON-RPC 2.0 リクエスト送信
    // レスポンス待機・処理
    // エラーハンドリング
  }
}
```

### 2. MCPテスターUI実装 (packages/web-ui/components/MCPTester.tsx)

#### 基本UIコンポーネント
```typescript
interface MCPTesterProps {
  initialServerUrl?: string
  onConnectionChange?: (connected: boolean) => void
}

export default function MCPTester({ initialServerUrl, onConnectionChange }: MCPTesterProps) {
  const [connected, setConnected] = useState(false)
  const [serverUrl, setServerUrl] = useState(initialServerUrl || '')
  const [tools, setTools] = useState<MCPTool[]>([])
  const [resources, setResources] = useState<MCPResource[]>([])
  const [prompts, setPrompts] = useState<MCPPrompt[]>([])
  const [logs, setLogs] = useState<MCPMessage[]>([])
  const [selectedTool, setSelectedTool] = useState<MCPTool>()
  const [selectedResource, setSelectedResource] = useState<MCPResource>()
  const [selectedPrompt, setSelectedPrompt] = useState<MCPPrompt>()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>()

  const mcpClient = useRef<MCPClient>()

  // 接続セクション
  // - サーバーURL入力フィールド
  // - 接続/切断ボタン
  // - 接続状態インジケーター
  // - エラーメッセージ表示

  // ツール実行セクション
  // - 利用可能ツール一覧
  // - ツール選択・パラメーター入力フォーム
  // - ツール実行ボタン
  // - 実行結果JSON表示

  // リソース管理セクション
  // - 利用可能リソース一覧
  // - リソース選択・内容表示
  // - ページネーション対応

  // プロンプト管理セクション
  // - 利用可能プロンプト一覧
  // - プロンプト選択・変数入力
  // - プロンプト実行・結果表示

  // デバッグセクション
  // - 送受信メッセージログ
  // - タイムスタンプ・JSON整形表示
  // - ログクリア・エクスポート機能

  return (
    <div data-testid="mcp-tester">
      {/* Ant Design UIコンポーネント使用 */}
      {/* Card, Form, Button, Input, Select, List, Typography等 */}
      {/* 認証統合・エラーハンドリング・ローディング状態 */}
    </div>
  )
}
```

### 3. MCP API Route実装 (packages/web-ui/app/api/mcp/route.ts)

#### WebSocketプロキシAPI
```typescript
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  // Firebase Auth トークン検証
  // リクエストボディ取得・バリデーション
  // MCPサーバーへのプロキシリクエスト
  // レスポンス返却・エラーハンドリング
}

export async function GET(request: NextRequest) {
  // WebSocket接続情報取得
  // サーバー状態確認
}
```

### 4. 型定義実装 (packages/web-ui/types/mcp.ts)

#### MCP Protocol型定義
```typescript
// MCP JSON-RPC 2.0 基本型
export interface MCPRequest {
  jsonrpc: '2.0'
  id: string | number
  method: string
  params?: any
}

export interface MCPResponse {
  jsonrpc: '2.0'
  id: string | number
  result?: any
  error?: MCPError
}

export interface MCPError {
  code: number
  message: string
  data?: any
}

// MCP initialize
export interface MCPInitializeResponse {
  protocolVersion: string
  capabilities: MCPCapabilities
  serverInfo: MCPServerInfo
}

// MCP tools
export interface MCPTool {
  name: string
  description?: string
  inputSchema: JSONSchema
}

// MCP resources
export interface MCPResource {
  uri: string
  name: string
  description?: string
  mimeType?: string
}

export interface MCPResourceContent {
  uri: string
  mimeType: string
  text?: string
  blob?: string
}

// MCP prompts
export interface MCPPrompt {
  name: string
  description?: string
  arguments?: MCPPromptArgument[]
}

export interface MCPPromptContent {
  description?: string
  messages: MCPPromptMessage[]
}

// Todoist統合型
export interface TodoistTool extends MCPTool {
  name: 'todoist_get_tasks' | 'todoist_create_task' | 'todoist_update_task' | 'todoist_delete_task' | 'todoist_get_projects'
}

// UI状態管理型
export interface MCPMessage {
  id: string
  timestamp: Date
  direction: 'sent' | 'received'
  type: 'request' | 'response' | 'notification'
  content: MCPRequest | MCPResponse
}

export interface MCPTesterState {
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

## テスト成功要件

### テスト実行結果目標
- **MCPクライアントテスト**: 73件すべて成功
- **MCPテスターUIテスト**: 62件すべて成功
- **MCP通信統合テスト**: 54件すべて成功
- **総計**: 189件すべて成功

### 機能動作要件
1. **WebSocket接続**: サーバーURL指定で接続・切断
2. **MCPプロトコル**: initialize, tools, resources, prompts API動作
3. **Firebase Auth統合**: 認証トークン自動付与
4. **UI表示**: 各セクションが正常表示・操作可能
5. **エラーハンドリング**: 適切なエラーメッセージ表示
6. **ログ機能**: 送受信メッセージ記録・表示

## 実装指針

### アーキテクチャ方針
1. **レイヤー分離**: Client → Component → API Route
2. **型安全**: 全インターフェースをTypeScriptで厳密定義
3. **エラーファースト**: エラーケースを最初に実装
4. **認証統合**: 既存AuthManagerを活用
5. **UI統合**: 既存Ant Designテーマ・レイアウト継承

### 実装順序
1. 型定義 (types/mcp.ts)
2. MCPクライアント (lib/mcp/client.ts)
3. API Route (app/api/mcp/route.ts)
4. UIコンポーネント (components/MCPTester.tsx)
5. 統合テスト検証

### パフォーマンス考慮
- WebSocket接続プール管理
- 大きなレスポンスのページネーション
- UI更新のデバウンス処理
- メモリリーク防止 (useEffect cleanup)

## Blue Phase準備

Green Phase完了後のBlue Phase改善項目：
1. **UX向上**: ローディング・プログレスバー・キーボードショートカット
2. **セキュリティ強化**: 入力バリデーション・XSS防止・CSP対応
3. **パフォーマンス最適化**: 仮想スクロール・Worker利用・キャッシュ
4. **テスト強化**: E2Eテスト・ストレステスト・エラー復旧テスト
5. **開発者体験**: デバッグツール・ログ詳細化・設定エクスポート

**想定所要時間**: 3時間（基本実装）

## 実装時の注意点

1. **テスト駆動**: 常にテスト結果を確認しながら実装
2. **最小実装**: 過度な最適化・機能追加は避ける
3. **既存統合**: 認証・ルーティング・UIテーマとの整合性確保
4. **エラー重視**: 正常系より異常系の動作を確実に
5. **段階確認**: 小さな単位で動作確認・テスト実行 