// app/_layout.tsx – Root layout with custom fonts, safe areas & providers
import "../global.css";
import React, { useEffect, useRef } from "react";
import { View, Platform, useWindowDimensions } from "react-native";
import { Stack, useRouter } from "expo-router";
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
import {
  checkAndTriggerExpiryAlerts,
  registerForPushNotifications,
  setupNotificationResponseHandler,
} from "../services/pushNotifications";

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
  const { width } = useWindowDimensions();
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

  const router = useRouter();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const pushInitialized = useRef(false);

  // Re-validate persisted session on every cold start
  useEffect(() => {
    restoreSession();
  }, []);

  // Register device push only after authentication is confirmed. Physical
  // devices are required for Expo push tokens; local notifications remain
  // available in simulators and Expo Go.
  useEffect(() => {
    if (!isAuthenticated) {
      pushInitialized.current = false;
      return;
    }
    if (pushInitialized.current) return;
    pushInitialized.current = true;
    registerForPushNotifications()
      .then(() => checkAndTriggerExpiryAlerts())
      .catch(() => {
        // Push permission and device services are best-effort; the app still works.
        pushInitialized.current = false;
      });
  }, [isAuthenticated]);

  // Notification taps (including a cold start launched by a tap) open the
  // alerts screen, once the user is actually signed in.
  useEffect(() => {
    const subscription = setupNotificationResponseHandler((data) => {
      if (!data?.type) return;
      if (!useAuthStore.getState().isAuthenticated) return;
      router.push("/notifications");
    });
    return () => subscription.remove();
  }, [router]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  const stackContent = (
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
  );

  const isDesktopWeb = Platform.OS === "web" && width > 500;

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        {Platform.OS === "web" ? (
          isDesktopWeb ? (
            <View
              style={{
                position: "fixed" as any,
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                height: "100vh" as any,
                width: "100vw" as any,
                backgroundColor: "#070617",
                alignItems: "center",
                justifyContent: "center",
                overflow: "hidden",
              }}
            >
              <View
                style={{
                  width: "100%",
                  maxWidth: 393,
                  height: "100%",
                  maxHeight: "min(852px, 100dvh)" as any,
                  backgroundColor: "#F5FEFF",
                  shadowColor: "#000000",
                  shadowOffset: { width: 0, height: 10 },
                  shadowOpacity: 0.35,
                  shadowRadius: 25,
                  overflow: "hidden",
                  position: "relative",
                  display: "flex" as any,
                  flexDirection: "column",
                }}
              >
                {stackContent}
              </View>
            </View>
          ) : (
            <View
              style={{
                flex: 1,
                width: "100%",
                height: "100%",
                minHeight: "100dvh" as any,
                backgroundColor: "#F5FEFF",
                display: "flex" as any,
                flexDirection: "column",
              }}
            >
              {stackContent}
            </View>
          )
        ) : (
          stackContent
        )}
        <StatusBar style="dark" />
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}

