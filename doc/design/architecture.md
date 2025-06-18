# MCP Todoist - アーキテクチャ設計

## 概要

TodoistのAPIと同等の機能を提供するMCPサーバーを、UIとサーバーを完全分離した構成で実装します。マルチアカウント対応と将来的なスケーラビリティを考慮した設計です。

## システムアーキテクチャ

### 全体構成

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Web UI        │    │   AI Tools      │    │   CLI Tools     │
│   (Next.js)     │    │   (Claude, etc) │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌─────────────────┐
                    │   MCP Server    │
                    │  (Standalone)   │
                    └─────────────────┘
                                 │
                    ┌─────────────────┐
                    │  Data Layer     │
                    │  (PostgreSQL)   │
                    └─────────────────┘
                                 │
                    ┌─────────────────┐
                    │  Todoist APIs   │
                    │ (Multi-Account) │
                    └─────────────────┘
```

### 分離型設計の利点

1. **独立デプロイ**: MCPサーバーとUIを個別に更新・デプロイ可能
2. **スケーラビリティ**: 各コンポーネントを独立してスケール可能
3. **柔軟性**: 異なるクライアント（Web、CLI、AI）からの接続に対応
4. **保守性**: 責任分離による保守性の向上

## プロジェクト構造

```
mcp-todoist/
├── packages/
│   ├── mcp-server/              # スタンドアロンMCPサーバー
│   │   ├── server/              # MCPサーバーコア
│   │   │   ├── index.ts         # メインサーバー
│   │   │   ├── mcp-handler.ts   # MCPプロトコル処理
│   │   │   └── websocket.ts     # WebSocket サーバー
│   │   ├── auth/                # 認証システム
│   │   │   ├── manager.ts       # 認証管理
│   │   │   ├── jwt.ts           # JWTトークン処理
│   │   │   └── middleware.ts    # 認証ミドルウェア
│   │   ├── accounts/            # マルチアカウント管理
│   │   │   ├── manager.ts       # アカウント管理
│   │   │   ├── storage.ts       # アカウントストレージ
│   │   │   └── context.ts       # アカウントコンテキスト
│   │   ├── adapters/            # 外部API アダプター
│   │   │   ├── todoist.ts       # Todoist API クライアント
│   │   │   ├── base.ts          # ベースアダプター
│   │   │   └── multi-account.ts # マルチアカウント対応
│   │   ├── tools/               # MCPツール実装
│   │   │   ├── tasks.ts         # タスク操作ツール
│   │   │   ├── projects.ts      # プロジェクト操作ツール
│   │   │   └── registry.ts      # ツール登録管理
│   │   ├── database/            # データベース層
│   │   │   ├── models/          # データモデル
│   │   │   ├── migrations/      # DBマイグレーション
│   │   │   └── connection.ts    # DB接続管理
│   │   ├── config/              # 設定管理
│   │   │   ├── index.ts         # 設定定義
│   │   │   └── validation.ts    # 設定検証
│   │   ├── types/               # TypeScript型定義
│   │   │   └── mcp.ts           # MCPプロトコル型
│   │   ├── index.ts             # メインエクスポート
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── .env.example
│   │
│   ├── web-ui/                  # Webユーザーインターフェース
│   │   ├── app/                 # Next.js App Router
│   │   │   ├── accounts/        # アカウント管理ページ
│   │   │   ├── dashboard/       # ダッシュボード
│   │   │   ├── test/            # MCPテスター
│   │   │   └── api/             # Next.js API Routes
│   │   ├── components/          # React コンポーネント
│   │   │   ├── accounts/        # アカウント関連UI
│   │   │   ├── dashboard/       # ダッシュボードUI
│   │   │   ├── mcp/             # MCPテスト関連
│   │   │   └── ui/              # 共通UIコンポーネント
│   │   ├── lib/                 # ユーティリティ
│   │   │   ├── mcp-client.ts    # MCPクライアント
│   │   │   ├── auth.ts          # 認証ヘルパー
│   │   │   └── api.ts           # API クライアント
│   │   ├── hooks/               # React Hooks
│   │   ├── package.json
│   │   ├── next.config.js
│   │   └── .env.example
│   │
│   └── shared/                  # 共通型定義・ユーティリティ
│       ├── types/               # TypeScript型定義
│       │   ├── mcp.ts           # MCPプロトコル型
│       │   ├── auth.ts          # 認証・アカウント型
│       │   └── index.ts         # エクスポート
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
│   ├── mcp-server.Dockerfile   # MCPサーバー用
│   ├── web-ui.Dockerfile       # WebUI用
│   └── docker-compose.yml      # 開発環境用
│
├── doc/                        # ドキュメント
│   ├── design/                 # 設計文書
│   │   ├── architecture.md     # アーキテクチャ設計
│   │   ├── api.md              # API設計
│   │   ├── database.md         # データベース設計
│   │   └── multi-account.md    # マルチアカウント設計
│   ├── deployment/             # デプロイ文書
│   └── user/                   # ユーザー文書
│
├── package.json                # ルートパッケージ（workspaces設定）
├── turbo.json                  # Turborepo設定
├── .gitignore
└── README.md
```

## 技術スタック

### MCPサーバー
- **Runtime**: Node.js (TypeScript)
- **Framework**: Express.js + WebSocket
- **Database**: PostgreSQL + Prisma
- **Authentication**: JWT + bcrypt
- **Validation**: Zod
- **Testing**: Jest + Supertest

### WebUI
- **Framework**: Next.js 14 (App Router)
- **UI Library**: Ant Design + Tailwind CSS
- **State Management**: Zustand
- **Authentication**: NextAuth.js
- **Testing**: Jest + React Testing Library

### 共通
- **Build Tool**: Turborepo
- **Package Manager**: npm workspaces
- **Linting**: ESLint + Prettier
- **Type Checking**: TypeScript

## データフロー

### 1. 認証フロー
```
Client → WebUI → MCPServer → Database
   ↓
JWT Token ← WebUI ← MCPServer ← User Validation
```

### 2. MCP操作フロー
```
AI Tool → MCPServer → Auth Check → Account Context → Todoist API
   ↓
Result ← MCPServer ← Response ← Account Context ← API Response
```

### 3. マルチアカウント処理
```
Request + JWT → Account Manager → Active Account → API Adapter → Todoist
     ↓
Response ← Account Context ← Account Filter ← API Response ← Todoist
```

## セキュリティ考慮事項

### 認証・認可
- JWT + リフレッシュトークンによる認証
- アカウント別権限管理
- API キーの暗号化保存
- セッション管理

### データ保護
- アカウント間データ分離
- SQL インジェクション対策
- XSS 対策
- CORS 設定

### API セキュリティ
- レート制限
- API キー管理
- ログ監査
- エラーハンドリング

## スケーラビリティ設計

### 水平スケーリング
- ステートレスMCPサーバー
- データベース読み取りレプリカ
- ロードバランサー対応

### パフォーマンス
- Redis キャッシュ
- データベースインデックス最適化
- API レスポンスキャッシュ
- 非同期処理 