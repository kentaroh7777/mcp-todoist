import { v } from "convex/values";
import { mutation, query, action } from "./_generated/server";
import { api } from "./_generated/api";

// Debug: Log all function calls
console.log('[CONVEX] mcp.ts loaded');

// MCP Session management

export const createMCPSession = mutation({
  args: {
    userId: v.optional(v.union(v.id("users"), v.string())),
    clientInfo: v.optional(v.object({
      name: v.string(),
      version: v.string(),
    })),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    
    // Debug: Log received parameters
    console.log('[DEBUG] createMCPSession called!');
    console.log('[DEBUG] createMCPSession received args:', JSON.stringify(args, null, 2));
    console.log('[DEBUG] clientInfo:', args.clientInfo);
    console.log('[DEBUG] userId:', args.userId);
    
    // Handle test user creation for development
    let actualUserId: any = args.userId || 'test-user';
    
    if (typeof actualUserId === 'string') {
      // Check if test user exists
      const existingUser = await ctx.db
        .query("users")
        .filter((q) => q.eq(q.field("email"), `${actualUserId}@test.com`))
        .first();
        
      if (!existingUser) {
        // Create test user
        actualUserId = await ctx.db.insert("users", {
          email: `${actualUserId}@test.com`,
          name: `Test User (${actualUserId})`,
          todoistApiToken: process.env.TODOIST_API_TOKEN || "61dae250699e84eb85b9c2ab9461c0581873566d",
          createdAt: now,
          updatedAt: now,
        });
      } else {
        actualUserId = existingUser._id;
      }
    }
    
    // Close any existing sessions for this user
    const existingSessions = await ctx.db
      .query("mcpSessions")
      .withIndex("by_user", (q) => q.eq("userId", actualUserId))
      .filter((q) => q.eq(q.field("connected"), true))
      .collect();

    for (const session of existingSessions) {
      await ctx.db.patch(session._id, {
        connected: false,
        disconnectedAt: now,
      });
    }

    // Default clientInfo if not provided
    const clientInfo = args.clientInfo || {
      name: 'unknown-client',
      version: '0.0.0'
    };

    // Create new session
    const sessionId = await ctx.db.insert("mcpSessions", {
      userId: actualUserId,
      clientInfo: clientInfo,
      protocolVersion: "2024-11-05",
      connected: true,
      createdAt: now,
      lastActivity: now,
    });

    return sessionId;
  },
});

export const closeMCPSession = mutation({
  args: {
    sessionId: v.id("mcpSessions"),
  },
  handler: async (ctx, args) => {
    console.log('[DEBUG] closeMCPSession called with args:', args);
    const session = await ctx.db.get(args.sessionId);
    if (session && session.connected) {
      await ctx.db.patch(args.sessionId, {
        connected: false,
        disconnectedAt: Date.now(),
      });
    }
  },
});

export const getMCPSession = query({
  args: {
    sessionId: v.id("mcpSessions"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.sessionId);
  },
});

export const updateLastActivity = mutation({
  args: {
    sessionId: v.id("mcpSessions"),
  },
  handler: async (ctx, args) => {
    console.log('[DEBUG] updateLastActivity called with args:', args);
    await ctx.db.patch(args.sessionId, {
      lastActivity: Date.now(),
    });
  },
});

// MCP Request handling (calls packages/mcp-server)

