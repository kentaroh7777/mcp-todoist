import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./test/setup.ts'],
    globals: true,
    // タイムアウト設定を強化
    testTimeout: 15000, // 15秒
    hookTimeout: 10000, // 10秒
    // 非同期テストの安定性向上
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true
      }
    },
    // テスト環境設定
    env: {
      NODE_ENV: 'test',
      VITEST: 'true'
    },
    // コンソールログを表示（デバッグ用）
    silent: false,
    // エラー処理を丁寧に
    dangerouslyIgnoreUnhandledErrors: false,
    // Jest互換性のAPIを有効化
    includeSource: ['components/**/*.{ts,tsx}', 'lib/**/*.{ts,tsx}'],
    // カバレッジ設定
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'test/',
        '**/*.d.ts',
        '**/*.config.{js,ts}',
        'coverage/',
        '.next/'
      ]
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
  // ビルド最適化
  define: {
    'process.env.NODE_ENV': '"test"'
  },
  // テスト環境用の設定
  optimizeDeps: {
    include: ['@testing-library/react', '@testing-library/user-event']
  }
})