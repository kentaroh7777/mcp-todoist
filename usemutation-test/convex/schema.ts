import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  messages: defineTable({
    message: v.string(),
    author: v.string(),
    createdAt: v.number(),
  }),
});
