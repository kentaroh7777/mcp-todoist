import { chromium } from 'playwright';

interface ConsoleMessage {
  timestamp: string;
  type: string;
  text: string;
}

async function collectMCPLogs() {
  const browser = await chromium.launch({ 
    headless: false,  // ブラウザを表示して動作を確認
    slowMo: 1000      // 操作をゆっくりにして見やすくする
  });
  
  const page = await browser.newPage();
  const logs: ConsoleMessage[] = [];
  
  // コンソールメッセージをキャプチャ
  page.on('console', msg => {
    const timestamp = new Date().toISOString().split('T')[1].slice(0, -1); // HH:mm:ss.sss形式
    logs.push({
      timestamp,
      type: msg.type(),
      text: msg.text()
    });
  });
  
  // ページエラーもキャプチャ
  page.on('pageerror', error => {
    const timestamp = new Date().toISOString().split('T')[1].slice(0, -1);
    logs.push({
      timestamp,
      type: 'error',
      text: `PAGE ERROR: ${error.message}`
    });
  });
  
  try {
    console.log('🚀 ブラウザを起動してテストページにアクセス中...');
    await page.goto('http://localhost:3000/test', { waitUntil: 'networkidle' });
    
    console.log('⏱️  ページ読み込み完了、3秒待機中...');
    await page.waitForTimeout(3000);
    
    console.log('🔍 ページ上のボタンを調査中...');
    
    // ページ上のすべてのボタンを調査
    const allButtons = await page.locator('button').all();
    console.log(`📋 ページ上のボタン数: ${allButtons.length}`);
    
    for (let i = 0; i < allButtons.length; i++) {
      const buttonText = await allButtons[i].textContent();
      const isVisible = await allButtons[i].isVisible();
      console.log(`  - ボタン ${i + 1}: "${buttonText}" (表示: ${isVisible})`);
    }
    
    // 接続ボタンを探してクリック（スペースを含む可能性を考慮）
    const connectButton = page.locator('button').filter({ hasText: /接\s*続/ });
    const isConnectButtonVisible = await connectButton.isVisible();
    console.log(`🔍 「接続」ボタンの表示状態: ${isConnectButtonVisible}`);
    
    if (!isConnectButtonVisible) {
      // 「切断」ボタンがあるかチェック
      const disconnectButton = page.locator('button').filter({ hasText: /切\s*断/ });
      const isDisconnectButtonVisible = await disconnectButton.isVisible();
      console.log(`🔍 「切断」ボタンの表示状態: ${isDisconnectButtonVisible}`);
      
      if (isDisconnectButtonVisible) {
        console.log('⚠️  既に接続済みのようです。まず切断してから接続します...');
        await disconnectButton.click();
        await page.waitForTimeout(2000);
        
        // 再度接続ボタンを探す
        await connectButton.waitFor({ state: 'visible', timeout: 5000 });
        console.log('🎯 切断後、接続ボタンが表示されました。クリック中...');
        await connectButton.click();
      } else {
        console.log('❌ 接続ボタンも切断ボタンも見つかりません');
        throw new Error('接続/切断ボタンが見つかりません');
      }
    } else {
      console.log('🎯 接続ボタンが見つかりました。クリック中...');
      await connectButton.click();
    }
    
    console.log('⏳ 接続処理とログの収集のため10秒待機中...');
    await page.waitForTimeout(10000);
    
    console.log('📊 ログ収集完了！結果を表示します:\n');
    
  } catch (error) {
    console.error('❌ エラーが発生しました:', error);
  } finally {
    await browser.close();
  }
  
  // 収集したログを整理して表示
  if (logs.length === 0) {
    console.log('⚠️  コンソールログが収集されませんでした。');
    console.log('サーバーが起動していることを確認してください:');
    console.log('  - Convex: http://127.0.0.1:3210');
    console.log('  - Next.js: http://localhost:3000');
    console.log('  - MCP Server: http://localhost:4000');
    return;
  }
  
  console.log('='.repeat(80));
  console.log(`📋 収集されたコンソールログ (${logs.length}件)`);
  console.log('='.repeat(80));
  
  // MCPテスター関連のログをフィルタ
  const mcpLogs = logs.filter(log => 
    log.text.includes('[MCPTester]') || 
    log.text.includes('[useExtendedConvexMCPClient]') || 
    log.text.includes('[ExtendedConvexMCPClient]') ||
    log.text.includes('Error') ||
    log.text.includes('Failed')
  );
  
  if (mcpLogs.length > 0) {
    console.log('\n🎯 MCP関連ログ:');
    console.log('-'.repeat(40));
    mcpLogs.forEach((log, index) => {
      const icon = log.type === 'error' ? '❌' : log.type === 'warn' ? '⚠️' : '📝';
      console.log(`${icon} [${log.timestamp}] ${log.text}`);
    });
  }
  
  console.log('\n📊 全コンソールログ:');
  console.log('-'.repeat(40));
  logs.forEach((log, index) => {
    const icon = log.type === 'error' ? '❌' : log.type === 'warn' ? '⚠️' : '📝';
    console.log(`${icon} [${log.timestamp}] (${log.type}) ${log.text}`);
  });
  
  console.log('\n' + '='.repeat(80));
  
  // 分析結果
  const errorLogs = logs.filter(log => log.type === 'error');
  const warningLogs = logs.filter(log => log.type === 'warn');
  
  console.log('📈 ログ分析:');
  console.log(`  - 総ログ数: ${logs.length}`);
  console.log(`  - エラー: ${errorLogs.length}`);
  console.log(`  - 警告: ${warningLogs.length}`);
  console.log(`  - MCP関連: ${mcpLogs.length}`);
  
  if (errorLogs.length > 0) {
    console.log('\n❌ エラーが検出されました:');
    errorLogs.forEach(log => console.log(`   - ${log.text}`));
  }
  
  if (mcpLogs.length === 0) {
    console.log('\n⚠️  MCP関連のログが見つかりませんでした。');
    console.log('接続ボタンが正しく動作していない可能性があります。');
  }
}

// メイン実行
collectMCPLogs()
  .then(() => {
    console.log('\n✅ ログ収集が完了しました！');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 ログ収集でエラーが発生しました:', error);
    process.exit(1);
  });

export default collectMCPLogs; 