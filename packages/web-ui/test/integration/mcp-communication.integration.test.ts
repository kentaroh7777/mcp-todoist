import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { MCPClient } from '@/lib/mcp-client'
import { TodoistClient } from '@/lib/todoist/client'

// 統合テスト用の型定義
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

interface TodoistTask {
  id: string
  content: string
  is_completed: boolean
  project_id: string
  created_at: string
  updated_at?: string
}

interface TodoistProject {
  id: string
  name: string
  color: string
  is_shared: boolean
  is_favorite: boolean
}

// WebSocketサーバーモック
class MockMCPServer {
  private clients: WebSocket[] = []
  private handlers: Map<string, (params: any) => any> = new Map()

  constructor() {
    this.setupDefaultHandlers()
  }

  private setupDefaultHandlers() {
    this.handlers.set('initialize', () => ({
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
    }))

    this.handlers.set('tools/list', () => ({
      tools: [
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
        },
        {
          name: 'todoist_update_task',
          description: 'Todoistのタスクを更新',
          inputSchema: {
            type: 'object',
            properties: {
              task_id: { type: 'string' },
              content: { type: 'string' },
              is_completed: { type: 'boolean' }
            },
            required: ['task_id']
          }
        },
        {
          name: 'todoist_delete_task',
          description: 'Todoistのタスクを削除',
          inputSchema: {
            type: 'object',
            properties: {
              task_id: { type: 'string' }
            },
            required: ['task_id']
          }
        },
        {
          name: 'todoist_get_projects',
          description: 'Todoistからプロジェクト一覧を取得',
          inputSchema: {
            type: 'object',
            properties: {}
          }
        }
      ]
    }))

    this.handlers.set('resources/list', () => ({
      resources: [
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
    }))

    this.handlers.set('prompts/list', () => ({
      prompts: [
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
    }))
  }

  setHandler(method: string, handler: (params: any) => any) {
    this.handlers.set(method, handler)
  }

  simulateMessage(client: WebSocket, message: any) {
    const response: any = {
      jsonrpc: '2.0',
      id: message.id
    }

    const handler = this.handlers.get(message.method)
    if (handler) {
      try {
        response.result = handler(message.params)
      } catch (error) {
        response.error = {
          code: -32603,
          message: error instanceof Error ? error.message : 'Internal error'
        }
      }
    } else {
      response.error = {
        code: -32601,
        message: 'Method not found'
      }
    }

    setTimeout(() => {
      client.onmessage?.({ data: JSON.stringify(response) } as MessageEvent)
    }, 0)
  }
}

describe('MCP通信統合', () => {
  let client: MCPClient
  let mockServer: MockMCPServer
  const mockServerUrl = 'ws://localhost:8080/mcp'

  beforeEach(() => {
    vi.clearAllMocks()
    mockServer = new MockMCPServer()
    
    // Firebase認証モック
    vi.mocked(require('firebase/auth').getIdToken).mockResolvedValue('mock-auth-token')
    
    // WebSocketモックの拡張
    const originalWebSocket = global.WebSocket
    ;(global as any).WebSocket = class extends originalWebSocket {
      constructor(url: string) {
        super(url)
        setTimeout(() => {
          this.readyState = 1
          this.onopen?.(new Event('open'))
        }, 0)
      }

      send(data: string) {
        try {
          const message = JSON.parse(data)
          mockServer.simulateMessage(this, message)
        } catch (error) {
          this.onerror?.(new Event('error'))
        }
      }
    }
  })

  afterEach(() => {
    if (client) {
      client.disconnect()
    }
  })

  describe('初期化フロー', () => {
    it('WebSocket接続→initialize→ツール一覧取得の流れが動作する', async () => {
      client = new MCPClient()
      
      // 1. WebSocket接続
      await client.connect(mockServerUrl)
      expect(client.isConnected()).toBe(true)
      
      // 2. MCPプロトコル初期化
      const initResult = await client.initialize()
      expect(initResult.protocolVersion).toBe('2024-11-05')
      expect(initResult.serverInfo.name).toBe('mcp-todoist')
      
      // 3. ツール一覧取得
      const tools = await client.listTools()
      expect(tools).toHaveLength(5)
      expect(tools.map(t => t.name)).toEqual([
        'todoist_get_tasks',
        'todoist_create_task',
        'todoist_update_task',
        'todoist_delete_task',
        'todoist_get_projects'
      ])
    })

    it('サーバーエラー時に適切なフォールバック処理をする', async () => {
      // エラーレスポンスを返すハンドラーを設定
      mockServer.setHandler('initialize', () => {
        throw new Error('サーバー初期化エラー')
      })

      client = new MCPClient()
      await client.connect(mockServerUrl)

      await expect(client.initialize()).rejects.toThrow('サーバー初期化エラー')
      
      // フォールバック処理の確認（再接続を試行）
      expect(client.getConnectionState()).toBe('connected')
    })

    it('ネットワーク切断時に自動再接続を試行する', async () => {
      client = new MCPClient()
      await client.connect(mockServerUrl)
      
      const reconnectSpy = vi.spyOn(client, 'connect')
      
      // WebSocket切断をシミュレート
      const ws = (client as any).websocket
      ws.readyState = 3
      ws.onclose?.(new CloseEvent('close'))
      
      // 再接続の試行を待つ
      await new Promise(resolve => setTimeout(resolve, 100))
      
      expect(reconnectSpy).toHaveBeenCalled()
    })
  })

  describe('Todoistツール統合', () => {
    beforeEach(async () => {
      client = new MCPClient()
      await client.connect(mockServerUrl)
      await client.initialize()
    })

    it('todoist_get_tasks ツールでタスク一覧を取得できる', async () => {
      const mockTasks: TodoistTask[] = [
        {
          id: '123',
          content: 'テストタスク1',
          is_completed: false,
          project_id: '456',
          created_at: '2025-01-01T00:00:00Z'
        },
        {
          id: '124',
          content: 'テストタスク2',
          is_completed: true,
          project_id: '456',
          created_at: '2025-01-01T00:00:00Z'
        }
      ]

      mockServer.setHandler('tools/call', (params) => {
        if (params.name === 'todoist_get_tasks') {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(mockTasks)
              }
            ]
          }
        }
        throw new Error('Unknown tool')
      })

      const result = await client.callTool('todoist_get_tasks', { project_id: '456' })
      const tasks = JSON.parse(result.content[0].text)
      
      expect(tasks).toHaveLength(2)
      expect(tasks[0].content).toBe('テストタスク1')
      expect(tasks[1].is_completed).toBe(true)
    })

    it('todoist_create_task ツールでタスクを作成できる', async () => {
      const newTask: TodoistTask = {
        id: '125',
        content: '新しいタスク',
        is_completed: false,
        project_id: '456',
        created_at: '2025-01-01T00:00:00Z'
      }

      mockServer.setHandler('tools/call', (params) => {
        if (params.name === 'todoist_create_task') {
          expect(params.arguments.content).toBe('新しいタスク')
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(newTask)
              }
            ]
          }
        }
        throw new Error('Unknown tool')
      })

