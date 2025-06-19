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