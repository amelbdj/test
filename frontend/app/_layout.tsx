import React, { useEffect, useState } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useAuthStore } from '../src/store/authStore';
import { useThemeStore } from '../src/store/themeStore';
import { useTheme } from '../src/hooks/useTheme';
import { LoadingSpinner } from '../src/components/LoadingSpinner';
import { View } from 'react-native';

export default function RootLayout() {
  const { isAuthenticated, isLoading, checkAuth } = useAuthStore();
  const loadTheme = useThemeStore((state) => state.loadTheme);
  const isDark = useThemeStore((state) => state.isDark);
  const theme = useTheme();
  const router = useRouter();
  const segments = useSegments();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const init = async () => {
      await loadTheme();
      await checkAuth();
      setIsReady(true);
    };
    init();
  }, []);

  useEffect(() => {
    if (!isReady || isLoading) return;

    const inAuthGroup = segments[0] === '(auth)';
    // segments is empty on the root index route ('/') which is only a splash.
    const onRootIndex = (segments as string[]).length === 0;

    if (!isAuthenticated && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (isAuthenticated && (inAuthGroup || onRootIndex)) {
      // Authenticated users must never stay on the auth screens or the splash.
      router.replace('/(tabs)');
    }
  }, [isAuthenticated, segments, isReady, isLoading]);

  if (!isReady || isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#0F0F14' }}>
        <LoadingSpinner fullScreen message="Chargement..." />
      </View>
    );
  }

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: theme.background },
          animation: 'none',
        }}
      >
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="drop/[id]" />
        <Stack.Screen name="chat/[id]" />
        <Stack.Screen name="notifications" />
        <Stack.Screen name="weekly-summary" />
        <Stack.Screen name="settings" />
        <Stack.Screen name="edit-profile" />
        <Stack.Screen name="streak" />
        <Stack.Screen name="messages" />
      </Stack>
    </>
  );
}
