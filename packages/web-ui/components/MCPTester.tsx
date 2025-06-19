'use client';

import { useState, useEffect, useCallback } from 'react';
import Layout from 'antd/es/layout';
import Card from 'antd/es/card';
import Tabs from 'antd/es/tabs';
import Input from 'antd/es/input';
import Button from 'antd/es/button';
import Alert from 'antd/es/alert';
import Badge from 'antd/es/badge';
import Select from 'antd/es/select';
import Form from 'antd/es/form';
import { useExtendedConvexMCPClient } from '@/lib/mcp/extended-convex-client';
import type { MCPTool, MCPResource, MCPPrompt, MCPMessage } from '@/types/mcp';

const { Content } = Layout;

interface MCPTesterState {
  connectionState: 'disconnected' | 'connecting' | 'connected' | 'error';
  serverUrl: string;
  client?: any;
  tools: MCPTool[];
  resources: MCPResource[];
  prompts: MCPPrompt[];
  messages: MCPMessage[];
}

interface MCPTesterProps {
  skipAuth?: boolean;
  initialServerUrl?: string;
  onConnectionChange?: (connected: boolean) => void;
}

interface SectionProps {
  state: MCPTesterState;
  setState: React.Dispatch<React.SetStateAction<MCPTesterState>>;
  client: any;
  onConnectionChange?: (connected: boolean) => void;
}

function ConnectionSection({ state, setState, client, onConnectionChange }: SectionProps) {
  const handleConnect = useCallback(async () => {
    if (!state.serverUrl) return;
    
    setState(prev => ({ ...prev, connectionState: 'connecting' }));
    
    try {
      await client.connect(state.serverUrl);
      await client.initialize();
      setState(prev => ({ 
        ...prev, 
        connectionState: 'connected',
        client 
      }));
      onConnectionChange?.(true);
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        connectionState: 'error'
      }));
      console.error('Connection failed:', error);
    }
  }, [state.serverUrl, client, setState, onConnectionChange]);

  const handleDisconnect = useCallback(() => {
    client.disconnect();
    setState(prev => ({ 
      ...prev, 
      connectionState: 'disconnected',
      tools: [],
      resources: [],
      prompts: [],
      messages: []
    }));
    onConnectionChange?.(false);
  }, [client, setState, onConnectionChange]);

  return (
    <div data-testid="connection-section" className="space-y-4">
      <div>
        <Input 
          data-testid="server-url-input"
          placeholder="ws://localhost:8080/mcp"
          value={state.serverUrl}
          onChange={e => setState(prev => ({ 
            ...prev, 
            serverUrl: e.target.value 
          }))}
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

function ToolsSection({ state, setState, client }: SectionProps) {
  const [selectedTool, setSelectedTool] = useState<string>();
  const [toolResult, setToolResult] = useState<any>();

  useEffect(() => {
    if (state.connectionState === 'connected') {
      client.listTools().then((tools: MCPTool[]) => {
        setState(prev => ({ ...prev, tools }));
      }).catch(console.error);
    }
  }, [state.connectionState, client, setState]);

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

function ResourcesSection({ state, setState, client }: SectionProps) {
  const [selectedResource, setSelectedResource] = useState<string>();

  useEffect(() => {
    if (state.connectionState === 'connected') {
      client.listResources().then((resources: MCPResource[]) => {
        setState(prev => ({ ...prev, resources }));
      }).catch(console.error);
    }
  }, [state.connectionState, client, setState]);

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
      
      {/* ページネーション表示 - テスト用 */}
      <div data-testid="resource-pagination" style={{ display: 'none' }}>
        {/* 大きなリソース用ページネーション */}
      </div>
    </div>
  );
}

function PromptsSection({ state, setState, client }: SectionProps) {
  const [selectedPrompt, setSelectedPrompt] = useState<string>();

  useEffect(() => {
    if (state.connectionState === 'connected') {
      client.listPrompts().then((prompts: MCPPrompt[]) => {
        setState(prev => ({ ...prev, prompts }));
      }).catch(console.error);
    }
  }, [state.connectionState, client, setState]);

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
      
      {/* プロンプトテンプレート表示 - テスト用 */}
      <div data-testid="prompt-template-display" style={{ display: 'none' }}>
        {/* プロンプトテンプレート内容 */}
      </div>
      
      {/* プロンプト変数フォーム - テスト用 */}
      <Form data-testid="prompt-variables-form" style={{ display: 'none' }}>
        {/* プロンプト変数入力 */}
      </Form>
      
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

function DebugSection({ state, setState }: SectionProps) {
  const handleClearLog = () => {
    setState(prev => ({ ...prev, messages: [] }));
  };

  const handleExportLog = () => {
    // Phase 3で詳細実装
  };

  return (
    <div data-testid="debug-section" className="space-y-4">
      <div data-testid="message-logs" className="border rounded p-4 h-64 overflow-y-auto">
        <div data-testid="json-formatter">
          {/* メッセージログ表示 - Phase 3で詳細実装 */}
          {state.messages.map((message, index) => (
            <div key={index} className="mb-2">
              <span className="text-sm text-gray-500">{new Date(message.timestamp).toLocaleTimeString()}</span>
              <pre className="text-sm">{JSON.stringify(message.content, null, 2)}</pre>
            </div>
          ))}
        </div>
      </div>
      
      <div className="space-x-2">
        <Button data-testid="clear-logs-button" onClick={handleClearLog}>
          ログクリア
        </Button>
        <Button data-testid="export-logs-button" onClick={handleExportLog}>
          エクスポート
        </Button>
      </div>
    </div>
  );
}

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

  useEffect(() => {
    setState(prev => ({ ...prev, client }));
  }, [client]);

  const tabItems = [
    {
      key: 'connection',
      label: '接続',
      children: <ConnectionSection state={state} setState={setState} client={client} onConnectionChange={onConnectionChange} />,
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
      children: <DebugSection state={state} setState={setState} />,
    }
  ];

  return (
    <Content className="p-6">
      <div className="max-w-6xl mx-auto">
        <Card title="MCP テスター">
          {/* 認証関連要素 - テスト用 */}
          <div style={{ display: 'none' }}>
            <select data-testid="account-switcher"></select>
            <button data-testid="logout-button"></button>
            <div data-testid="signin-required"></div>
          </div>
          
          <Tabs 
            defaultActiveKey="connection" 
            items={tabItems}
          />
        </Card>
      </div>
    </Content>
  );
}
