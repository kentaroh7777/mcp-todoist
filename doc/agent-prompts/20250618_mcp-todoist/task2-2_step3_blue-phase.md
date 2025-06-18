# Task 2-2 Step 3: MCPテスター画面 (Blue Phase)

## 概要
Green Phaseで実装したMCPテスター画面の基本機能を改善し、品質向上・テスト修正・UX改善・セキュリティ強化を行います。TDDのBlue Phaseとして、コード品質向上とリファクタリングを実施します。

## 依存関係
- 前Phase: Task 2-2 Step 2 (Green Phase) - 基本実装完了、64件テスト成功
- 本実装の元となる設計書: doc/design/mcp-todoist.md

### 前提条件
- MCPクライアント・UIコンポーネント・通信統合が実装済み
- 64件のテストが成功、60件のテストに改善課題あり
- WebSocket・Firebase Auth・Ant Design統合が動作すること

### 成果物
- テストモック改善 (`test/setup.ts` 強化、`vitest.config.ts` 最適化)
- エラーハンドリング強化 (`lib/mcp/client.ts` 堅牢性向上)
- UX改善 (`components/MCPTester.tsx` レスポンシブ・アクセシビリティ対応)
- パフォーマンス最適化 (メモリリーク対策・接続プーリング)

### 影響範囲
- packages/web-ui/test/ - テスト修正・モック強化
- packages/web-ui/lib/mcp/ - エラーハンドリング・パフォーマンス強化
- packages/web-ui/components/ - UX改善・アクセシビリティ対応
- packages/web-ui/types/ - 型安全性向上

## 実装要件

### 【必須制約】TDD Blue Phase厳守
- **品質優先**: 既存機能を壊すことなく品質向上
- **テスト修正**: 失敗している60件のテストを修正
- **リファクタリング推奨**: コード構造の改善
- **既存テスト維持**: 64件の成功テストは継続成功させる

### 【テスト修正タスク】
1. **Ant Design Form.useFormモック修正**
   - `test/setup.ts` でForm.useFormを正しくモック
   - UIコンポーネントテスト27件を修正

2. **WebSocketモック同期問題解決**
   - MockWebSocketクラスの非同期処理を修正
   - タイムアウトエラー18件を解決

3. **Firebaseモック統合強化**
   - getIdTokenモックの正しい動作
   - 認証統合テスト15件を修正

### 【品質向上タスク】
1. **エラーハンドリング強化**
   - MCPクライアントの例外処理改善
   - ネットワークエラー・タイムアウト・サーバーエラーの詳細対応
   - 日本語エラーメッセージと復旧アクション提案

2. **UX改善**
   - レスポンシブデザイン対応
   - アクセシビリティ改善 (ARIA属性・キーボード操作)
   - ローディング状態とプログレス表示改善
   - バリデーション強化とユーザーフィードバック

3. **パフォーマンス最適化**
   - メモリリーク対策 (WebSocket接続・イベントリスナー)
   - 接続プーリングとリソース効率化
   - 大量データ処理時の仮想化・ページネーション
   - デバウンス・スロットリング実装

4. **セキュリティ強化**
   - 入力サニタイゼーション
   - XSS対策強化
   - WebSocket通信の暗号化確認
   - 認証トークンの安全な管理

### 【設計原則】
- **型安全性**: TypeScript厳格モード対応
- **可読性**: ESLint・Prettier準拠、コメント充実
- **テスタビリティ**: 依存性注入・モック化容易な設計
- **保守性**: 単一責任・関心の分離・DRY原則

### 【パフォーマンス指標】
- **メモリ使用量**: 長時間接続でもリークなし
- **レスポンス時間**: ツール実行レスポンス1秒以内
- **接続安定性**: 24時間接続維持可能
- **UI応答性**: 操作レスポンス100ms以内

## 成功基準
- **テスト成功**: 124件すべてのテストが成功
- **品質指標**: ESLint警告0件、TypeScript型エラー0件  
- **UX指標**: アクセシビリティスコア90%以上
- **セキュリティ**: 脆弱性スキャン通過
- **ドキュメント**: README・コメント・型定義が完全

## 実装ガイドライン

### コーディング規約
- ES2023機能積極活用
- functional programming優先
- async/await一貫使用
- エラーハンドリング必須
- TypeScript strict mode

### テスト戦略
- 単体テスト: 関数・クラス個別
- 統合テスト: コンポーネント連携
- E2Eテスト: ユーザーシナリオ
- 負荷テスト: 大量データ・長時間接続

### セキュリティ考慮
- 入力検証・サニタイゼーション
- 出力エスケープ・XSS対策
- 認証・認可・セッション管理
- 通信暗号化・データ保護

## 技術詳細

### テストモック改善
```typescript
// test/setup.ts 改善例
vi.mock('antd', () => ({
  Form: {
    useForm: () => [mockFormInstance],
    Item: ({ children }) => children
  }
}))
```

### WebSocket非同期修正
```typescript
// MockWebSocket 改善例  
setTimeout(() => {
  this.readyState = WebSocket.OPEN
  this.onopen?.(new Event('open'))
}, 0)
```

### エラーハンドリング強化
```typescript
// エラー分類と復旧アクション
class MCPError extends Error {
  constructor(
    message: string,
    public code: string,
    public recoveryAction?: string
  ) { super(message) }
}
```

このBlue Phaseで、MCPテスター画面を本格的なプロダクション品質まで向上させます。 