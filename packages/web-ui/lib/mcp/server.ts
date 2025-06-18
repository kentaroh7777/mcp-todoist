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

export class MCPServer {
  private tools: Map<string, MCPTool> = new Map();
  private handlers: Map<string, (params: any) => Promise<any>> = new Map();

  constructor() {
    this.registerDefaultTools();
  }

  private registerDefaultTools() {
    // タスク作成ツール
    this.registerTool({
      name: "create_task",
      description: "新しいタスクを作成します",
      inputSchema: {
        type: "object",
        properties: {
          content: { type: "string", description: "タスクの内容" },
          description: { type: "string", description: "タスクの詳細説明" },
          priority: { type: "number", description: "優先度（1-4）", minimum: 1, maximum: 4 },
          due_date: { type: "string", description: "期限日（YYYY-MM-DD）" },
          project_id: { type: "string", description: "プロジェクトID" },
          labels: { type: "array", items: { type: "string" }, description: "ラベル" }
        },
        required: ["content"]
      }
    }, this.createTask.bind(this));

    // タスク一覧取得ツール
    this.registerTool({
      name: "get_tasks",
      description: "タスク一覧を取得します",
      inputSchema: {
        type: "object",
        properties: {
          project_id: { type: "string", description: "プロジェクトID（指定時はそのプロジェクトのタスクのみ）" },
          filter: { type: "string", description: "フィルター条件" },
          limit: { type: "number", description: "取得件数制限", minimum: 1, maximum: 100 }
        },
        required: []
      }
    }, this.getTasks.bind(this));

    // タスク更新ツール
    this.registerTool({
      name: "update_task",
      description: "既存のタスクを更新します",
      inputSchema: {
        type: "object",
        properties: {
          id: { type: "string", description: "タスクID" },
          content: { type: "string", description: "タスクの内容" },
          description: { type: "string", description: "タスクの詳細説明" },
          priority: { type: "number", description: "優先度（1-4）", minimum: 1, maximum: 4 },
          due_date: { type: "string", description: "期限日（YYYY-MM-DD）" },
          is_completed: { type: "boolean", description: "完了状態" }
        },
        required: ["id"]
      }
    }, this.updateTask.bind(this));

    // プロジェクト作成ツール
    this.registerTool({
      name: "create_project",
      description: "新しいプロジェクトを作成します",
      inputSchema: {
        type: "object",
        properties: {
          name: { type: "string", description: "プロジェクト名" },
          color: { type: "string", description: "プロジェクトの色" },
          parent_id: { type: "string", description: "親プロジェクトID" }
        },
        required: ["name"]
      }
    }, this.createProject.bind(this));

    // プロジェクト一覧取得ツール
    this.registerTool({
      name: "get_projects",
      description: "プロジェクト一覧を取得します",
      inputSchema: {
        type: "object",
        properties: {},
        required: []
      }
    }, this.getProjects.bind(this));
  }

  registerTool(tool: MCPTool, handler: (params: any) => Promise<any>) {
    this.tools.set(tool.name, tool);
    this.handlers.set(tool.name, handler);
  }

  async handleRequest(request: MCPRequest): Promise<MCPResponse> {
    try {
      switch (request.method) {
        case "tools/list":
          return {
            jsonrpc: "2.0",
            id: request.id,
            result: {
              tools: Array.from(this.tools.values())
            }
          };

        case "tools/call":
          const { name, arguments: args } = request.params || {};
          const handler = this.handlers.get(name);
          
          if (!handler) {
            return {
              jsonrpc: "2.0",
              id: request.id,
              error: {
                code: -32601,
                message: `Unknown tool: ${name}`
              }
            };
          }

          const result = await handler(args);
          return {
            jsonrpc: "2.0",
            id: request.id,
            result
          };

        case "initialize":
          return {
            jsonrpc: "2.0",
            id: request.id,
            result: {
              protocolVersion: "2024-11-05",
              capabilities: {
                tools: {}
              },
              serverInfo: {
                name: "mcp-todoist",
                version: "1.0.0"
              }
            }
          };

        default:
          return {
            jsonrpc: "2.0",
            id: request.id,
            error: {
              code: -32601,
              message: `Unknown method: ${request.method}`
            }
          };
      }
    } catch (error) {
      return {
        jsonrpc: "2.0",
        id: request.id,
        error: {
          code: -32603,
          message: "Internal error",
          data: error instanceof Error ? error.message : "Unknown error"
        }
      };
    }
  }

