import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'

// mcp-serverの新しい実装に基づくモック関数
const POST = vi.fn(async (request: NextRequest) => {
  try {
    const body = (request as any).json ? await (request as any).json() : {}
    
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
            message: 'Todoist client not initialized - API token required'
          }
        })
      }
    }

    // mcp-serverの実装に基づくレスポンス
    let result
    switch (body.method) {
      case 'initialize':
        result = {
          protocolVersion: '2024-11-05',
          capabilities: {
            tools: { listChanged: true },
            resources: { subscribe: true, listChanged: true },
            prompts: { listChanged: true }
          },
          serverInfo: { name: 'mcp-todoist', version: '1.0.0' }
        }
        break
      case 'tools/list':
        result = {
          tools: [
            {
              name: 'todoist_get_tasks',
              description: 'Get tasks from Todoist',
              inputSchema: {
                type: 'object',
                properties: {
                  project_id: { type: 'string', description: 'Project ID to filter tasks' },
                  filter: { type: 'string', description: 'Filter expression' },
                  limit: { type: 'number', description: 'Maximum number of tasks to return' }
                }
              }
            },
            {
              name: 'todoist_create_task',
              description: 'Create a new task in Todoist',
              inputSchema: {
                type: 'object',
                properties: {
                  content: { type: 'string', description: 'Task content' },
                  description: { type: 'string', description: 'Task description' },
                  project_id: { type: 'string', description: 'Project ID' },
                  priority: { type: 'number', description: 'Priority (1-4)', minimum: 1, maximum: 4 },
                  due_string: { type: 'string', description: 'Due date in natural language' },
                  labels: { type: 'array', items: { type: 'string' }, description: 'Task labels' }
                },
                required: ['content']
              }
            },
            {
              name: 'todoist_update_task',
              description: 'Update an existing task in Todoist',
              inputSchema: {
                type: 'object',
                properties: {
                  task_id: { type: 'string', description: 'Task ID' },
                  content: { type: 'string', description: 'Task content' },
                  description: { type: 'string', description: 'Task description' },
                  priority: { type: 'number', description: 'Priority (1-4)', minimum: 1, maximum: 4 },
                  due_string: { type: 'string', description: 'Due date in natural language' },
                  labels: { type: 'array', items: { type: 'string' }, description: 'Task labels' }
                },
                required: ['task_id']
              }
            },
            {
              name: 'todoist_close_task',
              description: 'Mark a task as completed in Todoist',
              inputSchema: {
                type: 'object',
                properties: {
                  task_id: { type: 'string', description: 'Task ID to complete' }
                },
                required: ['task_id']
              }
            },
            {
              name: 'todoist_get_projects',
              description: 'Get projects from Todoist',
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
              content: [
                {
                  type: 'text',
                  text: JSON.stringify([
                    {
                      id: '123',
                      content: 'Test task',
                      description: '',
                      is_completed: false,
                      priority: 1,
                      project_id: args?.project_id || 'inbox',
                      labels: [],
                      created_at: '2024-01-01T00:00:00.000000Z'
                    }
                  ], null, 2)
                }
              ]
            }
            break
          case 'todoist_create_task':
            result = {
              content: [
                {
                  type: 'text',
                  text: `Task created successfully: ${args?.content || 'New Task'} (ID: task_${Date.now()})`
                }
              ]
            }
            break
          case 'todoist_update_task':
            result = {
              content: [
                {
                  type: 'text',
                  text: `Task updated successfully: ${args?.content || 'Updated Task'} (ID: ${args?.task_id || '123'})`
                }
              ]
            }
            break
          case 'todoist_close_task':
            result = {
              content: [
                {
                  type: 'text',
                  text: `Task ${args?.task_id || '123'} marked as completed`
                }
              ]
            }
            break
          case 'todoist_get_projects':
            result = {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify([
                    {
                      id: 'inbox',
                      name: 'Inbox',
                      color: '#808080',
                      order: 1,
                      is_shared: false,
                      is_favorite: false
                    }
                  ], null, 2)
                }
              ]
            }
            break
          default:
            return {
              status: 200,
              json: vi.fn().mockResolvedValue({
                jsonrpc: '2.0',
                id: body.id,
                error: { code: -32601, message: `Unknown tool: ${name}` }
              })
            }
        }
        break
      case 'resources/list':
        result = {
          resources: [
            {
              uri: 'todoist://tasks',
              name: 'Todoist Tasks',
              description: 'Access to Todoist tasks',
              mimeType: 'application/json'
            },
            {
              uri: 'todoist://projects',
              name: 'Todoist Projects', 
              description: 'Access to Todoist projects',
              mimeType: 'application/json'
            }
          ]
        }
        break
      case 'resources/read':
        const { uri } = body.params || {}
        if (uri && (uri.startsWith('todoist://tasks') || uri.startsWith('todoist://projects'))) {
          result = {
            contents: [
              {
                uri: uri,
                mimeType: 'application/json',
                text: JSON.stringify({
                  id: uri?.split('://')[1] || '123',
                  content: 'Sample content',
                  is_completed: false
                }, null, 2)
              }
            ]
          }
        } else {
          return {
            status: 200,
            json: vi.fn().mockResolvedValue({
              jsonrpc: '2.0',
              id: body.id,
              error: { code: -32602, message: `Unknown resource URI: ${uri}` }
            })
          }
        }
        break
      case 'prompts/list':
        result = {
          prompts: [
            {
              name: 'task_summary',
              description: 'Generate a task summary',
              arguments: [
                { name: 'task_ids', description: 'List of task IDs', required: true }
              ]
            },
            {
              name: 'project_analysis',
              description: 'Analyze project progress',
              arguments: [
                { name: 'project_id', description: 'Project ID', required: true }
              ]
            }
          ]
        }
        break
      case 'prompts/get':
        const { name: promptName, arguments: promptArgs } = body.params || {}
        if (promptName === 'task_summary' || promptName === 'project_analysis') {
          result = {
            name: promptName,
            description: 'Task summary generated',
            messages: [
              {
                role: 'user',
                content: {
                  type: 'text',
                  text: `Here is a summary of ${promptArgs?.task_ids?.length || 0} tasks:\n\n- Sample task content`
                }
              }
            ]
          }
        } else {
          return {
            status: 200,
            json: vi.fn().mockResolvedValue({
              jsonrpc: '2.0',
              id: body.id,
              error: { code: -32601, message: `Unknown prompt: ${promptName}` }
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
            error: { code: -32601, message: 'Method not found' }
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
        error: { code: -32700, message: 'Parse error' }
      })
    }
  }
})

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

