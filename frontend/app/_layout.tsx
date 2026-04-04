import React, { useEffect, useState } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useAuthStore } from '../src/store/authStore';
import { useThemeStore } from '../src/store/themeStore';
import { useTheme } from '../src/hooks/useTheme';
import { LoadingSpinner } from '../src/components/LoadingSpinner';
import { View, Platform } from 'react-native';

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

    if (!isAuthenticated && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (isAuthenticated && inAuthGroup) {
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

  const defaultTransition = Platform.OS === 'ios' ? 'default' : 'slide_from_right';

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: theme.background },
          animation: defaultTransition,
          animationDuration: 250,
          gestureEnabled: true,
          gestureDirection: 'horizontal',
        }}
      >
        {/* Auth group: crossfade */}
        <Stack.Screen
          name="(auth)"
          options={{
            headerShown: false,
            animation: 'fade',
            animationDuration: 300,
          }}
        />

        {/* Main tabs: crossfade in */}
        <Stack.Screen
          name="(tabs)"
          options={{
            headerShown: false,
            animation: 'fade',
            animationDuration: 300,
          }}
        />

        {/* Drop detail: iOS default push / Android slide */}
        <Stack.Screen
          name="drop/[id]"
          options={{
            animation: defaultTransition,
            animationDuration: 250,
            gestureEnabled: true,
          }}
        />

        {/* Chat: fast slide for messaging feel */}
        <Stack.Screen
          name="chat/[id]"
          options={{
            animation: defaultTransition,
            animationDuration: 200,
            gestureEnabled: true,
          }}
        />

        {/* Notifications: slide from right */}
        <Stack.Screen
          name="notifications"
          options={{
            animation: defaultTransition,
            animationDuration: 250,
            gestureEnabled: true,
          }}
        />

        {/* Weekly Summary: slide up from bottom (immersive modal feel) */}
        <Stack.Screen
          name="weekly-summary"
          options={{
            animation: 'slide_from_bottom',
            animationDuration: 350,
            gestureEnabled: true,
            gestureDirection: 'vertical',
            presentation: 'card',
          }}
        />

        {/* Settings: slide from right */}
        <Stack.Screen
          name="settings"
          options={{
            animation: defaultTransition,
            animationDuration: 250,
            gestureEnabled: true,
          }}
        />

        {/* Edit profile: modal from bottom */}
        <Stack.Screen
          name="edit-profile"
          options={{
            animation: 'slide_from_bottom',
            animationDuration: 300,
            gestureEnabled: true,
            gestureDirection: 'vertical',
            presentation: 'card',
          }}
        />

        {/* Streak: slide from bottom (immersive) */}
        <Stack.Screen
          name="streak"
          options={{
            animation: 'slide_from_bottom',
            animationDuration: 350,
            gestureEnabled: true,
            gestureDirection: 'vertical',
            presentation: 'card',
          }}
        />

        {/* Standalone messages: push */}
        <Stack.Screen
          name="messages"
          options={{
            animation: defaultTransition,
            animationDuration: 250,
            gestureEnabled: true,
          }}
        />
      </Stack>
    </>
  );
}