  // ツール実装メソッド
  private async createTask(params: any) {
    try {
      // サンプルデータでタスク作成をシミュレート
      const task = {
        id: `task_${Date.now()}`,
        content: params.content,
        description: params.description || "",
        priority: params.priority || 1,
        due_date: params.due_date,
        project_id: params.project_id,
        labels: params.labels || [],
        is_completed: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      return {
        success: true,
        message: "Task created successfully",
        data: task
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to create task: ${error instanceof Error ? error.message : 'Unknown error'}`,
        data: null
      };
    }
  }

  private async getTasks(params: any) {
    try {
      // サンプルタスクデータ
      const sampleTasks = [
        {
          id: "task_1",
          content: "サンプルタスク1",
          description: "これはサンプルのタスクです",
          priority: 2,
          is_completed: false,
          project_id: params.project_id || "inbox",
          labels: ["sample"],
          created_at: "2024-12-06T10:00:00Z",
          updated_at: "2024-12-06T10:00:00Z",
        },
        {
          id: "task_2", 
          content: "サンプルタスク2",
          description: "完了済みのタスク",
          priority: 1,
          is_completed: true,
          project_id: params.project_id || "inbox",
          labels: ["sample", "completed"],
          created_at: "2024-12-05T09:00:00Z",
          updated_at: "2024-12-06T11:00:00Z",
        }
      ];

      const filteredTasks = params.project_id 
        ? sampleTasks.filter(task => task.project_id === params.project_id)
        : sampleTasks;

      const limitedTasks = params.limit 
        ? filteredTasks.slice(0, params.limit)
        : filteredTasks;

      return {
        success: true,
        tasks: limitedTasks,
        total: limitedTasks.length
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to get tasks: ${error instanceof Error ? error.message : 'Unknown error'}`,
        tasks: []
      };
    }
  }

  private async updateTask(params: any) {
    try {
      const updatedTask = {
        id: params.id,
        content: params.content,
        description: params.description,
        priority: params.priority,
        due_date: params.due_date,
        is_completed: params.is_completed,
        updated_at: new Date().toISOString(),
      };

      return {
        success: true,
        message: "Task updated successfully",
        data: updatedTask
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to update task: ${error instanceof Error ? error.message : 'Unknown error'}`,
        data: null
      };
    }
  }

  private async createProject(params: any) {
    try {
      const project = {
        id: `project_${Date.now()}`,
        name: params.name,
        color: params.color || "#808080",
        parent_id: params.parent_id,
        order: Date.now(),
        is_archived: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      return {
        success: true,
        message: "Project created successfully",
        data: project
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to create project: ${error instanceof Error ? error.message : 'Unknown error'}`,
        data: null
      };
    }
  }

  private async getProjects(params: any) {
    try {
      const sampleProjects = [
        {
          id: "inbox",
          name: "インボックス",
          color: "#808080",
          order: 1,
          is_archived: false,
          created_at: "2024-12-01T00:00:00Z",
          updated_at: "2024-12-01T00:00:00Z",
        },
        {
          id: "project_1",
          name: "仕事",
          color: "#ff9933",
          order: 2,
          is_archived: false,
          created_at: "2024-12-02T00:00:00Z",
          updated_at: "2024-12-02T00:00:00Z",
        },
        {
          id: "project_2",
          name: "個人",
          color: "#3399ff",
          order: 3,
          is_archived: false,
          created_at: "2024-12-03T00:00:00Z",
          updated_at: "2024-12-03T00:00:00Z",
        }
      ];

      return {
        success: true,
        projects: sampleProjects,
        total: sampleProjects.length
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to get projects: ${error instanceof Error ? error.message : 'Unknown error'}`,
        projects: []
      };
    }
  }
} 