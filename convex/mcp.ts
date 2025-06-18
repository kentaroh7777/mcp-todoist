import { v } from "convex/values";
import { action, mutation, query } from "./_generated/server";
import { api } from "./_generated/api";

// MCP Request/Response types
const MCPRequest = v.object({
  jsonrpc: v.literal("2.0"),
  id: v.union(v.string(), v.number()),
  method: v.string(),
  params: v.optional(v.any()),
});

const MCPResponse = v.object({
  jsonrpc: v.literal("2.0"),
  id: v.union(v.string(), v.number()),
  result: v.optional(v.any()),
  error: v.optional(v.object({
    code: v.number(),
    message: v.string(),
    data: v.optional(v.any()),
  })),
});

// MCP session management
export const createMCPSession = mutation({
  args: {
    userId: v.id("users"),
    clientInfo: v.object({
      name: v.string(),
      version: v.string(),
    }),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("mcpSessions", {
      userId: args.userId,
      clientInfo: args.clientInfo,
      protocolVersion: "2024-11-05",
      connected: true,
      createdAt: Date.now(),
      lastActivity: Date.now(),
    });
  },
});

export const getMCPSession = query({
  args: { sessionId: v.id("mcpSessions") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.sessionId);
  },
});

// Main MCP Action - handles all MCP protocol calls
export const handleMCPRequest = action({
  args: {
    sessionId: v.id("mcpSessions"),
    request: MCPRequest,
  },
  handler: async (ctx, { sessionId, request }) => {
    try {
      // Update session activity
      await ctx.runMutation(api.mcp.updateSessionActivity, { sessionId });

      // Route based on method
      switch (request.method) {
        case "initialize":
          return await handleInitialize(ctx, request);
        
        case "tools/list":
          return await handleToolsList(ctx, request);
        
        case "tools/call":
          return await handleToolsCall(ctx, request, sessionId);
        
        case "resources/list":
          return await handleResourcesList(ctx, request, sessionId);
        
        case "resources/read":
          return await handleResourcesRead(ctx, request, sessionId);
        
        case "prompts/list":
          return await handlePromptsList(ctx, request);
        
        case "prompts/get":
          return await handlePromptsGet(ctx, request, sessionId);
        
        default:
          return {
            jsonrpc: "2.0" as const,
            id: request.id,
            error: {
              code: -32601,
              message: "Method not found",
              data: `Unknown method: ${request.method}`,
            },
          };
      }
    } catch (error) {
      return {
        jsonrpc: "2.0" as const,
        id: request.id,
        error: {
          code: -32603,
          message: "Internal error",
          data: error instanceof Error ? error.message : String(error),
        },
      };
    }
  },
});

// Initialize handler
async function handleInitialize(ctx: any, request: any) {
  return {
    jsonrpc: "2.0" as const,
    id: request.id,
    result: {
      protocolVersion: "2024-11-05",
      capabilities: {
        tools: { listChanged: true },
        resources: { subscribe: true },
        prompts: {},
      },
      serverInfo: {
        name: "mcp-todoist-convex",
        version: "1.0.0",
      },
    },
  };
}

