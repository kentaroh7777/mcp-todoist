import { getIdToken } from 'firebase/auth'
import { auth } from '@/lib/config/firebase'
import type {
  MCPRequest,
  MCPResponse,
  MCPError,
  MCPInitializeResponse,
  MCPTool,
  MCPResource,
  MCPResourceContent,
  MCPPrompt,
  MCPPromptContent,
  MCPConnectionState,
  MCPEventMap,
  MCPClientConfig,
  MCPServerInfoExtended
} from '@/types/mcp'

export class MCPClient {
  private ws: WebSocket | null = null
  private connected: boolean = false
  private serverUrl: string = ''
  private connectionState: MCPConnectionState = 'disconnected'
  private eventHandlers: Map<string, Function[]> = new Map()
  private requestId: number = 0
  private pendingRequests: Map<string, {resolve: Function, reject: Function, timeout: NodeJS.Timeout}> = new Map()
  private serverInfo: MCPServerInfoExtended | null = null
  private authToken: string | null = null
  private config: MCPClientConfig
  private reconnectAttempts: number = 0
  private reconnectTimer: NodeJS.Timeout | null = null

  constructor(config: MCPClientConfig = {}) {
    this.config = {
      reconnectInterval: 5000,
      maxReconnectAttempts: 3,
      requestTimeout: 30000,
      enableLogging: false,
      ...config
    }
  }

  async connect(serverUrl: string): Promise<void> {
    this.serverUrl = serverUrl
    this.connectionState = 'connecting'
    
    try {
      // Firebase認証トークン取得
      if (auth.currentUser) {
        this.authToken = await getIdToken(auth.currentUser)
      } else {
        throw new Error('認証に失敗しました')
      }

      // WebSocket接続確立
      await this.establishWebSocketConnection()
      
      this.connected = true
      this.connectionState = 'connected'
      this.reconnectAttempts = 0
      this.emit('connect')
      
    } catch (error) {
      this.connectionState = 'disconnected'
      this.connected = false
      throw new Error(`MCP接続に失敗しました: ${error instanceof Error ? error.message : '不明なエラー'}`)
    }
  }

  private async establishWebSocketConnection(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.serverUrl)

        const timeout = setTimeout(() => {
          reject(new Error('WebSocket接続がタイムアウトしました'))
        }, 10000)

        this.ws.onopen = () => {
          clearTimeout(timeout)
          this.setupWebSocketHandlers()
          resolve()
        }

        this.ws.onerror = (error) => {
          clearTimeout(timeout)
          reject(new Error(`WebSocket接続エラー: ${error}`))
        }

