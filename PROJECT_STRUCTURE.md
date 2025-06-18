# MCP Todoist - 分離型アーキテクチャ

## プロジェクト構造

```
mcp-todoist/
├── packages/
│   ├── mcp-server/              # スタンドアロンMCPサーバー
│   │   ├── server/              # MCPサーバーコア
│   │   │   ├── index.ts         # メインサーバー
│   │   │   ├── mcp-handler.ts
│   │   │   └── websocket.ts
│   │   ├── auth/                # 認証システム
│   │   │   ├── manager.ts
│   │   │   ├── jwt.ts
│   │   │   └── middleware.ts
│   │   ├── accounts/            # マルチアカウント管理
│   │   │   ├── manager.ts
│   │   │   ├── storage.ts
│   │   │   └── types.ts
│   │   ├── adapters/            # Todoist API アダプター
│   │   │   ├── todoist.ts
│   │   │   ├── base.ts
│   │   │   └── multi-account.ts
│   │   ├── tools/               # MCPツール実装
│   │   │   ├── tasks.ts
│   │   │   ├── projects.ts
│   │   │   └── registry.ts
│   │   ├── database/            # データベース層
│   │   │   ├── models/
│   │   │   ├── migrations/
│   │   │   └── index.ts
│   │   ├── config/              # 設定管理
│   │   │   ├── index.ts
│   │   │   └── validation.ts
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── .env.example
│   │
│   ├── web-ui/                  # Webユーザーインターフェース
│   │   ├── app/                 # Next.js App Router
│   │   │   ├── accounts/        # アカウント管理
│   │   │   ├── dashboard/       # ダッシュボード
│   │   │   ├── test/            # MCPテスター
│   │   │   └── api/             # Next.js API Routes
│   │   ├── components/          # React コンポーネント
│   │   │   ├── accounts/
│   │   │   ├── dashboard/
│   │   │   ├── mcp/
│   │   │   └── ui/
│   │   ├── lib/                 # ユーティリティ
│   │   │   ├── mcp-client.ts
│   │   │   ├── auth.ts
│   │   │   └── api.ts
│   │   ├── hooks/               # React Hooks
│   │   ├── package.json
│   │   ├── next.config.js
│   │   └── .env.example
│   │
│   └── shared/                  # 共通型定義・ユーティリティ
│       ├── types/               # TypeScript型定義
│       │   ├── mcp.ts
│       │   ├── todoist.ts
│       │   ├── auth.ts
│       │   └── index.ts
│       ├── utils/               # 共通ユーティリティ
│       ├── constants/           # 定数定義
│       ├── package.json
│       └── tsconfig.json
│
├── scripts/                     # 開発・デプロイスクリプト
│   ├── dev.sh                  # 開発環境起動
│   ├── build.sh                # ビルドスクリプト
│   └── deploy.sh               # デプロイスクリプト
│
├── docker/                     # Docker設定
│   ├── mcp-server.Dockerfile
│   ├── web-ui.Dockerfile
│   └── docker-compose.yml
│
├── docs/                       # ドキュメント
│   ├── architecture.md
│   ├── api.md
│   ├── deployment.md
│   └── multi-account.md
│
├── package.json                # ルートパッケージ（workspaces設定）
├── turbo.json                  # Turborepo設定
├── .gitignore
└── README.md
```

## アーキテクチャの特徴

### 1. 完全分離型設計
- **MCPサーバー**: スタンドアロンで動作、WebSocket/HTTP対応
- **WebUI**: MCPサーバーとは独立したクライアント
- **共通パッケージ**: 型定義とユーティリティを共有

### 2. マルチアカウント対応
- ユーザー認証システム
- アカウント別API設定管理
- アカウント間データ分離
- 動的アカウント切り替え

### 3. スケーラブル設計
- マイクロサービス風の構成
- 水平スケーリング対応
- プラグインアーキテクチャ

### 4. 開発効率
- Turborepoによるモノレポ管理
- 共通型定義による型安全性
- ホットリロード対応

## デプロイ戦略

### 開発環境
```bash
# 全体を一度に起動
npm run dev

# 個別起動
npm run dev:server    # MCPサーバーのみ
npm run dev:ui        # WebUIのみ
```

### 本番環境
- **MCPサーバー**: Docker + Kubernetes
- **WebUI**: Vercel or Docker
- **データベース**: PostgreSQL + Redis
- **認証**: JWT + リフレッシュトークン

## マルチアカウント仕様

### アカウント管理
- ユーザー登録・ログイン
- アカウント別Todoist APIトークン
- アカウント設定（タイムゾーン、言語等）
- アクセス権限管理

### データ分離
- アカウントIDベースのデータ分離
- API呼び出し時のアカウント識別
- ツール実行時のコンテキスト管理

### セキュリティ
- JWT認証
- APIトークン暗号化保存
- アカウント間データ漏洩防止
- レート制限 