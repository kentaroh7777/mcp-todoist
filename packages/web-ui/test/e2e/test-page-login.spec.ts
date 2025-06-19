import { test, expect } from '@playwright/test';

test.describe('テストページ ログインフロー', () => {
  
  test.beforeEach(async ({ page }) => {
    console.log('[DEBUG] テストページに移動します');
    // テストページに移動
    await page.goto('/test');
  });

  test('正常系: 有効な認証情報でログインできる', async ({ page }) => {
    console.log('[DEBUG] Step1: 未認証状態の確認を開始します');
    
    // Step1: 未認証状態の確認
    await expect(page.locator('h1')).toContainText('MCP Todoist - テスト');
    await expect(page.locator('text=認証が必要です')).toBeVisible();
    await expect(page.locator('text=サインインが必要です')).toBeVisible();
    
    console.log('[DEBUG] Step2: 認証フォームの確認を開始します');
    
    // Step2: 認証フォームの確認
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
    
    console.log('[DEBUG] Step3: 有効な認証情報を入力します');
    
    // Step3: 有効な認証情報を入力
    const testEmail = 'test@example.com';
    const testPassword = 'password123';
    
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', testPassword);
    
    console.log('[DEBUG] Step4: サインインボタンをクリックします');
    
    // Step4: サインインを実行
    await page.click('button[type="submit"]');
    
    console.log('[DEBUG] Step5: ローディング状態を確認します');
    
    // Step5: ローディング状態の確認
    await expect(page.locator('button[type="submit"]')).toHaveText(/Signing In.../);
    
    console.log('[DEBUG] Step6: ログイン成功後の画面を確認します');
    
    // Step6: ログイン成功後の画面確認（最大10秒待機）
    await expect(page.locator('text=認証成功')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=MCP Todoist テスター')).toBeVisible();
    await expect(page.locator(`text=${testEmail} でサインインしています`)).toBeVisible();
    await expect(page.locator('button:has-text("サインアウト")')).toBeVisible();
    
    console.log('[DEBUG] テストが正常に完了しました');
  });

  test('正常系: ログイン後にサインアウトできる', async ({ page }) => {
    console.log('[DEBUG] 事前条件: ログインを実行します');
    
    // 事前条件: ログイン
    const testEmail = 'test@example.com';
    const testPassword = 'password123';
    
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', testPassword);
    await page.click('button[type="submit"]');
    
    // ログイン成功を確認
    await expect(page.locator('text=認証成功')).toBeVisible({ timeout: 10000 });
    
    console.log('[DEBUG] サインアウトボタンをクリックします');
    
    // サインアウトを実行
    await page.click('button:has-text("サインアウト")');
    
    console.log('[DEBUG] サインアウト後の状態を確認します');
    
    // サインアウト後の状態確認
    await expect(page.locator('text=認証が必要です')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=サインインが必要です')).toBeVisible();
    await expect(page.locator('input[name="email"]')).toBeVisible();
    
    console.log('[DEBUG] サインアウトテストが正常に完了しました');
  });

  test('異常系: 無効なメールアドレスでエラーが表示される', async ({ page }) => {
    console.log('[DEBUG] 無効なメールアドレスを入力します');
    
    // 無効なメールアドレスを入力
    await page.fill('input[name="email"]', 'invalid-email');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');

    console.log('[DEBUG] エラーメッセージの表示を確認します');
    
    // エラーメッセージの確認
    await expect(page.locator('.ant-form-item-explain-error')).toBeVisible();
    
    console.log('[DEBUG] 無効メールテストが正常に完了しました');
  });

  test('異常系: 短すぎるパスワードでエラーが表示される', async ({ page }) => {
    console.log('[DEBUG] 短いパスワードを入力します');
    
    // 短いパスワードを入力
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', '12');
    await page.click('button[type="submit"]');

    console.log('[DEBUG] エラーメッセージの表示を確認します');
    
    // エラーメッセージの確認（バリデーションエラーまたは認証エラー）
    const hasValidationError = await page.locator('.ant-form-item-explain-error').isVisible();
    const hasAlertError = await page.locator('.ant-alert-error').isVisible();
    
    expect(hasValidationError || hasAlertError).toBeTruthy();
    
    console.log('[DEBUG] 短いパスワードテストが正常に完了しました');
  });

  test('異常系: 存在しないアカウントでエラーが表示される', async ({ page }) => {
    console.log('[DEBUG] 存在しないアカウントの認証情報を入力します');
    
    // 存在しないアカウントの認証情報を入力
    await page.fill('input[name="email"]', 'nonexistent@example.com');
    await page.fill('input[name="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');

    console.log('[DEBUG] 認証エラーメッセージの表示を確認します');
    
    // 認証エラーメッセージの確認（最大5秒待機）
    await expect(page.locator('.ant-alert-error')).toBeVisible({ timeout: 5000 });
    
    console.log('[DEBUG] 存在しないアカウントテストが正常に完了しました');
  });

  test('UI確認: テストページの基本レイアウトが正しく表示される', async ({ page }) => {
    console.log('[DEBUG] ページレイアウトの確認を開始します');
    
    // ヘッダーの確認
    await expect(page.locator('header')).toBeVisible();
    await expect(page.locator('h1:has-text("MCP Todoist - テスト")')).toBeVisible();
    
    // メインコンテンツエリアの確認
    await expect(page.locator('.ant-layout-content')).toBeVisible();
    
    // 認証カードの確認
    await expect(page.locator('.ant-card:has-text("認証が必要です")')).toBeVisible();
    
    // Ant Designのスタイルが適用されていることを確認
    const hasAntStyles = await page.locator('.ant-layout').isVisible();
    expect(hasAntStyles).toBeTruthy();
    
    console.log('[DEBUG] レイアウト確認テストが正常に完了しました');
  });
}); 