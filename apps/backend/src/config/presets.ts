/*
 * Preset Definitions
 * Standard logo variant formats for different use cases
 */

import { LayoutPreset } from '../services/generation/layoutEngine';

export const DEFAULT_PRESETS: LayoutPreset[] = [
  // Phase 1 - Original 5 presets
  {
    name: 'Website Header',
    width: 1600,
    height: 400,
    description: 'Wide header format for website banners',
    category: 'web',
  },
  {
    name: 'Social Square',
    width: 1200,
    height: 1200,
    description: 'Square format for social media profile pictures',
    category: 'social',
  },
  {
    name: 'App Icon',
    width: 1024,
    height: 1024,
    description: 'High-resolution app icon',
    category: 'mobile',
  },
  {
    name: 'Favicon',
    width: 48,
    height: 48,
    description: 'Small icon for browser tabs',
    category: 'web',
  },
  {
    name: 'Profile Picture',
    width: 400,
    height: 400,
    description: 'Standard profile picture size',
    category: 'social',
  },

  // Phase 2 - Social Media presets
  {
    name: 'Facebook Cover',
    width: 820,
    height: 312,
    description: 'Facebook page cover photo',
    category: 'social',
  },
  {
    name: 'Facebook Post',
    width: 1200,
    height: 630,
    description: 'Facebook shared post image',
    category: 'social',
  },
  {
    name: 'Instagram Post',
    width: 1080,
    height: 1080,
    description: 'Instagram square post',
    category: 'social',
  },
  {
    name: 'Instagram Story',
    width: 1080,
    height: 1920,
    description: 'Instagram story format',
    category: 'social',
  },
  {
    name: 'Twitter Header',
    width: 1500,
    height: 500,
    description: 'Twitter/X profile header',
    category: 'social',
  },
  {
    name: 'Twitter Post',
    width: 1200,
    height: 675,
    description: 'Twitter/X post image',
    category: 'social',
  },
  {
    name: 'LinkedIn Cover',
    width: 1584,
    height: 396,
    description: 'LinkedIn profile banner',
    category: 'social',
  },
  {
    name: 'YouTube Thumbnail',
    width: 1280,
    height: 720,
    description: 'YouTube video thumbnail',
    category: 'social',
  },
  {
    name: 'YouTube Channel Art',
    width: 2560,
    height: 1440,
    description: 'YouTube channel banner',
    category: 'social',
  },

  // Mobile presets
  {
    name: 'iOS App Icon',
    width: 1024,
    height: 1024,
    description: 'iOS app icon (all sizes generated)',
    category: 'mobile',
  },
  {
    name: 'Android App Icon',
    width: 512,
    height: 512,
    description: 'Android adaptive icon',
    category: 'mobile',
  },
  {
    name: 'iOS Splash Screen',
    width: 1242,
    height: 2688,
    description: 'iOS launch screen',
    category: 'mobile',
  },

  // Web presets
  {
    name: 'Open Graph',
    width: 1200,
    height: 630,
    description: 'Open Graph / social media preview',
    category: 'web',
  },
  {
    name: 'Twitter Card',
    width: 1200,
    height: 628,
    description: 'Twitter Card image',
    category: 'web',
  },
  {
    name: 'Email Signature',
    width: 600,
    height: 200,
    description: 'Email signature logo',
    category: 'web',
  },

  // Print presets
  {
    name: 'Business Card',
    width: 1050,
    height: 600,
    description: 'Business card (3.5" × 2", 300 DPI)',
    category: 'print',
  },
  {
    name: 'Letterhead',
    width: 2550,
    height: 3300,
    description: 'Letterhead header (8.5" × 11", 300 DPI)',
    category: 'print',
  },
];

// Preset categories for organization
export const PRESET_CATEGORIES = {
  web: 'Web & Digital',
  social: 'Social Media',
  mobile: 'Mobile & Apps',
  print: 'Print & Marketing',
} as const;

// Helper to get presets by category
export function getPresetsByCategory(category: keyof typeof PRESET_CATEGORIES): LayoutPreset[] {
  return DEFAULT_PRESETS.filter((preset) => preset.category === category);
}

// Helper to get preset by name
export function getPresetByName(name: string): LayoutPreset | undefined {
  return DEFAULT_PRESETS.find((preset) => preset.name === name);
}
