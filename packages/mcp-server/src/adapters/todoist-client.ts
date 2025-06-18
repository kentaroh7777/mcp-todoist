import axios, { AxiosResponse, AxiosError } from 'axios';
import { 
  TodoistTask, 
  TodoistProject, 
  GetTasksParams, 
  CreateTaskParams, 
  UpdateTaskParams,
  CreateProjectParams,
  UpdateProjectParams
} from '../types/todoist';

export class TodoistApiError extends Error {
  constructor(
    public status: number,
    public message: string,
    public description?: string
  ) {
    super(message);
    this.name = 'TodoistApiError';
  }
}

export class TodoistClient {
  private baseURL: string;
  private apiToken: string;
  private timeout: number;
  private maxRetries: number;

  constructor(apiToken: string, timeout: number = 3000, maxRetries: number = 2) {
    if (!apiToken || apiToken.trim() === '') {
      throw new Error('Todoist API token is required');
    }
    this.apiToken = apiToken;
    this.baseURL = 'https://api.todoist.com/rest/v2';
    this.timeout = timeout;
    this.maxRetries = maxRetries;
  }

  private async makeRequest<T>(
    method: 'GET' | 'POST' | 'DELETE',
    endpoint: string,
    data?: any,
    params?: any
  ): Promise<T> {
    let lastError: any;
    
    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        const response: AxiosResponse<T> = await axios({
          method,
          url: `${this.baseURL}${endpoint}`,
          headers: {
            'Authorization': `Bearer ${this.apiToken}`,
            'Content-Type': 'application/json',
          },
          data,
          params,
          timeout: this.timeout,
        });

        return response.data;
      } catch (error) {
        lastError = error;
        
        if (error instanceof AxiosError && error.response) {
          const { status, data } = error.response;
          let message = 'Unknown error';
          let description = '';

          if (data && typeof data === 'object') {
            if (data.error) {
              message = data.error;
            } else if (status === 401) {
              message = 'Unauthorized';
              description = 'Invalid API token';
            } else if (status === 429) {
              message = 'Too Many Requests';
              description = 'Rate limit exceeded';
            } else if (status === 500) {
              message = 'Internal Server Error';
              description = '';
            }
            
            if (data.error_description) {
              description = data.error_description;
            }
          }

          // Don't retry for client errors (4xx) except 429
          if (status >= 400 && status < 500 && status !== 429) {
            throw new TodoistApiError(status, description ? `${message}: ${description}` : message);
          }
          
          // Retry for server errors (5xx) and rate limiting (429)
          if (attempt < this.maxRetries && (status >= 500 || status === 429)) {
            await this.delay(Math.pow(2, attempt) * 1000); // Exponential backoff
            continue;
          }
          
          throw new TodoistApiError(status, description ? `${message}: ${description}` : message);
        }
        
        // Retry for network errors
        if (attempt < this.maxRetries) {
          await this.delay(Math.pow(2, attempt) * 1000);
          continue;
        }
        
        throw error;
      }
    }
    
    throw lastError;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async getTasks(params?: GetTasksParams): Promise<TodoistTask[]> {
    return this.makeRequest<TodoistTask[]>('GET', '/tasks', undefined, params);
  }

  async createTask(taskData: CreateTaskParams): Promise<TodoistTask> {
    if (!taskData.content || taskData.content.trim() === '') {
      throw new Error('Task content is required');
    }
    return this.makeRequest<TodoistTask>('POST', '/tasks', taskData);
  }

  async updateTask(taskId: string, updateData: UpdateTaskParams): Promise<TodoistTask> {
    return this.makeRequest<TodoistTask>('POST', `/tasks/${taskId}`, updateData);
  }

  async deleteTask(taskId: string): Promise<void> {
    await this.makeRequest<void>('DELETE', `/tasks/${taskId}`);
  }

  async getProjects(): Promise<TodoistProject[]> {
    return this.makeRequest<TodoistProject[]>('GET', '/projects');
  }

  async getProject(projectId: string): Promise<TodoistProject> {
    return this.makeRequest<TodoistProject>('GET', `/projects/${projectId}`);
  }

  async createProject(projectData: CreateProjectParams): Promise<TodoistProject> {
    return this.makeRequest<TodoistProject>('POST', '/projects', projectData);
  }

  async updateProject(projectId: string, updateData: UpdateProjectParams): Promise<TodoistProject> {
    return this.makeRequest<TodoistProject>('POST', `/projects/${projectId}`, updateData);
  }

  async deleteProject(projectId: string): Promise<void> {
    await this.makeRequest<void>('DELETE', `/projects/${projectId}`);
  }

  async closeTask(taskId: string): Promise<void> {
    await this.makeRequest<void>('POST', `/tasks/${taskId}/close`);
  }

  async reopenTask(taskId: string): Promise<void> {
    await this.makeRequest<void>('POST', `/tasks/${taskId}/reopen`);
  }

  async getTask(taskId: string): Promise<TodoistTask> {
    return this.makeRequest<TodoistTask>('GET', `/tasks/${taskId}`);
  }
}