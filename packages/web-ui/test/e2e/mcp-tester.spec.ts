import { test, expect } from '@playwright/test';

test.describe('MCPテスター画面', () => {
  test.beforeEach(async ({ page }) => {
    // テストページに移動
    await page.goto('/test');
  });

  test('MCP Tester画面の基本要素が表示される', async ({ page }) => {
    // ページタイトルを確認
    await expect(page.locator('h1')).toContainText('MCP Tester');
    
    // 接続セクションを確認
    await expect(page.locator('h3')).toContainText('接続');
    await expect(page.locator('input[placeholder="例: convex://mcp-todoist"]')).toBeVisible();
    await expect(page.locator('button')).toContainText('接続');
    
    // 状態セクションを確認
    await expect(page.locator('text=状態')).toBeVisible();
  });

  test('接続状態の表示', async ({ page }) => {
    // デフォルトでConvexMCP設定が表示されることを確認
    await expect(page.locator('text=Convex MCP')).toBeVisible();
    await expect(page.locator('text=セッション: アクティブ')).toBeVisible();
    await expect(page.locator('text=同期: リアルタイム')).toBeVisible();
  });

  test('サーバーURL入力と接続', async ({ page }) => {
    // サーバーURLを入力
    const serverUrlInput = page.locator('input[placeholder="例: convex://mcp-todoist"]');
    await serverUrlInput.clear();
    await serverUrlInput.fill('convex://test-deployment');
    
    // 接続ボタンをクリック
    await page.click('button:has-text("接続")');
    
    // 接続処理が開始されることを確認
    await expect(page.locator('.ant-spin')).toBeVisible();
  });

  test('タブナビゲーションの動作', async ({ page }) => {
    // デフォルトで初期化タブが選択されていることを確認
    await expect(page.locator('[role="tab"][aria-selected="true"]')).toContainText('初期化');
    
    // ツールタブをクリック
    await page.click('[role="tab"]:has-text("ツール")');
    await expect(page.locator('[role="tab"][aria-selected="true"]')).toContainText('ツール');
    
    // リソースタブをクリック
    await page.click('[role="tab"]:has-text("リソース")');
    await expect(page.locator('[role="tab"][aria-selected="true"]')).toContainText('リソース');
    
    // プロンプトタブをクリック
    await page.click('[role="tab"]:has-text("プロンプト")');
    await expect(page.locator('[role="tab"][aria-selected="true"]')).toContainText('プロンプト');
  });

  test('初期化タブのコンテンツ', async ({ page }) => {
    // 初期化タブを確認
    await page.click('[role="tab"]:has-text("初期化")');
    
    // 初期化ボタンを確認
    await expect(page.locator('button:has-text("初期化")')).toBeVisible();
    
    // 初期化を実行
    await page.click('button:has-text("初期化")');
    
    // レスポンス表示エリアが更新されることを確認
    await expect(page.locator('.ant-typography pre')).toBeVisible();
  });

  test('ツールタブの操作', async ({ page }) => {
    // ツールタブに移動
    await page.click('[role="tab"]:has-text("ツール")');
    
    // ツール一覧ボタンを確認
    await expect(page.locator('button:has-text("ツール一覧")')).toBeVisible();
    
    // ツール一覧を取得
    await page.click('button:has-text("ツール一覧")');
    
    // レスポンスが表示されることを確認
    await expect(page.locator('.ant-typography pre')).toBeVisible();
  });

  test('ツール実行フォーム', async ({ page }) => {
    // ツールタブに移動
    await page.click('[role="tab"]:has-text("ツール")');
    
    // ツール実行セクションを確認
    await expect(page.locator('h4:has-text("ツール実行")')).toBeVisible();
    await expect(page.locator('input[placeholder="ツール名"]')).toBeVisible();
    await expect(page.locator('textarea[placeholder="引数 (JSON)"]')).toBeVisible();
    await expect(page.locator('button:has-text("実行")')).toBeVisible();
    
    // ツール実行フォームに入力
    await page.fill('input[placeholder="ツール名"]', 'get_tasks');
    await page.fill('textarea[placeholder="引数 (JSON)"]', '{"filter": {"completed": false}}');
    
    // 実行ボタンをクリック
    await page.click('button:has-text("実行")');
    
    // レスポンスが表示されることを確認
    await expect(page.locator('.ant-typography pre')).toBeVisible();
  });

  test('リソースタブの操作', async ({ page }) => {
    // リソースタブに移動
    await page.click('[role="tab"]:has-text("リソース")');
    
    // リソース一覧ボタンを確認
    await expect(page.locator('button:has-text("リソース一覧")')).toBeVisible();
    
    // リソース一覧を取得
    await page.click('button:has-text("リソース一覧")');
    
    // レスポンスが表示されることを確認
    await expect(page.locator('.ant-typography pre')).toBeVisible();
  });

  test('リソース読み取りフォーム', async ({ page }) => {
    // リソースタブに移動
    await page.click('[role="tab"]:has-text("リソース")');
    
    // リソース読み取りセクションを確認
    await expect(page.locator('h4:has-text("リソース読み取り")')).toBeVisible();
    await expect(page.locator('input[placeholder="リソースURI"]')).toBeVisible();
    await expect(page.locator('button:has-text("読み取り")')).toBeVisible();
    
    // リソース読み取りフォームに入力
    await page.fill('input[placeholder="リソースURI"]', 'todoist://tasks');
    
    // 読み取りボタンをクリック
    await page.click('button:has-text("読み取り")');
    
    // レスポンスが表示されることを確認
    await expect(page.locator('.ant-typography pre')).toBeVisible();
  });

  test('プロンプトタブの操作', async ({ page }) => {
    // プロンプトタブに移動
    await page.click('[role="tab"]:has-text("プロンプト")');
    
    // プロンプト一覧ボタンを確認
    await expect(page.locator('button:has-text("プロンプト一覧")')).toBeVisible();
    
    // プロンプト一覧を取得
    await page.click('button:has-text("プロンプト一覧")');
    
    // レスポンスが表示されることを確認
    await expect(page.locator('.ant-typography pre')).toBeVisible();
  });

  test('プロンプト取得フォーム', async ({ page }) => {
    // プロンプトタブに移動
    await page.click('[role="tab"]:has-text("プロンプト")');
    
    // プロンプト取得セクションを確認
    await expect(page.locator('h4:has-text("プロンプト取得")')).toBeVisible();
    await expect(page.locator('input[placeholder="プロンプト名"]')).toBeVisible();
    await expect(page.locator('textarea[placeholder="引数 (JSON)"]')).toBeVisible();
    await expect(page.locator('button:has-text("取得")')).toBeVisible();
    
    // プロンプト取得フォームに入力
    await page.fill('input[placeholder="プロンプト名"]', 'task_management');
    await page.fill('textarea[placeholder="引数 (JSON)"]', '{"task_ids": ["123", "456"]}');
    
    // 取得ボタンをクリック
    await page.click('button:has-text("取得")');
    
    // レスポンスが表示されることを確認
    await expect(page.locator('.ant-typography pre')).toBeVisible();
  });

  test('エラーハンドリングの確認', async ({ page }) => {
    // ツールタブに移動
    await page.click('[role="tab"]:has-text("ツール")');
    
    // 無効なJSONを入力
    await page.fill('input[placeholder="ツール名"]', 'invalid_tool');
    await page.fill('textarea[placeholder="引数 (JSON)"]', '{"invalid": json}');
    
    // 実行ボタンをクリック
    await page.click('button:has-text("実行")');
    
    // エラーメッセージまたはエラーレスポンスが表示されることを確認
    await expect(page.locator('.ant-typography pre')).toBeVisible();
  });

  test('レスポンス表示の更新', async ({ page }) => {
    // 初期化を実行
    await page.click('[role="tab"]:has-text("初期化")');
    await page.click('button:has-text("初期化")');
    
    // レスポンスが表示されることを確認
    const responseArea = page.locator('.ant-typography pre');
    await expect(responseArea).toBeVisible();
    
    // 別の操作を実行
    await page.click('[role="tab"]:has-text("ツール")');
    await page.click('button:has-text("ツール一覧")');
    
    // レスポンスが更新されることを確認
    await expect(responseArea).toBeVisible();
  });
}); 