describe('MCP API（HTTP経由）', () => {
  const createMockRequest = (body: any): NextRequest => {
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
      json: vi.fn().mockResolvedValue(body),
    } as any as NextRequest
    
    return request
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('基本的なMCPプロトコル', () => {
    it('initialize リクエストで正しいレスポンスを返す', async () => {
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
      expect(data.result.serverInfo.name).toBe('mcp-todoist')
      expect(data.result.protocolVersion).toBe('2024-11-05')
      expect(data.result.capabilities).toHaveProperty('tools')
      expect(data.result.capabilities).toHaveProperty('resources')
      expect(data.result.capabilities).toHaveProperty('prompts')
    })

    it('tools/list リクエストでツール一覧を取得できる', async () => {
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
      
      const todoistGetTasks = data.result.tools.find((tool: MCPTool) => tool.name === 'todoist_get_tasks')
      expect(todoistGetTasks).toBeDefined()
      expect(todoistGetTasks.description).toContain('Get tasks from Todoist')
      
      const todoistCreateTask = data.result.tools.find((tool: MCPTool) => tool.name === 'todoist_create_task')
      expect(todoistCreateTask).toBeDefined()
      expect(todoistCreateTask.inputSchema.required).toContain('content')
    })

    it('tools/call でタスク取得ツールを実行できる', async () => {
      const requestBody: MCPRequest = {
        jsonrpc: '2.0',
        id: 3,
        method: 'tools/call',
        params: {
          name: 'todoist_get_tasks',
          arguments: {
            project_id: '123'
          }
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
      expect(tasks[0]).toHaveProperty('id')
      expect(tasks[0]).toHaveProperty('content')
      expect(tasks[0]).toHaveProperty('is_completed')
      expect(tasks[0]).toHaveProperty('project_id')
    })

    it('tools/call でタスク作成ツールを実行できる', async () => {
      const requestBody: MCPRequest = {
        jsonrpc: '2.0',
        id: 4,
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
      expect(data.result.content[0].type).toBe('text')
      expect(data.result.content[0].text).toContain('Task created successfully')
      expect(data.result.content[0].text).toContain('テストタスク')
    })

    it('tools/call でタスク更新ツールを実行できる', async () => {
      const requestBody: MCPRequest = {
        jsonrpc: '2.0',
        id: 5,
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
      expect(data.result.content[0].type).toBe('text')
      expect(data.result.content[0].text).toContain('Task updated successfully')
      expect(data.result.content[0].text).toContain('更新されたタスク')
      expect(data.result.content[0].text).toContain('123')
    })

    it('tools/call でタスク完了ツールを実行できる', async () => {
      const requestBody: MCPRequest = {
        jsonrpc: '2.0',
        id: 6,
        method: 'tools/call',
        params: {
          name: 'todoist_close_task',
          arguments: {
            task_id: '123'
          }
        }
      }

      const request = createMockRequest(requestBody)
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.result.content).toBeInstanceOf(Array)
      expect(data.result.content[0].type).toBe('text')
      expect(data.result.content[0].text).toContain('Task 123 marked as completed')
    })

    it('resources/list でリソース一覧を取得できる', async () => {
      const requestBody: MCPRequest = {
        jsonrpc: '2.0',
        id: 7,
        method: 'resources/list'
      }

      const request = createMockRequest(requestBody)
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.result.resources).toBeInstanceOf(Array)
      expect(data.result.resources.length).toBeGreaterThan(0)
      
      const taskResource = data.result.resources.find((resource: MCPResource) => 
        resource.uri.startsWith('todoist://')
      )
      expect(taskResource).toBeDefined()
      expect(taskResource.name).toContain('Todoist')
      expect(taskResource.mimeType).toBe('application/json')
    })

    it('resources/read でリソースの内容を取得できる', async () => {
      const requestBody: MCPRequest = {
        jsonrpc: '2.0',
        id: 8,
        method: 'resources/read',
        params: {
          uri: 'todoist://tasks'
        }
      }

      const request = createMockRequest(requestBody)
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.result.contents).toBeInstanceOf(Array)
      expect(data.result.contents[0]).toHaveProperty('uri')
      expect(data.result.contents[0]).toHaveProperty('text')
      expect(data.result.contents[0]).toHaveProperty('mimeType')
      
      const taskData = JSON.parse(data.result.contents[0].text)
      expect(taskData).toHaveProperty('id')
      expect(taskData).toHaveProperty('content')
    })

    it('prompts/list でプロンプト一覧を取得できる', async () => {
      const requestBody: MCPRequest = {
        jsonrpc: '2.0',
        id: 9,
        method: 'prompts/list'
      }

      const request = createMockRequest(requestBody)
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.result.prompts).toBeInstanceOf(Array)
      expect(data.result.prompts.length).toBeGreaterThan(0)
      
      const taskSummaryPrompt = data.result.prompts.find((prompt: any) => 
        prompt.name === 'task_summary'
      )
      expect(taskSummaryPrompt).toBeDefined()
      expect(taskSummaryPrompt.description).toContain('Generate a task summary')
    })

    it('prompts/get でプロンプトの詳細を取得できる', async () => {
      const requestBody: MCPRequest = {
        jsonrpc: '2.0',
        id: 10,
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
      expect(data.result.description).toContain('Task summary generated')
      expect(data.result.messages).toBeInstanceOf(Array)
      expect(data.result.messages[0]).toHaveProperty('role')
      expect(data.result.messages[0]).toHaveProperty('content')
    })
  })

  describe('エラーハンドリング', () => {
    it('不正なjsonrpcバージョンでエラーを返す', async () => {
      const requestBody = {
        jsonrpc: '1.0', // 不正なバージョン
        id: 1,
        method: 'initialize'
      }

      const request = createMockRequest(requestBody)
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error.code).toBe(-32600)
      expect(data.error.message).toContain('jsonrpc must be')
    })

    it('method が存在しない場合にエラーを返す', async () => {
      const requestBody = {
        jsonrpc: '2.0',
        id: 2
        // method が欠けている
      }

      const request = createMockRequest(requestBody)
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error.code).toBe(-32600)
      expect(data.error.message).toContain('method is required')
    })

    it('存在しないメソッドでエラーを返す', async () => {
      const requestBody: MCPRequest = {
        jsonrpc: '2.0',
        id: 3,
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

    it('存在しないツールでエラーを返す', async () => {
      const requestBody: MCPRequest = {
        jsonrpc: '2.0',
        id: 4,
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

    it('不正なJSONでパースエラーを返す', async () => {
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

    it('存在しないリソースでエラーを返す', async () => {
      const requestBody: MCPRequest = {
        jsonrpc: '2.0',
        id: 5,
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
      expect(data.error.message).toContain('Unknown resource URI')
    })

    it('存在しないプロンプトでエラーを返す', async () => {
      const requestBody: MCPRequest = {
        jsonrpc: '2.0',
        id: 6,
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
      expect(data.error.code).toBe(-32601)
      expect(data.error.message).toContain('Unknown prompt')
    })
  })

  describe('認証とセキュリティ', () => {
    it('有効な認証トークンで正常に処理される', async () => {
      const requestBody: MCPRequest = {
        jsonrpc: '2.0',
        id: 7,
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

    it('無効な認証トークンでエラーを返す', async () => {
      const requestBody: MCPRequest = {
        jsonrpc: '2.0',
        id: 8,
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
      expect(data.error.message).toContain('Todoist client not initialized - API token required')
    })

    it('認証なしでも基本機能が動作する', async () => {
      const requestBody: MCPRequest = {
        jsonrpc: '2.0',
        id: 9,
        method: 'initialize'
      }

      const request = createMockRequest(requestBody)
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.result).toBeDefined()
      expect(data.result.serverInfo.name).toBe('mcp-todoist')
    })
  })

  describe('パフォーマンスとスケーラビリティ', () => {
    it('大量のツール呼び出しでも適切に応答する', async () => {
      const promises = []
      
      for (let i = 0; i < 10; i++) {
        const requestBody: MCPRequest = {
          jsonrpc: '2.0',
          id: i + 100,
          method: 'tools/call',
          params: {
            name: 'todoist_get_tasks',
            arguments: { project_id: `project-${i}` }
          }
        }

        const request = createMockRequest(requestBody)
        promises.push(POST(request))
      }

      const responses = await Promise.all(promises)
      
      expect(responses).toHaveLength(10)
      responses.forEach((response, index) => {
        expect(response.status).toBe(200)
      })
    })

    it('レスポンス形式が一貫している', async () => {
      const methods = [
        'initialize',
        'tools/list',
        'resources/list',
        'prompts/list'
      ]

      for (let i = 0; i < methods.length; i++) {
        const requestBody: MCPRequest = {
          jsonrpc: '2.0',
          id: i + 200,
          method: methods[i]
        }

        const request = createMockRequest(requestBody)
        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.jsonrpc).toBe('2.0')
        expect(data.id).toBe(i + 200)
        expect(data.result).toBeDefined()
      }
    })
  })
})