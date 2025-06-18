import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import request from 'supertest'
import { MCPServer } from '../src/server/index'

describe('MCPServer Integration Tests', () => {
  let server: MCPServer
  let app: any

  beforeAll(async () => {
    server = new MCPServer()
    app = server.getApp()
  })

  afterAll(async () => {
    if (server) {
      await server.close()
    }
  })

  describe('HTTP /mcp endpoint', () => {
    it('should handle valid initialize request', async () => {
      const initializeRequest = {
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
          protocolVersion: '2024-11-05',
          capabilities: {},
          clientInfo: { name: 'test-client', version: '1.0.0' }
        }
      }

      const response = await request(app)
        .post('/mcp')
        .send(initializeRequest)
        .expect(200)

      expect(response.body).toEqual({
        jsonrpc: '2.0',
        id: 1,
        result: {
          protocolVersion: '2024-11-05',
          capabilities: {},
          serverInfo: {
            name: 'mcp-todoist',
            version: '1.0.0'
          }
        }
      })
    })

    it('should return error for invalid JSON-RPC request', async () => {
      const invalidRequest = {
        jsonrpc: '1.0',
        id: 1,
        method: 'initialize',
        params: {}
      }

      const response = await request(app)
        .post('/mcp')
        .send(invalidRequest)
        .expect(200)

      expect(response.body).toEqual({
        jsonrpc: '2.0',
        id: 1,
        error: {
          code: -32600,
          message: 'Invalid Request'
        }
      })
    })

    it('should handle malformed JSON with 400 error', async () => {
      await request(app)
        .post('/mcp')
        .send('invalid json')
        .set('Content-Type', 'application/json')
        .expect(400)
    })

    it('should return error for non-existent method', async () => {
      const unknownMethodRequest = {
        jsonrpc: '2.0',
        id: 1,
        method: 'nonexistent_method',
        params: {}
      }

      const response = await request(app)
        .post('/mcp')
        .send(unknownMethodRequest)
        .expect(200)

      expect(response.body).toEqual({
        jsonrpc: '2.0',
        id: 1,
        error: {
          code: -32601,
          message: 'Method not found'
        }
      })
    })

    it('should handle server errors gracefully', async () => {
      const request_causing_error = {
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: null
      }

      const response = await request(app)
        .post('/mcp')
        .send(request_causing_error)
        .expect(200)

      expect(response.body.jsonrpc).toBe('2.0')
      expect(response.body.id).toBe(1)
      expect(response.body.error).toBeDefined()
      expect(typeof response.body.error.code).toBe('number')
      expect(typeof response.body.error.message).toBe('string')
    })
  })
})