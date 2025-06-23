# Cursor MCP導入ガイド

このガイドでは、mcp-todoistをCursorに導入する方法を説明します。

## 📋 前提条件

- **Node.js**: v18以上
- **tsx**: TypeScript実行環境
- **Cursor IDE**: 最新版
- **Todoist APIトークン**: [Todoist App Console](https://developer.todoist.com/appconsole.html)で取得

## 🚀 導入手順

### 1. 依存関係のインストール

```bash
# tsxがインストールされていない場合
npm install -g tsx

# プロジェクトの依存関係をインストール
cd /path/to/mcp-todoist
npm install
```

### 2. Cursor MCP設定ファイルの作成

`~/.cursor/mcp.json` ファイルを作成または編集します：

```json
{
  "mcpServers": {
    "mcp-todoist": {
      "command": "tsx",
      "args": ["/Users/taroken/src/git/mcp-todoist/script/run-mcp-server.ts"],
      "env": {
        "TODOIST_API_TOKEN": "your-todoist-api-token-here"
      }
    }
  }
}
```

**重要**: 
- `args`のパスを実際のプロジェクトパスに変更してください
- `TODOIST_API_TOKEN`を実際のAPIトークンに置き換えてください

### 3. Cursorの再起動

設定を反映するため、Cursorを完全に再起動してください。

### 4. MCP接続の確認

1. Cursorを開く
2. `Ctrl+L` (または `Cmd+L`) でチャットを開く
3. MCP設定画面で `mcp-todoist` が表示されることを確認
4. 「Available Tools」セクションにTodoistツールが表示されることを確認

## 🛠️ 利用可能な機能

### タスク管理
- `todoist_get_tasks`: タスク一覧の取得
- `todoist_create_task`: 新しいタスクの作成
- `todoist_update_task`: タスクの更新・移動
- `todoist_close_task`: タスクの完了

### プロジェクト管理
- `todoist_get_projects`: プロジェクト一覧の取得
- `todoist_create_project`: 新しいプロジェクトの作成
- `todoist_update_project`: プロジェクトの更新
- `todoist_delete_project`: プロジェクトの削除

## 💬 使用例

Cursorのチャットで以下のように指示できます：

```
今日のタスクを確認して
```

```
「プロジェクト計画書作成」というタスクを「仕事」プロジェクトに作成して
```

```
完了したタスクをクローズして
```

```
新しいプロジェクト「新規事業」を作成して
```

## 🔧 トラブルシューティング

### MCPサーバーが表示されない場合

1. **設定ファイルの場所を確認**
   - macOS/Linux: `~/.cursor/mcp.json`
   - Windows: `%USERPROFILE%\.cursor\mcp.json`

2. **JSON形式の確認**
   ```bash
   # JSON形式が正しいかチェック
   cat ~/.cursor/mcp.json | jq .
   ```

3. **パスの確認**
   ```bash
   # スクリプトファイルが存在するか確認
   ls -la /path/to/mcp-todoist/script/run-mcp-server.ts
   ```

4. **tsxの確認**
   ```bash
   # tsxがインストールされているか確認
   which tsx
   ```

### APIトークンエラーの場合

1. [Todoist App Console](https://developer.todoist.com/appconsole.html)でトークンを再確認
2. 環境変数が正しく設定されているか確認
3. トークンに必要な権限があるか確認

### 接続エラーの場合

1. MCPサーバーが正常に起動しているか確認
2. Cursorのログを確認
3. ファイアウォール設定を確認

## 📝 設定ファイルの場所

- **グローバル設定**: `~/.cursor/mcp.json` (全プロジェクトで利用可能)
- **プロジェクト設定**: `.cursor/mcp.json` (特定プロジェクトのみ)

## 🔒 セキュリティ注意事項

- APIトークンは機密情報です。リポジトリにコミットしないでください
- プロジェクト設定を使用する場合は、`.cursor/` ディレクトリを `.gitignore` に追加することを推奨します

## 🆕 最新機能

- ✅ タスクの移動（インボックス↔プロジェクト間）
- ✅ プロジェクト間でのタスク移動
- ✅ 完全なプロジェクト管理機能
- ✅ エラーハンドリングの改善
- ✅ 詳細なエラー情報表示

## 📚 関連リンク

- [Todoist API Documentation](https://developer.todoist.com/rest/v2/)
- [Model Context Protocol](https://modelcontextprotocol.io/)
- [Cursor Documentation](https://docs.cursor.com/)

---

**注意**: このMCPサーバーはローカル環境で動作します。リモート開発環境では追加の設定が必要な場合があります。 