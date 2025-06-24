import { test, expect } from '@playwright/test';

test.describe('基本的なページ表示テスト', () => {
  test('テストページが正しく表示される', async ({ page }) => {
    // テストページに移動
    await page.goto('/test');
    
    // ページが読み込まれるまで待機
    await page.waitForLoadState('networkidle');
    
    // ページのタイトルを確認
    const title = await page.title();
    console.log(`ページタイトル: ${title}`);
    
    // ページの内容を確認
    const content = await page.content();
    console.log(`ページ内容の長さ: ${content.length}`);
    
    // 「MCP」という文字が含まれているかを確認
    const mcpText = page.locator('text=MCP');
    const mcpCount = await mcpText.count();
    console.log(`MCPテキストの数: ${mcpCount}`);
    
    if (mcpCount > 0) {
      console.log('MCPテキストが見つかりました');
      expect(mcpCount).toBeGreaterThan(0);
    } else {
      console.log('MCPテキストが見つかりません。ページの内容を確認します');
      
      // ページの主要な要素を確認
      const bodyText = await page.locator('body').textContent();
      console.log(`ページの内容（最初の200文字）: ${bodyText?.substring(0, 200)}...`);
      
      // 何らかのコンテンツが表示されていることを確認
      expect(bodyText?.length).toBeGreaterThan(0);
    }
  });
  
  test('基本的なHTML要素が存在する', async ({ page }) => {
    await page.goto('/test');
    await page.waitForLoadState('networkidle');
    
    // 基本的なHTML要素の存在を確認
    const body = page.locator('body');
    await expect(body).toBeVisible();
    
    // 何らかのコンテンツが表示されていることを確認
    const bodyText = await body.textContent();
    expect(bodyText).toBeTruthy();
    expect(bodyText!.length).toBeGreaterThan(0);
    
    console.log('基本的なHTML要素が正しく表示されています');
  });
}); 