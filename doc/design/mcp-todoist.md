# MCP Todoist - 統合設計書

## 1. 概要

TodoistのAPIと同等の機能を提供するMCPサーバーと、テスト用のWebUIを実装します。マルチアカウント対応とスケーラビリティを考慮した設計です。

## 2. アーキテクチャ

### 2.1 全体構成

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
                    │   Convex DB     │
                    │   Firebase Auth │
                    └─────────────────┘
                                 │
                    ┌─────────────────┐
                    │  Todoist APIs   │
                    │ (Multi-Account) │
                    └─────────────────┘
```

### 2.2 プロジェクト構造

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
│   │   │   ├── firebase.ts      # Firebase Auth統合
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
│   │   ├── database/            # データベース層（Convex）
│   │   │   ├── client.ts        # Convex クライアント
│   │   │   ├── mutations.ts     # データ更新処理
│   │   │   └── queries.ts       # データ取得処理
│   │   ├── config/              # 設定管理
│   │   │   ├── index.ts         # 設定定義
│   │   │   └── validation.ts    # 設定検証
│   │   ├── types/               # TypeScript型定義
│   │   │   ├── mcp.ts           # MCPプロトコル型
│   │   │   ├── auth.ts          # 認証関連型
│   │   │   └── todoist.ts       # Todoist API型
│   │   ├── index.ts             # メインエクスポート
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── .env.example
│   │
│   ├── web-ui/                  # Next.js WebUI
│   │   ├── app/                 # App Router
│   │   │   ├── accounts/        # アカウント管理ページ
│   │   │   ├── dashboard/       # ダッシュボード
│   │   │   ├── test/            # MCPテスター
│   │   │   ├── api/             # Next.js API Routes
│   │   │   ├── globals.css      # グローバルスタイル
│   │   │   ├── layout.tsx       # ルートレイアウト
│   │   │   └── page.tsx         # ホームページ
│   │   ├── components/          # React コンポーネント
│   │   │   ├── accounts/        # アカウント関連UI
│   │   │   ├── dashboard/       # ダッシュボードUI
│   │   │   ├── mcp/             # MCPテスト関連
│   │   │   └── ui/              # 共通UIコンポーネント
│   │   ├── lib/                 # ユーティリティ
│   │   │   ├── mcp-client.ts    # MCPクライアント
│   │   │   ├── auth.ts          # 認証ヘルパー
│   │   │   ├── firebase.ts      # Firebase設定
│   │   │   └── convex.ts        # Convex設定
│   │   ├── hooks/               # React Hooks
│   │   ├── types/               # WebUI固有の型定義
│   │   ├── package.json
│   │   ├── next.config.js       # Next.js設定
│   │   ├── tsconfig.json
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
├── convex/                      # Convex設定・スキーマ
│   ├── _generated/              # 自動生成ファイル
│   ├── schema.ts                # データベーススキーマ
│   ├── tasks.ts                 # タスク関連処理
│   ├── projects.ts              # プロジェクト関連処理
│   └── auth.ts                  # 認証処理
│
├── doc/                         # ドキュメント
│   ├── design/                  # 設計文書
│   ├── agent-prompts/           # AI実装プロンプト
│   └── user/                    # ユーザー文書
│
├── package.json                 # ルートパッケージ（workspaces設定）
├── tsconfig.json                # TypeScript設定
└── .env.example                 # 環境変数テンプレート
```

## 3. 技術スタック

### 3.1 バックエンド（MCPサーバー）
- **Runtime**: Node.js 18+ (TypeScript)
- **Framework**: Express.js + WebSocket
- **Database**: Convex (リアルタイムデータベース)
- **Authentication**: Firebase Auth
- **Validation**: Zod
- **Testing**: Vitest + Supertest
- **Build**: npm workspaces

### 3.2 フロントエンド（WebUI）
- **Framework**: Next.js 14 (App Router)
- **UI Library**: Ant Design
- **State Management**: React state + Convex reactivity  
- **Authentication**: Firebase Auth
- **Testing**: Vitest + React Testing Library

### 3.3 開発ツール
- **Package Manager**: npm workspaces
- **Linting**: ESLint + Prettier
- **Type Checking**: TypeScript strict mode
- **Testing Framework**: Vitest (TDD重視)

## 4. 開発フロー（TDD）

### 4.1 テスト駆動開発サイクル

