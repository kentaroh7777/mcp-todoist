import { test, expect, Page } from '@playwright/test';

test.describe('useMutation Test', () => {
  let consoleLogs: string[] = [];
  
  test.beforeEach(async ({ page }) => {
    // コンソールログをキャプチャ
    consoleLogs = [];
    page.on('console', msg => {
      const logMessage = `[${msg.type().toUpperCase()}] ${msg.text()}`;
      consoleLogs.push(logMessage);
      console.log(logMessage);
    });
    
    // ページエラーをキャプチャ
    page.on('pageerror', error => {
      console.error('Page error:', error.message);
    });
  });

  test('useMutation parameter transmission test', async ({ page }) => {
    // アプリケーションにアクセス
    await page.goto('http://localhost:5173');
    
    // ページがロードされるまで待機
    await expect(page.locator('h1')).toContainText('useMutation Test');
    
    // フォーム要素を取得
    const messageInput = page.locator('input[type="text"]').first();
    const authorInput = page.locator('input[type="text"]').nth(1);
    const submitButton = page.locator('button[type="submit"]');
    
    // フォームに値を入力
    const testMessage = 'テストメッセージ';
    const testAuthor = 'テスト太郎';
    
    await messageInput.fill(testMessage);
    await authorInput.fill(testAuthor);
    
    console.log('\n=== フォーム送信前の状態 ===');
    console.log(`メッセージ入力値: ${await messageInput.inputValue()}`);
    console.log(`作者入力値: ${await authorInput.inputValue()}`);
    
    // フォームを送信
    console.log('\n=== フォーム送信実行 ===');
    await submitButton.click();
    
    // 少し待機してログを確認
    await page.waitForTimeout(3000);
    
    console.log('\n=== キャプチャされたコンソールログ ===');
    consoleLogs.forEach(log => console.log(log));
    
    // クライアント側のログを確認
    const clientLogs = consoleLogs.filter(log => log.includes('[CLIENT]'));
    console.log('\n=== クライアント側ログ ===');
    clientLogs.forEach(log => console.log(log));
    
    // パラメータ送信ログを確認
    const paramLog = clientLogs.find(log => log.includes('About to call useMutation with params'));
    expect(paramLog).toBeDefined();
    console.log('\n=== パラメータ送信ログ ===');
    console.log(paramLog);
    
    // 結果ログを確認
    const resultLog = clientLogs.find(log => log.includes('useMutation result'));
    if (resultLog) {
      console.log('\n=== 結果ログ ===');
      console.log(resultLog);
    }
    
    // エラーログを確認
    const errorLog = clientLogs.find(log => log.includes('useMutation error'));
    if (errorLog) {
      console.log('\n=== エラーログ ===');
      console.log(errorLog);
    }
    
    // フォームがリセットされたかを確認
    await expect(messageInput).toHaveValue('');
    await expect(authorInput).toHaveValue('');
    
    // メッセージ一覧に新しいメッセージが追加されたかを確認
    await expect(page.locator('li')).toContainText(testMessage);
    await expect(page.locator('li')).toContainText(testAuthor);
    
    console.log('\n=== テスト完了 ===');
    console.log('✅ useMutation parameter transmission test passed');
  });
});
