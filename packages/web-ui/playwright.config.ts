import { defineConfig, devices } from '@playwright/test';

/**
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './test/e2e',
  /* Run tests sequentially instead of parallel */
  fullyParallel: false,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Use only 1 worker to ensure sequential execution */
  workers: 1,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: 'line',
  /* Global test timeout (30 seconds) */
  timeout: 30000,
  /* Expect timeout (10 seconds) */
  expect: {
    timeout: 10000,
  },
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: 'http://localhost:3000',
    /* Show browser window during tests */
    headless: false,
    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
    /* Screenshot only on failure */
    screenshot: 'only-on-failure',
    /* Video on failure */
    video: 'retain-on-failure',
    /* Action timeout (5 seconds) */
    actionTimeout: 5000,
    /* Navigation timeout (10 seconds) */
    navigationTimeout: 10000,
  },

  /* Configure projects for major browsers - only use chromium for now */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },

    // Commented out other browsers to avoid parallel execution
    // {
    //   name: 'firefox',
    //   use: { ...devices['Desktop Firefox'] },
    // },

    // {
    //   name: 'webkit',
    //   use: { ...devices['Desktop Safari'] },
    // },

    // /* Test against mobile viewports. */
    // {
    //   name: 'Mobile Chrome',
    //   use: { ...devices['Pixel 5'] },
    // },
    // {
    //   name: 'Mobile Safari',
    //   use: { ...devices['iPhone 12'] },
    // },

    /* Test against branded browsers. */
    // {
    //   name: 'Microsoft Edge',
    //   use: { ...devices['Desktop Edge'], channel: 'msedge' },
    // },
    // {
    //   name: 'Google Chrome',
    //   use: { ...devices['Desktop Chrome'], channel: 'chrome' },
    // },
  ],

  /* Use existing dev server instead of starting a new one */
  // webServer: {
  //   command: 'npm run dev',
  //   url: 'http://localhost:3000',
  //   reuseExistingServer: !process.env.CI,
  //   timeout: 120 * 1000,
  // },
}); 