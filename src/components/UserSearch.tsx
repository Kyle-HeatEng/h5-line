import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { toast } from "sonner";

interface UserSearchProps {
  onClose: () => void;
  onChatCreated: (chatId: Id<"chats">) => void;
}

export function UserSearch({ onClose, onChatCreated }: UserSearchProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const searchResults = useQuery(
    api.users.searchUsers,
    searchQuery.trim() ? { query: searchQuery.trim() } : "skip"
  ) || [];

  const createDirectChat = useMutation(api.chats.createDirectChat);

  const handleCreateChat = async (userId: Id<"users">) => {
    setIsCreating(true);
    try {
      const chatId = await createDirectChat({ participantId: userId });
      onChatCreated(chatId);
      toast.success("Chat created successfully!");
    } catch (error) {
      toast.error("Failed to create chat");
      console.error(error);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-[#80868B]/20">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-[#202124]">New Chat</h2>
            <button
              onClick={onClose}
              className="p-2 text-[#80868B] hover:text-[#202124] transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Search Input */}
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search users by name or email..."
              className="w-full px-4 py-3 pl-10 rounded-lg bg-[#F1F3F4] border-none focus:ring-2 focus:ring-[#00C300] outline-none transition-shadow"
              autoFocus
            />
            <svg
              className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-[#80868B]"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>

        {/* Search Results */}
        <div className="flex-1 overflow-y-auto">
          {!searchQuery.trim() ? (
            <div className="flex items-center justify-center h-32">
              <p className="text-[#80868B] text-sm">Start typing to search for users</p>
            </div>
          ) : searchResults.length === 0 ? (
            <div className="flex items-center justify-center h-32">
              <div className="text-center">
                <div className="w-12 h-12 bg-[#F1F3F4] rounded-full flex items-center justify-center mx-auto mb-3">
                  <svg className="w-6 h-6 text-[#80868B]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <p className="text-[#80868B] text-sm">No users found</p>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-[#80868B]/10">
              {searchResults.map((user) => (
                <button
                  key={user._id}
                  onClick={() => handleCreateChat(user._id)}
                  disabled={isCreating}
                  className="w-full p-4 text-left hover:bg-[#F1F3F4] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-[#00C300] rounded-full flex items-center justify-center">
                      <span className="text-white font-semibold">
                        {user.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-[#202124] truncate">
                        {user.name}
                      </h3>
                      <p className="text-sm text-[#80868B] truncate">
                        {user.email}
                      </p>
                    </div>
                    <div className={`w-3 h-3 rounded-full ${
                      user.status === "online" ? "bg-[#00C300]" :
                      user.status === "away" ? "bg-[#FFCC00]" : "bg-[#80868B]"
                    }`} />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
