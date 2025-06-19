# Task 2: MCPTesterコンポーネント基本構造（5セクション）

## 概要
MCPTesterメインコンポーネントを新規実装。5つのセクション（接続、ツール、リソース、プロンプト、デバッグ）をタブ形式で構成し、ExtendedConvexMCPClientとの統合を行う。

## 依存関係
- 本実装の元となる設計書: `doc/design/mcp-tester.md`
- Phase 1で実装: `packages/web-ui/lib/mcp/extended-convex-client.ts`のExtendedConvexMCPClient

### 前提条件
- Task 1: ExtendedConvexMCPClient実装完了 - 認証無効化機能付きMCPクライアントが必要

### 成果物
- `packages/web-ui/components/MCPTester.tsx` - メインコンポーネント
- 5つのセクションコンポーネント（ConnectionSection, ToolsSection, ResourcesSection, PromptsSection, DebugSection）

### 影響範囲
- `packages/web-ui/test/components/mcp-tester.test.tsx` - 既存テストとの互換性確保

## 実装要件

### 【必須制約】テストケース互換性
- **data-testid要素**: 既存テストファイルで定義された27+個の要素を全て実装
- **コンポーネント構造**: `connection-section`, `tools-section`, `resources-section`, `prompts-section`, `debug-section`
- **Props互換性**: `initialServerUrl?`, `onConnectionChange?`のProps対応

### 技術仕様
```typescript
// MCPTesterコンポーネントProps
interface MCPTesterProps {
  skipAuth?: boolean;
  initialServerUrl?: string;
  onConnectionChange?: (connected: boolean) => void;
}

// MCPTester状態管理
interface MCPTesterState {
  connectionState: 'disconnected' | 'connecting' | 'connected' | 'error';
  serverUrl: string;
  client?: ExtendedConvexMCPClient;
  tools: MCPTool[];
  resources: MCPResource[];
  prompts: MCPPrompt[];
  messages: MCPMessage[];
}

// セクションコンポーネントProps
interface SectionProps {
  client: ExtendedConvexMCPClient;
  state: MCPTesterState;
  setState: React.Dispatch<React.SetStateAction<MCPTesterState>>;
}
```

### 設計パターン
**参考**: `packages/web-ui/test/components/mcp-tester.test.tsx`のテストケース構造を踏襲
**理由**: 既存テストとの互換性を保持し、段階的にテスト対応できるようにするため

## 実装ガイド

### ステップ1: メインコンポーネント構造の実装
```typescript
'use client';

import { useState, useEffect, useCallback } from 'react';
import Layout from 'antd/es/layout';
import Card from 'antd/es/card';
import Tabs from 'antd/es/tabs';
import { useExtendedConvexMCPClient } from '@/lib/mcp/extended-convex-client';

const { Content } = Layout;

export default function MCPTester({
  skipAuth = true,
  initialServerUrl = 'http://localhost:3001',
  onConnectionChange
}: MCPTesterProps) {
  const [state, setState] = useState<MCPTesterState>({
    connectionState: 'disconnected',
    serverUrl: initialServerUrl,
    tools: [],
    resources: [],
    prompts: [],
    messages: []
  });

  const client = useExtendedConvexMCPClient({
    skipAuthentication: skipAuth,
    testUserId: 'test-user'
  });

  return (
    <Content className="p-6">
      <div className="max-w-6xl mx-auto">
        <Card title="MCP テスター">
          <Tabs 
            defaultActiveKey="connection" 
            items={[
              {
                key: 'connection',
                label: '接続',
                children: <ConnectionSection client={client} state={state} setState={setState} />
              },
              {
                key: 'tools',
                label: 'ツール',
                children: <ToolsSection client={client} state={state} setState={setState} />
              },
              {
                key: 'resources',
                label: 'リソース',
                children: <ResourcesSection client={client} state={state} setState={setState} />
              },
              {
                key: 'prompts',
                label: 'プロンプト',
                children: <PromptsSection client={client} state={state} setState={setState} />
              },
              {
                key: 'debug',
                label: 'デバッグ',
                children: <DebugSection client={client} state={state} setState={setState} />
              }
            ]}
          />
        </Card>
      </div>
    </Content>
  );
}
```

