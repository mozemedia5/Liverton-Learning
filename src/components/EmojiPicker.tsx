/**
 * Emoji Picker Component
 * Allows users to select and insert emojis into chat messages
 * Features: Categorized emojis, search, quick access
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { X, Search } from 'lucide-react';
import { EMOJI_CATEGORIES, getEmojiCategoryNames } from '@/lib/emojis';

interface EmojiPickerProps {
  onEmojiSelect: (emoji: string) => void;
  onClose: () => void;
}

/**
 * Renders emoji picker with categories and search functionality
 * Users can browse emojis by category or search for specific ones
 */
export function EmojiPicker({ onEmojiSelect, onClose }: EmojiPickerProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>(
    EMOJI_CATEGORIES[0]?.name || 'Smileys'
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredEmojis, setFilteredEmojis] = useState<string[]>([]);

  // Handle search
  const handleSearch = (query: string) => {
    setSearchQuery(query);

    if (!query.trim()) {
      setFilteredEmojis([]);
      return;
    }

    // Search through all categories
    const results: string[] = [];
    EMOJI_CATEGORIES.forEach((category) => {
      if (category.name.toLowerCase().includes(query.toLowerCase())) {
        results.push(...category.emojis);
      }
    });

    setFilteredEmojis(results);
  };

  // Get current category emojis
  const currentCategory = EMOJI_CATEGORIES.find((cat) => cat.name === selectedCategory);
  const displayEmojis = searchQuery.trim() ? filteredEmojis : currentCategory?.emojis || [];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <Card className="w-full max-w-md p-4 bg-white relative">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 hover:bg-gray-100 rounded-full transition"
        >
          <X size={20} />
        </button>

        <h2 className="text-xl font-bold mb-4">Select Emoji</h2>

        {/* Search Input */}
        <div className="mb-4 relative">
          <Search size={18} className="absolute left-3 top-3 text-gray-400" />
          <Input
            type="text"
            placeholder="Search emojis..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Category Tabs */}
        {!searchQuery.trim() && (
          <div className="mb-4 flex gap-2 overflow-x-auto pb-2">
            {getEmojiCategoryNames().map((categoryName) => (
              <button
                key={categoryName}
                onClick={() => setSelectedCategory(categoryName)}
                className={`px-3 py-1 rounded-full text-sm font-medium whitespace-nowrap transition ${
                  selectedCategory === categoryName
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {categoryName}
              </button>
            ))}
          </div>
        )}

        {/* Emoji Grid */}
        <div className="grid grid-cols-6 gap-2 mb-4 max-h-64 overflow-y-auto">
          {displayEmojis.length > 0 ? (
            displayEmojis.map((emoji, index) => (
              <button
                key={index}
                onClick={() => {
                  onEmojiSelect(emoji);
                  onClose();
                }}
                className="text-2xl hover:bg-gray-100 p-2 rounded transition hover:scale-110"
                title={emoji}
              >
                {emoji}
              </button>
            ))
          ) : (
            <div className="col-span-6 text-center py-8 text-gray-500">
              No emojis found
            </div>
          )}
        </div>

        {/* Close Button */}
        <Button onClick={onClose} variant="outline" className="w-full">
          Close
        </Button>
      </Card>
    </div>
  );
}
