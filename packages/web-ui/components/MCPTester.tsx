'use client';

import { useState } from 'react';
import { Card, Button, Input, Select, Form, message, Tabs, Typography, Space, Tag } from 'antd';
import { PlayCircleOutlined, CodeOutlined } from '@ant-design/icons';

const { TextArea } = Input;
const { Option } = Select;
const { Title, Text, Paragraph } = Typography;
const { TabPane } = Tabs;

type MCPRequest = {
  jsonrpc: '2.0';
  id: string | number;
  method: string;
  params?: Record<string, any>;
};

type MCPResponse = {
  jsonrpc: '2.0';
  id: string | number;
  result?: any;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
};

export default function MCPTester() {
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<MCPResponse | null>(null);
  const [form] = Form.useForm();

  const sendMCPRequest = async (request: MCPRequest) => {
    setLoading(true);
    try {
      const res = await fetch('/api/mcp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      const data: MCPResponse = await res.json();
      setResponse(data);
      
      if (data.error) {
        message.error(`エラー: ${data.error.message}`);
      } else {
        message.success('リクエスト成功');
      }
    } catch (error) {
      message.error('リクエストに失敗しました');
      console.error('MCP Request failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickTest = (method: string, params?: any) => {
    const request: MCPRequest = {
      jsonrpc: '2.0',
      id: Date.now(),
      method,
      params,
    };
    sendMCPRequest(request);
  };

  const handleCustomRequest = (values: any) => {
    try {
      const params = values.params ? JSON.parse(values.params) : undefined;
      const request: MCPRequest = {
        jsonrpc: '2.0',
        id: values.id || Date.now(),
        method: values.method,
        params,
      };
      sendMCPRequest(request);
    } catch (error) {
      message.error('パラメータのJSON形式が正しくありません');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <Title level={2}>
          <CodeOutlined className="mr-2" />
          MCP Server テスター
        </Title>
        <Paragraph>
          MCP (Model Context Protocol) サーバーのAPIをテストできます。
        </Paragraph>
      </div>

      <Tabs defaultActiveKey="quick">
        <TabPane tab="クイックテスト" key="quick">
          <div className="space-y-4">
            <Card title="基本機能" size="small">
              <Space wrap>
                <Button
                  type="primary"
                  icon={<PlayCircleOutlined />}
                  onClick={() => handleQuickTest('initialize')}
                  loading={loading}
                >
                  初期化
                </Button>
                <Button
                  onClick={() => handleQuickTest('tools/list')}
                  loading={loading}
                >
                  ツール一覧
                </Button>
              </Space>
            </Card>

            <Card title="タスク操作" size="small">
              <Space wrap>
                <Button
                  onClick={() => handleQuickTest('tools/call', {
                    name: 'get_tasks',
                    arguments: {}
                  })}
                  loading={loading}
                >
                  タスク一覧取得
                </Button>
                <Button
                  onClick={() => handleQuickTest('tools/call', {
                    name: 'create_task',
                    arguments: {
                      content: 'テストタスク',
                      priority: 2,
                      description: 'MCPテスターから作成されたタスク'
                    }
                  })}
                  loading={loading}
                >
                  サンプルタスク作成
                </Button>
              </Space>
            </Card>

            <Card title="プロジェクト操作" size="small">
              <Space wrap>
                <Button
                  onClick={() => handleQuickTest('tools/call', {
                    name: 'get_projects',
                    arguments: {}
                  })}
                  loading={loading}
                >
                  プロジェクト一覧取得
                </Button>
                <Button
                  onClick={() => handleQuickTest('tools/call', {
                    name: 'create_project',
                    arguments: {
                      name: 'テストプロジェクト',
                      color: '#ff6b6b'
                    }
                  })}
                  loading={loading}
                >
                  サンプルプロジェクト作成
                </Button>
              </Space>
            </Card>
          </div>
        </TabPane>

        <TabPane tab="カスタムリクエスト" key="custom">
          <Form
            form={form}
            layout="vertical"
            onFinish={handleCustomRequest}
            initialValues={{
              method: 'tools/list',
              id: Date.now()
            }}
          >
            <Form.Item
              label="メソッド"
              name="method"
              rules={[{ required: true, message: 'メソッドは必須です' }]}
            >
              <Select>
                <Option value="initialize">initialize</Option>
                <Option value="tools/list">tools/list</Option>
                <Option value="tools/call">tools/call</Option>
              </Select>
            </Form.Item>

            <Form.Item
              label="ID"
              name="id"
            >
              <Input placeholder="リクエストID（省略可）" />
            </Form.Item>

            <Form.Item
              label="パラメータ (JSON)"
              name="params"
            >
              <TextArea
                rows={8}
                placeholder='{"name": "get_tasks", "arguments": {"limit": 10}}'
              />
            </Form.Item>

            <Form.Item>
              <Button type="primary" htmlType="submit" loading={loading}>
                リクエスト送信
              </Button>
            </Form.Item>
          </Form>
        </TabPane>
      </Tabs>

      {response && (
        <Card 
          title={
            <div className="flex items-center justify-between">
              <span>レスポンス</span>
              <Tag color={response.error ? 'red' : 'green'}>
                {response.error ? 'エラー' : '成功'}
              </Tag>
            </div>
          }
        >
          <pre className="bg-gray-50 p-4 rounded overflow-auto text-sm">
            {JSON.stringify(response, null, 2)}
          </pre>
        </Card>
      )}
    </div>
  );
} 