// Tools list handler
async function handleToolsList(ctx: any, request: any) {
  const tools = [
    {
      name: "todoist_get_tasks",
      description: "Get tasks from Todoist",
      inputSchema: {
        type: "object",
        properties: {
          project_id: { type: "string", description: "Project ID to filter tasks" },
          filter: { type: "string", description: "Filter expression" },
          label: { type: "string", description: "Label to filter by" },
        },
      },
    },
    {
      name: "todoist_create_task",
      description: "Create a new task in Todoist",
      inputSchema: {
        type: "object",
        properties: {
          content: { type: "string", description: "Task content" },
          description: { type: "string", description: "Task description" },
          project_id: { type: "string", description: "Project ID" },
          priority: { type: "number", description: "Priority (1-4)" },
          due_date: { type: "string", description: "Due date (YYYY-MM-DD)" },
          labels: { type: "array", items: { type: "string" }, description: "Labels" },
        },
        required: ["content"],
      },
    },
    {
      name: "todoist_update_task",
      description: "Update an existing task",
      inputSchema: {
        type: "object",
        properties: {
          task_id: { type: "string", description: "Task ID" },
          content: { type: "string", description: "New content" },
          description: { type: "string", description: "New description" },
          priority: { type: "number", description: "New priority" },
          due_date: { type: "string", description: "New due date" },
          labels: { type: "array", items: { type: "string" }, description: "New labels" },
        },
        required: ["task_id"],
      },
    },
    {
      name: "todoist_complete_task",
      description: "Mark a task as completed",
      inputSchema: {
        type: "object",
        properties: {
          task_id: { type: "string", description: "Task ID to complete" },
        },
        required: ["task_id"],
      },
    },
    {
      name: "todoist_get_projects",
      description: "Get projects from Todoist",
      inputSchema: {
        type: "object",
        properties: {},
      },
    },
    {
      name: "todoist_create_project",
      description: "Create a new project",
      inputSchema: {
        type: "object",
        properties: {
          name: { type: "string", description: "Project name" },
          color: { type: "string", description: "Project color" },
          parent_id: { type: "string", description: "Parent project ID" },
        },
        required: ["name"],
      },
    },
  ];

  return {
    jsonrpc: "2.0" as const,
    id: request.id,
    result: { tools },
  };
}

// Tools call handler - delegates to specific Convex mutations/actions
async function handleToolsCall(ctx: any, request: any, sessionId: string) {
  const { name, arguments: args } = request.params;

  switch (name) {
    case "todoist_get_tasks":
      const tasks = await ctx.runQuery(api.tasks.getByFilter, {
        sessionId,
        filter: args,
      });
      return {
        jsonrpc: "2.0" as const,
        id: request.id,
        result: {
          content: [
            {
              type: "text",
              text: JSON.stringify(tasks),
            },
          ],
        },
      };

    case "todoist_create_task":
      const newTask = await ctx.runMutation(api.tasks.create, {
        sessionId,
        ...args,
      });
      return {
        jsonrpc: "2.0" as const,
        id: request.id,
        result: {
          content: [
            {
              type: "text",
              text: JSON.stringify(newTask),
            },
          ],
        },
      };

    case "todoist_update_task":
      const updatedTask = await ctx.runMutation(api.tasks.update, {
        sessionId,
        ...args,
      });
      return {
        jsonrpc: "2.0" as const,
        id: request.id,
        result: {
          content: [
            {
              type: "text",
              text: JSON.stringify(updatedTask),
            },
          ],
        },
      };

    case "todoist_complete_task":
      const completedTask = await ctx.runMutation(api.tasks.complete, {
        sessionId,
        taskId: args.task_id,
      });
      return {
        jsonrpc: "2.0" as const,
        id: request.id,
        result: {
          content: [
            {
              type: "text",
              text: JSON.stringify(completedTask),
            },
          ],
        },
      };

    case "todoist_get_projects":
      const projects = await ctx.runQuery(api.projects.getBySession, {
        sessionId,
      });
      return {
        jsonrpc: "2.0" as const,
        id: request.id,
        result: {
          content: [
            {
              type: "text",
              text: JSON.stringify(projects),
            },
          ],
        },
      };

    case "todoist_create_project":
      const newProject = await ctx.runMutation(api.projects.create, {
        sessionId,
        ...args,
      });
      return {
        jsonrpc: "2.0" as const,
        id: request.id,
        result: {
          content: [
            {
              type: "text",
              text: JSON.stringify(newProject),
            },
          ],
        },
      };

    default:
      return {
        jsonrpc: "2.0" as const,
        id: request.id,
        error: {
          code: -32601,
          message: "Tool not found",
          data: `Unknown tool: ${name}`,
        },
      };
  }
}

