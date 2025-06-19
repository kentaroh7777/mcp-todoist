# Task 4: リソースセクション実装

## 概要
MCPTesterのリソースセクションを実装し、MCPサーバーのリソース一覧表示・読み込み機能を追加する。

## 依存関係
- **前提タスク**: Task 1-3 (ExtendedConvexMCPClient, 基本構造, ツールセクション)

### 成果物
- **修正**: `packages/web-ui/components/MCPTester.tsx` のResourcesSection部分

## 実装要件

### 【必須制約】追加すべきdata-testid要素
```typescript
const RESOURCES_TEST_IDS = [
  'resource-select',         // リソース選択セレクトボックス
  'resource-content-display', // リソース内容表示
  'resource-pagination'       // リソースページネーション
];
```

## 実装ガイド

```typescript
function ResourcesSection({ state, setState, client }: SectionProps) {
  const [selectedResource, setSelectedResource] = useState<string>('');
  const [resourceContent, setResourceContent] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (state.connectionState === 'connected') {
      loadResources();
    }
  }, [state.connectionState]);

  const loadResources = async () => {
    try {
      const resources = await client.listResources();
      setState(prev => ({ ...prev, resources }));
    } catch (error) {
      console.error('リソース一覧取得エラー:', error);
    }
  };

  const handleResourceSelect = async (resourceUri: string) => {
    setSelectedResource(resourceUri);
    setLoading(true);
    
    try {
      const content = await client.readResource(resourceUri);
      setResourceContent(content);
    } catch (error) {
      console.error('リソース読み込みエラー:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div data-testid="resources-section" className="space-y-4">
      {state.connectionState !== 'connected' ? (
        <Alert message="MCPサーバーに接続してください" type="warning" />
      ) : (
        <>
          <div>
            <label className="block mb-2">リソース選択:</label>
            <Select
              data-testid="resource-select"
              value={selectedResource}
              onChange={handleResourceSelect}
              placeholder="表示するリソースを選択"
              style={{ width: '100%' }}
            >
              {state.resources.map(resource => (
                <Select.Option key={resource.uri} value={resource.uri}>
                  {resource.name || resource.uri}
                </Select.Option>
              ))}
            </Select>
          </div>

          {resourceContent && (
            <div data-testid="resource-content-display" className="space-y-2">
              <h4>リソース内容</h4>
              <pre className="bg-gray-100 p-4 rounded overflow-auto max-h-96">
                {JSON.stringify(resourceContent, null, 2)}
              </pre>
            </div>
          )}

          <div data-testid="resource-pagination">
            {/* ページネーション機能を実装予定 */}
            <div className="text-gray-500">ページネーション機能を実装予定</div>
          </div>
        </>
      )}
    </div>
  );
}
```

## 検証基準
- [ ] resource-select, resource-content-display, resource-pagination のdata-testid要素が存在
- [ ] リソース一覧の表示と選択が正常動作
- [ ] 選択したリソースの内容が表示される 