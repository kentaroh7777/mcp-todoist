import { Page, expect } from '@playwright/test';

/**
 * MCP関連のテストヘルパー関数
 */
export class MCPTestHelper {
  private logs: string[] = [];
  private errors: string[] = [];
  private isLoggingInitialized = false;
  
  constructor(private page: Page) {}

  /**
   * ログ収集を初期化する
   */
  initializeLogging(): void {
    if (this.isLoggingInitialized) {
      return; // 既に初期化済み
    }

    // ログとエラーを初期化
    this.logs = [];
    this.errors = [];

    // ブラウザコンソールログを収集
    this.page.on('console', (msg) => {
      const log = `[${msg.type()}] ${msg.text()}`;
      this.logs.push(log);
      console.log(`[DEBUG LOG] ${log}`);
    });

    // JavaScript エラーを収集
    this.page.on('pageerror', (error) => {
      const errorMsg = `[PAGE ERROR] ${error.message}`;
      this.errors.push(errorMsg);
      console.log(`[DEBUG ERROR] ${errorMsg}`);
    });

    // ネットワークエラーを収集
    this.page.on('requestfailed', (request) => {
      const failMsg = `[NETWORK FAIL] ${request.method()} ${request.url()} - ${request.failure()?.errorText}`;
      this.errors.push(failMsg);
      console.log(`[DEBUG NETWORK] ${failMsg}`);
    });

    this.isLoggingInitialized = true;
    console.log('[HELPER] ログ収集が初期化されました');
  }

  /**
   * 収集したログを出力する
   */
  outputLogs(maxLogs: number = 20): void {
    console.log('\n[DEBUG] === 収集されたログ出力 ===');
    console.log('[DEBUG] 収集したログ数:', this.logs.length);
    console.log('[DEBUG] 収集したエラー数:', this.errors.length);
    
    // 最新のログを出力
    const recentLogs = this.logs.slice(-maxLogs);
    recentLogs.forEach((log, index) => {
      console.log(`[DEBUG] Log ${index + 1}: ${log}`);
    });
    
    // 全エラーを出力
    this.errors.forEach((error, index) => {
      console.log(`[DEBUG] Error ${index + 1}: ${error}`);
    });
    
    console.log('[DEBUG] =========================\n');
  }

  /**
   * 特定のキーワードでログをフィルタして出力する
   */
  outputFilteredLogs(keywords: string[], title: string = '関連ログ'): void {
    const filteredLogs = this.logs.filter(log => 
      keywords.some(keyword => log.toLowerCase().includes(keyword.toLowerCase()))
    );
    
    console.log(`\n[DEBUG] === ${title} ===`);
    filteredLogs.forEach((log, index) => {
      console.log(`[DEBUG] ${title} ${index + 1}: ${log}`);
    });
    console.log('[DEBUG] =========================\n');
  }

  /**
   * 接続関連のログを出力する
   */
  outputConnectionLogs(): void {
    this.outputFilteredLogs(
      ['connect', 'connection', 'MCP', 'session', 'mutation', 'DEBUG'],
      '接続関連ログ'
    );
  }

  /**
   * エラー関連のログを出力する
   */
  outputErrorLogs(): void {
    this.outputFilteredLogs(
      ['error', 'ERROR', 'fail', 'FAIL', 'exception', 'Exception'],
      'エラー関連ログ'
    );
  }

  /**
   * ログをクリアする
   */
  clearLogs(): void {
    this.logs = [];
    this.errors = [];
    console.log('[HELPER] ログがクリアされました');
  }

  /**
   * MCPテスターページの初期状態を確認する
   */
  async verifyMCPTesterInitialState(): Promise<void> {
    console.log('[HELPER] MCP Tester初期状態の確認を開始');
    
    // MCP Tester画面の基本確認
    await expect(this.page.locator('text=MCP テスター')).toBeVisible();
    await expect(this.page.locator('text=未接続')).toBeVisible();
    await expect(this.page.locator('text=Convex MCP サーバー')).toBeVisible();
    
    console.log('[HELPER] MCP Tester初期状態の確認完了');
  }

  /**
   * MCPサーバーに接続する
   * @param waitForConnection 接続完了まで待機するか（デフォルト: true）
   */
  async connectToMCPServer(waitForConnection: boolean = true): Promise<void> {
    console.log('[HELPER] MCPサーバーへの接続を開始');
    
    // 接続ボタンの確認（スペースありの"接 続"に対応）
    const connectButton = this.page.locator('button').filter({ hasText: /接\s*続/ });
    await expect(connectButton).toBeVisible();
    await expect(connectButton).toBeEnabled();
    
    // 接続ボタンのクリック
    await connectButton.click();
    
    if (waitForConnection) {
      // 接続処理の開始確認（"未接続"が消える、または"接続中"が表示される）
      await Promise.race([
        expect(this.page.locator('text=未接続')).toBeHidden({ timeout: 5000 }),
        expect(this.page.locator('text=接続中')).toBeVisible({ timeout: 5000 })
      ]);
      
      console.log('[HELPER] 接続処理が開始されました。完了まで待機します...');
      
      // 接続完了まで待機（切断ボタンが表示される、または接続済みバッジが表示されるまで）
      await Promise.race([
        expect(this.page.locator('button').filter({ hasText: /切\s*断/ })).toBeVisible({ timeout: 30000 }),
        expect(this.page.locator('text=接続済み')).toBeVisible({ timeout: 30000 })
      ]);
      
      // 追加で3秒待機（データのロードとレンダリング完了を待つ）
      await this.page.waitForTimeout(3000);
    }
    
    console.log('[HELPER] MCPサーバーへの接続処理完了');
  }

  /**
   * MCPサーバーから切断する
   */
  async disconnectFromMCPServer(): Promise<void> {
    console.log('[HELPER] MCPサーバーからの切断を開始');
    
    // 切断ボタンの確認
    const disconnectButton = this.page.locator('button').filter({ hasText: /切\s*断/ });
    await expect(disconnectButton).toBeVisible({ timeout: 10000 });
    await expect(disconnectButton).toBeEnabled();
    
    // 切断ボタンのクリック
    await disconnectButton.click();
    
    // 切断完了の確認
    await expect(this.page.locator('text=未接続')).toBeVisible({ timeout: 10000 });
    await expect(this.page.locator('button').filter({ hasText: /接\s*続/ })).toBeVisible();
    
    console.log('[HELPER] MCPサーバーからの切断処理完了');
  }

