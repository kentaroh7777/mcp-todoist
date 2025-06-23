import { test, expect } from '@playwright/test';

test.describe('MCP接続エラーデバッグ', () => {
  test('接続エラーの詳細を収集する', async ({ page }) => {
    const logs: string[] = [];
    const errors: string[] = [];

    // ブラウザコンソールログを収集
    page.on('console', (msg) => {
      const log = `[${msg.type()}] ${msg.text()}`;
      logs.push(log);
      console.log(`[DEBUG LOG] ${log}`);
    });

    // JavaScript エラーを収集
    page.on('pageerror', (error) => {
      const errorMsg = `[PAGE ERROR] ${error.message}`;
      errors.push(errorMsg);
      console.log(`[DEBUG ERROR] ${errorMsg}`);
    });

    // ネットワークエラーを収集
    page.on('requestfailed', (request) => {
      const failMsg = `[NETWORK FAIL] ${request.method()} ${request.url()} - ${request.failure()?.errorText}`;
      errors.push(failMsg);
      console.log(`[DEBUG NETWORK] ${failMsg}`);
    });

    // ページに移動
    await page.goto('/test');
    
    // 基本表示の確認
    await expect(page.locator('h1')).toContainText('MCP Todoist');
    await expect(page.locator('text=未接続')).toBeVisible();
    
    console.log('[DEBUG] 接続ボタンをクリックします...');
    
    // 接続ボタンをクリック
    const connectButton = page.locator('button').filter({ hasText: /接\s*続/ });
    await expect(connectButton).toBeVisible();
    await connectButton.click();

    console.log('[DEBUG] 接続処理開始後、エラー表示まで待機...');

    // エラー表示を待機 (30秒タイムアウト)
    try {
      await expect(page.locator('text=エラー')).toBeVisible({ timeout: 30000 });
      console.log('[DEBUG] エラー表示を検出しました');
    } catch (e) {
      console.log('[DEBUG] エラー表示のタイムアウト、他の状態変化を確認...');
    }

    // 5秒追加待機（非同期処理の完了を待つ）
    await page.waitForTimeout(5000);

    // エラーメッセージの詳細を取得
    const errorMessages = await page.locator('.ant-alert-error, .ant-message-error, [class*="error"]').allTextContents();
    
    console.log('[DEBUG] ===========================================');
    console.log('[DEBUG] 収集されたログ:');
    logs.forEach(log => console.log(log));
    
    console.log('[DEBUG] ===========================================');
    console.log('[DEBUG] 収集されたエラー:');
    errors.forEach(error => console.log(error));
    
    console.log('[DEBUG] ===========================================');
    console.log('[DEBUG] UI表示されたエラーメッセージ:');
    errorMessages.forEach(msg => console.log(`[UI ERROR] ${msg}`));
    
    console.log('[DEBUG] ===========================================');

    // 現在のページの状態をスクリーンショット
    await page.screenshot({ path: 'test-results/connection-error-debug.png', fullPage: true });
    
    // 接続状態の詳細を確認
    const connectionStatus = await page.locator('.ant-badge-status-text').textContent();
    console.log(`[DEBUG] 接続状態: ${connectionStatus}`);
    
    // 追加情報を出力
    console.log('[DEBUG] テスト完了。エラー詳細は上記ログを確認してください。');
  });
}); 