# MCP Todoist

Todoist API互換のMCPサーバー実装

## 技術スタック

- **MCPサーバー**: Node.js + TypeScript
- **プロトコル**: MCP (Model Context Protocol) stdio transport
- **外部API**: Todoist REST API
- **言語**: TypeScript
- **ランタイム**: tsx

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

- [x] MCP Protocol Handler (stdio transport)
- [x] Todoist APIクライアント
- [x] MCPツール実装
  - [x] `todoist_get_tasks` - タスク一覧取得
  - [x] `todoist_create_task` - タスク作成
  - [x] `todoist_update_task` - タスク更新
  - [x] `todoist_close_task` - タスク完了
  - [x] `todoist_get_projects` - プロジェクト一覧取得
  - [x] `todoist_create_project` - プロジェクト作成
  - [x] `todoist_update_project` - プロジェクト更新
  - [x] `todoist_delete_project` - プロジェクト削除
- [x] ツール可視性制御システム

### ツール可視性設定

セキュリティと用途に応じて、各ツールの公開・非公開を設定できます。

**現在の設定:**
- **公開ツール**: `todoist_get_tasks`, `todoist_create_task`, `todoist_update_task`, `todoist_close_task`, `todoist_get_projects`, `todoist_move_task`
- **非公開ツール**: `todoist_create_project`, `todoist_update_project`, `todoist_delete_project`

> 📖 **詳細**: ツールの可視性設定の詳細については [TOOL_VISIBILITY.md](./TOOL_VISIBILITY.md) を参照してください。

## クイックスタート

### 1. 依存関係のインストール

```bash
npm install
```

### 2. MCPサーバーのビルド

```bash
cd packages/mcp-server
npm run build
cd ../..
```

### 3. MCPサーバーのテスト

```bash
# タスクリスト取得のテスト
echo '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"todoist_get_tasks","arguments":{}}}' | TODOIST_API_TOKEN=your-api-token tsx script/run-mcp-server.ts
```

## 🚀 Cursor AI 自動セットアップガイド

### 前提条件
- Node.js 18+ がインストールされている
- npm または yarn がインストールされている
- Cursor AI がインストールされている
- Todoist アカウントを持っている

### Step 1: プロジェクトのセットアップ

```bash
# リポジトリをクローン（または既存プロジェクトの場合はスキップ）
git clone <repository-url>
cd mcp-todoist

# 依存関係のインストール
npm install

# MCPサーバーのビルド
cd packages/mcp-server
npm run build
cd ../..
```

### Step 2: Todoist API トークンの取得

