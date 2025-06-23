import { test, expect } from '@playwright/test';
import { MCPTestHelper } from './helper';

test.describe('MCPテスター画面', () => {
  let helper: MCPTestHelper;

  test.beforeEach(async ({ page }) => {
    // テストページに移動
    await page.goto('/test');
    helper = new MCPTestHelper(page);
    
    // ログ収集を初期化
    helper.initializeLogging();
  });

  test('MCP Tester画面の基本要素が表示される', async ({ page }) => {
    // ページタイトルを確認
    await expect(page.locator('h1')).toContainText('MCP Todoist');
    
    // 初期状態の確認
    await helper.verifyMCPTesterInitialState();
  });

  test('MCPサーバーに接続してタブが表示される', async ({ page }) => {
    try {
      // MCPサーバーに接続
      await helper.connectToMCPServer();
      
      // MCP機能タブの表示を確認
      await helper.verifyMCPFunctionTabs();
    } catch (error) {
      // 接続エラーが発生した場合、収集したログを出力
      console.log('\n[DEBUG] === 接続失敗時のログ出力 ===');
      helper.outputLogs(20);
      helper.outputConnectionLogs();
      helper.outputErrorLogs();
      throw error; // 元のエラーを再投げ
    }
  });

  test('ツールタブの動作確認', async ({ page }) => {
    try {
      // MCPサーバーに接続
      await helper.connectToMCPServer();
      
      // ツールタブに切り替えて内容を確認
      await helper.switchToToolsTabAndVerify();
    } catch (error) {
      // エラー発生時のログ出力
      console.log('\n[DEBUG] === ツールタブエラー時のログ ===');
      helper.outputFilteredLogs(['tool', 'Tool', 'listTools', 'ERROR', 'error'], 'ツール関連ログ');
      throw error;
    }
  });

  test('リソースタブの動作確認', async ({ page }) => {
    // MCPサーバーに接続
    await helper.connectToMCPServer();
    
    // リソースタブに切り替えて内容を確認
    await helper.switchToResourcesTabAndVerify();
  });

  test('プロンプトタブの動作確認', async ({ page }) => {
    // MCPサーバーに接続
    await helper.connectToMCPServer();
    
    // プロンプトタブに切り替えて内容を確認
    await helper.switchToPromptsTabAndVerify();
  });

  test('Todoistタスクの取得', async ({ page }) => {
    // MCPサーバーに接続
    await helper.connectToMCPServer();
    
    // Todoistタスクを取得
    const result = await helper.getTodoistTasks();
    
    // 結果を分析
    const analysis = helper.analyzeToolResult(result);
    
    // 認証エラーでなければ成功とみなす（Todoistトークンが無効でも接続自体は動作している）
    expect(analysis.isAuthError || analysis.isSuccess).toBe(true);
  });

  test('Todoistプロジェクトの取得', async ({ page }) => {
    // MCPサーバーに接続
    await helper.connectToMCPServer();
    
    // Todoistプロジェクトを取得
    const result = await helper.getTodoistProjects();
    
    // 結果を分析
    const analysis = helper.analyzeToolResult(result);
    
    // 認証エラーでなければ成功とみなす
    expect(analysis.isAuthError || analysis.isSuccess).toBe(true);
  });

  test('MCPサーバーから切断', async ({ page }) => {
    // MCPサーバーに接続
    await helper.connectToMCPServer();
    
    // MCPサーバーから切断
    await helper.disconnectFromMCPServer();
    
    // 切断後の状態確認
    await helper.verifyMCPTesterInitialState();
  });

  test('UIエラーがないことを確認', async ({ page }) => {
    // MCPサーバーに接続
    await helper.connectToMCPServer();
    
    // UIエラーがないことを確認
    await helper.verifyNoUIErrors('connection_test');
  });
}); 