import { query, mutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";

export const getStickers = query({
  args: {
    category: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let stickers;
    
    if (args.category) {
      stickers = await ctx.db
        .query("stickers")
        .withIndex("by_category", (q) => q.eq("category", args.category!))
        .collect();
    } else {
      stickers = await ctx.db.query("stickers").collect();
    }

    // Get image URLs
    const stickersWithUrls = await Promise.all(
      stickers.map(async (sticker) => {
        const imageUrl = await ctx.storage.getUrl(sticker.imageId);
        return {
          ...sticker,
          imageUrl,
        };
      })
    );

    return stickersWithUrls;
  },
});

export const getStickerCategories = query({
  args: {},
  handler: async (ctx) => {
    const stickers = await ctx.db.query("stickers").collect();
    const categories = [...new Set(stickers.map(s => s.category))];
    return categories;
  },
});

export const uploadSticker = mutation({
  args: {
    name: v.string(),
    imageId: v.id("_storage"),
    category: v.string(),
    tags: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    return await ctx.db.insert("stickers", {
      name: args.name,
      imageId: args.imageId,
      uploadedBy: userId,
      category: args.category,
      tags: args.tags,
    });
  },
});

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});
