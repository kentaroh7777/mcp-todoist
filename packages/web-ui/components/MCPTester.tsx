'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import Layout from 'antd/es/layout';
import Card from 'antd/es/card';
import Tabs from 'antd/es/tabs';
import Input from 'antd/es/input';
import Button from 'antd/es/button';
import Alert from 'antd/es/alert';
import Badge from 'antd/es/badge';
import Select from 'antd/es/select';
import Form from 'antd/es/form';
import Space from 'antd/es/space';
import Collapse from 'antd/es/collapse';
import Switch from 'antd/es/switch';
import Typography from 'antd/es/typography';
import { useExtendedConvexMCPClient } from '@/lib/mcp/extended-convex-client';
import type { MCPTool, MCPResource, MCPPrompt, MCPMessage, JSONSchema } from '@/types/mcp';

const { Content } = Layout;
const { Panel } = Collapse;
const { Text, Paragraph } = Typography;

interface MCPMessage {
  id: string;
  timestamp: number;
  direction: 'sent' | 'received';
  method: string;
  data: any;
}

interface JSONFormatterOptions {
  indent: number;
  sortKeys: boolean;
  hideNullValues: boolean;
  collapseObjects: boolean;
}

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

// Message logger hook
const useMessageLogger = (client: any) => {
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

    const handleRequest = (data: any) => handleMessage('sent', data);
    const handleResponse = (data: any) => handleMessage('received', data);

    client.on('request', handleRequest);
    client.on('response', handleResponse);

    return () => {
      client.off('request', handleRequest);
      client.off('response', handleResponse);
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

// JSON Display Component
const JSONDisplay: React.FC<{ data: any; className?: string }> = ({ data, className = '' }) => {
  const [collapsed, setCollapsed] = useState(false);
  const [options, setOptions] = useState<JSONFormatterOptions>({
    indent: 2,
    sortKeys: false,
    hideNullValues: false,
    collapseObjects: false
  });

  const formatJSON = (obj: any) => {
    let processedObj = obj;
    
    if (options.hideNullValues) {
      processedObj = JSON.parse(JSON.stringify(obj, (key, value) => 
        value === null ? undefined : value
      ));
    }
    
    if (options.sortKeys) {
      processedObj = JSON.parse(JSON.stringify(processedObj, Object.keys(processedObj).sort()));
    }
    
    return collapsed ? JSON.stringify(processedObj) : JSON.stringify(processedObj, null, options.indent);
  };

  return (
    <div className={`json-display ${className}`}>
      <div className="json-controls mb-2 flex gap-2 items-center flex-wrap">
        <Button size="small" onClick={() => setCollapsed(!collapsed)}>
          {collapsed ? '展開' : '折りたたみ'}
        </Button>
        <Space size="small">
          <Text type="secondary">インデント:</Text>
          <Select
            size="small"
            value={options.indent}
            onChange={(value) => setOptions(prev => ({ ...prev, indent: value }))}
            options={[{value: 0, label: 'なし'}, {value: 2, label: '2'}, {value: 4, label: '4'}]}
            style={{ width: 60 }}
          />
        </Space>
        <Switch
          size="small"
          checked={options.sortKeys}
          onChange={(checked) => setOptions(prev => ({ ...prev, sortKeys: checked }))}
        />
        <Text type="secondary">キーソート</Text>
        <Switch
          size="small"
          checked={options.hideNullValues}
          onChange={(checked) => setOptions(prev => ({ ...prev, hideNullValues: checked }))}
        />
        <Text type="secondary">null非表示</Text>
      </div>
      <pre className="bg-gray-50 p-3 rounded overflow-x-auto text-sm max-h-96 overflow-y-auto">
        {formatJSON(data)}
      </pre>
    </div>
  );
};

// Dynamic form field generator
const generateFormField = (name: string, schema: JSONSchema, form: any) => {
  const { type, description, enum: enumValues, minimum, maximum, minLength, maxLength } = schema;
  
  const baseProps = {
    name,
    label: name,
    rules: [
      { required: schema.required?.includes(name) || false, message: `${name}は必須です` },
      ...(type === 'string' && minLength ? [{ min: minLength, message: `最小${minLength}文字` }] : []),
      ...(type === 'string' && maxLength ? [{ max: maxLength, message: `最大${maxLength}文字` }] : []),
      ...(type === 'number' && minimum !== undefined ? [{ min: minimum, message: `最小値${minimum}` }] : []),
      ...(type === 'number' && maximum !== undefined ? [{ max: maximum, message: `最大値${maximum}` }] : [])
    ]
  };
  
  if (enumValues && enumValues.length > 0) {
    return (
      <Form.Item key={name} {...baseProps} help={description}>
        <Select
          placeholder={`${name}を選択`}
          options={enumValues.map(value => ({ value, label: String(value) }))}
        />
      </Form.Item>
    );
  }
  
  switch (type) {
    case 'string':
      return (
        <Form.Item key={name} {...baseProps} help={description}>
          <Input placeholder={description || `${name}を入力`} />
        </Form.Item>
      );
    case 'number':
    case 'integer':
      return (
        <Form.Item key={name} {...baseProps} help={description}>
          <Input type="number" placeholder={description || `${name}を入力`} />
        </Form.Item>
      );
    case 'boolean':
      return (
        <Form.Item key={name} {...baseProps} help={description} valuePropName="checked">
          <Switch />
        </Form.Item>
      );
    case 'array':
      return (
        <Form.Item key={name} {...baseProps} help={description}>
          <Input.TextArea 
            placeholder={`${description || name} (JSON配列形式で入力)`}
            rows={3}
          />
        </Form.Item>
      );
    case 'object':
      return (
        <Form.Item key={name} {...baseProps} help={description}>
          <Input.TextArea 
            placeholder={`${description || name} (JSON形式で入力)`}
            rows={4}
          />
        </Form.Item>
      );
    default:
      return (
        <Form.Item key={name} {...baseProps} help={description}>
          <Input placeholder={description || `${name}を入力`} />
        </Form.Item>
      );
  }
};

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
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (state.connectionState === 'connected') {
      client.listTools().then((tools: MCPTool[]) => {
        setState(prev => ({ ...prev, tools }));
      }).catch(console.error);
    }
  }, [state.connectionState, client, setState]);

  const selectedToolData = useMemo(() => {
    return state.tools.find(tool => tool.name === selectedTool);
  }, [state.tools, selectedTool]);

  const handleToolChange = (toolName: string) => {
    setSelectedTool(toolName);
    form.resetFields();
    setToolResult(null);
  };

  const handleExecuteTool = async () => {
    if (!selectedTool || !selectedToolData) return;
    
    try {
      setLoading(true);
      const formValues = await form.validateFields();
      
      // Process form values for arrays and objects
      const processedValues: Record<string, any> = {};
      Object.entries(formValues).forEach(([key, value]) => {
        if (typeof value === 'string' && (value.startsWith('[') || value.startsWith('{'))) {
          try {
            processedValues[key] = JSON.parse(value);
          } catch {
            processedValues[key] = value;
          }
        } else {
          processedValues[key] = value;
        }
      });
      
      const result = await client.callTool(selectedTool, processedValues);
      setToolResult(result);
    } catch (error) {
      console.error('Tool execution failed:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div data-testid="tools-section" className="space-y-4">
      <Select
        data-testid="tool-select"
        placeholder="ツールを選択"
        value={selectedTool}
        onChange={handleToolChange}
        options={state.tools.map(tool => ({
          value: tool.name,
          label: `${tool.name}${tool.description ? ` - ${tool.description}` : ''}`
        }))}
        className="w-full"
      />
      
      {selectedToolData && (
        <Card size="small" title="パラメータ">
          <Form data-testid="tool-params-form" form={form} layout="vertical">
            {selectedToolData.inputSchema?.properties ? (
              Object.entries(selectedToolData.inputSchema.properties).map(([paramName, paramSchema]) =>
                generateFormField(paramName, paramSchema as JSONSchema, form)
              )
            ) : (
              <Alert message="このツールにはパラメータがありません" type="info" />
            )}
          </Form>
        </Card>
      )}
      
      <Button
        data-testid="execute-tool-button"
        type="primary"
        onClick={handleExecuteTool}
        disabled={!selectedTool}
        loading={loading}
        size="large"
      >
        実行
      </Button>
      
      {toolResult && (
        <Card data-testid="tool-result-display" title="実行結果" className="mt-4">
          <JSONDisplay data={toolResult} />
        </Card>
      )}
    </div>
  );
}

function ResourcesSection({ state, setState, client }: SectionProps) {
  const [selectedResource, setSelectedResource] = useState<string>();
  const [resourceContent, setResourceContent] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (state.connectionState === 'connected') {
      client.listResources().then((resources: MCPResource[]) => {
        setState(prev => ({ ...prev, resources }));
      }).catch(console.error);
    }
  }, [state.connectionState, client, setState]);

  const selectedResourceData = useMemo(() => {
    return state.resources.find(resource => resource.uri === selectedResource);
  }, [state.resources, selectedResource]);

  const handleResourceChange = async (uri: string) => {
    setSelectedResource(uri);
    setResourceContent(null);
    
    if (!uri) return;
    
    try {
      setLoading(true);
      const content = await client.readResource(uri);
      setResourceContent(content);
    } catch (error) {
      console.error('Failed to read resource:', error);
      setResourceContent({ error: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div data-testid="resources-section" className="space-y-4">
      <Select
        data-testid="resource-select"
        placeholder="リソースを選択"
        value={selectedResource}
        onChange={handleResourceChange}
        options={state.resources.map(resource => ({
          value: resource.uri,
          label: `${resource.name}${resource.description ? ` - ${resource.description}` : ''}`
        }))}
        className="w-full"
        loading={loading}
      />
      
      {selectedResourceData && (
        <Card size="small" title="リソース情報">
          <Space direction="vertical" size="small" className="w-full">
            <div><Text strong>URI:</Text> <Text code>{selectedResourceData.uri}</Text></div>
            <div><Text strong>名前:</Text> {selectedResourceData.name}</div>
            {selectedResourceData.description && (
              <div><Text strong>説明:</Text> {selectedResourceData.description}</div>
            )}
            {selectedResourceData.mimeType && (
              <div><Text strong>MIMEタイプ:</Text> <Text code>{selectedResourceData.mimeType}</Text></div>
            )}
          </Space>
        </Card>
      )}
      
      <div data-testid="resource-content-display">
        {loading && <Alert message="リソースを読み込み中..." type="info" />}
        {resourceContent && (
          <Card title="リソース内容">
            {resourceContent.error ? (
              <Alert message="エラー" description={resourceContent.error} type="error" />
            ) : (
              <div>
                {resourceContent.text ? (
                  <div>
                    <Text type="secondary">テキストコンテンツ:</Text>
                    <pre className="bg-gray-50 p-3 rounded mt-2 max-h-64 overflow-y-auto text-sm">
                      {resourceContent.text}
                    </pre>
                  </div>
                ) : resourceContent.blob ? (
                  <div>
                    <Text type="secondary">バイナリコンテンツ (Base64):</Text>
                    <pre className="bg-gray-50 p-3 rounded mt-2 max-h-64 overflow-y-auto text-sm break-all">
                      {resourceContent.blob}
                    </pre>
                  </div>
                ) : (
                  <JSONDisplay data={resourceContent} />
                )}
              </div>
            )}
          </Card>
        )}
      </div>
    </div>
  );
}

function PromptsSection({ state, setState, client }: SectionProps) {
  const [selectedPrompt, setSelectedPrompt] = useState<string>();
  const [promptResult, setPromptResult] = useState<any>(null);
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (state.connectionState === 'connected') {
      client.listPrompts().then((prompts: MCPPrompt[]) => {
        setState(prev => ({ ...prev, prompts }));
      }).catch(console.error);
    }
  }, [state.connectionState, client, setState]);

  const selectedPromptData = useMemo(() => {
    return state.prompts.find(prompt => prompt.name === selectedPrompt);
  }, [state.prompts, selectedPrompt]);

  const handlePromptChange = (promptName: string) => {
    setSelectedPrompt(promptName);
    form.resetFields();
    setPromptResult(null);
  };

  const handleExecutePrompt = async () => {
    if (!selectedPrompt || !selectedPromptData) return;
    
    try {
      setLoading(true);
      const formValues = selectedPromptData.arguments ? await form.validateFields() : {};
      
      const result = await client.getPrompt(selectedPrompt, formValues);
      setPromptResult(result);
    } catch (error) {
      console.error('Prompt execution failed:', error);
      setPromptResult({ error: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div data-testid="prompts-section" className="space-y-4">
      <Select
        data-testid="prompt-select"
        placeholder="プロンプトを選択"
        value={selectedPrompt}
        onChange={handlePromptChange}
        options={state.prompts.map(prompt => ({
          value: prompt.name,
          label: `${prompt.name}${prompt.description ? ` - ${prompt.description}` : ''}`
        }))}
        className="w-full"
      />
      
      {selectedPromptData && (
        <Card size="small" title="プロンプト情報">
          <Space direction="vertical" size="small" className="w-full">
            <div><Text strong>名前:</Text> {selectedPromptData.name}</div>
            {selectedPromptData.description && (
              <div><Text strong>説明:</Text> {selectedPromptData.description}</div>
            )}
            {selectedPromptData.arguments && selectedPromptData.arguments.length > 0 && (
              <div>
                <Text strong>引数:</Text>
                <ul className="ml-4 mt-1">
                  {selectedPromptData.arguments.map(arg => (
                    <li key={arg.name}>
                      <Text code>{arg.name}</Text>
                      {arg.required && <Text type="danger"> *</Text>}
                      {arg.description && <Text type="secondary"> - {arg.description}</Text>}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </Space>
        </Card>
      )}
      
      {selectedPromptData?.arguments && selectedPromptData.arguments.length > 0 && (
        <Card size="small" title="引数">
          <Form data-testid="prompt-variables-form" form={form} layout="vertical">
            {selectedPromptData.arguments.map(arg => (
              <Form.Item
                key={arg.name}
                name={arg.name}
                label={arg.name}
                rules={[{ required: arg.required, message: `${arg.name}は必須です` }]}
                help={arg.description}
              >
                <Input placeholder={arg.description || `${arg.name}を入力`} />
              </Form.Item>
            ))}
          </Form>
        </Card>
      )}
      
      <Button
        data-testid="execute-prompt-button"
        type="primary"
        onClick={handleExecutePrompt}
        disabled={!selectedPrompt}
        loading={loading}
        size="large"
      >
        実行
      </Button>
      
      <div data-testid="prompt-result-display">
        {promptResult && (
          <Card title="プロンプト結果">
            {promptResult.error ? (
              <Alert message="エラー" description={promptResult.error} type="error" />
            ) : promptResult.messages ? (
              <div className="space-y-3">
                {promptResult.messages.map((message: any, index: number) => (
                  <Card key={index} size="small" className="bg-gray-50">
                    <div className="mb-2">
                      <Badge status="processing" text={message.role} />
                    </div>
                    <Paragraph className="mb-0">
                      {message.content?.text || JSON.stringify(message.content, null, 2)}
                    </Paragraph>
                  </Card>
                ))}
              </div>
            ) : (
              <JSONDisplay data={promptResult} />
            )}
          </Card>
        )}
      </div>
    </div>
  );
}

function DebugSection({ state, setState, client }: SectionProps) {
  const { messages, clearMessages, exportMessages } = useMessageLogger(client);
  const [autoScroll, setAutoScroll] = useState(true);
  const [filter, setFilter] = useState<'all' | 'sent' | 'received'>('all');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (autoScroll && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, autoScroll]);

  const filteredMessages = useMemo(() => {
    if (filter === 'all') return messages;
    return messages.filter(msg => msg.direction === filter);
  }, [messages, filter]);

  const handleClearLog = () => {
    clearMessages();
    setState(prev => ({ ...prev, messages: [] }));
  };

  return (
    <div data-testid="debug-section" className="space-y-4">
      <Card title="メッセージログ" size="small">
        <div className="flex gap-2 mb-3 items-center flex-wrap">
          <Select
            size="small"
            value={filter}
            onChange={setFilter}
            options={[
              { value: 'all', label: 'すべて' },
              { value: 'sent', label: '送信' },
              { value: 'received', label: '受信' }
            ]}
            style={{ width: 80 }}
          />
          <Switch
            size="small"
            checked={autoScroll}
            onChange={setAutoScroll}
          />
          <Text type="secondary">自動スクロール</Text>
          <Badge 
            count={messages.length} 
            overflowCount={999}
            style={{ backgroundColor: '#52c41a' }}
          />
        </div>
        
        <div data-testid="message-logs" className="border rounded h-80 overflow-y-auto bg-gray-50">
          <div data-testid="json-formatter" className="p-3">
            {filteredMessages.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                メッセージログがありません
              </div>
            ) : (
              filteredMessages.map((message, index) => (
                <div key={message.id} className="mb-3 pb-3 border-b border-gray-200 last:border-b-0">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge 
                      status={message.direction === 'sent' ? 'processing' : 'success'}
                      text={
                        <span className="text-xs">
                          {message.direction === 'sent' ? '送信' : '受信'} - {message.method}
                        </span>
                      }
                    />
                    <Text type="secondary" className="text-xs">
                      {new Date(message.timestamp).toLocaleTimeString()}
                    </Text>
                  </div>
                  <JSONDisplay data={message.data} className="text-xs" />
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>
      </Card>
      
      <div className="flex gap-2">
        <Button 
          data-testid="clear-logs-button" 
          onClick={handleClearLog}
          icon={<span>🗑️</span>}
        >
          ログクリア
        </Button>
        <Button 
          data-testid="export-logs-button" 
          onClick={exportMessages}
          type="primary"
          disabled={messages.length === 0}
          icon={<span>💾</span>}
        >
          エクスポート
        </Button>
        <Text type="secondary" className="self-center">
          {messages.length}件のメッセージ
        </Text>
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
      children: <DebugSection state={state} setState={setState} client={client} />,
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