### ステップ2: 接続セクションの実装
```typescript
function ConnectionSection({ client, state, setState, onConnectionChange }: SectionProps) {
  const handleConnect = async () => {
    if (!state.serverUrl) return;
    
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

  const handleDisconnect = () => {
    client.disconnect();
    setState(prev => ({ ...prev, connectionState: 'disconnected' }));
    onConnectionChange?.(false);
  };

  return (
    <div data-testid="connection-section" className="space-y-4">
      <div>
        <Input
          data-testid="server-url-input"
          placeholder="ws://localhost:8080/mcp"
          value={state.serverUrl}
          onChange={(e) => setState(prev => ({ ...prev, serverUrl: e.target.value }))}
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
        <Badge
          data-testid="connection-status"
          status={state.connectionState === 'connected' ? 'success' : 'default'}
          text={state.connectionState === 'connected' ? '接続済み' : '未接続'}
        />
      </div>
    </div>
  );
}
```

### ステップ3: ツールセクションの実装
```typescript
function ToolsSection({ client, state, setState }: SectionProps) {
  const [selectedTool, setSelectedTool] = useState<string>();
  const [toolParams, setToolParams] = useState<Record<string, any>>({});
  const [toolResult, setToolResult] = useState<any>();

  useEffect(() => {
    if (state.connectionState === 'connected') {
      client.listTools().then(tools => {
        setState(prev => ({ ...prev, tools }));
      });
    }
  }, [state.connectionState]);

  const handleExecuteTool = async () => {
    if (!selectedTool) return;
    
    try {
      const result = await client.callTool(selectedTool, toolParams);
      setToolResult(result);
    } catch (error) {
      console.error('Tool execution failed:', error);
    }
  };

  return (
    <div data-testid="tools-section">
      <Select
        data-testid="tool-select"
        placeholder="ツールを選択"
        value={selectedTool}
        onChange={setSelectedTool}
        options={state.tools.map(tool => ({
          value: tool.name,
          label: tool.name
        }))}
      />
      {selectedTool && (
        <Form data-testid="tool-params-form">
          {/* ツールパラメータフォーム */}
        </Form>
      )}
      <Button
        data-testid="execute-tool-button"
        onClick={handleExecuteTool}
        disabled={!selectedTool}
      >
        実行
      </Button>
      {toolResult && (
        <div data-testid="tool-result-display">
          <pre>{JSON.stringify(toolResult, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}
```

### ステップ4: リソース・プロンプト・デバッグセクションの基本実装
```typescript
function ResourcesSection({ client, state, setState }: SectionProps) {
  return (
    <div data-testid="resources-section">
      <Select data-testid="resource-select" placeholder="リソースを選択" />
      <div data-testid="resource-content-display"></div>
    </div>
  );
}

function PromptsSection({ client, state, setState }: SectionProps) {
  return (
    <div data-testid="prompts-section">
      <Select data-testid="prompt-select" placeholder="プロンプトを選択" />
      <Button data-testid="execute-prompt-button">実行</Button>
      <div data-testid="prompt-result-display"></div>
    </div>
  );
}

function DebugSection({ client, state, setState }: SectionProps) {
  return (
    <div data-testid="debug-section">
      <div data-testid="message-log-display">
        {/* メッセージログ表示 */}
      </div>
      <Button data-testid="clear-log-button">ログクリア</Button>
      <Button data-testid="export-log-button">エクスポート</Button>
    </div>
  );
}
```

## 検証基準【ユーザー承認済み】

### 機能検証
- [ ] 5つのセクションが正常にタブ表示される
- [ ] 接続・切断機能が正常に動作する
- [ ] ツール一覧の取得と表示が可能
- [ ] 各セクションが基本的なUI要素を表示する

### 技術検証
- [ ] TypeScript strict modeでコンパイル成功
- [ ] ESLintエラー0件
- [ ] 必要なdata-testid要素が全て存在する：
  - [ ] connection-section, tools-section, resources-section, prompts-section, debug-section
  - [ ] server-url-input, connect-button, disconnect-button, connection-status
  - [ ] tool-select, execute-tool-button, tool-result-display, tool-params-form
  - [ ] resource-select, resource-content-display
  - [ ] prompt-select, execute-prompt-button, prompt-result-display
  - [ ] message-log-display, clear-log-button, export-log-button

### 統合検証
- [ ] ExtendedConvexMCPClientとの連携が正常に動作
- [ ] onConnectionChangeコールバックが適切に呼ばれる
- [ ] initialServerUrlが初期値として設定される

