import { useThemeStore, getTheme, Theme } from '../store/themeStore';

export const useTheme = (): Theme => {
  const isDark = useThemeStore((state) => state.isDark);
  return getTheme(isDark);
};

export const useThemeMode = () => {
  return useThemeStore((state) => ({
    mode: state.mode,
    isDark: state.isDark,
    setMode: state.setMode,
  }));
};
