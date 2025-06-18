# Task 1-2: Todoist API クライアント実装

## 概要
Todoist REST APIとの連携機能を、TDD開発フローに従って実装する。基本的なタスク・プロジェクト操作を提供する。

## 依存関係
- 本実装の元となる設計書: [doc/design/mcp-todoist.md](../../design/mcp-todoist.md)

### 前提条件
- **必須**: Task 1-1 (MCPプロトコル基盤) 完了
- Todoist APIトークンの取得

### 成果物
- `packages/mcp-server/src/adapters/todoist.ts` - Todoist APIクライアント
- `packages/mcp-server/src/types/todoist.ts` - Todoist型定義
- `packages/mcp-server/test/adapters/` - テスト実装

### 影響範囲
- Task 1-3 (MCPツール実装) で使用される

## 実装要件

### 【必須制約】TDD開発フロー
- **テスト実装 → 実装 → テスト通過** の順序で進める
- APIクライアント関数ごとに単体テストを作成
- モックを使用してTodoist API呼び出しをテスト

### API仕様
```typescript
// Todoist データ型定義
interface TodoistTask {
  id: string;
  content: string;
  description: string;
  project_id: string;
  section_id?: string;
  parent_id?: string;
  order: number;
  priority: number;
  labels: string[];
  due?: {
    date: string;
    datetime?: string;
    timezone?: string;
  };
  url: string;
  comment_count: number;
  is_completed: boolean;
  created_at: string;
}

interface TodoistProject {
  id: string;
  name: string;
  comment_count: number;
  order: number;
  color: string;
  is_shared: boolean;
  is_favorite: boolean;
  is_inbox_project: boolean;
  is_team_inbox: boolean;
  view_style: string;
  url: string;
  parent_id?: string;
}

// APIクライアント
class TodoistClient {
  // タスク操作
  getTasks(params?: GetTasksParams): Promise<TodoistTask[]>;
  getTask(id: string): Promise<TodoistTask>;
  createTask(task: CreateTaskParams): Promise<TodoistTask>;
  updateTask(id: string, updates: UpdateTaskParams): Promise<TodoistTask>;
  closeTask(id: string): Promise<void>;
  reopenTask(id: string): Promise<void>;
  deleteTask(id: string): Promise<void>;

  // プロジェクト操作
  getProjects(): Promise<TodoistProject[]>;
  getProject(id: string): Promise<TodoistProject>;
  createProject(project: CreateProjectParams): Promise<TodoistProject>;
  updateProject(id: string, updates: UpdateProjectParams): Promise<TodoistProject>;
  deleteProject(id: string): Promise<void>;
}
```

## 実装ガイド

### Step 1: TDD準備 - テスト環境準備
```bash
cd packages/mcp-server
npm install node-fetch @types/node-fetch
npm install -D nock # HTTPモック用
```

### Step 2: TDD Red Phase - テスト実装
```typescript
// test/adapters/todoist.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import nock from 'nock';
import { TodoistClient } from '../../src/adapters/todoist';

describe('TodoistClient', () => {
  let client: TodoistClient;
  const mockApiToken = 'test-token';

  beforeEach(() => {
    client = new TodoistClient(mockApiToken);
  });

  afterEach(() => {
    nock.cleanAll();
  });

  describe('getTasks', () => {
    it('should fetch tasks from Todoist API', async () => {
      const mockTasks = [
        {
          id: '2995104339',
          content: 'Buy milk',
          description: '',
          project_id: '2203306141',
          section_id: null,
          parent_id: null,
          order: 1,
          priority: 1,
          labels: [],
          due: null,
          url: 'https://todoist.com/showTask?id=2995104339',
          comment_count: 0,
          is_completed: false,
          created_at: '2019-12-11T22:36:50.000000Z'
        }
      ];

      nock('https://api.todoist.com')
        .get('/rest/v2/tasks')
        .reply(200, mockTasks);

      const tasks = await client.getTasks();

      expect(tasks).toEqual(mockTasks);
      expect(tasks).toHaveLength(1);
      expect(tasks[0].content).toBe('Buy milk');
    });

    it('should handle API errors', async () => {
      nock('https://api.todoist.com')
        .get('/rest/v2/tasks')
        .reply(401, { error: 'Unauthorized' });

      await expect(client.getTasks()).rejects.toThrow('Todoist API Error: 401');
    });
  });

  describe('createTask', () => {
    it('should create a new task', async () => {
      const newTask = {
        content: 'New task',
        project_id: '2203306141'
      };

      const createdTask = {
        id: '2995104340',
        ...newTask,
        description: '',
        section_id: null,
        parent_id: null,
        order: 1,
        priority: 1,
        labels: [],
        due: null,
        url: 'https://todoist.com/showTask?id=2995104340',
        comment_count: 0,
        is_completed: false,
        created_at: '2019-12-11T22:36:50.000000Z'
      };

      nock('https://api.todoist.com')
        .post('/rest/v2/tasks')
        .reply(200, createdTask);

      const result = await client.createTask(newTask);

      expect(result).toEqual(createdTask);
      expect(result.content).toBe('New task');
    });
  });

  describe('getProjects', () => {
    it('should fetch projects from Todoist API', async () => {
      const mockProjects = [
        {
          id: '2203306141',
          name: 'Inbox',
          comment_count: 10,
          order: 0,
          color: 'grey',
          is_shared: false,
          is_favorite: false,
          is_inbox_project: true,
          is_team_inbox: false,
          view_style: 'list',
          url: 'https://todoist.com/showProject?id=2203306141'
        }
      ];

      nock('https://api.todoist.com')
        .get('/rest/v2/projects')
        .reply(200, mockProjects);

      const projects = await client.getProjects();

      expect(projects).toEqual(mockProjects);
      expect(projects[0].name).toBe('Inbox');
    });
  });
});
```

