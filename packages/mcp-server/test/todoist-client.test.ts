import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import nock from 'nock';
import { TodoistClient } from '../src/adapters/todoist-client';
import { mockTasks, mockProjects, mockTaskCreateRequest, mockTaskCreateResponse, mockErrorResponses } from './fixtures/todoist-responses';

const TODOIST_API_BASE = 'https://api.todoist.com/rest/v2';
const MOCK_TOKEN = 'test-token-123';

describe('TodoistClient', () => {
  let client: TodoistClient;

  beforeEach(() => {
    // Clean all HTTP mocks before each test
    nock.cleanAll();
  });

  afterEach(() => {
    // Clean up after each test
    nock.cleanAll();
  });

  describe('Constructor', () => {
    it('should initialize with API token', () => {
      client = new TodoistClient(MOCK_TOKEN);
      expect(client).toBeDefined();
    });

    it('should throw error when API token is not provided', () => {
      expect(() => {
        new TodoistClient('');
      }).toThrow('Todoist API token is required');
    });

    it('should set base URL correctly', () => {
      client = new TodoistClient(MOCK_TOKEN);
      // Access private property for testing
      expect((client as any).baseURL).toBe(TODOIST_API_BASE);
    });
  });

  describe('getTasks', () => {
    beforeEach(() => {
      client = new TodoistClient(MOCK_TOKEN);
    });

    it('should fetch all tasks successfully', async () => {
      nock(TODOIST_API_BASE)
        .get('/tasks')
        .reply(200, mockTasks);

      const tasks = await client.getTasks();
      expect(tasks).toEqual(mockTasks);
      expect(tasks).toHaveLength(2);
    });

    it('should fetch tasks with project filter', async () => {
      const projectId = '220474322';
      const filteredTasks = mockTasks.filter(task => task.project_id === projectId);

      nock(TODOIST_API_BASE)
        .get('/tasks')
        .query({ project_id: projectId })
        .reply(200, filteredTasks);

      const tasks = await client.getTasks({ project_id: projectId });
      expect(tasks).toEqual(filteredTasks);
      expect(tasks).toHaveLength(1);
    });

    it('should handle 401 Unauthorized error', async () => {
      nock(TODOIST_API_BASE)
        .get('/tasks')
        .reply(401, mockErrorResponses.unauthorized.data);

      await expect(client.getTasks()).rejects.toThrow('Unauthorized: Invalid API token');
    });

    it('should handle network errors', async () => {
      // Create a client with no retries to avoid retry logic interfering
      const noRetryClient = new TodoistClient('test-token-123', 3000, 0);
      
      const scope = nock(TODOIST_API_BASE)
        .get('/tasks')
        .replyWithError('Network error');

      await expect(noRetryClient.getTasks()).rejects.toThrow('Network error');
      expect(scope.isDone()).toBe(true);
    });

    it('should handle empty response', async () => {
      nock(TODOIST_API_BASE)
        .get('/tasks')
        .reply(200, []);

      const tasks = await client.getTasks();
      expect(tasks).toEqual([]);
      expect(tasks).toHaveLength(0);
    });
  });

  describe('createTask', () => {
    beforeEach(() => {
      client = new TodoistClient(MOCK_TOKEN);
    });

    it('should create task with content only', async () => {
      const taskData = { content: 'New task' };

      nock(TODOIST_API_BASE)
        .post('/tasks', taskData)
        .reply(200, mockTaskCreateResponse);

      const task = await client.createTask(taskData);
      expect(task).toEqual(mockTaskCreateResponse);
      expect(task.content).toBe('New task');
    });

    it('should create task with project specification', async () => {
      nock(TODOIST_API_BASE)
        .post('/tasks', mockTaskCreateRequest)
        .reply(200, mockTaskCreateResponse);

      const task = await client.createTask(mockTaskCreateRequest);
      expect(task).toEqual(mockTaskCreateResponse);
      expect(task.project_id).toBe('220474322');
    });

    it('should create task with due date', async () => {
      const taskWithDue = {
        content: 'Task with deadline',
        due_string: 'tomorrow'
      };

      nock(TODOIST_API_BASE)
        .post('/tasks', taskWithDue)
        .reply(200, { ...mockTaskCreateResponse, content: 'Task with deadline' });

      const task = await client.createTask(taskWithDue);
      expect(task.content).toBe('Task with deadline');
      expect(task.due).toBeTruthy();
    });

    it('should throw error when content is missing', async () => {
      const invalidTaskData = { description: 'Only description' };

      await expect(client.createTask(invalidTaskData as any)).rejects.toThrow('Task content is required');
    });

    it('should handle API error during task creation', async () => {
      const taskData = { content: 'New task' };

      nock(TODOIST_API_BASE)
        .post('/tasks', taskData)
        .reply(400, mockErrorResponses.badRequest.data);

      await expect(client.createTask(taskData)).rejects.toThrow('Bad Request: Invalid request parameters');
    });
  });

  describe('updateTask', () => {
    beforeEach(() => {
      client = new TodoistClient(MOCK_TOKEN);
    });

    it('should update task successfully', async () => {
      const taskId = '2995104339';
      const updateData = { content: 'Updated task content' };
      const updatedTask = { ...mockTasks[0], content: 'Updated task content' };

      nock(TODOIST_API_BASE)
        .post(`/tasks/${taskId}`, updateData)
        .reply(200, updatedTask);

      const task = await client.updateTask(taskId, updateData);
      expect(task.content).toBe('Updated task content');
    });

    it('should handle non-existent task ID', async () => {
      const taskId = 'non-existent-id';
      const updateData = { content: 'Updated content' };

      nock(TODOIST_API_BASE)
        .post(`/tasks/${taskId}`, updateData)
        .reply(404, mockErrorResponses.notFound.data);

      await expect(client.updateTask(taskId, updateData)).rejects.toThrow('Not Found: Task not found');
    });
  });

  describe('deleteTask', () => {
    beforeEach(() => {
      client = new TodoistClient(MOCK_TOKEN);
    });

    it('should delete task successfully', async () => {
      const taskId = '2995104339';

      nock(TODOIST_API_BASE)
        .delete(`/tasks/${taskId}`)
        .reply(204);

      await expect(client.deleteTask(taskId)).resolves.not.toThrow();
    });

    it('should handle non-existent task ID during deletion', async () => {
      const taskId = 'non-existent-id';

      nock(TODOIST_API_BASE)
        .delete(`/tasks/${taskId}`)
        .reply(404, mockErrorResponses.notFound.data);

      await expect(client.deleteTask(taskId)).rejects.toThrow('Not Found: Task not found');
    });
  });

  describe('getProjects', () => {
    beforeEach(() => {
      client = new TodoistClient(MOCK_TOKEN);
    });

    it('should fetch all projects successfully', async () => {
      nock(TODOIST_API_BASE)
        .get('/projects')
        .reply(200, mockProjects);

      const projects = await client.getProjects();
      expect(projects).toEqual(mockProjects);
      expect(projects).toHaveLength(2);
    });

    it('should handle API error during projects fetch', async () => {
      nock(TODOIST_API_BASE)
        .get('/projects')
        .reply(401, mockErrorResponses.unauthorized.data);

      await expect(client.getProjects()).rejects.toThrow('Unauthorized: Invalid API token');
    });
  });
});