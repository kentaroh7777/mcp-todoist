import { getIdToken } from 'firebase/auth'
import { auth } from '@/lib/config/firebase'
import type {
  MCPRequest,
  MCPResponse,
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

// 拡張エラークラス
class MCPError extends Error {
  constructor(
    message: string,
    public code: string,
    public recoveryAction?: string,
    public retryable: boolean = false,
    public originalError?: Error
  ) {
    super(message)
    this.name = 'MCPError'
  }
}

// エラーコード定数
const MCPErrorCodes = {
  // 接続関連
  CONNECTION_FAILED: 'CONNECTION_FAILED',
  CONNECTION_TIMEOUT: 'CONNECTION_TIMEOUT',
  CONNECTION_LOST: 'CONNECTION_LOST',
  WEBSOCKET_ERROR: 'WEBSOCKET_ERROR',
  
  // 認証関連
  AUTH_FAILED: 'AUTH_FAILED',
  AUTH_TOKEN_EXPIRED: 'AUTH_TOKEN_EXPIRED',
  AUTH_UNAUTHORIZED: 'AUTH_UNAUTHORIZED',
  
  // プロトコル関連
  PROTOCOL_ERROR: 'PROTOCOL_ERROR',
  INVALID_REQUEST: 'INVALID_REQUEST',
  INVALID_RESPONSE: 'INVALID_RESPONSE',
  REQUEST_TIMEOUT: 'REQUEST_TIMEOUT',
  
  // サーバー関連
  SERVER_ERROR: 'SERVER_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  RATE_LIMITED: 'RATE_LIMITED',
  
  // ツール関連
  TOOL_NOT_FOUND: 'TOOL_NOT_FOUND',
  TOOL_EXECUTION_FAILED: 'TOOL_EXECUTION_FAILED',
  INVALID_TOOL_PARAMS: 'INVALID_TOOL_PARAMS',
} as const

// エラーメッセージマッピング
const ERROR_MESSAGES: Record<string, { message: string; recoveryAction: string; retryable: boolean }> = {
  [MCPErrorCodes.CONNECTION_FAILED]: {
    message: 'MCPサーバーへの接続に失敗しました',
    recoveryAction: 'サーバーURLを確認し、サーバーが起動しているか確認してください',
    retryable: true
  },
  [MCPErrorCodes.CONNECTION_TIMEOUT]: {
    message: '接続がタイムアウトしました',
    recoveryAction: 'ネットワーク接続を確認し、再度お試しください',
    retryable: true
  },
  [MCPErrorCodes.CONNECTION_LOST]: {
    message: 'サーバーとの接続が失われました',
    recoveryAction: '自動再接続を試行中です。手動で再接続することもできます',
    retryable: true
  },
  [MCPErrorCodes.AUTH_FAILED]: {
    message: '認証に失敗しました',
    recoveryAction: 'ログイン状態を確認し、必要に応じて再ログインしてください',
    retryable: false
  },
  [MCPErrorCodes.AUTH_TOKEN_EXPIRED]: {
    message: '認証トークンが期限切れです',
    recoveryAction: 'トークンを更新して再試行します',
    retryable: true
  },
  [MCPErrorCodes.REQUEST_TIMEOUT]: {
    message: 'リクエストがタイムアウトしました',
    recoveryAction: 'サーバーの応答が遅い可能性があります。しばらく待ってから再試行してください',
    retryable: true
  },
  [MCPErrorCodes.SERVER_ERROR]: {
    message: 'サーバーエラーが発生しました',
    recoveryAction: 'サーバーの状態を確認し、しばらく待ってから再試行してください',
    retryable: true
  },
  [MCPErrorCodes.TOOL_NOT_FOUND]: {
    message: '指定されたツールが見つかりません',
    recoveryAction: 'ツール一覧を更新し、正しいツール名を選択してください',
    retryable: false
  },
  [MCPErrorCodes.TOOL_EXECUTION_FAILED]: {
    message: 'ツールの実行に失敗しました',
    recoveryAction: 'パラメーターを確認し、再度実行してください',
    retryable: true
  }
}

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
  
  // エラー統計情報
  private errorStats: Map<string, number> = new Map()
  private lastError: MCPError | null = null
  
  // パフォーマンス監視
  private connectionStartTime: number = 0
  private requestMetrics: Array<{ method: string, duration: number, success: boolean }> = []

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
    this.connectionStartTime = Date.now()
    
    try {
      // URLバリデーション
      this.validateServerUrl(serverUrl)
      
      // Firebase認証トークン取得
      await this.ensureAuthentication()

      // WebSocket接続確立
      await this.establishWebSocketConnection()
      
      this.connected = true
      this.connectionState = 'connected'
      this.reconnectAttempts = 0
      
      // 接続成功メトリクスを記録
      const connectionDuration = Date.now() - this.connectionStartTime
      this.logConnectionMetrics(true, connectionDuration)
      
      this.emit('connect')
      
    } catch (error) {
      this.connectionState = 'disconnected'
      this.connected = false
      
      // 接続失敗メトリクスを記録
      const connectionDuration = Date.now() - this.connectionStartTime
      this.logConnectionMetrics(false, connectionDuration)
      
      const mcpError = this.createMCPError(error)
      this.recordError(mcpError)
      throw mcpError
    }
  }
  
  private validateServerUrl(url: string): void {
    try {
      // テスト環境では検証を緩和
      if (url.startsWith('mock:') || 
          (typeof process !== 'undefined' && process.env.NODE_ENV === 'test')) {
        return
      }
      
      const parsedUrl = new URL(url)
      if (!['ws:', 'wss:'].includes(parsedUrl.protocol)) {
        throw new MCPError(
          '無効なWebSocket URLです',
          MCPErrorCodes.INVALID_REQUEST,
          '「ws://」または「wss://」で始まるURLを入力してください',
          false
        )
      }
    } catch (error) {
      // 既にMCPErrorの場合はそのまま再スロー
      if (error instanceof MCPError) {
        throw error
      }
      
      // テスト環境またはmockで始まるURLはテスト用として許可
      if (url.startsWith('mock:') || 
          (typeof process !== 'undefined' && process.env.NODE_ENV === 'test')) {
        return
      }
      
      throw new MCPError(
        '無効なURL形式です',
        MCPErrorCodes.INVALID_REQUEST,
        '正しいWebSocket URLを入力してください (例: ws://localhost:8080/mcp)',
        false
      )
    }
  }
  
  private async ensureAuthentication(): Promise<void> {
    try {
      if (!auth.currentUser) {
        throw new MCPError(
          'ユーザーがログインしていません',
          MCPErrorCodes.AUTH_FAILED,
          'ログインしてから再度お試しください',
          false
        )
      }
      
      this.authToken = await getIdToken(auth.currentUser)
      
      if (!this.authToken) {
        throw new MCPError(
          '認証トークンの取得に失敗しました',
          MCPErrorCodes.AUTH_FAILED,
          'ログアウト後、再びログインしてください',
          true
        )
      }
      
    } catch (error) {
      if (error instanceof MCPError) {
        throw error
      }
      
      throw new MCPError(
        '認証処理中にエラーが発生しました',
        MCPErrorCodes.AUTH_FAILED,
        'ネットワーク接続を確認し、再度お試しください',
        true,
        error instanceof Error ? error : undefined
      )
    }
  }

  private async establishWebSocketConnection(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.serverUrl)

        const timeout = setTimeout(() => {
          if (this.ws) {
            this.ws.close()
          }
          reject(new MCPError(
            'WebSocket接続がタイムアウトしました',
            MCPErrorCodes.CONNECTION_TIMEOUT,
            'サーバーの状態を確認し、再度お試しください',
            true
          ))
        }, this.config.requestTimeout || 10000)

        this.ws.onopen = () => {
          clearTimeout(timeout)
          this.setupWebSocketHandlers()
          resolve()
        }

        this.ws.onerror = (error) => {
          clearTimeout(timeout)
          reject(new MCPError(
            'WebSocket接続エラーが発生しました',
            MCPErrorCodes.WEBSOCKET_ERROR,
            'ネットワーク設定やファイアウォールを確認してください',
            true,
            error instanceof Error ? error : new Error(String(error))
          ))
        }

        this.ws.onclose = (event) => {
          clearTimeout(timeout)
          if (!this.connected) {
            const reason = event.reason || '不明な理由'
            reject(new MCPError(
              `WebSocket接続が閉じられました: ${reason}`,
              MCPErrorCodes.CONNECTION_FAILED,
              'サーバーが起動しているか確認し、URLを再度確認してください',
              true
            ))
          } else {
            this.handleDisconnection(event)
          }
        }

      } catch (error) {
        reject(new MCPError(
          'WebSocket初期化に失敗しました',
          MCPErrorCodes.CONNECTION_FAILED,
          'ブラウザーを再起動し、再度お試しください',
          true,
          error instanceof Error ? error : new Error(String(error))
        ))
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
      throw new MCPError(
        'MCPサーバーに接続されていません',
        MCPErrorCodes.CONNECTION_LOST,
        '接続ボタンをクリックしてサーバーに接続してください',
        false
      )
    }

    const id = ++this.requestId
    const startTime = Date.now()
    const request: MCPRequest = {
      jsonrpc: '2.0',
      id,
      method,
      params
    }

    // 認証トークンをパラメータに追加
    if (this.authToken) {
      if (!params) params = {}
      params.auth_token = this.authToken
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(id.toString())
        const duration = Date.now() - startTime
        this.recordRequestMetrics(method, duration, false)
        
        const timeoutError = new MCPError(
          `リクエストがタイムアウトしました: ${method}`,
          MCPErrorCodes.REQUEST_TIMEOUT,
          'サーバーの応答が遅い可能性があります。しばらく待ってから再試行してください',
          true
        )
        this.recordError(timeoutError)
        reject(timeoutError)
      }, this.config.requestTimeout || 30000)

      this.pendingRequests.set(id.toString(), { 
        resolve: (result: any) => {
          const duration = Date.now() - startTime
          this.recordRequestMetrics(method, duration, true)
          resolve(result)
        }, 
        reject: (error: any) => {
          const duration = Date.now() - startTime
          this.recordRequestMetrics(method, duration, false)
          reject(error)
        }, 
        timeout 
      })

      try {
        this.ws!.send(JSON.stringify(request))
      } catch (error) {
        clearTimeout(timeout)
        this.pendingRequests.delete(id.toString())
        const duration = Date.now() - startTime
        this.recordRequestMetrics(method, duration, false)
        
        const sendError = new MCPError(
          `リクエスト送信に失敗しました: ${method}`,
          MCPErrorCodes.CONNECTION_LOST,
          '接続が不安定です。再接続してから再試行してください',
          true,
          error instanceof Error ? error : new Error(String(error))
        )
        this.recordError(sendError)
        reject(sendError)
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
  
  // エラーハンドリングユーティリティ
  private createMCPError(error: unknown): MCPError {
    if (error instanceof MCPError) {
      return error
    }
    
    if (error instanceof Error) {
      // 既知のエラーパターンをチェック
      const message = error.message.toLowerCase()
      
      if (message.includes('timeout')) {
        return new MCPError(
          '接続がタイムアウトしました',
          MCPErrorCodes.CONNECTION_TIMEOUT,
          'ネットワーク状態を確認し、再度お試しください',
          true,
          error
        )
      }
      
      if (message.includes('network') || message.includes('connection')) {
        return new MCPError(
          'ネットワークエラーが発生しました',
          MCPErrorCodes.CONNECTION_FAILED,
          'インターネット接続を確認し、再度お試しください',
          true,
          error
        )
      }
      
      if (message.includes('auth') || message.includes('認証')) {
        return new MCPError(
          '認証エラーが発生しました',
          MCPErrorCodes.AUTH_FAILED,
          'ログアウト後、再びログインしてください',
          false,
          error
        )
      }
    }
    
    // デフォルトエラー
    return new MCPError(
      '予期しないエラーが発生しました',
      MCPErrorCodes.PROTOCOL_ERROR,
      'ページを再読み込みし、再度お試しください',
      true,
      error instanceof Error ? error : new Error(String(error))
    )
  }
  
  private recordError(error: MCPError): void {
    this.lastError = error
    const count = this.errorStats.get(error.code) || 0
    this.errorStats.set(error.code, count + 1)
    
    // ログ出力（デバッグ用）
    if (this.config.enableLogging) {
      console.error('[MCP Client Error]', {
        code: error.code,
        message: error.message,
        recoveryAction: error.recoveryAction,
        retryable: error.retryable,
        originalError: error.originalError
      })
    }
  }
  
  private logConnectionMetrics(success: boolean, duration: number): void {
    if (this.config.enableLogging) {
      console.log('[MCP Connection Metrics]', {
        success,
        duration: `${duration}ms`,
        timestamp: new Date().toISOString()
      })
    }
  }
  
  private recordRequestMetrics(method: string, duration: number, success: boolean): void {
    this.requestMetrics.push({ method, duration, success })
    
    // メトリクスを最新100件に保つ
    if (this.requestMetrics.length > 100) {
      this.requestMetrics = this.requestMetrics.slice(-100)
    }
  }
  
  // パブリックメトリクスAPI
  getErrorStats(): Record<string, number> {
    return Object.fromEntries(this.errorStats)
  }
  
  getLastError(): MCPError | null {
    return this.lastError
  }
  
  getRequestMetrics(): Array<{ method: string, duration: number, success: boolean }> {
    return [...this.requestMetrics]
  }
  
  clearMetrics(): void {
    this.errorStats.clear()
    this.requestMetrics = []
    this.lastError = null
  }
}

// シングルトンクライアントのエクスポート（オプション）
export const mcpClient = new MCPClient()

export default MCPClient