        this.ws.onclose = (event) => {
          clearTimeout(timeout)
          if (!this.connected) {
            reject(new Error(`WebSocket接続が閉じられました: ${event.reason}`))
          } else {
            this.handleDisconnection(event)
          }
        }

      } catch (error) {
        reject(error)
      }
    })
  }

  private setupWebSocketHandlers(): void {
    if (!this.ws) return

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        this.handleMessage(data)
      } catch (error) {
        this.emit('error', new Error('無効なレスポンス形式です'))
      }
    }

    this.ws.onerror = (error) => {
      this.emit('error', error)
    }

    this.ws.onclose = (event) => {
      this.handleDisconnection(event)
    }
  }

  private handleMessage(data: any): void {
    if (data.id && this.pendingRequests.has(data.id.toString())) {
      // レスポンスの処理
      const request = this.pendingRequests.get(data.id.toString())!
      clearTimeout(request.timeout)
      this.pendingRequests.delete(data.id.toString())

      if (data.error) {
        request.reject(new Error(data.error.message))
      } else {
        request.resolve(data.result)
      }
    } else if (data.method) {
      // 通知の処理
      this.emit('notification', data)
    }
  }

  private handleDisconnection(event: CloseEvent): void {
    this.connected = false
    this.connectionState = 'disconnected'
    this.ws = null
    
    // 保留中のリクエストをすべてエラーにする
    this.pendingRequests.forEach(({ reject, timeout }) => {
      clearTimeout(timeout)
      reject(new Error('接続が切断されました'))
    })
    this.pendingRequests.clear()

    this.emit('disconnect')

    // 自動再接続の試行
    if (this.reconnectAttempts < (this.config.maxReconnectAttempts || 3)) {
      this.connectionState = 'reconnecting'
      this.reconnectAttempts++
      
      this.reconnectTimer = setTimeout(() => {
        this.connect(this.serverUrl).catch(() => {
          // 再接続失敗時は何もしない（最大試行回数に達したら停止）
        })
      }, this.config.reconnectInterval || 5000)
      
      this.emit('reconnect')
    }
  }

  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }

    if (this.ws) {
      this.ws.close()
      this.ws = null
    }

    this.connected = false
    this.connectionState = 'disconnected'
    this.reconnectAttempts = 0
    this.serverInfo = null
    
    // 保留中のリクエストをすべてキャンセル
    this.pendingRequests.forEach(({ reject, timeout }) => {
      clearTimeout(timeout)
      reject(new Error('接続が切断されました'))
    })
    this.pendingRequests.clear()

    this.emit('disconnect')
  }

  isConnected(): boolean {
    return this.connected
  }

  getConnectionState(): MCPConnectionState {
    return this.connectionState
  }

  getServerInfo(): MCPServerInfoExtended | null {
    return this.serverInfo
  }

  async initialize(): Promise<MCPInitializeResponse> {
    const result = await this.sendRequest('initialize', {
      protocolVersion: '2024-11-05',
      clientInfo: {
        name: 'mcp-todoist-web-ui',
        version: '1.0.0'
      },
      capabilities: {}
    })

    this.serverInfo = {
      ...result.serverInfo,
      protocolVersion: result.protocolVersion,
      capabilities: result.capabilities,
      connected: true,
      lastConnected: new Date()
    }

    return result
  }

  async listTools(): Promise<MCPTool[]> {
    const result = await this.sendRequest('tools/list')
    return result.tools || []
  }

  async callTool(name: string, args: Record<string, any>): Promise<any> {
    return await this.sendRequest('tools/call', {
      name,
      arguments: args
    })
  }

  async listResources(): Promise<MCPResource[]> {
    const result = await this.sendRequest('resources/list')
    return result.resources || []
  }

  async readResource(uri: string): Promise<MCPResourceContent> {
    const result = await this.sendRequest('resources/read', { uri })
    return result.contents?.[0] || { uri, mimeType: 'text/plain', text: '' }
  }

  async listPrompts(): Promise<MCPPrompt[]> {
    const result = await this.sendRequest('prompts/list')
    return result.prompts || []
  }

  async getPrompt(name: string, args?: Record<string, any>): Promise<MCPPromptContent> {
    return await this.sendRequest('prompts/get', {
      name,
      arguments: args || {}
    })
  }

  on<K extends keyof MCPEventMap>(event: K, callback: MCPEventMap[K]): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, [])
    }
    this.eventHandlers.get(event)!.push(callback)
  }

  off<K extends keyof MCPEventMap>(event: K, callback: MCPEventMap[K]): void {
    const handlers = this.eventHandlers.get(event)
    if (handlers) {
      const index = handlers.indexOf(callback)
      if (index !== -1) {
        handlers.splice(index, 1)
      }
    }
  }

  private emit<K extends keyof MCPEventMap>(event: K, ...args: any[]): void {
    const handlers = this.eventHandlers.get(event)
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(...args)
        } catch (error) {
          console.error(`Error in event handler for ${event}:`, error)
        }
      })
    }
  }

  private async sendRequest(method: string, params?: any): Promise<any> {
    if (!this.connected || !this.ws) {
      throw new Error('MCPサーバーに接続されていません')
    }

    const id = ++this.requestId
    const request: MCPRequest = {
      jsonrpc: '2.0',
      id,
      method,
      params
    }

    // 認証トークンをヘッダーまたはパラメータに追加
    if (this.authToken && params) {
      params.auth_token = this.authToken
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(id.toString())
        reject(new Error('リクエストがタイムアウトしました'))
      }, this.config.requestTimeout || 30000)

      this.pendingRequests.set(id.toString(), { resolve, reject, timeout })

      try {
        this.ws!.send(JSON.stringify(request))
      } catch (error) {
        clearTimeout(timeout)
        this.pendingRequests.delete(id.toString())
        reject(new Error(`リクエスト送信に失敗しました: ${error instanceof Error ? error.message : '不明なエラー'}`))
      }
    })
  }

  async refreshAuthToken(): Promise<void> {
    if (auth.currentUser) {
      try {
        this.authToken = await getIdToken(auth.currentUser, true)
      } catch (error) {
        throw new Error('認証トークンの更新に失敗しました')
      }
    }
  }

  handleAuthStateChange(user: any): void {
    if (!user) {
      // ログアウト時は接続を切断
      this.disconnect()
    }
  }
}

// シングルトンクライアントのエクスポート（オプション）
export const mcpClient = new MCPClient()

export default MCPClient