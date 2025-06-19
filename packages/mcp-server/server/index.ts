import express, { Express, Request, Response } from 'express'
import { MCPProtocolHandler } from './mcp-handler'

export class MCPServer {
  public app: Express
  private handler: MCPProtocolHandler

  constructor(todoistApiToken?: string) {
    this.app = express()
    this.handler = new MCPProtocolHandler(todoistApiToken)
    this.setupMiddleware()
    this.setupRoutes()
  }

  private setupMiddleware() {
    // Custom JSON middleware with error handling
    this.app.use((req: Request, res: Response, next) => {
      if (req.headers['content-type']?.includes('application/json')) {
        let body = ''
        req.on('data', chunk => {
          body += chunk.toString()
        })
        req.on('end', () => {
          if (body.trim() === '') {
            req.body = undefined
            next()
            return
          }
          try {
            req.body = JSON.parse(body)
            next()
          } catch (error) {
            res.status(400).send('Bad Request')
            return
          }
        })
        req.on('error', () => {
          res.status(400).send('Bad Request')
        })
      } else {
        next()
      }
    })
    
    // CORS support
    this.app.use((req: Request, res: Response, next) => {
      res.header('Access-Control-Allow-Origin', '*')
      res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
      res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
      
      if (req.method === 'OPTIONS') {
        res.sendStatus(200)
        return
      }
      next()
    })
  }

  private setupRoutes() {
    // Health check endpoint
    this.app.get('/health', (req: Request, res: Response) => {
      res.json({ status: 'healthy', timestamp: new Date().toISOString() })
    })

    // MCP endpoint
    this.app.post('/mcp', async (req: Request, res: Response) => {
      try {
        // Extract Todoist API token from headers if provided
        const todoistToken = req.headers['x-todoist-token'] as string
        if (todoistToken && !this.handler['todoistClient']) {
          // Update handler with new token if needed
          this.handler = new MCPProtocolHandler(todoistToken)
        }

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

    // Error handling will be implemented separately if needed
  }

  getApp(): Express {
    return this.app
  }

  async close(): Promise<void> {
    // No cleanup needed for this minimal implementation
  }
}