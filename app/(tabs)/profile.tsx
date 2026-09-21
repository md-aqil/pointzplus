// app/(tabs)/profile.tsx – 100% exact Penpot Profile Hub screen
import React from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  User,
  Bell,
  Shield,
  LogOut,
  Trash2,
  ChevronRight,
  Mail,
  Plus,
} from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { ScreenHeader } from "../../components/ui/ScreenHeader";
import { useAuth } from "../../hooks/useAuth";
import { usePoints } from "../../hooks/usePoints";

export default function ProfileScreen() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const { emailAccounts, summary } = usePoints();

  const handleSignOut = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    Alert.alert("Sign Out", "Are you sure you want to sign out of PointzPlus?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          await signOut();
          router.replace("/(auth)/sign-in");
        },
      },
    ]);
  };

  const displayName = user?.name || (user?.email ? user.email.split("@")[0] : "Pointz User");
  const displayEmail = user?.email || "Not signed in";
  const displayPhone = user?.phone || "";

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-light-bg">
      <ScreenHeader title="Settings" showBack={false} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
        className="px-5 pt-2"
      >
        {/* Profile Card matching Penpot */}
        <View className="w-full bg-white rounded-3xl p-5 border border-border-light shadow-sm mb-5">
          <View className="flex-row items-center space-x-4">
            <View className="w-16 h-16 rounded-2xl bg-ice-dark items-center justify-center border border-border-blue mr-3">
              <User size={30} color="#070617" />
            </View>

            <View className="flex-1">
              <Text
                style={{ fontFamily: "PlusJakartaSans-Bold" }}
                className="text-lg text-dark mb-0.5"
              >
                {displayName}
              </Text>
              <Text
                style={{ fontFamily: "PlusJakartaSans-Regular" }}
                className="text-xs text-dark-muted mb-0.5"
              >
                {displayEmail}
              </Text>
              <Text
                style={{ fontFamily: "PlusJakartaSans-Medium" }}
                className="text-xs text-primary-dark"
              >
                {displayPhone}
              </Text>
            </View>
          </View>
        </View>

        {/* Linked Programs Summary Card */}
        <View className="bg-white rounded-3xl p-5 border border-border-light shadow-sm mb-5">
          <View className="flex-row items-center justify-between mb-3">
            <Text
              style={{ fontFamily: "PlusJakartaSans-Bold" }}
              className="text-base text-dark"
            >
              Loyalty Portfolio
            </Text>
            <View className="bg-primary/20 px-2.5 py-1.5 rounded-lg">
              <Text
                style={{ fontFamily: "PlusJakartaSans-Bold" }}
                className="text-xs text-primary-dark"
              >
                {summary.linkedAccountsCount} Active
              </Text>
            </View>
          </View>

          <View className="flex-row justify-between mb-3">
            <View>
              <Text
                style={{ fontFamily: "PlusJakartaSans-Medium" }}
                className="text-xs text-dark-muted mb-0.5"
              >
                Total Points
              </Text>
              <Text
                style={{ fontFamily: "PlusJakartaSans-Bold" }}
                className="text-2xl text-dark"
              >
                {summary.totalPoints.toLocaleString()}
              </Text>
            </View>

            <View className="items-end">
              <Text
                style={{ fontFamily: "PlusJakartaSans-Medium" }}
                className="text-xs text-dark-muted mb-0.5"
              >
                Est. Value
              </Text>
              <Text
                style={{ fontFamily: "PlusJakartaSans-Bold" }}
                className="text-2xl text-primary-dark"
              >
                ₹{summary.portfolioValueINR.toLocaleString()}
              </Text>
            </View>
          </View>

          <View className="flex-row gap-2">
            <TouchableOpacity
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                router.push("/add-account");
              }}
              className="flex-1 bg-light-bg py-2.5 rounded-xl flex-row items-center justify-center border border-border-light"
            >
              <Plus size={14} color="#01A2FB" className="mr-1.5" />
              <Text
                style={{ fontFamily: "PlusJakartaSans-Bold" }}
                className="text-xs text-primary-dark ml-1"
              >
                Add Program
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                router.push("/(tabs)/overview");
              }}
              className="flex-1 bg-primary-dark py-2.5 rounded-xl flex-row items-center justify-center"
            >
              <Text
                style={{ fontFamily: "PlusJakartaSans-Bold" }}
                className="text-xs text-white"
              >
                View Breakdown
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Data Sync Section */}
        <Text
          style={{ fontFamily: "PlusJakartaSans-Bold" }}
          className="text-sm text-dark uppercase tracking-wider mb-2 ml-1"
        >
          Data Sync & Integration
        </Text>

        <View className="bg-white rounded-3xl border border-border-light overflow-hidden shadow-sm mb-5">
          {/* Email Sync Status */}
          <TouchableOpacity
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push("/email-sync");
            }}
            activeOpacity={0.7}
            className="flex-row items-center justify-between p-4 border-b border-border-light/60"
          >
            <View className="flex-row items-center flex-1">
              <View
                className={`w-10 h-10 rounded-xl items-center justify-center mr-3 border ${
                  emailAccounts.length > 0
                    ? "bg-emerald-50 border-emerald-200"
                    : "bg-light-bg border-border-light"
                }`}
              >
                <Mail
                  size={18}
                  color={emailAccounts.length > 0 ? "#059669" : "#01A2FB"}
                />
              </View>
              <View className="flex-1">
                <Text
                  style={{ fontFamily: "PlusJakartaSans-Bold" }}
                  className="text-sm text-dark"
                >
                  Email Auto-Sync
                </Text>
                <Text
                  style={{ fontFamily: "PlusJakartaSans-Regular" }}
                  className="text-xs text-dark-muted"
                >
                  {emailAccounts.length > 0
                    ? `Connected via ${emailAccounts[0].provider}`
                    : "Not connected"}
                </Text>
              </View>
            </View>

            {emailAccounts.length > 0 && (
              <View className="bg-emerald-100 px-2 py-1 rounded-lg">
                <Text
                  style={{ fontFamily: "PlusJakartaSans-Bold" }}
                  className="text-[10px] text-emerald-700"
                >
                  Active
                </Text>
              </View>
            )}

            <ChevronRight
              size={18}
              color={emailAccounts.length > 0 ? "#059669" : "#9C9BA2"}
            />
          </TouchableOpacity>

          {/* Manual Add Programs */}
          <TouchableOpacity
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push("/add-account");
            }}
            activeOpacity={0.7}
            className="flex-row items-center justify-between p-4"
          >
            <View className="flex-row items-center flex-1">
              <View className="w-10 h-10 rounded-xl bg-light-bg items-center justify-center mr-3 border border-border-light">
                <Plus size={18} color="#070617" />
              </View>
              <View className="flex-1">
                <Text
                  style={{ fontFamily: "PlusJakartaSans-Bold" }}
                  className="text-sm text-dark"
                >
                  Manual Add Program
                </Text>
                <Text
                  style={{ fontFamily: "PlusJakartaSans-Regular" }}
                  className="text-xs text-dark-muted"
                >
                  Add programs manually or scan statements
                </Text>
              </View>
            </View>

            <ChevronRight size={18} color="#9C9BA2" />
          </TouchableOpacity>
        </View>

        {/* Settings Section */}
        <View className="bg-white rounded-3xl border border-border-light overflow-hidden shadow-sm mb-6">
          <TouchableOpacity
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push("/settings/profile-settings");
            }}
            activeOpacity={0.7}
            className="flex-row items-center justify-between p-4 border-b border-border-light/60"
          >
            <View className="flex-row items-center flex-1">
              <View className="w-10 h-10 rounded-xl bg-ice items-center justify-center mr-3 border border-border-blue">
                <User size={18} color="#01A2FB" />
              </View>
              <Text
                style={{ fontFamily: "PlusJakartaSans-SemiBold" }}
                className="text-sm text-dark"
              >
                Profile Settings
              </Text>
            </View>
            <ChevronRight size={18} color="#9C9BA2" />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push("/settings/notification-settings");
            }}
            activeOpacity={0.7}
            className="flex-row items-center justify-between p-4 border-b border-border-light/60"
          >
            <View className="flex-row items-center flex-1">
              <View className="w-10 h-10 rounded-xl bg-ice items-center justify-center mr-3 border border-border-blue">
                <Bell size={18} color="#9C4EBD" />
              </View>
              <Text
                style={{ fontFamily: "PlusJakartaSans-SemiBold" }}
                className="text-sm text-dark"
              >
                Notification & Sync Settings
              </Text>
            </View>
            <ChevronRight size={18} color="#9C9BA2" />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push("/legal/privacy");
            }}
            activeOpacity={0.7}
            className="flex-row items-center justify-between p-4"
          >
            <View className="flex-row items-center flex-1">
              <View className="w-10 h-10 rounded-xl bg-ice items-center justify-center mr-3 border border-border-blue">
                <Shield size={18} color="#02EFF4" />
              </View>
              <Text
                style={{ fontFamily: "PlusJakartaSans-SemiBold" }}
                className="text-sm text-dark"
              >
                Privacy & Policy
              </Text>
            </View>
            <ChevronRight size={18} color="#9C9BA2" />
          </TouchableOpacity>
        </View>

        {/* Sign Out & Delete Account Actions */}
        <View className="bg-white rounded-3xl border border-border-light overflow-hidden shadow-sm mb-6">
          <TouchableOpacity
            onPress={handleSignOut}
            activeOpacity={0.7}
            className="flex-row items-center justify-between p-4 border-b border-border-light/60"
          >
            <View className="flex-row items-center">
              <View className="w-10 h-10 rounded-xl bg-gray-50 items-center justify-center mr-3 border border-border-light">
                <LogOut size={18} color="#070617" />
              </View>
              <Text
                style={{ fontFamily: "PlusJakartaSans-SemiBold" }}
                className="text-sm text-dark"
              >
                Sign Out
              </Text>
            </View>
            <ChevronRight size={18} color="#9C9BA2" />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              router.push("/settings/delete-account");
            }}
            activeOpacity={0.7}
            className="flex-row items-center justify-between p-4"
          >
            <View className="flex-row items-center">
              <View className="w-10 h-10 rounded-xl bg-alert-bg items-center justify-center mr-3 border border-alert/20">
                <Trash2 size={18} color="#FF4343" />
              </View>
              <Text
                style={{ fontFamily: "PlusJakartaSans-SemiBold" }}
                className="text-sm text-alert"
              >
                Delete Account
              </Text>
            </View>
            <ChevronRight size={18} color="#FF4343" />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
