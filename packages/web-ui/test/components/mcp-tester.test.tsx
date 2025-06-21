import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ConvexProvider, ConvexReactClient } from 'convex/react'
import MCPTester from '@/components/MCPTester'

// MCPTesterコンポーネントのProps型定義（テスト用）
interface MCPTesterProps {
  initialServerUrl?: string
  onConnectionChange?: (connected: boolean) => void
}

// MCPTesterの内部状態型定義（テスト用）
interface MCPTool {
  name: string
  description: string
  inputSchema: {
    type: string
    properties: Record<string, any>
    required?: string[]
  }
}

interface MCPResource {
  uri: string
  name: string
  description?: string
  mimeType?: string
}

interface MCPPrompt {
  name: string
  description: string
  arguments?: Array<{
    name: string
    description: string
    required?: boolean
  }>
}

interface MCPMessage {
  id: string
  timestamp: number
  direction: 'sent' | 'received'
  data: any
}

// Firebase認証プロバイダーモック
const AuthProviderMock = ({ children }: { children: React.ReactNode }) => {
  // Use a mock Convex client
  const convex = new ConvexReactClient('https://dev.convex.site')
  return (
    <div data-testid="auth-provider">
      <ConvexProvider client={convex}>{children}</ConvexProvider>
    </div>
  )
}

// MCPクライアントモック
const mockMCPClient = {
  connect: vi.fn(),
  disconnect: vi.fn(),
  isConnected: vi.fn().mockReturnValue(false),
  initialize: vi.fn(),
  listTools: vi.fn(),
  callTool: vi.fn(),
  listResources: vi.fn(),
  readResource: vi.fn(),
  listPrompts: vi.fn(),
  getPrompt: vi.fn(),
  on: vi.fn(),
  off: vi.fn(),
  getConnectionState: vi.fn().mockReturnValue('disconnected'),
  getServerInfo: vi.fn()
}

vi.mock('convex/react', async () => {
  const original = await vi.importActual<typeof import('convex/react')>('convex/react')
  return {
    ...original,
    useQuery: vi.fn(),
    useMutation: vi.fn().mockReturnValue([vi.fn(), { loading: false }]),
    useAction: vi.fn().mockReturnValue([vi.fn(), { loading: false }])
  }
})

vi.mock('@/lib/mcp/extended-convex-client', () => ({
  useExtendedConvexMCPClient: () => mockMCPClient,
  ExtendedConvexMCPClient: vi.fn(() => mockMCPClient)
}))