// Resources handlers
async function handleResourcesList(ctx: any, request: any, sessionId: string) {
  // Get all tasks and projects as resources
  const tasks = await ctx.runQuery(api.tasks.getBySession, { sessionId });
  const projects = await ctx.runQuery(api.projects.getBySession, { sessionId });

  const resources = [
    ...tasks.map((task: any) => ({
      uri: `task://${task._id}`,
      name: `Task: ${task.content}`,
      description: task.description || "Todoist task",
      mimeType: "application/json",
    })),
    ...projects.map((project: any) => ({
      uri: `project://${project._id}`,
      name: `Project: ${project.name}`,
      description: "Todoist project",
      mimeType: "application/json",
    })),
  ];

  return {
    jsonrpc: "2.0" as const,
    id: request.id,
    result: { resources },
  };
}

async function handleResourcesRead(ctx: any, request: any, sessionId: string) {
  const { uri } = request.params;
  const [type, id] = uri.split("://");

  let resource;
  if (type === "task") {
    resource = await ctx.runQuery(api.tasks.get, { id });
  } else if (type === "project") {
    resource = await ctx.runQuery(api.projects.get, { id });
  } else {
    return {
      jsonrpc: "2.0" as const,
      id: request.id,
      error: {
        code: -32602,
        message: "Invalid resource URI",
        data: `Unsupported resource type: ${type}`,
      },
    };
  }

  if (!resource) {
    return {
      jsonrpc: "2.0" as const,
      id: request.id,
      error: {
        code: -32602,
        message: "Resource not found",
        data: `Resource not found: ${uri}`,
      },
    };
  }

  return {
    jsonrpc: "2.0" as const,
    id: request.id,
    result: {
      contents: [
        {
          uri,
          mimeType: "application/json",
          text: JSON.stringify(resource),
        },
      ],
    },
  };
}

// Prompts handlers
async function handlePromptsList(ctx: any, request: any) {
  const prompts = [
    {
      name: "task_summary",
      description: "Generate a summary of tasks",
      arguments: [
        {
          name: "task_ids",
          description: "List of task IDs to summarize",
          required: true,
        },
      ],
    },
    {
      name: "project_analysis",
      description: "Analyze a project's tasks and progress",
      arguments: [
        {
          name: "project_id",
          description: "Project ID to analyze",
          required: true,
        },
      ],
    },
  ];

  return {
    jsonrpc: "2.0" as const,
    id: request.id,
    result: { prompts },
  };
}

async function handlePromptsGet(ctx: any, request: any, sessionId: string) {
  const { name, arguments: args } = request.params;

  switch (name) {
    case "task_summary":
      const tasks = await ctx.runQuery(api.tasks.getByIds, {
        sessionId,
        ids: args.task_ids,
      });
      const taskList = tasks.map((t: any) => t.content).join(", ");
      
      return {
        jsonrpc: "2.0" as const,
        id: request.id,
        result: {
          name: "task_summary",
          messages: [
            {
              role: "user",
              content: {
                type: "text",
                text: `以下のタスクの要約を作成してください: ${taskList}`,
              },
            },
          ],
        },
      };

    case "project_analysis":
      const project = await ctx.runQuery(api.projects.get, { id: args.project_id });
      const projectTasks = await ctx.runQuery(api.tasks.getByProject, {
        projectId: args.project_id,
      });
      
      return {
        jsonrpc: "2.0" as const,
        id: request.id,
        result: {
          name: "project_analysis",
          messages: [
            {
              role: "user",
              content: {
                type: "text",
                text: `プロジェクト「${project?.name}」の分析を行ってください。タスク数: ${projectTasks.length}`,
              },
            },
          ],
        },
      };

    default:
      return {
        jsonrpc: "2.0" as const,
        id: request.id,
        error: {
          code: -32601,
          message: "Prompt not found",
          data: `Unknown prompt: ${name}`,
        },
      };
  }
}

// Utility mutations
export const updateSessionActivity = mutation({
  args: { sessionId: v.id("mcpSessions") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.sessionId, {
      lastActivity: Date.now(),
    });
  },
});

export const closeMCPSession = mutation({
  args: { sessionId: v.id("mcpSessions") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.sessionId, {
      connected: false,
      disconnectedAt: Date.now(),
    });
  },
}); 