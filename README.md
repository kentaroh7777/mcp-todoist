# MCP Todoist

Todoist API互換のMCPサーバー実装

## 技術スタック

- **フロントエンド**: Next.js 14 (App Router)
- **UI**: Ant Design + Tailwind CSS
- **バックエンド**: Convex
- **言語**: TypeScript
- **API**: MCP (Model Context Protocol)

## アーキテクチャ

```
├── フロントエンド (Next.js 14)
│   ├── React Server Components
│   ├── Client Components
│   └── API Routes
├── MCP Server Layer
│   ├── Protocol Handler
│   ├── Todoist API Adapter
│   └── Tool Registry
├── バックエンド (Convex)
│   ├── Database Functions
│   ├── Mutations
│   ├── Queries
│   └── Actions
└── 外部API
    └── Todoist API
```

## 主要機能

### 実装済み

- [x] プロジェクト基本構成
- [x] Next.js 14 + TypeScript セットアップ
- [x] Ant Design UIコンポーネント
- [x] MCP Server基本実装
- [x] Todoist APIクライアント
- [x] データスキーマ定義
- [x] 環境変数設定管理
- [x] MCPツール実装（サンプルデータ対応）
- [x] テストUIコンポーネント
- [x] APIエンドポイント `/api/mcp`

### 実装予定

- [ ] Convex関数のフル実装
- [ ] 実際のデータベース統合
- [ ] Todoist API同期機能
- [ ] リアルタイム同期
- [ ] 認証システム
- [ ] ユーザー管理

## セットアップ

### 1. 依存関係のインストール

```bash
npm install
```

### 2. 環境変数の設定

```bash
# .env.localファイルを作成（.env.exampleを参考に）
cp .env.example .env.local

# 必要な環境変数を設定
CONVEX_DEPLOYMENT=your-deployment-name
NEXT_PUBLIC_CONVEX_URL=https://your-convex-url.convex.cloud
TODOIST_API_TOKEN=your-todoist-api-token
```

### 3. Convexのセットアップ

```bash
# Convexの初期化
npx convex dev
```

### 4. 開発サーバーの起動

```bash
npm run dev
```

### 5. MCP Server のテスト

ブラウザで以下にアクセス：
- `http://localhost:3000` - メインダッシュボード
- `http://localhost:3000/test` - MCPサーバーテスター

MCPテスターで以下の機能をテストできます：
- サーバー初期化
- ツール一覧取得
- タスク・プロジェクト操作

## API エンドポイント

### MCP Server

- `POST /api/mcp` - MCPプロトコルのメインエンドポイント

#### 利用可能なツール

- `create_task` - タスク作成
- `get_tasks` - タスク一覧取得
- `update_task` - タスク更新
- `create_project` - プロジェクト作成
- `get_projects` - プロジェクト一覧取得

#### リクエスト例

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/list"
}
```

```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "tools/call",
  "params": {
    "name": "create_task",
    "arguments": {
      "content": "新しいタスク",
      "priority": 2
    }
  }
}
```

## ディレクトリ構造

```
mcp-todoist/
├── convex/                 # Convexバックエンド
│   ├── schema.ts          # データスキーマ
│   ├── tasks.ts           # タスク関連関数
│   └── projects.ts        # プロジェクト関連関数
├── src/
│   ├── app/               # Next.js App Router
│   │   ├── api/mcp/       # MCP APIエンドポイント
│   │   ├── layout.tsx     # ルートレイアウト
│   │   └── page.tsx       # メインページ
│   ├── lib/
│   │   ├── mcp/           # MCP Server実装
│   │   └── todoist/       # Todoist APIクライアント
│   └── types/             # TypeScript型定義
├── package.json
├── convex.json
└── next.config.js
```

## 開発中の注意事項

- 型エラーについて：Convexの生成ファイルが作成される前は一部型エラーが表示されますが、`npx convex dev`実行後に解決されます
- Todoist APIキーが必要な機能についてはAPIキーを設定してください

## 次の開発段階

1. **Convex関数の実装完了**
2. **MCPツールとConvex関数の統合**
3. **Todoist API同期機能**
4. **リアルタイム更新機能**
5. **UIコンポーネントの拡充** 