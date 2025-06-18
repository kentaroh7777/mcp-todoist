import express, { Express, Request, Response } from 'express'
import { MCPProtocolHandler } from './mcp-handler'

export class MCPServer {
  public app: Express
  private handler: MCPProtocolHandler

  constructor() {
    this.app = express()
    this.handler = new MCPProtocolHandler()
    this.setupMiddleware()
    this.setupRoutes()
  }

  private setupMiddleware() {
    this.app.use(express.json())
  }

  private setupRoutes() {
    this.app.post('/mcp', async (req: Request, res: Response) => {
      try {
        const response = await this.handler.handleRequest(req.body)
        res.status(200).json(response)
      } catch (error) {
        res.status(500).json({
          jsonrpc: '2.0',
          id: req.body?.id ?? 0,
          error: {
            code: -32603,
            message: 'Internal error'
          }
        })
      }
    })

    // Handle JSON parse errors
    this.app.use((error: any, req: Request, res: Response, next: any) => {
      if (error instanceof SyntaxError && 'body' in error) {
        return res.status(400).send('Bad Request')
      }
      next()
    })
  }

  getApp(): Express {
    return this.app
  }

  async close(): Promise<void> {
    // No cleanup needed for this minimal implementation
  }
}