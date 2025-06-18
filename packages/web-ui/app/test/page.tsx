import { Layout } from 'antd'
import MCPTester from '../../components/MCPTester'

const { Header, Content } = Layout

export default function TestPage() {
  return (
    <Layout>
      <Header className="bg-white shadow-sm border-b">
        <div className="flex items-center">
          <h1 className="text-xl font-semibold text-blue-600 m-0">
            MCP Todoist - テスト
          </h1>
        </div>
      </Header>
      
      <Content className="p-6">
        <div className="max-w-4xl mx-auto">
          <MCPTester />
        </div>
      </Content>
    </Layout>
  )
} 