import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { MCPClient } from '@/lib/mcp/client'
// Firebase mockはsetup.tsで設定済みなので、import文で取得
import { getIdToken } from 'firebase/auth'
import { auth } from '@/lib/config/firebase'

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
    const mockGetIdToken = vi.fn().mockResolvedValue('mock-token')
    vi.doMock('firebase/auth', () => ({
      getIdToken: mockGetIdToken
    }))
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
          tools: {},
          resources: {},
          prompts: {}
        },
        serverInfo: {
          name: 'mcp-todoist',
          version: '1.0.0'
        }
      }

      const ws = (global as any).WebSocket.instances[0]
      
      // レスポンスを非同期で送信
      const responsePromise = new Promise<void>((resolve) => {
        setTimeout(() => {
          ws.simulateMessage(JSON.stringify({
            jsonrpc: '2.0',
            id: 1,
            result: mockResponse
          }))
          resolve()
        }, 10)
      })

      const initPromise = client.initialize()
      await responsePromise
      const result = await initPromise
      
      expect(result.serverInfo).toEqual(mockResponse.serverInfo)
    })

    it('tools/list リクエストでツール一覧を取得できる', async () => {
      const mockTools: MCPTool[] = [
        {
          name: 'todoist_get_tasks',
          description: 'Get tasks from Todoist',
          inputSchema: {
            type: 'object',
            properties: {
              project_id: { type: 'string' }
            }
          }
        },
        {
          name: 'todoist_create_task',
          description: 'Create a new task in Todoist',
          inputSchema: {
            type: 'object',
            properties: {
              content: { type: 'string' },
              project_id: { type: 'string' }
            }
          }
        }
      ]

      const ws = (global as any).WebSocket.instances[0]
      
      const responsePromise = new Promise<void>((resolve) => {
        setTimeout(() => {
          ws.simulateMessage(JSON.stringify({
            jsonrpc: '2.0',
            id: 2,
            result: { tools: mockTools }
          }))
          resolve()
        }, 10)
      })

      const toolsPromise = client.listTools()
      await responsePromise
      const result = await toolsPromise
      
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
      
      const responsePromise = new Promise<void>((resolve) => {
        setTimeout(() => {
          ws.simulateMessage(JSON.stringify({
            jsonrpc: '2.0',
            id: 3,
            result: mockResult
          }))
          resolve()
        }, 10)
      })

      const callPromise = client.callTool('todoist_get_tasks', { project_id: '456' })
      await responsePromise
      const result = await callPromise
      
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
      
      const responsePromise = new Promise<void>((resolve) => {
        setTimeout(() => {
          ws.simulateMessage(JSON.stringify({
            jsonrpc: '2.0',
            id: 4,
            result: { resources: mockResources }
          }))
          resolve()
        }, 10)
      })

      const resourcesPromise = client.listResources()
      await responsePromise
      const result = await resourcesPromise
      
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
      
      const responsePromise = new Promise<void>((resolve) => {
        setTimeout(() => {
          ws.simulateMessage(JSON.stringify({
            jsonrpc: '2.0',
            id: 5,
            result: { contents: [mockContent] }
          }))
          resolve()
        }, 10)
      })

      const readPromise = client.readResource('task://123')
      await responsePromise
      const result = await readPromise
      
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
      
      const responsePromise = new Promise<void>((resolve) => {
        setTimeout(() => {
          ws.simulateMessage(JSON.stringify({
            jsonrpc: '2.0',
            id: 6,
            result: { prompts: mockPrompts }
          }))
          resolve()
        }, 10)
      })

      const promptsPromise = client.listPrompts()
      await responsePromise
      const result = await promptsPromise
      
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
      
      const responsePromise = new Promise<void>((resolve) => {
        setTimeout(() => {
          ws.simulateMessage(JSON.stringify({
            jsonrpc: '2.0',
            id: 7,
            result: mockPromptContent
          }))
          resolve()
        }, 10)
      })

      const promptPromise = client.getPrompt('task_summary', { task_ids: ['123', '456'] })
      await responsePromise
      const result = await promptPromise
      
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
      
      const errorPromise = new Promise<void>((resolve) => {
        setTimeout(() => {
          ws.simulateMessage(JSON.stringify({
            jsonrpc: '2.0',
            id: 8,
            error: {
              code: -32602,
              message: 'Invalid params',
              data: 'Missing required parameter'
            }
          }))
          resolve()
        }, 10)
      })

      const callPromise = client.callTool('invalid_tool', {})
      await errorPromise
      
      await expect(callPromise).rejects.toThrow('Invalid params')
    })

    it('ネットワークエラーを検知してリトライする', async () => {
      // 新しいクライアントで接続失敗をテスト
      const failingClient = new MCPClient()
      
      // WebSocketの接続を強制的に失敗させる
      const originalWebSocket = global.WebSocket
      global.WebSocket = class extends originalWebSocket {
        constructor(url: string) {
          super(url)
          // 接続後すぐにエラーを発生
          setTimeout(() => {
            this.onerror?.(new Event('error'))
            this.onclose?.(new CloseEvent('close', { code: 1006, reason: 'Network error' }))
          }, 5)
        }
      } as any
      
      await expect(failingClient.connect(mockServerUrl)).rejects.toThrow()
      
      // WebSocketを元に戻す
      global.WebSocket = originalWebSocket
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
      
      const invalidResponsePromise = new Promise<void>((resolve) => {
        setTimeout(() => {
          // 無効なJSONを送信
          ws.simulateMessage('invalid json response')
          resolve()
        }, 10)
      })

      const callPromise = client.callTool('test_tool', {})
      await invalidResponsePromise
      
      await expect(callPromise).rejects.toThrow()
    })
  })

  describe('認証統合', () => {
    beforeEach(() => {
      client = new MCPClient()
      // mockをリセット
      vi.clearAllMocks()
    })

    it('Firebase認証トークンを自動付与する', async () => {
      const mockToken = 'mock-firebase-token'
      // setup.tsで設定されたmockを使用
      vi.mocked(getIdToken).mockResolvedValue(mockToken)
      
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
      vi.mocked(getIdToken).mockRejectedValue(
        new Error('Authentication failed')
      )
      
      await expect(client.connect(mockServerUrl)).rejects.toThrow('認証に失敗しました')
    })

    it('トークン更新を自動実行する', async () => {
      const initialToken = 'initial-token'
      const refreshedToken = 'refreshed-token'
      
      vi.mocked(getIdToken)
        .mockResolvedValueOnce(initialToken)
        .mockResolvedValueOnce(refreshedToken)
      
      await client.connect(mockServerUrl)
      
      // トークン更新をトリガー
      await client.refreshAuthToken()
      
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

    it('接続イベントリスナーが動作する', async () => {
      const connectHandler = vi.fn()
      const newClient = new MCPClient()
      newClient.on('connect', connectHandler)
      
      // 新しい接続をシミュレート
      await newClient.connect(mockServerUrl)
      
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
      ws.simulateError(error)
      
      expect(errorHandler).toHaveBeenCalledWith(expect.any(Event))
    })

    it('イベントリスナーを削除できる', async () => {
      const handler = vi.fn()
      const newClient = new MCPClient()
      newClient.on('connect', handler)
      newClient.off('connect', handler)
      
      await newClient.connect(mockServerUrl)
      
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