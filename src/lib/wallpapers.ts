/**
 * Chat Wallpaper Library
 * Provides predefined wallpapers for chat backgrounds
 * Includes solid colors, gradients, and patterns
 */

export interface Wallpaper {
  id: string;
  name: string;
  type: 'solid' | 'gradient' | 'pattern';
  value: string; // CSS value (color, gradient, or pattern URL)
  preview?: string; // Preview color for UI
}

/**
 * Predefined wallpapers for chat backgrounds
 * Users can select from these or upload custom wallpapers
 */
export const WALLPAPERS: Wallpaper[] = [
  // Solid Colors
  {
    id: 'white',
    name: 'White',
    type: 'solid',
    value: '#FFFFFF',
    preview: '#FFFFFF',
  },
  {
    id: 'light-gray',
    name: 'Light Gray',
    type: 'solid',
    value: '#F5F5F5',
    preview: '#F5F5F5',
  },
  {
    id: 'dark-gray',
    name: 'Dark Gray',
    type: 'solid',
    value: '#2A2A2A',
    preview: '#2A2A2A',
  },
  {
    id: 'black',
    name: 'Black',
    type: 'solid',
    value: '#000000',
    preview: '#000000',
  },
  {
    id: 'light-blue',
    name: 'Light Blue',
    type: 'solid',
    value: '#E3F2FD',
    preview: '#E3F2FD',
  },
  {
    id: 'light-green',
    name: 'Light Green',
    type: 'solid',
    value: '#E8F5E9',
    preview: '#E8F5E9',
  },
  {
    id: 'light-pink',
    name: 'Light Pink',
    type: 'solid',
    value: '#FCE4EC',
    preview: '#FCE4EC',
  },
  {
    id: 'light-purple',
    name: 'Light Purple',
    type: 'solid',
    value: '#F3E5F5',
    preview: '#F3E5F5',
  },

  // Gradients
  {
    id: 'blue-gradient',
    name: 'Blue Gradient',
    type: 'gradient',
    value: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    preview: '#667eea',
  },
  {
    id: 'sunset-gradient',
    name: 'Sunset Gradient',
    type: 'gradient',
    value: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    preview: '#f093fb',
  },
  {
    id: 'ocean-gradient',
    name: 'Ocean Gradient',
    type: 'gradient',
    value: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
    preview: '#4facfe',
  },
  {
    id: 'forest-gradient',
    name: 'Forest Gradient',
    type: 'gradient',
    value: 'linear-gradient(135deg, #134e5e 0%, #71b280 100%)',
    preview: '#134e5e',
  },
  {
    id: 'warm-gradient',
    name: 'Warm Gradient',
    type: 'gradient',
    value: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
    preview: '#fa709a',
  },
  {
    id: 'cool-gradient',
    name: 'Cool Gradient',
    type: 'gradient',
    value: 'linear-gradient(135deg, #30cfd0 0%, #330867 100%)',
    preview: '#30cfd0',
  },
  {
    id: 'mint-gradient',
    name: 'Mint Gradient',
    type: 'gradient',
    value: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
    preview: '#a8edea',
  },
  {
    id: 'peach-gradient',
    name: 'Peach Gradient',
    type: 'gradient',
    value: 'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)',
    preview: '#ffecd2',
  },

  // Pattern-based (using CSS patterns)
  {
    id: 'dots-pattern',
    name: 'Dots Pattern',
    type: 'pattern',
    value: 'radial-gradient(circle, #E0E0E0 1px, transparent 1px)',
    preview: '#F5F5F5',
  },
  {
    id: 'grid-pattern',
    name: 'Grid Pattern',
    type: 'pattern',
    value: 'linear-gradient(0deg, transparent 24%, rgba(255, 0, 0, .05) 25%, rgba(255, 0, 0, .05) 26%, transparent 27%, transparent 74%, rgba(255, 0, 0, .05) 75%, rgba(255, 0, 0, .05) 76%, transparent 77%, transparent), linear-gradient(90deg, transparent 24%, rgba(255, 0, 0, .05) 25%, rgba(255, 0, 0, .05) 26%, transparent 27%, transparent 74%, rgba(255, 0, 0, .05) 75%, rgba(255, 0, 0, .05) 76%, transparent 77%, transparent)',
    preview: '#F5F5F5',
  },
];

/**
 * Get wallpaper by ID
 * @param id - Wallpaper ID
 * @returns Wallpaper object or undefined
 */
export function getWallpaperById(id: string): Wallpaper | undefined {
  return WALLPAPERS.find((wp) => wp.id === id);
}

/**
 * Get all wallpapers of a specific type
 * @param type - Wallpaper type ('solid', 'gradient', 'pattern')
 * @returns Array of wallpapers matching the type
 */
export function getWallpapersByType(type: 'solid' | 'gradient' | 'pattern'): Wallpaper[] {
  return WALLPAPERS.filter((wp) => wp.type === type);
}

/**
 * Get CSS value for wallpaper
 * @param wallpaperId - Wallpaper ID
 * @returns CSS value for background
 */
export function getWallpaperCSS(wallpaperId: string): string {
  const wallpaper = getWallpaperById(wallpaperId);
  if (!wallpaper) return '#FFFFFF';

  if (wallpaper.type === 'solid') {
    return `background-color: ${wallpaper.value}`;
  } else if (wallpaper.type === 'gradient') {
    return `background: ${wallpaper.value}`;
  } else {
    return `background: ${wallpaper.value}`;
  }
}
