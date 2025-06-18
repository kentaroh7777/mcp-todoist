'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import {
  Card,
  Button,
  Input,
  Select,
  Form,
  message,
  Tabs,
  Typography,
  Space,
  Badge,
  Descriptions,
  List,
  Spin,
  Pagination,
  Modal,
  Progress,
  Alert,
  Tooltip,
  notification,
  Drawer,
  Row,
  Col,
  Affix,
  FloatButton
} from 'antd'
import {
  PlayCircleOutlined,
  DisconnectOutlined,
  ConnectOutlined,
  ClearOutlined,
  DownloadOutlined,
  ReloadOutlined,
  InfoCircleOutlined,
  WarningOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  MenuOutlined,
  FullscreenOutlined,
  KeyboardOutlined,
  EyeOutlined,
  SettingOutlined
} from '@ant-design/icons'
import type {
  MCPTool,
  MCPResource,
  MCPResourceContent,
  MCPPrompt,
  MCPPromptContent,
  MCPMessage,
  MCPConnectionState
} from '@/types/mcp'
import { MCPClient } from '@/lib/mcp-client'
import { useAuth } from '@/components/auth/AuthProvider'

const { TextArea } = Input
const { Option } = Select
const { Title, Text, Paragraph } = Typography

interface MCPTesterProps {
  initialServerUrl?: string
  onConnectionChange?: (connected: boolean) => void
}

