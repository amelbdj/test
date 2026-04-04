import { useMemo } from 'react';
import { useThemeStore, getTheme, Theme } from '../store/themeStore';

export const useTheme = (): Theme => {
  const isDark = useThemeStore((state) => state.isDark);
  return useMemo(() => getTheme(isDark), [isDark]);
};

export const useThemeMode = () => {
  const mode = useThemeStore((state) => state.mode);
  const isDark = useThemeStore((state) => state.isDark);
  const setMode = useThemeStore((state) => state.setMode);
  
  return { mode, isDark, setMode };
};
