'use client';

// 一時的にFirebaseエラー回避のためコメントアウト
// import { useAuth } from './auth/AuthProvider';
// import { SignInForm } from './auth/SignInForm';
// import LoadingSpinner from './auth/LoadingSpinner';
import Layout from 'antd/es/layout';
import Card from 'antd/es/card';
import Button from 'antd/es/button';
import Alert from 'antd/es/alert';
import Input from 'antd/es/input';
import { useState } from 'react';

const { Content } = Layout;
const { TextArea } = Input;

export default function MCPTester() {
  const [mcpRequest, setMcpRequest] = useState('');
  const [mcpResponse, setMcpResponse] = useState('');
  const [loading, setLoading] = useState(false);

  // 一時的に認証をスキップ
  /*
  const { user, loading, signIn, signOut } = useAuth();

  if (loading) {
    return <LoadingSpinner text="認証状態を確認中..." />;
  }

  if (!user) {
    return (
      <Content className="p-6">
        <Card title="認証が必要です" className="max-w-md mx-auto">
          <Alert
            message="サインインが必要です"
            description="MCPテスト機能を使用するには、まずサインインしてください。"
            type="info"
            showIcon
            className="mb-4"
          />
          <SignInForm onSignIn={signIn} />
        </Card>
      </Content>
    );
  }
  */

  const handleTest = async () => {
    if (!mcpRequest.trim()) {
      return;
    }
    
    setLoading(true);
    try {
      const response = await fetch('/api/mcp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: mcpRequest,
      });
      
      const responseText = await response.text();
      setMcpResponse(responseText);
    } catch (error) {
      setMcpResponse(`エラー: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Content className="p-6">
      <div className="max-w-4xl mx-auto">
        <Card 
          title="MCP Todoist テスター (認証無効化中)" 
          /*
          extra={
            <Button onClick={signOut} type="link">
              サインアウト ({user.email})
            </Button>
          }
          */
        >
          <Alert
            message="テストモード"
            description="Firebase認証を一時的に無効化してMCPサーバーの動作をテストしています。"
            type="warning"
            showIcon
            className="mb-4"
          />
          
          <div className="mt-4 space-y-4">
            <div>
              <h3 className="mb-2">MCP リクエスト</h3>
              <TextArea
                value={mcpRequest}
                onChange={(e) => setMcpRequest(e.target.value)}
                placeholder='例: {"jsonrpc": "2.0", "id": 1, "method": "list_tools", "params": {}}'
                rows={4}
              />
            </div>
            
            <div>
              <Button 
                type="primary" 
                onClick={handleTest}
                loading={loading}
                disabled={!mcpRequest.trim()}
              >
                テスト実行
              </Button>
            </div>
            
            {mcpResponse && (
              <div>
                <h3 className="mb-2">MCP レスポンス</h3>
                <TextArea
                  value={mcpResponse}
                  readOnly
                  rows={8}
                  style={{ fontFamily: 'monospace' }}
                />
              </div>
            )}
          </div>
        </Card>
      </div>
    </Content>
  );
}
