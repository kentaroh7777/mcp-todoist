# Task 4: テスト対応・検証（data-testid要素対応）

## 概要
MCPTesterコンポーネントの既存テストケースとの完全互換性確保。全てのdata-testid要素の実装と、テストケースで期待される動作の実現。

## 依存関係
- 本実装の元となる設計書: `doc/design/mcp-tester.md`
- Phase 3で実装: `packages/web-ui/components/MCPTester.tsx`の高度な機能

### 前提条件
- Task 3: 高度な機能実装完了 - リアルタイムログとJSONフォーマッターが必要

### 成果物
- `packages/web-ui/components/MCPTester.tsx`のテスト互換性確保
- 全てのdata-testid要素の実装確認
- 既存テストケースとの動作整合性確保

### 影響範囲
- `packages/web-ui/test/components/mcp-tester.test.tsx` - 既存テストとの完全互換性

## 実装要件

### 【必須制約】テストケース完全対応
- **全data-testid要素**: テストファイルで期待される27+個の要素を全て実装
- **動作整合性**: 既存テストケースで期待される動作を全て実現
- **Props互換性**: テストで使用されるPropsと完全互換

### 技術仕様
```typescript
// テスト互換性確認用のチェックリスト
interface TestCompatibilityCheck {
  // セクション要素
  connectionSection: boolean;
  toolsSection: boolean;
  resourcesSection: boolean;
  promptsSection: boolean;
  debugSection: boolean;
  
  // 接続関連要素
  serverUrlInput: boolean;
  connectButton: boolean;
  disconnectButton: boolean;
  connectionStatus: boolean;
  
  // ツール関連要素
  toolSelect: boolean;
  toolParamsForm: boolean;
  executeToolButton: boolean;
  toolResultDisplay: boolean;
  
  // リソース関連要素
  resourceSelect: boolean;
  resourceContentDisplay: boolean;
  
  // プロンプト関連要素
  promptSelect: boolean;
  executePromptButton: boolean;
  promptResultDisplay: boolean;
  
  // デバッグ関連要素
  messageLogDisplay: boolean;
  clearLogButton: boolean;
  exportLogButton: boolean;
}
```

### 設計パターン
**参考**: `packages/web-ui/test/components/mcp-tester.test.tsx`の全テストケース
**理由**: 既存テストとの100%互換性を保つため

## 実装ガイド

### ステップ1: data-testid要素の完全実装確認
```typescript
// 全ての必須data-testid要素をチェック
const requiredTestIds = [
  // セクション
  'connection-section',
  'tools-section', 
  'resources-section',
  'prompts-section',
  'debug-section',
  
  // 接続
  'server-url-input',
  'connect-button',
  'disconnect-button', 
  'connection-status',
  
  // ツール
  'tool-select',
  'tool-params-form',
  'execute-tool-button',
  'tool-result-display',
  
  // リソース
  'resource-select',
  'resource-content-display',
  
  // プロンプト
  'prompt-select',
  'execute-prompt-button',
  'prompt-result-display',
  
  // デバッグ
  'message-log-display',
  'clear-log-button',
  'export-log-button'
];

// 実装確認用関数
const verifyTestIds = () => {
  requiredTestIds.forEach(testId => {
    const element = document.querySelector(`[data-testid="${testId}"]`);
    if (!element) {
      console.error(`Missing data-testid: ${testId}`);
    }
  });
};
```

### ステップ2: テストケース動作確認
```typescript
// 接続テストに対応した実装
const ConnectionSection = ({ client, state, setState, onConnectionChange }: SectionProps) => {
  const [validationError, setValidationError] = useState<string>('');

  const validateUrl = (url: string): boolean => {
    const wsPattern = /^wss?:\/\/.+/;
    const httpPattern = /^https?:\/\/.+/;
    return wsPattern.test(url) || httpPattern.test(url);
  };

  const handleConnect = async () => {
    if (!state.serverUrl.trim()) {
      setValidationError('URLを入力してください');
      return;
    }
    
    if (!validateUrl(state.serverUrl)) {
      setValidationError('有効なWebSocket URLを入力してください');
      return;
    }
    
    setValidationError('');
    setState(prev => ({ ...prev, connectionState: 'connecting' }));
    
    try {
      await client.connect(state.serverUrl);
      await client.initialize();
      setState(prev => ({ ...prev, connectionState: 'connected' }));
      onConnectionChange?.(true);
    } catch (error) {
      setState(prev => ({ ...prev, connectionState: 'error' }));
      console.error('Connection failed:', error);
    }
  };

  return (
    <div data-testid="connection-section" className="space-y-4">
      <div>
        <Input
          data-testid="server-url-input"
          placeholder="ws://localhost:8080/mcp"
          value={state.serverUrl}
          onChange={(e) => {
            setState(prev => ({ ...prev, serverUrl: e.target.value }));
            if (validationError) setValidationError('');
          }}
          status={validationError ? 'error' : ''}
        />
        {validationError && (
          <div className="text-red-500 text-sm mt-1">{validationError}</div>
        )}
      </div>
      <div className="space-x-2">
        <Button
          data-testid="connect-button"
          type="primary"
          onClick={handleConnect}
          loading={state.connectionState === 'connecting'}
          disabled={state.connectionState === 'connected'}
        >
          {state.connectionState === 'connecting' ? 'Loading...' : '接続'}
        </Button>
        <Button
          data-testid="disconnect-button"
          onClick={() => {
            client.disconnect();
            setState(prev => ({ ...prev, connectionState: 'disconnected' }));
            onConnectionChange?.(false);
          }}
          disabled={state.connectionState !== 'connected'}
        >
          切断
        </Button>
        <Badge
          data-testid="connection-status"
          status={state.connectionState === 'connected' ? 'success' : 'default'}
          text={state.connectionState === 'connected' ? '接続済み' : '未接続'}
          className={state.connectionState === 'connected' ? 'badge-success' : ''}
        />
      </div>
    </div>
  );
};
```

