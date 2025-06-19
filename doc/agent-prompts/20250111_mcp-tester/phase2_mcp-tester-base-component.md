# Task 2: MCPTester基本コンポーネント構造実装

## 概要
現在のMCPTester.tsxを拡張し、5つのセクション構造とExtendedConvexMCPClientを統合したコンポーネントを実装する。テストケースが期待するdata-testid要素を段階的に追加する。

## 依存関係
- **前提タスク**: Task 1 (ExtendedConvexMCPClient実装)
- **依存成果物**: `packages/web-ui/lib/mcp/extended-convex-client.ts`

### 前提条件
- ExtendedConvexMCPClient実装済み
- `packages/web-ui/components/MCPTester.tsx`: 既存のファイル（大幅書き換えが必要）

### 成果物
- **修正**: `packages/web-ui/components/MCPTester.tsx` - 5つのセクション構造への書き換え

### 影響範囲
- MCPTesterコンポーネントの全面的な構造変更
- 既存テストケースとの段階的互換性確保

## 実装要件

### 【必須制約】セクション構造の実装
5つの主要セクションを持つコンポーネント構造：
1. **接続セクション** - MCPサーバー接続管理
2. **ツールセクション** - MCPツール一覧と実行
3. **リソースセクション** - MCPリソース管理
4. **プロンプトセクション** - MCPプロンプト管理  
5. **デバッグセクション** - メッセージログとJSON表示

### 【必須制約】data-testidの段階的実装
テストケースが期待する要素を段階的に追加：
```typescript
// Phase 2で実装すべきdata-testid要素
const REQUIRED_TEST_IDS = [
  // セクション要素
  'connection-section',
  'tools-section', 
  'resources-section',
  'prompts-section',
  'debug-section',
  
  // 基本要素
  'server-url-input',
  'connect-button',
  'disconnect-button',
  'connection-status'
];
```

### 技術仕様
```typescript
// コンポーネント状態管理
interface MCPTesterState {
  connectionState: 'disconnected' | 'connecting' | 'connected' | 'error';
  serverUrl: string;
  client?: ExtendedConvexMCPClient;
  tools: MCPTool[];
  resources: MCPResource[];
  prompts: MCPPrompt[];
  messages: MCPMessage[];
}

// Props定義
interface MCPTesterProps {
  skipAuthentication?: boolean;
  testUserId?: string;
  defaultServerUrl?: string;
}
```

## 実装ガイド

### ステップ1: 基本構造の実装
```typescript
'use client';

import { useState, useEffect, useCallback } from 'react';
import Layout from 'antd/es/layout';
import Card from 'antd/es/card';
import Tabs from 'antd/es/tabs';
import { useExtendedConvexMCPClient } from '@/lib/mcp/extended-convex-client';

const { Content } = Layout;

interface MCPTesterState {
  connectionState: 'disconnected' | 'connecting' | 'connected' | 'error';
  serverUrl: string;
  client?: ExtendedConvexMCPClient;
  tools: any[];
  resources: any[];
  prompts: any[];
  messages: any[];
}

export default function MCPTester({
  skipAuthentication = true,
  testUserId = 'test-user',
  defaultServerUrl = 'http://localhost:3001'
}: MCPTesterProps) {
  const [state, setState] = useState<MCPTesterState>({
    connectionState: 'disconnected',
    serverUrl: defaultServerUrl,
    tools: [],
    resources: [],
    prompts: [],
    messages: []
  });

  const client = useExtendedConvexMCPClient({
    skipAuthentication,
    testUserId
  });

  return (
    <Content className="p-6">
      <div className="max-w-6xl mx-auto">
        <Card title="MCP Todoist テスター">
          <Tabs defaultActiveKey="connection" items={tabItems} />
        </Card>
      </div>
    </Content>
  );
}
```

### ステップ2: セクション別Tabsアイテムの実装
```typescript
const tabItems = [
  {
    key: 'connection',
    label: '接続',
    children: <ConnectionSection />,
  },
  {
    key: 'tools',
    label: 'ツール',
    children: <ToolsSection />,
  },
  {
    key: 'resources',
    label: 'リソース', 
    children: <ResourcesSection />,
  },
  {
    key: 'prompts',
    label: 'プロンプト',
    children: <PromptsSection />,
  },
  {
    key: 'debug',
    label: 'デバッグ',
    children: <DebugSection />,
  }
];
```

