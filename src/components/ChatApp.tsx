import React, { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { ChatList } from "./ChatList";
import { ChatWindow } from "./ChatWindow";
import { UserSearch } from "./UserSearch";
import { SignOutButton } from "../SignOutButton";
import { Id } from "../../convex/_generated/dataModel";

interface ChatAppProps {
  user: {
    _id: Id<"users">;
    name: string;
    email: string;
    preferredLanguage: string;
    status: "online" | "away" | "offline";
  };
}

export function ChatApp({ user }: ChatAppProps) {
  const [selectedChatId, setSelectedChatId] = useState<Id<"chats"> | null>(null);
  const [showUserSearch, setShowUserSearch] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  const chats = useQuery(api.chats.getChats) || [];

  // Handle responsive behavior
  React.useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const showChatList = !isMobile || !selectedChatId;
  const showChatWindow = !isMobile || selectedChatId;

  return (
    <div className="h-screen flex bg-[#F1F3F4]">
      {/* Sidebar */}
      {showChatList && (
        <div className={`${isMobile ? "w-full" : "w-80"} bg-white border-r border-[#80868B]/20 flex flex-col`}>
          {/* Header */}
          <div className="h-16 bg-[#00C300] flex items-center justify-between px-4">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center">
                <span className="text-[#00C300] font-bold text-sm">
                  {user.name.charAt(0).toUpperCase()}
                </span>
              </div>
              <span className="text-white font-medium">{user.name}</span>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setShowUserSearch(true)}
                className="p-2 text-white hover:bg-white/20 rounded-full transition-colors"
                title="New Chat"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </button>
              <SignOutButton />
            </div>
          </div>

          {/* Chat List */}
          <div className="flex-1 overflow-y-auto">
            <ChatList
              chats={chats}
              selectedChatId={selectedChatId}
              onSelectChat={setSelectedChatId}
              currentUserId={user._id}
            />
          </div>
        </div>
      )}

      {/* Main Chat Area */}
      {showChatWindow && (
        <div className="flex-1 flex flex-col">
          {selectedChatId ? (
            <ChatWindow
              chatId={selectedChatId}
              currentUser={user}
              onBack={isMobile ? () => setSelectedChatId(null) : undefined}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center bg-[#F1F3F4]">
              <div className="text-center">
                <div className="w-16 h-16 bg-[#00C300] rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <h2 className="text-xl font-semibold text-[#202124] mb-2">Welcome to LINE Chat</h2>
                <p className="text-[#80868B]">Select a chat to start messaging</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* User Search Modal */}
      {showUserSearch && (
        <UserSearch
          onClose={() => setShowUserSearch(false)}
          onChatCreated={(chatId) => {
            setSelectedChatId(chatId);
            setShowUserSearch(false);
          }}
        />
      )}
    </div>
  );
}
