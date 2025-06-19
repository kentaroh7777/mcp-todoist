import { test as base } from '@playwright/test';

// Firebase Emulatorのセットアップやモックデータの準備など
export const test = base.extend({
  // カスタムフィクスチャを追加できます
});

export { expect } from '@playwright/test';

// テスト環境の共通設定
export const TEST_CONFIG = {
  // デフォルトのサーバーURL
  DEFAULT_SERVER_URL: 'convex://mcp-todoist',
  
  // テスト用の認証情報
  TEST_EMAIL: 'test@example.com',
  TEST_PASSWORD: 'password123',
  
  // タイムアウト設定
  DEFAULT_TIMEOUT: 30000,
  
  // Convexデプロイメント設定
  CONVEX_DEPLOYMENT: 'confident-yak-98',
}; 