  /**
   * MCP機能タブの表示を確認する
   */
  async verifyMCPFunctionTabs(): Promise<void> {
    console.log('[HELPER] MCP機能タブの表示確認を開始');
    
    // MCP機能タブの存在確認（より具体的なセレクターを使用）
    await expect(this.page.locator('[role="tab"]').filter({ hasText: 'ツール' })).toBeVisible();
    await expect(this.page.locator('[role="tab"]').filter({ hasText: 'リソース' })).toBeVisible();
    await expect(this.page.locator('[role="tab"]').filter({ hasText: 'プロンプト' })).toBeVisible();
    await expect(this.page.locator('[role="tab"]').filter({ hasText: 'デバッグ' })).toBeVisible();
    
    console.log('[HELPER] MCP機能タブの表示確認完了');
  }

  /**
   * ツールタブに切り替えて内容を確認する
   */
  async switchToToolsTabAndVerify(): Promise<void> {
    console.log('[HELPER] ツールタブへの切り替えを開始');
    
    // ツールタブをクリック
    const toolsTab = this.page.locator('[role="tab"]').filter({ hasText: 'ツール' });
    await expect(toolsTab).toBeVisible();
    await toolsTab.click();
    
    console.log('[HELPER] ツールタブ内容の確認を開始');
    
    // ツールセレクタが表示されることを確認
    const toolSelect = this.page.locator('[data-testid="tool-select"]');
    await expect(toolSelect).toBeVisible({ timeout: 10000 });
    
    // Selectドロップダウンを開く
    await toolSelect.click();
    
    // MCPツールの表示確認（ドロップダウン内のオプション）
    await expect(this.page.locator('.ant-select-item-option').filter({ hasText: 'todoist_get_tasks' })).toBeVisible({ timeout: 10000 });
    await expect(this.page.locator('.ant-select-item-option').filter({ hasText: 'todoist_create_task' })).toBeVisible();
    await expect(this.page.locator('.ant-select-item-option').filter({ hasText: 'todoist_update_task' })).toBeVisible();
    await expect(this.page.locator('.ant-select-item-option').filter({ hasText: 'todoist_close_task' })).toBeVisible();
    await expect(this.page.locator('.ant-select-item-option').filter({ hasText: 'todoist_get_projects' })).toBeVisible();
    
    // ドロップダウンを閉じるためにエスケープキーを押す
    await this.page.keyboard.press('Escape');
    
    console.log('[HELPER] ツールタブ内容の確認完了');
  }

  /**
   * リソースタブに切り替えて内容を確認する
   */
  async switchToResourcesTabAndVerify(): Promise<void> {
    console.log('[HELPER] リソースタブへの切り替えを開始');
    
    // リソースタブをクリック
    const resourcesTab = this.page.locator('[role="tab"]').filter({ hasText: 'リソース' });
    await expect(resourcesTab).toBeVisible();
    await resourcesTab.click();
    
    console.log('[HELPER] リソースタブ内容の確認を開始');
    
    // リソースセレクタが表示されることを確認
    const resourceSelect = this.page.locator('[data-testid="resource-select"]');
    await expect(resourceSelect).toBeVisible({ timeout: 10000 });
    
    // Selectドロップダウンを開く
    await resourceSelect.click();
    
    // MCPリソースの表示確認（ドロップダウン内のオプション）
    await expect(this.page.locator('.ant-select-item-option').filter({ hasText: 'Todoist Tasks' })).toBeVisible({ timeout: 10000 });
    await expect(this.page.locator('.ant-select-item-option').filter({ hasText: 'Todoist Projects' })).toBeVisible();
    
    // 最初のリソースを選択してURIを確認
    await this.page.locator('.ant-select-item-option').filter({ hasText: 'Todoist Tasks' }).click();
    
    // リソース情報カード内のURIを確認（より具体的なセレクター）
    await expect(this.page.locator('[data-testid="resources-section"] .ant-card code').filter({ hasText: 'todoist://tasks' })).toBeVisible({ timeout: 5000 });
    
    // 2番目のリソースも確認
    await resourceSelect.click();
    await this.page.locator('.ant-select-item-option').filter({ hasText: 'Todoist Projects' }).click();
    await expect(this.page.locator('[data-testid="resources-section"] .ant-card code').filter({ hasText: 'todoist://projects' })).toBeVisible({ timeout: 5000 });
    
    console.log('[HELPER] リソースタブ内容の確認完了');
  }

  /**
   * プロンプトタブに切り替えて内容を確認する
   */
  async switchToPromptsTabAndVerify(): Promise<void> {
    console.log('[HELPER] プロンプトタブへの切り替えを開始');
    
    // プロンプトタブをクリック
    const promptsTab = this.page.locator('[role="tab"]').filter({ hasText: 'プロンプト' });
    await expect(promptsTab).toBeVisible();
    await promptsTab.click();
    
    console.log('[HELPER] プロンプトタブ内容の確認を開始');
    
    // プロンプトセレクタが表示されることを確認
    const promptSelect = this.page.locator('[data-testid="prompt-select"]');
    await expect(promptSelect).toBeVisible({ timeout: 10000 });
    
    // Selectドロップダウンを開く
    await promptSelect.click();
    
    // MCPプロンプトの表示確認（ドロップダウン内のオプション）
    await expect(this.page.locator('.ant-select-item-option').filter({ hasText: 'task_summary' })).toBeVisible({ timeout: 10000 });
    await expect(this.page.locator('.ant-select-item-option').filter({ hasText: 'project_analysis' })).toBeVisible();
    
    // ドロップダウンを閉じるためにエスケープキーを押す
    await this.page.keyboard.press('Escape');
    
    console.log('[HELPER] プロンプトタブ内容の確認完了');
  }

  /**
   * MCP接続UIのレイアウトを確認する
   */
  async verifyMCPConnectionUILayout(): Promise<void> {
    console.log('[HELPER] MCP接続UIレイアウトの確認を開始');
    
    // MCP Tester画面のレイアウト確認
    await expect(this.page.locator('text=MCP テスター')).toBeVisible();
    
    // タブの存在確認（具体的なロケーターを使用してstrict mode violationを回避）
    await expect(this.page.locator('[role="tab"]').filter({ hasText: '接続' })).toBeVisible();
    await expect(this.page.locator('[role="tab"]').filter({ hasText: 'ツール' })).toBeVisible();
    await expect(this.page.locator('[role="tab"]').filter({ hasText: 'リソース' })).toBeVisible();
    await expect(this.page.locator('[role="tab"]').filter({ hasText: 'プロンプト' })).toBeVisible();
    await expect(this.page.locator('[role="tab"]').filter({ hasText: 'デバッグ' })).toBeVisible();
    
    // 接続タブがアクティブな状態であることを確認
    const activeTab = this.page.locator('[role="tab"][aria-selected="true"]');
    await expect(activeTab).toBeVisible();
    
    console.log('[HELPER] MCP接続UIレイアウトの確認完了');
  }

