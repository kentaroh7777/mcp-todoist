'use client'

import Layout from 'antd/es/layout'
import MCPTester from '../../components/MCPTester'
// 一時的にFirebaseエラー回避のためコメントアウト
// import { AuthProvider } from '../../components/auth/AuthProvider'

const { Header, Content } = Layout

export default function TestPage() {
  return (
    // 一時的にAuthProviderを無効化
    // <AuthProvider>
      <Layout>
        <Header className="bg-white shadow-sm border-b">
          <div className="flex items-center">
            <h1 className="text-xl font-semibold text-blue-600 m-0">
              MCP Todoist - テスト (Firebase無効化中)
            </h1>
          </div>
        </Header>
        
        <Content className="p-6">
          <div className="max-w-4xl mx-auto">
            <MCPTester />
          </div>
        </Content>
      </Layout>
    // </AuthProvider>
  )
} 
