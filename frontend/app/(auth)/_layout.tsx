import React from 'react';
import { Stack } from 'expo-router';
import { useTheme } from '../../src/hooks/useTheme';

export default function AuthLayout() {
  const theme = useTheme();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: theme.background },
        animation: 'slide_from_right',
        animationDuration: 250,
        gestureEnabled: true,
        gestureDirection: 'horizontal',
      }}
    >
      <Stack.Screen
        name="login"
        options={{
          animation: 'fade',
          animationDuration: 300,
        }}
      />
      <Stack.Screen
        name="register"
        options={{
          animation: 'slide_from_right',
          animationDuration: 250,
        }}
      />
    </Stack>
  );
}
