import { Inter } from 'next/font/google'
import './globals.css'
import type { Metadata } from 'next'
import { AntdRegistry } from '@ant-design/nextjs-registry'
import ConfigProvider from 'antd/es/config-provider'
import { ConvexClientProvider } from '@/lib/convex'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'MCP Todoist',
  description: 'Todoist API compatible MCP Server',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ja">
      <body className={inter.className}>
        <ConvexClientProvider>
          <AntdRegistry>
            <ConfigProvider
              theme={{
                token: {
                  colorPrimary: '#1890ff',
                  borderRadius: 8,
                },
              }}
            >
              {children}
            </ConfigProvider>
          </AntdRegistry>
        </ConvexClientProvider>
      </body>
    </html>
  )
} 