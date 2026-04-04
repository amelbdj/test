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
  mode: 'system',
  isDark: getSystemTheme(),

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

// Listen for system theme changes
Appearance.addChangeListener(({ colorScheme }) => {
  const state = useThemeStore.getState();
  if (state.mode === 'system') {
    useThemeStore.setState({ isDark: colorScheme === 'dark' });
  }
});

// Theme colors
export const lightTheme = {
  background: '#FFFFFF',
  surface: '#F5F5F5',
  surfaceVariant: '#E8E8E8',
  primary: '#6C5CE7',
  primaryVariant: '#5B4BD5',
  secondary: '#00CEC9',
  text: '#1A1A1A',
  textSecondary: '#666666',
  textTertiary: '#999999',
  border: '#E0E0E0',
  error: '#FF6B6B',
  success: '#00B894',
  warning: '#FDCB6E',
  card: '#FFFFFF',
  shadow: 'rgba(0, 0, 0, 0.1)',
};

export const darkTheme = {
  background: '#0A0A0A',
  surface: '#1A1A1A',
  surfaceVariant: '#2A2A2A',
  primary: '#6C5CE7',
  primaryVariant: '#8B7CF7',
  secondary: '#00CEC9',
  text: '#FFFFFF',
  textSecondary: '#B0B0B0',
  textTertiary: '#707070',
  border: '#333333',
  error: '#FF6B6B',
  success: '#00B894',
  warning: '#FDCB6E',
  card: '#1A1A1A',
  shadow: 'rgba(0, 0, 0, 0.3)',
};

export type Theme = typeof lightTheme;

export const getTheme = (isDark: boolean): Theme => {
  return isDark ? darkTheme : lightTheme;
};