  /**
   * テストページに移動し、初期状態を確認する
   */
  async navigateToTestPageAndVerify(): Promise<void> {
    console.log('[HELPER] テストページに移動します');
    
    // テストページに移動
    await this.page.goto('/test');
    
    // ページロードを待機
    await expect(this.page.locator('text=MCP テスター')).toBeVisible({ timeout: 10000 });
    
    console.log('[HELPER] テストページの移動完了');
  }

  /**
   * MCPツールを実行し、結果を取得する
   * @param toolName ツール名
   * @param params パラメーター（JSON文字列）
   * @returns 実行結果文字列
   */
  async executeMCPTool(toolName: string, params: string = '{}'): Promise<string> {
    console.log(`[HELPER] MCPツール実行開始: ${toolName}`);
    
    // ツール選択 - Ant DesignのSelectコンポーネント用
    const toolSelect = this.page.locator('[data-testid="tool-select"]');
    await expect(toolSelect).toBeVisible({ timeout: 10000 });
    
    // Selectのドロップダウンをクリック
    await toolSelect.click();
    await this.page.waitForTimeout(500);
    
    // ツール名でオプションを選択
    const optionSelector = `.ant-select-dropdown .ant-select-item[title*="${toolName}"]`;
    await this.page.locator(optionSelector).click();
    await this.page.waitForTimeout(500);
    
    // パラメーター設定
    if (params && params !== '{}') {
      const paramsObj = JSON.parse(params);
      
      for (const [key, value] of Object.entries(paramsObj)) {
        console.log(`[HELPER] パラメーター設定: ${key} = ${value}`);
        
        // Ant DesignのForm.Item内の入力要素を特定（複数パターン対応）
        const inputSelectors = [
          `[data-testid="tool-params-form"] .ant-form-item:has(.ant-form-item-label:text("${key}")) input`,
          `[data-testid="tool-params-form"] .ant-form-item:has(.ant-form-item-label:text("${key}")) textarea`,
          `[data-testid="tool-params-form"] .ant-form-item:has(.ant-form-item-label:text("${key}")) .ant-select`,
          `[data-testid="tool-params-form"] input[id*="${key}"]`,
          `[data-testid="tool-params-form"] textarea[id*="${key}"]`
        ];
        
        let inputSuccess = false;
        for (const selector of inputSelectors) {
          try {
            const inputElement = this.page.locator(selector).first();
            await expect(inputElement).toBeVisible({ timeout: 2000 });
            
            // Selectの場合は特別な処理
            if (selector.includes('.ant-select')) {
              await inputElement.click();
              await this.page.waitForTimeout(300);
              const optionElement = this.page.locator(`.ant-select-dropdown .ant-select-item:has-text("${value}")`).first();
              if (await optionElement.isVisible()) {
                await optionElement.click();
              } else {
                // オプションが見つからない場合は入力形式で試行
                const searchInput = this.page.locator('.ant-select-dropdown input').first();
                if (await searchInput.isVisible()) {
                  await searchInput.fill(String(value));
                  await this.page.keyboard.press('Enter');
                }
              }
            } else {
              // 通常の入力フィールド
              await inputElement.fill(String(value));
            }
            
            console.log(`[HELPER] パラメーター ${key} の入力成功 (セレクタ: ${selector})`);
            inputSuccess = true;
            break;
          } catch (selectorError) {
            // このセレクタでは見つからない場合は次を試行
            continue;
          }
        }
        
        if (!inputSuccess) {
          console.log(`[HELPER] パラメーター ${key} の入力に失敗: 全セレクタで要素が見つかりませんでした`);
          // 入力フィールドが見つからない場合もテストを継続
        }
      }
    }
    
    // 実行ボタンをクリック
    const executeButton = this.page.locator('[data-testid="execute-tool-button"]');
    await expect(executeButton).toBeVisible({ timeout: 5000 });
    await expect(executeButton).toBeEnabled({ timeout: 5000 });
    
    console.log(`[HELPER] 実行ボタンをクリックします: ${toolName}`);
    await executeButton.click();
    console.log(`[HELPER] 実行ボタンクリック完了: ${toolName}`);
    
    // クリック後の状態変化を少し待機
    await this.page.waitForTimeout(1000);
    
    // 結果を待機（移動操作はより時間がかかる可能性があるため、タイムアウトを延長）
    const maxWaitTime = toolName === 'todoist_move_task' ? 90 : 30;
    
    console.log(`[HELPER] 結果表示を待機中: ${toolName} (最大 ${maxWaitTime}秒)`);
    
    // 結果表示エリアが更新されるまで待機（より寛容な待機方法を試行）
    try {
      await expect(this.page.locator('[data-testid="tool-result-display"]')).toBeVisible({ timeout: maxWaitTime * 1000 });
    } catch (waitError) {
      console.log(`[HELPER] 結果表示エリアの待機に失敗: ${waitError}`);
      
      // エラーメッセージが表示されていないかチェック
      const errorAlert = this.page.locator('.ant-alert-error');
      if (await errorAlert.isVisible()) {
        const errorText = await errorAlert.textContent();
        console.log(`[HELPER] エラーアラートが検出されました: ${errorText}`);
      }
      
      // ローディング状態が続いているかチェック
      const loadingElement = this.page.locator('[data-testid="execute-tool-button"][loading]');
      if (await loadingElement.isVisible()) {
        console.log(`[HELPER] 実行ボタンがローディング状態のままです`);
      }
      
      throw waitError;
    }
    
    // 結果を取得
    const resultElement = this.page.locator('[data-testid="tool-result-display"]');
    const resultText = await resultElement.textContent();
    
    console.log(`[HELPER] MCPツール実行完了: ${toolName}`);
    return resultText ?? '';
  }

  /**
   * Todoistタスクを取得する
   * @param projectId プロジェクトID（オプション）
   */
  async getTodoistTasks(projectId?: string): Promise<string> {
    console.log('[HELPER] Todoistタスク取得を開始');
    
    let result: string;
    if (projectId) {
      const params = JSON.stringify({ project_id: projectId });
      result = await this.executeMCPTool('todoist_get_tasks', params);
    } else {
      // プロジェクトIDが指定されていない場合はパラメータなしで実行
      result = await this.executeMCPTool('todoist_get_tasks');
    }
    
    console.log('[HELPER] Todoistタスク取得完了');
    return result;
  }

