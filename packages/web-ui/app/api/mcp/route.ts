import { NextRequest, NextResponse } from 'next/server';
import { MCPServer, MCPRequest } from '@/lib/mcp/server';

const mcpServer = new MCPServer();

export async function POST(request: NextRequest) {
  try {
    const body: MCPRequest = await request.json();
    
    // MCPリクエストの基本的なバリデーション
    if (!body.jsonrpc || body.jsonrpc !== "2.0") {
      return NextResponse.json({
        jsonrpc: "2.0",
        id: body.id || null,
        error: {
          code: -32600,
          message: "Invalid Request: jsonrpc must be '2.0'"
        }
      }, { status: 400 });
    }

    if (!body.method) {
      return NextResponse.json({
        jsonrpc: "2.0",
        id: body.id || null,
        error: {
          code: -32600,
          message: "Invalid Request: method is required"
        }
      }, { status: 400 });
    }

    // MCPサーバーでリクエストを処理
    const response = await mcpServer.handleRequest(body);
    
    return NextResponse.json(response);
  } catch (error) {
    console.error('MCP API error:', error);
    
    return NextResponse.json({
      jsonrpc: "2.0",
      id: null,
      error: {
        code: -32700,
        message: "Parse error",
        data: error instanceof Error ? error.message : "Unknown error"
      }
    }, { status: 500 });
  }
}

// OPTIONSメソッドでCORSを処理
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
} 