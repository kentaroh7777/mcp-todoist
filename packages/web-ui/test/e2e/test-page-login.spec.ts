import { test, expect } from '@playwright/test';
import { MCPTestHelper } from './helper';

test.describe('テストページ MCPサーバー接続フロー', () => {
  let mcpHelper: MCPTestHelper;
  
  test.beforeEach(async ({ page }) => {
    // MCPTestHelperのインスタンスを作成
    mcpHelper = new MCPTestHelper(page);
    
    // テストページに移動し、初期状態を確認
    await mcpHelper.navigateToTestPageAndVerify();
  });

  test('正常系: MCPサーバーに接続できる', async ({ page }) => {
    console.log('[DEBUG] Step1: MCP Tester画面の表示を確認します');
    
    // Step1: MCP Tester画面の初期状態確認
    await mcpHelper.verifyMCPTesterInitialState();
    
    console.log('[DEBUG] Step2: MCPサーバーへの接続を実行します');
    
    // Step2: MCP接続を実行
    await mcpHelper.connectToMCPServer();
    
    console.log('[DEBUG] Step3: MCPタブの表示を確認します');
    
    // Step3: MCP機能タブの存在確認（接続状態に関係なく、UIは表示される）
    await mcpHelper.verifyMCPFunctionTabs();
    
    console.log('[DEBUG] テスト完了: MCPサーバーに接続できる');
  });

  test('正常系: MCP接続後に切断できる', async ({ page }) => {
    console.log('[DEBUG] 事前条件: MCPサーバーに接続します');
    
    // 事前条件: MCP接続
    await mcpHelper.verifyMCPTesterInitialState();
    await mcpHelper.connectToMCPServer();
    
    console.log('[DEBUG] MCPサーバーからの切断を実行します');
    
    // MCPサーバーからの切断
    await mcpHelper.disconnectFromMCPServer();
    
    console.log('[DEBUG] テスト完了: MCP接続後に切断できる');
  });

  test('UI確認: MCP接続UI画面のレイアウトが正しく表示される', async ({ page }) => {
    console.log('[DEBUG] 事前条件: MCP接続を実行します');
    
    // 事前条件: MCP接続
    await mcpHelper.connectToMCPServer();
    
    console.log('[DEBUG] MCP接続UI画面レイアウトの確認を開始します');
    
    // MCP接続UIのレイアウト確認
    await mcpHelper.verifyMCPConnectionUILayout();
    
    console.log('[DEBUG] テスト完了: MCP接続UI画面のレイアウトが正しく表示される');
  });

  test('ツール確認: 接続後にツールタブが正しく表示される', async ({ page }) => {
    console.log('[DEBUG] 事前条件: MCPサーバーに接続します');
    
    // 事前条件: MCP接続
    await mcpHelper.verifyMCPTesterInitialState();
    await mcpHelper.connectToMCPServer();
    
    console.log('[DEBUG] ツールタブの表示確認を開始します');
    
    // ツールタブに切り替えて内容を確認
    await mcpHelper.switchToToolsTabAndVerify();
    
    console.log('[DEBUG] テスト完了: 接続後にツールタブが正しく表示される');
  });

  test('リソース確認: 接続後にリソースタブが正しく表示される', async ({ page }) => {
    console.log('[DEBUG] 事前条件: MCPサーバーに接続します');
    
    // 事前条件: MCP接続
    await mcpHelper.verifyMCPTesterInitialState();
    await mcpHelper.connectToMCPServer();
    
    console.log('[DEBUG] リソースタブの表示確認を開始します');
    
    // リソースタブに切り替えて内容を確認
    await mcpHelper.switchToResourcesTabAndVerify();
    
    console.log('[DEBUG] テスト完了: 接続後にリソースタブが正しく表示される');
  });

  test('プロンプト確認: 接続後にプロンプトタブが正しく表示される', async ({ page }) => {
    console.log('[DEBUG] 事前条件: MCPサーバーに接続します');
    
    // 事前条件: MCP接続
    await mcpHelper.verifyMCPTesterInitialState();
    await mcpHelper.connectToMCPServer();
    
    console.log('[DEBUG] プロンプトタブの表示確認を開始します');
    
    // プロンプトタブに切り替えて内容を確認
    await mcpHelper.switchToPromptsTabAndVerify();
    
    console.log('[DEBUG] テスト完了: 接続後にプロンプトタブが正しく表示される');
  });
}); 