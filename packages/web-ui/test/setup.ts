import '@testing-library/jest-dom'
import { vi } from 'vitest'

// Firebase Auth モックセットアップ
vi.mock('firebase/auth', () => ({
  getAuth: vi.fn(),
  signInWithEmailAndPassword: vi.fn(),
  createUserWithEmailAndPassword: vi.fn(),
  signOut: vi.fn(),
  onAuthStateChanged: vi.fn(),
  getIdToken: vi.fn(),
}))

// Next.js router モック
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
  }),
  usePathname: () => '/',
}))

// Firebase app モック
vi.mock('firebase/app', () => ({
  initializeApp: vi.fn(),
  getApps: vi.fn(() => []),
  getApp: vi.fn(),
}))

// WebSocket モック
class MockWebSocket {
  url: string
  readyState: number = 0
  onopen: ((event: Event) => void) | null = null
  onclose: ((event: CloseEvent) => void) | null = null
  onmessage: ((event: MessageEvent) => void) | null = null
  onerror: ((event: Event) => void) | null = null

  constructor(url: string) {
    this.url = url
    setTimeout(() => {
      this.readyState = 1
      this.onopen?.(new Event('open'))
    }, 0)
  }

  send(data: string | ArrayBufferLike | Blob | ArrayBufferView) {
    // モックではメッセージを送信しない
  }

  close() {
    this.readyState = 3
    this.onclose?.(new CloseEvent('close'))
  }

  static readonly CONNECTING = 0
  static readonly OPEN = 1
  static readonly CLOSING = 2
  static readonly CLOSED = 3
}

global.WebSocket = MockWebSocket as any

// fetch モック
global.fetch = vi.fn()

// Next.js API Routes モック
vi.mock('next/server', () => ({
  NextRequest: vi.fn(),
  NextResponse: {
    json: vi.fn(),
    redirect: vi.fn(),
  },
}))

// Ant Design コンポーネントテスト用設定
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

// ResizeObserver モック
class MockResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

global.ResizeObserver = MockResizeObserver

// IntersectionObserver モック
class MockIntersectionObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

global.IntersectionObserver = MockIntersectionObserver

// MCP プロトコル モック
vi.mock('@/lib/mcp-client', () => ({
  MCPClient: vi.fn(),
}))

// Todoist API モック
vi.mock('@/lib/todoist/client', () => ({
  TodoistClient: vi.fn(),
}))