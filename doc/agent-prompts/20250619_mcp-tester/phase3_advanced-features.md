# Task 3: 高度な機能（リアルタイムログ、JSONフォーマッター）

## 概要
MCPTesterコンポーネントの高度な機能を実装。リアルタイムメッセージログ、JSONフォーマッター、ツールパラメータ動的フォーム、リソース内容表示を追加。

## 依存関係
- 本実装の元となる設計書: `doc/design/mcp-tester.md`
- Phase 2で実装: `packages/web-ui/components/MCPTester.tsx`の基本構造

### 前提条件
- Task 2: MCPTesterコンポーネント基本構造完了 - 5セクションの基本UIが必要

### 成果物
- `packages/web-ui/components/MCPTester.tsx`の機能拡張
  - ツールパラメータ動的フォーム生成
  - リソース内容表示とJSON整形
  - プロンプト実行と結果表示
  - リアルタイムメッセージログとJSONフォーマッター

## 実装要件

### 【必須制約】リアルタイムログ機能
- **メッセージ記録**: MCP通信の送受信メッセージを全て記録
- **JSON整形**: メッセージ内容をJSON形式で見やすく表示
- **タイムスタンプ**: 各メッセージに正確なタイムスタンプを付与
- **ログエクスポート**: JSONファイルとしてダウンロード可能

### 技術仕様
```typescript
// メッセージログの詳細型定義
interface MCPMessage {
  id: string;
  timestamp: number;
  direction: 'sent' | 'received';
  method: string;
  data: any;
}

// JSON整形オプション
interface JSONFormatterOptions {
  indent: number;
  sortKeys: boolean;
  hideNullValues: boolean;
  collapseObjects: boolean;
}
```

## 実装ガイド

### ステップ1: リアルタイムメッセージログ機能
```typescript
const useMessageLogger = (client: ExtendedConvexMCPClient) => {
  const [messages, setMessages] = useState<MCPMessage[]>([]);

  useEffect(() => {
    if (!client) return;

    const handleMessage = (direction: 'sent' | 'received', data: any) => {
      const message: MCPMessage = {
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        direction,
        method: data.method || 'unknown',
        data,
      };
      setMessages(prev => [...prev, message]);
    };

    client.on('request', (data) => handleMessage('sent', data));
    client.on('response', (data) => handleMessage('received', data));

    return () => {
      client.off('request', handleMessage);
      client.off('response', handleMessage);
    };
  }, [client]);

  const clearMessages = () => setMessages([]);
  
  const exportMessages = () => {
    const dataStr = JSON.stringify(messages, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `mcp-logs-${new Date().toISOString().slice(0, 19)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return { messages, clearMessages, exportMessages };
};
```

### ステップ2: JSON整形コンポーネント
```typescript
const JSONDisplay: React.FC<{ data: any; className?: string }> = ({ data, className = '' }) => {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className={`json-display ${className}`}>
      <div className="json-controls mb-2">
        <Button size="small" onClick={() => setCollapsed(!collapsed)}>
          {collapsed ? '展開' : '折りたたみ'}
        </Button>
      </div>
      <pre className="bg-gray-50 p-3 rounded overflow-x-auto text-sm">
        {collapsed ? JSON.stringify(data) : JSON.stringify(data, null, 2)}
      </pre>
    </div>
  );
};
```

## 検証基準【ユーザー承認済み】

### 機能検証
- [ ] リアルタイムメッセージログが正常に記録・表示される
- [ ] JSON整形機能が適切に動作する
- [ ] ツールパラメータの動的フォーム生成が正常に動作
- [ ] リソース内容の読み込みと表示が可能
- [ ] ログエクスポート機能が正常に動作

### 技術検証
- [ ] TypeScript strict modeでコンパイル成功
- [ ] ESLintエラー0件
- [ ] メモリリークがないことを確認

### 統合検証
- [ ] MCP通信の全てのメッセージが正確にログ記録される
- [ ] UIの応答性が保たれる
- [ ] エラーハンドリングが適切に動作する

## 注意事項

### 【厳守事項】
- リアルタイムログ機能でメモリリークを防ぐこと
- JSON整形処理で循環参照エラーを適切に処理すること
- 既存のコメントを削除しないこと

### 【推奨事項】
- JSON表示の折りたたみ機能を適切に実装すること
- ユーザビリティを重視したUI実装を心がけること

### 【禁止事項】
- 異常系テスト以外でのtry-catch構文の過度な使用
- ブラウザの同期処理を阻害する重い処理の実装

## 参考情報
- Ant Design: 動的フォーム生成パターン
- React: パフォーマンス最適化の手法 