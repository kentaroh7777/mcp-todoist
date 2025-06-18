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

// タスク一覧取得
export const getTasks = query({
  args: { userId: v.id("users"), projectId: v.optional(v.id("projects")) },
  handler: async (ctx, args) => {
    const query = ctx.db
      .query("tasks")
      .withIndex("by_user", (q) => q.eq("userId", args.userId));
    
    if (args.projectId) {
      return await query
        .filter((q) => q.eq(q.field("projectId"), args.projectId))
        .order("desc")
        .collect();
    }
    
    return await query.order("desc").collect();
  },
});

// タスク作成
export const createTask = mutation({
  args: {
    userId: v.id("users"),
    projectId: v.optional(v.id("projects")),
    content: v.string(),
    description: v.optional(v.string()),
    priority: v.optional(v.number()),
    dueDate: v.optional(v.number()),
    labels: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    
    return await ctx.db.insert("tasks", {
      userId: args.userId,
      projectId: args.projectId,
      content: args.content,
      description: args.description || "",
      isCompleted: false,
      priority: args.priority || 1,
      order: now,
      dueDate: args.dueDate,
      labels: args.labels || [],
      createdAt: now,
      updatedAt: now,
    });
  },
});

// タスク更新
export const updateTask = mutation({
  args: {
    id: v.id("tasks"),
    content: v.optional(v.string()),
    description: v.optional(v.string()),
    isCompleted: v.optional(v.boolean()),
    priority: v.optional(v.number()),
    dueDate: v.optional(v.number()),
    labels: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    
    return await ctx.db.patch(id, {
      ...updates,
      updatedAt: Date.now(),
    });
  },
});

// タスク削除
export const deleteTask = mutation({
  args: { id: v.id("tasks") },
  handler: async (ctx, args) => {
    return await ctx.db.delete(args.id);
  },
});

// タスク完了/未完了切り替え
export const toggleTaskCompletion = mutation({
  args: { id: v.id("tasks") },
  handler: async (ctx, args) => {
    const task = await ctx.db.get(args.id);
    if (!task) throw new Error("Task not found");
    
    return await ctx.db.patch(args.id, {
      isCompleted: !task.isCompleted,
      updatedAt: Date.now(),
    });
  },
}); 