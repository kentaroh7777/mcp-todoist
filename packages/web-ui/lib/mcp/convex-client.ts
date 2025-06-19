import { useMutation, useQuery, useAction } from 'convex/react';
import { api } from '../../convex/_generated/api';
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
} from '@/types/mcp';
import { getIdToken } from 'firebase/auth';
import { auth } from '@/lib/config/firebase';

// Convex-based MCP Client
export class ConvexMCPClient {
  private sessionId: string | null = null;
  private userId: string | null = null;
  private connected: boolean = false;
  private connectionState: MCPConnectionState = 'disconnected';
  private eventHandlers: Map<string, Function[]> = new Map();
  private serverInfo: MCPServerInfoExtended | null = null;
  private config: MCPClientConfig;
  private convexAction: any;
  private convexMutation: any;
  private convexQuery: any;

  constructor(config: MCPClientConfig = {}) {
    this.config = {
      reconnectInterval: 5000,
      maxReconnectAttempts: 3,
      requestTimeout: 30000,
      enableLogging: false,
      ...config
    };
  }

  // Initialize with Convex hooks (called from React component)
  initializeConvexHooks(hooks: {
    action: ReturnType<typeof useAction>;
    mutation: ReturnType<typeof useMutation>;
    query: ReturnType<typeof useQuery>;
  }) {
    this.convexAction = hooks.action;
    this.convexMutation = hooks.mutation;
    this.convexQuery = hooks.query;
  }

  async connect(serverUrl: string): Promise<void> {
    this.connectionState = 'connecting';
    
    try {
      // Get Firebase auth token
      await this.ensureAuthentication();
      
      // Create MCP session via Convex
      this.sessionId = await this.convexMutation(api.mcp.createMCPSession, {
        userId: this.userId as any,
        clientInfo: {
          name: 'mcp-todoist-web-ui',
          version: '1.0.0'
        }
      });
      
      this.connected = true;
      this.connectionState = 'connected';
      
      this.emit('connect');
      
    } catch (error) {
      this.connectionState = 'disconnected';
      this.connected = false;
      throw error;
    }
  }

  private async ensureAuthentication(): Promise<void> {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('User not authenticated');
    }
    
    this.userId = user.uid;
    
