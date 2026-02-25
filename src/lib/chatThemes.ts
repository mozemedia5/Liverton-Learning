/**
 * Chat Themes Configuration
 * Predefined themes with customizable colors and wallpapers
 */

import { ThemeConfig } from '@/types/chat';

/**
 * Built-in chat themes
 * Each theme includes colors and optional wallpaper
 */
export const CHAT_THEMES: Record<string, ThemeConfig> = {
  light: {
    name: 'light',
    label: 'Light',
    colors: {
      sentMessageBg: '#007AFF', // iOS blue
      receivedMessageBg: '#E5E5EA', // Light gray
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
      sentMessageBg: '#0084FF', // Facebook blue
      receivedMessageBg: '#262626', // Dark gray
      textColor: '#FFFFFF',
      accentColor: '#0084FF',
      wallpaper: '#121212',
    },
    wallpaper: '#121212',
  },
  ocean: {
    name: 'ocean',
    label: 'Ocean',
    colors: {
      sentMessageBg: '#0066CC', // Ocean blue
      receivedMessageBg: '#B3E5FC', // Light cyan
      textColor: '#001A4D',
      accentColor: '#0066CC',
      wallpaper: 'linear-gradient(135deg, #E0F7FA 0%, #B3E5FC 100%)',
    },
    wallpaper: 'linear-gradient(135deg, #E0F7FA 0%, #B3E5FC 100%)',
  },
  forest: {
    name: 'forest',
    label: 'Forest',
    colors: {
      sentMessageBg: '#2E7D32', // Forest green
      receivedMessageBg: '#C8E6C9', // Light green
      textColor: '#1B5E20',
      accentColor: '#2E7D32',
      wallpaper: 'linear-gradient(135deg, #E8F5E9 0%, #C8E6C9 100%)',
    },
    wallpaper: 'linear-gradient(135deg, #E8F5E9 0%, #C8E6C9 100%)',
  },
  sunset: {
    name: 'sunset',
    label: 'Sunset',
    colors: {
      sentMessageBg: '#FF6B35', // Sunset orange
      receivedMessageBg: '#FFE5CC', // Light peach
      textColor: '#8B3A00',
      accentColor: '#FF6B35',
      wallpaper: 'linear-gradient(135deg, #FFF3E0 0%, #FFE0B2 100%)',
    },
    wallpaper: 'linear-gradient(135deg, #FFF3E0 0%, #FFE0B2 100%)',
  },
  custom: {
    name: 'custom',
    label: 'Custom',
    colors: {
      sentMessageBg: '#007AFF',
      receivedMessageBg: '#E5E5EA',
      textColor: '#000000',
      accentColor: '#007AFF',
      wallpaper: '#FFFFFF',
    },
  },
};

/**
 * Get theme configuration by name
 * @param themeName - Name of the theme
 * @returns Theme configuration object
 */
export function getThemeConfig(themeName: string): ThemeConfig {
  return CHAT_THEMES[themeName] || CHAT_THEMES.light;
}

/**
 * Get all available themes
 * @returns Array of theme names
 */
export function getAvailableThemes(): string[] {
  return Object.keys(CHAT_THEMES).filter(theme => theme !== 'custom');
}

/**
 * Validate hex color
 * @param color - Color string to validate
 * @returns True if valid hex color
 */
export function isValidHexColor(color: string): boolean {
  return /^#[0-9A-F]{6}$/i.test(color);
}

/**
 * Convert RGB to Hex
 * @param r - Red value (0-255)
 * @param g - Green value (0-255)
 * @param b - Blue value (0-255)
 * @returns Hex color string
 */
export function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map(x => {
    const hex = x.toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }).join('').toUpperCase();
}

/**
 * Convert Hex to RGB
 * @param hex - Hex color string
 * @returns Object with r, g, b values
 */
export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16),
  } : null;
}

/**
 * Get contrasting text color (black or white) based on background
 * @param bgColor - Background color in hex
 * @returns 'black' or 'white' for best contrast
 */
export function getContrastingTextColor(bgColor: string): string {
  const rgb = hexToRgb(bgColor);
  if (!rgb) return '#000000';
  
  // Calculate luminance
  const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
  
  // Return black text for light backgrounds, white for dark
  return luminance > 0.5 ? '#000000' : '#FFFFFF';
}
