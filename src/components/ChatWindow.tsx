import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { MessageBubble } from "./MessageBubble";
import { StickerPicker } from "./StickerPicker";
import { toast } from "sonner";

interface ChatWindowProps {
  chatId: Id<"chats">;
  currentUser: {
    _id: Id<"users">;
    name: string;
    preferredLanguage: string;
  };
  onBack?: () => void;
}

export function ChatWindow({ chatId, currentUser, onBack }: ChatWindowProps) {
  const [message, setMessage] = useState("");
  const [showStickers, setShowStickers] = useState(false);
  const [replyTo, setReplyTo] = useState<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const chat = useQuery(api.chats.getChatDetails, { chatId });
  const messages = useQuery(api.messages.getMessages, { chatId, limit: 100 }) || [];
  const sendMessage = useMutation(api.messages.sendMessage);
  const testTranslation = useMutation(api.messages.testTranslation);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus input when reply is set
  useEffect(() => {
    if (replyTo) {
      inputRef.current?.focus();
    }
  }, [replyTo]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    try {
      await sendMessage({
        chatId,
        content: message.trim(),
        type: "text",
        replyTo: replyTo?._id,
      });
      setMessage("");
      setReplyTo(null);
    } catch (error) {
      toast.error("Failed to send message");
      console.error(error);
    }
  };

  const handleSendSticker = async (stickerId: Id<"stickers">) => {
    try {
      await sendMessage({
        chatId,
        content: "",
        type: "sticker",
        stickerId,
      });
      setShowStickers(false);
    } catch (error) {
      toast.error("Failed to send sticker");
      console.error(error);
    }
  };

  const getChatName = () => {
    if (!chat) return "Loading...";
    
    if (chat.type === "group") {
      return chat.name || "Group Chat";
    }
    
    const otherParticipant = chat.participants.find(p => p && p._id !== currentUser._id);
    return otherParticipant?.name || "Unknown User";
  };

  const getParticipantCount = () => {
    if (!chat) return 0;
    return chat.participants.length;
  };

  if (!chat) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#00C300]"></div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-white">
      {/* Header */}
      <div className="h-16 bg-[#00C300] flex items-center px-4 shadow-sm">
        {onBack && (
          <button
            onClick={onBack}
            className="p-2 text-white hover:bg-white/20 rounded-full transition-colors mr-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        )}
        
        <div className="flex items-center space-x-3 flex-1">
          <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center">
            <span className="text-[#00C300] font-bold">
              {getChatName().charAt(0).toUpperCase()}
            </span>
          </div>
          <div>
            <h2 className="text-white font-semibold">{getChatName()}</h2>
            <p className="text-white/80 text-sm">
              {chat.type === "group" 
                ? `${getParticipantCount()} members`
                : "Direct message"
              }
            </p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#F1F3F4]">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
                <svg className="w-8 h-8 text-[#00C300]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <p className="text-[#80868B]">Start the conversation!</p>
            </div>
          </div>
        ) : (
          messages.map((msg) => (
            <MessageBubble
              key={msg._id}
              message={msg}
              isOwn={msg.senderId === currentUser._id}
              currentUser={currentUser}
              onReply={setReplyTo}
            />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Reply Preview */}
      {replyTo && (
        <div className="px-4 py-2 bg-[#F1F3F4] border-t border-[#80868B]/20">
          <div className="flex items-center justify-between bg-white rounded-lg p-3">
            <div className="flex-1">
              <p className="text-xs text-[#80868B] mb-1">
                Replying to {replyTo.sender?.name}
              </p>
              <p className="text-sm text-[#202124] truncate">
                {replyTo.content}
              </p>
            </div>
            <button
              onClick={() => setReplyTo(null)}
              className="p-1 text-[#80868B] hover:text-[#202124] transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className="p-4 bg-white border-t border-[#80868B]/20">
        <form onSubmit={handleSendMessage} className="flex items-end space-x-2">
          <div className="flex space-x-2">
            <button
              type="button"
              onClick={() => setShowStickers(!showStickers)}
              className="p-2 text-[#80868B] hover:text-[#00C300] transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => testTranslation({ text: "Hello world", targetLanguage: "es" })}
              className="p-2 text-[#80868B] hover:text-[#00C300] transition-colors"
              title="Test Translation"
            >
              🌐
            </button>
          </div>
          
          <div className="flex-1">
            <input
              ref={inputRef}
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type a message..."
              className="w-full px-4 py-3 rounded-full bg-[#F1F3F4] border-none focus:ring-2 focus:ring-[#00C300] outline-none transition-shadow"
            />
          </div>
          
          <button
            type="submit"
            disabled={!message.trim()}
            className="p-3 bg-[#00C300] text-white rounded-full hover:bg-[#00B300] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </form>
      </div>

      {/* Sticker Picker */}
      {showStickers && (
        <StickerPicker
          onSelectSticker={handleSendSticker}
          onClose={() => setShowStickers(false)}
        />
      )}
    </div>
  );
}