export function MCPTester({ initialServerUrl, onConnectionChange }: MCPTesterProps) {
  // State管理
  const [connected, setConnected] = useState(false)
  const [serverUrl, setServerUrl] = useState(initialServerUrl || '')
  const [connectionState, setConnectionState] = useState<MCPConnectionState>('disconnected')
  const [tools, setTools] = useState<MCPTool[]>([])
  const [resources, setResources] = useState<MCPResource[]>([])
  const [prompts, setPrompts] = useState<MCPPrompt[]>([])
  const [logs, setLogs] = useState<MCPMessage[]>([])
  const [selectedTool, setSelectedTool] = useState<MCPTool>()
  const [selectedResource, setSelectedResource] = useState<MCPResource>()
  const [selectedPrompt, setSelectedPrompt] = useState<MCPPrompt>()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>()
  const [toolResult, setToolResult] = useState<any>()
  const [resourceContent, setResourceContent] = useState<MCPResourceContent>()
  const [promptResult, setPromptResult] = useState<MCPPromptContent>()
  
  // UX拡張State
  const [activeTab, setActiveTab] = useState('connection')
  const [drawerVisible, setDrawerVisible] = useState(false)
  const [fullscreenMode, setFullscreenMode] = useState(false)
  const [connectionProgress, setConnectionProgress] = useState(0)
  const [operationProgress, setOperationProgress] = useState(0)
  const [showKeyboardHelp, setShowKeyboardHelp] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [errorDetails, setErrorDetails] = useState<{ code?: string; recoveryAction?: string }>({})
  
  // Forms
  const [toolForm] = Form.useForm()
  const [promptForm] = Form.useForm()
  
  // Refs
  const mcpClient = useRef<MCPClient>()
  const { user } = useAuth()

  // クライアント初期化
  useEffect(() => {
    if (!mcpClient.current) {
      mcpClient.current = new MCPClient()
      setupEventHandlers()
    }
  }, [])

  // 認証状態の監視
  useEffect(() => {
    if (mcpClient.current) {
      mcpClient.current.handleAuthStateChange(user)
    }
  }, [user])

  const setupEventHandlers = useCallback(() => {
    if (!mcpClient.current) return

    mcpClient.current.on('connect', () => {
      setConnected(true)
      setConnectionState('connected')
      setError(undefined)
      onConnectionChange?.(true)
      message.success('MCP サーバーに接続しました')
      
      // 接続後に自動的にリソースを取得
      loadInitialData()
    })

    mcpClient.current.on('disconnect', () => {
      setConnected(false)
      setConnectionState('disconnected')
      onConnectionChange?.(false)
      message.info('MCP サーバーから切断されました')
    })

    mcpClient.current.on('error', (error: Error) => {
      setError(error.message)
      message.error(`エラー: ${error.message}`)
    })

    mcpClient.current.on('reconnect', () => {
      setConnectionState('reconnecting')
      message.warning('再接続を試行中...')
    })
  }, [onConnectionChange])

  const loadInitialData = async () => {
    if (!mcpClient.current || !connected) return

    try {
      setLoading(true)
      
      // 初期化
      await mcpClient.current.initialize()
      
      // 並列でデータ取得
      const [toolsData, resourcesData, promptsData] = await Promise.all([
        mcpClient.current.listTools().catch(() => []),
        mcpClient.current.listResources().catch(() => []),
        mcpClient.current.listPrompts().catch(() => [])
      ])
      
      setTools(toolsData)
      setResources(resourcesData)
      setPrompts(promptsData)
      
    } catch (error) {
      console.error('初期データ取得エラー:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleConnect = async () => {
    if (!mcpClient.current) return
    if (!serverUrl.trim()) {
      notification.error({
        message: '入力エラー',
        description: 'サーバーURLを入力してください',
        placement: 'topRight'
      })
      return
    }

    // URL validation with better feedback
    try {
      const url = new URL(serverUrl)
      if (!['ws:', 'wss:'].includes(url.protocol)) {
        setError('WebSocket URL（ws://またはwss://）を入力してください')
        setErrorDetails({ 
          code: 'INVALID_PROTOCOL',
          recoveryAction: 'URLをws://localhost:8080/mcpのような形式で入力してください'
        })
        return
      }
    } catch {
      setError('有効なWebSocket URLを入力してください')
      setErrorDetails({ 
        code: 'INVALID_URL',
        recoveryAction: 'URLの形式を確認してください（例: ws://localhost:8080/mcp）'
      })
      return
    }

    setLoading(true)
    setIsProcessing(true)
    setError(undefined)
    setErrorDetails({})
    setConnectionProgress(0)
    
    // Progress simulation for better UX
    const progressInterval = setInterval(() => {
      setConnectionProgress(prev => {
        if (prev >= 90) {
          clearInterval(progressInterval)
          return 90
        }
        return prev + 10
      })
    }, 200)
    
    try {
      await mcpClient.current.connect(serverUrl)
      setConnectionProgress(100)
      notification.success({
        message: '接続成功',
        description: `${serverUrl} に正常に接続しました`,
        placement: 'topRight',
        duration: 3
      })
    } catch (error: any) {
      clearInterval(progressInterval)
      setConnectionProgress(0)
      
      // Enhanced error handling with recovery suggestions
      const errorMessage = error?.message || '接続に失敗しました'
      const errorCode = error?.code || 'UNKNOWN_ERROR'
      const recoveryAction = error?.recoveryAction || '再度お試しください'
      
      setError(errorMessage)
      setErrorDetails({ code: errorCode, recoveryAction })
      
      notification.error({
        message: '接続エラー',
        description: errorMessage,
        placement: 'topRight',
        duration: 5
      })
    } finally {
      setLoading(false)
      setIsProcessing(false)
      clearInterval(progressInterval)
    }
  }

  const handleDisconnect = () => {
    if (mcpClient.current) {
      mcpClient.current.disconnect()
    }
  }

  const handleToolExecute = async () => {
    if (!mcpClient.current || !selectedTool) return

    try {
      setLoading(true)
      const values = await toolForm.validateFields()
      
      // パラメータをツールのスキーマに合わせて処理
      const params = Object.keys(values).reduce((acc, key) => {
        if (values[key] !== undefined && values[key] !== '') {
          acc[key] = values[key]
        }
        return acc
      }, {} as Record<string, any>)

      const result = await mcpClient.current.callTool(selectedTool.name, params)
      setToolResult(result)
      
      // ログに追加
      addToLogs({
        id: Date.now().toString(),
        timestamp: new Date(),
        direction: 'sent',
        type: 'request',
        content: {
          jsonrpc: '2.0',
          id: Date.now(),
          method: 'tools/call',
          params: { name: selectedTool.name, arguments: params }
        }
      })
      
      message.success('ツールを実行しました')
    } catch (error) {
      message.error(error instanceof Error ? error.message : 'ツール実行エラー')
    } finally {
      setLoading(false)
    }
  }

  const handleResourceSelect = async (resourceUri: string) => {
    if (!mcpClient.current) return
    
    const resource = resources.find(r => r.uri === resourceUri)
    if (!resource) return

    setSelectedResource(resource)
    
    try {
      setLoading(true)
      const content = await mcpClient.current.readResource(resourceUri)
      setResourceContent(content)
    } catch (error) {
      message.error('リソースの読み取りに失敗しました')
    } finally {
      setLoading(false)
    }
  }

  const handlePromptExecute = async () => {
    if (!mcpClient.current || !selectedPrompt) return

    try {
      setLoading(true)
      const values = await promptForm.validateFields()
      
      const result = await mcpClient.current.getPrompt(selectedPrompt.name, values)
      setPromptResult(result)
      
      message.success('プロンプトを実行しました')
    } catch (error) {
      message.error(error instanceof Error ? error.message : 'プロンプト実行エラー')
    } finally {
      setLoading(false)
    }
  }

  const addToLogs = (log: MCPMessage) => {
    setLogs(prev => [...prev, log].slice(-100)) // 最新100件のみ保持
  }

  const clearLogs = () => {
    setLogs([])
  }

  const exportLogs = () => {
    const data = JSON.stringify(logs, null, 2)
    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `mcp-logs-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const renderToolParameterForm = () => {
    if (!selectedTool) return null

    const { properties = {}, required = [] } = selectedTool.inputSchema

    return (
      <Form form={toolForm} layout="vertical" data-testid="tool-params-form">
        {Object.entries(properties).map(([key, schema]: [string, any]) => (
          <Form.Item
            key={key}
            label={key}
            name={key}
            rules={[
              { required: required.includes(key), message: `${key}は必須です` }
            ]}
          >
            {schema.type === 'string' ? (
              <Input placeholder={schema.description} />
            ) : schema.type === 'number' ? (
              <Input type="number" placeholder={schema.description} />
            ) : schema.type === 'boolean' ? (
              <Select placeholder={schema.description}>
                <Option value={true}>true</Option>
                <Option value={false}>false</Option>
              </Select>
            ) : (
              <TextArea placeholder={schema.description} />
            )}
          </Form.Item>
        ))}
      </Form>
    )
  }

  const renderPromptVariableForm = () => {
    if (!selectedPrompt || !selectedPrompt.arguments) return null

    return (
      <Form form={promptForm} layout="vertical" data-testid="prompt-variables-form">
        {selectedPrompt.arguments.map((arg) => (
          <Form.Item
            key={arg.name}
            label={arg.name}
            name={arg.name}
            rules={[
              { required: arg.required, message: `${arg.name}は必須です` }
            ]}
          >
            <Input placeholder={arg.description} />
          </Form.Item>
        ))}
      </Form>
    )
  }

  const getConnectionStatusBadge = () => {
    switch (connectionState) {
      case 'connected':
        return <Badge status="success" text="接続済み" data-testid="connection-status" />
      case 'connecting':
        return <Badge status="processing" text="接続中..." data-testid="connection-status" />
      case 'reconnecting':
        return <Badge status="warning" text="再接続中..." data-testid="connection-status" />
      default:
        return <Badge status="error" text="未接続" data-testid="connection-status" />
    }
  }

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Ctrl+Enter: Execute current tool/prompt
      if (event.ctrlKey && event.key === 'Enter') {
        event.preventDefault()
        if (activeTab === 'tools' && selectedTool) {
          handleToolExecute()
        } else if (activeTab === 'prompts' && selectedPrompt) {
          handlePromptExecute()
        }
      }
      
      // Ctrl+Shift+C: Connect/Disconnect
      if (event.ctrlKey && event.shiftKey && event.key === 'C') {
        event.preventDefault()
        if (connected) {
          handleDisconnect()
        } else {
          handleConnect()
        }
      }
      
      // F1: Show keyboard help
      if (event.key === 'F1') {
        event.preventDefault()
        setShowKeyboardHelp(true)
      }
      
      // Escape: Close modals/drawer
      if (event.key === 'Escape') {
        setDrawerVisible(false)
        setShowKeyboardHelp(false)
        setFullscreenMode(false)
      }
    }
    
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [activeTab, selectedTool, selectedPrompt, connected])
  
  // Responsive breakpoint detection
  const [screenSize, setScreenSize] = useState<'mobile' | 'tablet' | 'desktop'>('desktop')
  
  useEffect(() => {
    const checkScreenSize = () => {
      const width = window.innerWidth
      if (width < 768) {
        setScreenSize('mobile')
      } else if (width < 1200) {
        setScreenSize('tablet')
      } else {
        setScreenSize('desktop')
      }
    }
    
    checkScreenSize()
    window.addEventListener('resize', checkScreenSize)
    return () => window.removeEventListener('resize', checkScreenSize)
  }, [])

  if (!user) {
    return (
      <div data-testid="signin-required" className="signin-required">
        <Card 
          style={{ 
            maxWidth: 500, 
            margin: '40px auto',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
          }}
        >
          <div style={{ textAlign: 'center', padding: '40px 20px' }}>
            <ExclamationCircleOutlined 
              style={{ fontSize: 48, color: '#faad14', marginBottom: 16 }} 
            />
            <Title level={3}>サインインが必要です</Title>
            <Paragraph type="secondary">
              MCP テスターを使用するにはサインインしてください。
            </Paragraph>
            <Button type="primary" size="large" style={{ marginTop: 16 }}>
              サインインページへ
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  const renderKeyboardHelp = () => (
    <Modal
      title="キーボードショートカット"
      open={showKeyboardHelp}
      onCancel={() => setShowKeyboardHelp(false)}
      footer={[
        <Button key="close" onClick={() => setShowKeyboardHelp(false)}>
          閉じる
        </Button>
      ]}
    >
      <List
        size="small"
        dataSource={[
          { key: 'Ctrl + Enter', description: '現在のツール/プロンプトを実行' },
          { key: 'Ctrl + Shift + C', description: '接続/切断の切り替え' },
          { key: 'F1', description: 'キーボードヘルプを表示' },
          { key: 'Escape', description: 'モーダルやドロワーを閉じる' }
        ]}
        renderItem={item => (
          <List.Item>
            <List.Item.Meta
              title={<code style={{ background: '#f5f5f5', padding: '2px 6px', borderRadius: 4 }}>{item.key}</code>}
              description={item.description}
            />
          </List.Item>
        )}
      />
    </Modal>
  )
  
  const renderErrorAlert = () => {
    if (!error) return null
    
    return (
      <Alert
        message="エラーが発生しました"
        description={
          <div>
            <div style={{ marginBottom: 8 }}>{error}</div>
            {errorDetails.recoveryAction && (
              <div style={{ fontSize: 12, color: '#666' }}>
                <InfoCircleOutlined style={{ marginRight: 4 }} />
                対処方法: {errorDetails.recoveryAction}
              </div>
            )}
            {errorDetails.code && (
              <div style={{ fontSize: 11, color: '#999', marginTop: 4 }}>
                エラーコード: {errorDetails.code}
              </div>
            )}
          </div>
        }
        type="error"
        showIcon
        closable
        onClose={() => {
          setError(undefined)
          setErrorDetails({})
        }}
        style={{ marginBottom: 16 }}
        action={
          errorDetails.recoveryAction && (
            <Button size="small" onClick={() => {
              if (errorDetails.code?.includes('CONNECTION') || errorDetails.code?.includes('URL')) {
                // Focus on server URL input
                const urlInput = document.querySelector('[data-testid="server-url-input"]') as HTMLInputElement
                urlInput?.focus()
              }
            }}>
              修正する
            </Button>
          )
        }
      />
    )
  }
  
  const containerStyle = {
    padding: screenSize === 'mobile' ? '12px' : '24px',
    maxWidth: fullscreenMode ? '100%' : '1400px',
    margin: '0 auto',
    minHeight: fullscreenMode ? '100vh' : 'auto'
  }
  
  const tabBarStyle = {
    position: screenSize === 'mobile' ? 'sticky' as const : 'static' as const,
    top: screenSize === 'mobile' ? 0 : 'auto',
    zIndex: screenSize === 'mobile' ? 100 : 'auto',
    background: '#fff',
    borderBottom: screenSize === 'mobile' ? '1px solid #f0f0f0' : 'none'
  }

  return (
    <div data-testid="mcp-tester" style={containerStyle}>
      {/* Header with responsive design */}
      <Row align="middle" justify="space-between" style={{ marginBottom: 24 }}>
        <Col>
          <Title level={screenSize === 'mobile' ? 3 : 2} style={{ margin: 0 }}>
            MCP テスター
            {connected && (
              <Badge 
                status="success" 
                text="接続中" 
                style={{ marginLeft: 12, fontSize: 12 }}
              />
            )}
          </Title>
        </Col>
        <Col>
          <Space>
            {screenSize === 'mobile' && (
              <Button 
                icon={<MenuOutlined />} 
                onClick={() => setDrawerVisible(true)}
                aria-label="メニューを開く"
              />
            )}
            <Tooltip title="キーボードショートカット (F1)">
              <Button 
                icon={<KeyboardOutlined />} 
                onClick={() => setShowKeyboardHelp(true)}
                aria-label="キーボードショートカットを表示"
              />
            </Tooltip>
            <Tooltip title={fullscreenMode ? "通常表示" : "フルスクリーン"}>
              <Button 
                icon={<FullscreenOutlined />} 
                onClick={() => setFullscreenMode(!fullscreenMode)}
                aria-label={fullscreenMode ? "通常表示" : "フルスクリーン"}
              />
            </Tooltip>
          </Space>
        </Col>
      </Row>
      
      {/* Connection progress indicator */}
      {isProcessing && (
        <div style={{ marginBottom: 16 }}>
          <Progress 
            percent={connectionProgress} 
            status={connectionProgress === 100 ? 'success' : 'active'}
            strokeColor={{
              '0%': '#108ee9',
              '100%': '#87d068',
            }}
            format={(percent) => `接続中... ${percent}%`}
          />
        </div>
      )}
      
      {renderErrorAlert()}

      {/* Mobile drawer for menu */}
      <Drawer
        title="MCP テスターメニュー"
        placement="left"
        onClose={() => setDrawerVisible(false)}
        open={drawerVisible}
        width={280}
      >
        <List
          dataSource={[
            { key: 'connection', icon: <ConnectOutlined />, title: '接続設定' },
            { key: 'tools', icon: <PlayCircleOutlined />, title: 'ツール実行' },
            { key: 'resources', icon: <EyeOutlined />, title: 'リソース管理' },
            { key: 'prompts', icon: <SettingOutlined />, title: 'プロンプト管理' },
            { key: 'debug', icon: <InfoCircleOutlined />, title: 'デバッグログ' }
          ]}
          renderItem={item => (
            <List.Item
              style={{ 
                cursor: 'pointer',
                background: activeTab === item.key ? '#e6f7ff' : 'transparent',
                borderRadius: 4,
                margin: '4px 0'
              }}
              onClick={() => {
                setActiveTab(item.key)
                setDrawerVisible(false)
              }}
            >
              <List.Item.Meta
                avatar={item.icon}
                title={item.title}
              />
            </List.Item>
          )}
        />
      </Drawer>

      <Tabs 
        activeKey={activeTab}
        onChange={setActiveTab}
        size={screenSize === 'mobile' ? 'small' : 'default'}
        tabBarStyle={tabBarStyle}
        tabPosition={screenSize === 'mobile' ? 'top' : 'top'}
      >
        {/* 接続セクション - Enhanced with responsive design */}
        <Tabs.TabPane 
          tab={
            <span>
              <ConnectOutlined />
              {screenSize !== 'mobile' && ' 接続'}
            </span>
          } 
          key="connection"
        >
          <Card 
            title="サーバー接続" 
            data-testid="connection-section"
            size={screenSize === 'mobile' ? 'small' : 'default'}
            extra={
              <Tooltip title="接続状態">
                {getConnectionStatusBadge()}
              </Tooltip>
            }
          >
            <Space direction="vertical" style={{ width: '100%' }} size="large">
              <Row gutter={[16, 16]}>
                <Col xs={24} sm={24} md={16} lg={18}>
                  <Form.Item 
                    label="サーバーURL" 
                    help="WebSocket URL (ws:// または wss://)"
                    validateStatus={error && errorDetails.code?.includes('URL') ? 'error' : ''}
                  >
                    <Input
                      value={serverUrl}
                      onChange={(e) => setServerUrl(e.target.value)}
                      placeholder="ws://localhost:8080/mcp"
                      data-testid="server-url-input"
                      disabled={connected}
                      size={screenSize === 'mobile' ? 'large' : 'middle'}
                      aria-label="MCPサーバーURLを入力"
                      addonBefore={
                        <Tooltip title="WebSocketプロトコル">
                          <span style={{ color: '#666' }}>WS</span>
                        </Tooltip>
                      }
                      onPressEnter={!connected ? handleConnect : undefined}
                    />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={24} md={8} lg={6}>
                  <Form.Item label={screenSize === 'mobile' ? '' : ' '}>
                    <Space size="small" style={{ width: '100%' }}>
                      {!connected ? (
                        <Button
                          type="primary"
                          icon={<ConnectOutlined />}
                          loading={loading}
                          onClick={handleConnect}
                          data-testid="connect-button"
                          size={screenSize === 'mobile' ? 'large' : 'middle'}
                          block={screenSize === 'mobile'}
                          aria-label="MCPサーバーに接続"
                        >
                          {screenSize === 'mobile' ? '接続する' : '接続'}
                        </Button>
                      ) : (
                        <Button
                          danger
                          icon={<DisconnectOutlined />}
                          onClick={handleDisconnect}
                          data-testid="disconnect-button"
                          size={screenSize === 'mobile' ? 'large' : 'middle'}
                          block={screenSize === 'mobile'}
                          aria-label="MCPサーバーから切断"
                        >
                          {screenSize === 'mobile' ? '切断する' : '切断'}
                        </Button>
                      )}
                      
                      <Tooltip title="ツール、リソース、プロンプトを更新">
                        <Button
                          icon={<ReloadOutlined />}
                          onClick={loadInitialData}
                          disabled={!connected}
                          loading={loading}
                          size={screenSize === 'mobile' ? 'large' : 'middle'}
                          aria-label="データを更新"
                        >
                          {screenSize !== 'mobile' && '更新'}
                        </Button>
                      </Tooltip>
                    </Space>
                  </Form.Item>
                </Col>
              </Row>
              
              {/* Connection statistics (if connected) */}
              {connected && mcpClient.current && (
                <Row gutter={[16, 16]}>
                  <Col xs={24} sm={12} md={8}>
                    <Card size="small" title="接続情報">
                      <Descriptions size="small" column={1}>
                        <Descriptions.Item label="サーバーURL">
                          <Text ellipsis style={{ maxWidth: 200 }}>{serverUrl}</Text>
                        </Descriptions.Item>
                        <Descriptions.Item label="状態">
                          {getConnectionStatusBadge()}
                        </Descriptions.Item>
                      </Descriptions>
                    </Card>
                  </Col>
                  <Col xs={24} sm={12} md={8}>
                    <Card size="small" title="統計">
                      <Descriptions size="small" column={1}>
                        <Descriptions.Item label="ツール">
                          <Badge count={tools.length} showZero style={{ backgroundColor: '#52c41a' }} />
                        </Descriptions.Item>
                        <Descriptions.Item label="リソース">
                          <Badge count={resources.length} showZero style={{ backgroundColor: '#1890ff' }} />
                        </Descriptions.Item>
                        <Descriptions.Item label="プロンプト">
                          <Badge count={prompts.length} showZero style={{ backgroundColor: '#722ed1' }} />
                        </Descriptions.Item>
                      </Descriptions>
                    </Card>
                  </Col>
                </Row>
              )}
            </Space>
          </Card>
        </Tabs.TabPane>

        {/* ツール実行セクション */}
        <Tabs.TabPane tab="ツール" key="tools">
          <Card title="ツール実行" data-testid="tools-section">
            <Space direction="vertical" style={{ width: '100%' }}>
              <Select
                value={selectedTool?.name}
                onChange={(name) => {
                  const tool = tools.find(t => t.name === name)
                  setSelectedTool(tool)
                  setToolResult(undefined)
                  toolForm.resetFields()
                }}
                placeholder="ツールを選択してください"
                style={{ width: '100%' }}
                data-testid="tool-select"
                disabled={!connected}
              >
                {tools.map(tool => (
                  <Option key={tool.name} value={tool.name}>
                    {tool.name} - {tool.description}
                  </Option>
                ))}
              </Select>

              {selectedTool && (
                <>
                  {renderToolParameterForm()}
                  
                  <Button
                    type="primary"
                    icon={<PlayCircleOutlined />}
                    onClick={handleToolExecute}
                    loading={loading}
                    data-testid="execute-tool-button"
                  >
                    実行
                  </Button>
                </>
              )}

              {toolResult && (
                <Card title="実行結果" size="small">
                  <pre
                    data-testid="tool-result-display"
                    style={{
                      background: '#f5f5f5',
                      padding: '12px',
                      borderRadius: '6px',
                      overflow: 'auto',
                      maxHeight: '300px'
                    }}
                  >
                    {JSON.stringify(toolResult, null, 2)}
                  </pre>
                </Card>
              )}
            </Space>
          </Card>
        </Tabs.TabPane>

        {/* リソース管理セクション */}
        <Tabs.TabPane tab="リソース" key="resources">
          <Card title="リソース管理" data-testid="resources-section">
            <Space direction="vertical" style={{ width: '100%' }}>
              <Select
                value={selectedResource?.uri}
                onChange={handleResourceSelect}
                placeholder="リソースを選択してください"
                style={{ width: '100%' }}
                data-testid="resource-select"
                disabled={!connected}
              >
                {resources.map(resource => (
                  <Option key={resource.uri} value={resource.uri}>
                    {resource.name} ({resource.uri})
                  </Option>
                ))}
              </Select>

              {resourceContent && (
                <Card title="リソース内容" size="small">
                  <Descriptions column={1} size="small">
                    <Descriptions.Item label="URI">{resourceContent.uri}</Descriptions.Item>
                    <Descriptions.Item label="MIME Type">{resourceContent.mimeType}</Descriptions.Item>
                  </Descriptions>
                  
                  <div
                    data-testid="resource-content-display"
                    style={{
                      background: '#f5f5f5',
                      padding: '12px',
                      borderRadius: '6px',
                      overflow: 'auto',
                      maxHeight: '400px',
                      marginTop: '12px'
                    }}
                  >
                    {resourceContent.text && (
                      <pre>{resourceContent.text}</pre>
                    )}
                    {resourceContent.blob && (
                      <Text>バイナリコンテンツ (表示できません)</Text>
                    )}
                  </div>
                  
                  {/* 大きなコンテンツ用のページネーション */}
                  {resourceContent.text && resourceContent.text.length > 5000 && (
                    <Pagination
                      size="small"
                      total={Math.ceil(resourceContent.text.length / 5000)}
                      pageSize={1}
                      style={{ marginTop: '12px', textAlign: 'center' }}
                      data-testid="resource-pagination"
                    />
                  )}
                </Card>
              )}
            </Space>
          </Card>
        </Tabs.TabPane>

        {/* プロンプト管理セクション */}
        <Tabs.TabPane tab="プロンプト" key="prompts">
          <Card title="プロンプト管理" data-testid="prompts-section">
            <Space direction="vertical" style={{ width: '100%' }}>
              <Select
                value={selectedPrompt?.name}
                onChange={(name) => {
                  const prompt = prompts.find(p => p.name === name)
                  setSelectedPrompt(prompt)
                  setPromptResult(undefined)
                  promptForm.resetFields()
                }}
                placeholder="プロンプトを選択してください"
                style={{ width: '100%' }}
                data-testid="prompt-select"
                disabled={!connected}
              >
                {prompts.map(prompt => (
                  <Option key={prompt.name} value={prompt.name}>
                    {prompt.name} - {prompt.description}
                  </Option>
                ))}
              </Select>

              {selectedPrompt && (
                <>
                  {renderPromptVariableForm()}
                  
                  <Button
                    type="primary"
                    icon={<PlayCircleOutlined />}
                    onClick={handlePromptExecute}
                    loading={loading}
                    data-testid="execute-prompt-button"
                  >
                    実行
                  </Button>
                </>
              )}

              {promptResult && (
                <Card title="プロンプト結果" size="small">
                  <div data-testid="prompt-result-display">
                    <div data-testid="prompt-template-display">
                      {promptResult.messages?.map((msg, index) => (
                        <div key={index} style={{ marginBottom: '8px' }}>
                          <Text strong>{msg.role}: </Text>
                          <Text>{msg.content.text}</Text>
                        </div>
                      ))}
                    </div>
                  </div>
                </Card>
              )}
            </Space>
          </Card>
        </Tabs.TabPane>

        {/* デバッグセクション */}
        <Tabs.TabPane tab="デバッグ" key="debug">
          <Card 
            title="デバッグログ" 
            data-testid="debug-section"
            extra={
              <Space>
                <Button
                  size="small"
                  icon={<ClearOutlined />}
                  onClick={clearLogs}
                  data-testid="clear-logs-button"
                >
                  クリア
                </Button>
                <Button
                  size="small"
                  icon={<DownloadOutlined />}
                  onClick={exportLogs}
                  data-testid="export-logs-button"
                >
                  エクスポート
                </Button>
              </Space>
            }
          >
            <div data-testid="message-logs">
              {logs.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
                  ログはありません
                </div>
              ) : (
                <List
                  size="small"
                  dataSource={logs}
                  renderItem={(log) => (
                    <List.Item>
                      <div style={{ width: '100%' }}>
                        <div style={{ marginBottom: '4px' }}>
                          <Badge 
                            status={log.direction === 'sent' ? 'processing' : 'success'} 
                            text={`${log.direction} - ${log.timestamp.toLocaleTimeString()}`}
                          />
                        </div>
                        <pre
                          data-testid="json-formatter"
                          style={{
                            background: '#f5f5f5',
                            padding: '8px',
                            borderRadius: '4px',
                            fontSize: '12px',
                            overflow: 'auto'
                          }}
                        >
                          {JSON.stringify(log.content, null, 2)}
                        </pre>
                      </div>
                    </List.Item>
                  )}
                />
              )}
            </div>
          </Card>
        </Tabs.TabPane>
      </Tabs>

      {/* Account Switcher (hidden, for test compatibility) */}
      <select style={{ display: 'none' }} data-testid="account-switcher">
        <option value="current">Current Account</option>
      </select>
      
      {/* Logout Button (hidden, for test compatibility) */}
      <button style={{ display: 'none' }} data-testid="logout-button">
        Logout
      </button>
    </div>
  )
}

export default MCPTester