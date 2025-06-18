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

// WebSocket モック（インスタンス追跡付き）
class MockWebSocket {
  url: string
  readyState: number = 0
  onopen: ((event: Event) => void) | null = null
  onclose: ((event: CloseEvent) => void) | null = null
  onmessage: ((event: MessageEvent) => void) | null = null
  onerror: ((event: Event) => void) | null = null

  constructor(url: string) {
    this.url = url
    ;(MockWebSocket as any).instances.push(this)
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
  static instances: MockWebSocket[] = []
}

// インスタンス配列を初期化
;(MockWebSocket as any).instances = []

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

// URL モック
global.URL = class URL {
  constructor(url: string) {
    if (!url.startsWith('http') && !url.startsWith('ws')) {
      throw new Error('Invalid URL')
    }
  }
  
  static createObjectURL = vi.fn()
  static revokeObjectURL = vi.fn()
}

// createElement モック (ダウンロード用)
const originalCreateElement = document.createElement
document.createElement = vi.fn().mockImplementation((tagName: string) => {
  if (tagName === 'a') {
    return {
      click: vi.fn(),
      href: '',
      download: ''
    }
  }
  return originalCreateElement.call(document, tagName)
})

// AuthProvider モック
vi.mock('@/components/auth/AuthProvider', () => ({
  useAuth: () => ({
    user: { uid: 'test-user', email: 'test@example.com' },
    loading: false,
    error: null
  })
}))

// Firebase config モック
vi.mock('@/lib/config/firebase', () => ({
  auth: {
    currentUser: { uid: 'test-user', email: 'test@example.com' }
  }
}))

// Ant Design Form モック
vi.mock('antd', async () => {
  const actual = await vi.importActual('antd')
  return {
    ...actual,
    Form: {
      ...((actual as any).Form || {}),
      useForm: () => [{
        validateFields: vi.fn().mockResolvedValue({}),
        resetFields: vi.fn(),
        setFieldsValue: vi.fn(),
        getFieldsValue: vi.fn().mockReturnValue({}),
        submit: vi.fn(),
      }]
    }
  }
})