import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { api } from "./_generated/api";

// Tasks queries and mutations

export const getByUser = query({
  args: { 
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("tasks")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .filter((q) => q.eq(q.field("isCompleted"), false))
      .collect();
  },
});

export const getBySession = query({
  args: { 
    sessionId: v.id("mcpSessions"),
    projectId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session) return [];
    
    let query = ctx.db
      .query("tasks")
      .withIndex("by_user", (q) => q.eq("userId", session.userId))
      .filter((q) => q.eq(q.field("isCompleted"), false));

    // Apply project filter if provided
    if (args.projectId) {
      const project = await ctx.db
        .query("projects")
        .withIndex("by_user", (q) => q.eq("userId", session.userId))
        .filter((q) => q.eq(q.field("todoistId"), args.projectId))
        .first();
      if (project) {
        query = query.filter((q) => q.eq(q.field("projectId"), project._id));
      }
    }

    return await query.collect();
  },
});

export const getByFilter = query({
  args: { 
    sessionId: v.id("mcpSessions"),
    // Simple filter parameters
    projectId: v.optional(v.string()),
    completed: v.optional(v.boolean()),
    priority: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session) return [];
    
    let query = ctx.db
      .query("tasks")
      .withIndex("by_user", (q) => q.eq("userId", session.userId));

    // Apply project filter if provided
    if (args.projectId) {
      const project = await ctx.db
        .query("projects")
        .withIndex("by_user", (q) => q.eq("userId", session.userId))
        .filter((q) => q.eq(q.field("todoistId"), args.projectId))
        .first();
      if (project) {
        query = query.filter((q) => q.eq(q.field("projectId"), project._id));
      }
    }

    const tasks = await query.collect();

    // Apply additional filters
    return tasks.filter(task => {
      if (args.completed !== undefined && task.isCompleted !== args.completed) {
        return false;
      }
      if (args.priority !== undefined && task.priority !== args.priority) {
        return false;
      }
      return true;
    });
  },
});

export const getByIds = query({
  args: { 
    sessionId: v.id("mcpSessions"),
    taskIds: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session) return [];
    
    const tasks = [];
    for (const taskId of args.taskIds) {
      const task = await ctx.db
        .query("tasks")
        .withIndex("by_todoist_id", (q) => q.eq("todoistId", taskId))
        .first();
      if (task && task.userId === session.userId) {
        tasks.push(task);
      }
    }
    return tasks;
  },
});

export const getByProject = query({
  args: { 
    projectId: v.id("projects"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("tasks")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect();
  },
});

export const get = query({
  args: { id: v.id("tasks") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// Task mutations
export const create = mutation({
  args: {
    sessionId: v.id("mcpSessions"),
    content: v.string(),
    description: v.optional(v.string()),
    projectId: v.optional(v.string()),
    priority: v.optional(v.number()),
    dueDate: v.optional(v.number()),
    labels: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session) {
      throw new Error("Invalid session");
    }

    let projectObjectId = undefined;
    if (args.projectId) {
      const project = await ctx.db
        .query("projects")
        .withIndex("by_user", (q) => q.eq("userId", session.userId))
        .filter((q) => q.eq(q.field("todoistId"), args.projectId))
        .first();
      projectObjectId = project?._id;
    }

    const now = Date.now();
    const taskId = await ctx.db.insert("tasks", {
      userId: session.userId,
      projectId: projectObjectId,
      content: args.content,
      description: args.description,
      isCompleted: false,
      priority: args.priority || 1,
      order: now,
      dueDate: args.dueDate,
      labels: args.labels || [],
      createdAt: now,
      updatedAt: now,
    });

    return await ctx.db.get(taskId);
  },
});

export const update = mutation({
  args: {
    sessionId: v.id("mcpSessions"),
    taskId: v.string(),
    content: v.optional(v.string()),
    description: v.optional(v.string()),
    priority: v.optional(v.number()),
    dueDate: v.optional(v.number()),
    labels: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session) {
      throw new Error("Invalid session");
    }

    const task = await ctx.db
      .query("tasks")
      .withIndex("by_todoist_id", (q) => q.eq("todoistId", args.taskId))
      .filter((q) => q.eq(q.field("userId"), session.userId))
      .first();

    if (!task) {
      throw new Error("Task not found");
    }

    const updates: any = {
      updatedAt: Date.now(),
    };

    if (args.content !== undefined) updates.content = args.content;
    if (args.description !== undefined) updates.description = args.description;
    if (args.priority !== undefined) updates.priority = args.priority;
    if (args.dueDate !== undefined) updates.dueDate = args.dueDate;
    if (args.labels !== undefined) updates.labels = args.labels;

    await ctx.db.patch(task._id, updates);
    return await ctx.db.get(task._id);
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

    const task = await ctx.db
      .query("tasks")
      .withIndex("by_todoist_id", (q) => q.eq("todoistId", args.taskId))
      .filter((q) => q.eq(q.field("userId"), session.userId))
      .first();

    if (!task) {
      throw new Error("Task not found");
    }

    await ctx.db.patch(task._id, {
      isCompleted: true,
      updatedAt: Date.now(),
    });

    return await ctx.db.get(task._id);
  },
});

export const bulkSync = mutation({
  args: {
    sessionId: v.id("mcpSessions"),
    tasksData: v.array(v.string()), // JSON string array
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session) {
      throw new Error("Invalid session");
    }

    const results = [];
    for (const taskDataStr of args.tasksData) {
      try {
        const taskData = JSON.parse(taskDataStr);
        const taskId = await ctx.db.insert("tasks", {
          userId: session.userId,
          content: taskData.content,
          description: taskData.description,
          isCompleted: taskData.isCompleted || false,
          priority: taskData.priority || 1,
          order: taskData.order || Date.now(),
          dueDate: taskData.dueDate,
          labels: taskData.labels || [],
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
        results.push(await ctx.db.get(taskId));
      } catch (error) {
        console.error("Failed to sync task:", error);
      }
    }
    return results;
  },
}); 