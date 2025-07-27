import { Id } from "../../convex/_generated/dataModel";

interface Chat {
  _id: Id<"chats">;
  name?: string;
  type: "direct" | "group";
  lastMessage?: {
    content: string;
    _creationTime: number;
    type: "text" | "image" | "sticker" | "system";
    senderId: Id<"users">;
  } | null;
  otherParticipants: Array<{
    _id: Id<"users">;
    name: string;
    status: "online" | "away" | "offline";
  } | null>;
}

interface ChatListProps {
  chats: Chat[];
  selectedChatId: Id<"chats"> | null;
  onSelectChat: (chatId: Id<"chats">) => void;
  currentUserId: Id<"users">;
}

export function ChatList({ chats, selectedChatId, onSelectChat, currentUserId }: ChatListProps) {
  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffInHours < 24 * 7) {
      return date.toLocaleDateString([], { weekday: 'short' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  const getChatName = (chat: Chat) => {
    if (chat.type === "group") {
      return chat.name || "Group Chat";
    }
    return chat.otherParticipants[0]?.name || "Unknown User";
  };

  const getLastMessagePreview = (message: Chat["lastMessage"]) => {
    if (!message) return "No messages yet";
    
    switch (message.type) {
      case "image":
        return "📷 Image";
      case "sticker":
        return "😊 Sticker";
      case "system":
        return message.content;
      default:
        return message.content.length > 50 
          ? message.content.substring(0, 50) + "..."
          : message.content;
    }
  };

  const getStatusColor = (status: "online" | "away" | "offline") => {
    switch (status) {
      case "online":
        return "bg-[#00C300]";
      case "away":
        return "bg-[#FFCC00]";
      case "offline":
        return "bg-[#80868B]";
    }
  };

  if (chats.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center">
          <div className="w-12 h-12 bg-[#F1F3F4] rounded-full flex items-center justify-center mx-auto mb-3">
            <svg className="w-6 h-6 text-[#80868B]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <p className="text-[#80868B] text-sm">No chats yet</p>
          <p className="text-[#80868B] text-xs mt-1">Start a new conversation</p>
        </div>
      </div>
    );
  }

  return (
    <div className="divide-y divide-[#80868B]/10">
      {chats.map((chat) => {
        const isSelected = selectedChatId === chat._id;
        const otherParticipant = chat.otherParticipants.find(p => p !== null);
        
        return (
          <button
            key={chat._id}
            onClick={() => onSelectChat(chat._id)}
            className={`w-full p-4 text-left hover:bg-[#F1F3F4] transition-colors ${
              isSelected ? "bg-[#00C300]/10 border-r-2 border-[#00C300]" : ""
            }`}
          >
            <div className="flex items-center space-x-3">
              {/* Avatar */}
              <div className="relative">
                <div className="w-12 h-12 bg-[#00C300] rounded-full flex items-center justify-center">
                  <span className="text-white font-semibold">
                    {getChatName(chat).charAt(0).toUpperCase()}
                  </span>
                </div>
                {/* Status indicator for direct chats */}
                {chat.type === "direct" && otherParticipant && (
                  <div className={`absolute -bottom-1 -right-1 w-4 h-4 ${getStatusColor(otherParticipant.status)} rounded-full border-2 border-white`} />
                )}
              </div>

              {/* Chat info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="font-medium text-[#202124] truncate">
                    {getChatName(chat)}
                  </h3>
                  {chat.lastMessage && (
                    <span className="text-xs text-[#80868B] ml-2">
                      {formatTime(chat.lastMessage._creationTime)}
                    </span>
                  )}
                </div>
                <p className="text-sm text-[#80868B] truncate">
                  {getLastMessagePreview(chat.lastMessage)}
                </p>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
