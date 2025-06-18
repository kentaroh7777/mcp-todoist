import { Layout, Typography, Card, Row, Col } from 'antd'
import { CheckCircleOutlined, ProjectOutlined, CalendarOutlined } from '@ant-design/icons'

const { Header, Content } = Layout
const { Title, Paragraph } = Typography

export default function Home() {
  return (
    <Layout>
      <Header className="bg-white shadow-sm border-b">
        <div className="flex items-center">
          <Title level={3} className="!mb-0 !text-blue-600">
            MCP Todoist
          </Title>
        </div>
      </Header>
      
      <Content className="p-6">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <Title level={1}>ダッシュボード</Title>
            <Paragraph>
              Todoist API互換のMCPサーバーへようこそ。タスク管理を効率的に行うことができます。
            </Paragraph>
          </div>

          <Row gutter={[24, 24]}>
            <Col xs={24} md={8}>
              <Card
                title="タスク管理"
                bordered={false}
                className="shadow-sm hover:shadow-md transition-shadow"
                extra={<CheckCircleOutlined className="text-green-500" />}
              >
                <Paragraph>
                  タスクの作成、編集、完了管理を行います。
                  優先度設定や期限設定も可能です。
                </Paragraph>
              </Card>
            </Col>

            <Col xs={24} md={8}>
              <Card
                title="プロジェクト"
                bordered={false}
                className="shadow-sm hover:shadow-md transition-shadow"
                extra={<ProjectOutlined className="text-blue-500" />}
              >
                <Paragraph>
                  プロジェクトごとにタスクを整理。
                  階層構造での管理も可能です。
                </Paragraph>
              </Card>
            </Col>

            <Col xs={24} md={8}>
              <Card
                title="予定管理"
                bordered={false}
                className="shadow-sm hover:shadow-md transition-shadow"
                extra={<CalendarOutlined className="text-orange-500" />}
              >
                <Paragraph>
                  期限付きタスクの管理とスケジュール
                  の最適化を行います。
                </Paragraph>
              </Card>
            </Col>
          </Row>

          <div className="mt-12 space-y-6">
            <Card title="API エンドポイント" bordered={false} className="shadow-sm">
              <div className="space-y-4">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <code className="text-sm font-mono">
                    POST /api/mcp - MCPプロトコルメインエンドポイント
                  </code>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <code className="text-sm font-mono">
                    Method: tools/list - 利用可能なツール一覧
                  </code>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <code className="text-sm font-mono">
                    Method: tools/call - ツール実行（タスク・プロジェクト操作）
                  </code>
                </div>
              </div>
            </Card>

            <Card title="テスト機能" bordered={false} className="shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-medium mb-2">MCP Server テスター</h3>
                  <p className="text-gray-600">
                    実際にMCPサーバーのAPIをテストして動作確認ができます
                  </p>
                </div>
                <a 
                  href="/test" 
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  テストページへ
                </a>
              </div>
            </Card>
          </div>
        </div>
      </Content>
    </Layout>
  )
} 