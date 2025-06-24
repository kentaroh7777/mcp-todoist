import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import request from 'supertest'
import { MCPServer } from '../../server/index'

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

  beforeEach(() => {
    // テスト間でサーバー状態をクリーンアップ（必要に応じて）
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

    it('should handle initialize with minimal params', async () => {
      const initializeRequest = {
        jsonrpc: '2.0',
        id: 2,
        method: 'initialize',
        params: {}
      }

      const response = await request(app)
        .post('/mcp')
        .send(initializeRequest)
        .expect(200)

      expect(response.body.jsonrpc).toBe('2.0')
      expect(response.body.id).toBe(2)
      expect(response.body.result).toBeDefined()
      expect(response.body.result.protocolVersion).toBe('2024-11-05')
      expect(response.body.result.serverInfo.name).toBe('mcp-todoist')
    })

    it('should return error for invalid JSON-RPC version', async () => {
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

    it('should return error for missing id', async () => {
      const invalidRequest = {
        jsonrpc: '2.0',
        method: 'initialize',
        params: {}
      }

      const response = await request(app)
        .post('/mcp')
        .send(invalidRequest)
        .expect(200)

      expect(response.body).toEqual({
        jsonrpc: '2.0',
        id: 0,
        error: {
          code: -32600,
          message: 'Invalid Request'
        }
      })
    })

    it('should return error for missing method', async () => {
      const invalidRequest = {
        jsonrpc: '2.0',
        id: 1,
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
      const response = await request(app)
        .post('/mcp')
        .send('invalid json')
        .set('Content-Type', 'application/json')
        .expect(400)

      expect(response.text).toBe('Bad Request')
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

    it('should handle empty request body', async () => {
      const response = await request(app)
        .post('/mcp')
        .send()
        .expect(200)

      expect(response.body).toEqual({
        jsonrpc: '2.0',
        id: 0,
        error: {
          code: -32600,
          message: 'Invalid Request'
        }
      })
    })

    it('should handle null request', async () => {
      const response = await request(app)
        .post('/mcp')
        .send(null as any)
        .expect(200)

      expect(response.body.jsonrpc).toBe('2.0')
      expect(response.body.id).toBe(0)
      expect(response.body.error).toBeDefined()
      expect(response.body.error.code).toBe(-32600)
    })

    it('should handle array request (not supported)', async () => {
      const response = await request(app)
        .post('/mcp')
        .send([])
        .expect(200)

      expect(response.body.jsonrpc).toBe('2.0')
      expect(response.body.id).toBe(0)
      expect(response.body.error).toBeDefined()
      expect(response.body.error.code).toBe(-32600)
    })

    it('should handle string ID correctly', async () => {
      const initializeRequest = {
        jsonrpc: '2.0',
        id: 'string-id',
        method: 'initialize',
        params: {}
      }

      const response = await request(app)
        .post('/mcp')
        .send(initializeRequest)
        .expect(200)

      expect(response.body.jsonrpc).toBe('2.0')
      expect(response.body.id).toBe('string-id')
      expect(response.body.result).toBeDefined()
    })

    it('should handle numeric ID correctly', async () => {
      const initializeRequest = {
        jsonrpc: '2.0',
        id: 42,
        method: 'initialize',
        params: {}
      }

      const response = await request(app)
        .post('/mcp')
        .send(initializeRequest)
        .expect(200)

      expect(response.body.jsonrpc).toBe('2.0')
      expect(response.body.id).toBe(42)
      expect(response.body.result).toBeDefined()
    })

    it('should handle concurrent requests correctly', async () => {
      const requests = []
      
      for (let i = 0; i < 5; i++) {
        const req = request(app)
          .post('/mcp')
          .send({
            jsonrpc: '2.0',
            id: i,
            method: 'initialize',
            params: {}
          })

        requests.push(req)
      }

      const responses = await Promise.all(requests)
      
      expect(responses).toHaveLength(5)
      responses.forEach((response, index) => {
        expect(response.status).toBe(200)
        expect(response.body.id).toBe(index)
        expect(response.body.result).toBeDefined()
      })
    })

    it('should maintain response format consistency', async () => {
      const testCases = [
        { id: 1, method: 'initialize' },
        { id: 2, method: 'nonexistent_method' },
        { id: 'test', method: 'initialize' }
      ]

      for (const testCase of testCases) {
        const response = await request(app)
          .post('/mcp')
          .send({
            jsonrpc: '2.0',
            id: testCase.id,
            method: testCase.method,
            params: {}
          })
          .expect(200)

        expect(response.body.jsonrpc).toBe('2.0')
        expect(response.body.id).toBe(testCase.id)
        expect(response.body).toHaveProperty(
          testCase.method === 'initialize' ? 'result' : 'error'
        )
      }
    })

    it('should handle content-type variations', async () => {
      const initializeRequest = {
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {}
      }

      // Test with explicit content-type
      const response1 = await request(app)
        .post('/mcp')
        .set('Content-Type', 'application/json')
        .send(initializeRequest)
        .expect(200)

      expect(response1.body.result).toBeDefined()

      // Test without explicit content-type (should be auto-detected)
      const response2 = await request(app)
        .post('/mcp')
        .send(initializeRequest)
        .expect(200)

      expect(response2.body.result).toBeDefined()
    })

    it('should handle large request payloads', async () => {
      const largeParams = {
        test: 'x'.repeat(10000) // 10KB string
      }

      const response = await request(app)
        .post('/mcp')
        .send({
          jsonrpc: '2.0',
          id: 1,
          method: 'initialize',
          params: largeParams
        })
        .expect(200)

      expect(response.body.result).toBeDefined()
    })
  })

  describe('Error recovery', () => {
    it('should recover from internal errors', async () => {
      // First, cause an error
      await request(app)
        .post('/mcp')
        .send('invalid json')
        .set('Content-Type', 'application/json')
        .expect(400)

      // Then, verify the server still works
      const response = await request(app)
        .post('/mcp')
        .send({
          jsonrpc: '2.0',
          id: 1,
          method: 'initialize',
          params: {}
        })
        .expect(200)

      expect(response.body.result).toBeDefined()
    })

    it('should handle rapid successive requests', async () => {
      const promises = []
      
      for (let i = 0; i < 10; i++) {
        promises.push(
          request(app)
            .post('/mcp')
            .send({
              jsonrpc: '2.0',
              id: `rapid-${i}`,
              method: 'initialize',
              params: {}
            })
        )
      }

      const responses = await Promise.allSettled(promises)
      
      // All requests should succeed
      responses.forEach((result, index) => {
        expect(result.status).toBe('fulfilled')
        if (result.status === 'fulfilled') {
          expect(result.value.status).toBe(200)
          expect(result.value.body.id).toBe(`rapid-${index}`)
        }
      })
    })
  })

  describe('Performance', () => {
    it('should respond within reasonable time', async () => {
      const startTime = Date.now()
      
      await request(app)
        .post('/mcp')
        .send({
          jsonrpc: '2.0',
          id: 1,
          method: 'initialize',
          params: {}
        })
        .expect(200)

      const responseTime = Date.now() - startTime
      expect(responseTime).toBeLessThan(1000) // Should respond in under 1 second
    })

    it('should handle load efficiently', async () => {
      const startTime = Date.now()
      const requests = []
      
      for (let i = 0; i < 20; i++) {
        requests.push(
          request(app)
            .post('/mcp')
            .send({
              jsonrpc: '2.0',
              id: i,
              method: 'initialize',
              params: {}
            })
        )
      }

      await Promise.all(requests)
      
      const totalTime = Date.now() - startTime
      expect(totalTime).toBeLessThan(5000) // 20 requests should complete in under 5 seconds
    })
  })
})