# Task 6: デバッグセクション実装

## 概要
MCPTesterのデバッグセクションを実装し、MCP通信ログの表示・管理・エクスポート機能を追加する。

## 依存関係
- **前提タスク**: Task 1-5 (ExtendedConvexMCPClient, 基本構造, ツール・リソース・プロンプトセクション)

### 成果物
- **修正**: `packages/web-ui/components/MCPTester.tsx` のDebugSection部分

## 実装要件

### 【必須制約】追加すべきdata-testid要素
```typescript
const DEBUG_TEST_IDS = [
  'message-logs',        // メッセージログ表示エリア
  'json-formatter',      // JSON整形表示機能
  'clear-logs-button',   // ログクリアボタン
  'export-logs-button'   // ログエクスポートボタン
];
```

## 実装ガイド

```typescript
function DebugSection({ state, setState, client }: SectionProps) {
  const [selectedMessage, setSelectedMessage] = useState<any>(null);
  const [autoScroll, setAutoScroll] = useState(true);

  const handleClearLogs = () => {
    setState(prev => ({ ...prev, messages: [] }));
  };

  const handleExportLogs = () => {
    const logData = JSON.stringify(state.messages, null, 2);
    const blob = new Blob([logData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mcp-logs-${new Date().toISOString()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    // MCPクライアントからのメッセージをリッスン
    if (client) {
      client.on('message', (message: any) => {
        setState(prev => ({
          ...prev,
          messages: [...prev.messages, {
            ...message,
            timestamp: new Date(),
            id: Date.now() + Math.random()
          }]
        }));
      });
    }
  }, [client, setState]);

  return (
    <div data-testid="debug-section" className="space-y-4">
      <div className="flex justify-between items-center">
        <h4>通信ログ ({state.messages.length}件)</h4>
        <div className="space-x-2">
          <Button
            data-testid="clear-logs-button"
            onClick={handleClearLogs}
            disabled={state.messages.length === 0}
          >
            ログクリア
          </Button>
          <Button
            data-testid="export-logs-button"
            onClick={handleExportLogs}
            disabled={state.messages.length === 0}
          >
            ログエクスポート
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* メッセージ一覧 */}
        <div data-testid="message-logs" className="space-y-2">
          <h5>メッセージ一覧</h5>
          <div className="h-80 overflow-y-auto border rounded p-2 space-y-1">
            {state.messages.map((message, index) => (
              <div
                key={message.id || index}
                className={`p-2 rounded cursor-pointer text-xs ${
                  selectedMessage === message
                    ? 'bg-blue-100 border border-blue-300'
                    : 'bg-gray-50 hover:bg-gray-100'
                }`}
                onClick={() => setSelectedMessage(message)}
              >
                <div className="font-semibold">
                  {message.timestamp?.toLocaleTimeString()} - {message.type || 'Unknown'}
                </div>
                <div className="text-gray-600 truncate">
                  {JSON.stringify(message.data || message).substring(0, 100)}...
                </div>
              </div>
            ))}
            {state.messages.length === 0 && (
              <div className="text-gray-500 text-center py-8">
                通信ログがありません
              </div>
            )}
          </div>
        </div>

        {/* JSON整形表示 */}
        <div data-testid="json-formatter" className="space-y-2">
          <h5>詳細表示</h5>
          <div className="h-80 overflow-y-auto border rounded p-2">
            {selectedMessage ? (
              <pre className="text-xs whitespace-pre-wrap">
                {JSON.stringify(selectedMessage, null, 2)}
              </pre>
            ) : (
              <div className="text-gray-500 text-center py-8">
                メッセージを選択してください
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 自動スクロール設定 */}
      <div>
        <label className="flex items-center space-x-2">
          <input
            type="checkbox"
            checked={autoScroll}
            onChange={e => setAutoScroll(e.target.checked)}
          />
          <span>新しいメッセージで自動スクロール</span>
        </label>
      </div>
    </div>
  );
}
```

## 検証基準
- [ ] 4つのdata-testid要素が存在する
- [ ] メッセージログの表示が正常動作
- [ ] JSON整形表示が正常動作
- [ ] ログクリア・エクスポート機能が正常動作
- [ ] MCP通信メッセージのリアルタイム表示 