export const handleMCPRequest = action({
  args: {
    sessionId: v.id("mcpSessions"),
    request: v.any(),
  },
  handler: async (ctx, args): Promise<any> => {
    // Get session info
    const session = await ctx.runQuery(api.mcp.getMCPSession, {
      sessionId: args.sessionId,
    });

    if (!session || !session.connected) {
      return {
        jsonrpc: "2.0",
        id: args.request.id || null,
        error: {
          code: -32603,
          message: "MCP session not found or disconnected",
        },
      };
    }

    // Get user info for Todoist API token
    const user = await ctx.runQuery(api.users.get, { id: session.userId });
    if (!user) {
      return {
        jsonrpc: "2.0",
        id: args.request.id || null,
        error: {
          code: -32603,
          message: "User not found",
        },
      };
    }

    try {
      // Call packages/mcp-server HTTP API
      const mcpServerUrl = process.env.MCP_SERVER_URL || "http://localhost:4000";
      
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      // Include Todoist API token if available
      if (user.todoistApiToken) {
        headers["x-todoist-token"] = user.todoistApiToken;
      }

      console.log('[DEBUG] Sending request to MCP server:', mcpServerUrl);
      console.log('[DEBUG] Request body:', JSON.stringify(args.request, null, 2));

      const response = await fetch(`${mcpServerUrl}/mcp`, {
        method: "POST",
        headers,
        body: JSON.stringify(args.request),
      });

      console.log('[DEBUG] MCP server response status:', response.status);

      if (!response.ok) {
        throw new Error(`MCP Server error: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      console.log('[DEBUG] MCP server response:', JSON.stringify(result, null, 2));

      // Update last activity
      await ctx.runMutation(api.mcp.updateLastActivity, {
        sessionId: args.sessionId,
      });

      return result;
    } catch (error) {
      console.error("MCP request failed:", error);
      return {
        jsonrpc: "2.0",
        id: args.request.id || null,
        error: {
          code: -32603,
          message: "Failed to process MCP request",
          data: error instanceof Error ? error.message : "Unknown error",
        },
      };
    }
  },
});

// MCP Tools shortcuts (for direct Convex access)

export const toolGetTasks = action({
  args: {
    sessionId: v.id("mcpSessions"),
    project_id: v.optional(v.string()),
    filter: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<any> => {
    const request = {
      jsonrpc: "2.0",
      id: Date.now(),
      method: "tools/call",
      params: {
        name: "todoist_get_tasks",
        arguments: {
          project_id: args.project_id,
          filter: args.filter,
          limit: args.limit,
        },
      },
    };

    return await ctx.runAction(api.mcp.handleMCPRequest, {
      sessionId: args.sessionId,
      request,
    });
  },
});

export const toolCreateTask = action({
  args: {
    sessionId: v.id("mcpSessions"),
    content: v.string(),
    description: v.optional(v.string()),
    project_id: v.optional(v.string()),
    priority: v.optional(v.number()),
    due_string: v.optional(v.string()),
    labels: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args): Promise<any> => {
    const { sessionId, ...taskArgs } = args;
    const request = {
      jsonrpc: "2.0",
      id: Date.now(),
      method: "tools/call",
      params: {
        name: "todoist_create_task",
        arguments: taskArgs,
      },
    };

    return await ctx.runAction(api.mcp.handleMCPRequest, {
      sessionId,
      request,
    });
  },
});

export const toolUpdateTask = action({
  args: {
    sessionId: v.id("mcpSessions"),
    task_id: v.string(),
    content: v.optional(v.string()),
    description: v.optional(v.string()),
    priority: v.optional(v.number()),
    due_string: v.optional(v.string()),
    labels: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args): Promise<any> => {
    const { sessionId, ...taskArgs } = args;
    const request = {
      jsonrpc: "2.0",
      id: Date.now(),
      method: "tools/call",
      params: {
        name: "todoist_update_task",
        arguments: taskArgs,
      },
    };

    return await ctx.runAction(api.mcp.handleMCPRequest, {
      sessionId,
      request,
    });
  },
});

export const toolCloseTask = action({
  args: {
    sessionId: v.id("mcpSessions"),
    task_id: v.string(),
  },
  handler: async (ctx, args): Promise<any> => {
    const request = {
      jsonrpc: "2.0",
      id: Date.now(),
      method: "tools/call",
      params: {
        name: "todoist_close_task",
        arguments: {
          task_id: args.task_id,
        },
      },
    };

    return await ctx.runAction(api.mcp.handleMCPRequest, {
      sessionId: args.sessionId,
      request,
    });
  },
});

export const toolGetProjects = action({
  args: {
    sessionId: v.id("mcpSessions"),
  },
  handler: async (ctx, args): Promise<any> => {
    const request = {
      jsonrpc: "2.0",
      id: Date.now(),
      method: "tools/call",
      params: {
        name: "todoist_get_projects",
        arguments: {},
      },
    };

    return await ctx.runAction(api.mcp.handleMCPRequest, {
      sessionId: args.sessionId,
      request,
    });
  },
});

// Session queries for status monitoring

export const getActiveSessions = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("mcpSessions")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .filter((q) => q.eq(q.field("connected"), true))
      .collect();
  },
});

export const getSessionHistory = query({
  args: {
    userId: v.id("users"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 10;
    return await ctx.db
      .query("mcpSessions")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .order("desc")
      .take(limit);
  },
});
