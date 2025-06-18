import { NextRequest, NextResponse } from 'next/server'
import { verifyIdToken } from 'firebase-admin/auth'
import type { MCPRequest, MCPResponse } from '@/types/mcp'

// Firebase Admin SDK初期化（実際の実装では適切な設定が必要）
async function verifyAuthToken(token: string): Promise<boolean> {
  try {
    // 実際の実装ではFirebase Admin SDKを使用してトークンを検証
    // ここではモック実装
    return token && token.startsWith('mock-') || token.includes('token')
  } catch (error) {
    return false
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: MCPRequest = await request.json()
    
    // MCPリクエストの基本的なバリデーション
    if (!body.jsonrpc || body.jsonrpc !== '2.0') {
      return NextResponse.json({
        jsonrpc: '2.0',
        id: body.id || null,
        error: {
          code: -32600,
          message: "Invalid Request: jsonrpc must be '2.0'"
        }
      }, { status: 400 })
    }

    if (!body.method) {
      return NextResponse.json({
        jsonrpc: '2.0',
        id: body.id || null,
        error: {
          code: -32600,
          message: 'Invalid Request: method is required'
        }
      }, { status: 400 })
    }

    // Firebase認証トークンの検証
    const authHeader = request.headers.get('authorization')
    const authToken = authHeader?.replace('Bearer ', '') || body.params?.auth_token
    
    if (authToken) {
      const isValid = await verifyAuthToken(authToken)
      if (!isValid) {
        return NextResponse.json({
          jsonrpc: '2.0',
          id: body.id,
          error: {
            code: 403,
            message: '認証に失敗しました'
          }
        }, { status: 403 })
      }
    }

    // MCPプロキシサーバーへのリクエスト転送
    const response = await handleMCPRequest(body)
    
    return NextResponse.json(response)
  } catch (error) {
    console.error('MCP API error:', error)
    
    return NextResponse.json({
      jsonrpc: '2.0',
      id: null,
      error: {
        code: -32700,
        message: 'Parse error',
        data: error instanceof Error ? error.message : 'Unknown error'
      }
    }, { status: 500 })
  }
}

async function handleMCPRequest(request: MCPRequest): Promise<MCPResponse> {
  // 実際の実装では外部MCPサーバーにWebSocketまたはHTTPで接続
  // ここでは基本的なモック実装を提供
  
  try {
    switch (request.method) {
      case 'initialize':
        return {
          jsonrpc: '2.0',
          id: request.id,
          result: {
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
        }

      case 'tools/list':
        return {
          jsonrpc: '2.0',
          id: request.id,
          result: {
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
        }

      case 'tools/call':
        const { name, arguments: args } = request.params || {}
        
        // ツール実行の基本的なモック
        switch (name) {
          case 'todoist_get_tasks':
            return {
              jsonrpc: '2.0',
              id: request.id,
              result: {
                content: [
                  {
                    type: 'text',
                    text: JSON.stringify([
                      {
                        id: '123',
                        content: 'テストタスク',
                        is_completed: false,
                        project_id: args?.project_id || '456'
                      }
                    ])
                  }
                ]
              }
            }
          
          case 'todoist_create_task':
            return {
              jsonrpc: '2.0',
              id: request.id,
              result: {
                content: [
                  {
                    type: 'text',
                    text: JSON.stringify({
                      id: Date.now().toString(),
                      content: args?.content || 'New Task',
                      is_completed: false,
                      project_id: args?.project_id || 'inbox'
                    })
                  }
                ]
              }
            }
          
          default:
            return {
              jsonrpc: '2.0',
              id: request.id,
              error: {
                code: -32601,
                message: `Unknown tool: ${name}`
              }
            }
        }

      case 'resources/list':
        return {
          jsonrpc: '2.0',
          id: request.id,
          result: {
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
        }

      case 'resources/read':
        const { uri } = request.params || {}
        return {
          jsonrpc: '2.0',
          id: request.id,
          result: {
            contents: [
              {
                uri,
                mimeType: 'application/json',
                text: JSON.stringify({
                  id: uri?.split('://')[1] || '123',
                  content: 'Sample content',
                  is_completed: false
                })
              }
            ]
          }
        }

      case 'prompts/list':
        return {
          jsonrpc: '2.0',
          id: request.id,
          result: {
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
        }

      case 'prompts/get':
        const { name: promptName, arguments: promptArgs } = request.params || {}
        return {
          jsonrpc: '2.0',
          id: request.id,
          result: {
            name: promptName,
            messages: [
              {
                role: 'user',
                content: {
                  type: 'text',
                  text: `プロンプト ${promptName} の内容です。引数: ${JSON.stringify(promptArgs)}`
                }
              }
            ]
          }
        }

      default:
        return {
          jsonrpc: '2.0',
          id: request.id,
          error: {
            code: -32601,
            message: `Unknown method: ${request.method}`
          }
        }
    }
  } catch (error) {
    return {
      jsonrpc: '2.0',
      id: request.id,
      error: {
        code: -32603,
        message: 'Internal error',
        data: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }
}

export async function GET(request: NextRequest) {
  // WebSocket接続情報の取得
  return NextResponse.json({
    status: 'available',
    websocket_url: 'ws://localhost:8080/mcp',
    capabilities: ['tools', 'resources', 'prompts']
  })
}

// OPTIONSメソッドでCORSを処理
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
}