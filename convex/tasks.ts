import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Convex関数の型定義（型エラー回避）
type ConvexValue = any;
type ConvexContext = any;

// 仮の関数定義（実際のConvex設定後に置き換え）
const v = {
  id: (table: string) => ({ type: "id", table }),
  string: () => ({ type: "string" }),
  number: () => ({ type: "number" }),
  boolean: () => ({ type: "boolean" }),
  optional: (type: any) => ({ type: "optional", inner: type }),
  array: (type: any) => ({ type: "array", inner: type }),
};

const query = (config: any) => config;
const mutation = (config: any) => config;

// Basic task queries
export const getByUser = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("tasks")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .filter((q) => q.eq(q.field("isCompleted"), false))
      .order("desc")
      .collect();
  },
});

export const getBySession = query({
  args: { sessionId: v.id("mcpSessions") },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session) return [];
    
    return await ctx.db
      .query("tasks")
      .withIndex("by_user", (q) => q.eq("userId", session.userId))
      .filter((q) => q.eq(q.field("isCompleted"), false))
      .order("desc")
      .collect();
  },
});

export const getByFilter = query({
  args: { 
    sessionId: v.id("mcpSessions"),
    filter: v.object({
      project_id: v.optional(v.string()),
      label: v.optional(v.string()),
      filter: v.optional(v.string()),
    }),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session) return [];
    
    let query = ctx.db
      .query("tasks")
      .withIndex("by_user", (q) => q.eq("userId", session.userId));
    
    if (args.filter.project_id) {
      // Find project by ID
      const project = await ctx.db
        .query("projects")
        .withIndex("by_user", (q) => q.eq("userId", session.userId))
        .filter((q) => q.eq(q.field("todoistId"), args.filter.project_id))
        .first();
      
      if (project) {
        query = query.filter((q) => q.eq(q.field("projectId"), project._id));
      }
    }
    
    const tasks = await query.collect();
    
    // Apply additional filters
    return tasks.filter(task => {
      if (args.filter.label && !task.labels.includes(args.filter.label)) {
        return false;
      }
      if (args.filter.filter && !task.content.toLowerCase().includes(args.filter.filter.toLowerCase())) {
        return false;
      }
      return true;
    });
  },
});

export const getByIds = query({
  args: { 
    sessionId: v.id("mcpSessions"),
    ids: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session) return [];
    
    const tasks = [];
    for (const id of args.ids) {
      const task = await ctx.db.get(id as any);
      if (task && task.userId === session.userId) {
        tasks.push(task);
      }
    }
    return tasks;
  },
});

export const getByProject = query({
  args: { projectId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("tasks")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId as any))
      .collect();
  },
});

export const get = query({
  args: { id: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id as any);
  },
});

// Task mutations
export const create = mutation({
  args: {
    sessionId: v.id("mcpSessions"),
    content: v.string(),
    description: v.optional(v.string()),
    project_id: v.optional(v.string()),
    priority: v.optional(v.number()),
    due_date: v.optional(v.string()),
    labels: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session) {
      throw new Error("Invalid session");
    }
    
    let projectId = undefined;
    if (args.project_id) {
      const project = await ctx.db
        .query("projects")
        .withIndex("by_user", (q) => q.eq("userId", session.userId))
        .filter((q) => q.eq(q.field("todoistId"), args.project_id))
        .first();
      projectId = project?._id;
    }
    
    const dueDate = args.due_date ? new Date(args.due_date).getTime() : undefined;
    
    const taskId = await ctx.db.insert("tasks", {
      userId: session.userId,
      projectId,
      content: args.content,
      description: args.description,
      isCompleted: false,
      priority: args.priority || 1,
      order: Date.now(),
      dueDate,
      labels: args.labels || [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    
    return await ctx.db.get(taskId);
  },
});

export const update = mutation({
  args: {
    sessionId: v.id("mcpSessions"),
    task_id: v.string(),
    content: v.optional(v.string()),
    description: v.optional(v.string()),
    priority: v.optional(v.number()),
    due_date: v.optional(v.string()),
    labels: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session) {
      throw new Error("Invalid session");
    }
    
    const task = await ctx.db.get(args.task_id as any);
    if (!task || task.userId !== session.userId) {
      throw new Error("Task not found");
    }
    
    const updateData: any = {
      updatedAt: Date.now(),
    };
    
    if (args.content !== undefined) updateData.content = args.content;
    if (args.description !== undefined) updateData.description = args.description;
    if (args.priority !== undefined) updateData.priority = args.priority;
    if (args.due_date !== undefined) updateData.dueDate = new Date(args.due_date).getTime();
    if (args.labels !== undefined) updateData.labels = args.labels;
    
    await ctx.db.patch(args.task_id as any, updateData);
    return await ctx.db.get(args.task_id as any);
  },
});

export const complete = mutation({
  args: {
    sessionId: v.id("mcpSessions"),
    taskId: v.string(),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session) {
      throw new Error("Invalid session");
    }
    
    const task = await ctx.db.get(args.taskId as any);
    if (!task || task.userId !== session.userId) {
      throw new Error("Task not found");
    }
    
    await ctx.db.patch(args.taskId as any, {
      isCompleted: true,
      updatedAt: Date.now(),
    });
    
    return await ctx.db.get(args.taskId as any);
  },
});

export const markIncomplete = mutation({
  args: { id: v.id("tasks") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      isCompleted: false,
      updatedAt: Date.now(),
    });
    return await ctx.db.get(args.id);
  },
});

export const remove = mutation({
  args: { id: v.id("tasks") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});

// Bulk operations for sync
export const bulkUpdate = mutation({
  args: { 
    tasks: v.array(v.object({
      id: v.optional(v.string()),
      todoistId: v.optional(v.string()),
      content: v.string(),
      description: v.optional(v.string()),
      isCompleted: v.boolean(),
      priority: v.number(),
      projectId: v.optional(v.string()),
      dueDate: v.optional(v.number()),
      labels: v.array(v.string()),
    }))
  },
  handler: async (ctx, args) => {
    for (const taskData of args.tasks) {
      if (taskData.id) {
        // Update existing task
        await ctx.db.patch(taskData.id as any, {
          content: taskData.content,
          description: taskData.description,
          isCompleted: taskData.isCompleted,
          priority: taskData.priority,
          dueDate: taskData.dueDate,
          labels: taskData.labels,
          updatedAt: Date.now(),
        });
      }
      // Note: Creating new tasks would require userId context
    }
  },
}); 