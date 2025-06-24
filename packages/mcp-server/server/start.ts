import { MCPServer } from './index'
import * as dotenv from 'dotenv'
import * as path from 'path'

// Load .env.local from project root
dotenv.config({ path: path.join(__dirname, '../../../.env.local') })

const server = new MCPServer(process.env.TODOIST_API_TOKEN)
const PORT = process.env.MCP_SERVER_PORT || 4000

server.getApp().listen(PORT, () => {
  console.log(`🚀 MCP Server running on http://localhost:${PORT}`)
  console.log(`📡 API Endpoint: http://localhost:${PORT}/mcp`)
})

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('📤 Shutting down MCP Server...')
  await server.close()
  process.exit(0)
})

process.on('SIGINT', async () => {
  console.log('📤 Shutting down MCP Server...')
  await server.close()
  process.exit(0)
}) 