1. [Todoist App Console](https://todoist.com/app_console) にアクセス
2. 「Create a new app」をクリック
3. アプリ名を入力（例：「MCP Todoist Integration」）
4. 「Create app」をクリック
5. 表示されたAPI tokenをコピー（例：`61dae250699e84eb85b9c2ab9461c0581873566d`）

### Step 3: プロジェクトパスの確認

```bash
# 現在のプロジェクトの絶対パスを取得
pwd
```

**出力例**: `/Users/username/projects/mcp-todoist`

### Step 4: Cursor AI MCP設定の自動セットアップ

**方法A: 自動設定スクリプト実行**

以下のコマンドを実行して、Cursor AI設定を自動生成：

```bash
# 現在のディレクトリパスを取得
CURRENT_DIR=$(pwd)

# Cursor AI設定ディレクトリを作成
mkdir -p ~/.cursor

# MCP設定ファイルを自動生成
cat > ~/.cursor/mcp.json << EOF
{
  "mcpServers": {
    "mcp-todoist": {
      "command": "tsx",
      "args": ["$CURRENT_DIR/script/run-mcp-server.ts"],
      "env": {
        "TODOIST_API_TOKEN": "YOUR_TODOIST_API_TOKEN_HERE"
      }
    }
  }
}
EOF

echo "✅ MCP設定ファイルを作成しました: ~/.cursor/mcp.json"
echo "⚠️  次のステップ: YOUR_TODOIST_API_TOKEN_HERE を実際のAPIトークンに置き換えてください"
```

**方法B: 手動設定**

1. **設定ファイルの場所を確認**:
```bash
# macOS/Linux
ls -la ~/.cursor/
# Windowsの場合: %USERPROFILE%\.cursor\
```

2. **設定ファイルを作成/編集**:
```bash
# macOS/Linux
nano ~/.cursor/mcp.json
# または
code ~/.cursor/mcp.json
```

3. **以下の内容をコピー&ペースト**:
```json
{
  "mcpServers": {
    "mcp-todoist": {
      "command": "tsx",
      "args": ["/REPLACE_WITH_YOUR_PROJECT_PATH/script/run-mcp-server.ts"],
      "env": {
        "TODOIST_API_TOKEN": "REPLACE_WITH_YOUR_API_TOKEN"
      }
    }
  }
}
```

4. **プレースホルダーを置き換え**:
   - `/REPLACE_WITH_YOUR_PROJECT_PATH` → 実際のプロジェクトパス
   - `REPLACE_WITH_YOUR_API_TOKEN` → 実際のTodoist APIトークン

### Step 5: 設定の検証

```bash
# 設定ファイルの内容を確認
cat ~/.cursor/mcp.json

# MCPサーバーが正常に動作するかテスト
echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0.0"}}}' | TODOIST_API_TOKEN=your-actual-token tsx script/run-mcp-server.ts
```

正常な場合の出力例：
```json
{"jsonrpc":"2.0","id":1,"result":{"protocolVersion":"2024-11-05","capabilities":{"tools":{"listChanged":true},"resources":{"subscribe":true,"listChanged":true},"prompts":{"listChanged":true}},"serverInfo":{"name":"mcp-todoist","version":"1.0.0"}}}
```

### Step 6: Cursor AI での確認

1. **Cursor AI を完全に再起動**
2. **設定確認**:
   - `⌘+,` (Mac) または `Ctrl+,` (Windows) で設定を開く
   - "MCP" を検索
   - `mcp-todoist` サーバーが表示され、緑のインジケーターが点灯していることを確認

3. **動作テスト**:
   - `⌘+L` でチャットを開く
   - 「Todoistからタスクリストを取得して」と入力
   - MCPツールが自動実行され、タスクリストが表示されることを確認

## 🔧 AI アシスタント向け自動セットアップ手順

**AIアシスタントがこのREADMEを読んで自動セットアップを実行する場合の手順:**

1. **環境確認**:
```bash
node --version  # 18+ であることを確認
npm --version   # インストールされていることを確認
```

2. **プロジェクト準備**:
```bash
# プロジェクトディレクトリに移動していることを確認
pwd
# 依存関係インストール
npm install
# MCPサーバービルド
cd packages/mcp-server && npm run build && cd ../..
```

3. **パス取得**:
```bash
CURRENT_DIR=$(pwd)
echo "プロジェクトパス: $CURRENT_DIR"
```

4. **Cursor AI設定作成**:
```bash
mkdir -p ~/.cursor
cat > ~/.cursor/mcp.json << EOF
{
  "mcpServers": {
    "mcp-todoist": {
      "command": "tsx",
      "args": ["$CURRENT_DIR/script/run-mcp-server.ts"],
      "env": {
        "TODOIST_API_TOKEN": "PLACEHOLDER_FOR_USER_TOKEN"
      }
    }
  }
}
EOF
```

5. **ユーザーに指示**:
```
✅ MCP設定ファイルを作成しました！
📝 次の手順を完了してください：

1. Todoist API トークンを取得: https://todoist.com/app_console
2. 以下のコマンドで設定ファイルを編集:
   
   nano ~/.cursor/mcp.json
   
3. "PLACEHOLDER_FOR_USER_TOKEN" を実際のAPIトークンに置き換え
4. Cursor AI を再起動
5. チャットで「Todoistからタスクリストを取得して」とテスト
```

6. **設定検証**:
```bash
echo "設定ファイルの内容:"
cat ~/.cursor/mcp.json
echo ""
echo "APIトークンを設定後、以下でテスト:"
echo 'echo \'{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"todoist_get_tasks","arguments":{}}}\' | TODOIST_API_TOKEN=your-token tsx script/run-mcp-server.ts'
```

## 利用可能なMCPツール

| ツール名 | 説明 | パラメータ |
|---------|------|-----------|
| `todoist_get_tasks` | タスク一覧取得 | `project_id`, `filter`, `limit` (すべて任意) |
| `todoist_create_task` | タスク作成 | `content` (必須), `description`, `project_id`, `priority`, `due_string`, `labels` |
| `todoist_update_task` | タスク更新 | `task_id` (必須), `content`, `description`, `priority`, `due_string`, `labels` |
| `todoist_close_task` | タスク完了 | `task_id` (必須) |
| `todoist_get_projects` | プロジェクト一覧取得 | なし |
| `todoist_create_project` | プロジェクト作成 | `name` (必須), `color`, `parent_id`, `is_favorite` |
| `todoist_update_project` | プロジェクト更新 | `project_id` (必須), `name`, `color`, `is_favorite` |
| `todoist_delete_project` | プロジェクト削除 | `project_id` (必須) |

## 使用例

### Cursor AIでの基本操作

```
「Todoistからタスクリストを取得して」
「新しいタスク『プロジェクト資料作成』を優先度2で作成して」
「プロジェクト一覧を表示して」
「タスクID 123456789 を完了にして」
```

### コマンドラインでの直接テスト

```bash
# 初期化
echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0.0"}}}' | TODOIST_API_TOKEN=your-token tsx script/run-mcp-server.ts

# ツール一覧
echo '{"jsonrpc":"2.0","id":2,"method":"tools/list"}' | TODOIST_API_TOKEN=your-token tsx script/run-mcp-server.ts

# タスク作成
echo '{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"todoist_create_task","arguments":{"content":"テストタスク","priority":2}}}' | TODOIST_API_TOKEN=your-token tsx script/run-mcp-server.ts
```

## トラブルシューティング

### よくある問題

1. **「Module not found」エラー**
   - `cd packages/mcp-server && npm run build` でビルドを実行

2. **Cursor AIでMCPサーバーが認識されない**
   - Cursor AIを完全に再起動
   - `~/.cursor/mcp.json` のパスが正しいか確認
   - 環境変数 `TODOIST_API_TOKEN` が設定されているか確認

3. **Todoist API エラー**
   - APIトークンが有効か確認
   - [Todoist API ドキュメント](https://developer.todoist.com/rest/v2/) で制限事項を確認

## 他の環境での使用

このMCPサーバーはCursor AI以外の環境でも使用できます：

- **Claude Desktop**: 設定ファイル `~/.config/claude/claude_desktop_config.json`
- **その他のMCPクライアント**: stdio transportをサポートするクライアント

設定方法は基本的に同じで、コマンドとパスを適切に指定するだけです。

## 🌟 主な特徴

- **🤖 AI統合**: Cursor AI、Claude Desktopなど複数のAIツールからTodoistを操作
- **🚀 簡単セットアップ**: 3ステップで導入完了
- **📋 高度なタスク管理**: AIアシスタントでGTD、タスク整理、プロジェクト管理が効率化
- **🔄 リアルタイム同期**: Todoist APIと直接連携
- **🛠️ 拡張可能**: オープンソースで自由にカスタマイズ
- **💾 stdio transport**: 標準的なMCPプロトコル準拠

## 📖 ライセンス

MIT License - 詳細は [LICENSE](LICENSE) ファイルを参照

## 🔗 リンク

- **GitHub**: [https://github.com/kentaroh7777/mcp-todoist](https://github.com/kentaroh7777/mcp-todoist)
- **MCP Protocol**: [https://modelcontextprotocol.io](https://modelcontextprotocol.io)
- **Todoist API**: [https://developer.todoist.com](https://developer.todoist.com)

## 🤝 コントリビューション

プルリクエスト、イシュー報告、機能提案を歓迎します！

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

**🎯 AIでタスク管理を革新しよう！** 