test.describe('MCPテスター画面', () => {
  test.beforeEach(async ({ page }) => {
    // テストページに移動
    await page.goto('/test');
  });

  test('MCP Tester画面の基本要素が表示される', async ({ page }) => {
    // ページタイトルを確認
    await expect(page.locator('h1')).toContainText('MCP Tester');
    
    // 接続セクションを確認
    await expect(page.locator('h3')).toContainText('接続');
    await expect(page.locator('input[placeholder="例: convex://mcp-todoist"]')).toBeVisible();
    await expect(page.locator('button')).toContainText('接続');
    
    // 状態セクションを確認
    await expect(page.locator('text=状態')).toBeVisible();
  });

  test('接続状態の表示', async ({ page }) => {
    // デフォルトでConvexMCP設定が表示されることを確認
    await expect(page.locator('text=Convex MCP')).toBeVisible();
    await expect(page.locator('text=セッション: アクティブ')).toBeVisible();
    await expect(page.locator('text=同期: リアルタイム')).toBeVisible();
  });

  test('サーバーURL入力と接続', async ({ page }) => {
    // サーバーURLを入力
    const serverUrlInput = page.locator('input[placeholder="例: convex://mcp-todoist"]');
    await serverUrlInput.clear();
    await serverUrlInput.fill('convex://test-deployment');
    
    // 接続ボタンをクリック
    await page.click('button:has-text("接続")');
    
    // 接続処理が開始されることを確認
    await expect(page.locator('.ant-spin')).toBeVisible();
  });

  test('タブナビゲーションの動作', async ({ page }) => {
    // デフォルトで初期化タブが選択されていることを確認
    await expect(page.locator('[role="tab"][aria-selected="true"]')).toContainText('初期化');
    
    // ツールタブをクリック
    await page.click('[role="tab"]:has-text("ツール")');
    await expect(page.locator('[role="tab"][aria-selected="true"]')).toContainText('ツール');
    
    // リソースタブをクリック
    await page.click('[role="tab"]:has-text("リソース")');
    await expect(page.locator('[role="tab"][aria-selected="true"]')).toContainText('リソース');
    
    // プロンプトタブをクリック
    await page.click('[role="tab"]:has-text("プロンプト")');
    await expect(page.locator('[role="tab"][aria-selected="true"]')).toContainText('プロンプト');
  });

  test('初期化タブのコンテンツ', async ({ page }) => {
    // 初期化タブを確認
    await page.click('[role="tab"]:has-text("初期化")');
    
    // 初期化ボタンを確認
    await expect(page.locator('button:has-text("初期化")')).toBeVisible();
    
    // 初期化を実行
    await page.click('button:has-text("初期化")');
    
    // レスポンス表示エリアが更新されることを確認
    await expect(page.locator('.ant-typography pre')).toBeVisible();
  });

  test('ツールタブの操作', async ({ page }) => {
    // ツールタブに移動
    await page.click('[role="tab"]:has-text("ツール")');
    
    // ツール一覧ボタンを確認
    await expect(page.locator('button:has-text("ツール一覧")')).toBeVisible();
    
    // ツール一覧を取得
    await page.click('button:has-text("ツール一覧")');
    
    // レスポンスが表示されることを確認
    await expect(page.locator('.ant-typography pre')).toBeVisible();
  });

  test('ツール実行フォーム', async ({ page }) => {
    // ツールタブに移動
    await page.click('[role="tab"]:has-text("ツール")');
    
    // ツール実行セクションを確認
    await expect(page.locator('h4:has-text("ツール実行")')).toBeVisible();
    await expect(page.locator('input[placeholder="ツール名"]')).toBeVisible();
    await expect(page.locator('textarea[placeholder="引数 (JSON)"]')).toBeVisible();
    await expect(page.locator('button:has-text("実行")')).toBeVisible();
    
    // ツール実行フォームに入力
    await page.fill('input[placeholder="ツール名"]', 'get_tasks');
    await page.fill('textarea[placeholder="引数 (JSON)"]', '{"filter": {"completed": false}}');
    
    // 実行ボタンをクリック
    await page.click('button:has-text("実行")');
    
    // レスポンスが表示されることを確認
    await expect(page.locator('.ant-typography pre')).toBeVisible();
  });

  test('リソースタブの操作', async ({ page }) => {
    // リソースタブに移動
    await page.click('[role="tab"]:has-text("リソース")');
    
    // リソース一覧ボタンを確認
    await expect(page.locator('button:has-text("リソース一覧")')).toBeVisible();
    
    // リソース一覧を取得
    await page.click('button:has-text("リソース一覧")');
    
    // レスポンスが表示されることを確認
    await expect(page.locator('.ant-typography pre')).toBeVisible();
  });

  test('リソース読み取りフォーム', async ({ page }) => {
    // リソースタブに移動
    await page.click('[role="tab"]:has-text("リソース")');
    
    // リソース読み取りセクションを確認
    await expect(page.locator('h4:has-text("リソース読み取り")')).toBeVisible();
    await expect(page.locator('input[placeholder="リソースURI"]')).toBeVisible();
    await expect(page.locator('button:has-text("読み取り")')).toBeVisible();
    
    // リソース読み取りフォームに入力
    await page.fill('input[placeholder="リソースURI"]', 'todoist://tasks');
    
    // 読み取りボタンをクリック
    await page.click('button:has-text("読み取り")');
    
    // レスポンスが表示されることを確認
    await expect(page.locator('.ant-typography pre')).toBeVisible();
  });

  test('プロンプトタブの操作', async ({ page }) => {
    // プロンプトタブに移動
    await page.click('[role="tab"]:has-text("プロンプト")');
    
    // プロンプト一覧ボタンを確認
    await expect(page.locator('button:has-text("プロンプト一覧")')).toBeVisible();
    
    // プロンプト一覧を取得
    await page.click('button:has-text("プロンプト一覧")');
    
    // レスポンスが表示されることを確認
    await expect(page.locator('.ant-typography pre')).toBeVisible();
  });

  test('プロンプト取得フォーム', async ({ page }) => {
    // プロンプトタブに移動
    await page.click('[role="tab"]:has-text("プロンプト")');
    
    // プロンプト取得セクションを確認
    await expect(page.locator('h4:has-text("プロンプト取得")')).toBeVisible();
    await expect(page.locator('input[placeholder="プロンプト名"]')).toBeVisible();
    await expect(page.locator('textarea[placeholder="引数 (JSON)"]')).toBeVisible();
    await expect(page.locator('button:has-text("取得")')).toBeVisible();
    
    // プロンプト取得フォームに入力
    await page.fill('input[placeholder="プロンプト名"]', 'task_management');
    await page.fill('textarea[placeholder="引数 (JSON)"]', '{"task_ids": ["123", "456"]}');
    
    // 取得ボタンをクリック
    await page.click('button:has-text("取得")');
    
    // レスポンスが表示されることを確認
    await expect(page.locator('.ant-typography pre')).toBeVisible();
  });

  test('エラーハンドリングの確認', async ({ page }) => {
    // ツールタブに移動
    await page.click('[role="tab"]:has-text("ツール")');
    
    // 無効なJSONを入力
    await page.fill('input[placeholder="ツール名"]', 'invalid_tool');
    await page.fill('textarea[placeholder="引数 (JSON)"]', '{"invalid": json}');
    
    // 実行ボタンをクリック
    await page.click('button:has-text("実行")');
    
    // エラーメッセージまたはエラーレスポンスが表示されることを確認
    await expect(page.locator('.ant-typography pre')).toBeVisible();
  });

  test('レスポンス表示の更新', async ({ page }) => {
    // 初期化を実行
    await page.click('[role="tab"]:has-text("初期化")');
    await page.click('button:has-text("初期化")');
    
    // レスポンスが表示されることを確認
    const responseArea = page.locator('.ant-typography pre');
    await expect(responseArea).toBeVisible();
    
    // 別の操作を実行
    await page.click('[role="tab"]:has-text("ツール")');
    await page.click('button:has-text("ツール一覧")');
    
    // レスポンスが更新されることを確認
    await expect(responseArea).toBeVisible();
  });
}); 