  /**
   * Todoistタスクを作成する
   * @param content タスク内容
   * @param projectId プロジェクトID（オプション）
   * @param description 説明（オプション）
   */
  async createTodoistTask(content: string, projectId?: string, description?: string): Promise<string> {
    console.log('[HELPER] Todoistタスク作成を開始');
    
    const params: any = { content };
    if (projectId) params.project_id = projectId;
    if (description) params.description = description;
    
    const result = await this.executeMCPTool('todoist_create_task', JSON.stringify(params));
    
    console.log('[HELPER] Todoistタスク作成完了');
    return result;
  }

  /**
   * Todoistタスクを更新する
   * @param taskId タスクID
   * @param content タスク内容（オプション）
   * @param description 説明（オプション）
   * @param projectId プロジェクトID（オプション、タスク移動に使用）
   * @returns 実行結果のテキスト
   */
  async updateTodoistTask(taskId: string, content?: string, description?: string, projectId?: string): Promise<string> {
    console.log('[HELPER] Todoistタスク更新を開始');
    
    const params: any = { task_id: taskId };
    if (content) params.content = content;
    if (description) params.description = description;
    if (projectId !== undefined) {
      // インボックスに移動する場合はnullを設定
      params.project_id = projectId === 'inbox' ? null : projectId;
    }
    
    const result = await this.executeMCPTool('todoist_update_task', JSON.stringify(params));
    
    console.log('[HELPER] Todoistタスク更新完了');
    return result;
  }

  /**
   * Todoistタスクをクローズする
   * @param taskId タスクID
   */
  async closeTodoistTask(taskId: string): Promise<string> {
    console.log('[HELPER] Todoistタスククローズを開始');
    
    const params = { task_id: taskId };
    const result = await this.executeMCPTool('todoist_close_task', JSON.stringify(params));
    
    console.log('[HELPER] Todoistタスククローズ完了');
    return result;
  }

  /**
   * Todoistプロジェクト一覧を取得する
   */
  async getTodoistProjects(): Promise<string> {
    console.log('[HELPER] Todoistプロジェクト取得を開始');
    
    const result = await this.executeMCPTool('todoist_get_projects');
    
    console.log('[HELPER] Todoistプロジェクト取得完了');
    return result;
  }

  /**
   * ツールタブに切り替える
   */
  async switchToToolsTab(): Promise<void> {
    console.log('[HELPER] ツールタブに切り替え');
    
    const toolsTab = this.page.locator('[role="tab"]').filter({ hasText: 'ツール' });
    await expect(toolsTab).toBeVisible();
    await toolsTab.click();
    
    // ツールセレクタが表示されるまで待機
    const toolSelect = this.page.locator('[data-testid="tool-select"]');
    await expect(toolSelect).toBeVisible({ timeout: 10000 });
    
    console.log('[HELPER] ツールタブ切り替え完了');
  }

  /**
   * 実行結果が成功レスポンスかエラーレスポンスかを判定する
   * @param resultText 実行結果のテキスト
   * @returns { isSuccess: boolean, isAuthError: boolean, message: string }
   */
  analyzeToolResult(resultText: string): { isSuccess: boolean; isAuthError: boolean; message: string } {
    console.log('[HELPER] ツール実行結果の解析開始');
    console.log(`[DEBUG] 結果テキスト: "${resultText}"`);
    
    if (!resultText) {
      return { isSuccess: false, isAuthError: false, message: 'レスポンスが空です' };
    }

    // 認証エラーの検出（より広範囲なパターン）
    if (resultText.includes('認証に失敗') || 
        resultText.includes('Authentication failed') ||
        resultText.includes('token') ||
        resultText.includes('Token') ||
        resultText.includes('Unauthorized') ||
        resultText.includes('401')) {
      console.log('[DEBUG] 実行結果解析: 認証エラー');
      return { isSuccess: false, isAuthError: true, message: '認証エラーが発生しました' };
    }

    // エラーレスポンスの検出（より詳細なパターン）
    if (resultText.includes('Tool execution failed') ||
        resultText.includes('Unknown error') ||
        resultText.includes('Error:') ||
        resultText.includes('エラー:') ||
        resultText.includes('Failed to') ||
        resultText.includes('失敗')) {
      console.log('[DEBUG] 実行結果解析: ツール実行エラー');
      return { isSuccess: false, isAuthError: false, message: 'ツール実行エラーが発生しました' };
    }

    // まず純粋なJSONとしてパースを試行
    let parsedData = this.extractJsonFromResponse(resultText);
    if (parsedData) {
      return this.analyzeJsonResponse(parsedData);
    }

    // JSONでない場合、成功メッセージをチェック
    if (resultText.includes('成功') || 
        resultText.includes('success') || 
        resultText.includes('successfully') ||
        resultText.includes('completed') ||
        resultText.includes('created') ||
        resultText.includes('updated') ||
        resultText.includes('closed') ||
        resultText.includes('deleted') ||
        resultText.includes('marked as completed')) {
      console.log('[DEBUG] 実行結果解析: テキストベース成功判定');
      return { isSuccess: true, isAuthError: false, message: '操作が正常に完了しました' };
    }

    console.log('[DEBUG] 実行結果解析: その他のレスポンス');
    return { isSuccess: false, isAuthError: false, message: '期待されるレスポンス形式ではありません' };
  }

