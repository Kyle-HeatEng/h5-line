import { query, mutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";

export const getChats = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const chats = await ctx.db
      .query("chats")
      .withIndex("by_last_message", (q) => q)
      .order("desc")
      .collect();

    const userChats = chats.filter(chat => 
      chat.participants.includes(userId)
    );

    // Get last message for each chat
    const chatsWithDetails = await Promise.all(
      userChats.map(async (chat) => {
        const lastMessage = await ctx.db
          .query("messages")
          .withIndex("by_chat", (q) => q.eq("chatId", chat._id))
          .order("desc")
          .first();

        // Get other participants with their profiles
        const otherParticipants = await Promise.all(
          chat.participants
            .filter(id => id !== userId)
            .map(async (id) => {
              const profile = await ctx.db
                .query("profiles")
                .withIndex("by_user", (q) => q.eq("userId", id))
                .first();
              
              if (!profile) return null;
              
              return {
                _id: id,
                name: profile.name,
                status: profile.status,
              };
            })
        );

        return {
          ...chat,
          lastMessage,
          otherParticipants: otherParticipants.filter(Boolean),
        };
      })
    );

    return chatsWithDetails;
  },
});

export const createDirectChat = mutation({
  args: {
    participantId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Check if chat already exists
    const existingChats = await ctx.db.query("chats").collect();
    const existingChat = existingChats.find(chat => 
      chat.type === "direct" &&
      chat.participants.length === 2 &&
      chat.participants.includes(userId) &&
      chat.participants.includes(args.participantId)
    );

    if (existingChat) {
      return existingChat._id;
    }

    // Create new direct chat
    return await ctx.db.insert("chats", {
      type: "direct",
      participants: [userId, args.participantId],
      createdBy: userId,
      lastMessageAt: Date.now(),
    });
  },
});

export const createGroupChat = mutation({
  args: {
    name: v.string(),
    participantIds: v.array(v.id("users")),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const participants = [userId, ...args.participantIds];

    return await ctx.db.insert("chats", {
      name: args.name,
      type: "group",
      participants,
      createdBy: userId,
      lastMessageAt: Date.now(),
    });
  },
});

export const getChatDetails = query({
  args: {
    chatId: v.id("chats"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const chat = await ctx.db.get(args.chatId);
    if (!chat || !chat.participants.includes(userId)) {
      return null;
    }

    // Get all participants with their profiles
    const participants = await Promise.all(
      chat.participants.map(async (id) => {
        const profile = await ctx.db
          .query("profiles")
          .withIndex("by_user", (q) => q.eq("userId", id))
          .first();
        
        if (!profile) return null;
        
        return {
          _id: id,
          name: profile.name,
          status: profile.status,
          preferredLanguage: profile.preferredLanguage,
        };
      })
    );

    return {
      ...chat,
      participants: participants.filter(Boolean),
    };
  },
});
