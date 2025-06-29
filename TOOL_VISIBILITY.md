# ツール可視性設定ガイド

## 概要

MCP Todoistサーバーでは、各ツールの公開・非公開を簡単に設定できます。
この機能により、セキュリティや用途に応じて特定の機能へのアクセスを制限できます。

## 設定方法

### 設定ファイルの場所
`packages/mcp-server/server/mcp-handler.ts` の上部にある `TOOL_VISIBILITY` 設定オブジェクト

### 設定値
- `true`: ツールを公開（利用可能）
- `false`: ツールを非公開（利用不可）

```typescript
const TOOL_VISIBILITY = {
  todoist_get_tasks: true,        // 公開
  todoist_create_task: true,      // 公開
  todoist_update_task: true,      // 公開
  todoist_close_task: true,       // 公開
  todoist_get_projects: true,     // 公開
  todoist_create_project: false,  // 非公開
  todoist_update_project: false,  // 非公開
  todoist_delete_project: false,  // 非公開
  todoist_move_task: true,        // 公開
} as const
```

### 現在の設定

**公開ツール（利用可能）:**
- `todoist_get_tasks`: タスクの取得
- `todoist_create_task`: タスクの作成
- `todoist_update_task`: タスクの更新
- `todoist_close_task`: タスクの完了
- `todoist_get_projects`: プロジェクトの取得
- `todoist_move_task`: タスクの移動

**非公開ツール（利用不可）:**
- `todoist_create_project`: プロジェクトの作成
- `todoist_update_project`: プロジェクトの更新
- `todoist_delete_project`: プロジェクトの削除

## 動作

### 公開ツール
- `tools/list` APIで一覧に表示される
- `tools/call` APIで呼び出し可能

### 非公開ツール
- `tools/list` APIで一覧に表示されない
- `tools/call` APIで呼び出すと "Tool not found" エラー

## 設定変更手順

1. `packages/mcp-server/server/mcp-handler.ts` を編集
2. `TOOL_VISIBILITY` オブジェクトで目的のツールの値を変更
3. MCPサーバーを再起動

### 例：プロジェクト作成を有効にする

```typescript
const TOOL_VISIBILITY = {
  // ... 他の設定 ...
  todoist_create_project: true,  // false → true に変更
  // ... 他の設定 ...
} as const
```

## テスト

ツールの可視性設定は自動テストでカバーされています：

```bash
# MCPハンドラーのテストを実行
npm test -- test/mcp-handler.test.ts

# 特定の可視性テストのみ実行
npm test -- test/mcp-handler.test.ts -t "tool visibility"
```

## セキュリティ考慮事項

- プロジェクトの作成・更新・削除は重要な操作のため、デフォルトで非公開に設定
- 本番環境では必要最小限のツールのみを公開することを推奨
- 設定変更後は必ずテストを実行して動作確認を行う 