### ステップ3: 接続セクションの基本実装
```typescript
function ConnectionSection({ state, setState, client }: SectionProps) {
  const handleConnect = useCallback(async () => {
    setState(prev => ({ ...prev, connectionState: 'connecting' }));
    
    try {
      await client.connect(state.serverUrl);
      setState(prev => ({ 
        ...prev, 
        connectionState: 'connected',
        client 
      }));
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        connectionState: 'error'
      }));
    }
  }, [state.serverUrl, client, setState]);

  return (
    <div data-testid="connection-section">
      <Input 
        data-testid="server-url-input"
        value={state.serverUrl}
        onChange={e => setState(prev => ({ 
          ...prev, 
          serverUrl: e.target.value 
        }))}
        placeholder="MCPサーバーURL"
      />
      
      <Button 
        data-testid="connect-button"
        onClick={handleConnect}
        loading={state.connectionState === 'connecting'}
        disabled={state.connectionState === 'connected'}
      >
        接続
      </Button>
      
      <Button 
        data-testid="disconnect-button"
        onClick={() => setState(prev => ({ 
          ...prev, 
          connectionState: 'disconnected' 
        }))}
        disabled={state.connectionState !== 'connected'}
      >
        切断
      </Button>
      
      <div data-testid="connection-status">
        状態: {state.connectionState}
      </div>
    </div>
  );
}
```

### ステップ4: 他セクションの基本構造実装
```typescript
function ToolsSection({ state }: SectionProps) {
  return (
    <div data-testid="tools-section">
      <div>ツール機能を実装予定</div>
    </div>
  );
}

function ResourcesSection({ state }: SectionProps) {
  return (
    <div data-testid="resources-section">
      <div>リソース機能を実装予定</div>
    </div>
  );
}

function PromptsSection({ state }: SectionProps) {
  return (
    <div data-testid="prompts-section">
      <div>プロンプト機能を実装予定</div>
    </div>
  );
}

function DebugSection({ state }: SectionProps) {
  return (
    <div data-testid="debug-section">
      <div>デバッグ機能を実装予定</div>
    </div>
  );
}
```

## 検証基準

### 機能検証
- [ ] 5つのセクションがTabsで切り替え可能
- [ ] ExtendedConvexMCPClientとの正常な統合
- [ ] 接続/切断ボタンの基本動作

### テスト互換性検証
- [ ] 以下のdata-testid要素が存在する：
  - [ ] connection-section
  - [ ] tools-section
  - [ ] resources-section  
  - [ ] prompts-section
  - [ ] debug-section
  - [ ] server-url-input
  - [ ] connect-button
  - [ ] disconnect-button
  - [ ] connection-status

### 技術検証
- [ ] TypeScript strict modeでコンパイル成功
- [ ] ESLintエラー0件
- [ ] 既存の認証無効化が正常に動作

## 完全実装例

