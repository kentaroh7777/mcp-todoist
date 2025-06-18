import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import nock from 'nock';
import { MCPServer } from '../../server/index';
import { TodoistClient } from '../../src/adapters/todoist-client';

describe('MCP Server + Todoist Integration', () => {
  let server: MCPServer;
  let app: any;

  beforeEach(() => {
    server = new MCPServer();
    app = (server as any).app;
    nock.cleanAll();
  });

  afterEach(() => {
    nock.cleanAll();
  });

  it('should handle initialize request', async () => {
    const response = await request(app)
      .post('/mcp')
      .send({
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
        params: {}
      })
      .expect(200);

    expect(response.body.jsonrpc).toBe("2.0");
    expect(response.body.id).toBe(1);
    expect(response.body.result).toHaveProperty('protocolVersion');
    expect(response.body.result).toHaveProperty('capabilities');
    expect(response.body.result).toHaveProperty('serverInfo');
  });

  it('should create TodoistClient instance', () => {
    const client = new TodoistClient('test-token');
    expect(client).toBeDefined();
  });

  it('should handle MCP protocol errors gracefully', async () => {
    const response = await request(app)
      .post('/mcp')
      .send({
        jsonrpc: "2.0",
        id: 2,
        method: "non_existent_method",
        params: {}
      })
      .expect(200);

    expect(response.body.jsonrpc).toBe("2.0");
    expect(response.body.id).toBe(2);
    expect(response.body.error).toBeDefined();
    expect(response.body.error.code).toBe(-32601);
    expect(response.body.error.message).toBe('Method not found');
  });

  it('should handle malformed JSON requests gracefully', async () => {
    const response = await request(app)
      .post('/mcp')
      .send('invalid json')
      .set('Content-Type', 'application/json');

    // Server should still respond (may be 200 with error or 400)
    expect([200, 400]).toContain(response.status);
    if (response.status === 200) {
      expect(response.body.error).toBeDefined();
    }
  });

  it('should validate TodoistClient error handling', () => {
    expect(() => {
      new TodoistClient('');
    }).toThrow('Todoist API token is required');

    expect(() => {
      new TodoistClient(null as any);
    }).toThrow('Todoist API token is required');
  });
}); 