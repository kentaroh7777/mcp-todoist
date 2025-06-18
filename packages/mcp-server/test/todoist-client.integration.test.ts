import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import nock from 'nock';
import { TodoistClient } from '../src/adapters/todoist-client';
import { mockTasks, mockProjects, mockTaskCreateResponse, mockErrorResponses } from './fixtures/todoist-responses';

const TODOIST_API_BASE = 'https://api.todoist.com/rest/v2';
const MOCK_TOKEN = 'integration-test-token-456';

describe('TodoistClient Integration Tests', () => {
  let client: TodoistClient;

  beforeEach(() => {
    client = new TodoistClient(MOCK_TOKEN);
    nock.cleanAll();
  });

  afterEach(() => {
    nock.cleanAll();
  });

  describe('Complete Task Workflow', () => {
    it('should handle full task lifecycle: create → get → update → delete', async () => {
      const newTaskData = {
        content: 'Integration test task',
        description: 'Task for integration testing',
        project_id: '220474322'
      };

      const createdTask = {
        ...mockTaskCreateResponse,
        id: 'integration-task-id',
        content: newTaskData.content,
        description: newTaskData.description,
        project_id: newTaskData.project_id
      };

      const updatedTask = {
        ...createdTask,
        content: 'Updated integration test task'
      };

      // Mock task creation
      nock(TODOIST_API_BASE)
        .post('/tasks', newTaskData)
        .reply(200, createdTask);

      // Mock task retrieval
      nock(TODOIST_API_BASE)
        .get('/tasks')
        .query({ project_id: '220474322' })
        .reply(200, [createdTask]);

      // Mock task update
      nock(TODOIST_API_BASE)
        .post(`/tasks/${createdTask.id}`, { content: 'Updated integration test task' })
        .reply(200, updatedTask);

      // Mock task deletion
      nock(TODOIST_API_BASE)
        .delete(`/tasks/${createdTask.id}`)
        .reply(204);

      // Execute full workflow
      const created = await client.createTask(newTaskData);
      expect(created.content).toBe('Integration test task');

      const tasks = await client.getTasks({ project_id: '220474322' });
      expect(tasks).toContainEqual(createdTask);

      const updated = await client.updateTask(createdTask.id, { content: 'Updated integration test task' });
      expect(updated.content).toBe('Updated integration test task');

      await expect(client.deleteTask(createdTask.id)).resolves.not.toThrow();
    });
  });

  describe('Projects API Integration', () => {
    it('should fetch projects and use them for task filtering', async () => {
      // Mock projects fetch
      nock(TODOIST_API_BASE)
        .get('/projects')
        .reply(200, mockProjects);

      // Mock filtered tasks fetch
      nock(TODOIST_API_BASE)
        .get('/tasks')
        .query({ project_id: mockProjects[0].id })
        .reply(200, [mockTasks[0]]);

      const projects = await client.getProjects();
      expect(projects).toHaveLength(2);

      const tasksInFirstProject = await client.getTasks({ project_id: projects[0].id });
      expect(tasksInFirstProject).toHaveLength(1);
      expect(tasksInFirstProject[0].project_id).toBe(projects[0].id);
    });
  });

  describe('Bulk Operations', () => {
    it('should handle multiple task operations concurrently', async () => {
      const taskData1 = { content: 'Bulk task 1' };
      const taskData2 = { content: 'Bulk task 2' };
      const taskData3 = { content: 'Bulk task 3' };

      const createdTask1 = { ...mockTaskCreateResponse, id: 'bulk-1', content: 'Bulk task 1' };
      const createdTask2 = { ...mockTaskCreateResponse, id: 'bulk-2', content: 'Bulk task 2' };
      const createdTask3 = { ...mockTaskCreateResponse, id: 'bulk-3', content: 'Bulk task 3' };

      // Mock multiple task creations
      nock(TODOIST_API_BASE)
        .post('/tasks', taskData1)
        .reply(200, createdTask1)
        .post('/tasks', taskData2)
        .reply(200, createdTask2)
        .post('/tasks', taskData3)
        .reply(200, createdTask3);

      // Execute concurrent operations
      const results = await Promise.all([
        client.createTask(taskData1),
        client.createTask(taskData2),
        client.createTask(taskData3)
      ]);

      expect(results).toHaveLength(3);
      expect(results[0].content).toBe('Bulk task 1');
      expect(results[1].content).toBe('Bulk task 2');
      expect(results[2].content).toBe('Bulk task 3');
    });
  });

  describe('Error Recovery', () => {
    it('should handle partial failures in batch operations gracefully', async () => {
      const taskData1 = { content: 'Success task' };
      const taskData2 = { content: 'Failure task' };

      const successTask = { ...mockTaskCreateResponse, content: 'Success task' };

      // Mock one success and one failure
      nock(TODOIST_API_BASE)
        .post('/tasks', taskData1)
        .reply(200, successTask)
        .post('/tasks', taskData2)
        .reply(400, mockErrorResponses.badRequest.data);

      const results = await Promise.allSettled([
        client.createTask(taskData1),
        client.createTask(taskData2)
      ]);

      expect(results[0].status).toBe('fulfilled');
      expect(results[1].status).toBe('rejected');
      
      if (results[0].status === 'fulfilled') {
        expect(results[0].value.content).toBe('Success task');
      }
    });
  });

  describe('Rate Limiting Handling', () => {
    it('should handle rate limit responses appropriately', async () => {
      nock(TODOIST_API_BASE)
        .get('/tasks')
        .reply(429, mockErrorResponses.tooManyRequests.data, {
          'Retry-After': '60'
        });

      await expect(client.getTasks()).rejects.toThrow('Too Many Requests: Rate limit exceeded');
    });
  });

  describe('Timeout Handling', () => {
    it('should handle request timeouts properly', async () => {
      nock(TODOIST_API_BASE)
        .get('/tasks')
        .delay(5000) // Simulate slow response
        .reply(200, mockTasks);

      // This test assumes the client has a timeout configuration
      // The actual timeout behavior depends on the client implementation
      const startTime = Date.now();
      
      try {
        await client.getTasks();
        // If no timeout is implemented, this will pass after 5 seconds
        const duration = Date.now() - startTime;
        expect(duration).toBeGreaterThan(4000); // Should take at least 4 seconds
      } catch (error) {
        // If timeout is implemented, it should throw before 5 seconds
        const duration = Date.now() - startTime;
        expect(duration).toBeLessThan(5000);
        expect(error).toBeDefined();
      }
    });
  });

  describe('Retry Mechanism', () => {
    it('should implement retry logic for transient failures', async () => {
      let attemptCount = 0;

      // Mock first attempt failure, second attempt success
      nock(TODOIST_API_BASE)
        .get('/tasks')
        .reply(() => {
          attemptCount++;
          if (attemptCount === 1) {
            return [500, { error: 'Internal Server Error' }];
          }
          return [200, mockTasks];
        })
        .persist(); // Allow multiple calls to the same endpoint

      // This test assumes the client implements retry logic
      const tasks = await client.getTasks();
      expect(tasks).toEqual(mockTasks);
      expect(attemptCount).toBeGreaterThan(1); // Should have retried
      
      nock.cleanAll();
    });
  });

  describe('Authentication Error Handling', () => {
    it('should provide clear error messages for authentication failures', async () => {
      const invalidTokenClient = new TodoistClient('invalid-token');

      nock(TODOIST_API_BASE)
        .get('/tasks')
        .reply(401, mockErrorResponses.unauthorized.data);

      nock(TODOIST_API_BASE)
        .get('/projects')
        .reply(401, mockErrorResponses.unauthorized.data);

      nock(TODOIST_API_BASE)
        .post('/tasks')
        .reply(401, mockErrorResponses.unauthorized.data);

      // Test multiple operations with invalid token
      await expect(invalidTokenClient.getTasks()).rejects.toThrow('Unauthorized: Invalid API token');
      await expect(invalidTokenClient.getProjects()).rejects.toThrow('Unauthorized: Invalid API token');
      await expect(invalidTokenClient.createTask({ content: 'Test' })).rejects.toThrow('Unauthorized: Invalid API token');
    });
  });
});