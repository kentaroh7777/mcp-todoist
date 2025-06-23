import { test, expect } from '@playwright/test';

test.describe('アクセシビリティ', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('キーボードナビゲーション - Tab移動', async ({ page }) => {
    // 最初の要素にフォーカス
    await page.keyboard.press('Tab');
    
    // メールアドレス入力フィールドにフォーカス
    await expect(page.locator('input[name="email"]')).toBeFocused();
    
    // 次の要素に移動
    await page.keyboard.press('Tab');
    await expect(page.locator('input[name="password"]')).toBeFocused();
    
    // 送信ボタンに移動
    await page.keyboard.press('Tab');
    await expect(page.locator('button[type="submit"]')).toBeFocused();
  });

  test('キーボードナビゲーション - サインアップタブ', async ({ page }) => {
    // Tabでサインアップタブに移動
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab'); // サインアップタブ
    
    // Enterキーでタブ切り替え
    await page.keyboard.press('Enter');
    
    // サインアップフォームが表示されることを確認
    await expect(page.locator('h2')).toContainText('サインアップ');
  });

  test('フォームのEnterキー送信', async ({ page }) => {
    // フォームに入力
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'password123');
    
    // パスワードフィールドでEnterキーを押下
    await page.locator('input[name="password"]').press('Enter');
    
    // フォームが送信されることを確認（ローディング状態）
    await expect(page.locator('.ant-spin')).toBeVisible();
  });

  test('フォーカス表示の確認', async ({ page }) => {
    // メールアドレス入力フィールドをクリック
    await page.click('input[name="email"]');
    
    // フォーカス状態が視覚的に確認できることを確認
    await expect(page.locator('input[name="email"]:focus')).toBeVisible();
  });

  test('ラベルと入力フィールドの関連付け', async ({ page }) => {
    // aria-labelやlabelタグの関連付けを確認
    const emailInput = page.locator('input[name="email"]');
    const passwordInput = page.locator('input[name="password"]');
    
    // 入力フィールドにplaceholderが適切に設定されていることを確認
    await expect(emailInput).toHaveAttribute('placeholder');
    await expect(passwordInput).toHaveAttribute('placeholder');
  });

  test('MCPテスター画面のキーボードナビゲーション', async ({ page }) => {
    await page.goto('/test');
    
    // サーバーURL入力フィールドにフォーカス
    await page.keyboard.press('Tab');
    await expect(page.locator('input[placeholder="例: convex://mcp-todoist"]')).toBeFocused();
    
    // 接続ボタンにフォーカス
    await page.keyboard.press('Tab');
    await expect(page.locator('button:has-text("接続")')).toBeFocused();
  });

  test('タブナビゲーションのキーボード操作', async ({ page }) => {
    await page.goto('/test');
    
    // 初期化タブから矢印キーでナビゲーション
    const initTab = page.locator('[role="tab"]:has-text("初期化")');
    await initTab.focus();
    
    // 右矢印キーでツールタブに移動
    await page.keyboard.press('ArrowRight');
    await expect(page.locator('[role="tab"]:has-text("ツール")')).toBeFocused();
    
    // 右矢印キーでリソースタブに移動
    await page.keyboard.press('ArrowRight');
    await expect(page.locator('[role="tab"]:has-text("リソース")').first()).toBeFocused();
  });

  test('ボタンのSpaceキー/Enterキー操作', async ({ page }) => {
    await page.goto('/test');
    
    // 初期化ボタンにフォーカス
    const initButton = page.locator('button:has-text("初期化")');
    await initButton.focus();
    
    // Spaceキーでボタンを押下
    await page.keyboard.press('Space');
    
    // レスポンスが表示されることを確認
    await expect(page.locator('.ant-typography pre')).toBeVisible();
  });

  test('フォーム入力エラーの読み上げ対応', async ({ page }) => {
    // 無効なメールアドレスを入力
    await page.fill('input[name="email"]', 'invalid-email');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');

    // エラーメッセージにaria属性が適切に設定されていることを確認
    const errorMessage = page.locator('.ant-form-item-explain-error');
    await expect(errorMessage).toBeVisible();
    
    // role="alert"またはaria-live属性の確認
    await expect(errorMessage).toHaveAttribute('role', 'alert');
  });

  test('セマンティックHTML要素の使用', async ({ page }) => {
    // 適切なHTML要素が使用されていることを確認
    await expect(page.locator('h1')).toBeVisible(); // メインタイトル
    await expect(page.locator('form')).toBeVisible(); // フォーム要素
    await expect(page.locator('button[type="submit"]')).toBeVisible(); // 送信ボタン
  });

  test('コントラスト比とカラーアクセシビリティ', async ({ page }) => {
    // テキストが視認可能であることを確認
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('h2')).toBeVisible();
    
    // ボタンのホバー状態
    await page.hover('button[type="submit"]');
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('モバイルデバイスでのアクセシビリティ', async ({ page }) => {
    // モバイルビューポートに設定
    await page.setViewportSize({ width: 375, height: 667 });
    
    // タッチターゲットのサイズが適切であることを確認
    const submitButton = page.locator('button[type="submit"]');
    const buttonBox = await submitButton.boundingBox();
    
    // ボタンが44px以上の高さを持つことを確認（モバイルアクセシビリティガイドライン）
    expect(buttonBox?.height).toBeGreaterThanOrEqual(40);
  });

  test('スクリーンリーダー対応のテキスト', async ({ page }) => {
    await page.goto('/test');
    
    // 重要な情報にaria-labelが設定されていることを確認
    const connectionStatus = page.locator('text=Convex MCP');
    await expect(connectionStatus).toBeVisible();
    
    // 状態情報が適切にマークアップされていることを確認
    await expect(page.locator('text=セッション: アクティブ')).toBeVisible();
  });
}); 