    try {
      await getIdToken(user);
    } catch (error) {
      throw new Error('Failed to get authentication token');
    }
  }

  disconnect(): void {
    if (this.sessionId && this.convexMutation) {
      this.convexMutation(api.mcp.closeMCPSession, {
        sessionId: this.sessionId as any
      }).catch(console.error);
    }
    
    this.connected = false;
    this.connectionState = 'disconnected';
    this.sessionId = null;
    this.emit('disconnect');
  }

  isConnected(): boolean {
    return this.connected;
  }

  getConnectionState(): MCPConnectionState {
    return this.connectionState;
  }

  getServerInfo(): MCPServerInfoExtended | null {
    return this.serverInfo;
  }

  async initialize(): Promise<MCPInitializeResponse> {
    if (!this.sessionId || !this.convexAction) {
      throw new Error('Not connected to MCP session');
    }

    const request: MCPRequest = {
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {
        protocolVersion: '2024-11-05',
        clientInfo: {
          name: 'mcp-todoist-web-ui',
          version: '1.0.0'
        },
        capabilities: {}
      }
    };

    const response = await this.convexAction(api.mcp.handleMCPRequest, {
      sessionId: this.sessionId as any,
      request
    });

    if (response.error) {
      throw new Error(response.error.message);
    }

    this.serverInfo = {
      ...response.result.serverInfo,
      protocolVersion: response.result.protocolVersion,
      capabilities: response.result.capabilities,
      connected: true,
      lastConnected: new Date()
    };

    return response.result;
  }

  async listTools(): Promise<MCPTool[]> {
    return this.sendRequest('tools/list');
  }

  async callTool(name: string, args: Record<string, any>): Promise<any> {
    const result = await this.sendRequest('tools/call', {
      name,
      arguments: args
    });
    return result;
  }

  async listResources(): Promise<MCPResource[]> {
    return this.sendRequest('resources/list');
  }

  async readResource(uri: string): Promise<MCPResourceContent> {
    const result = await this.sendRequest('resources/read', { uri });
    return result.contents[0];
  }

  async listPrompts(): Promise<MCPPrompt[]> {
    return this.sendRequest('prompts/list');
  }

  async getPrompt(name: string, args?: Record<string, any>): Promise<MCPPromptContent> {
    return this.sendRequest('prompts/get', {
      name,
      arguments: args
    });
  }

  private async sendRequest(method: string, params?: any): Promise<any> {
    if (!this.sessionId || !this.convexAction) {
      throw new Error('Not connected to MCP session');
    }

    const request: MCPRequest = {
      jsonrpc: '2.0',
      id: Date.now(),
      method,
      params
    };

    const response = await this.convexAction(api.mcp.handleMCPRequest, {
      sessionId: this.sessionId as any,
      request
    });

    if (response.error) {
      throw new Error(response.error.message);
    }

    return response.result;
  }

  // Event handling (compatible with original MCPClient)
  on<K extends keyof MCPEventMap>(event: K, callback: MCPEventMap[K]): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event)!.push(callback);
  }

  off<K extends keyof MCPEventMap>(event: K, callback: MCPEventMap[K]): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      const index = handlers.indexOf(callback);
      if (index !== -1) {
        handlers.splice(index, 1);
      }
    }
  }

  private emit<K extends keyof MCPEventMap>(event: K, ...args: any[]): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(...args);
        } catch (error) {
          console.error(`Error in ${event} handler:`, error);
        }
      });
    }
  }

  // Additional methods for real-time functionality
  async refreshAuthToken(): Promise<void> {
    await this.ensureAuthentication();
  }

  handleAuthStateChange(user: any): void {
    if (!user && this.connected) {
      this.disconnect();
    }
  }

  // Real-time data access via Convex hooks
  useTasksQuery() {
    if (!this.sessionId) return [];
    return this.convexQuery(api.tasks.getBySession, {
      sessionId: this.sessionId as any
    });
  }

  useProjectsQuery() {
    if (!this.sessionId) return [];
    return this.convexQuery(api.projects.getBySession, {
      sessionId: this.sessionId as any
    });
  }

  useSessionQuery() {
    if (!this.sessionId) return null;
    return this.convexQuery(api.mcp.getMCPSession, {
      sessionId: this.sessionId as any
    });
  }
}

// React Hook for using ConvexMCPClient
export function useConvexMCPClient(config?: MCPClientConfig) {
  const client = new ConvexMCPClient(config);
  
  // Initialize Convex hooks
  client.initializeConvexHooks({
    action: useAction(api.mcp.handleMCPRequest),
    mutation: useMutation(api.mcp.createMCPSession),
    query: useQuery  // queryフック自体を渡すだけ、直接実行しない
  });
  
  return client;
}

// Higher-level hooks for specific operations
export function useMCPTasks(sessionId: string | null) {
  return useQuery(
    api.tasks.getBySession, 
    sessionId ? { sessionId: sessionId as any } : 'skip'
  );
}

export function useMCPProjects(sessionId: string | null) {
  return useQuery(
    api.projects.getBySession,
    sessionId ? { sessionId: sessionId as any } : 'skip'
  );
}

export function useMCPSession(sessionId: string | null) {
  return useQuery(
    api.mcp.getMCPSession,
    sessionId ? { sessionId: sessionId as any } : 'skip'
  );
}

// Task operations hooks
export function useTaskOperations() {
  const createTask = useMutation(api.tasks.create);
  const updateTask = useMutation(api.tasks.update);
  const completeTask = useMutation(api.tasks.complete);
  const deleteTask = useMutation(api.tasks.remove);
  
  return {
    createTask,
    updateTask,
    completeTask,
    deleteTask
  };
}

// Project operations hooks
export function useProjectOperations() {
  const createProject = useMutation(api.projects.create);
  const updateProject = useMutation(api.projects.updateProject);
  const archiveProject = useMutation(api.projects.archiveProject);
  
  return {
    createProject,
    updateProject,
    archiveProject
  };
} 