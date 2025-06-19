import '@testing-library/jest-dom'
import { vi } from 'vitest'
import React from 'react'

// DOM環境の強化設定
if (typeof window !== 'undefined' && window.document) {
  // document.body と document.head が存在することを保証
  if (!document.body) {
    const body = document.createElement('body')
    document.documentElement.appendChild(body)
  }
  if (!document.head) {
    const head = document.createElement('head')
    document.documentElement.appendChild(head)
  }
  
  // スタイル関連のプロパティを設定（全ての要素に対して）
  const originalCreateElement = document.createElement
  document.createElement = function(tagName: string) {
    const element = originalCreateElement.call(this, tagName)
    if (!element.style) {
      Object.defineProperty(element, 'style', {
        value: {},
        writable: true,
        configurable: true
      })
    }
    return element
  }
}

// Firebase Auth モックセットアップ
const mockUser = {
  uid: 'test-user-id',
  email: 'test@example.com',
  displayName: 'Test User',
  emailVerified: true,
  getIdToken: vi.fn().mockResolvedValue('mock-id-token'),
  getIdTokenResult: vi.fn().mockResolvedValue({
    token: 'mock-id-token',
    claims: { email: 'test@example.com' },
    expirationTime: new Date(Date.now() + 3600000).toISOString()
  }),
  reload: vi.fn().mockResolvedValue(undefined),
  delete: vi.fn().mockResolvedValue(undefined),
  toJSON: vi.fn().mockReturnValue({
    uid: 'test-user-id',
    email: 'test@example.com',
    displayName: 'Test User'
  })
}

const mockAuth = {
  currentUser: mockUser,
  signInWithEmailAndPassword: vi.fn().mockResolvedValue({ user: mockUser }),
  createUserWithEmailAndPassword: vi.fn().mockResolvedValue({ user: mockUser }),
  signOut: vi.fn().mockResolvedValue(undefined),
  onAuthStateChanged: vi.fn((callback) => {
    // 即座authentication状態を通知
    callback(mockUser)
    // unsubscribe functionを返す
    return vi.fn()
  }),
  setPersistence: vi.fn().mockResolvedValue(undefined),
  languageCode: 'ja',
  tenantId: null,
  settings: {
    appVerificationDisabledForTesting: true
  }
}

