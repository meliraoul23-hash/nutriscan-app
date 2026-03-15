// Root Layout - Wraps entire app with providers
import React from 'react';
import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from '../src/contexts/AuthContext';
import { AppProvider } from '../src/contexts/AppContext';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <AppProvider>
          <StatusBar style="dark" />
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="scanner" options={{ headerShown: false, presentation: 'fullScreenModal' }} />
            <Stack.Screen name="product" options={{ headerShown: false }} />
            <Stack.Screen name="auth" options={{ headerShown: false, presentation: 'modal' }} />
            <Stack.Screen name="premium" options={{ headerShown: false, presentation: 'modal' }} />
            <Stack.Screen name="premium-onboarding" options={{ headerShown: false }} />
            <Stack.Screen name="progress" options={{ headerShown: false }} />
            <Stack.Screen name="coach" options={{ headerShown: false }} />
            <Stack.Screen name="menu" options={{ headerShown: false }} />
            <Stack.Screen name="goals" options={{ headerShown: false }} />
            <Stack.Screen name="exercises" options={{ headerShown: false }} />
            <Stack.Screen name="favorites" options={{ headerShown: false }} />
            <Stack.Screen name="compare" options={{ headerShown: false }} />
            <Stack.Screen name="recipe" options={{ headerShown: false }} />
            <Stack.Screen name="recipes" options={{ headerShown: false }} />
          </Stack>
        </AppProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
