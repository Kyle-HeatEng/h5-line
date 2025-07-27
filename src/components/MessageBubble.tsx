import { useState } from "react";
import { Id } from "../../convex/_generated/dataModel";

interface Message {
  _id: Id<"messages">;
  content: string;
  type: "text" | "image" | "sticker" | "system";
  senderId: Id<"users">;
  _creationTime: number;
  sender?: {
    name: string;
  } | null;
  translation?: {
    translatedText: string;
    targetLanguage: string;
  } | null;
  replyToMessage?: {
    content: string;
    sender?: {
      name: string;
    } | null;
  } | null;
  sticker?: {
    name: string;
    imageUrl?: string | null;
  } | null;
  isFromAssistant?: boolean;
}

interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
  currentUser: {
    preferredLanguage: string;
  };
  onReply: (message: Message) => void;
}

export function MessageBubble({ message, isOwn, currentUser, onReply }: MessageBubbleProps) {
  const [showOriginal, setShowOriginal] = useState(false);
  const [showActions, setShowActions] = useState(false);

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const hasTranslation = message.translation && 
    message.translation.targetLanguage === currentUser.preferredLanguage &&
    message.translation.translatedText !== message.content;

  // Show translated text by default, original when showOriginal is true
  const displayContent = hasTranslation && !showOriginal
    ? message.translation!.translatedText 
    : message.content;

  if (message.type === "system") {
    return (
      <div className="flex justify-center">
        <div className="bg-[#80868B]/20 text-[#80868B] text-xs px-3 py-1 rounded-full">
          {message.content}
        </div>
      </div>
    );
  }

  if (message.type === "sticker") {
    return (
      <div className={`flex ${isOwn ? "justify-end" : "justify-start"}`}>
        <div className="max-w-xs">
          {!isOwn && (
            <p className="text-xs text-[#80868B] mb-1 px-2">
              {message.isFromAssistant ? "🤖 AI Assistant" : message.sender?.name}
            </p>
          )}
          <div className="relative group">
            {message.sticker?.imageUrl ? (
              <img
                src={message.sticker.imageUrl}
                alt={message.sticker.name}
                className="w-24 h-24 object-contain"
              />
            ) : (
              <div className="w-24 h-24 bg-[#F1F3F4] rounded-lg flex items-center justify-center">
                <span className="text-2xl">😊</span>
              </div>
            )}
            <div className="absolute bottom-1 right-1 bg-black/50 text-white text-xs px-1 rounded">
              {formatTime(message._creationTime)}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex ${isOwn ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-xs lg:max-w-md ${isOwn ? "order-2" : "order-1"}`}>
        {!isOwn && (
          <p className="text-xs text-[#80868B] mb-1 px-2">
            {message.isFromAssistant ? "🤖 AI Assistant" : message.sender?.name}
          </p>
        )}
        
        <div
          className="relative group"
          onMouseEnter={() => setShowActions(true)}
          onMouseLeave={() => setShowActions(false)}
        >
          {/* Reply Preview */}
          {message.replyToMessage && (
            <div className="mb-2 p-2 bg-[#80868B]/10 rounded-lg border-l-2 border-[#00C300]">
              <p className="text-xs text-[#80868B] mb-1">
                {message.replyToMessage.sender?.name}
              </p>
              <p className="text-sm text-[#202124] truncate">
                {message.replyToMessage.content}
              </p>
            </div>
          )}

          {/* Message Bubble */}
          <div
            className={`relative px-4 py-2 rounded-2xl cursor-pointer ${
              isOwn
                ? "bg-[#00C300] text-white rounded-br-md"
                : "bg-white text-[#202124] rounded-bl-md shadow-sm"
            } ${hasTranslation ? "hover:shadow-md transition-shadow" : ""}`}
            onClick={() => hasTranslation && setShowOriginal(!showOriginal)}
          >
            <p className="text-sm leading-relaxed">{displayContent}</p>
            
            {/* Translation indicator and timestamp */}
            <div className="flex items-center justify-between mt-1">
              <div className="flex items-center space-x-2">
                {hasTranslation && (
                  <span className={`text-xs ${isOwn ? "text-white/70" : "text-[#00C300]"}`}>
                    {showOriginal ? "📝 Original" : "🌐 Translated"}
                  </span>
                )}
              </div>
              <span className={`text-xs ${isOwn ? "text-white/70" : "text-[#80868B]"}`}>
                {formatTime(message._creationTime)}
              </span>
            </div>
          </div>

          {/* Message Actions */}
          {showActions && (
            <div className={`absolute top-0 ${isOwn ? "left-0 -translate-x-full" : "right-0 translate-x-full"} flex items-center space-x-1 bg-white rounded-lg shadow-lg p-1 z-20`}>
              <button
                onClick={() => onReply(message)}
                className="p-1 text-[#80868B] hover:text-[#00C300] transition-colors"
                title="Reply"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                </svg>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
