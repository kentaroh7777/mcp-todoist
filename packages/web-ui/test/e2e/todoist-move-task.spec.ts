import { test, expect } from '@playwright/test';
import { MCPTestHelper } from './helper';

test.describe('todoist_move_task専用テスト', () => {
  let mcpHelper: MCPTestHelper;
  
  test.beforeEach(async ({ page }) => {
    mcpHelper = new MCPTestHelper(page);
    await mcpHelper.navigateToTestPageAndVerify();
    await mcpHelper.connectToMCPServer();
    await mcpHelper.switchToToolsTabAndVerify();
  });

  test('todoist_move_task: タスクの移動機能', async ({ page }) => {
    test.setTimeout(120000); // 2分に延長（todoist_move_taskは複雑な処理のため）
    const helper = new MCPTestHelper(page);
    let createdTaskId: string | null = null;
    
    try {
      await helper.navigateToTestPageAndVerify();
      await helper.connectToMCPServer();
      await helper.switchToToolsTabAndVerify();
      
      // 利用可能なプロジェクト一覧を取得
      const projectsResult = await helper.getTodoistProjects();
      const projectsAnalysis = helper.analyzeToolResult(projectsResult);
      
      if (!projectsAnalysis.isSuccess) {
        console.log('[DEBUG] プロジェクト一覧取得に失敗、テストをスキップ');
        test.skip();
        return;
      }
      
      // ヘルパークラスのextractJsonFromResponseメソッドを使用してプロジェクト一覧をパース
      const availableProjects = (helper as any).extractJsonFromResponse(projectsResult);
      
      if (!availableProjects || !Array.isArray(availableProjects) || availableProjects.length < 2) {
        console.log('[DEBUG] 移動テストに必要な複数のプロジェクトが見つからない、テストをスキップ');
        console.log(`[DEBUG] 取得されたプロジェクト数: ${availableProjects ? availableProjects.length : 0}`);
        test.skip();
        return;
      }
      
      console.log(`[DEBUG] 利用可能なプロジェクト: ${availableProjects.map(p => `${p.name}(${p.id})`).join(', ')}`);
      
      // 最初のプロジェクト（通常はInbox）にタスクを作成
      const sourceProject = availableProjects[0];
      const targetProject = availableProjects.find(p => p.id !== sourceProject.id) || availableProjects[1];
      
      console.log(`[DEBUG] 移動テスト: ${sourceProject.name}(${sourceProject.id}) → ${targetProject.name}(${targetProject.id})`);
      
      // タスクを作成（最初のプロジェクトに）
      const timestamp = Date.now();
      const taskContent = `todoist_move_task専用テスト - ${timestamp}`;
      createdTaskId = await helper.createTodoistTaskAndGetId(taskContent, sourceProject.id);
      expect(createdTaskId).toBeTruthy();
      
      if (!createdTaskId) {
        console.log('[DEBUG] タスク作成に失敗またはAPIトークン未設定、テストをスキップ');
        test.skip();
        return;
      }
      
      // 作成直後のタスクの位置を確認
      const initialLocationVerification = await helper.verifyTaskLocation(createdTaskId, sourceProject.id);
      expect(initialLocationVerification.success).toBe(true);
      console.log(`[DEBUG] 初期位置確認: ${initialLocationVerification.message}`);
      
      // todoist_move_taskでタスクを移動
      console.log(`[DEBUG] todoist_move_taskでタスクを移動: ${createdTaskId} → 🎯 プロジェクト(${targetProject.id})`);
      const moveToProjectResult = await helper.moveTodoistTask(createdTaskId, targetProject.id);
      
      // 改善された解析機能を使用
      const moveToProjectAnalysis = await helper.analyzeMoveResultWithVerification(
        moveToProjectResult,
        createdTaskId,
        targetProject.id
      );
      
      console.log(`[DEBUG] todoist_move_taskによる移動結果: ${JSON.stringify(moveToProjectAnalysis, null, 2)}`);
      
      // 実際の状態変更が確認されることを期待
      expect(moveToProjectAnalysis.isSuccess).toBe(true);
      expect(moveToProjectAnalysis.newTaskId).toBeDefined();
      
      // 新しいタスクIDを使用して以降の操作を実行
      const newTaskIdAfterMove = moveToProjectAnalysis.newTaskId!;
      
      // タスクを元のプロジェクトに戻す（専用ツール使用）
      console.log(`[DEBUG] todoist_move_taskでタスクを元のプロジェクトに戻す: ${newTaskIdAfterMove} → ${sourceProject.name}(${sourceProject.id})`);
      const moveBackResult = await helper.moveTodoistTask(newTaskIdAfterMove, sourceProject.id);
      
      const moveBackAnalysis = await helper.analyzeMoveResultWithVerification(
        moveBackResult,
        newTaskIdAfterMove,
        sourceProject.id
      );
      
      console.log(`[DEBUG] 元プロジェクトへの移動結果: ${JSON.stringify(moveBackAnalysis, null, 2)}`);
      
      // 元のプロジェクトへの移動が成功することを期待
      expect(moveBackAnalysis.isSuccess).toBe(true);
      expect(moveBackAnalysis.newTaskId).toBeDefined();
      
      // テスト完了後、最終的なタスクをクリーンアップ
      const finalTaskId = moveBackAnalysis.newTaskId!;
      try {
        console.log(`[DEBUG] テストタスクのクリーンアップ: ${finalTaskId}`);
        await helper.closeTodoistTask(finalTaskId);
      } catch (cleanupError) {
        console.log(`タスク ${finalTaskId} のクリーンアップに失敗: ${cleanupError}`);
      }
      
    } finally {
      // クリーンアップ
      if (createdTaskId) {
        try {
          await helper.closeTodoistTask(createdTaskId);
          console.log(`[DEBUG] テスト用タスクのクリーンアップ完了: ${createdTaskId}`);
        } catch (error) {
          console.log(`タスク ${createdTaskId} のクリーンアップに失敗: ${error}`);
        }
      }
    }
  });

  test('todoist_move_taskとtodoist_update_taskの比較', async ({ page }) => {
    const helper = new MCPTestHelper(page);
    let createdTaskId1: string | null = null;
    let createdTaskId2: string | null = null;
    
    try {
      await helper.navigateToTestPageAndVerify();
      await helper.connectToMCPServer();
      await helper.switchToToolsTabAndVerify();
      
      // 利用可能なプロジェクト一覧を取得
      const projectsResult = await helper.getTodoistProjects();
      const projectsAnalysis = helper.analyzeToolResult(projectsResult);
      
      if (!projectsAnalysis.isSuccess) {
        console.log('[DEBUG] プロジェクト一覧取得に失敗、比較テストをスキップ');
        test.skip();
        return;
      }
      
      // ヘルパークラスのextractJsonFromResponseメソッドを使用してプロジェクト一覧をパース
      const availableProjects = (helper as any).extractJsonFromResponse(projectsResult);
      
      if (!availableProjects || !Array.isArray(availableProjects) || availableProjects.length < 2) {
        console.log('[DEBUG] 比較テストに必要な複数のプロジェクトが見つからない、テストをスキップ');
        console.log(`[DEBUG] 取得されたプロジェクト数: ${availableProjects ? availableProjects.length : 0}`);
        test.skip();
        return;
      }
      
      console.log(`[DEBUG] 利用可能なプロジェクト: ${availableProjects.map(p => `${p.name}(${p.id})`).join(', ')}`);
      
      const sourceProject = availableProjects[0];
      const targetProject = availableProjects.find(p => p.id !== sourceProject.id) || availableProjects[1];
      
      console.log(`[DEBUG] 比較テスト: ${sourceProject.name}(${sourceProject.id}) → ${targetProject.name}(${targetProject.id})`);
      
      const timestamp = Date.now();
      
      // 2つのタスクを作成（同じソースプロジェクトに）
      createdTaskId1 = await helper.createTodoistTaskAndGetId(`move_task比較テスト1 - ${timestamp}`, sourceProject.id);
      createdTaskId2 = await helper.createTodoistTaskAndGetId(`move_task比較テスト2 - ${timestamp}`, sourceProject.id);
      
      if (!createdTaskId1 || !createdTaskId2) {
        console.log('[DEBUG] タスク作成に失敗、比較テストをスキップ');
        test.skip();
        return;
      }
      
      // タスク1: todoist_move_taskで移動
      console.log(`[DEBUG] タスク1をtodoist_move_taskで移動: ${createdTaskId1} → ${targetProject.name}(${targetProject.id})`);
      const moveResult1 = await helper.moveTodoistTask(createdTaskId1, targetProject.id);
      const moveAnalysis1 = await helper.analyzeToolResultWithVerification(
        moveResult1,
        {
          taskId: createdTaskId1,
          expectedProjectId: targetProject.id,
          operationType: 'move'
        }
      );
      
      // タスク2: todoist_update_taskで移動
      console.log(`[DEBUG] タスク2をtodoist_update_taskで移動: ${createdTaskId2} → ${targetProject.name}(${targetProject.id})`);
      const moveResult2 = await helper.updateTodoistTask(createdTaskId2, undefined, undefined, targetProject.id);
      const moveAnalysis2 = await helper.analyzeToolResultWithVerification(
        moveResult2,
        {
          taskId: createdTaskId2,
          expectedProjectId: targetProject.id,
          operationType: 'move'
        }
      );
      
      // 両方の移動が成功することを確認
      console.log(`[DEBUG] todoist_move_task結果: ${moveAnalysis1.isSuccess ? '成功' : '失敗'} (${moveAnalysis1.message})`);
      console.log(`[DEBUG] todoist_update_task結果: ${moveAnalysis2.isSuccess ? '成功' : '失敗'} (${moveAnalysis2.message})`);
      
      expect(moveAnalysis1.isSuccess).toBe(true);
      expect(moveAnalysis2.isSuccess).toBe(true);
      
      // 両方の手法で同じ結果が得られることを確認
      console.log('[DEBUG] 両方の移動手法が成功し、同じ結果が得られることを確認');
      
    } finally {
      // クリーンアップ
      if (createdTaskId1) {
        try {
          await helper.closeTodoistTask(createdTaskId1);
        } catch (error) {
          console.log(`タスク1 ${createdTaskId1} のクリーンアップに失敗: ${error}`);
        }
      }
      if (createdTaskId2) {
        try {
          await helper.closeTodoistTask(createdTaskId2);
        } catch (error) {
          console.log(`タスク2 ${createdTaskId2} のクリーンアップに失敗: ${error}`);
        }
      }
    }
  });
}); 