import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    email: v.string(),
    name: v.string(),
    todoistApiToken: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_email", ["email"]),

  projects: defineTable({
    userId: v.id("users"),
    todoistId: v.optional(v.string()),
    name: v.string(),
    color: v.optional(v.string()),
    parentId: v.optional(v.id("projects")),
    order: v.number(),
    isArchived: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_todoist_id", ["todoistId"]),

  tasks: defineTable({
    userId: v.id("users"),
    projectId: v.optional(v.id("projects")),
    todoistId: v.optional(v.string()),
    content: v.string(),
    description: v.optional(v.string()),
    isCompleted: v.boolean(),
    priority: v.number(),
    order: v.number(),
    dueDate: v.optional(v.number()),
    labels: v.array(v.string()),
    parentId: v.optional(v.id("tasks")),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_project", ["projectId"])
    .index("by_todoist_id", ["todoistId"])
    .index("by_due_date", ["dueDate"]),

  labels: defineTable({
    userId: v.id("users"),
    todoistId: v.optional(v.string()),
    name: v.string(),
    color: v.optional(v.string()),
    order: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_todoist_id", ["todoistId"]),

  syncStatus: defineTable({
    userId: v.id("users"),
    lastSyncAt: v.number(),
    syncToken: v.optional(v.string()),
    isEnabled: v.boolean(),
  }).index("by_user", ["userId"]),
}); 