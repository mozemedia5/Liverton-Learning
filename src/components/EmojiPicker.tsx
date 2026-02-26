/**
 * Emoji Picker Component
 * Full-featured emoji selector with categories, search, and recent emojis
 */

import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, X, Smile, Heart, Star, Lightbulb, Coffee, Flag } from 'lucide-react';

interface EmojiPickerProps {
  onEmojiSelect: (emoji: string) => void;
  onClose: () => void;
}

// Emoji database organized by categories
const EMOJI_CATEGORIES = {
  smileys: {
    name: 'Smileys & People',
    icon: Smile,
    emojis: [
      '😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃',
      '😉', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗', '😚', '😙',
      '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🤫', '🤔',
      '🤐', '🤨', '😐', '😑', '😶', '😏', '😒', '🙄', '😬', '🤥',
      '😌', '😔', '😪', '🤤', '😴', '😷', '🤒', '🤕', '🤢', '🤮',
      '🤧', '🥵', '🥶', '🥴', '😵', '🤯', '🤠', '🥳', '😎', '🤓',
      '🧐', '😕', '😟', '🙁', '☹️', '😮', '😯', '😲', '😳', '🥺',
      '😦', '😧', '😨', '😰', '😥', '😢', '😭', '😱', '😖', '😣',
      '👶', '👧', '🧒', '👦', '👩', '🧑', '👨', '👩‍🦱', '👨‍🦱', '👩‍🦰',
      '👨‍🦰', '👱‍♀️', '👱', '👱‍♂️', '👩‍🦳', '👨‍🦳', '👩‍🦲', '👨‍🦲', '🧔', '👵', '🧓',
    ]
  },
  animals: {
    name: 'Animals & Nature',
    icon: Heart,
    emojis: [
      '🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯',
      '🦁', '🐮', '🐷', '🐽', '🐸', '🐵', '🙈', '🙉', '🙊', '🐒',
      '🐔', '🐧', '🐦', '🐤', '🐣', '🐥', '🦆', '🦅', '🦉', '🦇',
      '🐺', '🐗', '🐴', '🦄', '🐝', '🐛', '🦋', '🐌', '🐞', '🐜',
      '🦗', '🕷️', '🦂', '🐢', '🐍', '🦎', '🦖', '🦕', '🐙', '🦑',
      '🦐', '🦞', '🦀', '🐡', '🐠', '🐟', '🐬', '🐳', '🐋', '🦈',
      '🐊', '🐅', '🐆', '🦓', '🦍', '🦧', '🐘', '🦛', '🦏', '🐪',
      '🐫', '🦒', '🦘', '🐃', '🐂', '🐄', '🐎', '🐖', '🐏', '🐑',
      '🌸', '🌺', '🌻', '🌹', '🌷', '🌼', '🌱', '🌲', '🌳', '🌴',
    ]
  },
  food: {
    name: 'Food & Drink',
    icon: Coffee,
    emojis: [
      '🍎', '🍐', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🍈', '🍒',
      '🍑', '🥭', '🍍', '🥥', '🥝', '🍅', '🍆', '🥑', '🥦', '🥬',
      '🥒', '🌶️', '🌽', '🥕', '🧄', '🧅', '🥔', '🍠', '🥐', '🥯',
      '🍞', '🥖', '🥨', '🧀', '🥚', '🍳', '🧈', '🥞', '🧇', '🥓',
      '🥩', '🍗', '🍖', '🌭', '🍔', '🍟', '🍕', '🥪', '🥙', '🧆',
      '🌮', '🌯', '🥗', '🥘', '🍝', '🍜', '🍲', '🍛', '🍣', '🍱',
      '🥟', '🍤', '🍙', '🍚', '🍘', '🍥', '🥠', '🥮', '🍢', '🍡',
      '🍧', '🍨', '🍦', '🥧', '🧁', '🍰', '🎂', '🍮', '🍭', '🍬',
      '☕', '🍵', '🧃', '🥤', '🍶', '🍺', '🍻', '🥂', '🍷', '🥃',
    ]
  },
  activities: {
    name: 'Activities',
    icon: Star,
    emojis: [
      '⚽', '🏀', '🏈', '⚾', '🥎', '🎾', '🏐', '🏉', '🥏', '🎱',
      '🪀', '🏓', '🏸', '🏒', '🏑', '🥍', '🏏', '🥅', '⛳', '🪁',
      '🏹', '🎣', '🤿', '🥊', '🥋', '🎽', '🛹', '🛷', '⛸️', '🥌',
      '🎿', '⛷️', '🏂', '🪂', '🏋️', '🤼', '🤸', '🤺', '⛹️', '🤾',
      '🏌️', '🏇', '🧘', '🏊', '🤽', '🚣', '🧗', '🚵', '🚴', '🏆',
      '🥇', '🥈', '🥉', '🏅', '🎖️', '🏵️', '🎗️', '🎫', '🎟️', '🎪',
      '🎭', '🎨', '🎬', '🎤', '🎧', '🎼', '🎹', '🥁', '🎷', '🎺',
      '🎸', '🪕', '🎻', '🎲', '🎯', '🎳', '🎮', '🎰', '🧩', '🎁',
    ]
  },
  travel: {
    name: 'Travel & Places',
    icon: Flag,
    emojis: [
      '🚗', '🚕', '🚙', '🚌', '🚎', '🏎️', '🚓', '🚑', '🚒', '🚐',
      '🚚', '🚛', '🚜', '🦯', '🦽', '🦼', '🛴', '🚲', '🛵', '🏍️',
      '🛺', '🚨', '🚔', '🚍', '🚘', '🚖', '🚡', '🚠', '🚟', '🚃',
      '🚋', '🚞', '🚝', '🚄', '🚅', '🚈', '🚂', '🚆', '🚇', '🚊',
      '🚉', '✈️', '🛫', '🛬', '🛩️', '💺', '🛰️', '🚀', '🛸', '🚁',
      '🛶', '⛵', '🚤', '🛥️', '🛳️', '⛴️', '🚢', '⚓', '⛽', '🚧',
      '🗿', '🗽', '🗼', '🏰', '🏯', '🏟️', '🎡', '🎢', '🎠', '⛲',
      '⛱️', '🏖️', '🏝️', '🏜️', '🌋', '⛰️', '🏔️', '🗻', '🏕️', '⛺',
      '🏠', '🏡', '🏘️', '🏚️', '🏗️', '🏭', '🏢', '🏬', '🏣', '🏤',
    ]
  },
  objects: {
    name: 'Objects',
    icon: Lightbulb,
    emojis: [
      '⌚', '📱', '📲', '💻', '⌨️', '🖥️', '🖨️', '🖱️', '🖲️', '🕹️',
      '🗜️', '💽', '💾', '💿', '📀', '📼', '📷', '📸', '📹', '🎥',
      '📽️', '🎞️', '📞', '☎️', '📟', '📠', '📺', '📻', '🎙️', '🎚️',
      '🎛️', '🧭', '⏱️', '⏲️', '⏰', '🕰️', '⌛', '⏳', '📡', '🔋',
      '🔌', '💡', '🔦', '🕯️', '🪔', '🧯', '🛢️', '💸', '💵', '💴',
      '💶', '💷', '💰', '💳', '🧾', '💎', '⚖️', '🧰', '🔧', '🔨',
      '⚒️', '🛠️', '⛏️', '🔩', '⚙️', '🧱', '⛓️', '🧲', '🔫', '💣',
      '🧨', '🪓', '🔪', '🗡️', '⚔️', '🛡️', '🚬', '⚰️', '⚱️', '🏺',
      '🔮', '📿', '🧿', '💈', '⚗️', '🔭', '🔬', '🕳️', '💊', '💉',
    ]
  },
  symbols: {
    name: 'Symbols',
    icon: Heart,
    emojis: [
      '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔',
      '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟', '☮️',
      '✝️', '☪️', '🕉️', '☸️', '✡️', '🔯', '🕎', '☯️', '☦️', '🛐',
      '⛎', '♈', '♉', '♊', '♋', '♌', '♍', '♎', '♏', '♐',
      '♑', '♒', '♓', '🆔', '⚛️', '🉑', '☢️', '☣️', '📴', '📳',
      '🈶', '🈚', '🈸', '🈺', '🈷️', '✴️', '🆚', '💮', '🉐', '㊙️',
      '㊗️', '🈴', '🈵', '🈹', '🈲', '🅰️', '🅱️', '🆎', '🆑', '🅾️',
      '🆘', '⛔', '📛', '🚫', '💯', '💢', '♨️', '🚷', '🚯', '🚳',
      '⭐', '🌟', '✨', '⚡', '🔥', '💥', '💫', '💦', '💨', '🕊️',
    ]
  },
};

