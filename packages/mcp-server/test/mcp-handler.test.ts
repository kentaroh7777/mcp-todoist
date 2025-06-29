import { describe, it, expect, beforeEach } from 'vitest'
import { MCPProtocolHandler } from '../server/mcp-handler'

describe('MCPProtocolHandler', () => {
  let handler: MCPProtocolHandler

  beforeEach(() => {
    handler = new MCPProtocolHandler()
  })

  describe('handleRequest', () => {
    it('should handle initialize request correctly', async () => {
      const request = {
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
          protocolVersion: '2024-11-05',
          capabilities: {},
          clientInfo: { name: 'test-client', version: '1.0.0' }
        }
      }

      const response = await handler.handleRequest(request)

      expect(response).toEqual({
        jsonrpc: '2.0',
        id: 1,
        result: {
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
      })
    })

    it('should return error for unknown method', async () => {
      const request = {
        jsonrpc: '2.0',
        id: 1,
        method: 'unknown_method',
        params: {}
      }

      const response = await handler.handleRequest(request)

      expect(response).toEqual({
        jsonrpc: '2.0',
        id: 1,
        error: {
          code: -32601,
          message: 'Method not found'
        }
      })
    })

    it('should handle invalid request format', async () => {
      const request = {
        jsonrpc: '1.0',
        id: 1,
        method: 'initialize',
        params: {}
      }

      const response = await handler.handleRequest(request)

      expect(response).toEqual({
        jsonrpc: '2.0',
        id: 1,
        error: {
          code: -32600,
          message: 'Invalid Request'
        }
      })
    })

    it('should handle request without id', async () => {
      const request = {
        jsonrpc: '2.0',
        method: 'initialize',
        params: {}
      }

      const response = await handler.handleRequest(request)

      expect(response).toEqual({
        jsonrpc: '2.0',
        id: 0,
        error: {
          code: -32600,
          message: 'Invalid Request'
        }
      })
    })
  })

  describe('validateRequest', () => {
    it('should validate correct request format', () => {
      const request = {
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {}
      }

      const result = handler.validateRequest(request)

      expect(result.isValid).toBe(true)
      expect(result.error).toBeUndefined()
    })

    it('should reject wrong jsonrpc version', () => {
      const request = {
        jsonrpc: '1.0',
        id: 1,
        method: 'initialize',
        params: {}
      }

      const result = handler.validateRequest(request)

      expect(result.isValid).toBe(false)
      expect(result.error?.code).toBe(-32600)
      expect(result.error?.message).toBe('Invalid Request')
    })

    it('should reject request without id', () => {
      const request = {
        jsonrpc: '2.0',
        method: 'initialize',
        params: {}
      }

      const result = handler.validateRequest(request)

      expect(result.isValid).toBe(false)
      expect(result.error?.code).toBe(-32600)
    })

    it('should reject request without method', () => {
      const request = {
        jsonrpc: '2.0',
        id: 1,
        params: {}
      }

      const result = handler.validateRequest(request)

      expect(result.isValid).toBe(false)
      expect(result.error?.code).toBe(-32600)
    })

    it('should reject non-object requests - null', () => {
      const result = handler.validateRequest(null)

      expect(result.isValid).toBe(false)
      expect(result.error?.code).toBe(-32600)
    })

    it('should reject non-object requests - string', () => {
      const result = handler.validateRequest('invalid')

      expect(result.isValid).toBe(false)
      expect(result.error?.code).toBe(-32600)
    })

    it('should reject non-object requests - number', () => {
      const result = handler.validateRequest(123)

      expect(result.isValid).toBe(false)
      expect(result.error?.code).toBe(-32600)
    })

    it('should reject non-object requests - array', () => {
      const result = handler.validateRequest([])

      expect(result.isValid).toBe(false)
      expect(result.error?.code).toBe(-32600)
    })
  })

  describe('tool visibility', () => {
    it('should return only visible tools in tools/list', async () => {
      const request = {
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/list',
        params: {}
      }

      const response = await handler.handleRequest(request)

      expect(response.result.tools).toEqual(expect.arrayContaining([
        expect.objectContaining({ name: 'todoist_get_tasks' }),
        expect.objectContaining({ name: 'todoist_create_task' }),
        expect.objectContaining({ name: 'todoist_update_task' }),
        expect.objectContaining({ name: 'todoist_close_task' }),
        expect.objectContaining({ name: 'todoist_get_projects' }),
        expect.objectContaining({ name: 'todoist_move_task' })
      ]))

      // 非公開ツールが含まれていないことを確認
      const toolNames = response.result.tools.map((tool: any) => tool.name)
      expect(toolNames).not.toContain('todoist_create_project')
      expect(toolNames).not.toContain('todoist_update_project')
      expect(toolNames).not.toContain('todoist_delete_project')
    })

    it('should reject calls to hidden tools', async () => {
      const request = {
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/call',
        params: {
          name: 'todoist_create_project',
          arguments: { name: 'test project' }
        }
      }

      const response = await handler.handleRequest(request)

      expect(response).toEqual({
        jsonrpc: '2.0',
        id: 1,
        error: {
          code: -32603,
          message: 'Tool not found'
        }
      })
    })

    it('should reject calls to todoist_update_project', async () => {
      const request = {
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/call',
        params: {
          name: 'todoist_update_project',
          arguments: { project_id: '123', name: 'updated name' }
        }
      }

      const response = await handler.handleRequest(request)

      expect(response).toEqual({
        jsonrpc: '2.0',
        id: 1,
        error: {
          code: -32603,
          message: 'Tool not found'
        }
      })
    })

    it('should reject calls to todoist_delete_project', async () => {
      const request = {
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/call',
        params: {
          name: 'todoist_delete_project',
          arguments: { project_id: '123' }
        }
      }

      const response = await handler.handleRequest(request)

      expect(response).toEqual({
        jsonrpc: '2.0',
        id: 1,
        error: {
          code: -32603,
          message: 'Tool not found'
        }
      })
    })
  })

  describe('createResponse', () => {
    it('should create correct response format', () => {
      const result = { test: 'data' }
      const id = 1

      const response = handler.createResponse(id, result)

      expect(response).toEqual({
        jsonrpc: '2.0',
        id: 1,
        result: { test: 'data' }
      })
    })

    it('should handle string id', () => {
      const result = { test: 'data' }
      const id = 'test-id'

      const response = handler.createResponse(id, result)

      expect(response).toEqual({
        jsonrpc: '2.0',
        id: 'test-id',
        result: { test: 'data' }
      })
    })
  })

  describe('createErrorResponse', () => {
    it('should create correct error response format', () => {
      const error = { code: -32600, message: 'Invalid Request' }
      const id = 1

      const response = handler.createErrorResponse(id, error)

      expect(response).toEqual({
        jsonrpc: '2.0',
        id: 1,
        error: { code: -32600, message: 'Invalid Request' }
      })
    })

    it('should handle null id by converting to 0', () => {
      const error = { code: -32600, message: 'Invalid Request' }
      const id = null

      const response = handler.createErrorResponse(id, error)

      expect(response).toEqual({
        jsonrpc: '2.0',
        id: 0,
        error: { code: -32600, message: 'Invalid Request' }
      })
    })
  })
})