vi.mock('firebase/auth', () => ({
  getAuth: vi.fn(() => mockAuth),
  signInWithEmailAndPassword: vi.fn((...args) => mockAuth.signInWithEmailAndPassword(...args)),
  createUserWithEmailAndPassword: vi.fn((...args) => mockAuth.createUserWithEmailAndPassword(...args)),
  signOut: vi.fn((...args) => mockAuth.signOut(...args)),
  onAuthStateChanged: vi.fn((callback) => mockAuth.onAuthStateChanged(callback)),
  getIdToken: vi.fn((user) => user?.getIdToken() || Promise.resolve('mock-id-token')),
  updateProfile: vi.fn().mockResolvedValue(undefined),
  sendEmailVerification: vi.fn().mockResolvedValue(undefined),
  reload: vi.fn().mockResolvedValue(undefined),
  // Auth error types
  AuthErrorCodes: {
    INVALID_EMAIL: 'auth/invalid-email',
    USER_DISABLED: 'auth/user-disabled',
    USER_NOT_FOUND: 'auth/user-not-found',
    WRONG_PASSWORD: 'auth/wrong-password',
    EMAIL_EXISTS: 'auth/email-already-in-use',
    WEAK_PASSWORD: 'auth/weak-password',
    NETWORK_REQUEST_FAILED: 'auth/network-request-failed'
  }
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
const mockApp = {
  name: 'test-app',
  options: {
    apiKey: 'test-api-key',
    authDomain: 'test.firebaseapp.com',
    projectId: 'test-project'
  },
  automaticDataCollectionEnabled: false
}

vi.mock('firebase/app', () => ({
  initializeApp: vi.fn(() => mockApp),
  getApps: vi.fn(() => [mockApp]),
  getApp: vi.fn(() => mockApp),
  deleteApp: vi.fn().mockResolvedValue(undefined)
}))

// WebSocket モック（インスタンス追跡・同期制御付き）
class MockWebSocket {
  url: string
  readyState: number = 0
  onopen: ((event: Event) => void) | null = null
  onclose: ((event: CloseEvent) => void) | null = null
  onmessage: ((event: MessageEvent) => void) | null = null
  onerror: ((event: Event) => void) | null = null
  private _messageQueue: any[] = []

  constructor(url: string) {
    this.url = url
    ;(MockWebSocket as any).instances.push(this)
    
    // 同期的にCONNECTING状態に移行
    this.readyState = MockWebSocket.CONNECTING
    
    // 次のマイクロタスクで接続完了をシミュレート
    queueMicrotask(() => {
      if (this.readyState === MockWebSocket.CONNECTING) {
        this.readyState = MockWebSocket.OPEN
        this.onopen?.(new Event('open'))
        // キューに溜まったメッセージを処理
        this._processMessageQueue()
      }
    })
  }

  send(data: string | ArrayBufferLike | Blob | ArrayBufferView) {
    if (this.readyState === MockWebSocket.OPEN) {
      // 即座にエコーバックメッセージをシミュレート（テスト用）
      const echoData = typeof data === 'string' ? data : JSON.stringify(data)
      this._queueMessage(echoData)
    } else {
      throw new Error('WebSocket is not open')
    }
  }

  close(code?: number, reason?: string) {
    if (this.readyState === MockWebSocket.OPEN || this.readyState === MockWebSocket.CONNECTING) {
      this.readyState = MockWebSocket.CLOSING
      queueMicrotask(() => {
        this.readyState = MockWebSocket.CLOSED
        this.onclose?.(new CloseEvent('close', { code: code || 1000, reason: reason || '' }))
      })
    }
  }

  // テスト用メソッド：外部からメッセージを送信
  simulateMessage(data: any) {
    if (this.readyState === MockWebSocket.OPEN) {
      this._queueMessage(data)
    }
  }

  // テスト用メソッド：エラーをシミュレート
  simulateError(error?: Error) {
    this.onerror?.(error instanceof Error ? new ErrorEvent('error', { error }) : (error || new Event('error')))
  }

  // テスト用メソッド：強制的に接続を開く
  forceOpen() {
    this.readyState = MockWebSocket.OPEN
    this.onopen?.(new Event('open'))
    this._processMessageQueue()
  }

  private _queueMessage(data: any) {
    if (this.readyState === MockWebSocket.OPEN) {
      queueMicrotask(() => {
        this.onmessage?.(new MessageEvent('message', { data }))
      })
    } else {
      this._messageQueue.push(data)
    }
  }

  private _processMessageQueue() {
    while (this._messageQueue.length > 0) {
      const data = this._messageQueue.shift()
      this.onmessage?.(new MessageEvent('message', { data }))
    }
  }

  static readonly CONNECTING = 0
  static readonly OPEN = 1
  static readonly CLOSING = 2
  static readonly CLOSED = 3
  static instances: MockWebSocket[] = []
  
  // テスト用静的メソッド：全インスタンスをクリア
  static clearInstances() {
    this.instances = []
  }
  
  // テスト用静的メソッド：最新のインスタンスを取得
  static getLatestInstance(): MockWebSocket | undefined {
    return this.instances[this.instances.length - 1]
  }
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

global.IntersectionObserver = MockIntersectionObserver as any

// URL モック
global.URL = class URL {
  constructor(url: string) {
    if (!url.startsWith('http') && !url.startsWith('ws')) {
      throw new Error('Invalid URL')
    }
  }
  
  static createObjectURL = vi.fn()
  static revokeObjectURL = vi.fn()
  static canParse = vi.fn().mockReturnValue(true)
  static parse = vi.fn().mockReturnValue(null)
} as any

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
const mockAuthContext = {
  user: mockUser,
  loading: false,
  error: null,
  signIn: vi.fn().mockResolvedValue({ user: mockUser }),
  signUp: vi.fn().mockResolvedValue({ user: mockUser }),
  signOut: vi.fn().mockResolvedValue(undefined),
  updateUserProfile: vi.fn().mockResolvedValue(undefined),
  sendEmailVerification: vi.fn().mockResolvedValue(undefined),
  getIdToken: vi.fn().mockResolvedValue('mock-id-token')
}

vi.mock('@/components/auth/AuthProvider', () => ({
  useAuth: () => mockAuthContext,
  AuthProvider: ({ children }: { children: React.ReactNode }) => 
    React.createElement('div', { 'data-testid': 'auth-provider' }, children)
}))

// Firebase config モック
vi.mock('@/lib/config/firebase', () => ({
  auth: mockAuth,
  app: mockApp,
  // Firebase config値
  firebaseConfig: {
    apiKey: 'test-api-key',
    authDomain: 'test.firebaseapp.com',
    projectId: 'test-project',
    storageBucket: 'test.appspot.com',
    messagingSenderId: '123456789',
    appId: 'test-app-id'
  }
}))

// Ant Design Form モック
const mockFormInstance = {
  validateFields: vi.fn().mockResolvedValue({}),
  resetFields: vi.fn(),
  setFieldsValue: vi.fn(),
  getFieldsValue: vi.fn().mockReturnValue({}),
  getFieldValue: vi.fn(),
  setFieldValue: vi.fn(),
  submit: vi.fn(),
  scrollToField: vi.fn(),
  getFieldError: vi.fn().mockReturnValue([]),
  getFieldsError: vi.fn().mockReturnValue([]),
  isFieldsTouched: vi.fn().mockReturnValue(false),
  isFieldTouched: vi.fn().mockReturnValue(false),
  isFieldValidating: vi.fn().mockReturnValue(false),
}

vi.mock('antd', async () => {
  const actual = await vi.importActual('antd')
  return {
    ...actual,
    Form: {
      ...((actual as any).Form || {}),
      useForm: vi.fn(() => [mockFormInstance]),
      Item: ({ children, label, ...props }: any) => 
        React.createElement('div', props, 
          label && React.createElement('label', {}, label),
          children
        )
    },
    Button: ({ children, onClick, disabled, loading, ...props }: any) => 
      React.createElement('button', {
        onClick,
        disabled: disabled || loading,
        'data-testid': props['data-testid'],
        ...props
      }, loading ? 'Loading...' : children),
    Input: ({ value, onChange, ...props }: any) => 
      React.createElement('input', {
        value,
        onChange: (e: any) => onChange?.(e),
        'data-testid': props['data-testid'],
        ...props
      }),
    Select: ({ value, onChange, children, ...props }: any) => 
      React.createElement('select', {
        value,
        onChange: (e: any) => onChange?.(e.target.value),
        'data-testid': props['data-testid'],
        ...props
      }, children),
    Card: ({ title, children, ...props }: any) => 
      React.createElement('div', {
        'data-testid': props['data-testid'],
        ...props
      }, 
        title && React.createElement('h3', {}, title),
        children
      ),
    message: {
      success: vi.fn(),
      error: vi.fn(),
      warning: vi.fn(),
      info: vi.fn()
    },
    Badge: ({ status, text, ...props }: any) => 
      React.createElement('span', {
        'data-testid': props['data-testid'],
        className: `badge-${status}`
      }, text),
    Descriptions: ({ children, ...props }: any) => 
      React.createElement('div', {
        'data-testid': props['data-testid'],
        ...props
      }, children),
    Tabs: ({ items, onChange, ...props }: any) => 
      React.createElement('div', {
        'data-testid': props['data-testid'],
        ...props
      }, 
        items?.map((item: any) => 
          React.createElement('div', { key: item.key },
            React.createElement('button', {
              onClick: () => onChange?.(item.key)
            }, item.label),
            React.createElement('div', {}, item.children)
          )
        )
      ),
    Space: ({ children, ...props }: any) => 
      React.createElement('div', {
        'data-testid': props['data-testid'],
        ...props
      }, children),
    Typography: {
      Text: ({ children, ...props }: any) => 
        React.createElement('span', props, children),
      Title: ({ children, level, ...props }: any) => 
        React.createElement(`h${level || 1}`, props, children)
    },
    List: ({ dataSource, renderItem, ...props }: any) => 
      React.createElement('div', {
        'data-testid': props['data-testid'],
        ...props
      }, dataSource?.map((item: any, index: number) => renderItem(item, index))),
    Spin: ({ children, spinning, ...props }: any) => 
      React.createElement('div', {
        'data-testid': props['data-testid'],
        ...props
      }, 
        spinning && React.createElement('div', { 'data-testid': 'spinner' }, 'Loading...'),
        children
      ),
    Pagination: ({ current, total, onChange, ...props }: any) => 
      React.createElement('div', {
        'data-testid': props['data-testid'],
        ...props
      },
        React.createElement('button', {
          onClick: () => onChange?.(current - 1)
        }, 'Previous'),
        React.createElement('span', {}, `${current}/${Math.ceil(total / 10)}`),
        React.createElement('button', {
          onClick: () => onChange?.(current + 1)
        }, 'Next')
      ),
    Modal: ({ children, visible, onOk, onCancel, ...props }: any) => 
      React.createElement('div', {
        'data-testid': props['data-testid'],
        style: { display: visible ? 'block' : 'none' }
      },
        children,
        React.createElement('button', { onClick: onOk }, 'OK'),
        React.createElement('button', { onClick: onCancel }, 'Cancel')
      )
  }
})