```typescript
'use client';

import { useState, useEffect, useCallback } from 'react';
import Layout from 'antd/es/layout';
import Card from 'antd/es/card';
import Tabs from 'antd/es/tabs';
import Input from 'antd/es/input';
import Button from 'antd/es/button';
import Alert from 'antd/es/alert';
import { useExtendedConvexMCPClient } from '@/lib/mcp/extended-convex-client';

const { Content } = Layout;

interface MCPTesterState {
  connectionState: 'disconnected' | 'connecting' | 'connected' | 'error';
  serverUrl: string;
  client?: any;
  tools: any[];
  resources: any[];
  prompts: any[];
  messages: any[];
}

interface MCPTesterProps {
  skipAuthentication?: boolean;
  testUserId?: string;
  defaultServerUrl?: string;
}

interface SectionProps {
  state: MCPTesterState;
  setState: React.Dispatch<React.SetStateAction<MCPTesterState>>;
  client: any;
}

function ConnectionSection({ state, setState, client }: SectionProps) {
  const handleConnect = useCallback(async () => {
    setState(prev => ({ ...prev, connectionState: 'connecting' }));
    
    try {
      // ExtendedConvexMCPClientでの接続
      await client.connect(state.serverUrl);
      setState(prev => ({ 
        ...prev, 
        connectionState: 'connected',
        client 
      }));
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        connectionState: 'error'
      }));
    }
  }, [state.serverUrl, client, setState]);

  const handleDisconnect = useCallback(async () => {
    try {
      await client.disconnect();
      setState(prev => ({ 
        ...prev, 
        connectionState: 'disconnected',
        tools: [],
        resources: [],
        prompts: [],
        messages: []
      }));
    } catch (error) {
      console.error('切断エラー:', error);
    }
  }, [client, setState]);

  return (
    <div data-testid="connection-section" className="space-y-4">
      <div>
        <label className="block mb-2">MCPサーバーURL:</label>
        <Input 
          data-testid="server-url-input"
          value={state.serverUrl}
          onChange={e => setState(prev => ({ 
            ...prev, 
            serverUrl: e.target.value 
          }))}
          placeholder="http://localhost:3001"
          disabled={state.connectionState === 'connected'}
        />
      </div>
      
      <div className="space-x-2">
        <Button 
          data-testid="connect-button"
          type="primary"
          onClick={handleConnect}
          loading={state.connectionState === 'connecting'}
          disabled={state.connectionState === 'connected'}
        >
          接続
        </Button>
        
        <Button 
          data-testid="disconnect-button"
          onClick={handleDisconnect}
          disabled={state.connectionState !== 'connected'}
        >
          切断
        </Button>
      </div>
      
      <Alert
        data-testid="connection-status"
        message={`接続状態: ${state.connectionState}`}
        type={
          state.connectionState === 'connected' ? 'success' :
          state.connectionState === 'error' ? 'error' :
          'info'
        }
        showIcon
      />
    </div>
  );
}

function ToolsSection({ state }: SectionProps) {
  return (
    <div data-testid="tools-section">
      <Alert
        message="ツール機能"
        description="MCPツールの実行機能を実装予定です。"
        type="info"
        showIcon
      />
    </div>
  );
}

function ResourcesSection({ state }: SectionProps) {
  return (
    <div data-testid="resources-section">
      <Alert
        message="リソース機能"
        description="MCPリソースの管理機能を実装予定です。"
        type="info"
        showIcon
      />
    </div>
  );
}

function PromptsSection({ state }: SectionProps) {
  return (
    <div data-testid="prompts-section">
      <Alert
        message="プロンプト機能"
        description="MCPプロンプトの実行機能を実装予定です。"
        type="info"
        showIcon
      />
    </div>
  );
}

function DebugSection({ state }: SectionProps) {
  return (
    <div data-testid="debug-section">
      <Alert
        message="デバッグ機能"
        description="MCP通信ログの表示・管理機能を実装予定です。"
        type="info"
        showIcon
      />
    </div>
  );
}

export default function MCPTester({
  skipAuthentication = true,
  testUserId = 'test-user',
  defaultServerUrl = 'http://localhost:3001'
}: MCPTesterProps) {
  const [state, setState] = useState<MCPTesterState>({
    connectionState: 'disconnected',
    serverUrl: defaultServerUrl,
    tools: [],
    resources: [],
    prompts: [],
    messages: []
  });

  const client = useExtendedConvexMCPClient({
    skipAuthentication,
    testUserId
  });

  useEffect(() => {
    setState(prev => ({ ...prev, client }));
  }, [client]);

  const tabItems = [
    {
      key: 'connection',
      label: '接続',
      children: <ConnectionSection state={state} setState={setState} client={client} />,
    },
    {
      key: 'tools',
      label: 'ツール',
      children: <ToolsSection state={state} setState={setState} client={client} />,
    },
    {
      key: 'resources',
      label: 'リソース', 
      children: <ResourcesSection state={state} setState={setState} client={client} />,
    },
    {
      key: 'prompts',
      label: 'プロンプト',
      children: <PromptsSection state={state} setState={setState} client={client} />,
    },
    {
      key: 'debug',
      label: 'デバッグ',
      children: <DebugSection state={state} setState={setState} client={client} />,
    }
  ];

  return (
    <Content className="p-6">
      <div className="max-w-6xl mx-auto">
        <Card title="MCP Todoist テスター (Convex統合版)">
          <Alert
            message="認証無効化モード"
            description="テスト用にFirebase認証をスキップしています。"
            type="warning"
            showIcon
            className="mb-4"
          />
          
          <Tabs 
            defaultActiveKey="connection" 
            items={tabItems}
            type="card"
          />
        </Card>
      </div>
    </Content>
  );
}
```

## 注意事項

### 【厳守事項】
- ExtendedConvexMCPClientとの統合を必須とする
- 既存のMCPTester.tsxファイルの完全書き換え
- data-testid要素の段階的追加（Phase 2では基本要素のみ）

### 【推奨事項】
- TypeScript strict modeでの型安全な実装
- Ant Designコンポーネントの適切な使用
- 将来の機能追加を考慮した拡張性確保

### 【禁止事項】
- 既存のExtendedConvexMCPClientの変更
- Phase 2で高度な機能の実装（Phase 3以降で実装）
- Firebase認証の再有効化

## 参考情報
- `packages/web-ui/lib/mcp/extended-convex-client.ts`: 使用するクライアント
- `packages/web-ui/test/components/mcp-tester.test.tsx`: 対応すべきテストケース
- Ant Design Tabs: https://ant.design/components/tabs 