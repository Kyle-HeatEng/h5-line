import { query, mutation, internalAction, internalMutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { api, internal } from "./_generated/api";

export const getMessages = query({
  args: {
    chatId: v.id("chats"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const chat = await ctx.db.get(args.chatId);
    if (!chat || !chat.participants.includes(userId)) {
      return [];
    }

    // Get current user's profile for language preference
    const currentUserProfile = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (!currentUserProfile) return [];

    const messages = await ctx.db
      .query("messages")
      .withIndex("by_chat", (q) => q.eq("chatId", args.chatId))
      .order("desc")
      .take(args.limit || 50);

    // Get sender details and translations
    const messagesWithDetails = await Promise.all(
      messages.reverse().map(async (message) => {
        // Get sender profile
        const senderProfile = await ctx.db
          .query("profiles")
          .withIndex("by_user", (q) => q.eq("userId", message.senderId))
          .first();
        
        // Get translation if available
        const translation = await ctx.db
          .query("translations")
          .withIndex("by_message_and_language", (q) => 
            q.eq("messageId", message._id).eq("targetLanguage", currentUserProfile.preferredLanguage)
          )
          .first();

        // Get reply details if this is a reply
        let replyToMessage: any = null;
        if (message.replyTo) {
          const replyMessage = await ctx.db.get(message.replyTo);
          if (replyMessage) {
            const replySenderProfile = await ctx.db
              .query("profiles")
              .withIndex("by_user", (q) => q.eq("userId", replyMessage.senderId))
              .first();
            replyToMessage = { 
              ...replyMessage, 
              sender: replySenderProfile ? { name: replySenderProfile.name } : null 
            };
          }
        }

        // Get sticker details if this is a sticker message
        let sticker = null;
        if (message.stickerId) {
          const stickerData = await ctx.db.get(message.stickerId);
          if (stickerData) {
            const imageUrl = await ctx.storage.getUrl(stickerData.imageId);
            sticker = {
              name: stickerData.name,
              imageUrl,
            };
          }
        }

        return {
          ...message,
          sender: senderProfile ? { name: senderProfile.name } : null,
          translation,
          replyToMessage,
          sticker,
        };
      })
    );

    return messagesWithDetails;
  },
});

export const sendMessage = mutation({
  args: {
    chatId: v.id("chats"),
    content: v.string(),
    type: v.union(v.literal("text"), v.literal("image"), v.literal("sticker")),
    replyTo: v.optional(v.id("messages")),
    imageId: v.optional(v.id("_storage")),
    stickerId: v.optional(v.id("stickers")),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const chat = await ctx.db.get(args.chatId);
    if (!chat || !chat.participants.includes(userId)) {
      throw new Error("Chat not found or access denied");
    }
		console.log("editedfiles")

    // Get user profile
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (!profile) throw new Error("Profile not found");

    // Insert message
    const messageId = await ctx.db.insert("messages", {
      chatId: args.chatId,
      senderId: userId,
      content: args.content,
      type: args.type,
      replyTo: args.replyTo,
      imageId: args.imageId,
      stickerId: args.stickerId,
    });

    // Update chat's last message time
    await ctx.db.patch(args.chatId, {
      lastMessageAt: Date.now(),
    });

    // Schedule translation for other participants (only for text messages with content)
    if (args.type === "text" && args.content.trim()) {
      await ctx.scheduler.runAfter(100, internal.messages.scheduleTranslations, {
        messageId,
        originalText: args.content,
        senderLanguage: profile.preferredLanguage,
        chatId: args.chatId,
      });
    }

    // Handle assistant mention
    if (args.content.includes("@assistant")) {
      await ctx.scheduler.runAfter(1000, internal.messages.handleAssistantMention, {
        chatId: args.chatId,
        messageId,
      });
    }

    return messageId;
  },
});

export const translateMessage = internalAction({
  args: {
    messageId: v.id("messages"),
    originalText: v.string(),
    senderLanguage: v.string(),
    targetLanguage: v.string(),
  },
  handler: async (ctx, args) => {
    console.log("=== TRANSLATION START ===");
    console.log("Message ID:", args.messageId);
    console.log("Original text:", args.originalText);
    console.log("Sender language:", args.senderLanguage);
    
    // Get the message to verify it exists and get chat participants
    const message = await ctx.runQuery(api.messages.getMessage, { messageId: args.messageId });
    if (!message) {
      console.log("Message not found for translation");
      return;
    }

    const chat = await ctx.runQuery(api.chats.getChatDetails, { chatId: message.chatId });
    if (!chat) {
      console.log("Chat not found for translation");
      return;
    }

    // Get unique languages from participants (excluding sender's language)
    const targetLanguages = [...new Set(
      chat.participants
        .filter(p => p !== null && p.preferredLanguage !== args.senderLanguage)
        .map(p => p!.preferredLanguage)
    )];

    console.log("Target languages for translation:", targetLanguages);

    if (targetLanguages.length === 0) {
      console.log("No target languages found - all participants have same language");
      return;
    }

    // Translate to each target language
    for (const targetLang of targetLanguages) {
      try {
        console.log(`Translating "${args.originalText}" from ${args.senderLanguage} to ${targetLang}`);
        const translatedText = await translateText(args.originalText, args.senderLanguage, targetLang);
        console.log(`Translation result: "${translatedText}"`);
        
        // Only save translation if it's different from original
        if (translatedText && translatedText.toLowerCase().trim() !== args.originalText.toLowerCase().trim()) {
          await ctx.runMutation(internal.messages.saveTranslation, {
            messageId: args.messageId,
            targetLanguage: targetLang,
            translatedText,
            originalText: args.originalText,
          });
          console.log(`✅ Translation saved for ${targetLang}: "${translatedText}"`);
        } else {
          console.log(`⚠️ No translation needed for ${targetLang} (same as original)`);
        }
      } catch (error) {
        console.error(`❌ Translation failed for ${targetLang}:`, error);
      }
    }
    console.log("=== TRANSLATION END ===");
  },
});

export const getMessage = query({
  args: {
    messageId: v.id("messages"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.messageId);
  },
});

export const saveTranslation = internalMutation({
  args: {
    messageId: v.id("messages"),
    targetLanguage: v.string(),
    translatedText: v.string(),
    originalText: v.string(),
  },
  handler: async (ctx, args) => {
    // Check if translation already exists
    const existing = await ctx.db
      .query("translations")
      .withIndex("by_message_and_language", (q) => 
        q.eq("messageId", args.messageId).eq("targetLanguage", args.targetLanguage)
      )
      .first();

    if (!existing) {
      await ctx.db.insert("translations", args);
      console.log(`Translation inserted for message ${args.messageId} in ${args.targetLanguage}`);
    } else {
      console.log(`Translation already exists for message ${args.messageId} in ${args.targetLanguage}`);
    }
  },
});

export const handleAssistantMention = internalAction({
  args: {
    chatId: v.id("chats"),
    messageId: v.id("messages"),
  },
  handler: async (ctx, args) => {
    // Get recent messages for context
    const messages = await ctx.runQuery(api.messages.getMessages, {
      chatId: args.chatId,
      limit: 20,
    });

    const chat = await ctx.runQuery(api.chats.getChatDetails, { chatId: args.chatId });
    if (!chat) return;

    // Build context for assistant
    const context = messages
      .filter(m => m.type === "text")
      .map(m => `${m.sender?.name}: ${m.content}`)
      .join("\n");

    try {
      const response = await generateAssistantResponse(context, chat.name || "Direct Chat");
      
      // Send assistant response
      await ctx.runMutation(internal.messages.sendAssistantMessage, {
        chatId: args.chatId,
        content: response,
      });
    } catch (error) {
      console.error("Assistant response failed:", error);
    }
  },
});

export const sendAssistantMessage = internalMutation({
  args: {
    chatId: v.id("chats"),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    // Create a system profile for assistant if it doesn't exist
    let assistantProfile = await ctx.db
      .query("profiles")
      .filter((q) => q.eq(q.field("name"), "AI Assistant"))
      .first();

    if (!assistantProfile) {
      // Create auth user first
      const assistantUserId = await ctx.db.insert("users", {
        name: "AI Assistant",
        email: "assistant@system.local",
        isAnonymous: false,
      });

      // Create profile
      const assistantProfileId = await ctx.db.insert("profiles", {
        userId: assistantUserId,
        name: "AI Assistant",
        preferredLanguage: "en",
        status: "online",
        lastSeen: Date.now(),
      });
      
      assistantProfile = await ctx.db.get(assistantProfileId);
    }

    if (!assistantProfile) return;

    await ctx.db.insert("messages", {
      chatId: args.chatId,
      senderId: assistantProfile.userId,
      content: args.content,
      type: "text",
      isFromAssistant: true,
    });

    await ctx.db.patch(args.chatId, {
      lastMessageAt: Date.now(),
    });
  },
});

// Helper functions for AI integration
async function translateText(text: string, sourceLanguage: string, targetLanguage: string): Promise<string> {
  // Map language codes to full language names
  const languageMap: Record<string, string> = {
    'en': 'English',
    'es': 'Spanish',
    'fr': 'French',
    'de': 'German',
    'it': 'Italian',
    'pt': 'Portuguese',
    'ru': 'Russian',
    'ja': 'Japanese',
    'ko': 'Korean',
    'zh': 'Chinese',
    'ar': 'Arabic',
    'hi': 'Hindi'
  };

  const sourceLanguageName = languageMap[sourceLanguage] || sourceLanguage;
  const targetLanguageName = languageMap[targetLanguage] || targetLanguage;

  // Don't translate if source and target are the same
  if (sourceLanguage === targetLanguage) {
    return text;
  }

  try {
    console.log(`🔄 Calling OpenAI API to translate "${text}"`);
    // Use the bundled OpenAI API
    const response = await fetch(`${process.env.CONVEX_OPENAI_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.CONVEX_OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4.1-nano",
        messages: [
          {
            role: "system",
            content: `You are a professional translator. Translate the following text from ${sourceLanguageName} to ${targetLanguageName}. Only return the translated text, nothing else. If the text is already in ${targetLanguageName} or if no translation is needed, return the original text unchanged.`
          },
          {
            role: "user",
            content: text
          }
        ],
        max_tokens: 500,
        temperature: 0.1,
      }),
    });

    console.log(`📡 API response status: ${response.status}`);
    if (!response.ok) {
      throw new Error(`Translation API error: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      throw new Error("Invalid response from translation API");
    }

    const result = data.choices[0].message.content.trim();
    console.log(`✅ Translation result: "${result}"`);
    return result;
  } catch (error) {
    console.error("❌ Translation failed:", error);
    // Return original text if translation fails
    return text;
  }
}

async function generateAssistantResponse(context: string, chatName: string): Promise<string> {
  const response = await fetch(`${process.env.CONVEX_OPENAI_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.CONVEX_OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4.1-nano",
      messages: [
        {
          role: "system",
          content: `You are a helpful AI assistant in a chat called "${chatName}". You can see the conversation history and should respond helpfully and naturally. Keep responses concise and friendly.`
        },
        {
          role: "user",
          content: `Recent conversation:\n${context}\n\nPlease respond to the conversation.`
        }
      ],
      max_tokens: 300,
    }),
  });

  const data = await response.json();
  return data.choices[0].message.content.trim();
}

export const testTranslation = mutation({
  args: { text: v.string(), targetLanguage: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    await ctx.scheduler.runAfter(100, internal.messages.testTranslateText, args);
    return "Translation scheduled";
  },
});

export const testTranslateText = internalAction({
  args: { text: v.string(), targetLanguage: v.string() },
  handler: async (ctx, args) => {
    console.log("Testing translation:", args.text, "to", args.targetLanguage);
    const result = await translateText(args.text, "en", args.targetLanguage);
    console.log("Translation result:", result);
    return result;
  },
});
