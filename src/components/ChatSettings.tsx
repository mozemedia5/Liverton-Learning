/**
 * Chat Settings Component - Enhanced
 * Modern settings panel with Google Material Design inspired themes
 * Allows users to customize chat appearance with clean, functional UI
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Palette, Type, X } from 'lucide-react';
import type { ChatSettings as ChatSettingsType, ChatTheme, FontStyle } from '@/types/chat';
import { CHAT_THEMES, getThemeNames } from '@/lib/chatThemes';

interface ChatSettingsProps {
  currentSettings: ChatSettingsType;
  onSettingsChange: (settings: ChatSettingsType) => void;
  onClose: () => void;
}

/**
 * Renders enhanced settings panel for customizing chat appearance
 * Features:
 * - Modern theme selection with visual previews
 * - Font size and style customization
 * - Accent color picker
 * - Clean, functional Material Design UI
 */
export function ChatSettings({
  currentSettings,
  onSettingsChange,
  onClose,
}: ChatSettingsProps) {
  const [selectedTheme, setSelectedTheme] = useState<string>(currentSettings.theme);
  const [fontSize, setFontSize] = useState<number>(currentSettings.fontSize || 14);
  const [fontStyle, setFontStyle] = useState<FontStyle>(currentSettings.fontStyle || 'normal');
  const [accentColor, setAccentColor] = useState<string>(
    currentSettings.colors?.accentColor || '#007AFF'
  );

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

  // Handle accent color change
  const handleAccentColorChange = (color: string) => {
    setAccentColor(color);
    onSettingsChange({
      ...currentSettings,
      colors: {
        ...currentSettings.colors,
        accentColor: color,
      },
    });
  };

  const themeNames = getThemeNames();

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md p-6 bg-white dark:bg-gray-900 shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Chat Settings</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <X size={20} className="text-gray-600 dark:text-gray-400" />
          </button>
        </div>

        {/* Theme Selection */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Palette size={20} className="text-blue-500" />
            <h3 className="font-semibold text-gray-900 dark:text-white">Theme</h3>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {themeNames.map((themeName) => {
              const theme = CHAT_THEMES[themeName];
              return (
                <button
                  key={themeName}
                  onClick={() => handleThemeSelect(themeName)}
                  className={`p-3 rounded-lg border-2 transition-all ${
                    selectedTheme === themeName
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: theme.colors.sentMessageBg }}
                    />
                    <span className="text-sm font-medium text-gray-900 dark:text-white capitalize">
                      {themeName}
                    </span>
                  </div>
                  <div className="flex gap-1">
                    <div
                      className="flex-1 h-2 rounded-full"
                      style={{ backgroundColor: theme.colors.sentMessageBg }}
                    />
                    <div
                      className="flex-1 h-2 rounded-full"
                      style={{ backgroundColor: theme.colors.receivedMessageBg }}
                    />
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Font Size */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Type size={20} className="text-green-500" />
            <h3 className="font-semibold text-gray-900 dark:text-white">Font Size</h3>
          </div>
          <div className="space-y-3">
            <input
              type="range"
              min="12"
              max="20"
              value={fontSize}
              onChange={(e) => handleFontSizeChange(parseInt(e.target.value))}
              className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
            />
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Small</span>
              <span className="text-sm font-semibold text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded-full">
                {fontSize}px
              </span>
              <span className="text-sm text-gray-600 dark:text-gray-400">Large</span>
            </div>
          </div>
        </div>

        {/* Font Style */}
        <div className="mb-8">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Font Style</h3>
          <div className="grid grid-cols-2 gap-2">
            {(['normal', 'italic', 'bold', 'bold-italic'] as FontStyle[]).map((style) => (
              <button
                key={style}
                onClick={() => handleFontStyleChange(style)}
                className={`p-3 rounded-lg border-2 transition-all font-medium capitalize ${
                  fontStyle === style
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                    : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-gray-300'
                }`}
                style={{
                  fontStyle: style.includes('italic') ? 'italic' : 'normal',
                  fontWeight: style.includes('bold') ? 'bold' : 'normal',
                }}
              >
                {style}
              </button>
            ))}
          </div>
        </div>

        {/* Accent Color */}
        <div className="mb-8">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Accent Color</h3>
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={accentColor}
              onChange={(e) => handleAccentColorChange(e.target.value)}
              className="w-12 h-12 rounded-lg cursor-pointer border-2 border-gray-200 dark:border-gray-700"
            />
            <div className="flex-1">
              <p className="text-sm text-gray-600 dark:text-gray-400">Current: {accentColor}</p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
          <Button
            variant="outline"
            onClick={onClose}
            className="flex-1 rounded-lg"
          >
            Cancel
          </Button>
          <Button
            onClick={onClose}
            className="flex-1 rounded-lg bg-blue-500 hover:bg-blue-600 text-white"
          >
            Done
          </Button>
        </div>
      </Card>
    </div>
  );
}