      const result = await client.callTool('todoist_create_task', {
        content: '新しいタスク',
        project_id: '456'
      })
      
      const createdTask = JSON.parse(result.content[0].text)
      expect(createdTask.id).toBe('125')
      expect(createdTask.content).toBe('新しいタスク')
    })

    it('todoist_update_task ツールでタスクを更新できる', async () => {
      const updatedTask: TodoistTask = {
        id: '123',
        content: '更新されたタスク',
        is_completed: true,
        project_id: '456',
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T12:00:00Z'
      }

      mockServer.setHandler('tools/call', (params) => {
        if (params.name === 'todoist_update_task') {
          expect(params.arguments.task_id).toBe('123')
          expect(params.arguments.is_completed).toBe(true)
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(updatedTask)
              }
            ]
          }
        }
        throw new Error('Unknown tool')
      })

      const result = await client.callTool('todoist_update_task', {
        task_id: '123',
        content: '更新されたタスク',
        is_completed: true
      })
      
      const task = JSON.parse(result.content[0].text)
      expect(task.is_completed).toBe(true)
      expect(task.updated_at).toBeDefined()
    })

    it('todoist_delete_task ツールでタスクを削除できる', async () => {
      mockServer.setHandler('tools/call', (params) => {
        if (params.name === 'todoist_delete_task') {
          expect(params.arguments.task_id).toBe('123')
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({ success: true, deleted_task_id: '123' })
              }
            ]
          }
        }
        throw new Error('Unknown tool')
      })

      const result = await client.callTool('todoist_delete_task', { task_id: '123' })
      const response = JSON.parse(result.content[0].text)
      
      expect(response.success).toBe(true)
      expect(response.deleted_task_id).toBe('123')
    })

    it('todoist_get_projects ツールでプロジェクト一覧を取得できる', async () => {
      const mockProjects: TodoistProject[] = [
        {
          id: '456',
          name: 'テストプロジェクト',
          color: 'blue',
          is_shared: false,
          is_favorite: true
        },
        {
          id: '457',
          name: '共有プロジェクト',
          color: 'red',
          is_shared: true,
          is_favorite: false
        }
      ]

      mockServer.setHandler('tools/call', (params) => {
        if (params.name === 'todoist_get_projects') {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(mockProjects)
              }
            ]
          }
        }
        throw new Error('Unknown tool')
      })

      const result = await client.callTool('todoist_get_projects', {})
      const projects = JSON.parse(result.content[0].text)
      
      expect(projects).toHaveLength(2)
      expect(projects[0].name).toBe('テストプロジェクト')
      expect(projects[1].is_shared).toBe(true)
    })
  })

  describe('リソース統合', () => {
    beforeEach(async () => {
      client = new MCPClient()
      await client.connect(mockServerUrl)
      await client.initialize()
    })

    it('task://123 形式でタスクリソースを取得できる', async () => {
      const mockTaskContent = {
        id: '123',
        content: 'テストタスク',
        is_completed: false,
        project_id: '456',
        created_at: '2025-01-01T00:00:00Z'
      }

      mockServer.setHandler('resources/read', (params) => {
        if (params.uri === 'task://123') {
          return {
            contents: [
              {
                uri: 'task://123',
                mimeType: 'application/json',
                text: JSON.stringify(mockTaskContent)
              }
            ]
          }
        }
        throw new Error('Resource not found')
      })

      const result = await client.readResource('task://123')
      const taskData = JSON.parse(result.text || '{}')
      
      expect(result.uri).toBe('task://123')
      expect(result.mimeType).toBe('application/json')
      expect(taskData.content).toBe('テストタスク')
    })

    it('project://456 形式でプロジェクトリソースを取得できる', async () => {
      const mockProjectContent = {
        id: '456',
        name: 'テストプロジェクト',
        color: 'blue',
        task_count: 5,
        completed_task_count: 2
      }

      mockServer.setHandler('resources/read', (params) => {
        if (params.uri === 'project://456') {
          return {
            contents: [
              {
                uri: 'project://456',
                mimeType: 'application/json',
                text: JSON.stringify(mockProjectContent)
              }
            ]
          }
        }
        throw new Error('Resource not found')
      })

      const result = await client.readResource('project://456')
      const projectData = JSON.parse(result.text || '{}')
      
      expect(result.uri).toBe('project://456')
      expect(projectData.name).toBe('テストプロジェクト')
      expect(projectData.task_count).toBe(5)
    })

    it('存在しないリソースで404エラーを取得する', async () => {
      mockServer.setHandler('resources/read', (params) => {
        if (params.uri === 'task://999') {
          const error = new Error('Resource not found')
          ;(error as any).code = 404
          throw error
        }
        throw new Error('Unknown resource')
      })

      await expect(client.readResource('task://999')).rejects.toThrow('Resource not found')
    })
  })

  describe('プロンプト統合', () => {
    beforeEach(async () => {
      client = new MCPClient()
      await client.connect(mockServerUrl)
      await client.initialize()
    })

    it('task_summary プロンプトでタスク要約を生成できる', async () => {
      const mockPromptContent = {
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

      mockServer.setHandler('prompts/get', (params) => {
        if (params.name === 'task_summary') {
          expect(params.arguments.task_ids).toEqual(['123', '456'])
          return mockPromptContent
        }
        throw new Error('Prompt not found')
      })

      const result = await client.getPrompt('task_summary', { task_ids: ['123', '456'] })
      
      expect(result.name).toBe('task_summary')
      expect(result.messages[0].content.text).toContain('タスクID 123, 456')
    })

    it('project_analysis プロンプトでプロジェクト分析を生成できる', async () => {
      const mockPromptContent = {
        name: 'project_analysis',
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: 'プロジェクト456の詳細分析を実行してください'
            }
          }
        ]
      }

      mockServer.setHandler('prompts/get', (params) => {
        if (params.name === 'project_analysis') {
          expect(params.arguments.project_id).toBe('456')
          return mockPromptContent
        }
        throw new Error('Prompt not found')
      })

      const result = await client.getPrompt('project_analysis', { project_id: '456' })
      
      expect(result.name).toBe('project_analysis')
      expect(result.messages[0].content.text).toContain('プロジェクト456')
    })

    it('プロンプト変数を正しく置換する', async () => {
      mockServer.setHandler('prompts/get', (params) => {
        if (params.name === 'task_summary') {
          const taskIds = params.arguments.task_ids.join(', ')
          return {
            name: 'task_summary',
            messages: [
              {
                role: 'user',
                content: {
                  type: 'text',
                  text: `以下のタスクの要約を作成してください: タスクID ${taskIds}`
                }
              }
            ]
          }
        }
        throw new Error('Prompt not found')
      })

      const result = await client.getPrompt('task_summary', { task_ids: ['111', '222', '333'] })
      
      expect(result.messages[0].content.text).toBe(
        '以下のタスクの要約を作成してください: タスクID 111, 222, 333'
      )
    })
  })

  describe('マルチアカウント統合', () => {
    beforeEach(async () => {
      client = new MCPClient()
    })

    it('アカウント切り替え時にコンテキストを切り替える', async () => {
      // 最初のアカウントで接続
      vi.mocked(require('firebase/auth').getIdToken).mockResolvedValue('account1-token')
      await client.connect(mockServerUrl)
      
      let callCount = 0
      mockServer.setHandler('tools/call', (params) => {
        callCount++
        const authToken = params.auth_token || 'no-token'
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ account: authToken, call: callCount })
            }
          ]
        }
      })

      // アカウント1でツール実行
      const result1 = await client.callTool('todoist_get_tasks', {})
      
      // アカウント切り替え
      vi.mocked(require('firebase/auth').getIdToken).mockResolvedValue('account2-token')
      client.refreshAuthToken()
      
      // アカウント2でツール実行
      const result2 = await client.callTool('todoist_get_tasks', {})
      
      // 異なるアカウントコンテキストで実行されることを確認
      expect(result1).not.toEqual(result2)
    })

    it('異なるアカウントで異なるデータを取得する', async () => {
      const account1Tasks = [{ id: '1', content: 'Account1 Task' }]
      const account2Tasks = [{ id: '2', content: 'Account2 Task' }]

      mockServer.setHandler('tools/call', (params) => {
        // 認証トークンに基づいてデータを返す
        const isAccount1 = params.auth_token === 'account1-token'
        const tasks = isAccount1 ? account1Tasks : account2Tasks
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(tasks)
            }
          ]
        }
      })

      // アカウント1でテスト
      vi.mocked(require('firebase/auth').getIdToken).mockResolvedValue('account1-token')
      await client.connect(mockServerUrl)
      const result1 = await client.callTool('todoist_get_tasks', {})
      const tasks1 = JSON.parse(result1.content[0].text)
      
      // アカウント2でテスト
      vi.mocked(require('firebase/auth').getIdToken).mockResolvedValue('account2-token')
      client.refreshAuthToken()
      const result2 = await client.callTool('todoist_get_tasks', {})
      const tasks2 = JSON.parse(result2.content[0].text)
      
      expect(tasks1[0].content).toBe('Account1 Task')
      expect(tasks2[0].content).toBe('Account2 Task')
    })

    it('権限不足時に適切なエラーを表示する', async () => {
      mockServer.setHandler('tools/call', (params) => {
        const error = new Error('権限がありません')
        ;(error as any).code = 403
        throw error
      })

      await client.connect(mockServerUrl)
      
      await expect(client.callTool('todoist_get_tasks', {})).rejects.toThrow('権限がありません')
    })
  })

  describe('リアルタイム通信', () => {
    beforeEach(async () => {
      client = new MCPClient()
      await client.connect(mockServerUrl)
      await client.initialize()
    })

    it('サーバー側イベントを受信して画面を更新する', async () => {
      const eventHandler = vi.fn()
      client.on('notification', eventHandler)

      // サーバー側からの通知をシミュレート
      const ws = (client as any).websocket
      ws.onmessage?.({
        data: JSON.stringify({
          jsonrpc: '2.0',
          method: 'notifications/resources/updated',
          params: {
            uri: 'task://123',
            type: 'updated'
          }
        })
      } as MessageEvent)

      expect(eventHandler).toHaveBeenCalledWith({
        method: 'notifications/resources/updated',
        params: {
          uri: 'task://123',
          type: 'updated'
        }
      })
    })

    it('複数タブ間でリアルタイム同期する', async () => {
      const client2 = new MCPClient()
      await client2.connect(mockServerUrl)
      
      const syncHandler1 = vi.fn()
      const syncHandler2 = vi.fn()
      
      client.on('sync', syncHandler1)
      client2.on('sync', syncHandler2)

      // ブロードキャスト通知をシミュレート
      const notification = {
        jsonrpc: '2.0',
        method: 'notifications/sync',
        params: { action: 'task_created', task_id: '123' }
      }

      const ws1 = (client as any).websocket
      const ws2 = (client2 as any).websocket
      
      ws1.onmessage?.({ data: JSON.stringify(notification) } as MessageEvent)
      ws2.onmessage?.({ data: JSON.stringify(notification) } as MessageEvent)

      expect(syncHandler1).toHaveBeenCalled()
      expect(syncHandler2).toHaveBeenCalled()
      
      client2.disconnect()
    })

    it('長時間接続でメモリリークしない', async () => {
      const initialMemory = process.memoryUsage()
      
      // 大量の通信をシミュレート
      for (let i = 0; i < 100; i++) {
        await client.callTool('todoist_get_tasks', {})
      }
      
      // ガベージコレクションを強制実行
      if (global.gc) {
        global.gc()
      }
      
      const finalMemory = process.memoryUsage()
      
      // メモリ使用量の増加が許容範囲内であることを確認
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024) // 50MB未満
    })
  })

  describe('エラー復旧', () => {
    beforeEach(async () => {
      client = new MCPClient()
      await client.connect(mockServerUrl)
      await client.initialize()
    })

    it('一時的な接続切断後に自動復旧する', async () => {
      const reconnectHandler = vi.fn()
      client.on('reconnect', reconnectHandler)

      // 接続切断をシミュレート
      const ws = (client as any).websocket
      ws.readyState = 3
      ws.onclose?.(new CloseEvent('close', { code: 1001, reason: 'Going Away' }))

      // 復旧を待つ
      await new Promise(resolve => setTimeout(resolve, 100))

      expect(reconnectHandler).toHaveBeenCalled()
      expect(client.isConnected()).toBe(true)
    })

    it('MCPサーバー再起動後に接続を復旧する', async () => {
      // サーバー再起動シミュレーション
      mockServer.setHandler('initialize', () => {
        throw new Error('Server restarting')
      })

      // 初期化エラーが発生
      await expect(client.initialize()).rejects.toThrow('Server restarting')

      // サーバー復旧
      mockServer.setHandler('initialize', () => ({
        protocolVersion: '2024-11-05',
        capabilities: {},
        serverInfo: { name: 'mcp-todoist', version: '1.0.1' }
      }))

      // 再接続と初期化が成功
      await client.connect(mockServerUrl)
      const result = await client.initialize()
      expect(result.serverInfo.version).toBe('1.0.1')
    })

    it('Todoistサーバーエラー後にリトライする', async () => {
      let callCount = 0
      mockServer.setHandler('tools/call', (params) => {
        callCount++
        if (callCount === 1) {
          throw new Error('Todoist API temporarily unavailable')
        }
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify([{ id: '123', content: 'Success after retry' }])
            }
          ]
        }
      })

      // 最初の呼び出しは失敗するが、リトライで成功
      const result = await client.callTool('todoist_get_tasks', {})
      const tasks = JSON.parse(result.content[0].text)
      
      expect(callCount).toBe(2) // 初回失敗 + リトライ成功
      expect(tasks[0].content).toBe('Success after retry')
    })
  })

  describe('パフォーマンス', () => {
    beforeEach(async () => {
      client = new MCPClient()
      await client.connect(mockServerUrl)
      await client.initialize()
    })

    it('大量のツール呼び出しを効率的に処理する', async () => {
      const startTime = Date.now()
      const promises = []

      // 50個の並列ツール呼び出し
      for (let i = 0; i < 50; i++) {
        promises.push(client.callTool('todoist_get_tasks', { project_id: i.toString() }))
      }

      await Promise.all(promises)
      const duration = Date.now() - startTime

      // 5秒以内で完了することを確認
      expect(duration).toBeLessThan(5000)
    })

    it('大きなレスポンスを効率的に処理する', async () => {
      const largeTasks = Array.from({ length: 1000 }, (_, i) => ({
        id: i.toString(),
        content: `Large task content ${i}`.repeat(100),
        is_completed: false,
        project_id: '456'
      }))

      mockServer.setHandler('tools/call', () => ({
        content: [
          {
            type: 'text',
            text: JSON.stringify(largeTasks)
          }
        ]
      }))

      const startTime = Date.now()
      const result = await client.callTool('todoist_get_tasks', {})
      const duration = Date.now() - startTime

      const tasks = JSON.parse(result.content[0].text)
      expect(tasks).toHaveLength(1000)
      expect(duration).toBeLessThan(1000) // 1秒以内
    })
  })
})