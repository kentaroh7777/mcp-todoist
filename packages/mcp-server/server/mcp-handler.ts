import { MCPRequest, MCPResponse, MCPError, InitializeResult, ValidationResult } from '../types/mcp'
import { TodoistClient } from '../src/adapters/todoist-client'

export class MCPProtocolHandler {
  private todoistClient: TodoistClient | null = null;

  constructor(todoistApiToken?: string) {
    if (todoistApiToken) {
      this.todoistClient = new TodoistClient(todoistApiToken);
    }
  }

  async handleRequest(request: any): Promise<MCPResponse> {
    const validationResult = this.validateRequest(request)
    
    if (!validationResult.isValid) {
      return this.createErrorResponse(request?.id ?? 0, validationResult.error!)
    }

    const mcpRequest = request as MCPRequest

    try {
      switch (mcpRequest.method) {
        case 'initialize':
          const initializeResult: InitializeResult = {
            protocolVersion: '2024-11-05',
            capabilities: {
              tools: { listChanged: true },
              resources: { subscribe: true, listChanged: true },
              prompts: { listChanged: true }
            },
            serverInfo: {
              name: 'mcp-todoist',
              version: '1.0.0'
            }
          }
          return this.createResponse(mcpRequest.id, initializeResult)

        case 'tools/list':
          return this.createResponse(mcpRequest.id, {
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
          })

        case 'tools/call':
          const { name, arguments: args } = mcpRequest.params || {}
          return await this.handleToolCall(name, args, mcpRequest.id)

        case 'resources/list':
          return this.createResponse(mcpRequest.id, {
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
          })

        case 'resources/read':
          const { uri } = mcpRequest.params || {}
          return await this.handleResourceRead(uri, mcpRequest.id)

        case 'prompts/list':
          return this.createResponse(mcpRequest.id, {
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
          })

        case 'prompts/get':
          const { name: promptName, arguments: promptArgs } = mcpRequest.params || {}
          return await this.handlePromptGet(promptName, promptArgs, mcpRequest.id)
        
        default:
          return this.createErrorResponse(mcpRequest.id, {
            code: -32601,
            message: 'Method not found'
          })
      }
    } catch (error) {
      return this.createErrorResponse(mcpRequest.id, {
        code: -32603,
        message: 'Internal error',
        data: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  private async handleToolCall(toolName: string, args: any, requestId: any): Promise<MCPResponse> {
    if (!this.todoistClient) {
      return this.createErrorResponse(requestId, {
        code: -32603,
        message: 'Todoist client not initialized - API token required'
      })
    }

    try {
      switch (toolName) {
        case 'todoist_get_tasks':
          const tasks = await this.todoistClient.getTasks(args)
          return this.createResponse(requestId, {
            content: [
              {
                type: 'text',
                text: JSON.stringify(tasks, null, 2)
              }
            ]
          })

        case 'todoist_create_task':
          const newTask = await this.todoistClient.createTask(args)
          return this.createResponse(requestId, {
            content: [
              {
                type: 'text',
                text: `Task created successfully: ${newTask.content} (ID: ${newTask.id})`
              }
            ]
          })

        case 'todoist_update_task':
          const updatedTask = await this.todoistClient.updateTask(args.task_id, args)
          return this.createResponse(requestId, {
            content: [
              {
                type: 'text',
                text: `Task updated successfully: ${updatedTask.content} (ID: ${updatedTask.id})`
              }
            ]
          })

        case 'todoist_close_task':
          await this.todoistClient.closeTask(args.task_id)
          return this.createResponse(requestId, {
            content: [
              {
                type: 'text',
                text: `Task ${args.task_id} marked as completed`
              }
            ]
          })

        case 'todoist_get_projects':
          const projects = await this.todoistClient.getProjects()
          return this.createResponse(requestId, {
            content: [
              {
                type: 'text',
                text: JSON.stringify(projects, null, 2)
              }
            ]
          })

        default:
          return this.createErrorResponse(requestId, {
            code: -32601,
            message: `Unknown tool: ${toolName}`
          })
      }
    } catch (error) {
      return this.createErrorResponse(requestId, {
        code: -32603,
        message: `Tool execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      })
    }
  }

  private async handleResourceRead(uri: string, requestId: any): Promise<MCPResponse> {
    if (!this.todoistClient) {
      return this.createErrorResponse(requestId, {
        code: -32603,
        message: 'Todoist client not initialized - API token required'
      })
    }

    try {
      switch (uri) {
        case 'todoist://tasks':
          const tasks = await this.todoistClient.getTasks()
          return this.createResponse(requestId, {
            contents: [
              {
                uri,
                mimeType: 'application/json',
                text: JSON.stringify(tasks, null, 2)
              }
            ]
          })

        case 'todoist://projects':
          const projects = await this.todoistClient.getProjects()
          return this.createResponse(requestId, {
            contents: [
              {
                uri,
                mimeType: 'application/json',
                text: JSON.stringify(projects, null, 2)
              }
            ]
          })

        default:
          return this.createErrorResponse(requestId, {
            code: -32602,
            message: `Unknown resource URI: ${uri}`
          })
      }
    } catch (error) {
      return this.createErrorResponse(requestId, {
        code: -32603,
        message: `Resource read failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      })
    }
  }

  private async handlePromptGet(promptName: string, args: any, requestId: any): Promise<MCPResponse> {
    if (!this.todoistClient) {
      return this.createErrorResponse(requestId, {
        code: -32603,
        message: 'Todoist client not initialized - API token required'
      })
    }

    try {
      switch (promptName) {
        case 'task_summary':
          const taskIds = args?.task_ids || []
          const tasks = []
          for (const taskId of taskIds) {
            try {
              const task = await this.todoistClient.getTask(taskId)
              tasks.push(task)
            } catch (error) {
              // Skip invalid task IDs
            }
          }
          
          return this.createResponse(requestId, {
            name: promptName,
            description: 'Task summary generated',
            messages: [
              {
                role: 'user',
                content: {
                  type: 'text',
                  text: `Here is a summary of ${tasks.length} tasks:\n\n${tasks.map(t => `- ${t.content} (Priority: ${t.priority}, Completed: ${t.is_completed})`).join('\n')}`
                }
              }
            ]
          })

        case 'project_analysis':
          const projectId = args?.project_id
          if (!projectId) {
            return this.createErrorResponse(requestId, {
              code: -32602,
              message: 'project_id is required'
            })
          }

          const projectTasks = await this.todoistClient.getTasks({ project_id: projectId })
          const completedTasks = projectTasks.filter(t => t.is_completed).length
          const totalTasks = projectTasks.length
          const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0

          return this.createResponse(requestId, {
            name: promptName,
            description: 'Project analysis generated',
            messages: [
              {
                role: 'user',
                content: {
                  type: 'text',
                  text: `Project Analysis for ${projectId}:\n\n- Total tasks: ${totalTasks}\n- Completed tasks: ${completedTasks}\n- Completion rate: ${completionRate}%\n- High priority tasks: ${projectTasks.filter(t => t.priority >= 3).length}`
                }
              }
            ]
          })

        default:
          return this.createErrorResponse(requestId, {
            code: -32601,
            message: `Unknown prompt: ${promptName}`
          })
      }
    } catch (error) {
      return this.createErrorResponse(requestId, {
        code: -32603,
        message: `Prompt execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      })
    }
  }

  validateRequest(request: any): ValidationResult {
    if (!request || typeof request !== 'object' || Array.isArray(request)) {
      return {
        isValid: false,
        error: {
          code: -32600,
          message: 'Invalid Request'
        }
      }
    }

    if (request.jsonrpc !== '2.0') {
      return {
        isValid: false,
        error: {
          code: -32600,
          message: 'Invalid Request'
        }
      }
    }

    if (!('id' in request)) {
      return {
        isValid: false,
        error: {
          code: -32600,
          message: 'Invalid Request'
        }
      }
    }

    if (!request.method) {
      return {
        isValid: false,
        error: {
          code: -32600,
          message: 'Invalid Request'
        }
      }
    }

    return {
      isValid: true
    }
  }

  createResponse(id: any, result: any): MCPResponse {
    return {
      jsonrpc: '2.0',
      id,
      result
    }
  }

  createErrorResponse(id: any, error: MCPError): MCPResponse {
    return {
      jsonrpc: '2.0',
      id: id === null ? 0 : id,
      error
    }
  }
}