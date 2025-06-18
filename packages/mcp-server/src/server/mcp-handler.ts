import { MCPRequest, MCPResponse, MCPError, InitializeResult, ValidationResult } from '../types/mcp'

export class MCPProtocolHandler {
  async handleRequest(request: any): Promise<MCPResponse> {
    const validationResult = this.validateRequest(request)
    
    if (!validationResult.isValid) {
      return this.createErrorResponse(request?.id ?? 0, validationResult.error!)
    }

    const mcpRequest = request as MCPRequest

    switch (mcpRequest.method) {
      case 'initialize':
        const initializeResult: InitializeResult = {
          protocolVersion: '2024-11-05',
          capabilities: {},
          serverInfo: {
            name: 'mcp-todoist',
            version: '1.0.0'
          }
        }
        return this.createResponse(mcpRequest.id, initializeResult)
      
      default:
        return this.createErrorResponse(mcpRequest.id, {
          code: -32601,
          message: 'Method not found'
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