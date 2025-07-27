import { query, mutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";

export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    
    const user = await ctx.db.get(userId);
    if (!user) return null;

    // Get user profile from profiles table
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (!profile) return null;

    return {
      _id: userId,
      name: profile.name,
      email: user.email || "",
      preferredLanguage: profile.preferredLanguage,
      status: profile.status,
      avatar: profile.avatar,
      lastSeen: profile.lastSeen,
    };
  },
});

export const updateProfile = mutation({
  args: {
    name: v.string(),
    preferredLanguage: v.string(),
    avatar: v.optional(v.id("_storage")),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const user = await ctx.db.get(userId);
    if (!user) throw new Error("User not found");

    // Check if profile exists
    const existingProfile = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (existingProfile) {
      await ctx.db.patch(existingProfile._id, {
        name: args.name,
        preferredLanguage: args.preferredLanguage,
        avatar: args.avatar,
        lastSeen: Date.now(),
      });
      return existingProfile._id;
    } else {
      return await ctx.db.insert("profiles", {
        userId,
        name: args.name,
        preferredLanguage: args.preferredLanguage,
        avatar: args.avatar,
        status: "online",
        lastSeen: Date.now(),
      });
    }
  },
});

export const updateStatus = mutation({
  args: {
    status: v.union(v.literal("online"), v.literal("away"), v.literal("offline")),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (profile) {
      await ctx.db.patch(profile._id, {
        status: args.status,
        lastSeen: Date.now(),
      });
    }
  },
});

export const searchUsers = query({
  args: {
    query: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const profiles = await ctx.db.query("profiles").collect();
    const users = await Promise.all(
      profiles.map(async (profile) => {
        const user = await ctx.db.get(profile.userId);
        return {
          _id: profile.userId,
          name: profile.name,
          email: user?.email || "",
          status: profile.status,
          avatar: profile.avatar,
        };
      })
    );

    return users.filter(user => 
      user.name.toLowerCase().includes(args.query.toLowerCase()) ||
      user.email.toLowerCase().includes(args.query.toLowerCase())
    ).slice(0, 10);
  },
});
