import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ルートディレクトリの環境変数を読み込み
dotenv.config({ 
  path: path.resolve(__dirname, '../../.env') 
});

console.log('Loaded environment variables:');
console.log('NEXT_PUBLIC_CONVEX_URL:', process.env.NEXT_PUBLIC_CONVEX_URL);
console.log('CONVEX_DEPLOYMENT:', process.env.CONVEX_DEPLOYMENT);

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['convex']
  },
  env: {
    // 環境変数を明示的に次のプロセスに渡す
    NEXT_PUBLIC_CONVEX_URL: process.env.NEXT_PUBLIC_CONVEX_URL,
    CONVEX_DEPLOYMENT: process.env.CONVEX_DEPLOYMENT,
    TODOIST_API_TOKEN: process.env.TODOIST_API_TOKEN,
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
  },
  webpack: (config, { isServer }) => {
    // undiciの問題を完全に回避
    config.resolve.alias = {
      ...config.resolve.alias,
      // undiciを無効化
      'undici': false,
      // Node.js組み込みモジュールの代替
      'node:http': false,
      'node:https': false,
      'node:util': false,
      'node:url': false
    };
    
    // クライアントサイドのポリフィル
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
        http: false,
        https: false,
        url: false,
        util: false,
        stream: false,
        buffer: false,
        // undiciを完全に無効化
        undici: false
      };
    }
    
    return config;
  }
};

export default nextConfig; 