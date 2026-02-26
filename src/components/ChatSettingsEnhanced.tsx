/**
 * Enhanced Chat Settings Component
 * Comprehensive settings for chat customization including:
 * - Wallpaper selection (solid colors, gradients, patterns)
 * - Message accent colors
 * - Font customization
 * - File upload
 * - Notification settings
 * - Church/Security settings
 */

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Palette,
  Type,
  Image as ImageIcon,
  Upload,
  Bell,
  Lock,
  X,
  Check,
} from 'lucide-react';
import type { ChatSettings as ChatSettingsType } from '@/types/chat';
import { CHAT_THEMES, getThemeNames } from '@/lib/chatThemes';
import { WALLPAPERS, getWallpapersByType } from '@/lib/wallpapers';
import { toast } from 'sonner';

interface ChatSettingsEnhancedProps {
  currentSettings: ChatSettingsType;
  onSettingsChange: (settings: ChatSettingsType) => void;
  onClose: () => void;
}

/**
 * Enhanced settings panel with comprehensive customization options
 * Includes themes, wallpapers, colors, fonts, and security settings
 */
export function ChatSettingsEnhanced({
  currentSettings,
  onSettingsChange,
  onClose,
}: ChatSettingsEnhancedProps) {
  const [selectedTheme, setSelectedTheme] = useState<string>(currentSettings.theme);
  const [fontSize, setFontSize] = useState<number>(currentSettings.fontSize || 14);
  const [selectedWallpaper, setSelectedWallpaper] = useState<string>(
    currentSettings.wallpaper || 'white'
  );
  const [messageAccentColor, setMessageAccentColor] = useState<string>(
    currentSettings.messageAccentColor || '#007AFF'
  );
  const [notificationsEnabled, setNotificationsEnabled] = useState<boolean>(
    currentSettings.notificationsEnabled !== false
  );
  const [muteNotifications, setMuteNotifications] = useState<boolean>(
    currentSettings.muteNotifications || false
  );
  const [customWallpaperUrl, setCustomWallpaperUrl] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'appearance' | 'notifications' | 'security'>(
    'appearance'
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle theme selection
  const handleThemeSelect = (themeName: string) => {
    setSelectedTheme(themeName);
    const theme = CHAT_THEMES[themeName];
    if (theme) {
      onSettingsChange({
        ...currentSettings,
        theme: themeName as any,
        colors: {
          sentMessageBg: theme.colors.sentMessageBg,
          receivedMessageBg: theme.colors.receivedMessageBg,
          textColor: theme.colors.textColor,
          accentColor: theme.colors.accentColor,
        },
      });
    }
  };

  // Handle wallpaper selection
  const handleWallpaperSelect = (wallpaperId: string) => {
    setSelectedWallpaper(wallpaperId);
    const wallpaper = WALLPAPERS.find((wp) => wp.id === wallpaperId);
    if (wallpaper) {
      // Map wallpaper types to ChatSettings wallpaperType
      const wallpaperTypeMap: Record<string, 'color' | 'gradient' | 'image'> = {
        solid: 'color',
        gradient: 'gradient',
        pattern: 'image',
      };
      onSettingsChange({
        ...currentSettings,
        wallpaper: wallpaper.value,
        wallpaperType: wallpaperTypeMap[wallpaper.type] || 'color',
      });
    }
  };

  // Handle custom wallpaper URL
  const handleCustomWallpaper = () => {
    if (!customWallpaperUrl.trim()) {
      toast.error('Please enter a valid URL');
      return;
    }

    onSettingsChange({
      ...currentSettings,
      wallpaper: customWallpaperUrl,
      wallpaperType: 'image',
    });

    toast.success('Custom wallpaper applied');
    setCustomWallpaperUrl('');
  };

  // Handle file upload
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size must be less than 5MB');
      return;
    }

    // Create object URL for preview
    const objectUrl = URL.createObjectURL(file);
    onSettingsChange({
      ...currentSettings,
      wallpaper: objectUrl,
      wallpaperType: 'image',
    });

    toast.success('Wallpaper uploaded successfully');
  };

  // Handle font size change
  const handleFontSizeChange = (size: number) => {
    setFontSize(size);
    onSettingsChange({
      ...currentSettings,
      fontSize: size,
    });
  };

  // Handle message accent color change
  const handleAccentColorChange = (color: string) => {
    setMessageAccentColor(color);
    onSettingsChange({
      ...currentSettings,
      messageAccentColor: color,
      colors: {
        sentMessageBg: currentSettings.colors?.sentMessageBg ?? '#007AFF',
        receivedMessageBg: currentSettings.colors?.receivedMessageBg ?? '#E5E5EA',
        textColor: currentSettings.colors?.textColor ?? '#000000',
        accentColor: color,
      },
    });
  };

  // Handle notification settings
  const handleNotificationToggle = () => {
    const newValue = !notificationsEnabled;
    setNotificationsEnabled(newValue);
    onSettingsChange({
      ...currentSettings,
      notificationsEnabled: newValue,
    });
  };

  // Handle mute notifications
  const handleMuteToggle = () => {
    const newValue = !muteNotifications;
    setMuteNotifications(newValue);
    onSettingsChange({
      ...currentSettings,
      muteNotifications: newValue,
    });
  };

  const themeNames = getThemeNames();
  const solidWallpapers = getWallpapersByType('solid');
  const gradientWallpapers = getWallpapersByType('gradient');

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b p-6 flex justify-between items-center">
          <h2 className="text-2xl font-bold">Chat Settings</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-full transition"
          >
            <X size={24} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b">
          <button
            onClick={() => setActiveTab('appearance')}
            className={`flex-1 py-4 px-6 font-medium border-b-2 transition ${
              activeTab === 'appearance'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            <Palette size={18} className="inline mr-2" />
            Appearance
          </button>
          <button
            onClick={() => setActiveTab('notifications')}
            className={`flex-1 py-4 px-6 font-medium border-b-2 transition ${
              activeTab === 'notifications'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            <Bell size={18} className="inline mr-2" />
            Notifications
          </button>
          <button
            onClick={() => setActiveTab('security')}
            className={`flex-1 py-4 px-6 font-medium border-b-2 transition ${
              activeTab === 'security'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            <Lock size={18} className="inline mr-2" />
            Security
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Appearance Tab */}
          {activeTab === 'appearance' && (
            <div className="space-y-6">
              {/* Theme Selection */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Palette size={20} />
                  <h3 className="font-semibold text-lg">Theme</h3>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {themeNames.map((themeName) => (
                    <button
                      key={themeName}
                      onClick={() => handleThemeSelect(themeName)}
                      className={`p-3 rounded-lg border-2 transition capitalize font-medium ${
                        selectedTheme === themeName
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      {themeName === selectedTheme && (
                        <Check size={16} className="inline mr-1" />
                      )}
                      {themeName}
                    </button>
                  ))}
                </div>
              </div>

              {/* Font Size */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Type size={20} />
                  <h3 className="font-semibold text-lg">Font Size</h3>
                </div>
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min="12"
                    max="20"
                    value={fontSize}
                    onChange={(e) => handleFontSizeChange(parseInt(e.target.value))}
                    className="flex-1"
                  />
                  <span className="text-sm font-medium w-12 text-right">{fontSize}px</span>
                </div>
              </div>

              {/* Message Accent Color */}
              <div>
                <h3 className="font-semibold text-lg mb-4">Message Accent Color</h3>
                <div className="flex items-center gap-4">
                  <input
                    type="color"
                    value={messageAccentColor}
                    onChange={(e) => handleAccentColorChange(e.target.value)}
                    className="w-16 h-16 rounded-lg cursor-pointer border-2 border-gray-200"
                  />
                  <div>
                    <p className="text-sm text-gray-600">Current Color</p>
                    <p className="font-mono text-lg">{messageAccentColor}</p>
                  </div>
                </div>
              </div>

              {/* Wallpaper Selection */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <ImageIcon size={20} />
                  <h3 className="font-semibold text-lg">Wallpaper</h3>
                </div>

                {/* Solid Colors */}
                <div className="mb-6">
                  <p className="text-sm font-medium text-gray-600 mb-3">Solid Colors</p>
                  <div className="grid grid-cols-4 md:grid-cols-6 gap-3">
                    {solidWallpapers.map((wp) => (
                      <button
                        key={wp.id}
                        onClick={() => handleWallpaperSelect(wp.id)}
                        className={`w-12 h-12 rounded-lg border-2 transition ${
                          selectedWallpaper === wp.id
                            ? 'border-blue-500 ring-2 ring-blue-300'
                            : 'border-gray-300 hover:border-gray-400'
                        }`}
                        style={{ backgroundColor: wp.preview }}
                        title={wp.name}
                      />
                    ))}
                  </div>
                </div>

                {/* Gradients */}
                <div className="mb-6">
                  <p className="text-sm font-medium text-gray-600 mb-3">Gradients</p>
                  <div className="grid grid-cols-4 md:grid-cols-6 gap-3">
                    {gradientWallpapers.map((wp) => (
                      <button
                        key={wp.id}
                        onClick={() => handleWallpaperSelect(wp.id)}
                        className={`w-12 h-12 rounded-lg border-2 transition ${
                          selectedWallpaper === wp.id
                            ? 'border-blue-500 ring-2 ring-blue-300'
                            : 'border-gray-300 hover:border-gray-400'
                        }`}
                        style={{ background: wp.value }}
                        title={wp.name}
                      />
                    ))}
                  </div>
                </div>

                {/* Custom Wallpaper */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm font-medium text-gray-600 mb-3">Custom Wallpaper</p>
                  <div className="flex gap-2 mb-3">
                    <Input
                      type="text"
                      placeholder="Enter image URL"
                      value={customWallpaperUrl}
                      onChange={(e) => setCustomWallpaperUrl(e.target.value)}
                    />
                    <Button onClick={handleCustomWallpaper} size="sm">
                      Apply
                    </Button>
                  </div>
                  <div className="flex gap-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                    <Button
                      onClick={() => fileInputRef.current?.click()}
                      variant="outline"
                      size="sm"
                      className="flex-1"
                    >
                      <Upload size={16} className="mr-2" />
                      Upload Image
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Notifications Tab */}
          {activeTab === 'notifications' && (
            <div className="space-y-6">
              <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
                <h3 className="font-semibold text-blue-900 mb-2">Notification Settings</h3>
                <p className="text-sm text-blue-800">
                  Control how you receive notifications for new messages
                </p>
              </div>

              {/* Enable Notifications */}
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <p className="font-medium">Enable Notifications</p>
                  <p className="text-sm text-gray-600">
                    Receive alerts for new messages
                  </p>
                </div>
                <button
                  onClick={handleNotificationToggle}
                  className={`relative inline-flex h-8 w-14 items-center rounded-full transition ${
                    notificationsEnabled ? 'bg-green-500' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`inline-block h-6 w-6 transform rounded-full bg-white transition ${
                      notificationsEnabled ? 'translate-x-7' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* Mute Notifications */}
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <p className="font-medium">Mute Notifications</p>
                  <p className="text-sm text-gray-600">
                    Silence notifications temporarily
                  </p>
                </div>
                <button
                  onClick={handleMuteToggle}
                  className={`relative inline-flex h-8 w-14 items-center rounded-full transition ${
                    muteNotifications ? 'bg-red-500' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`inline-block h-6 w-6 transform rounded-full bg-white transition ${
                      muteNotifications ? 'translate-x-7' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>
          )}

          {/* Security Tab */}
          {activeTab === 'security' && (
            <div className="space-y-6">
              <div className="bg-purple-50 border border-purple-200 p-4 rounded-lg">
                <h3 className="font-semibold text-purple-900 mb-2">Church Security Settings</h3>
                <p className="text-sm text-purple-800">
                  Manage privacy and security settings for your chat
                </p>
              </div>

              {/* Privacy Notice */}
              <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
                <p className="text-sm text-yellow-800">
                  ℹ️ <strong>Privacy First:</strong> Your messages are encrypted and only visible to chat participants. We never share your data with third parties.
                </p>
              </div>

              {/* Security Features */}
              <div className="space-y-4">
                <div className="p-4 border rounded-lg">
                  <div className="flex items-start gap-3">
                    <Lock size={20} className="text-green-600 mt-1" />
                    <div>
                      <p className="font-medium">End-to-End Encryption</p>
                      <p className="text-sm text-gray-600">
                        All messages are encrypted and secure
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-4 border rounded-lg">
                  <div className="flex items-start gap-3">
                    <Lock size={20} className="text-green-600 mt-1" />
                    <div>
                      <p className="font-medium">Data Protection</p>
                      <p className="text-sm text-gray-600">
                        Your personal information is protected and never shared
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-4 border rounded-lg">
                  <div className="flex items-start gap-3">
                    <Lock size={20} className="text-green-600 mt-1" />
                    <div>
                      <p className="font-medium">Access Control</p>
                      <p className="text-sm text-gray-600">
                        Only authorized users can access your chats
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white border-t p-6 flex gap-2">
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
