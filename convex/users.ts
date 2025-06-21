import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// User queries
export const get = query({
  args: { id: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const getByEmail = query({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();
  },
});

// User mutations
export const create = mutation({
  args: {
    email: v.string(),
    name: v.string(),
    todoistApiToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    console.log('[DEBUG] users.create called with args:', JSON.stringify(args, null, 2));
    const now = Date.now();
    
    // Check if user already exists
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();
    
    if (existingUser) {
      return existingUser._id;
    }

    // Create new user
    const userId = await ctx.db.insert("users", {
      email: args.email,
      name: args.name,
      todoistApiToken: args.todoistApiToken,
      createdAt: now,
      updatedAt: now,
    });

    return userId;
  },
});

export const updateTodoistToken = mutation({
  args: {
    userId: v.id("users"),
    todoistApiToken: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.userId, {
      todoistApiToken: args.todoistApiToken,
      updatedAt: Date.now(),
    });

    return await ctx.db.get(args.userId);
  },
});

export const updateProfile = mutation({
  args: {
    userId: v.id("users"),
    name: v.optional(v.string()),
    todoistApiToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const updates: any = {
      updatedAt: Date.now(),
    };

    if (args.name !== undefined) updates.name = args.name;
    if (args.todoistApiToken !== undefined) updates.todoistApiToken = args.todoistApiToken;

    await ctx.db.patch(args.userId, updates);
    return await ctx.db.get(args.userId);
  },
}); 