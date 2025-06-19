# Task 3: ツールセクション実装

## 概要
MCPTesterのツールセクションを実装し、MCPサーバーのツール一覧表示・実行機能を追加する。テストケースが期待するdata-testid要素に対応する。

## 依存関係
- **前提タスク**: Task 1 (ExtendedConvexMCPClient), Task 2 (MCPTester基本構造)
- **依存成果物**: `packages/web-ui/lib/mcp/extended-convex-client.ts`, `packages/web-ui/components/MCPTester.tsx`

### 前提条件
- ExtendedConvexMCPClient実装済み
- MCPTester基本構造（5セクション）実装済み

### 成果物
- **修正**: `packages/web-ui/components/MCPTester.tsx` のToolsSection部分

### 影響範囲
- ToolsSectionコンポーネントの実装
- MCPツール実行機能の追加

## 実装要件

### 【必須制約】追加すべきdata-testid要素
```typescript
// Phase 3で追加すべきdata-testid要素
const TOOLS_TEST_IDS = [
  'tool-select',           // ツール選択セレクトボックス
  'tool-params-form',      // ツール実行パラメータフォーム
  'execute-tool-button',   // ツール実行ボタン
  'tool-result-display'    // ツール実行結果表示
];
```

### 技術仕様
```typescript
interface MCPTool {
  name: string;
  description?: string;
  inputSchema: JSONSchema;
}

interface ToolExecution {
  toolName: string;
  parameters: Record<string, any>;
  result?: any;
  error?: string;
  timestamp: Date;
}
```

## 実装ガイド

### ステップ1: ツール一覧の取得と表示
```typescript
function ToolsSection({ state, setState, client }: SectionProps) {
  const [selectedTool, setSelectedTool] = useState<string>('');
  const [toolParams, setToolParams] = useState<Record<string, any>>({});
  const [executing, setExecuting] = useState(false);
  const [result, setResult] = useState<any>(null);

  // ツール一覧取得
  useEffect(() => {
    if (state.connectionState === 'connected') {
      loadTools();
    }
  }, [state.connectionState]);

  const loadTools = async () => {
    try {
      const tools = await client.listTools();
      setState(prev => ({ ...prev, tools }));
    } catch (error) {
      console.error('ツール一覧取得エラー:', error);
    }
  };

  return (
    <div data-testid="tools-section" className="space-y-4">
      {state.connectionState !== 'connected' ? (
        <Alert message="MCPサーバーに接続してください" type="warning" />
      ) : (
        <>
          <div>
            <label className="block mb-2">ツール選択:</label>
            <Select
              data-testid="tool-select"
              value={selectedTool}
              onChange={setSelectedTool}
              placeholder="実行するツールを選択"
              style={{ width: '100%' }}
            >
              {state.tools.map(tool => (
                <Select.Option key={tool.name} value={tool.name}>
                  {tool.name} - {tool.description}
                </Select.Option>
              ))}
            </Select>
          </div>

          {selectedTool && (
            <ToolParametersForm 
              tool={selectedTool}
              toolSchema={getToolSchema(selectedTool)}
              parameters={toolParams}
              onChange={setToolParams}
            />
          )}

          <Button
            data-testid="execute-tool-button"
            type="primary"
            onClick={handleExecuteTool}
            loading={executing}
            disabled={!selectedTool}
          >
            ツール実行
          </Button>

          {result && (
            <ToolResultDisplay result={result} />
          )}
        </>
      )}
    </div>
  );
}
```

### ステップ2: パラメータフォームの実装
```typescript
function ToolParametersForm({ tool, toolSchema, parameters, onChange }: {
  tool: string;
  toolSchema: any;
  parameters: Record<string, any>;
  onChange: (params: Record<string, any>) => void;
}) {
  return (
    <div data-testid="tool-params-form" className="space-y-4">
      <h4>パラメータ</h4>
      {Object.entries(toolSchema.properties || {}).map(([key, schema]: [string, any]) => (
        <div key={key}>
          <label className="block mb-1">{key}:</label>
          <Input
            value={parameters[key] || ''}
            onChange={e => onChange({
              ...parameters,
              [key]: e.target.value
            })}
            placeholder={schema.description}
          />
        </div>
      ))}
    </div>
  );
}
```

### ステップ3: 実行結果表示の実装
```typescript
function ToolResultDisplay({ result }: { result: any }) {
  return (
    <div data-testid="tool-result-display" className="space-y-2">
      <h4>実行結果</h4>
      <pre className="bg-gray-100 p-4 rounded overflow-auto">
        {JSON.stringify(result, null, 2)}
      </pre>
    </div>
  );
}
```

## 検証基準

### 機能検証
- [ ] MCPサーバー接続時にツール一覧が表示される
- [ ] ツール選択時にパラメータフォームが表示される
- [ ] ツール実行が正常に動作する
- [ ] 実行結果が適切に表示される

### テスト互換性検証
- [ ] 以下のdata-testid要素が存在する：
  - [ ] tool-select
  - [ ] tool-params-form  
  - [ ] execute-tool-button
  - [ ] tool-result-display

### 技術検証
- [ ] TypeScript strict modeでコンパイル成功
- [ ] ExtendedConvexMCPClientとの統合が正常動作
- [ ] エラーハンドリングが適切に実装されている 