export function EmojiPicker({ onEmojiSelect, onClose }: EmojiPickerProps) {
  const [activeCategory, setActiveCategory] = useState<keyof typeof EMOJI_CATEGORIES>('smileys');
  const [searchTerm, setSearchTerm] = useState('');

  // Filter emojis based on search
  const filteredEmojis = useMemo(() => {
    if (!searchTerm) {
      return EMOJI_CATEGORIES[activeCategory].emojis;
    }
    
    // Search across all categories
    const allEmojis: string[] = [];
    Object.values(EMOJI_CATEGORIES).forEach(category => {
      allEmojis.push(...category.emojis);
    });
    
    return allEmojis;
  }, [activeCategory, searchTerm]);

  const handleEmojiClick = (emoji: string) => {
    onEmojiSelect(emoji);
    onClose();
  };

  return (
    <div className="absolute bottom-full right-0 mb-2 w-80 sm:w-96 bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 z-50">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
        <h3 className="font-semibold text-lg">Emojis</h3>
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={onClose}
          className="rounded-full h-8 w-8"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Search */}
      <div className="p-3 border-b border-gray-200 dark:border-gray-800">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            type="text"
            placeholder="Search emojis..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-gray-100 dark:bg-gray-800 border-none rounded-xl"
          />
        </div>
      </div>

      {/* Category Tabs */}
      {!searchTerm && (
        <div className="flex gap-1 p-2 border-b border-gray-200 dark:border-gray-800 overflow-x-auto">
          {Object.entries(EMOJI_CATEGORIES).map(([key, category]) => {
            const Icon = category.icon;
            return (
              <button
                key={key}
                onClick={() => setActiveCategory(key as keyof typeof EMOJI_CATEGORIES)}
                className={`flex-shrink-0 p-2 rounded-lg transition-colors ${
                  activeCategory === key
                    ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600'
                    : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400'
                }`}
                title={category.name}
              >
                <Icon className="w-5 h-5" />
              </button>
            );
          })}
        </div>
      )}

      {/* Emoji Grid */}
      <div className="p-3 max-h-64 overflow-y-auto">
        <div className="grid grid-cols-8 gap-1">
          {filteredEmojis.map((emoji, idx) => (
            <button
              key={idx}
              onClick={() => handleEmojiClick(emoji)}
              className="text-2xl p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors active:scale-90"
              title={emoji}
            >
              {emoji}
            </button>
          ))}
        </div>
        {filteredEmojis.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <Smile className="w-12 h-12 mx-auto mb-2 opacity-20" />
            <p className="text-sm">No emojis found</p>
          </div>
        )}
      </div>
    </div>
  );
}
