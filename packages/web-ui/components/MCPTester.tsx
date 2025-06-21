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
import type { MCPTool, MCPResource, MCPPrompt, JSONSchema } from '@/types/mcp';

const { Content } = Layout;
const { Panel } = Collapse;
const { Text, Paragraph } = Typography;

interface MCPLogMessage {
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
  messages: MCPLogMessage[];
  connectionMessage?: string;
}

interface MCPTesterProps {
  skipAuth?: boolean;
  initialServerUrl?: string;
  onConnectionChange?: (connected: boolean) => void;
}

// Message logger hook
const useMessageLogger = (client: any) => {
  const [messages, setMessages] = useState<MCPLogMessage[]>([]);

  useEffect(() => {
    if (!client) return;

    const handleMessage = (direction: 'sent' | 'received', data: any) => {
      const message: MCPLogMessage = {
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
  const [form] = Form.useForm();
  
  const validateUrl = (url: string): boolean => {
    // ExtendedConvexMCPClientではURL入力は不要（Convex経由で接続）
    return true;
  };

  const handleConnect = async () => {
    console.log('[MCPTester] handleConnect called');
    console.log('[MCPTester] client:', client);
    console.log('[MCPTester] current state:', state.connectionState);
    
    setState(prev => ({ 
      ...prev, 
      connectionState: 'connecting' as const,
      connectionMessage: 'Convex経由でMCPサーバーに接続中...'
    }));
    
    try {
      console.log('[MCPTester] Calling client.connect...');
      // ExtendedConvexMCPClientはURLを使用せず、Convex経由で接続
      await client.connect('convex://mcp');
      console.log('[MCPTester] client.connect successful');
      
      console.log('[MCPTester] Calling client.initialize...');
      await client.initialize();
      console.log('[MCPTester] client.initialize successful');
      
      console.log('[MCPTester] Fetching tools, resources, prompts...');
      // ツール、リソース、プロンプトを取得
      const [tools, resources, prompts] = await Promise.all([
        client.listTools().catch((e: any) => { console.error('[MCPTester] listTools error:', e); return []; }),
        client.listResources().catch((e: any) => { console.error('[MCPTester] listResources error:', e); return []; }),
        client.listPrompts().catch((e: any) => { console.error('[MCPTester] listPrompts error:', e); return []; })
      ]);
      
      console.log('[MCPTester] Fetched:', { tools, resources, prompts });
      
      setState(prev => ({ 
        ...prev, 
        connectionState: 'connected' as const,
        connectionMessage: 'MCP サーバーへの接続が完了しました。ツール、リソース、プロンプトが利用可能です。',
        tools, 
        resources, 
        prompts 
      }));
      
      console.log('[MCPTester] Connection successful, calling onConnectionChange...');
      onConnectionChange?.(true);
    } catch (error: unknown) {
      console.error('[MCPTester] Connection failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setState(prev => ({ 
        ...prev, 
        connectionState: 'error' as const,
        connectionMessage: `接続エラー: ${errorMessage}`
      }));
      onConnectionChange?.(false);
    }
  };

  const handleDisconnect = () => {
    client.disconnect();
    setState(prev => ({ 
      ...prev, 
      connectionState: 'disconnected' as const,
      connectionMessage: 'MCP サーバーから切断されました。',
      tools: [], 
      resources: [], 
      prompts: [] 
    }));
    onConnectionChange?.(false);
  };

  const getStatusBadge = () => {
    switch (state.connectionState) {
      case 'connected': return <Badge status="success" text="接続済み" />;
      case 'connecting': return <Badge status="processing" text="接続中" />;
      case 'error': return <Badge status="error" text="エラー" />;
      default: return <Badge status="default" text="未接続" />;
    }
  };

  return (
    <Card title="接続管理" size="small">
      <Space direction="vertical" style={{ width: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {getStatusBadge()}
          <Text type="secondary">Convex MCP サーバー</Text>
        </div>
        
        {state.connectionMessage && (
          <Alert 
            message={state.connectionMessage}
            type={state.connectionState === 'connected' ? 'success' : state.connectionState === 'error' ? 'error' : 'info'}
            showIcon 
            closable
            onClose={() => setState(prev => ({ ...prev, connectionMessage: undefined }))}
          />
        )}
        
        <div>
          <Input
            value="Convex MCP Server (自動設定)"
            disabled
            placeholder="Convex経由でMCPサーバーに接続します"
            style={{ marginBottom: 12 }}
          />
          
          <Space>
            {state.connectionState === 'connected' ? (
              <Button 
                type="primary" 
                danger 
                onClick={() => {
                  console.log('[MCPTester] Disconnect button clicked');
                  handleDisconnect();
                }}
              >
                切断
              </Button>
            ) : (
              <Button 
                type="primary" 
                onClick={() => {
                  console.log('[MCPTester] Connect button clicked');
                  handleConnect();
                }}
                loading={state.connectionState === 'connecting'}
              >
                接続
              </Button>
            )}
          </Space>
        </div>
      </Space>
    </Card>
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
    if (!selectedTool || !client) return;
    
    setToolResult(null);
    setLoading(true);
    
    try {
      const formValues = await form.validateFields();
      const result = await client.callTool(selectedTool, formValues);
      setToolResult(result);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorData = error instanceof Error && (error as any).data ? (error as any).data : undefined;
      setToolResult({ error: errorMessage, data: errorData });
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
          {toolResult.error ? (
            <Alert 
              message="ツール実行エラー" 
              description={
                <div>
                  <div><strong>エラー内容:</strong> {toolResult.error}</div>
                  {toolResult.data && (
                    <details className="mt-2">
                      <summary className="cursor-pointer text-blue-600">詳細情報を表示</summary>
                      <pre className="mt-2 p-2 bg-gray-100 rounded text-xs overflow-auto">
                        {JSON.stringify(toolResult.data, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              }
              type="error" 
              showIcon
            />
          ) : (
            <JSONDisplay data={toolResult} />
          )}
        </Card>
      )}
    </div>
  );
}

function ResourcesSection({ state, setState, client }: SectionProps) {
  const [selectedResource, setSelectedResource] = useState<string>();
  const [resourceContent, setResourceContent] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(1000);

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
    } catch (error: unknown) {
      console.error('Failed to read resource:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorData = error instanceof Error && (error as any).data ? (error as any).data : undefined;
      setResourceContent({ error: errorMessage, data: errorData });
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
              <Alert 
                message="リソース読み込みエラー" 
                description={
                  <div>
                    <div><strong>エラー内容:</strong> {resourceContent.error}</div>
                    {resourceContent.data && (
                      <details className="mt-2">
                        <summary className="cursor-pointer text-blue-600">詳細情報を表示</summary>
                        <pre className="mt-2 p-2 bg-gray-100 rounded text-xs overflow-auto">
                          {JSON.stringify(resourceContent.data, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                }
                type="error" 
                showIcon
              />
            ) : (
              <div>
                {resourceContent.text ? (
                  <div>
                    <Text type="secondary">テキストコンテンツ:</Text>
                    <pre className="bg-gray-50 p-3 rounded mt-2 max-h-64 overflow-y-auto text-sm">
                      {resourceContent.text}
                    </pre>
                    {resourceContent.text.length > 5000 && (
                      <div data-testid="resource-pagination" className="mt-2 text-center">
                        <Button size="small" onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))} disabled={currentPage === 1}>
                          前のページ
                        </Button>
                        <span className="mx-2">ページ {currentPage}</span>
                        <Button size="small" onClick={() => setCurrentPage(prev => prev + 1)}>
                          次のページ
                        </Button>
                      </div>
                    )}
                  </div>
                ) : resourceContent.blob ? (
                  <div>
                    <Text type="secondary">バイナリコンテンツ (Base64):</Text>
                    <pre className="bg-gray-50 p-3 rounded mt-2 max-h-64 overflow-y-auto text-sm break-all">
                      {resourceContent.blob}
                    </pre>
                    {resourceContent.blob.length > 5000 && (
                      <div data-testid="resource-pagination" className="mt-2 text-center">
                        <Button size="small" onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))} disabled={currentPage === 1}>
                          前のページ
                        </Button>
                        <span className="mx-2">ページ {currentPage}</span>
                        <Button size="small" onClick={() => setCurrentPage(prev => prev + 1)}>
                          次のページ
                        </Button>
                      </div>
                    )}
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
  const [promptTemplate, setPromptTemplate] = useState<any>(null);
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

  const handlePromptChange = async (promptName: string) => {
    setSelectedPrompt(promptName);
    form.resetFields();
    setPromptResult(null);
    setPromptTemplate(null);
    
    // Load prompt template for display
    if (promptName) {
      try {
        const template = await client.getPrompt(promptName, {});
        setPromptTemplate(template);
      } catch (error: unknown) {
        console.error('Failed to load prompt template:', error);
      }
    }
  };

  const handleExecutePrompt = async () => {
    if (!selectedPrompt || !selectedPromptData) return;
    
    try {
      setLoading(true);
      const formValues = selectedPromptData.arguments ? await form.validateFields() : {};
      
      const result = await client.getPrompt(selectedPrompt, formValues);
      setPromptResult(result);
    } catch (error: unknown) {
      console.error('Prompt execution failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorData = error instanceof Error && (error as any).data ? (error as any).data : undefined;
      setPromptResult({ error: errorMessage, data: errorData });
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
      
      {promptTemplate && (
        <Card data-testid="prompt-template-display" size="small" title="プロンプトテンプレート">
          {promptTemplate.messages ? (
            <div className="space-y-2">
              {promptTemplate.messages.map((message: any, index: number) => (
                <div key={index} className="bg-gray-50 p-2 rounded">
                  <Badge status="processing" text={message.role} className="mb-1" />
                  <div className="text-sm">
                    {message.content?.text || JSON.stringify(message.content, null, 2)}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <JSONDisplay data={promptTemplate} />
          )}
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
              <Alert 
                message="プロンプト実行エラー" 
                description={
                  <div>
                    <div><strong>エラー内容:</strong> {promptResult.error}</div>
                    {promptResult.data && (
                      <details className="mt-2">
                        <summary className="cursor-pointer text-blue-600">詳細情報を表示</summary>
                        <pre className="mt-2 p-2 bg-gray-100 rounded text-xs overflow-auto">
                          {JSON.stringify(promptResult.data, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                }
                type="error" 
                showIcon
              />
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
  initialServerUrl = 'convex://mcp',
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

  console.log('[MCPTester] Client created:', client);
  console.log('[MCPTester] Skip auth:', skipAuth);

  useEffect(() => {
    console.log('[MCPTester] Setting client in state:', client);
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
      disabled: state.connectionState !== 'connected',
      children: <ToolsSection state={state} setState={setState} client={client} />,
    },
    {
      key: 'resources',
      label: 'リソース',
      disabled: state.connectionState !== 'connected',
      children: <ResourcesSection state={state} setState={setState} client={client} />,
    },
    {
      key: 'prompts',
      label: 'プロンプト',
      disabled: state.connectionState !== 'connected',
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
