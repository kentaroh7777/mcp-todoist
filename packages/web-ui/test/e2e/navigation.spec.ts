import { test, expect } from '@playwright/test';

test.describe('ナビゲーション', () => {
  test('ホームページから各ページへのナビゲーション', async ({ page }) => {
    // ホームページに移動
    await page.goto('/');
    
    // ページタイトルを確認
    await expect(page.locator('h1')).toContainText('MCP Todoist WebUI');
    
    // 認証フォームが表示されることを確認
    await expect(page.locator('h2')).toContainText('サインイン');
  });

  test('テストページへの直接アクセス', async ({ page }) => {
    // テストページに直接移動
    await page.goto('/test');
    
    // MCPテスターが表示されることを確認
    await expect(page.locator('h1')).toContainText('MCP Tester');
  });

  test('ページ間のナビゲーション（ブラウザの戻る/進む）', async ({ page }) => {
    // ホームページから開始
    await page.goto('/');
    await expect(page.locator('h1')).toContainText('MCP Todoist WebUI');
    
    // テストページに移動
    await page.goto('/test');
    await expect(page.locator('h1')).toContainText('MCP Tester');
    
    // ブラウザの戻るボタン
    await page.goBack();
    await expect(page.locator('h1')).toContainText('MCP Todoist WebUI');
    
    // ブラウザの進むボタン
    await page.goForward();
    await expect(page.locator('h1')).toContainText('MCP Tester');
  });

  test('URLの検証', async ({ page }) => {
    // ホームページのURL確認
    await page.goto('/');
    expect(page.url()).toBe('http://localhost:3001/');
    
    // テストページのURL確認
    await page.goto('/test');
    expect(page.url()).toBe('http://localhost:3001/test');
  });

  test('存在しないページの404ハンドリング', async ({ page }) => {
    // 存在しないページにアクセス
    const response = await page.goto('/nonexistent-page');
    
    // 404ステータスまたはNext.jsの404ページが表示されることを確認
    expect(response?.status()).toBe(404);
  });

  test('ページタイトルの確認', async ({ page }) => {
    // ホームページのタイトル
    await page.goto('/');
    await expect(page).toHaveTitle(/MCP Todoist/);
    
    // テストページのタイトル
    await page.goto('/test');
    await expect(page).toHaveTitle(/MCP Todoist/);
  });

  test('メタタグの確認', async ({ page }) => {
    await page.goto('/');
    
    // viewport メタタグの確認
    const viewport = await page.locator('meta[name="viewport"]').getAttribute('content');
    expect(viewport).toContain('width=device-width');
    expect(viewport).toContain('initial-scale=1');
  });

  test('レスポンシブデザインの確認', async ({ page }) => {
    // デスクトップサイズ
    await page.setViewportSize({ width: 1200, height: 800 });
    await page.goto('/');
    await expect(page.locator('h1')).toBeVisible();
    
    // タブレットサイズ
    await page.setViewportSize({ width: 768, height: 1024 });
    await expect(page.locator('h1')).toBeVisible();
    
    // モバイルサイズ
    await page.setViewportSize({ width: 375, height: 667 });
    await expect(page.locator('h1')).toBeVisible();
  });
}); 

test.describe('ナビゲーション', () => {
  test('ホームページから各ページへのナビゲーション', async ({ page }) => {
    // ホームページに移動
    await page.goto('/');
    
    // ページタイトルを確認
    await expect(page.locator('h1')).toContainText('MCP Todoist WebUI');
    
    // 認証フォームが表示されることを確認
    await expect(page.locator('h2')).toContainText('サインイン');
  });

  test('テストページへの直接アクセス', async ({ page }) => {
    // テストページに直接移動
    await page.goto('/test');
    
    // MCPテスターが表示されることを確認
    await expect(page.locator('h1')).toContainText('MCP Tester');
  });

  test('ページ間のナビゲーション（ブラウザの戻る/進む）', async ({ page }) => {
    // ホームページから開始
    await page.goto('/');
    await expect(page.locator('h1')).toContainText('MCP Todoist WebUI');
    
    // テストページに移動
    await page.goto('/test');
    await expect(page.locator('h1')).toContainText('MCP Tester');
    
    // ブラウザの戻るボタン
    await page.goBack();
    await expect(page.locator('h1')).toContainText('MCP Todoist WebUI');
    
    // ブラウザの進むボタン
    await page.goForward();
    await expect(page.locator('h1')).toContainText('MCP Tester');
  });

  test('URLの検証', async ({ page }) => {
    // ホームページのURL確認
    await page.goto('/');
    expect(page.url()).toBe('http://localhost:3001/');
    
    // テストページのURL確認
    await page.goto('/test');
    expect(page.url()).toBe('http://localhost:3001/test');
  });

  test('存在しないページの404ハンドリング', async ({ page }) => {
    // 存在しないページにアクセス
    const response = await page.goto('/nonexistent-page');
    
    // 404ステータスまたはNext.jsの404ページが表示されることを確認
    expect(response?.status()).toBe(404);
  });

  test('ページタイトルの確認', async ({ page }) => {
    // ホームページのタイトル
    await page.goto('/');
    await expect(page).toHaveTitle(/MCP Todoist/);
    
    // テストページのタイトル
    await page.goto('/test');
    await expect(page).toHaveTitle(/MCP Todoist/);
  });

  test('メタタグの確認', async ({ page }) => {
    await page.goto('/');
    
    // viewport メタタグの確認
    const viewport = await page.locator('meta[name="viewport"]').getAttribute('content');
    expect(viewport).toContain('width=device-width');
    expect(viewport).toContain('initial-scale=1');
  });

  test('レスポンシブデザインの確認', async ({ page }) => {
    // デスクトップサイズ
    await page.setViewportSize({ width: 1200, height: 800 });
    await page.goto('/');
    await expect(page.locator('h1')).toBeVisible();
    
    // タブレットサイズ
    await page.setViewportSize({ width: 768, height: 1024 });
    await expect(page.locator('h1')).toBeVisible();
    
    // モバイルサイズ
    await page.setViewportSize({ width: 375, height: 667 });
    await expect(page.locator('h1')).toBeVisible();
  });
}); 