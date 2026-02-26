/**
 * Chat Theme Definitions - Enhanced
 * Modern color schemes inspired by Google Material Design and Gboard
 * Each theme includes optimized colors for sent/received messages and accents
 */

import type { ThemeConfig } from '@/types/chat';

/**
 * Available chat themes with modern color configurations
 * Inspired by Google Material Design 3 and Gboard keyboard themes
 */
export const CHAT_THEMES: Record<string, ThemeConfig> = {
  light: {
    name: 'light',
    label: 'Light',
    colors: {
      sentMessageBg: '#007AFF',
      receivedMessageBg: '#E8E8ED',
      textColor: '#000000',
      accentColor: '#007AFF',
      wallpaper: '#FFFFFF',
    },
    wallpaper: '#FFFFFF',
  },
  dark: {
    name: 'dark',
    label: 'Dark',
    colors: {
      sentMessageBg: '#0084FF',
      receivedMessageBg: '#262626',
      textColor: '#FFFFFF',
      accentColor: '#0084FF',
      wallpaper: '#121212',
    },
    wallpaper: '#121212',
  },
  material: {
    name: 'material',
    label: 'Material',
    colors: {
      sentMessageBg: '#1F88E5',
      receivedMessageBg: '#F0F0F0',
      textColor: '#202124',
      accentColor: '#1F88E5',
      wallpaper: '#FFFFFF',
    },
    wallpaper: '#FFFFFF',
  },
  ocean: {
    name: 'ocean',
    label: 'Ocean',
    colors: {
      sentMessageBg: '#0099FF',
      receivedMessageBg: '#E0F2FE',
      textColor: '#003366',
      accentColor: '#0099FF',
      wallpaper: '#F0F8FF',
    },
    wallpaper: '#F0F8FF',
  },
  forest: {
    name: 'forest',
    label: 'Forest',
    colors: {
      sentMessageBg: '#2D5016',
      receivedMessageBg: '#D4E8D4',
      textColor: '#1B3A1B',
      accentColor: '#2D5016',
      wallpaper: '#E8F5E9',
    },
    wallpaper: '#E8F5E9',
  },
  sunset: {
    name: 'sunset',
    label: 'Sunset',
    colors: {
      sentMessageBg: '#FF6B35',
      receivedMessageBg: '#FFE5CC',
      textColor: '#8B4513',
      accentColor: '#FF6B35',
      wallpaper: '#FFF5E6',
    },
    wallpaper: '#FFF5E6',
  },
  purple: {
    name: 'purple',
    label: 'Purple',
    colors: {
      sentMessageBg: '#7C3AED',
      receivedMessageBg: '#F3E8FF',
      textColor: '#4C1D95',
      accentColor: '#7C3AED',
      wallpaper: '#FAF5FF',
    },
    wallpaper: '#FAF5FF',
  },
  mint: {
    name: 'mint',
    label: 'Mint',
    colors: {
      sentMessageBg: '#10B981',
      receivedMessageBg: '#D1FAE5',
      textColor: '#065F46',
      accentColor: '#10B981',
      wallpaper: '#F0FDF4',
    },
    wallpaper: '#F0FDF4',
  },
};

/**
 * Get theme configuration by name
 * @param themeName - The name of the theme to retrieve
 * @returns Theme configuration object or default light theme
 */
export function getThemeConfig(themeName: string): ThemeConfig {
  return CHAT_THEMES[themeName] || CHAT_THEMES.light;
}

/**
 * Get all available theme names
 * @returns Array of theme names
 */
export function getThemeNames(): string[] {
  return Object.keys(CHAT_THEMES);
}
