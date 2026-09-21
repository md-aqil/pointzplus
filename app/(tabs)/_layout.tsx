// app/(tabs)/_layout.tsx – Bottom Tab Navigator matching exact Penpot & reference design
import React from "react";
import { Tabs } from "expo-router";
import { View, Platform } from "react-native";
import * as Haptics from "expo-haptics";
import {
  HomeTabIcon,
  OverviewTabIcon,
  DealsTabIcon,
  ProfileTabIcon,
} from "../../components/ui/TabIcons";

export default function TabLayout() {
  return (
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
          marginBottom: Platform.OS === "ios" ? 0 : 4,
        },
        tabBarStyle: {
          backgroundColor: "#FFFFFF",
          borderTopWidth: 1,
          borderTopColor: "#E5E7EB",
          height: Platform.OS === "ios" ? 82 : 64,
          paddingTop: 6,
          paddingBottom: Platform.OS === "ios" ? 22 : 6,
          elevation: 8,
          shadowColor: "#000000",
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.04,
          shadowRadius: 6,
        },
      }}
      screenListeners={{
        tabPress: () => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: "Home",
          tabBarIcon: ({ color, focused }) => (
            <View style={{ alignItems: "center", justifyContent: "center" }}>
              <HomeTabIcon focused={focused} color={color} size={22} />
            </View>
          ),
        }}
      />

      <Tabs.Screen
        name="overview"
        options={{
          title: "Overview",
          tabBarIcon: ({ color, focused }) => (
            <View style={{ alignItems: "center", justifyContent: "center" }}>
              <OverviewTabIcon focused={focused} color={color} size={22} />
            </View>
          ),
        }}
      />

      <Tabs.Screen
        name="deals"
        options={{
          title: "Deals",
          tabBarIcon: ({ color, focused }) => (
            <View style={{ alignItems: "center", justifyContent: "center" }}>
              <DealsTabIcon focused={focused} color={color} size={22} />
            </View>
          ),
        }}
      />

      <Tabs.Screen
        name="profile"
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
  );
}
