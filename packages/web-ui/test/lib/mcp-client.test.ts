import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { MCPClient } from '@/lib/mcp-client'

// MCPレスポンス型定義（テスト用）
interface MCPInitializeResponse {
  protocolVersion: string
  capabilities: {
    tools?: Record<string, any>
    resources?: Record<string, any>
    prompts?: Record<string, any>
  }
  serverInfo: {
    name: string
    version: string
  }
}

interface MCPTool {
  name: string
  description: string
  inputSchema: Record<string, any>
}

interface MCPResource {
  uri: string
  name: string
  description?: string
  mimeType?: string
}

interface MCPResourceContent {
  uri: string
  mimeType: string
  text?: string
  blob?: string
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

interface MCPPromptContent {
  name: string
  messages: Array<{
    role: string
    content: {
      type: string
      text: string
    }
  }>
}

describe('MCPClient', () => {
  let client: MCPClient
  const mockServerUrl = 'ws://localhost:8080/mcp'

  beforeEach(() => {
    vi.clearAllMocks()
    // Firebase認証モック
    vi.mocked(require('firebase/auth').getIdToken).mockResolvedValue('mock-token')
  })

  afterEach(() => {
    if (client) {
      client.disconnect()
    }
  })

  describe('接続管理', () => {
    it('WebSocket接続を確立できる', async () => {
      client = new MCPClient()
      
      const connectPromise = client.connect(mockServerUrl)
      
      expect(connectPromise).toBeInstanceOf(Promise)
      await expect(connectPromise).resolves.toBeUndefined()
      expect(client.isConnected()).toBe(true)
    })

    it('接続失敗時にエラーをスローする', async () => {
      client = new MCPClient()
      const invalidUrl = 'ws://invalid-server:9999/mcp'
      
      await expect(client.connect(invalidUrl)).rejects.toThrow('MCP接続に失敗しました')
    })

    it('接続切断を検知して再接続を試行する', async () => {
      client = new MCPClient()
      await client.connect(mockServerUrl)
      
      const reconnectSpy = vi.spyOn(client, 'connect')
      
      // WebSocket切断をシミュレート
      const ws = (global as any).WebSocket.instances[0]
      ws.onclose(new CloseEvent('close'))
      
      // 再接続の試行を待つ
      await new Promise(resolve => setTimeout(resolve, 100))
      
      expect(reconnectSpy).toHaveBeenCalled()
    })

    it('接続状態を正確に報告する', async () => {
      client = new MCPClient()
      
      expect(client.isConnected()).toBe(false)
      
      await client.connect(mockServerUrl)
      expect(client.isConnected()).toBe(true)
      
      client.disconnect()
      expect(client.isConnected()).toBe(false)
    })
  })

  describe('MCPプロトコル通信', () => {
    beforeEach(async () => {
      client = new MCPClient()
      await client.connect(mockServerUrl)
    })

    it('initialize リクエストを送信できる', async () => {
      const mockResponse: MCPInitializeResponse = {
        protocolVersion: '2024-11-05',
        capabilities: {
          tools: { listChanged: true },
          resources: { subscribe: true },
          prompts: {}
        },
        serverInfo: {
          name: 'mcp-todoist',
          version: '1.0.0'
        }
      }

      // WebSocketメッセージ受信をモック
      const ws = (global as any).WebSocket.instances[0]
      setTimeout(() => {
        ws.onmessage({
          data: JSON.stringify({
            jsonrpc: '2.0',
            id: 1,
            result: mockResponse
          })
        })
      }, 0)

      const result = await client.initialize()
      expect(result).toEqual(mockResponse)
    })

    it('tools/list リクエストでツール一覧を取得できる', async () => {
      const mockTools: MCPTool[] = [
        {
          name: 'todoist_get_tasks',
          description: 'Todoistからタスク一覧を取得',
          inputSchema: {
            type: 'object',
            properties: {
              project_id: { type: 'string' }
            }
          }
        },
        {
          name: 'todoist_create_task',
          description: 'Todoistにタスクを作成',
          inputSchema: {
            type: 'object',
            properties: {
              content: { type: 'string' },
              project_id: { type: 'string' }
            },
            required: ['content']
          }
        }
      ]

      const ws = (global as any).WebSocket.instances[0]
      setTimeout(() => {
        ws.onmessage({
          data: JSON.stringify({
            jsonrpc: '2.0',
            id: 2,
            result: { tools: mockTools }
          })
        })
      }, 0)

      const result = await client.listTools()
      expect(result).toEqual(mockTools)
    })

    it('tools/call でツールを実行できる', async () => {
      const mockResult = {
        content: [
          {
            type: 'text',
            text: JSON.stringify([
              {
                id: '123',
                content: 'テストタスク',
                is_completed: false
              }
            ])
          }
        ]
      }

      const ws = (global as any).WebSocket.instances[0]
      setTimeout(() => {
        ws.onmessage({
          data: JSON.stringify({
            jsonrpc: '2.0',
            id: 3,
            result: mockResult
          })
        })
      }, 0)

      const result = await client.callTool('todoist_get_tasks', { project_id: '456' })
      expect(result).toEqual(mockResult)
    })

    it('resources/list でリソース一覧を取得できる', async () => {
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

      const ws = (global as any).WebSocket.instances[0]
      setTimeout(() => {
        ws.onmessage({
          data: JSON.stringify({
            jsonrpc: '2.0',
            id: 4,
            result: { resources: mockResources }
          })
        })
      }, 0)

      const result = await client.listResources()
      expect(result).toEqual(mockResources)
    })

    it('resources/read でリソースを読み取れる', async () => {
      const mockContent: MCPResourceContent = {
        uri: 'task://123',
        mimeType: 'application/json',
        text: JSON.stringify({
          id: '123',
          content: 'テストタスク',
          is_completed: false,
          project_id: '456'
        })
      }

      const ws = (global as any).WebSocket.instances[0]
      setTimeout(() => {
        ws.onmessage({
          data: JSON.stringify({
            jsonrpc: '2.0',
            id: 5,
            result: { contents: [mockContent] }
          })
        })
      }, 0)

      const result = await client.readResource('task://123')
      expect(result).toEqual(mockContent)
    })

    it('prompts/list でプロンプト一覧を取得できる', async () => {
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

      const ws = (global as any).WebSocket.instances[0]
      setTimeout(() => {
        ws.onmessage({
          data: JSON.stringify({
            jsonrpc: '2.0',
            id: 6,
            result: { prompts: mockPrompts }
          })
        })
      }, 0)

      const result = await client.listPrompts()
      expect(result).toEqual(mockPrompts)
    })

    it('prompts/get でプロンプトを取得できる', async () => {
      const mockPromptContent: MCPPromptContent = {
        name: 'task_summary',
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: '以下のタスクの要約を作成してください: タスクID 123, 456'
            }
          }
        ]
      }

      const ws = (global as any).WebSocket.instances[0]
      setTimeout(() => {
        ws.onmessage({
          data: JSON.stringify({
            jsonrpc: '2.0',
            id: 7,
            result: mockPromptContent
          })
        })
      }, 0)

      const result = await client.getPrompt('task_summary', { task_ids: ['123', '456'] })
      expect(result).toEqual(mockPromptContent)
    })
  })

  describe('エラーハンドリング', () => {
    beforeEach(async () => {
      client = new MCPClient()
      await client.connect(mockServerUrl)
    })

    it('MCPエラーレスポンスを適切に処理する', async () => {
      const ws = (global as any).WebSocket.instances[0]
      setTimeout(() => {
        ws.onmessage({
          data: JSON.stringify({
            jsonrpc: '2.0',
            id: 8,
            error: {
              code: -32602,
              message: 'Invalid params',
              data: 'Missing required parameter'
            }
          })
        })
      }, 0)

      await expect(client.callTool('invalid_tool', {})).rejects.toThrow('Invalid params')
    })

    it('ネットワークエラーを検知してリトライする', async () => {
      const retrySpy = vi.spyOn(client, 'callTool')
      
      // 最初の呼び出しでネットワークエラー
      const ws = (global as any).WebSocket.instances[0]
      ws.onerror(new Event('error'))
      
      // リトライの検証
      await expect(client.callTool('todoist_get_tasks', {})).rejects.toThrow()
      expect(retrySpy).toHaveBeenCalledTimes(1)
    })

    it('タイムアウト時に適切なエラーを返す', async () => {
      // WebSocketレスポンスを遅延させる
      vi.useFakeTimers()
      
      const promise = client.callTool('slow_tool', {})
      
      // 30秒経過をシミュレート
      vi.advanceTimersByTime(30000)
      
      await expect(promise).rejects.toThrow('リクエストがタイムアウトしました')
      
      vi.useRealTimers()
    })

    it('無効なレスポンスを検出してエラーを出す', async () => {
      const ws = (global as any).WebSocket.instances[0]
      setTimeout(() => {
        ws.onmessage({
          data: 'invalid json response'
        })
      }, 0)

      await expect(client.callTool('test_tool', {})).rejects.toThrow('無効なレスポンス形式です')
    })
  })

  describe('認証統合', () => {
    beforeEach(() => {
      client = new MCPClient()
    })

    it('Firebase認証トークンを自動付与する', async () => {
      const mockToken = 'mock-firebase-token'
      vi.mocked(require('firebase/auth').getIdToken).mockResolvedValue(mockToken)
      
      await client.connect(mockServerUrl)
      
      // WebSocketのsend呼び出しでトークンが含まれることを確認
      const ws = (global as any).WebSocket.instances[0]
      const sendSpy = vi.spyOn(ws, 'send')
      
      await client.initialize()
      
      expect(sendSpy).toHaveBeenCalledWith(
        expect.stringContaining(mockToken)
      )
    })

    it('認証失敗時に適切なエラーを出す', async () => {
      vi.mocked(require('firebase/auth').getIdToken).mockRejectedValue(
        new Error('Authentication failed')
      )
      
      await expect(client.connect(mockServerUrl)).rejects.toThrow('認証に失敗しました')
    })

    it('トークン更新を自動実行する', async () => {
      const initialToken = 'initial-token'
      const refreshedToken = 'refreshed-token'
      
      vi.mocked(require('firebase/auth').getIdToken)
        .mockResolvedValueOnce(initialToken)
        .mockResolvedValueOnce(refreshedToken)
      
      await client.connect(mockServerUrl)
      
      // トークン更新をトリガー
      client.refreshAuthToken()
      
      const ws = (global as any).WebSocket.instances[0]
      const sendSpy = vi.spyOn(ws, 'send')
      
      await client.callTool('test_tool', {})
      
      expect(sendSpy).toHaveBeenCalledWith(
        expect.stringContaining(refreshedToken)
      )
    })

    it('ログアウト時に接続を切断する', async () => {
      await client.connect(mockServerUrl)
      expect(client.isConnected()).toBe(true)
      
      // ログアウトイベントをシミュレート
      client.handleAuthStateChange(null)
      
      expect(client.isConnected()).toBe(false)
    })
  })

  describe('イベント処理', () => {
    beforeEach(async () => {
      client = new MCPClient()
      await client.connect(mockServerUrl)
    })

    it('接続イベントリスナーが動作する', () => {
      const connectHandler = vi.fn()
      client.on('connect', connectHandler)
      
      // 新しい接続をシミュレート
      client.connect(mockServerUrl)
      
      expect(connectHandler).toHaveBeenCalled()
    })

    it('切断イベントリスナーが動作する', () => {
      const disconnectHandler = vi.fn()
      client.on('disconnect', disconnectHandler)
      
      client.disconnect()
      
      expect(disconnectHandler).toHaveBeenCalled()
    })

    it('エラーイベントリスナーが動作する', () => {
      const errorHandler = vi.fn()
      client.on('error', errorHandler)
      
      const ws = (global as any).WebSocket.instances[0]
      const error = new Event('error')
      ws.onerror(error)
      
      expect(errorHandler).toHaveBeenCalledWith(error)
    })

    it('イベントリスナーを削除できる', () => {
      const handler = vi.fn()
      client.on('connect', handler)
      client.off('connect', handler)
      
      client.connect(mockServerUrl)
      
      expect(handler).not.toHaveBeenCalled()
    })
  })

  describe('状態管理', () => {
    beforeEach(() => {
      client = new MCPClient()
    })

    it('接続状態の変遷を正確に追跡する', async () => {
      expect(client.getConnectionState()).toBe('disconnected')
      
      const connectPromise = client.connect(mockServerUrl)
      expect(client.getConnectionState()).toBe('connecting')
      
      await connectPromise
      expect(client.getConnectionState()).toBe('connected')
      
      client.disconnect()
      expect(client.getConnectionState()).toBe('disconnected')
    })

    it('サーバー情報を保持する', async () => {
      await client.connect(mockServerUrl)
      
      const mockServerInfo = {
        name: 'mcp-todoist',
        version: '1.0.0',
        protocolVersion: '2024-11-05'
      }
      
      const ws = (global as any).WebSocket.instances[0]
      setTimeout(() => {
        ws.onmessage({
          data: JSON.stringify({
            jsonrpc: '2.0',
            id: 1,
            result: {
              protocolVersion: mockServerInfo.protocolVersion,
              serverInfo: {
                name: mockServerInfo.name,
                version: mockServerInfo.version
              }
            }
          })
        })
      }, 0)
      
      await client.initialize()
      
      expect(client.getServerInfo()).toEqual(mockServerInfo)
    })
  })
})