### Step 3: TDD Green Phase - 最小実装
```typescript
// src/types/todoist.ts
export interface TodoistTask {
  id: string;
  content: string;
  description: string;
  project_id: string;
  section_id?: string;
  parent_id?: string;
  order: number;
  priority: number;
  labels: string[];
  due?: {
    date: string;
    datetime?: string;
    timezone?: string;
  };
  url: string;
  comment_count: number;
  is_completed: boolean;
  created_at: string;
}

export interface TodoistProject {
  id: string;
  name: string;
  comment_count: number;
  order: number;
  color: string;
  is_shared: boolean;
  is_favorite: boolean;
  is_inbox_project: boolean;
  is_team_inbox: boolean;
  view_style: string;
  url: string;
  parent_id?: string;
}
```

```typescript
// src/adapters/todoist.ts
import fetch from 'node-fetch';
import { TodoistTask, TodoistProject } from '../types/todoist';

export class TodoistApiError extends Error {
  constructor(
    public status: number,
    public statusText: string,
    public response?: any
  ) {
    super(`Todoist API Error: ${status} ${statusText}`);
    this.name = 'TodoistApiError';
  }
}

export class TodoistClient {
  private readonly baseUrl = 'https://api.todoist.com/rest/v2';
  private readonly apiToken: string;

  constructor(apiToken: string) {
    this.apiToken = apiToken;
  }

  private async makeRequest<T>(
    endpoint: string,
    options: {
      method?: string;
      body?: any;
      params?: Record<string, any>;
    } = {}
  ): Promise<T> {
    const { method = 'GET', body, params } = options;
    
    let url = `${this.baseUrl}${endpoint}`;
    
    if (params && method === 'GET') {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          if (Array.isArray(value)) {
            searchParams.append(key, value.join(','));
          } else {
            searchParams.append(key, String(value));
          }
        }
      });
      if (searchParams.toString()) {
        url += `?${searchParams.toString()}`;
      }
    }

    const headers: Record<string, string> = {
      'Authorization': `Bearer ${this.apiToken}`,
      'Content-Type': 'application/json',
    };

    const config: any = {
      method,
      headers,
    };

    if (body && method !== 'GET') {
      config.body = JSON.stringify(body);
    }

    const response = await fetch(url, config);

    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.json();
      } catch {
        // JSON パースに失敗した場合
      }
      
      throw new TodoistApiError(
        response.status,
        response.statusText,
        errorData
      );
    }

    if (response.status === 204) {
      return null as any;
    }

    return response.json() as Promise<T>;
  }

  // タスク操作
  async getTasks(params?: any): Promise<TodoistTask[]> {
    return this.makeRequest<TodoistTask[]>('/tasks', { params });
  }

  async getTask(id: string): Promise<TodoistTask> {
    return this.makeRequest<TodoistTask>(`/tasks/${id}`);
  }

  async createTask(task: any): Promise<TodoistTask> {
    return this.makeRequest<TodoistTask>('/tasks', {
      method: 'POST',
      body: task,
    });
  }

  async updateTask(id: string, updates: any): Promise<TodoistTask> {
    return this.makeRequest<TodoistTask>(`/tasks/${id}`, {
      method: 'POST',
      body: updates,
    });
  }

  async closeTask(id: string): Promise<void> {
    return this.makeRequest<void>(`/tasks/${id}/close`, {
      method: 'POST',
    });
  }

  async reopenTask(id: string): Promise<void> {
    return this.makeRequest<void>(`/tasks/${id}/reopen`, {
      method: 'POST',
    });
  }

  async deleteTask(id: string): Promise<void> {
    return this.makeRequest<void>(`/tasks/${id}`, {
      method: 'DELETE',
    });
  }

  // プロジェクト操作
  async getProjects(): Promise<TodoistProject[]> {
    return this.makeRequest<TodoistProject[]>('/projects');
  }

  async getProject(id: string): Promise<TodoistProject> {
    return this.makeRequest<TodoistProject>(`/projects/${id}`);
  }

  async createProject(project: any): Promise<TodoistProject> {
    return this.makeRequest<TodoistProject>('/projects', {
      method: 'POST',
      body: project,
    });
  }

  async updateProject(id: string, updates: any): Promise<TodoistProject> {
    return this.makeRequest<TodoistProject>(`/projects/${id}`, {
      method: 'POST',
      body: updates,
    });
  }

  async deleteProject(id: string): Promise<void> {
    return this.makeRequest<void>(`/projects/${id}`, {
      method: 'DELETE',
    });
  }
}
```

