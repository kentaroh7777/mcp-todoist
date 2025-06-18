import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// プロジェクト一覧取得
export const getProjects = query({
  args: { userId: v.id("users") },
  handler: async (ctx: any, args: any) => {
    return await ctx.db
      .query("projects")
      .withIndex("by_user", (q: any) => q.eq("userId", args.userId))
      .filter((q: any) => q.eq(q.field("isArchived"), false))
      .order("asc")
      .collect();
  },
});

// プロジェクト作成
export const createProject = mutation({
  args: {
    userId: v.id("users"),
    name: v.string(),
    color: v.optional(v.string()),
    parentId: v.optional(v.id("projects")),
  },
  handler: async (ctx: any, args: any) => {
    const now = Date.now();
    
    return await ctx.db.insert("projects", {
      userId: args.userId,
      name: args.name,
      color: args.color || "#808080",
      parentId: args.parentId,
      order: now,
      isArchived: false,
      createdAt: now,
      updatedAt: now,
    });
  },
});

// プロジェクト更新
export const updateProject = mutation({
  args: {
    id: v.id("projects"),
    name: v.optional(v.string()),
    color: v.optional(v.string()),
  },
  handler: async (ctx: any, args: any) => {
    const { id, ...updates } = args;
    
    return await ctx.db.patch(id, {
      ...updates,
      updatedAt: Date.now(),
    });
  },
});

// プロジェクト削除
export const deleteProject = mutation({
  args: { id: v.id("projects") },
  handler: async (ctx: any, args: any) => {
    return await ctx.db.patch(args.id, {
      isArchived: true,
      updatedAt: Date.now(),
    });
  },
}); 