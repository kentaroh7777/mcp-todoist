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