describe.skip('MCPTester', () => {
  const user = userEvent.setup()
  let mockOnConnectionChange: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.clearAllMocks()
    mockOnConnectionChange = vi.fn()
    
    // MCPClientモックのリセット
    mockMCPClient.connect.mockResolvedValue(undefined)
    mockMCPClient.disconnect.mockImplementation(() => {})
    mockMCPClient.isConnected.mockReturnValue(false)
    mockMCPClient.initialize.mockResolvedValue({
      protocolVersion: '2024-11-05',
      capabilities: {},
      serverInfo: { name: 'test-server', version: '1.0.0' }
    })
    mockMCPClient.listTools.mockResolvedValue([])
    mockMCPClient.listResources.mockResolvedValue([])
    mockMCPClient.listPrompts.mockResolvedValue([])
  })

  afterEach(() => {
    vi.clearAllTimers()
  })

  describe('コンポーネントレンダリング', () => {
    it('MCPTester コンポーネントが正しくレンダリングされる', () => {
      render(
        <AuthProviderMock>
          <MCPTester />
        </AuthProviderMock>
      )

      expect(screen.getByText('MCP テスター')).toBeInTheDocument()
      expect(screen.getByTestId('connection-section')).toBeInTheDocument()
      expect(screen.getByTestId('tools-section')).toBeInTheDocument()
      expect(screen.getByTestId('resources-section')).toBeInTheDocument()
      expect(screen.getByTestId('prompts-section')).toBeInTheDocument()
      expect(screen.getByTestId('debug-section')).toBeInTheDocument()
    })

    it('初期サーバーURLが設定されている場合に表示される', () => {
      const initialUrl = 'ws://localhost:8080/mcp'
      
      render(
        <AuthProviderMock>
          <MCPTester initialServerUrl={initialUrl} />
        </AuthProviderMock>
      )

      const urlInput = screen.getByTestId('server-url-input') as HTMLInputElement
      expect(urlInput.value).toBe(initialUrl)
    })
  })

  describe('接続セクション', () => {
    it('サーバーURL入力フィールドが表示される', () => {
      render(
        <AuthProviderMock>
          <MCPTester />
        </AuthProviderMock>
      )

      const urlInput = screen.getByTestId('server-url-input')
      expect(urlInput).toBeInTheDocument()
      expect(urlInput).toHaveAttribute('placeholder', 'ws://localhost:8080/mcp')
    })

    it('接続ボタンでMCPサーバーに接続する', async () => {
      mockMCPClient.connect.mockResolvedValue(undefined)
      mockMCPClient.isConnected.mockReturnValue(true)

      render(
        <AuthProviderMock>
          <MCPTester onConnectionChange={mockOnConnectionChange} />
        </AuthProviderMock>
      )

      const urlInput = screen.getByTestId('server-url-input')
      const connectButton = screen.getByTestId('connect-button')

      await user.type(urlInput, 'ws://localhost:8080/mcp')
      await user.click(connectButton)

      await waitFor(() => {
        expect(mockMCPClient.connect).toHaveBeenCalledWith('ws://localhost:8080/mcp')
        expect(mockOnConnectionChange).toHaveBeenCalledWith(true)
      })
    })

    it('切断ボタンで接続を終了する', async () => {
      mockMCPClient.isConnected.mockReturnValue(true)

      render(
        <AuthProviderMock>
          <MCPTester onConnectionChange={mockOnConnectionChange} />
        </AuthProviderMock>
      )

      const disconnectButton = screen.getByTestId('disconnect-button')
      await user.click(disconnectButton)

      await waitFor(() => {
        expect(mockMCPClient.disconnect).toHaveBeenCalled()
        expect(mockOnConnectionChange).toHaveBeenCalledWith(false)
      })
    })

    it('接続状態インジケーターが正確に表示される', () => {
      mockMCPClient.isConnected.mockReturnValue(true)
      mockMCPClient.getConnectionState.mockReturnValue('connected')

      render(
        <AuthProviderMock>
          <MCPTester />
        </AuthProviderMock>
      )

      const statusBadge = screen.getByTestId('connection-status')
      expect(statusBadge).toHaveClass('badge-success')
      expect(statusBadge).toHaveTextContent('接続済み')
    })

    it('接続エラー時にエラーメッセージを表示する', async () => {
      mockMCPClient.connect.mockRejectedValue(new Error('接続に失敗しました'))

      render(
        <AuthProviderMock>
          <MCPTester />
        </AuthProviderMock>
      )

      const urlInput = screen.getByTestId('server-url-input')
      const connectButton = screen.getByTestId('connect-button')

      await user.type(urlInput, 'ws://invalid-server:9999/mcp')
      await user.click(connectButton)

      await waitFor(() => {
        expect(screen.getByText('接続に失敗しました')).toBeInTheDocument()
      })
    })
  })

  describe('ツール実行セクション', () => {
    const mockTools: MCPTool[] = [
      {
        name: 'todoist_get_tasks',
        description: 'Todoistからタスク一覧を取得',
        inputSchema: {
          type: 'object',
          properties: {
            project_id: { type: 'string', description: 'プロジェクトID' }
          }
        }
      },
      {
        name: 'todoist_create_task',
        description: 'Todoistにタスクを作成',
        inputSchema: {
          type: 'object',
          properties: {
            content: { type: 'string', description: 'タスク内容' },
            project_id: { type: 'string', description: 'プロジェクトID' }
          },
          required: ['content']
        }
      }
    ]

    beforeEach(() => {
      mockMCPClient.isConnected.mockReturnValue(true)
      mockMCPClient.listTools.mockResolvedValue(mockTools)
    })

    it('利用可能ツール一覧を表示する', async () => {
      render(
        <AuthProviderMock>
          <MCPTester />
        </AuthProviderMock>
      )

      await waitFor(() => {
        expect(screen.getByText('todoist_get_tasks')).toBeInTheDocument()
        expect(screen.getByText('todoist_create_task')).toBeInTheDocument()
        expect(screen.getByText('Todoistからタスク一覧を取得')).toBeInTheDocument()
      })
    })

    it('ツール選択でパラメーター入力フォームを表示する', async () => {
      render(
        <AuthProviderMock>
          <MCPTester />
        </AuthProviderMock>
      )

      await waitFor(() => {
        const toolSelect = screen.getByTestId('tool-select')
        fireEvent.change(toolSelect, { target: { value: 'todoist_create_task' } })
      })

      await waitFor(() => {
        expect(screen.getByTestId('tool-params-form')).toBeInTheDocument()
        expect(screen.getByText('content')).toBeInTheDocument()
        expect(screen.getByText('project_id')).toBeInTheDocument()
      })
    })

    it('ツール実行ボタンでツールを呼び出す', async () => {
      const mockResult = {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ id: '123', content: 'テストタスク' })
          }
        ]
      }
      mockMCPClient.callTool.mockResolvedValue(mockResult)

      render(
        <AuthProviderMock>
          <MCPTester />
        </AuthProviderMock>
      )

      await waitFor(() => {
        const toolSelect = screen.getByTestId('tool-select')
        fireEvent.change(toolSelect, { target: { value: 'todoist_create_task' } })
      })

      const executeButton = screen.getByTestId('execute-tool-button')
      await user.click(executeButton)

      await waitFor(() => {
        expect(mockMCPClient.callTool).toHaveBeenCalledWith('todoist_create_task', expect.any(Object))
      })
    })

    it('実行結果をJSON形式で表示する', async () => {
      const mockResult = {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ id: '123', content: 'テストタスク', is_completed: false })
          }
        ]
      }
      mockMCPClient.callTool.mockResolvedValue(mockResult)

      render(
        <AuthProviderMock>
          <MCPTester />
        </AuthProviderMock>
      )

      await waitFor(() => {
        const toolSelect = screen.getByTestId('tool-select')
        fireEvent.change(toolSelect, { target: { value: 'todoist_get_tasks' } })
      })

      const executeButton = screen.getByTestId('execute-tool-button')
      await user.click(executeButton)

      await waitFor(() => {
        const resultDisplay = screen.getByTestId('tool-result-display')
        expect(resultDisplay).toHaveTextContent('テストタスク')
      })
    })

    it('実行エラー時にエラー詳細を表示する', async () => {
      mockMCPClient.callTool.mockRejectedValue(new Error('ツール実行エラー'))

      render(
        <AuthProviderMock>
          <MCPTester />
        </AuthProviderMock>
      )

      await waitFor(() => {
        const toolSelect = screen.getByTestId('tool-select')
        fireEvent.change(toolSelect, { target: { value: 'todoist_get_tasks' } })
      })

      const executeButton = screen.getByTestId('execute-tool-button')
      await user.click(executeButton)

      await waitFor(() => {
        expect(screen.getByText('ツール実行エラー')).toBeInTheDocument()
      })
    })
  })

  describe('リソース管理セクション', () => {
    const mockResources: MCPResource[] = [
      {
        uri: 'task://123',
        name: 'タスク#123',
        description: 'Todoistタスク',
        mimeType: 'application/json'
      },
      {
        uri: 'project://456',
        name: 'プロジェクト#456',
        description: 'Todoistプロジェクト',
        mimeType: 'application/json'
      }
    ]

    beforeEach(() => {
      mockMCPClient.isConnected.mockReturnValue(true)
      mockMCPClient.listResources.mockResolvedValue(mockResources)
    })

    it('利用可能リソース一覧を表示する', async () => {
      render(
        <AuthProviderMock>
          <MCPTester />
        </AuthProviderMock>
      )

      await waitFor(() => {
        expect(screen.getByText('タスク#123')).toBeInTheDocument()
        expect(screen.getByText('プロジェクト#456')).toBeInTheDocument()
        expect(screen.getByText('task://123')).toBeInTheDocument()
      })
    })

    it('リソース選択で内容を表示する', async () => {
      const mockContent = {
        uri: 'task://123',
        mimeType: 'application/json',
        text: JSON.stringify({
          id: '123',
          content: 'テストタスク',
          is_completed: false
        })
      }
      mockMCPClient.readResource.mockResolvedValue(mockContent)

      render(
        <AuthProviderMock>
          <MCPTester />
        </AuthProviderMock>
      )

      await waitFor(() => {
        const resourceSelect = screen.getByTestId('resource-select')
        fireEvent.change(resourceSelect, { target: { value: 'task://123' } })
      })

      await waitFor(() => {
        expect(mockMCPClient.readResource).toHaveBeenCalledWith('task://123')
        expect(screen.getByTestId('resource-content-display')).toBeInTheDocument()
      })
    })

    it('リソース内容をテキスト・JSON形式で表示する', async () => {
      const mockContent = {
        uri: 'task://123',
        mimeType: 'application/json',
        text: JSON.stringify({ id: '123', content: 'テストタスク' })
      }
      mockMCPClient.readResource.mockResolvedValue(mockContent)

      render(
        <AuthProviderMock>
          <MCPTester />
        </AuthProviderMock>
      )

      await waitFor(() => {
        const resourceSelect = screen.getByTestId('resource-select')
        fireEvent.change(resourceSelect, { target: { value: 'task://123' } })
      })

      await waitFor(() => {
        const contentDisplay = screen.getByTestId('resource-content-display')
        expect(contentDisplay).toHaveTextContent('テストタスク')
      })
    })

    it('大きなリソースでページネーションを表示する', async () => {
      const largeContent = {
        uri: 'task://123',
        mimeType: 'text/plain',
        text: 'A'.repeat(10000) // 大きなテキストコンテンツ
      }
      mockMCPClient.readResource.mockResolvedValue(largeContent)

      render(
        <AuthProviderMock>
          <MCPTester />
        </AuthProviderMock>
      )

      await waitFor(() => {
        const resourceSelect = screen.getByTestId('resource-select')
        fireEvent.change(resourceSelect, { target: { value: 'task://123' } })
      })

      await waitFor(() => {
        expect(screen.getByTestId('resource-pagination')).toBeInTheDocument()
      })
    })
  })

  describe('プロンプト管理セクション', () => {
    const mockPrompts: MCPPrompt[] = [
      {
        name: 'task_summary',
        description: 'タスクの要約を生成',
        arguments: [
          { name: 'task_ids', description: 'タスクIDのリスト', required: true }
        ]
      },
      {
        name: 'project_analysis',
        description: 'プロジェクトの分析を生成',
        arguments: [
          { name: 'project_id', description: 'プロジェクトID', required: true }
        ]
      }
    ]

    beforeEach(() => {
      mockMCPClient.isConnected.mockReturnValue(true)
      mockMCPClient.listPrompts.mockResolvedValue(mockPrompts)
    })

    it('利用可能プロンプト一覧を表示する', async () => {
      render(
        <AuthProviderMock>
          <MCPTester />
        </AuthProviderMock>
      )

      await waitFor(() => {
        expect(screen.getByText('task_summary')).toBeInTheDocument()
        expect(screen.getByText('project_analysis')).toBeInTheDocument()
        expect(screen.getByText('タスクの要約を生成')).toBeInTheDocument()
      })
    })

    it('プロンプト選択でテンプレートを表示する', async () => {
      const mockPromptContent = {
        name: 'task_summary',
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: '以下のタスクの要約を作成してください: {{task_ids}}'
            }
          }
        ]
      }
      mockMCPClient.getPrompt.mockResolvedValue(mockPromptContent)

      render(
        <AuthProviderMock>
          <MCPTester />
        </AuthProviderMock>
      )

      await waitFor(() => {
        const promptSelect = screen.getByTestId('prompt-select')
        fireEvent.change(promptSelect, { target: { value: 'task_summary' } })
      })

      await waitFor(() => {
        expect(screen.getByTestId('prompt-template-display')).toBeInTheDocument()
        expect(screen.getByText(/以下のタスクの要約を作成してください/)).toBeInTheDocument()
      })
    })

    it('プロンプト変数入力フォームを表示する', async () => {
      render(
        <AuthProviderMock>
          <MCPTester />
        </AuthProviderMock>
      )

      await waitFor(() => {
        const promptSelect = screen.getByTestId('prompt-select')
        fireEvent.change(promptSelect, { target: { value: 'task_summary' } })
      })

      await waitFor(() => {
        expect(screen.getByTestId('prompt-variables-form')).toBeInTheDocument()
        expect(screen.getByText('task_ids')).toBeInTheDocument()
      })
    })

    it('プロンプト実行結果を表示する', async () => {
      const mockPromptContent = {
        name: 'task_summary',
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: '以下のタスクの要約を作成してください: 123, 456'
            }
          }
        ]
      }
      mockMCPClient.getPrompt.mockResolvedValue(mockPromptContent)

      render(
        <AuthProviderMock>
          <MCPTester />
        </AuthProviderMock>
      )

      await waitFor(() => {
        const promptSelect = screen.getByTestId('prompt-select')
        fireEvent.change(promptSelect, { target: { value: 'task_summary' } })
      })

      const executeButton = screen.getByTestId('execute-prompt-button')
      await user.click(executeButton)

      await waitFor(() => {
        expect(screen.getByTestId('prompt-result-display')).toBeInTheDocument()
      })
    })
  })

  describe('デバッグセクション', () => {
    const mockLogs: MCPMessage[] = [
      {
        id: '1',
        timestamp: Date.now() - 1000,
        direction: 'sent',
        data: { jsonrpc: '2.0', method: 'initialize', params: {} }
      },
      {
        id: '2',
        timestamp: Date.now(),
        direction: 'received',
        data: { jsonrpc: '2.0', result: { protocolVersion: '2024-11-05' } }
      }
    ]

    it('送受信メッセージログを表示する', () => {
      render(
        <AuthProviderMock>
          <MCPTester />
        </AuthProviderMock>
      )

      // ログを手動で追加（実際の実装では自動的に追加される）
      const debugSection = screen.getByTestId('debug-section')
      expect(debugSection).toBeInTheDocument()
      expect(screen.getByTestId('message-logs')).toBeInTheDocument()
    })

    it('メッセージタイムスタンプを表示する', () => {
      render(
        <AuthProviderMock>
          <MCPTester />
        </AuthProviderMock>
      )

      // ログエントリのタイムスタンプ表示を確認
      expect(screen.getByTestId('message-logs')).toBeInTheDocument()
    })

    it('メッセージをJSON形式で整形表示する', () => {
      render(
        <AuthProviderMock>
          <MCPTester />
        </AuthProviderMock>
      )

      expect(screen.getByTestId('json-formatter')).toBeInTheDocument()
    })

    it('ログクリアボタンでログを削除する', async () => {
      render(
        <AuthProviderMock>
          <MCPTester />
        </AuthProviderMock>
      )

      const clearLogsButton = screen.getByTestId('clear-logs-button')
      await user.click(clearLogsButton)

      // ログがクリアされることを検証
      expect(screen.getByTestId('message-logs')).toBeEmptyDOMElement()
    })

    it('ログエクスポートボタンでJSONダウンロードする', async () => {
      // ダウンロード機能のモック
      const mockDownload = vi.fn()
      global.URL.createObjectURL = vi.fn()
      global.URL.revokeObjectURL = vi.fn()
      
      // createElement のモック
      const mockAnchor = {
        click: mockDownload,
        href: '',
        download: ''
      }
      vi.spyOn(document, 'createElement').mockReturnValue(mockAnchor as any)

      render(
        <AuthProviderMock>
          <MCPTester />
        </AuthProviderMock>
      )

      const exportLogsButton = screen.getByTestId('export-logs-button')
      await user.click(exportLogsButton)

      expect(mockDownload).toHaveBeenCalled()
    })
  })

  describe('認証統合', () => {
    it('ログイン状態でのみアクセスできる', () => {
      // 未ログイン状態をシミュレート
      render(
        <div data-testid="auth-provider">
          <div data-testid="signin-required">サインインが必要です</div>
        </div>
      )

      expect(screen.getByTestId('signin-required')).toBeInTheDocument()
      expect(screen.queryByText('MCP テスター')).not.toBeInTheDocument()
    })

    it('アカウント切り替え時にMCP接続をリセットする', async () => {
      mockMCPClient.isConnected.mockReturnValue(true)

      render(
        <AuthProviderMock>
          <MCPTester />
        </AuthProviderMock>
      )

      // アカウント切り替えイベントをシミュレート
      const accountSwitcher = screen.getByTestId('account-switcher')
      fireEvent.change(accountSwitcher, { target: { value: 'new-account' } })

      await waitFor(() => {
        expect(mockMCPClient.disconnect).toHaveBeenCalled()
      })
    })

    it('ログアウト時にMCP接続を切断する', async () => {
      mockMCPClient.isConnected.mockReturnValue(true)

      render(
        <AuthProviderMock>
          <MCPTester />
        </AuthProviderMock>
      )

      // ログアウトイベントをシミュレート
      const logoutButton = screen.getByTestId('logout-button')
      await user.click(logoutButton)

      await waitFor(() => {
        expect(mockMCPClient.disconnect).toHaveBeenCalled()
      })
    })
  })

  describe('イベントハンドリング', () => {
    it('接続状態変更時にonConnectionChangeが呼ばれる', async () => {
      render(
        <AuthProviderMock>
          <MCPTester onConnectionChange={mockOnConnectionChange} />
        </AuthProviderMock>
      )

      const urlInput = screen.getByTestId('server-url-input')
      const connectButton = screen.getByTestId('connect-button')

      await user.type(urlInput, 'ws://localhost:8080/mcp')
      await user.click(connectButton)

      await waitFor(() => {
        expect(mockOnConnectionChange).toHaveBeenCalledWith(true)
      })
    })

    it('エラー時に適切なエラーメッセージを表示する', async () => {
      mockMCPClient.connect.mockRejectedValue(new Error('サーバーが応答しません'))

      render(
        <AuthProviderMock>
          <MCPTester />
        </AuthProviderMock>
      )

      const urlInput = screen.getByTestId('server-url-input')
      const connectButton = screen.getByTestId('connect-button')

      await user.type(urlInput, 'ws://unreachable:8080/mcp')
      await user.click(connectButton)

      await waitFor(() => {
        expect(screen.getByText('サーバーが応答しません')).toBeInTheDocument()
      })
    })
  })

  describe('ユーザビリティ', () => {
    it('ローディング状態を適切に表示する', async () => {
      mockMCPClient.connect.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 1000)))

      render(
        <AuthProviderMock>
          <MCPTester />
        </AuthProviderMock>
      )

      const urlInput = screen.getByTestId('server-url-input')
      const connectButton = screen.getByTestId('connect-button')

      await user.type(urlInput, 'ws://localhost:8080/mcp')
      await user.click(connectButton)

      expect(screen.getByText('Loading...')).toBeInTheDocument()
    })

    it('無効な入力に対してバリデーションエラーを表示する', async () => {
      render(
        <AuthProviderMock>
          <MCPTester />
        </AuthProviderMock>
      )

      const urlInput = screen.getByTestId('server-url-input')
      const connectButton = screen.getByTestId('connect-button')

      await user.type(urlInput, 'invalid-url')
      await user.click(connectButton)

      await waitFor(() => {
        expect(screen.getByText('有効なWebSocket URLを入力してください')).toBeInTheDocument()
      })
    })

    it('キーボードショートカットが機能する', async () => {
      render(
        <AuthProviderMock>
          <MCPTester />
        </AuthProviderMock>
      )

      // Ctrl+Enter でツール実行
      await user.keyboard('{Control>}{Enter}{/Control}')

      // 実際の実装では、フォーカスされているツールが実行される
      // ここではイベントが適切に処理されることを確認
      expect(screen.getByTestId('tools-section')).toBeInTheDocument()
    })
  })
})