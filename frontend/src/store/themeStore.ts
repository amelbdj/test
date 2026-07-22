import { create } from 'zustand';
import { Platform } from 'react-native';

type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeState {
  mode: ThemeMode;
  isDark: boolean;
  setMode: (mode: ThemeMode) => Promise<void>;
  loadTheme: () => Promise<void>;
}

const THEME_KEY = 'dropa_theme_mode';

const getSystemTheme = (): boolean => {
  if (Platform.OS === 'web') {
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? true;
  }
  return true; // Default to dark
};

// Storage helper that works on both web and native
const storage = {
  getItem: async (key: string): Promise<string | null> => {
    try {
      if (Platform.OS === 'web') {
        return localStorage.getItem(key);
      }
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      return await AsyncStorage.getItem(key);
    } catch {
      return null;
    }
  },
  setItem: async (key: string, value: string): Promise<void> => {
    try {
      if (Platform.OS === 'web') {
        localStorage.setItem(key, value);
        return;
      }
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      await AsyncStorage.setItem(key, value);
    } catch {
      // Ignore storage errors
    }
  },
};

export const useThemeStore = create<ThemeState>((set) => ({
  mode: 'dark',
  isDark: true,

  setMode: async (mode: ThemeMode) => {
    try {
      await storage.setItem(THEME_KEY, mode);
      const isDark = mode === 'system' ? getSystemTheme() : mode === 'dark';
      set({ mode, isDark });
    } catch (error) {
      console.error('Error saving theme:', error);
    }
  },

  loadTheme: async () => {
    try {
      const savedMode = await storage.getItem(THEME_KEY) as ThemeMode | null;
      if (savedMode) {
        const isDark = savedMode === 'system' ? getSystemTheme() : savedMode === 'dark';
        set({ mode: savedMode, isDark });
      }
    } catch (error) {
      console.error('Error loading theme:', error);
    }
  },
}));

export const lightTheme = {
  background: '#FFFFFF',
  surface: '#F8F9FA',
  surfaceVariant: '#EEF0F2',
  card: '#FFFFFF',
  cardElevated: '#FFFFFF',
  primary: '#7C3AED',
  primaryLight: '#A78BFA',
  primaryDark: '#5B21B6',
  primaryMuted: 'rgba(124, 58, 237, 0.12)',
  secondary: '#06B6D4',
  secondaryMuted: 'rgba(6, 182, 212, 0.12)',
  accent: '#F59E0B',
  accentMuted: 'rgba(245, 158, 11, 0.12)',
  text: '#1A1A2E',
  textSecondary: '#64748B',
  textTertiary: '#94A3B8',
  textInverse: '#FFFFFF',
  border: '#E2E8F0',
  borderLight: '#F1F5F9',
  error: '#EF4444',
  errorMuted: 'rgba(239, 68, 68, 0.12)',
  success: '#10B981',
  successMuted: 'rgba(16, 185, 129, 0.12)',
  warning: '#F59E0B',
  warningMuted: 'rgba(245, 158, 11, 0.12)',
  streak: '#FF6B35',
  streakMuted: 'rgba(255, 107, 53, 0.12)',
  like: '#EC4899',
  likeMuted: 'rgba(236, 72, 153, 0.12)',
  shadow: 'rgba(0, 0, 0, 0.08)',
  shadowStrong: 'rgba(0, 0, 0, 0.15)',
  overlay: 'rgba(0, 0, 0, 0.5)',
  overlayLight: 'rgba(0, 0, 0, 0.3)',
  gradientStart: '#7C3AED',
  gradientEnd: '#06B6D4',
  tabBar: '#FFFFFF',
  tabBarBorder: '#E2E8F0',
  // Depth / elevation presets (spread directly onto a style)
  elevation: {
    sm: {
      shadowColor: '#1A1A2E',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 8,
      elevation: 2,
    },
    md: {
      shadowColor: '#1A1A2E',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.1,
      shadowRadius: 18,
      elevation: 6,
    },
    lg: {
      shadowColor: '#1A1A2E',
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: 0.16,
      shadowRadius: 28,
      elevation: 12,
    },
    // Coloured glow used under primary actions
    glow: {
      shadowColor: '#7C3AED',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.32,
      shadowRadius: 18,
      elevation: 10,
    },
  },
};

export const darkTheme = {
  background: '#0F0F14',
  surface: '#16161D',
  surfaceVariant: '#1E1E28',
  card: '#1A1A22',
  cardElevated: '#22222C',
  primary: '#8B5CF6',
  primaryLight: '#A78BFA',
  primaryDark: '#7C3AED',
  primaryMuted: 'rgba(139, 92, 246, 0.15)',
  secondary: '#22D3EE',
  secondaryMuted: 'rgba(34, 211, 238, 0.15)',
  accent: '#FBBF24',
  accentMuted: 'rgba(251, 191, 36, 0.15)',
  text: '#FAFAFA',
  textSecondary: '#A1A1AA',
  textTertiary: '#71717A',
  textInverse: '#0F0F14',
  border: '#27272A',
  borderLight: '#3F3F46',
  error: '#F87171',
  errorMuted: 'rgba(248, 113, 113, 0.15)',
  success: '#34D399',
  successMuted: 'rgba(52, 211, 153, 0.15)',
  warning: '#FBBF24',
  warningMuted: 'rgba(251, 191, 36, 0.15)',
  streak: '#FB923C',
  streakMuted: 'rgba(251, 146, 60, 0.15)',
  like: '#F472B6',
  likeMuted: 'rgba(244, 114, 182, 0.15)',
  shadow: 'rgba(0, 0, 0, 0.4)',
  shadowStrong: 'rgba(0, 0, 0, 0.6)',
  overlay: 'rgba(0, 0, 0, 0.7)',
  overlayLight: 'rgba(0, 0, 0, 0.5)',
  gradientStart: '#8B5CF6',
  gradientEnd: '#22D3EE',
  tabBar: '#16161D',
  tabBarBorder: '#27272A',
  // Depth / elevation presets (spread directly onto a style)
  elevation: {
    sm: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 2,
    },
    md: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.45,
      shadowRadius: 18,
      elevation: 6,
    },
    lg: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: 0.6,
      shadowRadius: 28,
      elevation: 12,
    },
    // Coloured glow used under primary actions
    glow: {
      shadowColor: '#8B5CF6',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.5,
      shadowRadius: 20,
      elevation: 10,
    },
  },
};

export type Theme = typeof lightTheme;

export const getTheme = (isDark: boolean): Theme => {
  return isDark ? darkTheme : lightTheme;
};

// Shared spacing scale (4pt grid) — use for consistent rhythm across screens
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

// Shared corner-radius scale
export const radius = {
  sm: 10,
  md: 14,
  lg: 20,
  xl: 24,
  pill: 999,
} as const;
