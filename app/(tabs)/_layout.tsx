import React, { useState } from "react";
import { Tabs } from "expo-router";
import { View, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import {
  HomeTabIcon,
  OverviewTabIcon,
  DealsTabIcon,
  ProfileTabIcon,
} from "../../components/ui/TabIcons";
import { AuthGateModal, AuthGateContext } from "../../components/ui/AuthGateModal";
import { useAuth } from "../../hooks/useAuth";

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const { isAuthenticated } = useAuth();
  const [authGateVisible, setAuthGateVisible] = useState(false);
  const [authGateContext, setAuthGateContext] = useState<AuthGateContext>("general");

  const bottomInset =
    insets.bottom > 0
      ? insets.bottom
      : Platform.OS === "ios"
      ? 20
      : 8;

  const tabHeight = Platform.select({
    ios: Math.max(80, 56 + bottomInset),
    android: Math.max(76, 64 + insets.bottom),
    web: 80,
    default: 80,
  });

  // Private tabs require authentication; intercept tabPress to present the AuthGateModal
  const createProtectedTabListener = (context: AuthGateContext) => ({
    tabPress: (e: any) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      if (!isAuthenticated) {
        e.preventDefault();
        setAuthGateContext(context);
        setAuthGateVisible(true);
      }
    },
  });

  // Public tab: Deals & Coupons are freely discoverable by guest users without authentication
  const createPublicTabListener = () => ({
    tabPress: () => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    },
  });

  return (
    <>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarShowLabel: true,
          tabBarActiveTintColor: "#00A3FF",
          tabBarInactiveTintColor: "#6A6A74",
          tabBarLabelStyle: {
            fontFamily: "PlusJakartaSans-Medium",
            fontSize: 11,
            marginTop: 2,
            marginBottom: 0,
          },
          tabBarItemStyle: {
            paddingVertical: 4,
            justifyContent: "center",
            alignItems: "center",
          },
          tabBarStyle: {
            backgroundColor: "#FFFFFF",
            borderTopWidth: 1,
            borderTopColor: "#E5E7EB",
            height: tabHeight,
            paddingTop: 8,
            paddingBottom: Platform.OS === "web" ? 10 : bottomInset,
            elevation: 8,
            shadowColor: "#000000",
            shadowOffset: { width: 0, height: -2 },
            shadowOpacity: 0.04,
            shadowRadius: 6,
          },
        }}
      >
        {/* Protected Tab: Home Dashboard */}
        <Tabs.Screen
          name="home"
          listeners={createProtectedTabListener("home")}
          options={{
            title: "Home",
            tabBarIcon: ({ color, focused }) => (
              <View style={{ alignItems: "center", justifyContent: "center" }}>
                <HomeTabIcon focused={focused} color={color} size={22} />
              </View>
            ),
          }}
        />

        {/* Protected Tab: Point Overview & Analytics */}
        <Tabs.Screen
          name="overview"
          listeners={createProtectedTabListener("overview")}
          options={{
            title: "Overview",
            tabBarIcon: ({ color, focused }) => (
              <View style={{ alignItems: "center", justifyContent: "center" }}>
                <OverviewTabIcon focused={focused} color={color} size={22} />
              </View>
            ),
          }}
        />

        {/* Public Tab: Deals, Coupons & Partner Offers (open to unauthenticated guests) */}
        <Tabs.Screen
          name="deals"
          listeners={createPublicTabListener()}
          options={{
            title: "Deals",
            tabBarIcon: ({ color, focused }) => (
              <View style={{ alignItems: "center", justifyContent: "center" }}>
                <DealsTabIcon focused={focused} color={color} size={22} />
              </View>
            ),
          }}
        />

        {/* Protected Tab: User Profile & Account Settings */}
        <Tabs.Screen
          name="profile"
          listeners={createProtectedTabListener("profile")}
          options={{
            title: "Profile",
            tabBarIcon: ({ color, focused }) => (
              <View style={{ alignItems: "center", justifyContent: "center" }}>
                <ProfileTabIcon focused={focused} color={color} size={22} />
              </View>
            ),
          }}
        />
      </Tabs>

      <AuthGateModal
        visible={authGateVisible}
        onClose={() => setAuthGateVisible(false)}
        context={authGateContext}
      />
    </>
  );
}
