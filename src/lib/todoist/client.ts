export type TodoistTask = {
  id: string;
  project_id: string;
  content: string;
  description: string;
  is_completed: boolean;
  priority: number;
  order: number;
  due?: {
    date: string;
    timezone?: string;
  };
  labels: string[];
  parent_id?: string;
  created_at: string;
  updated_at: string;
};

export type TodoistProject = {
  id: string;
  name: string;
  color: string;
  parent_id?: string;
  order: number;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
};

export class TodoistClient {
  private baseUrl = 'https://api.todoist.com/rest/v2';
  private token: string;

  constructor(token: string) {
    this.token = token;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      throw new Error(`Todoist API error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  // タスク関連メソッド
  async getTasks(projectId?: string): Promise<TodoistTask[]> {
    const params = new URLSearchParams();
    if (projectId) {
      params.append('project_id', projectId);
    }
    
    const query = params.toString();
    const endpoint = `/tasks${query ? `?${query}` : ''}`;
    
    return this.request<TodoistTask[]>(endpoint);
  }

  async createTask(task: {
    content: string;
    description?: string;
    project_id?: string;
    priority?: number;
    due_date?: string;
    labels?: string[];
  }): Promise<TodoistTask> {
    return this.request<TodoistTask>('/tasks', {
      method: 'POST',
      body: JSON.stringify(task),
    });
  }

  async updateTask(id: string, updates: {
    content?: string;
    description?: string;
    priority?: number;
    due_date?: string;
    labels?: string[];
  }): Promise<TodoistTask> {
    return this.request<TodoistTask>(`/tasks/${id}`, {
      method: 'POST',
      body: JSON.stringify(updates),
    });
  }

  async closeTask(id: string): Promise<boolean> {
    await this.request(`/tasks/${id}/close`, {
      method: 'POST',
    });
    return true;
  }

  // プロジェクト関連メソッド
  async getProjects(): Promise<TodoistProject[]> {
    return this.request<TodoistProject[]>('/projects');
  }

  async createProject(project: {
    name: string;
    color?: string;
    parent_id?: string;
  }): Promise<TodoistProject> {
    return this.request<TodoistProject>('/projects', {
      method: 'POST',
      body: JSON.stringify(project),
    });
  }
}