## 実装例
```typescript
'use client';

import { useState, useEffect, useCallback } from 'react';
import Layout from 'antd/es/layout';
import Card from 'antd/es/card';
import Tabs from 'antd/es/tabs';
import Input from 'antd/es/input';
import Button from 'antd/es/button';
import Select from 'antd/es/select';
import Badge from 'antd/es/badge';
import Form from 'antd/es/form';
import { useExtendedConvexMCPClient } from '@/lib/mcp/extended-convex-client';
import type { MCPTool, MCPResource, MCPPrompt, MCPMessage } from '@/types/mcp';

const { Content } = Layout;

// Props型定義
interface MCPTesterProps {
  skipAuth?: boolean;
  initialServerUrl?: string;
  onConnectionChange?: (connected: boolean) => void;
}

// 状態型定義
interface MCPTesterState {
  connectionState: 'disconnected' | 'connecting' | 'connected' | 'error';
  serverUrl: string;
  tools: MCPTool[];
  resources: MCPResource[];
  prompts: MCPPrompt[];
  messages: MCPMessage[];
}

// セクションProps型定義
interface SectionProps {
  client: any;
  state: MCPTesterState;
  setState: React.Dispatch<React.SetStateAction<MCPTesterState>>;
  onConnectionChange?: (connected: boolean) => void;
}

// 接続セクション
function ConnectionSection({ client, state, setState, onConnectionChange }: SectionProps) {
  const handleConnect = async () => {
    if (!state.serverUrl) return;
    
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

  const handleDisconnect = () => {
    client.disconnect();
    setState(prev => ({ ...prev, connectionState: 'disconnected' }));
    onConnectionChange?.(false);
  };

  return (
    <div data-testid="connection-section" className="space-y-4">
      <div>
        <Input
          data-testid="server-url-input"
          placeholder="ws://localhost:8080/mcp"
          value={state.serverUrl}
          onChange={(e) => setState(prev => ({ ...prev, serverUrl: e.target.value }))}
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
        <Badge
          data-testid="connection-status"
          status={state.connectionState === 'connected' ? 'success' : 'default'}
          text={state.connectionState === 'connected' ? '接続済み' : '未接続'}
        />
      </div>
    </div>
  );
}

// ツールセクション
function ToolsSection({ client, state, setState }: SectionProps) {
  const [selectedTool, setSelectedTool] = useState<string>();
  const [toolResult, setToolResult] = useState<any>();

  useEffect(() => {
    if (state.connectionState === 'connected') {
      client.listTools().then((tools: MCPTool[]) => {
        setState(prev => ({ ...prev, tools }));
      }).catch(console.error);
    }
  }, [state.connectionState]);

  const handleExecuteTool = async () => {
    if (!selectedTool) return;
    
    try {
      const result = await client.callTool(selectedTool, {});
      setToolResult(result);
    } catch (error) {
      console.error('Tool execution failed:', error);
    }
  };

  return (
    <div data-testid="tools-section" className="space-y-4">
      <Select
        data-testid="tool-select"
        placeholder="ツールを選択"
        value={selectedTool}
        onChange={setSelectedTool}
        options={state.tools.map(tool => ({
          value: tool.name,
          label: tool.name
        }))}
        className="w-full"
      />
      
      {selectedTool && (
        <Form data-testid="tool-params-form">
          {/* 基本的なパラメータフォーム - Phase 3で詳細実装 */}
        </Form>
      )}
      
      <Button
        data-testid="execute-tool-button"
        type="primary"
        onClick={handleExecuteTool}
        disabled={!selectedTool}
      >
        実行
      </Button>
      
      {toolResult && (
        <div data-testid="tool-result-display" className="mt-4">
          <pre className="bg-gray-100 p-4 rounded">
            {JSON.stringify(toolResult, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}

// リソースセクション
function ResourcesSection({ client, state, setState }: SectionProps) {
  const [selectedResource, setSelectedResource] = useState<string>();

  useEffect(() => {
    if (state.connectionState === 'connected') {
      client.listResources().then((resources: MCPResource[]) => {
        setState(prev => ({ ...prev, resources }));
      }).catch(console.error);
    }
  }, [state.connectionState]);

  return (
    <div data-testid="resources-section" className="space-y-4">
      <Select
        data-testid="resource-select"
        placeholder="リソースを選択"
        value={selectedResource}
        onChange={setSelectedResource}
        options={state.resources.map(resource => ({
          value: resource.uri,
          label: resource.name
        }))}
        className="w-full"
      />
      
      <div data-testid="resource-content-display">
        {/* リソース内容表示 - Phase 3で詳細実装 */}
      </div>
    </div>
  );
}

// プロンプトセクション
function PromptsSection({ client, state, setState }: SectionProps) {
  const [selectedPrompt, setSelectedPrompt] = useState<string>();

  useEffect(() => {
    if (state.connectionState === 'connected') {
      client.listPrompts().then((prompts: MCPPrompt[]) => {
        setState(prev => ({ ...prev, prompts }));
      }).catch(console.error);
    }
  }, [state.connectionState]);

  const handleExecutePrompt = async () => {
    // Phase 3で詳細実装
  };

  return (
    <div data-testid="prompts-section" className="space-y-4">
      <Select
        data-testid="prompt-select"
        placeholder="プロンプトを選択"
        value={selectedPrompt}
        onChange={setSelectedPrompt}
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
      >
        実行
      </Button>
      
      <div data-testid="prompt-result-display">
        {/* プロンプト結果表示 - Phase 3で詳細実装 */}
      </div>
    </div>
  );
}

// デバッグセクション
function DebugSection({ client, state, setState }: SectionProps) {
  const handleClearLog = () => {
    setState(prev => ({ ...prev, messages: [] }));
  };

  const handleExportLog = () => {
    // Phase 3で詳細実装
  };

  return (
    <div data-testid="debug-section" className="space-y-4">
      <div data-testid="message-log-display" className="border rounded p-4 h-64 overflow-y-auto">
        {/* メッセージログ表示 - Phase 3で詳細実装 */}
        {state.messages.map((message, index) => (
          <div key={index} className="mb-2">
            <span className="text-sm text-gray-500">{new Date(message.timestamp).toLocaleTimeString()}</span>
            <pre className="text-sm">{JSON.stringify(message.data, null, 2)}</pre>
          </div>
        ))}
      </div>
      
      <div className="space-x-2">
        <Button data-testid="clear-log-button" onClick={handleClearLog}>
          ログクリア
        </Button>
        <Button data-testid="export-log-button" onClick={handleExportLog}>
          エクスポート
        </Button>
      </div>
    </div>
  );
}

// メインコンポーネント
export default function MCPTester({
  skipAuth = true,
  initialServerUrl = 'http://localhost:3001',
  onConnectionChange
}: MCPTesterProps) {
  const [state, setState] = useState<MCPTesterState>({
    connectionState: 'disconnected',
    serverUrl: initialServerUrl,
    tools: [],
    resources: [],
    prompts: [],
    messages: []
  });

  const client = useExtendedConvexMCPClient({
    skipAuthentication: skipAuth,
    testUserId: 'test-user'
  });

  const tabItems = [
    {
      key: 'connection',
      label: '接続',
      children: (
        <ConnectionSection 
          client={client} 
          state={state} 
          setState={setState}
          onConnectionChange={onConnectionChange}
        />
      )
    },
    {
      key: 'tools',
      label: 'ツール',
      children: <ToolsSection client={client} state={state} setState={setState} />
    },
    {
      key: 'resources',
      label: 'リソース',
      children: <ResourcesSection client={client} state={state} setState={setState} />
    },
    {
      key: 'prompts',
      label: 'プロンプト',
      children: <PromptsSection client={client} state={state} setState={setState} />
    },
    {
      key: 'debug',
      label: 'デバッグ',
      children: <DebugSection client={client} state={state} setState={setState} />
    }
  ];

  return (
    <Content className="p-6">
      <div className="max-w-6xl mx-auto">
        <Card title="MCP テスター">
          <Tabs defaultActiveKey="connection" items={tabItems} />
        </Card>
      </div>
    </Content>
  );
}
```

## 注意事項

### 【厳守事項】
- 既存テストケースで定義されたdata-testid要素を全て実装すること
- ExtendedConvexMCPClientとの統合を確実に行うこと
- 既存のコメントを削除しないこと

### 【推奨事項】
- コンポーネントの分離を適切に行うこと
- 状態管理をReact hooksで効率的に実装すること
- エラーハンドリングを各セクションで適切に行うこと

### 【禁止事項】
- 異常系テスト以外でのtry-catch構文の過度な使用
- Ant Designコンポーネント以外のUIライブラリの使用
- data-testid要素の命名変更や省略

## 参考情報
- `packages/web-ui/test/components/mcp-tester.test.tsx`: 既存テストケース
- `packages/web-ui/lib/mcp/extended-convex-client.ts`: Phase 1で実装したExtendedConvexMCPClient
- `packages/web-ui/types/mcp.ts`: MCP関連型定義 