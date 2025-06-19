import { test, expect } from '@playwright/test';

test.describe('認証フロー', () => {
  test.beforeEach(async ({ page }) => {
    // メインページに移動
    await page.goto('/');
  });

  test('初期状態ではサインインフォームが表示される', async ({ page }) => {
    // サインインフォームの要素を確認
    await expect(page.locator('h2')).toContainText('サインイン');
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toContainText('サインイン');
  });

  test('サインアップフォームに切り替えできる', async ({ page }) => {
    // サインアップタブをクリック
    await page.click('[role="tab"]:has-text("サインアップ")');
    
    // サインアップフォームの要素を確認
    await expect(page.locator('h2')).toContainText('サインアップ');
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
    await expect(page.locator('input[name="confirmPassword"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toContainText('サインアップ');
  });

  test('無効なメールアドレスでエラーが表示される', async ({ page }) => {
    // 無効なメールアドレスを入力
    await page.fill('input[name="email"]', 'invalid-email');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');

    // エラーメッセージの確認
    await expect(page.locator('.ant-form-item-explain-error')).toBeVisible();
  });

  test('パスワードが短すぎる場合のエラー', async ({ page }) => {
    // 短いパスワードを入力
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', '123');
    await page.click('button[type="submit"]');

    // エラーメッセージの確認
    await expect(page.locator('.ant-form-item-explain-error')).toBeVisible();
  });

  test('サインアップでパスワード確認が一致しない場合のエラー', async ({ page }) => {
    // サインアップタブに切り替え
    await page.click('[role="tab"]:has-text("サインアップ")');
    
    // パスワード確認が一致しない状態で入力
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'password123');
    await page.fill('input[name="confirmPassword"]', 'password456');
    await page.click('button[type="submit"]');

    // エラーメッセージの確認
    await expect(page.locator('.ant-form-item-explain-error')).toBeVisible();
  });

  test('ローディング状態の表示', async ({ page }) => {
    // 有効な認証情報を入力
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'password123');
    
    // フォーム送信をクリック
    await page.click('button[type="submit"]');
    
    // ローディングスピナーが表示されることを確認
    await expect(page.locator('.ant-spin')).toBeVisible();
  });
}); 

test.describe('認証フロー', () => {
  test.beforeEach(async ({ page }) => {
    // メインページに移動
    await page.goto('/');
  });

  test('初期状態ではサインインフォームが表示される', async ({ page }) => {
    // サインインフォームの要素を確認
    await expect(page.locator('h2')).toContainText('サインイン');
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toContainText('サインイン');
  });

  test('サインアップフォームに切り替えできる', async ({ page }) => {
    // サインアップタブをクリック
    await page.click('[role="tab"]:has-text("サインアップ")');
    
    // サインアップフォームの要素を確認
    await expect(page.locator('h2')).toContainText('サインアップ');
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
    await expect(page.locator('input[name="confirmPassword"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toContainText('サインアップ');
  });

  test('無効なメールアドレスでエラーが表示される', async ({ page }) => {
    // 無効なメールアドレスを入力
    await page.fill('input[name="email"]', 'invalid-email');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');

    // エラーメッセージの確認
    await expect(page.locator('.ant-form-item-explain-error')).toBeVisible();
  });

  test('パスワードが短すぎる場合のエラー', async ({ page }) => {
    // 短いパスワードを入力
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', '123');
    await page.click('button[type="submit"]');

    // エラーメッセージの確認
    await expect(page.locator('.ant-form-item-explain-error')).toBeVisible();
  });

  test('サインアップでパスワード確認が一致しない場合のエラー', async ({ page }) => {
    // サインアップタブに切り替え
    await page.click('[role="tab"]:has-text("サインアップ")');
    
    // パスワード確認が一致しない状態で入力
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'password123');
    await page.fill('input[name="confirmPassword"]', 'password456');
    await page.click('button[type="submit"]');

    // エラーメッセージの確認
    await expect(page.locator('.ant-form-item-explain-error')).toBeVisible();
  });

  test('ローディング状態の表示', async ({ page }) => {
    // 有効な認証情報を入力
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'password123');
    
    // フォーム送信をクリック
    await page.click('button[type="submit"]');
    
    // ローディングスピナーが表示されることを確認
    await expect(page.locator('.ant-spin')).toBeVisible();
  });
}); 