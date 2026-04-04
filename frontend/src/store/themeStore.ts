import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Appearance } from 'react-native';

type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeState {
  mode: ThemeMode;
  isDark: boolean;
  setMode: (mode: ThemeMode) => Promise<void>;
  loadTheme: () => Promise<void>;
}

const THEME_KEY = 'dropa_theme_mode';

const getSystemTheme = (): boolean => {
  return Appearance.getColorScheme() === 'dark';
};

export const useThemeStore = create<ThemeState>((set, get) => ({
  mode: 'dark',
  isDark: true,

  setMode: async (mode: ThemeMode) => {
    try {
      await AsyncStorage.setItem(THEME_KEY, mode);
      const isDark = mode === 'system' ? getSystemTheme() : mode === 'dark';
      set({ mode, isDark });
    } catch (error) {
      console.error('Error saving theme:', error);
    }
  },

  loadTheme: async () => {
    try {
      const savedMode = await AsyncStorage.getItem(THEME_KEY) as ThemeMode | null;
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
};

export type Theme = typeof lightTheme;

export const getTheme = (isDark: boolean): Theme => {
  return isDark ? darkTheme : lightTheme;
};