## Task 1-1 & 1-2 統合テスト

### Step 4: MCPサーバー + Todoistクライアント統合テスト
```typescript
// test/integration/mcp-todoist.integration.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import nock from 'nock';
import { MCPServer } from '../../src/server/index';

describe('MCP Server + Todoist Integration', () => {
  it('should handle initialize request', async () => {
    const server = new MCPServer();
    const app = (server as any).app;

    const response = await request(app)
      .post('/mcp')
      .send({
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
        params: {}
      })
      .expect(200);

    expect(response.body.jsonrpc).toBe("2.0");
    expect(response.body.id).toBe(1);
    expect(response.body.result).toHaveProperty('protocolVersion');
    expect(response.body.result).toHaveProperty('capabilities');
    expect(response.body.result).toHaveProperty('serverInfo');
  });

  it('should create TodoistClient instance', () => {
    const { TodoistClient } = require('../../src/adapters/todoist');
    const client = new TodoistClient('test-token');
    expect(client).toBeDefined();
  });
});
```

## 検証基準

### 【Task 1-1 & 1-2まとまったテスト】
- [ ] **MCPプロトコル基盤**: initializeリクエストが正常に処理される
- [ ] **Todoistクライアント**: 基本的なAPI操作（getTasks, createTask, getProjects）が動作
- [ ] **統合動作**: MCPサーバーとTodoistクライアントが問題なく組み合わさる
- [ ] **エラーハンドリング**: 各層でのエラーが適切に処理される

### 技術検証
- [ ] **TDD完了**: 全テストが通る（テスト → 実装の順序で開発）
- [ ] **型安全性**: TypeScript型定義が正しく機能
- [ ] **HTTP通信**: node-fetchを使用したAPI通信が動作

### 次フェーズ準備
- [ ] **Task 1-3準備**: MCPツール実装で使用できる状態
- [ ] **WebUI連携準備**: HTTP経由でMCPサーバーにアクセス可能

## 注意事項

### 【厳守事項】
- **TDD順序**: テスト実装を必ず先に行うこと
- **段階的実装**: Task 1-1完了後にTask 1-2開始
- **エラーハンドリング**: 必ず適切なエラー処理を実装

### 【統合テストについて】
**YES** - Task 1-1とTask 1-2でまとまったテストが可能です：

1. **個別動作確認**
   - MCPプロトコル処理が正常動作
   - Todoistクライアントが正常動作

2. **統合動作確認**
   - MCPサーバー起動とHTTPリクエスト処理
   - 基本的なサーバー機能の動作確認

3. **次フェーズ準備**
   - Task 1-3（MCPツール実装）の基盤が完成
   - Phase 2（WebUI）から接続可能な状態

## 参考情報
- [Todoist REST API Documentation](https://developer.todoist.com/rest/v2/)
- [MCP Protocol Specification](https://spec.modelcontextprotocol.io/) 