  /**
   * レスポンステキストからJSONデータを抽出する
   * @param resultText レスポンステキスト
   * @returns パースされたJSONオブジェクト（失敗した場合はnull）
   */
  private extractJsonFromResponse(resultText: string): any | null {
    try {
      // まず純粋なJSONとしてパースを試行
      return JSON.parse(resultText);
    } catch (directParseError) {
      console.log('[DEBUG] 直接JSON解析エラー、ネストされたJSONを抽出試行');
      
      try {
        // "text": "..." の中身を抽出
        const textMatch = resultText.match(/"text":\s*"([^"]+(?:\\.[^"]*)*?)"/);
        if (textMatch && textMatch[1]) {
          // エスケープされた文字列をアンエスケープ
          const unescapedText = textMatch[1].replace(/\\"/g, '"').replace(/\\\\/g, '\\');
          console.log('[DEBUG] 抽出されたテキスト:', unescapedText.substring(0, 200) + '...');
          return JSON.parse(unescapedText);
        }
      } catch (nestedParseError) {
        console.log('[DEBUG] ネストされたJSON解析もエラー');
      }
      
      try {
        // content配列から抽出を試行
        const outerMatch = resultText.match(/\{[\s\S]*"content"[\s\S]*\}/);
        if (outerMatch) {
          const outerData = JSON.parse(outerMatch[0]);
          if (outerData.content && Array.isArray(outerData.content) && outerData.content[0] && outerData.content[0].text) {
            const innerText = outerData.content[0].text;
            console.log('[DEBUG] content配列から抽出されたテキスト:', innerText.substring(0, 200) + '...');
            return JSON.parse(innerText);
          }
        }
      } catch (contentParseError) {
        console.log('[DEBUG] content配列からの抽出もエラー');
      }
      
      return null;
    }
  }

  /**
   * JSONレスポンスの内容を解析する
   * @param parsedData パースされたJSONオブジェクト
   * @returns 解析結果
   */
  private analyzeJsonResponse(parsedData: any): { isSuccess: boolean; isAuthError: boolean; message: string } {
    console.log('[DEBUG] JSON解析成功、データタイプを判定中');
    
    // 配列の場合
    if (Array.isArray(parsedData)) {
      if (parsedData.length === 0) {
        console.log('[DEBUG] 実行結果解析: 空の配列（正常）');
        return { isSuccess: true, isAuthError: false, message: '空のリストを取得しました' };
      }
      
      // タスクリストの場合
      const hasValidTasks = parsedData.every(item => 
        item.id && 
        item.content && 
        typeof item.project_id === 'string' &&
        typeof item.is_completed === 'boolean' &&
        item.url && 
        item.url.includes('todoist.com')
      );
      
      if (hasValidTasks) {
        console.log(`[DEBUG] 実行結果解析: 実行成功 (${parsedData.length}個のタスク取得)`);
        return { isSuccess: true, isAuthError: false, message: `タスク一覧の取得成功: ${parsedData.length}個のタスク` };
      }
      
      // プロジェクトリストの場合
      const hasValidProjects = parsedData.every(item =>
        item.id &&
        item.name &&
        typeof item.is_shared === 'boolean' &&
        item.url &&
        item.url.includes('todoist.com')
      );
      
      if (hasValidProjects) {
        console.log(`[DEBUG] 実行結果解析: 実行成功 (${parsedData.length}個のプロジェクト取得)`);
        return { isSuccess: true, isAuthError: false, message: `プロジェクト一覧の取得成功: ${parsedData.length}個のプロジェクト` };
      }
    }
    
    // 単一オブジェクト（タスク作成/更新）の場合
    if (parsedData.id && parsedData.content) {
      console.log('[DEBUG] 実行結果解析: 実行成功 (単一タスク操作)');
      return { isSuccess: true, isAuthError: false, message: 'タスク操作成功' };
    }
    
    // その他の成功レスポンス（success: trueなど）
    if (parsedData.success === true) {
      console.log('[DEBUG] 実行結果解析: 実行成功 (成功フラグ)');
      return { isSuccess: true, isAuthError: false, message: '操作成功' };
    }
    
    console.log('[DEBUG] 実行結果解析: 認識できないデータ形式');
    return { isSuccess: false, isAuthError: false, message: '認識できないレスポンス形式です' };
  }

  /**
   * タスクの詳細情報を取得する
   * @param taskId タスクID
   * @returns タスクの詳細情報（取得に失敗した場合はnull）
   */
  async getTaskDetails(taskId: string): Promise<any | null> {
    console.log(`[HELPER] タスク詳細取得開始: ${taskId}`);
    
    try {
      // 全タスクを取得してIDでフィルタ
      const allTasksResult = await this.getTodoistTasks();
      const analysis = this.analyzeToolResult(allTasksResult);
      
      if (!analysis.isSuccess) {
        console.log('[HELPER] タスク一覧取得に失敗');
        return null;
      }
      
      const extractedJson = this.extractJsonFromResponse(allTasksResult);
      if (!extractedJson || !Array.isArray(extractedJson)) {
        console.log('[HELPER] タスク一覧の解析に失敗');
        return null;
      }
      
      const task = extractedJson.find(t => t.id === taskId || t.id === parseInt(taskId));
      if (task) {
        console.log(`[HELPER] タスク詳細取得成功: ${task.content} (プロジェクト: ${task.project_id})`);
        return task;
      } else {
        console.log(`[HELPER] タスクが見つかりません: ${taskId}`);
        return null;
      }
      
    } catch (error) {
      console.log(`[HELPER] タスク詳細取得エラー: ${error}`);
      return null;
    }
  }

  /**
   * タスクが指定されたプロジェクトに存在するかを検証する
   * @param taskId タスクID
   * @param expectedProjectId 期待されるプロジェクトID
   * @returns 検証結果
   */
  async verifyTaskLocation(taskId: string, expectedProjectId: string): Promise<{ success: boolean; message: string; actualProjectId?: string }> {
    console.log(`[HELPER] タスク位置検証開始: ${taskId} → プロジェクト ${expectedProjectId}`);
    
    const taskDetails = await this.getTaskDetails(taskId);
    if (!taskDetails) {
      return { success: false, message: 'タスクの詳細取得に失敗しました' };
    }
    
    const actualProjectId = taskDetails.project_id?.toString();
    const expected = expectedProjectId === 'inbox' ? null : expectedProjectId;
    const actual = actualProjectId === null ? 'inbox' : actualProjectId;
    const expectedDisplay = expected === null ? 'inbox' : expected;
    
    if (actual === expectedDisplay) {
      console.log(`[HELPER] タスク位置検証成功: ${taskId} は ${expectedDisplay} に存在`);
      return { success: true, message: `タスクは期待されるプロジェクト（${expectedDisplay}）に存在します`, actualProjectId: actual };
    } else {
      console.log(`[HELPER] タスク位置検証失敗: ${taskId} は ${actual} に存在（期待: ${expectedDisplay}）`);
      return { success: false, message: `タスクは期待されるプロジェクト（${expectedDisplay}）ではなく、${actual}に存在します`, actualProjectId: actual };
    }
  }

  /**
   * タスクの内容が期待される値と一致するかを検証する
   * @param taskId タスクID
   * @param expectedContent 期待される内容
   * @returns 検証結果
   */
  async verifyTaskContent(taskId: string, expectedContent: string): Promise<{ success: boolean; message: string; actualContent?: string }> {
    console.log(`[HELPER] タスク内容検証開始: ${taskId} → "${expectedContent}"`);
    
    const taskDetails = await this.getTaskDetails(taskId);
    if (!taskDetails) {
      return { success: false, message: 'タスクの詳細取得に失敗しました' };
    }
    
    const actualContent = taskDetails.content;
    if (actualContent === expectedContent) {
      console.log(`[HELPER] タスク内容検証成功: "${actualContent}"`);
      return { success: true, message: 'タスクの内容が期待される値と一致します', actualContent };
    } else {
      console.log(`[HELPER] タスク内容検証失敗: "${actualContent}" (期待: "${expectedContent}")`);
      return { success: false, message: `タスクの内容が期待される値と異なります（実際: "${actualContent}", 期待: "${expectedContent}"）`, actualContent };
    }
  }

  /**
   * 改善されたツール実行結果解析（実際の状態検証を含む）
   * @param resultText APIレスポンステキスト
   * @param expectedChanges 期待される変更内容（オプション）
   * @returns 解析結果
   */
  async analyzeToolResultWithVerification(
    resultText: string, 
    expectedChanges?: {
      taskId?: string;
      expectedProjectId?: string;
      expectedContent?: string;
      operationType?: 'create' | 'update' | 'move' | 'close' | 'get';
    }
  ): Promise<{ isSuccess: boolean; isAuthError: boolean; message: string; verificationDetails?: any }> {
    console.log('[HELPER] 実行結果の詳細解析を開始');
    
    // 基本的な実行結果解析
    const basicAnalysis = this.analyzeToolResult(resultText);
    
    if (basicAnalysis.isAuthError) {
      return {
        ...basicAnalysis,
        message: '認証エラー: APIトークンが設定されていません'
      };
    }
    
    if (!basicAnalysis.isSuccess) {
      return basicAnalysis;
    }
    
    let verificationDetails: any = {};
    
    // 期待される変更が指定されている場合は実際の状態を検証
    if (expectedChanges?.taskId && (expectedChanges.operationType === 'move' || expectedChanges.operationType === 'update')) {
      if (expectedChanges.expectedProjectId) {
        console.log('[HELPER] タスクの位置検証を実行中...');
        const locationVerification = await this.verifyTaskLocation(expectedChanges.taskId, expectedChanges.expectedProjectId);
        verificationDetails.location = locationVerification;
        
        if (!locationVerification.success && expectedChanges.operationType === 'move') {
          return {
            ...basicAnalysis,
            isSuccess: false,
            message: `移動操作後の検証で問題を検出: ${locationVerification.message}`,
            verificationDetails
          };
        }
      }
      
      if (expectedChanges.expectedContent) {
        console.log('[HELPER] タスクの内容検証を実行中...');
        const contentVerification = await this.verifyTaskContent(expectedChanges.taskId, expectedChanges.expectedContent);
        verificationDetails.content = contentVerification;
        
        if (!contentVerification.success) {
          return {
            ...basicAnalysis,
            isSuccess: false,
            message: `内容更新の検証で問題を検出: ${contentVerification.message}`,
            verificationDetails
          };
        }
      }
    }
    
    return {
      ...basicAnalysis,
      verificationDetails: Object.keys(verificationDetails).length > 0 ? verificationDetails : undefined
    };
  }

  /**
   * タスク作成結果からタスクIDを抽出する
   * @param createResult タスク作成APIの実行結果
   * @returns タスクID（抽出できない場合はnull）
   */
  extractTaskIdFromCreateResult(createResult: string): string | null {
    console.log('[HELPER] タスクID抽出を開始');
    console.log(`[DEBUG] 抽出対象テキスト: "${createResult}"`);
    
    try {
      // JSONレスポンスからIDを抽出
      const parsedResult = JSON.parse(createResult);
      
      if (parsedResult.id) {
        const taskId = parsedResult.id.toString();
        console.log(`[DEBUG] タスクID抽出成功: ${taskId}`);
        return taskId;
      }
      
      console.log('[DEBUG] JSONレスポンスにIDフィールドが見つかりません');
      return null;
      
    } catch (parseError) {
      console.log('[DEBUG] JSON解析エラー、テキストからの抽出を試行');
      
      // テキストレスポンスからIDを抽出（複数パターンの正規表現）
      const patterns = [
        /"id":\s*["']?(\d+)["']?/,           // "id": "123456789" または "id": 123456789
        /\(ID:\s*(\d+)\)/,                   // (ID: 123456789)
        /ID:\s*(\d+)/,                       // ID: 123456789
        /task\s+ID\s*:\s*(\d+)/i,            // task ID: 123456789
        /created\s+successfully.*?(\d{8,})/i // created successfully ... 123456789
      ];
      
      for (const pattern of patterns) {
        const match = createResult.match(pattern);
        if (match && match[1]) {
          const taskId = match[1];
          console.log(`[DEBUG] テキストからタスクID抽出成功: ${taskId} (パターン: ${pattern.source})`);
          return taskId;
        }
      }
      
      console.log('[DEBUG] テキストからのタスクID抽出に失敗');
      return null;
    }
  }

  /**
   * タスクを作成してIDを返す（テスト専用）
   * @param content タスク内容
   * @param projectId プロジェクトID（オプション）
   * @param description 説明（オプション）
   * @returns タスクID（作成に失敗した場合はnull）
   */
  async createTodoistTaskAndGetId(content: string, projectId?: string, description?: string): Promise<string | null> {
    console.log('[HELPER] タスク作成とID取得を開始');
    
    const createResult = await this.createTodoistTask(content, projectId, description);
    const analysis = this.analyzeToolResult(createResult);
    
    if (analysis.isSuccess) {
      const taskId = this.extractTaskIdFromCreateResult(createResult);
      console.log(`[HELPER] タスク作成とID取得完了: ${taskId}`);
      return taskId;
    } else if (analysis.isAuthError) {
      console.log('[HELPER] APIトークン未設定のためタスク作成をスキップ');
      return null;
    } else {
      console.log('[HELPER] タスク作成に失敗');
      return null;
    }
  }

  /**
   * Web UIでエラー表示をチェックする
   * @returns エラーが検出された場合はエラーメッセージ、なければnull
   */
  async checkForUIErrors(): Promise<string | null> {
    console.log('[HELPER] Web UIエラー表示チェック開始');
    
    try {
      // 様々なエラー表示要素をチェック
      const errorSelectors = [
        '[data-testid="error-message"]',
        '[data-testid="tool-error"]',
        '.ant-notification-notice-error',
        '.ant-message-error',
        '.ant-alert-error',
        '[role="alert"][class*="error"]',
        '.error-message',
        '.error-display',
        '[class*="error"][class*="notification"]',
        '[class*="error"][class*="toast"]'
      ];
      
      for (const selector of errorSelectors) {
        try {
          const errorElement = this.page.locator(selector);
          const count = await errorElement.count();
          
          if (count > 0) {
            // 表示されているエラー要素があるかチェック
            for (let i = 0; i < count; i++) {
              const element = errorElement.nth(i);
              const isVisible = await element.isVisible();
              
              if (isVisible) {
                const errorText = await element.textContent();
                if (errorText && errorText.trim()) {
                  console.log(`[HELPER] UIエラー検出: "${errorText}" (セレクター: ${selector})`);
                  return errorText.trim();
                }
              }
            }
          }
        } catch (selectorError) {
          // このセレクターでは見つからなかった、次を試す
          continue;
        }
      }
      
      // コンソールエラーもチェック
      const consoleErrors = await this.page.evaluate(() => {
        const errors: string[] = [];
        const originalError = console.error;
        
        // 一時的にconsole.errorをフック
        console.error = (...args: any[]) => {
          errors.push(args.map(arg => String(arg)).join(' '));
          originalError.apply(console, args);
        };
        
        // 復元
        setTimeout(() => {
          console.error = originalError;
        }, 100);
        
        return errors;
      });
      
      if (consoleErrors.length > 0) {
        const errorMessage = `コンソールエラー: ${consoleErrors.join('; ')}`;
        console.log(`[HELPER] ${errorMessage}`);
        return errorMessage;
      }
      
      console.log('[HELPER] Web UIエラー表示チェック: エラーなし');
      return null;
      
    } catch (checkError) {
      console.log(`[HELPER] エラーチェック自体でエラー: ${checkError}`);
      return null;
    }
  }

  /**
   * ツール実行後にUIエラーをチェックし、エラーがあれば例外を投げる
   * @param toolName 実行したツール名
   */
  async verifyNoUIErrors(toolName: string): Promise<void> {
    const errorMessage = await this.checkForUIErrors();
    if (errorMessage) {
      throw new Error(`${toolName} 実行後にUIエラーが検出されました: ${errorMessage}`);
    }
  }

  /**
   * ツール実行とエラーチェックを組み合わせた安全な実行メソッド
   * @param toolName ツール名
   * @param params パラメーター
   * @returns 実行結果
   */
  async executeMCPToolSafely(toolName: string, params?: string): Promise<string> {
    console.log(`[HELPER] 安全なMCPツール実行開始: ${toolName}`);
    
    // 実行前のエラーチェック
    await this.verifyNoUIErrors(`${toolName}実行前`);
    
    // ツール実行
    const result = await this.executeMCPTool(toolName, params);
    
    // 少し待機してUIが更新されるのを待つ
    await this.page.waitForTimeout(1000);
    
    // 実行後のエラーチェック
    await this.verifyNoUIErrors(`${toolName}実行後`);
    
    console.log(`[HELPER] 安全なMCPツール実行完了: ${toolName}`);
    return result;
  }

  /**
   * Todoistプロジェクトを作成する
   * @param name プロジェクト名
   * @param color プロジェクトの色（オプション）
   * @param parentId 親プロジェクトID（オプション）
   * @param isFavorite お気に入りに設定するか（オプション）
   * @returns 実行結果のテキスト
   */
  async createTodoistProject(name: string, color?: string, parentId?: string, isFavorite?: boolean): Promise<string> {
    console.log('[HELPER] Todoistプロジェクト作成を開始');
    
    const params: any = { name };
    if (color) params.color = color;
    if (parentId) params.parent_id = parentId;
    if (isFavorite !== undefined) params.is_favorite = isFavorite;
    
    const result = await this.executeMCPTool('todoist_create_project', JSON.stringify(params));
    
    console.log('[HELPER] Todoistプロジェクト作成完了');
    return result;
  }

  /**
   * Todoistプロジェクトを更新する
   * @param projectId プロジェクトID
   * @param name 新しいプロジェクト名（オプション）
   * @param color 新しいプロジェクトの色（オプション）
   * @param isFavorite お気に入りに設定するか（オプション）
   * @returns 実行結果のテキスト
   */
  async updateTodoistProject(projectId: string, name?: string, color?: string, isFavorite?: boolean): Promise<string> {
    console.log('[HELPER] Todoistプロジェクト更新を開始');
    
    const params: any = { project_id: projectId };
    if (name) params.name = name;
    if (color) params.color = color;
    if (isFavorite !== undefined) params.is_favorite = isFavorite;
    
    const result = await this.executeMCPTool('todoist_update_project', JSON.stringify(params));
    
    console.log('[HELPER] Todoistプロジェクト更新完了');
    return result;
  }

  /**
   * Todoistプロジェクトを削除する
   * @param projectId プロジェクトID
   * @returns 実行結果のテキスト
   */
  async deleteTodoistProject(projectId: string): Promise<string> {
    console.log('[HELPER] Todoistプロジェクト削除を開始');
    
    const params = { project_id: projectId };
    const result = await this.executeMCPTool('todoist_delete_project', JSON.stringify(params));
    
    console.log('[HELPER] Todoistプロジェクト削除完了');
    return result;
  }

  /**
   * プロジェクト作成結果からプロジェクトIDを抽出する
   * @param createResult プロジェクト作成APIの実行結果
   * @returns プロジェクトID（抽出できない場合はnull）
   */
  extractProjectIdFromCreateResult(createResult: string): string | null {
    console.log('[HELPER] プロジェクトID抽出を開始');
    console.log(`[DEBUG] 抽出対象テキスト: "${createResult}"`);
    
    try {
      // JSONレスポンスからIDを抽出
      const parsedResult = JSON.parse(createResult);
      
      if (parsedResult.id) {
        const projectId = parsedResult.id.toString();
        console.log(`[DEBUG] プロジェクトID抽出成功: ${projectId}`);
        return projectId;
      }
      
      console.log('[DEBUG] JSONレスポンスにIDフィールドが見つかりません');
      return null;
      
    } catch (parseError) {
      console.log('[DEBUG] JSON解析エラー、テキストからの抽出を試行');
      
      // テキストレスポンスからIDを抽出（複数パターンの正規表現）
      const patterns = [
        /"id":\s*["']?(\d+)["']?/,           // "id": "123456789" または "id": 123456789
        /\(ID:\s*(\d+)\)/,                   // (ID: 123456789)
        /ID:\s*(\d+)/,                       // ID: 123456789
        /project\s+ID\s*:\s*(\d+)/i,         // project ID: 123456789
        /created\s+successfully.*?(\d{8,})/i // created successfully ... 123456789
      ];
      
      for (const pattern of patterns) {
        const match = createResult.match(pattern);
        if (match && match[1]) {
          const projectId = match[1];
          console.log(`[DEBUG] テキストからプロジェクトID抽出成功: ${projectId} (パターン: ${pattern.source})`);
          return projectId;
        }
      }
      
      console.log('[DEBUG] テキストからのプロジェクトID抽出に失敗');
      return null;
    }
  }

  /**
   * プロジェクトを作成してIDを返す（テスト専用）
   * @param name プロジェクト名
   * @param color プロジェクトの色（オプション）
   * @param parentId 親プロジェクトID（オプション）
   * @param isFavorite お気に入りに設定するか（オプション）
   * @returns プロジェクトID（作成に失敗した場合はnull）
   */
  async createTodoistProjectAndGetId(name: string, color?: string, parentId?: string, isFavorite?: boolean): Promise<string | null> {
    console.log('[HELPER] プロジェクト作成とID取得を開始');
    
    const createResult = await this.createTodoistProject(name, color, parentId, isFavorite);
    const analysis = this.analyzeToolResult(createResult);
    
    if (analysis.isSuccess) {
      const projectId = this.extractProjectIdFromCreateResult(createResult);
      console.log(`[HELPER] プロジェクト作成とID取得完了: ${projectId}`);
      return projectId;
    } else if (analysis.isAuthError) {
      console.log('[HELPER] APIトークン未設定のためプロジェクト作成をスキップ');
      return null;
    } else {
      console.log('[HELPER] プロジェクト作成に失敗');
      return null;
    }
  }

  /**
   * プロジェクト名に特定の文字列を含むプロジェクトを検索する
   * @param searchTerm 検索する文字列
   * @returns マッチしたプロジェクトの配列（見つからない場合は空配列）
   */
  async findProjectsByName(searchTerm: string): Promise<any[]> {
    console.log(`[HELPER] プロジェクト名検索を開始: "${searchTerm}"`);
    
    const projectsResult = await this.getTodoistProjects();
    const analysis = this.analyzeToolResult(projectsResult);
    
    if (!analysis.isSuccess) {
      console.log('[HELPER] プロジェクト一覧の取得に失敗');
      return [];
    }
    
    try {
      // JSONレスポンスから projects を抽出
      const extractedJson = this.extractJsonFromResponse(projectsResult);
      if (!extractedJson || !Array.isArray(extractedJson)) {
        console.log('[HELPER] プロジェクト一覧の解析に失敗');
        return [];
      }
      
      const matchingProjects = extractedJson.filter(project => 
        project.name && project.name.includes(searchTerm)
      );
      
      console.log(`[HELPER] プロジェクト名検索完了: ${matchingProjects.length}件見つかりました`);
      matchingProjects.forEach(project => {
        console.log(`[DEBUG] 見つかったプロジェクト: ${project.name} (ID: ${project.id})`);
      });
      
      return matchingProjects;
      
    } catch (parseError) {
      console.log(`[HELPER] プロジェクト検索中にエラー: ${parseError}`);
      return [];
    }
  }

  /**
   * タスクを別のプロジェクトに移動する
   * @param taskId 移動するタスクのID
   * @param targetProjectId 移動先のプロジェクトID
   * @returns 移動結果のレスポンス文字列
   */
  async moveTodoistTask(taskId: string, targetProjectId: string): Promise<string> {
    console.log(`[HELPER] タスクを移動: ${taskId} → プロジェクト ${targetProjectId}`);
    
    const params = JSON.stringify({
      task_id: taskId,
      project_id: targetProjectId
    });
    
    const result = await this.executeMCPTool('todoist_move_task', params);
    console.log('[HELPER] タスク移動完了');
    return result;
  }

  /**
   * 移動操作の結果から新しいタスクIDを抽出する
   * @param moveResult 移動操作の実行結果
   * @returns 新しいタスクID（抽出できない場合はnull）
   */
  extractNewTaskIdFromMoveResult(moveResult: string): string | null {
    try {
      // "New task ID: XXXXXXXX" のパターンを検索
      const taskIdMatch = moveResult.match(/New task ID:\s*(\d+)/);
      if (taskIdMatch && taskIdMatch[1]) {
        return taskIdMatch[1];
      }
      
      console.log('[HELPER] 新しいタスクIDの抽出に失敗');
      return null;
    } catch (error) {
      console.log(`[HELPER] タスクID抽出でエラー: ${error}`);
      return null;
    }
  }

  /**
   * 移動操作の改善された解析機能（検証付き）
   * @param moveResult 移動操作の実行結果
   * @param originalTaskId 元のタスクID
   * @param targetProjectId 移動先プロジェクトID
   * @returns 移動操作の解析結果
   */
  async analyzeMoveResultWithVerification(
    moveResult: string, 
    originalTaskId: string, 
    targetProjectId: string
  ): Promise<{
    isSuccess: boolean;
    isAuthError: boolean;
    message: string;
    newTaskId?: string;
    verificationDetails?: {
      location?: {
        success: boolean;
        message: string;
        actualProjectId?: string;
      };
    };
  }> {
    console.log('[HELPER] 改善されたツール実行結果解析開始');
    
    // 基本的な結果解析
    const basicAnalysis = await this.analyzeToolResult(moveResult);
    
    if (basicAnalysis.isAuthError) {
      return {
        ...basicAnalysis,
        message: '認証エラー: APIトークンが設定されていません'
      };
    }
    
    if (!basicAnalysis.isSuccess) {
      return {
        ...basicAnalysis,
        message: `移動操作が失敗しました: ${basicAnalysis.message}`
      };
    }
    
    // 新しいタスクIDを抽出
    const newTaskId = this.extractNewTaskIdFromMoveResult(moveResult);
    
    if (!newTaskId) {
      return {
        ...basicAnalysis,
        isSuccess: false,
        message: '移動操作は成功したようですが、新しいタスクIDを取得できませんでした'
      };
    }
    
    // 新しいタスクの位置を検証
    console.log(`[HELPER] 新しいタスク ${newTaskId} の位置検証を実行中...`);
    const locationVerification = await this.verifyTaskLocation(newTaskId, targetProjectId);
    
    if (locationVerification.success) {
      return {
        ...basicAnalysis,
        newTaskId,
        message: `タスク移動が成功しました。新しいタスクID: ${newTaskId}`,
        verificationDetails: {
          location: locationVerification
        }
      };
    } else {
      return {
        ...basicAnalysis,
        newTaskId,
        isSuccess: false,
        message: `移動操作は完了しましたが、期待されたプロジェクトに新しいタスクが見つかりません: ${locationVerification.message}`,
        verificationDetails: {
          location: locationVerification
        }
      };
    }
  }
} 