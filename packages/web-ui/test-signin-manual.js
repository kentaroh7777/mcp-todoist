const { chromium } = require('playwright');

(async () => {
  console.log('Starting Playwright test for signin page...');
  
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 1000  // スローモーションで操作を確認
  });
  
  const context = await browser.newContext();
  const page = await context.newPage();
  
  try {
    console.log('Navigating to test page...');
    await page.goto('http://localhost:3000/test', { waitUntil: 'networkidle' });
    
    console.log('Checking page title...');
    const title = await page.locator('h1').textContent();
    console.log('Page title:', title);
    
    console.log('Looking for signin message...');
    const signinMessage = await page.locator('text=サインインが必要です').isVisible();
    console.log('Signin message visible:', signinMessage);
    
    console.log('Looking for signin button...');
    const signinButton = await page.locator('button:has-text("サインイン")').isVisible();
    console.log('Signin button visible:', signinButton);
    
    if (signinButton) {
      console.log('Clicking signin button...');
      await page.click('button:has-text("サインイン")');
      
      // 認証フローの開始を確認
      await page.waitForTimeout(2000);
      
      console.log('Checking for authentication flow...');
      const hasFirebaseUI = await page.locator('[data-testid="firebase-auth"]').isVisible().catch(() => false);
      const hasSignInModal = await page.locator('.ant-modal:has-text("サインイン")').isVisible().catch(() => false);
      
      console.log('Firebase UI visible:', hasFirebaseUI);
      console.log('Signin modal visible:', hasSignInModal);
    }
    
    await page.screenshot({ path: 'test-page-signin-screenshot.png', fullPage: true });
    console.log('Screenshot saved as test-page-signin-screenshot.png');
    
    // 5秒間ブラウザを開いたまま確認
    console.log('Keeping browser open for 5 seconds for visual inspection...');
    await page.waitForTimeout(5000);
    
  } catch (error) {
    console.error('Test error:', error);
    await page.screenshot({ path: 'test-page-error-screenshot.png', fullPage: true });
  } finally {
    await browser.close();
    console.log('Test completed!');
  }
})(); 