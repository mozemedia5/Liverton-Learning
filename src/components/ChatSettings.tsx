/**
 * Chat Settings Component
 * Allows users to customize chat appearance, themes, fonts, and wallpapers
 */

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import {
  Settings,
  X,
  Palette,
  Type,
  Image as ImageIcon,
  RotateCcw,
} from 'lucide-react';
import { ChatSettings as ChatSettingsType, ChatTheme, FontStyle } from '@/types/chat';
import { CHAT_THEMES, getAvailableThemes, isValidHexColor } from '@/lib/chatThemes';
import { toast } from 'sonner';

interface ChatSettingsProps {
  isOpen: boolean;
  onClose: () => void;
  settings: ChatSettingsType;
  onSave: (settings: ChatSettingsType) => void;
}

/**
 * Chat Settings Modal Component
 * Provides UI for customizing:
 * - Chat themes (built-in and custom)
 * - Wallpapers (color, gradient, or image)
 * - Message bubble colors
 * - Font style and size
 * - Notification preferences
 */
export function ChatSettingsModal({
  isOpen,
  onClose,
  settings,
  onSave,
}: ChatSettingsProps) {
  const [localSettings, setLocalSettings] = useState<ChatSettingsType>(settings);
  const [activeTab, setActiveTab] = useState<'theme' | 'wallpaper' | 'font' | 'colors'>('theme');

  useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);

  /**
   * Handle theme selection
   * Updates all colors based on selected theme
   */
  const handleThemeSelect = (themeName: ChatTheme) => {
    const theme = CHAT_THEMES[themeName];
    if (theme) {
      setLocalSettings({
        ...localSettings,
        theme: themeName,
        messageAccentColor: theme.colors.accentColor,
        customColors: {
          sentMessageBg: theme.colors.sentMessageBg,
          receivedMessageBg: theme.colors.receivedMessageBg,
          textColor: theme.colors.textColor,
          accentColor: theme.colors.accentColor,
        },
        wallpaper: theme.wallpaper,
        wallpaperType: 'color',
      });
    }
  };

  /**
   * Handle wallpaper color change
   */
  const handleWallpaperColorChange = (color: string) => {
    if (isValidHexColor(color)) {
      setLocalSettings({
        ...localSettings,
        wallpaper: color,
        wallpaperType: 'color',
      });
    }
  };

  /**
   * Handle wallpaper gradient change
   */
  const handleWallpaperGradientChange = (gradient: string) => {
    setLocalSettings({
      ...localSettings,
      wallpaper: gradient,
      wallpaperType: 'gradient',
    });
  };

  /**
   * Handle font size change
   */
  const handleFontSizeChange = (size: number) => {
    if (size >= 12 && size <= 20) {
      setLocalSettings({
        ...localSettings,
        fontSize: size,
      });
    }
  };

  /**
   * Handle font style change
   */
  const handleFontStyleChange = (style: FontStyle) => {
    setLocalSettings({
      ...localSettings,
      fontStyle: style,
    });
  };

  /**
   * Handle custom color change
   */
  const handleColorChange = (colorType: keyof NonNullable<ChatSettingsType['customColors']>, color: string) => {
    if (isValidHexColor(color)) {
      setLocalSettings({
        ...localSettings,
        customColors: {
          ...localSettings.customColors,
          [colorType]: color,
        },
      });
    }
  };

  /**
   * Reset to default settings
   */
  const handleReset = () => {
    const defaultTheme = CHAT_THEMES.light;
    const defaultSettings: ChatSettingsType = {
      theme: 'light',
      wallpaper: defaultTheme.wallpaper,
      wallpaperType: 'color',
      messageAccentColor: defaultTheme.colors.accentColor,
      fontStyle: 'normal',
      fontSize: 14,
      notificationsEnabled: true,
      muteNotifications: false,
      customColors: {
        sentMessageBg: defaultTheme.colors.sentMessageBg,
        receivedMessageBg: defaultTheme.colors.receivedMessageBg,
        textColor: defaultTheme.colors.textColor,
        accentColor: defaultTheme.colors.accentColor,
      },
    };
    setLocalSettings(defaultSettings);
    toast.success('Settings reset to default');
  };

  /**
   * Save settings
   */
  const handleSave = () => {
    onSave(localSettings);
    toast.success('Chat settings saved');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            <h2 className="text-xl font-semibold">Chat Settings</h2>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 p-4 border-b border-gray-200 dark:border-gray-800 overflow-x-auto">
          <button
            onClick={() => setActiveTab('theme')}
            className={`px-4 py-2 rounded-lg whitespace-nowrap transition-colors ${
              activeTab === 'theme'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            <Palette className="w-4 h-4 inline mr-2" />
            Themes
          </button>
          <button
            onClick={() => setActiveTab('wallpaper')}
            className={`px-4 py-2 rounded-lg whitespace-nowrap transition-colors ${
              activeTab === 'wallpaper'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            <ImageIcon className="w-4 h-4 inline mr-2" />
            Wallpaper
          </button>
          <button
            onClick={() => setActiveTab('font')}
            className={`px-4 py-2 rounded-lg whitespace-nowrap transition-colors ${
              activeTab === 'font'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            <Type className="w-4 h-4 inline mr-2" />
            Font
          </button>
          <button
            onClick={() => setActiveTab('colors')}
            className={`px-4 py-2 rounded-lg whitespace-nowrap transition-colors ${
              activeTab === 'colors'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            <Palette className="w-4 h-4 inline mr-2" />
            Colors
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Theme Tab */}
          {activeTab === 'theme' && (
            <div className="space-y-4">
              <h3 className="font-semibold">Select a Theme</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {getAvailableThemes().map(themeName => {
                  const theme = CHAT_THEMES[themeName];
                  return (
                    <button
                      key={themeName}
                      onClick={() => handleThemeSelect(themeName as ChatTheme)}
                      className={`p-4 rounded-lg border-2 transition-all ${
                        localSettings.theme === themeName
                          ? 'border-blue-600 bg-blue-50 dark:bg-blue-900'
                          : 'border-gray-200 dark:border-gray-700 hover:border-blue-400'
                      }`}
                    >
                      <div className="flex gap-2 mb-2">
                        <div
                          className="w-6 h-6 rounded"
                          style={{ backgroundColor: theme.colors.sentMessageBg }}
                        />
                        <div
                          className="w-6 h-6 rounded"
                          style={{ backgroundColor: theme.colors.receivedMessageBg }}
                        />
                      </div>
                      <p className="text-sm font-medium">{theme.label}</p>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Wallpaper Tab */}
          {activeTab === 'wallpaper' && (
            <div className="space-y-4">
              <h3 className="font-semibold">Chat Wallpaper</h3>
              
              {/* Wallpaper Preview */}
              <div
                className="w-full h-40 rounded-lg border-2 border-gray-200 dark:border-gray-700"
                style={{
                  background: localSettings.wallpaper,
                }}
              />

              {/* Wallpaper Type Selection */}
              <div className="space-y-3">
                <label className="block text-sm font-medium">Wallpaper Type</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setLocalSettings({ ...localSettings, wallpaperType: 'color' })}
                    className={`px-4 py-2 rounded-lg transition-colors ${
                      localSettings.wallpaperType === 'color'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 dark:bg-gray-800'
                    }`}
                  >
                    Solid Color
                  </button>
                  <button
                    onClick={() => setLocalSettings({ ...localSettings, wallpaperType: 'gradient' })}
                    className={`px-4 py-2 rounded-lg transition-colors ${
                      localSettings.wallpaperType === 'gradient'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 dark:bg-gray-800'
                    }`}
                  >
                    Gradient
                  </button>
                </div>
              </div>

              {/* Color Input */}
              {localSettings.wallpaperType === 'color' && (
                <div className="space-y-2">
                  <label className="block text-sm font-medium">Color</label>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      value={localSettings.wallpaper || '#FFFFFF'}
                      onChange={(e) => handleWallpaperColorChange(e.target.value)}
                      className="w-20 h-10 cursor-pointer"
                    />
                    <Input
                      type="text"
                      value={localSettings.wallpaper || '#FFFFFF'}
                      onChange={(e) => handleWallpaperColorChange(e.target.value)}
                      placeholder="#FFFFFF"
                      className="flex-1"
                    />
                  </div>
                </div>
              )}

              {/* Gradient Input */}
              {localSettings.wallpaperType === 'gradient' && (
                <div className="space-y-2">
                  <label className="block text-sm font-medium">Gradient CSS</label>
                  <Input
                    type="text"
                    value={localSettings.wallpaper || 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'}
                    onChange={(e) => handleWallpaperGradientChange(e.target.value)}
                    placeholder="linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
                    className="font-mono text-sm"
                  />
                </div>
              )}
            </div>
          )}

          {/* Font Tab */}
          {activeTab === 'font' && (
            <div className="space-y-4">
              <h3 className="font-semibold">Font Settings</h3>

              {/* Font Style */}
              <div className="space-y-2">
                <label className="block text-sm font-medium">Font Style</label>
                <div className="grid grid-cols-2 gap-2">
                  {(['normal', 'italic', 'bold', 'bold-italic'] as FontStyle[]).map(style => (
                    <button
                      key={style}
                      onClick={() => handleFontStyleChange(style)}
                      className={`px-4 py-2 rounded-lg transition-colors ${
                        localSettings.fontStyle === style
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 dark:bg-gray-800'
                      }`}
                      style={{
                        fontStyle: style.includes('italic') ? 'italic' : 'normal',
                        fontWeight: style.includes('bold') ? 'bold' : 'normal',
                      }}
                    >
                      {style.charAt(0).toUpperCase() + style.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Font Size */}
              <div className="space-y-2">
                <label className="block text-sm font-medium">
                  Font Size: {localSettings.fontSize}px
                </label>
                <input
                  type="range"
                  min="12"
                  max="20"
                  value={localSettings.fontSize}
                  onChange={(e) => handleFontSizeChange(parseInt(e.target.value))}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-500">
                  <span>12px</span>
                  <span>20px</span>
                </div>
              </div>

              {/* Preview */}
              <div className="mt-4 p-4 rounded-lg bg-gray-100 dark:bg-gray-800">
                <p
                  style={{
                    fontSize: `${localSettings.fontSize}px`,
                    fontStyle: localSettings.fontStyle.includes('italic') ? 'italic' : 'normal',
                    fontWeight: localSettings.fontStyle.includes('bold') ? 'bold' : 'normal',
                  }}
                >
                  This is a preview of your message text
                </p>
              </div>
            </div>
          )}

          {/* Colors Tab */}
          {activeTab === 'colors' && (
            <div className="space-y-4">
              <h3 className="font-semibold">Message Colors</h3>

              {/* Sent Message Color */}
              <div className="space-y-2">
                <label className="block text-sm font-medium">Sent Message Background</label>
                <div className="flex gap-2">
                  <Input
                    type="color"
                    value={localSettings.customColors?.sentMessageBg || '#007AFF'}
                    onChange={(e) => handleColorChange('sentMessageBg', e.target.value)}
                    className="w-20 h-10 cursor-pointer"
                  />
                  <Input
                    type="text"
                    value={localSettings.customColors?.sentMessageBg || '#007AFF'}
                    onChange={(e) => handleColorChange('sentMessageBg', e.target.value)}
                    placeholder="#007AFF"
                    className="flex-1"
                  />
                </div>
              </div>

              {/* Received Message Color */}
              <div className="space-y-2">
                <label className="block text-sm font-medium">Received Message Background</label>
                <div className="flex gap-2">
                  <Input
                    type="color"
                    value={localSettings.customColors?.receivedMessageBg || '#E5E5EA'}
                    onChange={(e) => handleColorChange('receivedMessageBg', e.target.value)}
                    className="w-20 h-10 cursor-pointer"
                  />
                  <Input
                    type="text"
                    value={localSettings.customColors?.receivedMessageBg || '#E5E5EA'}
                    onChange={(e) => handleColorChange('receivedMessageBg', e.target.value)}
                    placeholder="#E5E5EA"
                    className="flex-1"
                  />
                </div>
              </div>

              {/* Text Color */}
              <div className="space-y-2">
                <label className="block text-sm font-medium">Text Color</label>
                <div className="flex gap-2">
                  <Input
                    type="color"
                    value={localSettings.customColors?.textColor || '#000000'}
                    onChange={(e) => handleColorChange('textColor', e.target.value)}
                    className="w-20 h-10 cursor-pointer"
                  />
                  <Input
                    type="text"
                    value={localSettings.customColors?.textColor || '#000000'}
                    onChange={(e) => handleColorChange('textColor', e.target.value)}
                    placeholder="#000000"
                    className="flex-1"
                  />
                </div>
              </div>

              {/* Accent Color */}
              <div className="space-y-2">
                <label className="block text-sm font-medium">Accent Color</label>
                <div className="flex gap-2">
                  <Input
                    type="color"
                    value={localSettings.customColors?.accentColor || '#007AFF'}
                    onChange={(e) => handleColorChange('accentColor', e.target.value)}
                    className="w-20 h-10 cursor-pointer"
                  />
                  <Input
                    type="text"
                    value={localSettings.customColors?.accentColor || '#007AFF'}
                    onChange={(e) => handleColorChange('accentColor', e.target.value)}
                    placeholder="#007AFF"
                    className="flex-1"
                  />
                </div>
              </div>

              {/* Preview */}
              <div className="mt-4 space-y-2">
                <p className="text-sm font-medium">Preview</p>
                <div
                  className="p-4 rounded-lg space-y-2"
                  style={{ background: localSettings.wallpaper }}
                >
                  <div className="flex justify-end">
                    <div
                      className="max-w-xs p-3 rounded-lg"
                      style={{
                        backgroundColor: localSettings.customColors?.sentMessageBg,
                        color: localSettings.customColors?.textColor,
                      }}
                    >
                      <p style={{ fontSize: `${localSettings.fontSize}px` }}>Your message</p>
                    </div>
                  </div>
                  <div className="flex justify-start">
                    <div
                      className="max-w-xs p-3 rounded-lg"
                      style={{
                        backgroundColor: localSettings.customColors?.receivedMessageBg,
                        color: localSettings.customColors?.textColor,
                      }}
                    >
                      <p style={{ fontSize: `${localSettings.fontSize}px` }}>Their message</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-6 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900">
          <Button variant="outline" onClick={handleReset} className="flex-1">
            <RotateCcw className="w-4 h-4 mr-2" />
            Reset to Default
          </Button>
          <Button variant="outline" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button onClick={handleSave} className="flex-1 bg-blue-600 hover:bg-blue-700">
            Save Settings
          </Button>
        </div>
      </Card>
    </div>
  );
}

export default ChatSettingsModal;
