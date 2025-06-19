import { test, expect } from '@playwright/test';

test.describe('テストページ認証フロー', () => {
  test.beforeEach(async ({ page }) => {
    // テストページに移動
    await page.goto('/test');
  });

  test('未認証時にサインインが必要メッセージが表示される', async ({ page }) => {
    // ページタイトルの確認
    await expect(page.locator('h1')).toContainText('MCP Todoist - テスト');
    
    // サインインが必要なメッセージが表示されることを確認
    await expect(page.locator('text=サインインが必要です')).toBeVisible();
    
    // サインインボタンが表示されることを確認
    await expect(page.locator('button:has-text("サインイン")')).toBeVisible();
  });

  test('サインインボタンクリックで認証フローが開始される', async ({ page }) => {
    // サインインボタンをクリック
    await page.click('button:has-text("サインイン")');
    
    // Firebase認証UIまたはサインインモーダルが表示されることを確認
    await page.waitForTimeout(1000);
    
    // Firebase認証ウィジェットまたはモーダルの存在確認
    const hasFirebaseUI = await page.locator('[data-testid="firebase-auth"]').isVisible().catch(() => false);
    const hasSignInModal = await page.locator('.ant-modal:has-text("サインイン")').isVisible().catch(() => false);
    
    expect(hasFirebaseUI || hasSignInModal).toBeTruthy();
  });

  test('テストページで認証エラーが発生しないことを確認', async ({ page }) => {
    const errors: string[] = [];
    
    // コンソールエラーを監視
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    
    // テストページに移動
    await page.goto('/test');
    
    // 5秒待機してJavaScriptエラーが発生しないことを確認
    await page.waitForTimeout(5000);
    
    // 特定の修正されたエラーが発生していないことを確認
    const hasSessionIdError = errors.some(error => 
      error.includes('ArgumentValidationError') && 
      error.includes('sessionId')
    );
    
    expect(hasSessionIdError).toBeFalsy();
  });

  test('認証プロバイダーが正しく動作する', async ({ page }) => {
    // AuthProviderエラーが発生していないことを確認
    const authProviderError = await page.locator('text=useAuth must be used within an AuthProvider').isVisible().catch(() => false);
    expect(authProviderError).toBeFalsy();
    
    // 正常な認証フローのメッセージが表示されることを確認
    await expect(page.locator('text=サインインが必要です')).toBeVisible();
  });

  test('テストページの基本レイアウトが正しく表示される', async ({ page }) => {
    // ヘッダーの確認
    await expect(page.locator('header')).toBeVisible();
    await expect(page.locator('h1:has-text("MCP Todoist - テスト")')).toBeVisible();
    
    // メインコンテンツエリアの確認
    await expect(page.locator('main, [class*="ant-layout-content"]')).toBeVisible();
    
    // Ant Designのスタイルが適用されていることを確認
    const hasAntStyles = await page.locator('.ant-layout').isVisible();
    expect(hasAntStyles).toBeTruthy();
  });
});