### ステップ3: プロンプトセクションの完全実装
```typescript
// プロンプトセクション（テスト互換対応）
function PromptsSection({ client, state, setState }: SectionProps) {
  const [selectedPrompt, setSelectedPrompt] = useState<string>();
  const [promptArgs, setPromptArgs] = useState<Record<string, any>>({});
  const [promptResult, setPromptResult] = useState<any>();
  const [executing, setExecuting] = useState(false);

  useEffect(() => {
    if (state.connectionState === 'connected') {
      client.listPrompts().then((prompts: MCPPrompt[]) => {
        setState(prev => ({ ...prev, prompts }));
      }).catch(console.error);
    }
  }, [state.connectionState]);

  const handleExecutePrompt = async () => {
    if (!selectedPrompt) return;
    
    setExecuting(true);
    try {
      const result = await client.getPrompt(selectedPrompt, promptArgs);
      setPromptResult(result);
    } catch (error) {
      console.error('Prompt execution failed:', error);
      setPromptResult({ error: error.message });
    } finally {
      setExecuting(false);
    }
  };

  return (
    <div data-testid="prompts-section" className="space-y-4">
      <Select
        data-testid="prompt-select"
        placeholder="プロンプトを選択"
        value={selectedPrompt}
        onChange={(value) => {
          setSelectedPrompt(value);
          setPromptArgs({});
          setPromptResult(null);
        }}
        options={state.prompts.map(prompt => ({
          value: prompt.name,
          label: prompt.name
        }))}
        className="w-full"
      />
      
      <Button
        data-testid="execute-prompt-button"
        type="primary"
        onClick={handleExecutePrompt}
        disabled={!selectedPrompt}
        loading={executing}
        block
      >
        実行
      </Button>
      
      {promptResult && (
        <div data-testid="prompt-result-display">
          <JSONDisplay data={promptResult} />
        </div>
      )}
    </div>
  );
}
```

### ステップ4: エラーハンドリングとユーザビリティ向上
```typescript
// エラー表示とローディング状態の改善
const ErrorDisplay: React.FC<{ error: string; onRetry?: () => void }> = ({ error, onRetry }) => (
  <Alert
    message="エラーが発生しました"
    description={error}
    type="error"
    action={onRetry && (
      <Button size="small" onClick={onRetry}>
        再試行
      </Button>
    )}
    className="mb-4"
  />
);

// キーボードショートカット対応
const useKeyboardShortcuts = (executeAction: () => void) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'Enter') {
        e.preventDefault();
        executeAction();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [executeAction]);
};
```

## 検証基準【ユーザー承認済み】

### 機能検証
- [ ] 全ての既存テストケースが通過する
- [ ] URL バリデーションエラーが適切に表示される
- [ ] ローディング状態が正確に表示される
- [ ] キーボードショートカットが機能する
- [ ] エラーハンドリングが適切に動作する

### 技術検証
- [ ] TypeScript strict modeでコンパイル成功
- [ ] ESLintエラー0件
- [ ] 全てのdata-testid要素が存在する
- [ ] テストカバレッジ90%以上
- [ ] パフォーマンステストを通過する

### 統合検証
- [ ] 既存テストスイートとの100%互換性
- [ ] 手動テストでの動作確認完了
- [ ] アクセシビリティテストを通過
- [ ] クロスブラウザ動作確認

## 注意事項

### 【厳守事項】
- 既存テストケースを一切破綻させないこと
- 全てのdata-testid要素を確実に実装すること
- テストで期待される動作を正確に再現すること
- 既存のコメントを削除しないこと

### 【推奨事項】
- エラーメッセージを分かりやすく表示すること
- ローディング状態を適切に管理すること
- ユーザビリティを向上させること

### 【禁止事項】
- 異常系テスト以外でのtry-catch構文の過度な使用
- テストIDの命名変更
- 既存APIの破壊的変更

## 参考情報
- `packages/web-ui/test/components/mcp-tester.test.tsx`: 完全な互換性確保の対象
- React Testing Library: テストベストプラクティス
- Ant Design: アクセシビリティガイドライン 