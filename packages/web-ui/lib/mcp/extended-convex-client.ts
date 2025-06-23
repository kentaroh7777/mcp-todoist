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
  
  constructor(config: ExtendedConvexMCPClientConfig = {}) {
    super(config);
    this.extendedConfig = {
      skipAuthentication: true,
      testUserId: 'test-user',
      ...config
    };
  }
  
  // Override connect method to handle test users
  async connect(serverUrl: string): Promise<void> {
    console.log('[ExtendedConvexMCPClient] connect called with:', serverUrl);
    console.log('[ExtendedConvexMCPClient] skipAuthentication:', this.extendedConfig.skipAuthentication);
    
    if (this.extendedConfig.skipAuthentication) {
      // For test mode, directly create session without Firebase auth
      await this.connectWithTestUser();
    } else {
      // Use parent class connect method for real auth
      await super.connect(serverUrl);
    }
  }

  private async connectWithTestUser(): Promise<void> {
    console.log('[ExtendedConvexMCPClient] connectWithTestUser called');
    
    try {
      const testUserId = this.extendedConfig.testUserId || 'test-user';
      console.log('[ExtendedConvexMCPClient] Using test user:', testUserId);

      // Get Convex hooks from parent class
      const mutationFn = (this as any).convexMutation;
      console.log('[ExtendedConvexMCPClient] Convex mutation function available:', !!mutationFn);
      
      if (!mutationFn) {
        const error = new Error('Convex hooks not initialized. Call initializeConvexHooks first.');
        console.error('[ExtendedConvexMCPClient]', error.message);
        throw error;
      }

      console.log('[ExtendedConvexMCPClient] Creating MCP session...');
      
      // Debug: Log parameters before sending
      const sessionParams = {
        userId: testUserId,
        clientInfo: {
          name: 'mcp-todoist-web-ui',
          version: '1.0.0'
        }
      };
      console.log('[DEBUG] ExtendedConvexMCPClient sending params:', JSON.stringify(sessionParams, null, 2));
      console.log('[DEBUG] api.mcp.createMCPSession reference:', api.mcp.createMCPSession);
      console.log('[DEBUG] convexMutation function type:', typeof mutationFn);
      
      // Use the mutation function correctly - useMutation returns a function that takes parameters
      console.log('[DEBUG] Calling mutation function with parameters...');
      
      // Add detailed error catching
      let sessionId;
      try {
        sessionId = await mutationFn(sessionParams);
        console.log('[DEBUG] Mutation call successful, sessionId:', sessionId);
      } catch (mutationError: any) {
        console.error('[DEBUG] Mutation call failed:', mutationError);
        console.error('[DEBUG] Mutation error name:', mutationError.name);
        console.error('[DEBUG] Mutation error message:', mutationError.message);
        console.error('[DEBUG] Mutation error stack:', mutationError.stack);
        console.error('[DEBUG] Mutation error details:', mutationError.data || mutationError.details || 'No additional details');
        throw new Error(`MCP connection failed: ${mutationError.message || 'Unknown mutation error'}`);
      }
      
      console.log('[ExtendedConvexMCPClient] Session created:', sessionId);
      
      // Set internal connection state
      (this as any).sessionId = sessionId;
      (this as any).connected = true;
      (this as any).connectionState = 'connected';
      
      console.log('[ExtendedConvexMCPClient] Connection state updated');
      
    } catch (error: any) {
      console.error('[ExtendedConvexMCPClient] Connection failed:', error);
      (this as any).connected = false;
      (this as any).connectionState = 'disconnected';
      throw error;
    }
  }

  // Remove all the emit calls and other problematic overrides

  // Override public methods to emit events for logging
  async listTools(): Promise<any> {
    if (this.extendedConfig.enableLogging) {
      console.log('ExtendedConvexMCPClient: listTools called');
    }
    try {
      const result = await super.listTools();
      if (this.extendedConfig.enableLogging) {
        console.log('ExtendedConvexMCPClient: listTools result:', result);
      }
      return result;
    } catch (error: any) {
      if (this.extendedConfig.enableLogging) {
        console.error('ExtendedConvexMCPClient: listTools error:', error);
      }
      throw error;
    }
  }

  async callTool(name: string, args: Record<string, any>): Promise<any> {
    if (this.extendedConfig.enableLogging) {
      console.log('ExtendedConvexMCPClient: callTool called:', name, args);
    }
    try {
      const result = await super.callTool(name, args);
      if (this.extendedConfig.enableLogging) {
        console.log('ExtendedConvexMCPClient: callTool result:', result);
      }
      return result;
    } catch (error: any) {
      if (this.extendedConfig.enableLogging) {
        console.error('ExtendedConvexMCPClient: callTool error:', error);
      }
      throw error;
    }
  }

  async listResources(): Promise<any> {
    if (this.extendedConfig.enableLogging) {
      console.log('ExtendedConvexMCPClient: listResources called');
    }
    try {
      const result = await super.listResources();
      if (this.extendedConfig.enableLogging) {
        console.log('ExtendedConvexMCPClient: listResources result:', result);
      }
      return result;
    } catch (error: any) {
      if (this.extendedConfig.enableLogging) {
        console.error('ExtendedConvexMCPClient: listResources error:', error);
      }
      throw error;
    }
  }

  async readResource(uri: string): Promise<any> {
    if (this.extendedConfig.enableLogging) {
      console.log('ExtendedConvexMCPClient: readResource called:', uri);
    }
    try {
      const result = await super.readResource(uri);
      if (this.extendedConfig.enableLogging) {
        console.log('ExtendedConvexMCPClient: readResource result:', result);
      }
      return result;
    } catch (error: any) {
      if (this.extendedConfig.enableLogging) {
        console.error('ExtendedConvexMCPClient: readResource error:', error);
      }
      throw error;
    }
  }

  async listPrompts(): Promise<any> {
    if (this.extendedConfig.enableLogging) {
      console.log('ExtendedConvexMCPClient: listPrompts called');
    }
    try {
      const result = await super.listPrompts();
      if (this.extendedConfig.enableLogging) {
        console.log('ExtendedConvexMCPClient: listPrompts result:', result);
      }
      return result;
    } catch (error: any) {
      if (this.extendedConfig.enableLogging) {
        console.error('ExtendedConvexMCPClient: listPrompts error:', error);
      }
      throw error;
    }
  }

  async getPrompt(name: string, args?: Record<string, any>): Promise<any> {
    if (this.extendedConfig.enableLogging) {
      console.log('ExtendedConvexMCPClient: getPrompt called:', name, args);
    }
    try {
      const result = await super.getPrompt(name, args);
      if (this.extendedConfig.enableLogging) {
        console.log('ExtendedConvexMCPClient: getPrompt result:', result);
      }
      return result;
    } catch (error: any) {
      if (this.extendedConfig.enableLogging) {
        console.error('ExtendedConvexMCPClient: getPrompt error:', error);
      }
      throw error;
    }
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
  
  console.log('[useExtendedConvexMCPClient] Hook called with config:', config);
  console.log('[useExtendedConvexMCPClient] convexAction available:', !!convexAction);
  console.log('[useExtendedConvexMCPClient] convexMutation available:', !!convexMutation);
  console.log('[useExtendedConvexMCPClient] convexQuery available:', !!convexQuery);
  
  const client = useMemo(() => {
    console.log('[useExtendedConvexMCPClient] Creating new client instance');
    const extendedClient = new ExtendedConvexMCPClient({
      skipAuthentication: config.skipAuthentication ?? true,
      testUserId: config.testUserId ?? 'test-user',
      enableLogging: true
    });
    
    console.log('[useExtendedConvexMCPClient] Client created, initializing Convex hooks');
    // Convex hooks を初期化
    extendedClient.initializeConvexHooks({
      action: convexAction,
      mutation: convexMutation,
      query: convexQuery
    });
    
    console.log('[useExtendedConvexMCPClient] Client fully configured');
    return extendedClient;
  }, [config.skipAuthentication, config.testUserId, convexAction, convexMutation, convexQuery]);
  
  console.log('[useExtendedConvexMCPClient] Returning client:', client);
  return client;
}

// 型エクスポート
export type { ExtendedConvexMCPClientConfig, ExtendedConvexMCPClientHookConfig }; 