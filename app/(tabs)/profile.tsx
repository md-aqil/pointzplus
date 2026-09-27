// app/(tabs)/profile.tsx – Profile Hub with balanced, calibrated list spacing
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
  FileText,
  LogOut,
  Trash2,
  ChevronRight,
  Pencil,
  Mail,
  CheckCircle2,
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

  const displayName = user?.name || "md aqil";
  const displayEmail = user?.email || "aqilali381@gmail.com";
  const displayPhone = user?.phone || "+919041226707";

  const connectedGmail =
    emailAccounts.find((a) => a.provider === "gmail" && a.status === "connected") ||
    emailAccounts[0];

  const isConnected = Boolean(connectedGmail);
  const hasPoints = summary.totalPoints > 0;

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-white">
      {/* Header */}
      <ScreenHeader
        title="Settings"
        showBack={false}
        rightAction={
          <TouchableOpacity
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push("/notifications");
            }}
            activeOpacity={0.7}
            className="w-11 h-11 rounded-2xl bg-[#EBF7FC] items-center justify-center"
          >
            <Bell size={18} color="#111019" />
          </TouchableOpacity>
        }
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
        className="px-5 pt-2"
      >
        {/* 1. User Profile Card */}
        <TouchableOpacity
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push("/settings/profile-settings");
          }}
          activeOpacity={0.85}
          className="w-full bg-[#F0FAFE] border border-[#DCF0FA] rounded-2xl p-4 flex-row items-center justify-between mb-5 shadow-sm"
        >
          <View className="flex-row items-center flex-1 pr-3">
            <View className="w-12 h-12 rounded-full overflow-hidden bg-sky-200 mr-3.5 border-2 border-white items-center justify-center">
              <User size={24} color="#00A3FF" />
            </View>

            <View className="flex-1 justify-center">
              <Text
                style={{ fontFamily: "PlusJakartaSans-Bold" }}
                className="text-[17px] text-[#111019] font-bold mb-0.5 tracking-tight"
                numberOfLines={1}
              >
                {displayName}
              </Text>
              <Text
                style={{ fontFamily: "PlusJakartaSans-Regular" }}
                className="text-[12.5px] text-[#7E7D8A] mb-0.5"
                numberOfLines={1}
              >
                {displayEmail}
              </Text>
              <Text
                style={{ fontFamily: "PlusJakartaSans-Medium" }}
                className="text-[12px] text-[#00A3FF]"
                numberOfLines={1}
              >
                {displayPhone}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push("/settings/profile-settings");
            }}
            activeOpacity={0.7}
            className="p-1.5"
          >
            <Pencil size={18} color="#21202A" />
          </TouchableOpacity>
        </TouchableOpacity>

        {/* 2. Unified Loyalty & Email Sync Single Card */}
        <View className="bg-white rounded-2xl p-4 border border-[#E6E7ED] shadow-sm mb-6">
          {/* Card Header with Connected Status Badge */}
          <View className="flex-row items-center justify-between mb-3">
            <Text
              style={{ fontFamily: "PlusJakartaSans-Bold" }}
              className="text-[15px] text-[#111019] font-bold"
            >
              Loyalty Portfolio
            </Text>

            {hasPoints ? (
              <View className="bg-[#DCFCE7] px-2.5 py-1 rounded-full flex-row items-center border border-emerald-200">
                <CheckCircle2 size={11} color="#16A34A" className="mr-1" />
                <Text
                  style={{ fontFamily: "PlusJakartaSans-Bold" }}
                  className="text-[10.5px] text-[#16A34A]"
                >
                  {summary.linkedAccountsCount} Active
                </Text>
              </View>
            ) : isConnected ? (
              <View className="bg-[#DCFCE7] px-2.5 py-1 rounded-full flex-row items-center border border-emerald-200">
                <CheckCircle2 size={11} color="#16A34A" className="mr-1" />
                <Text
                  style={{ fontFamily: "PlusJakartaSans-Bold" }}
                  className="text-[10.5px] text-[#16A34A]"
                >
                  Connected
                </Text>
              </View>
            ) : (
              <View className="bg-[#EBF7FC] px-2.5 py-1 rounded-full border border-[#D0EEFA]">
                <Text
                  style={{ fontFamily: "PlusJakartaSans-Bold" }}
                  className="text-[10.5px] text-[#00A3FF]"
                >
                  0 Linked
                </Text>
              </View>
            )}
          </View>

          {/* Metrics Box */}
          <View className="flex-row justify-between mb-3 bg-[#F8F9FB] p-3.5 rounded-xl border border-[#F0F1F5]">
            <View>
              <Text
                style={{ fontFamily: "PlusJakartaSans-Medium" }}
                className="text-[11.5px] text-[#7E7D8A] mb-0.5"
              >
                Total Points
              </Text>
              <Text
                style={{ fontFamily: "PlusJakartaSans-Bold" }}
                className="text-[22px] text-[#111019] tracking-tight"
              >
                {summary.totalPoints.toLocaleString()}
              </Text>
            </View>

            <View className="items-end">
              <Text
                style={{ fontFamily: "PlusJakartaSans-Medium" }}
                className="text-[11.5px] text-[#7E7D8A] mb-0.5"
              >
                Est. Value
              </Text>
              <Text
                style={{ fontFamily: "PlusJakartaSans-Bold" }}
                className="text-[22px] text-[#00A3FF] tracking-tight"
              >
                ₹{summary.portfolioValueINR.toLocaleString()}
              </Text>
            </View>
          </View>

          {/* Action Buttons */}
          {isConnected ? (
            <View className="flex-row gap-2.5 mb-3">
              <TouchableOpacity
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  router.push("/email-sync");
                }}
                activeOpacity={0.8}
                className="flex-1 bg-[#F0FAFE] py-3 rounded-xl flex-row items-center justify-center border border-[#DCF0FA]"
              >
                <Mail size={15} color="#00A3FF" className="mr-1.5" />
                <Text
                  style={{ fontFamily: "PlusJakartaSans-Bold" }}
                  className="text-[12.5px] text-[#00A3FF] ml-1 font-bold"
                >
                  Sync Gmail
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  router.push("/(tabs)/overview");
                }}
                activeOpacity={0.88}
                className="flex-1 bg-[#00A3FF] py-3 rounded-xl flex-row items-center justify-center shadow-sm"
              >
                <Text
                  style={{ fontFamily: "PlusJakartaSans-Bold" }}
                  className="text-[12.5px] text-white font-bold"
                >
                  View Breakdown
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View className="mb-3">
              <TouchableOpacity
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  router.push("/email-sync");
                }}
                activeOpacity={0.88}
                className="w-full bg-[#00A3FF] py-3.5 rounded-xl flex-row items-center justify-center shadow-sm"
              >
                <Mail size={16} color="#FFFFFF" className="mr-2" />
                <Text
                  style={{ fontFamily: "PlusJakartaSans-Bold" }}
                  className="text-[13px] text-white font-bold"
                >
                  Sync Gmail
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Integrated Email Statement Sync Strip */}
          <TouchableOpacity
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push("/email-sync");
            }}
            activeOpacity={0.7}
            className="flex-row items-center justify-between pt-2.5 border-t border-[#F0F1F5]"
          >
            <View className="flex-row items-center flex-1 mr-2">
              <Mail size={13} color={isConnected ? "#16A34A" : "#7E7D8A"} className="mr-1.5" />
              <Text
                style={{ fontFamily: "PlusJakartaSans-Medium" }}
                className="text-[11.5px] text-[#7E7D8A] flex-1"
                numberOfLines={1}
              >
                {isConnected
                  ? `Synced with ${connectedGmail.email}`
                  : "Auto-extract points from Gmail statements"}
              </Text>
            </View>

            <View className="flex-row items-center">
              <Text
                style={{ fontFamily: "PlusJakartaSans-Bold" }}
                className="text-[11.5px] text-[#00A3FF] mr-0.5"
              >
                {isConnected ? "Manage" : "Connect"}
              </Text>
              <ChevronRight size={13} color="#00A3FF" />
            </View>
          </TouchableOpacity>
        </View>

        {/* 3. Manage Account Section Header */}
        <Text
          style={{ fontFamily: "PlusJakartaSans-Bold" }}
          className="text-[16px] text-[#111019] font-bold mb-1 ml-0.5"
        >
          Manage Account
        </Text>

        {/* 4. Menu Items List with Clean Calibrated Spacing (py-5) */}
        <View className="w-full bg-white mb-6">
          {/* Profile Settings */}
          <TouchableOpacity
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push("/settings/profile-settings");
            }}
            activeOpacity={0.65}
            className="flex-row items-center justify-between py-5 border-b border-[#F0F0F4]"
          >
            <View className="flex-row items-center flex-1 pr-2">
              <User size={20} strokeWidth={1.8} color="#5E5D6A" />
              <Text
                style={{ fontFamily: "PlusJakartaSans-Medium" }}
                className="text-[15px] text-[#35343E] ml-4"
              >
                Profile Settings
              </Text>
            </View>
            <ChevronRight size={18} strokeWidth={1.8} color="#9E9DA8" />
          </TouchableOpacity>

          {/* Notification & Sync Settings */}
          <TouchableOpacity
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push("/settings/notification-settings");
            }}
            activeOpacity={0.65}
            className="flex-row items-center justify-between py-5 border-b border-[#F0F0F4]"
          >
            <View className="flex-row items-center flex-1 pr-2">
              <Bell size={20} strokeWidth={1.8} color="#5E5D6A" />
              <Text
                style={{ fontFamily: "PlusJakartaSans-Medium" }}
                className="text-[15px] text-[#35343E] ml-4"
              >
                Notification & Sync Settings
              </Text>
            </View>
            <ChevronRight size={18} strokeWidth={1.8} color="#9E9DA8" />
          </TouchableOpacity>

          {/* Privacy & Policy */}
          <TouchableOpacity
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push("/legal/privacy");
            }}
            activeOpacity={0.65}
            className="flex-row items-center justify-between py-5 border-b border-[#F0F0F4]"
          >
            <View className="flex-row items-center flex-1 pr-2">
              <FileText size={20} strokeWidth={1.8} color="#5E5D6A" />
              <Text
                style={{ fontFamily: "PlusJakartaSans-Medium" }}
                className="text-[15px] text-[#35343E] ml-4"
              >
                Privacy & Policy
              </Text>
            </View>
            <ChevronRight size={18} strokeWidth={1.8} color="#9E9DA8" />
          </TouchableOpacity>

          {/* Delete Account */}
          <TouchableOpacity
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              router.push("/settings/delete-account");
            }}
            activeOpacity={0.65}
            className="flex-row items-center justify-between py-5 border-b border-[#F0F0F4]"
          >
            <View className="flex-row items-center flex-1 pr-2">
              <Trash2 size={20} strokeWidth={1.8} color="#5E5D6A" />
              <Text
                style={{ fontFamily: "PlusJakartaSans-Medium" }}
                className="text-[15px] text-[#35343E] ml-4"
              >
                Delete Account
              </Text>
            </View>
            <ChevronRight size={18} strokeWidth={1.8} color="#9E9DA8" />
          </TouchableOpacity>

          {/* Sign Out */}
          <TouchableOpacity
            onPress={handleSignOut}
            activeOpacity={0.65}
            className="flex-row items-center justify-between py-5"
          >
            <View className="flex-row items-center flex-1 pr-2">
              <LogOut size={20} strokeWidth={1.8} color="#5E5D6A" />
              <Text
                style={{ fontFamily: "PlusJakartaSans-Medium" }}
                className="text-[15px] text-[#35343E] ml-4"
              >
                Sign Out
              </Text>
            </View>
            <ChevronRight size={18} strokeWidth={1.8} color="#9E9DA8" />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
