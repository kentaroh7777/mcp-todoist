'use client';

import { useMemo } from 'react';
import { useMutation, useQuery, useAction } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { ConvexMCPClient } from './convex-client';
import type { MCPClientConfig } from '@/types/mcp';

// 拡張設定インターフェース
interface ExtendedConvexMCPClientConfig extends MCPClientConfig {
  skipAuthentication?: boolean;
  testUserId?: string;
}

// 拡張クライアント実装
export class ExtendedConvexMCPClient extends ConvexMCPClient {
  private extendedConfig: ExtendedConvexMCPClientConfig;
  protected userId: string | null = null;
  
  constructor(config: ExtendedConvexMCPClientConfig = {}) {
    super(config);
    this.extendedConfig = {
      skipAuthentication: true,
      testUserId: 'test-user',
      ...config
    };
  }
  
  // Override public methods to emit events for logging
  async listTools(): Promise<any> {
    this.emitRequest('tools/list');
    try {
      const result = await super.listTools();
      this.emitResponse('tools/list', result);
      return result;
    } catch (error: any) {
      this.emitError('tools/list', error);
      throw error;
    }
  }

  async callTool(name: string, args: Record<string, any>): Promise<any> {
    this.emitRequest('tools/call', { name, arguments: args });
    try {
      const result = await super.callTool(name, args);
      this.emitResponse('tools/call', result);
      return result;
    } catch (error: any) {
      this.emitError('tools/call', error);
      throw error;
    }
  }

  async listResources(): Promise<any> {
    this.emitRequest('resources/list');
    try {
      const result = await super.listResources();
      this.emitResponse('resources/list', result);
      return result;
    } catch (error: any) {
      this.emitError('resources/list', error);
      throw error;
    }
  }

  async readResource(uri: string): Promise<any> {
    this.emitRequest('resources/read', { uri });
    try {
      const result = await super.readResource(uri);
      this.emitResponse('resources/read', result);
      return result;
    } catch (error: any) {
      this.emitError('resources/read', error);
      throw error;
    }
  }

  async listPrompts(): Promise<any> {
    this.emitRequest('prompts/list');
    try {
      const result = await super.listPrompts();
      this.emitResponse('prompts/list', result);
      return result;
    } catch (error: any) {
      this.emitError('prompts/list', error);
      throw error;
    }
  }

  async getPrompt(name: string, args?: Record<string, any>): Promise<any> {
    this.emitRequest('prompts/get', { name, arguments: args });
    try {
      const result = await super.getPrompt(name, args);
      this.emitResponse('prompts/get', result);
      return result;
    } catch (error: any) {
      this.emitError('prompts/get', error);
      throw error;
    }
  }

  private emitRequest(method: string, params?: any) {
    const request = {
      jsonrpc: '2.0' as const,
      id: Date.now(),
      method,
      params
    };
    this.emit('request', request);
  }

  private emitResponse(method: string, result: any) {
    this.emit('response', {
      jsonrpc: '2.0' as const,
      id: Date.now(),
      result
    });
  }

  private emitError(method: string, error: any) {
    this.emit('response', {
      jsonrpc: '2.0' as const,
      id: Date.now(),
      error: {
        code: -1,
        message: error.message
      }
    });
  }
  
  protected async ensureAuthentication(): Promise<void> {
    if (this.extendedConfig.skipAuthentication) {
      // 認証をスキップしてテストユーザーIDを設定
      this.userId = this.extendedConfig.testUserId || 'test-user';
      
      if (this.extendedConfig.enableLogging) {
        console.log('ExtendedConvexMCPClient: Authentication skipped, using test user:', this.userId);
      }
      
      return;
    }
    
    // 通常の認証フロー（Firebase）
    return super.ensureAuthentication();
  }
}

// React hooks用の設定
interface ExtendedConvexMCPClientHookConfig {
  skipAuthentication?: boolean;
  testUserId?: string;
  autoConnect?: boolean;
}

// React hooks実装
export function useExtendedConvexMCPClient(
  config: ExtendedConvexMCPClientHookConfig = {}
) {
  const convexAction = useAction(api.mcp.handleMCPRequest);
  const convexMutation = useMutation(api.mcp.createMCPSession);
  const convexQuery = useQuery;
  
  const client = useMemo(() => {
    const extendedClient = new ExtendedConvexMCPClient({
      skipAuthentication: config.skipAuthentication ?? true,
      testUserId: config.testUserId ?? 'test-user',
      enableLogging: true
    });
    
    // Convex hooks を初期化
    extendedClient.initializeConvexHooks({
      action: convexAction,
      mutation: convexMutation,
      query: convexQuery
    });
    
    return extendedClient;
  }, [config.skipAuthentication, config.testUserId, convexAction, convexMutation, convexQuery]);
  
  return client;
}

// 型エクスポート
export type { ExtendedConvexMCPClientConfig, ExtendedConvexMCPClientHookConfig }; 