#### Phase 1: Red - テスト先行実装
1. **要件を満たすテストケースを先に作成**
2. **テストが失敗することを確認**
3. **実装は一切行わない**

#### Phase 2: Green - 最小実装
1. **テストを通すための最小限のコードを実装**
2. **すべてのテストが成功することを確認**
3. **機能追加は一切行わない**

#### Phase 3: Blue - リファクタリング
1. **テストを維持しながらコード品質を改善**
2. **パフォーマンス・可読性・保守性の向上**
3. **設計パターンの適用**

### 4.2 テスト戦略

#### 単体テスト（高優先度）
- **MCPプロトコルハンドラー**
- **Todoist APIクライアント**
- **認証・認可ロジック**
- **データ変換処理**

#### 統合テスト（中優先度）
- **MCP サーバー全体**
- **外部API統合**
- **データベース統合**
- **認証フロー**

#### E2Eテスト（オプション）
- **UI操作フロー**
- **MCP通信フロー**

## 5. 実装スケジュール

### Phase 1: MCP Server Foundation（20時間）
#### Task 1-1: MCPプロトコル基盤
- **Red**: MCPプロトコルハンドラーのテスト（2時間）
- **Green**: 基本的なMCPサーバー実装（6時間）  
- **Blue**: エラーハンドリング・型安全性強化（4時間）

#### Task 1-2: Todoist APIクライアント
- **Red**: Todoist APIクライアントのテスト（2時間）
- **Green**: CRUD操作の基本実装（4時間）
- **Blue**: レート制限・エラー処理強化（2時間）

### Phase 2: WebUI Development（30時間）
#### Task 2-1: 認証・アカウント管理
- **Red**: Firebase Auth統合テスト（3時間）
- **Green**: ログイン・マルチアカウント基本機能（8時間）
- **Blue**: UX改善・セキュリティ強化（4時間）

#### Task 2-2: MCPテスター画面  
- **Red**: MCP通信テストのテスト（2時間）
- **Green**: リアルタイム通信・デバッグ画面（8時間）
- **Blue**: 使いやすさ改善・エラー表示（3時間）

#### Task 2-3: ダッシュボード
- **Red**: タスク・プロジェクト表示テスト（2時間）

### Phase 3: マルチアカウント対応（25時間）
#### Task 3-1: アカウント切り替え機能
- **Red**: アカウント切り替えロジックテスト（3時間）
- **Green**: UI・データ分離実装（8時間）
- **Blue**: パフォーマンス・UX最適化（4時間）

#### Task 3-2: データ同期・整合性
- **Red**: データ同期テスト（3時間）
- **Green**: Convex統合・リアルタイム同期（5時間）
- **Blue**: 競合解決・整合性保証（2時間）

## 6. 品質保証

### 6.1 コード品質
- **TypeScript strict mode**
- **ESLint + Prettier 統一**
- **80%以上のテストカバレッジ**
- **循環的複雑度 < 10**

### 6.2 パフォーマンス
- **API レスポンス < 500ms**
- **UI初期表示 < 2秒**
- **メモリ使用量監視**

### 6.3 セキュリティ
- **依存関係脆弱性チェック**
- **認証・認可テスト**
- **データ暗号化確認**

## 7. デプロイ・運用

### 7.1 開発環境
```bash
# 初期セットアップ
npm install
npm run setup

# 開発サーバー起動
npm run dev

# テスト実行  
npm test
npm run test:coverage
```

### 7.2 本番環境
- **MCPサーバー**: Node.js + PM2
- **WebUI**: Vercel / Netlify
- **Database**: Convex Cloud
- **Authentication**: Firebase

### 7.3 監視・ログ
- **APM**: New Relic / DataDog  
- **ログ**: Winston + CloudWatch
- **エラートラッキング**: Sentry
- **アップタイム監視**: Pingdom

## 8. 今後の拡張計画

### 8.1 追加機能
- **他のタスク管理ツール対応**（Asana, Notion, etc）
- **AI アシスタント機能**
- **チーム・コラボレーション機能**
- **カスタムワークフロー**

### 8.2 技術改善
- **GraphQL API 対応**
- **WebRTC リアルタイム通信**  
- **モバイルアプリ**
- **オフライン対応**

---

**実装時間見積もり**: 75時間（実装）+ 35時間（テスト）= 110時間
**開発期間**: 個人開発で2-3週間を想定
**重要**: TDD厳守、設計書との整合性維持、段階的リリース 