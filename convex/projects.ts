import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// プロジェクト一覧取得
export const getProjects = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("projects")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .filter((q) => q.eq(q.field("isArchived"), false))
      .order("asc")
      .collect();
  },
});

export const getBySession = query({
  args: { sessionId: v.id("mcpSessions") },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session) return [];
    
    return await ctx.db
      .query("projects")
      .withIndex("by_user", (q) => q.eq("userId", session.userId))
      .filter((q) => q.eq(q.field("isArchived"), false))
      .order("asc")
      .collect();
  },
});

export const get = query({
  args: { id: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id as any);
  },
});

// プロジェクト作成
export const create = mutation({
  args: {
    sessionId: v.id("mcpSessions"),
    name: v.string(),
    color: v.optional(v.string()),
    parent_id: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session) {
      throw new Error("Invalid session");
    }
    
    let parentId = undefined;
    if (args.parent_id) {
      const parent = await ctx.db
        .query("projects")
        .withIndex("by_user", (q) => q.eq("userId", session.userId))
        .filter((q) => q.eq(q.field("todoistId"), args.parent_id))
        .first();
      parentId = parent?._id;
    }
    
    const projectId = await ctx.db.insert("projects", {
      userId: session.userId,
      name: args.name,
      color: args.color,
      parentId,
      order: Date.now(),
      isArchived: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    
    return await ctx.db.get(projectId);
  },
});

// プロジェクト更新
export const updateProject = mutation({
  args: {
    id: v.id("projects"),
    name: v.optional(v.string()),
    color: v.optional(v.string()),
    parentId: v.optional(v.id("projects")),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    
    await ctx.db.patch(id, {
      ...updates,
      updatedAt: Date.now(),
    });
    
    return await ctx.db.get(id);
  },
});

// プロジェクト削除（アーカイブ）
export const archiveProject = mutation({
  args: { id: v.id("projects") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      isArchived: true,
      updatedAt: Date.now(),
    });
    
    return await ctx.db.get(args.id);
  },
}); 