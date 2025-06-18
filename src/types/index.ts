// Convex ID type (will be generated after convex setup)
type Id<T extends string> = string & { __tableName: T };

export type User = {
  _id: Id<"users">;
  email: string;
  name: string;
  todoistApiToken?: string;
  createdAt: number;
  updatedAt: number;
};

export type Project = {
  _id: Id<"projects">;
  userId: Id<"users">;
  todoistId?: string;
  name: string;
  color?: string;
  parentId?: Id<"projects">;
  order: number;
  isArchived: boolean;
  createdAt: number;
  updatedAt: number;
};

export type Task = {
  _id: Id<"tasks">;
  userId: Id<"users">;
  projectId?: Id<"projects">;
  todoistId?: string;
  content: string;
  description?: string;
  isCompleted: boolean;
  priority: number;
  order: number;
  dueDate?: number;
  labels: string[];
  parentId?: Id<"tasks">;
  createdAt: number;
  updatedAt: number;
};

export type Label = {
  _id: Id<"labels">;
  userId: Id<"users">;
  todoistId?: string;
  name: string;
  color?: string;
  order: number;
  createdAt: number;
  updatedAt: number;
};

export type SyncStatus = {
  _id: Id<"syncStatus">;
  userId: Id<"users">;
  lastSyncAt: number;
  syncToken?: string;
  isEnabled: boolean;
};

// Todoist API types
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

// MCP Protocol types
export type MCPRequest = {
  jsonrpc: "2.0";
  id: string | number;
  method: string;
  params?: Record<string, any>;
};

export type MCPResponse = {
  jsonrpc: "2.0";
  id: string | number;
  result?: any;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
};

export type MCPTool = {
  name: string;
  description: string;
  inputSchema: {
    type: "object";
    properties: Record<string, any>;
    required?: string[];
  };
}; 