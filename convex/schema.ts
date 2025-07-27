import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

const applicationTables = {
  profiles: defineTable({
    userId: v.id("users"), // Reference to auth users table
    name: v.string(),
    preferredLanguage: v.string(),
    status: v.union(v.literal("online"), v.literal("away"), v.literal("offline")),
    lastSeen: v.number(),
    avatar: v.optional(v.id("_storage")),
  }).index("by_user", ["userId"]),

  chats: defineTable({
    name: v.optional(v.string()), // Only for group chats
    type: v.union(v.literal("direct"), v.literal("group")),
    participants: v.array(v.id("users")), // References auth users
    createdBy: v.id("users"), // References auth users
    lastMessageAt: v.number(),
    avatar: v.optional(v.id("_storage")),
  }).index("by_participants", ["participants"])
    .index("by_last_message", ["lastMessageAt"]),

  messages: defineTable({
    chatId: v.id("chats"),
    senderId: v.id("users"), // References auth users
    content: v.string(),
    type: v.union(
      v.literal("text"), 
      v.literal("image"), 
      v.literal("sticker"),
      v.literal("system")
    ),
    replyTo: v.optional(v.id("messages")),
    imageId: v.optional(v.id("_storage")),
    stickerId: v.optional(v.id("stickers")),
    isFromAssistant: v.optional(v.boolean()),
    edited: v.optional(v.boolean()),
    editedAt: v.optional(v.number()),
  }).index("by_chat", ["chatId"])
    .index("by_sender", ["senderId"]),

  translations: defineTable({
    messageId: v.id("messages"),
    targetLanguage: v.string(),
    translatedText: v.string(),
    originalText: v.string(),
  }).index("by_message_and_language", ["messageId", "targetLanguage"]),

  stickers: defineTable({
    name: v.string(),
    imageId: v.id("_storage"),
    uploadedBy: v.optional(v.id("users")), // References auth users
    category: v.string(),
    tags: v.array(v.string()),
  }).index("by_category", ["category"])
    .index("by_uploader", ["uploadedBy"]),

  userSettings: defineTable({
    userId: v.id("users"), // References auth users
    notifications: v.boolean(),
    soundEnabled: v.boolean(),
    theme: v.union(v.literal("light"), v.literal("dark")),
    fontSize: v.union(v.literal("small"), v.literal("medium"), v.literal("large")),
  }).index("by_user", ["userId"]),
};

export default defineSchema({
  ...authTables,
  ...applicationTables,
});
