/**
 * Chat Settings Component
 * Allows users to customize chat appearance (themes, wallpapers, fonts, colors)
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Palette, Type, Image as ImageIcon, Lock } from 'lucide-react';
import type { ChatSettings as ChatSettingsType, ChatTheme, FontStyle } from '@/types/chat';
import { CHAT_THEMES, getThemeNames } from '@/lib/chatThemes';

interface ChatSettingsProps {
  currentSettings: ChatSettingsType;
  onSettingsChange: (settings: ChatSettingsType) => void;
  onClose: () => void;
}

/**
 * Renders settings panel for customizing chat appearance
 * Includes theme selection, font customization, and color picker
 */
export function ChatSettings({
  currentSettings,
  onSettingsChange,
  onClose,
}: ChatSettingsProps) {
  const [selectedTheme, setSelectedTheme] = useState<string>(currentSettings.theme);
  const [fontSize, setFontSize] = useState<number>(currentSettings.fontSize || 14);
  const [fontStyle, setFontStyle] = useState<FontStyle>(currentSettings.fontStyle || 'normal');
  const [wallpaper, setWallpaper] = useState<string>(currentSettings.wallpaper || '');
  const [encryptionEnabled, setEncryptionEnabled] = useState<boolean>(currentSettings.encryptionEnabled || false);

  // Handle theme selection
  const handleThemeSelect = (themeName: string) => {
    setSelectedTheme(themeName);
    const theme = CHAT_THEMES[themeName];
    if (theme) {
      onSettingsChange({
        ...currentSettings,
        theme: themeName as ChatTheme,
        colors: {
          sentMessageBg: theme.colors.sentMessageBg,
          receivedMessageBg: theme.colors.receivedMessageBg,
          textColor: theme.colors.textColor,
          accentColor: theme.colors.accentColor,
        },
      });
    }
  };

  // Handle font size change
  const handleFontSizeChange = (size: number) => {
    setFontSize(size);
    onSettingsChange({
      ...currentSettings,
      fontSize: size,
    });
  };

  // Handle font style change
  const handleFontStyleChange = (style: FontStyle) => {
    setFontStyle(style);
    onSettingsChange({
      ...currentSettings,
      fontStyle: style,
    });
  };

  // Handle wallpaper change
  const handleWallpaperChange = (url: string) => {
    setWallpaper(url);
    onSettingsChange({
      ...currentSettings,
      wallpaper: url,
    });
  };

  // Handle encryption toggle
  const handleEncryptionChange = (checked: boolean) => {
    setEncryptionEnabled(checked);
    onSettingsChange({
      ...currentSettings,
      encryptionEnabled: checked,
    });
  };

  const themeNames = getThemeNames();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <Card className="w-full max-w-md p-6 bg-white">
        <h2 className="text-2xl font-bold mb-6">Chat Settings</h2>

        {/* Theme Selection */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Palette size={20} />
            <h3 className="font-semibold">Theme</h3>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {themeNames.map((themeName) => (
              <Button
                key={themeName}
                variant={selectedTheme === themeName ? 'default' : 'outline'}
                onClick={() => handleThemeSelect(themeName)}
                className="capitalize"
              >
                {themeName}
              </Button>
            ))}
          </div>
        </div>

        {/* Font Size */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Type size={20} />
            <h3 className="font-semibold">Font Size</h3>
          </div>
          <input
            type="range"
            min="12"
            max="20"
            value={fontSize}
            onChange={(e) => handleFontSizeChange(parseInt(e.target.value))}
            className="w-full"
          />
          <p className="text-sm text-gray-600 mt-2">{fontSize}px</p>
        </div>

        {/* Font Style */}
        <div className="mb-6">
          <h3 className="font-semibold mb-3">Font Style</h3>
          <div className="grid grid-cols-2 gap-2">
            {(['normal', 'italic', 'bold', 'bold-italic'] as FontStyle[]).map((style) => (
              <Button
                key={style}
                variant={fontStyle === style ? 'default' : 'outline'}
                onClick={() => handleFontStyleChange(style)}
                className="capitalize"
              >
                {style}
              </Button>
            ))}
          </div>
        </div>

        {/* Wallpaper */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <ImageIcon size={20} />
            <h3 className="font-semibold">Wallpaper URL</h3>
          </div>
          <input
            type="text"
            value={wallpaper}
            onChange={(e) => handleWallpaperChange(e.target.value)}
            placeholder="Enter image URL"
            className="w-full px-3 py-2 border rounded-md"
          />
        </div>

        {/* Encryption */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Lock size={20} />
            <div>
              <h3 className="font-semibold">End-to-End Encryption</h3>
              <p className="text-xs text-gray-500">Enable enhanced security for this chat</p>
            </div>
          </div>
          <Switch
            checked={encryptionEnabled}
            onCheckedChange={handleEncryptionChange}
          />
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button onClick={onClose} className="flex-1">
            Done
          </Button>
        </div>
      </Card>
    </div>
  );
}
