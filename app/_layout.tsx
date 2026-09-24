// app/_layout.tsx – Root layout with custom fonts, safe areas & providers
import "../global.css";
import React, { useEffect } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import * as SplashScreen from "expo-splash-screen";
import {
  useFonts,
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
} from "@expo-google-fonts/plus-jakarta-sans";
import { apiClient } from "../lib/apiClient";
import { useAuthStore } from "../store/authStore";

// Keep splash screen visible while loading fonts
SplashScreen.preventAutoHideAsync().catch(() => {});

// Restore the persisted JWT on startup and re-validate it against the server.
async function restoreSession() {
  try {
    const token = await apiClient.restoreToken();
    if (!token) return;
    const res = await apiClient.verifyToken(); // clears token if invalid/expired
    if (res?.user) {
      const u = res.user;
      useAuthStore.setState({
        token,
        isAuthenticated: true,
        user: {
          id: u.id,
          name: u.full_name || u.name || u.email,
          email: u.email,
          phone: u.phone_number || u.phone || "",
          totalPoints: 0,
          monthlyEarned: 0,
          expiringSoon: 0,
        },
      });
    }
  } catch {
    // Non-fatal: user simply starts unauthenticated
  }
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 mins
      retry: 1,
    },
  },
});

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    "PlusJakartaSans-Regular": PlusJakartaSans_400Regular,
    "PlusJakartaSans-Medium": PlusJakartaSans_500Medium,
    "PlusJakartaSans-SemiBold": PlusJakartaSans_600SemiBold,
    "PlusJakartaSans-Bold": PlusJakartaSans_700Bold,
    "PlusJakartaSans-ExtraBold": PlusJakartaSans_800ExtraBold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded, fontError]);

  // Re-validate persisted session on every cold start
  useEffect(() => {
    restoreSession();
  }, []);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: "#F5FEFF" },
            animation: "slide_from_right",
          }}
        >
          <Stack.Screen name="index" />
          <Stack.Screen name="onboarding" />
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="category/index" />
          <Stack.Screen name="category/[id]" />
          <Stack.Screen name="search" />
          <Stack.Screen name="notifications" />
          <Stack.Screen name="settings/profile-settings" />
          <Stack.Screen name="settings/notification-settings" />
          <Stack.Screen name="settings/delete-account" />
          <Stack.Screen name="legal/privacy" />
        </Stack>
        <StatusBar style="dark" />
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
