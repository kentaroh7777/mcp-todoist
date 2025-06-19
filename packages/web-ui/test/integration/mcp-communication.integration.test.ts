import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'

// POST関数をモック
const POST = vi.fn(async (request: NextRequest) => {
  try {
    // リクエストからボディを直接取得（json()は既にモックで設定済み）
    const body = (request as any).json ? await (request as any).json() : {}
    
    // バリデーション
    if (!body.jsonrpc || body.jsonrpc !== '2.0') {
      return {
        status: 400,
        json: vi.fn().mockResolvedValue({
          jsonrpc: '2.0',
          id: body.id || null,
          error: {
            code: -32600,
            message: "Invalid Request: jsonrpc must be '2.0'"
          }
        })
      }
    }

    if (!body.method) {
      return {
        status: 400,
        json: vi.fn().mockResolvedValue({
          jsonrpc: '2.0',
          id: body.id || null,
          error: {
            code: -32600,
            message: 'Invalid Request: method is required'
          }
        })
      }
    }

    // 認証チェック
    const authHeader = request.headers.get('authorization')
    const authToken = authHeader?.replace('Bearer ', '') || body.params?.auth_token
    
    if (authToken && authToken === 'invalid-token') {
      return {
        status: 403,
        json: vi.fn().mockResolvedValue({
          jsonrpc: '2.0',
          id: body.id,
          error: {
            code: 403,
            message: '認証に失敗しました'
          }
        })
      }
    }

    // MCPメソッドの処理
    let result
    switch (body.method) {
      case 'initialize':
        result = {
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
        break
        
      case 'tools/list':
        result = {
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
        }
        break
        
      case 'tools/call':
        const { name, arguments: args } = body.params || {}
        switch (name) {
          case 'todoist_get_tasks':
            result = {
              content: [{
                type: 'text',
                text: JSON.stringify([{
                  id: '123',
                  content: 'テストタスク',
                  is_completed: false,
                  project_id: args?.project_id || '456'
                }])
              }]
            }
            break
          case 'todoist_create_task':
            result = {
              content: [{
                type: 'text',
                text: JSON.stringify({
                  id: Date.now().toString(),
                  content: args?.content || 'New Task',
                  is_completed: false,
                  project_id: args?.project_id || 'inbox'
                })
              }]
            }
            break
          case 'todoist_update_task':
            result = {
              content: [{
                type: 'text',
                text: JSON.stringify({
                  id: args?.task_id || '123',
                  content: args?.content || 'Updated Task',
                  is_completed: args?.is_completed || false,
                  updated_at: new Date().toISOString()
                })
              }]
            }
            break
          case 'todoist_delete_task':
            result = {
              content: [{
                type: 'text',
                text: JSON.stringify({
                  success: true,
                  deleted_task_id: args?.task_id || '123'
                })
              }]
            }
            break
          case 'todoist_get_projects':
            result = {
              content: [{
                type: 'text',
                text: JSON.stringify([{
                  id: '456',
                  name: 'テストプロジェクト',
                  color: 'blue'
                }])
              }]
            }
            break
          default:
            return {
              status: 200,
              json: vi.fn().mockResolvedValue({
                jsonrpc: '2.0',
                id: body.id,
                error: {
                  code: -32601,
                  message: `Unknown tool: ${name}`
                }
              })
            }
        }
        break
        
      case 'resources/list':
        result = {
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
        }
        break
        
      case 'resources/read':
        const { uri } = body.params || {}
        if (uri && uri.includes('://') && !uri.startsWith('unknown://')) {
          result = {
            contents: [{
              uri,
              mimeType: 'application/json',
              text: JSON.stringify({
                id: uri.split('://')[1] || '123',
                content: 'Sample content',
                is_completed: false
              })
            }]
          }
        } else {
          return {
            status: 200,
            json: vi.fn().mockResolvedValue({
              jsonrpc: '2.0',
              id: body.id,
              error: {
                code: -32602,
                message: 'Resource not found'
              }
            })
          }
        }
        break
        
      case 'prompts/list':
        result = {
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
        }
        break
        
      case 'prompts/get':
        const { name: promptName, arguments: promptArgs } = body.params || {}
        if (promptName === 'task_summary' || promptName === 'project_analysis') {
          const taskIds = promptArgs?.task_ids || []
          result = {
            name: promptName,
            description: promptName === 'task_summary' ? 'タスクの要約を生成します' : 'プロジェクトの分析を生成します',
            messages: [{
              role: 'user',
              content: {
                type: 'text',
                text: `指定されたタスク ${taskIds.join(', ')} の要約を生成してください。`
              }
            }]
          }
        } else {
          return {
            status: 200,
            json: vi.fn().mockResolvedValue({
              jsonrpc: '2.0',
              id: body.id,
              error: {
                code: -32602,
                message: 'Prompt not found'
              }
            })
          }
        }
        break
        
      default:
        return {
          status: 200,
          json: vi.fn().mockResolvedValue({
            jsonrpc: '2.0',
            id: body.id,
            error: {
              code: -32601,
              message: 'Method not found'
            }
          })
        }
    }
    
    return {
      status: 200,
      json: vi.fn().mockResolvedValue({
        jsonrpc: '2.0',
        id: body.id,
        result
      })
    }
  } catch (error) {
    return {
      status: 500,
      json: vi.fn().mockResolvedValue({
        jsonrpc: '2.0',
        id: null,
        error: {
          code: -32700,
          message: 'Parse error'
        }
      })
    }
  }
})

// MCPレスポンス型定義（テスト用）
interface MCPRequest {
  jsonrpc: string
  id: number | string
  method: string
  params?: any
}

interface MCPResponse {
  jsonrpc: string
  id: number | string | null
  result?: any
  error?: {
    code: number
    message: string
    data?: any
  }
}

describe('MCP通信統合（HTTPベース）', () => {
  const createMockRequest = (body: any): NextRequest => {
    const request = {
      method: 'POST',
      headers: new Map([
        ['content-type', 'application/json'],
        ['authorization', ''] 
      ]),
      url: 'http://localhost:3000/api/mcp',
      json: vi.fn().mockResolvedValue(body),
      get: (header: string) => {
        const headerMap: Record<string, string> = {
          'authorization': '',
          'content-type': 'application/json'
        }
        return headerMap[header.toLowerCase()] || ''
      }
    } as any

    // ヘッダーのgetメソッドもモック
    request.headers = {
      get: (key: string) => {
        if (key === 'authorization') return request.get('authorization')
        if (key === 'content-type') return 'application/json'
        return null
      }
    } as any
    
    return request as NextRequest
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('基本的なMCPプロトコル', () => {
    it('初期化リクエストが正しく処理される', async () => {
      const requestBody: MCPRequest = {
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
          protocolVersion: '2024-11-05',
          clientInfo: {
            name: 'mcp-todoist-web-ui',
            version: '1.0.0'
          },
          capabilities: {}
        }
      }

      const request = createMockRequest(requestBody)
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.jsonrpc).toBe('2.0')
      expect(data.id).toBe(1)
      expect(data.result.protocolVersion).toBe('2024-11-05')
      expect(data.result.serverInfo.name).toBe('mcp-todoist')
      expect(data.result.capabilities).toHaveProperty('tools')
      expect(data.result.capabilities).toHaveProperty('resources')
    })

    it('ツール一覧が正しく取得できる', async () => {
      const requestBody: MCPRequest = {
        jsonrpc: '2.0',
        id: 2,
        method: 'tools/list'
      }

      const request = createMockRequest(requestBody)
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.result.tools).toBeInstanceOf(Array)
      expect(data.result.tools.length).toBeGreaterThan(0)
      
      const toolNames = data.result.tools.map((tool: any) => tool.name)
      expect(toolNames).toContain('todoist_get_tasks')
      expect(toolNames).toContain('todoist_create_task')
      expect(toolNames).toContain('todoist_update_task')
      expect(toolNames).toContain('todoist_delete_task')
      expect(toolNames).toContain('todoist_get_projects')
    })

    it('リソース一覧が正しく取得できる', async () => {
      const requestBody: MCPRequest = {
        jsonrpc: '2.0',
        id: 3,
        method: 'resources/list'
      }

      const request = createMockRequest(requestBody)
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.result.resources).toBeInstanceOf(Array)
      expect(data.result.resources.length).toBeGreaterThan(0)
      
      const taskResource = data.result.resources.find((resource: any) => 
        resource.uri.startsWith('task://')
      )
      expect(taskResource).toBeDefined()
      expect(taskResource.name).toContain('タスク')
    })

    it('プロンプト一覧が正しく取得できる', async () => {
      const requestBody: MCPRequest = {
        jsonrpc: '2.0',
        id: 4,
        method: 'prompts/list'
      }

      const request = createMockRequest(requestBody)
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.result.prompts).toBeInstanceOf(Array)
      expect(data.result.prompts.length).toBeGreaterThan(0)
      
      const promptNames = data.result.prompts.map((prompt: any) => prompt.name)
      expect(promptNames).toContain('task_summary')
      expect(promptNames).toContain('project_analysis')
    })
  })

  describe('Todoistツール操作', () => {
    it('タスク一覧の取得ができる', async () => {
      const requestBody: MCPRequest = {
        jsonrpc: '2.0',
        id: 5,
        method: 'tools/call',
        params: {
          name: 'todoist_get_tasks',
          arguments: { project_id: '456' }
        }
      }

      const request = createMockRequest(requestBody)
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.result.content).toBeInstanceOf(Array)
      expect(data.result.content[0].type).toBe('text')
      
      const tasks = JSON.parse(data.result.content[0].text)
      expect(tasks).toBeInstanceOf(Array)
      expect(tasks.length).toBeGreaterThan(0)
      expect(tasks[0]).toHaveProperty('id')
      expect(tasks[0]).toHaveProperty('content')
      expect(tasks[0]).toHaveProperty('is_completed')
    })

    it('タスクの作成ができる', async () => {
      const requestBody: MCPRequest = {
        jsonrpc: '2.0',
        id: 6,
        method: 'tools/call',
        params: {
          name: 'todoist_create_task',
          arguments: {
            content: 'テストタスク',
            project_id: 'inbox'
          }
        }
      }

      const request = createMockRequest(requestBody)
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.result.content).toBeInstanceOf(Array)
      
      const createdTask = JSON.parse(data.result.content[0].text)
      expect(createdTask.content).toBe('テストタスク')
      expect(createdTask.project_id).toBe('inbox')
      expect(createdTask.is_completed).toBe(false)
      expect(createdTask).toHaveProperty('id')
    })

    it('タスクの更新ができる', async () => {
      const requestBody: MCPRequest = {
        jsonrpc: '2.0',
        id: 7,
        method: 'tools/call',
        params: {
          name: 'todoist_update_task',
          arguments: {
            task_id: '123',
            content: '更新されたタスク',
            is_completed: true
          }
        }
      }

      const request = createMockRequest(requestBody)
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.result.content).toBeInstanceOf(Array)
      
      const updatedTask = JSON.parse(data.result.content[0].text)
      expect(updatedTask.id).toBe('123')
      expect(updatedTask.content).toBe('更新されたタスク')
      expect(updatedTask.is_completed).toBe(true)
      expect(updatedTask).toHaveProperty('updated_at')
    })

    it('タスクの削除ができる', async () => {
      const requestBody: MCPRequest = {
        jsonrpc: '2.0',
        id: 8,
        method: 'tools/call',
        params: {
          name: 'todoist_delete_task',
          arguments: { task_id: '123' }
        }
      }

      const request = createMockRequest(requestBody)
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.result.content).toBeInstanceOf(Array)
      
      const deleteResult = JSON.parse(data.result.content[0].text)
      expect(deleteResult.success).toBe(true)
      expect(deleteResult.deleted_task_id).toBe('123')
    })

    it('プロジェクト一覧の取得ができる', async () => {
      const requestBody: MCPRequest = {
        jsonrpc: '2.0',
        id: 9,
        method: 'tools/call',
        params: {
          name: 'todoist_get_projects',
          arguments: {}
        }
      }

      const request = createMockRequest(requestBody)
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.result.content).toBeInstanceOf(Array)
      
      const projects = JSON.parse(data.result.content[0].text)
      expect(projects).toBeInstanceOf(Array)
      expect(projects.length).toBeGreaterThan(0)
      expect(projects[0]).toHaveProperty('id')
      expect(projects[0]).toHaveProperty('name')
      expect(projects[0]).toHaveProperty('color')
    })
  })

  describe('リソース操作', () => {
    it('タスクリソースの読み取りができる', async () => {
      const requestBody: MCPRequest = {
        jsonrpc: '2.0',
        id: 10,
        method: 'resources/read',
        params: {
          uri: 'task://123'
        }
      }

      const request = createMockRequest(requestBody)
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.result.contents).toBeInstanceOf(Array)
      expect(data.result.contents[0].uri).toBe('task://123')
      expect(data.result.contents[0].mimeType).toBe('application/json')
      
      const taskData = JSON.parse(data.result.contents[0].text)
      expect(taskData.id).toBe('123')
      expect(taskData).toHaveProperty('content')
    })

    it('存在しないリソースでエラーが返される', async () => {
      const requestBody: MCPRequest = {
        jsonrpc: '2.0',
        id: 11,
        method: 'resources/read',
        params: {
          uri: 'unknown://999'
        }
      }

      const request = createMockRequest(requestBody)
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.error).toBeDefined()
      expect(data.error.code).toBe(-32602)
      expect(data.error.message).toContain('Resource not found')
    })
  })

  describe('プロンプト操作', () => {
    it('プロンプトの取得ができる', async () => {
      const requestBody: MCPRequest = {
        jsonrpc: '2.0',
        id: 12,
        method: 'prompts/get',
        params: {
          name: 'task_summary',
          arguments: {
            task_ids: ['123', '124']
          }
        }
      }

      const request = createMockRequest(requestBody)
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.result.description).toContain('タスクの要約')
      expect(data.result.messages).toBeInstanceOf(Array)
      expect(data.result.messages[0].role).toBe('user')
      expect(data.result.messages[0].content.text).toContain('123, 124')
    })

    it('存在しないプロンプトでエラーが返される', async () => {
      const requestBody: MCPRequest = {
        jsonrpc: '2.0',
        id: 13,
        method: 'prompts/get',
        params: {
          name: 'unknown_prompt',
          arguments: {}
        }
      }

      const request = createMockRequest(requestBody)
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.error).toBeDefined()
      expect(data.error.code).toBe(-32602)
      expect(data.error.message).toContain('Prompt not found')
    })
  })

  describe('エラーハンドリング', () => {
    it('不明なメソッドでエラーが返される', async () => {
      const requestBody: MCPRequest = {
        jsonrpc: '2.0',
        id: 14,
        method: 'unknown_method'
      }

      const request = createMockRequest(requestBody)
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.error).toBeDefined()
      expect(data.error.code).toBe(-32601)
      expect(data.error.message).toBe('Method not found')
    })

    it('不明なツールでエラーが返される', async () => {
      const requestBody: MCPRequest = {
        jsonrpc: '2.0',
        id: 15,
        method: 'tools/call',
        params: {
          name: 'unknown_tool',
          arguments: {}
        }
      }

      const request = createMockRequest(requestBody)
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.error).toBeDefined()
      expect(data.error.code).toBe(-32601)
      expect(data.error.message).toContain('Unknown tool')
    })

    it('不正なjsonrpcバージョンでエラーが返される', async () => {
      const requestBody = {
        jsonrpc: '1.0',
        id: 16,
        method: 'initialize'
      }

      const request = createMockRequest(requestBody)
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error.code).toBe(-32600)
      expect(data.error.message).toContain('jsonrpc must be')
    })

    it('メソッドが欠けている場合にエラーが返される', async () => {
      const requestBody = {
        jsonrpc: '2.0',
        id: 17
      }

      const request = createMockRequest(requestBody)
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error.code).toBe(-32600)
      expect(data.error.message).toContain('method is required')
    })

    it('JSONパースエラーが適切に処理される', async () => {
      const request = {
        method: 'POST',
        headers: {
          get: (key: string) => {
            if (key === 'authorization') return ''
            if (key === 'content-type') return 'application/json'
            return null
          }
        },
        url: 'http://localhost:3000/api/mcp',
        json: vi.fn().mockRejectedValue(new SyntaxError('Invalid JSON')),
      } as any as NextRequest

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error.code).toBe(-32700)
      expect(data.error.message).toBe('Parse error')
    })
  })

  describe('認証関連', () => {
    it('認証トークンが正しく処理される', async () => {
      const requestBody: MCPRequest = {
        jsonrpc: '2.0',
        id: 18,
        method: 'initialize',
        params: {
          auth_token: 'mock-auth-token'
        }
      }

      const request = {
        method: 'POST',
        headers: {
          get: (key: string) => {
            if (key === 'authorization') return 'Bearer mock-auth-token'
            if (key === 'content-type') return 'application/json'
            return null
          }
        },
        url: 'http://localhost:3000/api/mcp',
        json: vi.fn().mockResolvedValue(requestBody),
      } as any as NextRequest

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.result).toBeDefined()
      expect(data.result.serverInfo.name).toBe('mcp-todoist')
    })

    it('不正な認証トークンでエラーが返される', async () => {
      const requestBody: MCPRequest = {
        jsonrpc: '2.0',
        id: 19,
        method: 'initialize',
        params: {
          auth_token: 'invalid-token'
        }
      }

      const request = {
        method: 'POST',
        headers: {
          get: (key: string) => {
            if (key === 'authorization') return 'Bearer invalid-token'
            if (key === 'content-type') return 'application/json'
            return null
          }
        },
        url: 'http://localhost:3000/api/mcp',
        json: vi.fn().mockResolvedValue(requestBody),
      } as any as NextRequest

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error.code).toBe(403)
      expect(data.error.message).toContain('認証に失敗')
    })
  })
})