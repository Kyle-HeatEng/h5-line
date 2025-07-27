import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";

interface StickerPickerProps {
  onSelectSticker: (stickerId: Id<"stickers">) => void;
  onClose: () => void;
}

export function StickerPicker({ onSelectSticker, onClose }: StickerPickerProps) {
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>();
  
  const categories = useQuery(api.stickers.getStickerCategories) || [];
  const stickers = useQuery(api.stickers.getStickers, { category: selectedCategory }) || [];

  // Default stickers if none exist
  const defaultStickers = [
    { _id: "default-1" as Id<"stickers">, name: "Happy", emoji: "😊" },
    { _id: "default-2" as Id<"stickers">, name: "Love", emoji: "❤️" },
    { _id: "default-3" as Id<"stickers">, name: "Thumbs Up", emoji: "👍" },
    { _id: "default-4" as Id<"stickers">, name: "Laugh", emoji: "😂" },
    { _id: "default-5" as Id<"stickers">, name: "Wink", emoji: "😉" },
    { _id: "default-6" as Id<"stickers">, name: "Cool", emoji: "😎" },
    { _id: "default-7" as Id<"stickers">, name: "Thinking", emoji: "🤔" },
    { _id: "default-8" as Id<"stickers">, name: "Party", emoji: "🎉" },
  ];

  const displayStickers = stickers.length > 0 ? stickers : defaultStickers;

  return (
    <div className="absolute bottom-full left-0 right-0 bg-white border-t border-[#80868B]/20 shadow-lg">
      <div className="p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-[#202124]">Stickers</h3>
          <button
            onClick={onClose}
            className="p-1 text-[#80868B] hover:text-[#202124] transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Categories */}
        {categories.length > 0 && (
          <div className="flex space-x-2 mb-4 overflow-x-auto">
            <button
              onClick={() => setSelectedCategory(undefined)}
              className={`px-3 py-1 rounded-full text-sm whitespace-nowrap transition-colors ${
                !selectedCategory
                  ? "bg-[#00C300] text-white"
                  : "bg-[#F1F3F4] text-[#80868B] hover:bg-[#80868B]/20"
              }`}
            >
              All
            </button>
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-3 py-1 rounded-full text-sm whitespace-nowrap transition-colors ${
                  selectedCategory === category
                    ? "bg-[#00C300] text-white"
                    : "bg-[#F1F3F4] text-[#80868B] hover:bg-[#80868B]/20"
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        )}

        {/* Stickers Grid */}
        <div className="grid grid-cols-4 gap-2 max-h-48 overflow-y-auto">
          {displayStickers.map((sticker) => (
            <button
              key={sticker._id}
              onClick={() => onSelectSticker(sticker._id)}
              className="aspect-square p-2 rounded-lg hover:bg-[#F1F3F4] transition-colors flex items-center justify-center"
            >
              {"imageUrl" in sticker && sticker.imageUrl ? (
                <img
                  src={sticker.imageUrl}
                  alt={sticker.name}
                  className="w-full h-full object-contain"
                />
              ) : (
                <span className="text-2xl">
                  {"emoji" in sticker ? sticker.emoji : "😊"}
                </span>
              )}
            </button>
          ))}
        </div>

        {displayStickers.length === 0 && (
          <div className="text-center py-8">
            <div className="w-12 h-12 bg-[#F1F3F4] rounded-full flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-[#80868B]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-[#80868B] text-sm">No stickers available</p>
          </div>
        )}
      </div>
    </div>
  );
}
