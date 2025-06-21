import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// メッセージ作成のmutation（デバッグログ付き）
export const createMessage = mutation({
  args: {
    message: v.string(),
    author: v.string(),
  },
  handler: async (ctx, args) => {
    console.log('[DEBUG] createMessage called!');
    console.log('[DEBUG] Received args:', JSON.stringify(args, null, 2));
    console.log('[DEBUG] args.message:', args.message);
    console.log('[DEBUG] args.author:', args.author);
    
    const messageId = await ctx.db.insert("messages", {
      message: args.message,
      author: args.author,
      createdAt: Date.now(),
    });
    
    console.log('[DEBUG] Created message with ID:', messageId);
    return messageId;
  },
});

// メッセージ一覧のquery
export const listMessages = query({
  handler: async (ctx) => {
    return await ctx.db.query("messages").order("desc").collect();
  },
}); 