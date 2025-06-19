# Task 5: プロンプトセクション実装

## 概要
MCPTesterのプロンプトセクションを実装し、MCPサーバーのプロンプト一覧表示・実行機能を追加する。

## 依存関係
- **前提タスク**: Task 1-4 (ExtendedConvexMCPClient, 基本構造, ツール・リソースセクション)

### 成果物
- **修正**: `packages/web-ui/components/MCPTester.tsx` のPromptsSection部分

## 実装要件

### 【必須制約】追加すべきdata-testid要素
```typescript
const PROMPTS_TEST_IDS = [
  'prompt-select',           // プロンプト選択セレクトボックス
  'prompt-template-display', // プロンプトテンプレート表示
  'prompt-variables-form',   // プロンプト変数入力フォーム
  'execute-prompt-button',   // プロンプト実行ボタン
  'prompt-result-display'    // プロンプト実行結果表示
];
```

## 実装ガイド

```typescript
function PromptsSection({ state, setState, client }: SectionProps) {
  const [selectedPrompt, setSelectedPrompt] = useState<string>('');
  const [promptVariables, setPromptVariables] = useState<Record<string, any>>({});
  const [executing, setExecuting] = useState(false);
  const [result, setResult] = useState<any>(null);

  useEffect(() => {
    if (state.connectionState === 'connected') {
      loadPrompts();
    }
  }, [state.connectionState]);

  const loadPrompts = async () => {
    try {
      const prompts = await client.listPrompts();
      setState(prev => ({ ...prev, prompts }));
    } catch (error) {
      console.error('プロンプト一覧取得エラー:', error);
    }
  };

  const handlePromptSelect = (promptName: string) => {
    setSelectedPrompt(promptName);
    setPromptVariables({});
    setResult(null);
  };

  const handleExecutePrompt = async () => {
    if (!selectedPrompt) return;
    
    setExecuting(true);
    try {
      const result = await client.getPrompt(selectedPrompt, promptVariables);
      setResult(result);
    } catch (error) {
      console.error('プロンプト実行エラー:', error);
      setResult({ error: error.message });
    } finally {
      setExecuting(false);
    }
  };

  const selectedPromptData = state.prompts.find(p => p.name === selectedPrompt);

  return (
    <div data-testid="prompts-section" className="space-y-4">
      {state.connectionState !== 'connected' ? (
        <Alert message="MCPサーバーに接続してください" type="warning" />
      ) : (
        <>
          <div>
            <label className="block mb-2">プロンプト選択:</label>
            <Select
              data-testid="prompt-select"
              value={selectedPrompt}
              onChange={handlePromptSelect}
              placeholder="実行するプロンプトを選択"
              style={{ width: '100%' }}
            >
              {state.prompts.map(prompt => (
                <Select.Option key={prompt.name} value={prompt.name}>
                  {prompt.name} - {prompt.description}
                </Select.Option>
              ))}
            </Select>
          </div>

          {selectedPromptData && (
            <div data-testid="prompt-template-display" className="space-y-2">
              <h4>プロンプトテンプレート</h4>
              <pre className="bg-gray-100 p-4 rounded overflow-auto">
                {selectedPromptData.description || 'プロンプトの説明がありません'}
              </pre>
            </div>
          )}

          {selectedPromptData && selectedPromptData.arguments && (
            <div data-testid="prompt-variables-form" className="space-y-4">
              <h4>変数入力</h4>
              {selectedPromptData.arguments.map(arg => (
                <div key={arg.name}>
                  <label className="block mb-1">{arg.name}:</label>
                  <Input
                    value={promptVariables[arg.name] || ''}
                    onChange={e => setPromptVariables(prev => ({
                      ...prev,
                      [arg.name]: e.target.value
                    }))}
                    placeholder={arg.description}
                  />
                </div>
              ))}
            </div>
          )}

          <Button
            data-testid="execute-prompt-button"
            type="primary"
            onClick={handleExecutePrompt}
            loading={executing}
            disabled={!selectedPrompt}
          >
            プロンプト実行
          </Button>

          {result && (
            <div data-testid="prompt-result-display" className="space-y-2">
              <h4>実行結果</h4>
              <pre className="bg-gray-100 p-4 rounded overflow-auto">
                {JSON.stringify(result, null, 2)}
              </pre>
            </div>
          )}
        </>
      )}
    </div>
  );
}
```

## 検証基準
- [ ] 5つのdata-testid要素が存在する
- [ ] プロンプト一覧の表示と選択が正常動作
- [ ] プロンプト変数の入力と実行が正常動作
- [ ] 実行結果が適切に表示される 