// app/email-sync.tsx – Google Gmail OAuth Auto-Sync Screen
import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  ArrowLeft,
  Mail,
  ShieldCheck,
  RefreshCw,
  CheckCircle2,
  Lock,
  Zap,
} from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { usePoints } from "../hooks/usePoints";
import { useAuth } from "../hooks/useAuth";

export default function EmailSyncScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { emailAccounts, syncEmail, isSyncing, syncProgress, expiringCoupons, activeCoupons } = usePoints();
  const [syncSuccessModal, setSyncSuccessModal] = useState(false);
  const [syncedCount, setSyncedCount] = useState(0);
  const [couponCount, setCouponCount] = useState(0);

  const gmailAccount = emailAccounts.find((e) => e.provider === "gmail");

  const handleStartSync = async (email: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const results = await syncEmail("gmail", email);
      setSyncedCount(results.length);
      // coupons should already be fetched/updated into Zustand
      setCouponCount(activeCoupons.length);
      setSyncSuccessModal(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {
      alert("Failed to extract data from Gmail. Please try again.");
    }
  };

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-light-bg">
      {/* Header */}
      <View className="px-5 py-3 flex-row items-center justify-between border-b border-border-light bg-white">
        <TouchableOpacity
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.back();
          }}
          className="w-10 h-10 rounded-full bg-light-bg items-center justify-center"
        >
          <ArrowLeft size={20} color="#070617" />
        </TouchableOpacity>

        <Text
          style={{ fontFamily: "PlusJakartaSans-Bold" }}
          className="text-lg text-dark"
        >
          Gmail Auto-Sync
        </Text>

        <View className="w-10" />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 60 }}
        className="px-5 pt-4"
      >
        {/* Value Proposition Hero Banner */}
        <View className="bg-dark rounded-3xl p-5 mb-5 overflow-hidden relative shadow-md">
          <View className="flex-row items-center mb-2">
            <View className="w-8 h-8 rounded-full bg-primary/20 items-center justify-center mr-2">
              <Zap size={16} color="#02EFF4" />
            </View>
            <Text
              style={{ fontFamily: "PlusJakartaSans-Bold" }}
              className="text-xs text-primary uppercase tracking-wider"
            >
              Automated Gmail Extraction
            </Text>
          </View>

          <Text
            style={{ fontFamily: "PlusJakartaSans-Bold" }}
            className="text-xl text-white mb-2 leading-6"
          >
            Auto-Detect Points from Statements & Receipts
          </Text>

          <Text
            style={{ fontFamily: "PlusJakartaSans-Regular" }}
            className="text-xs text-white/70 leading-4 mb-4"
          >
            Connect your Gmail via Google OAuth. PointzPlus automatically scans for official e-statements from airlines, hotels, banking rewards & retail brands to keep your portfolio up to date.
          </Text>

          <View className="flex-row items-center bg-white/10 px-3 py-2 rounded-xl">
            <Lock size={14} color="#02EFF4" />
            <Text
              style={{ fontFamily: "PlusJakartaSans-Medium" }}
              className="text-[11px] text-white/90 ml-2"
            >
              Read-only statement access. Personal emails are never read.
            </Text>
          </View>
        </View>

        {/* Sync Status / Live Progress Card if Syncing */}
        {isSyncing && (
          <View className="bg-white rounded-2xl p-4 mb-5 border border-primary/40 shadow-sm">
            <View className="flex-row items-center justify-between mb-3">
              <View className="flex-row items-center">
                <ActivityIndicator size="small" color="#01A2FB" className="mr-2" />
                <Text
                  style={{ fontFamily: "PlusJakartaSans-Bold" }}
                  className="text-sm text-dark"
                >
                  Syncing Gmail Statements...
                </Text>
              </View>
              <Text
                style={{ fontFamily: "PlusJakartaSans-Bold" }}
                className="text-xs text-primary-dark"
              >
                {syncProgress.percent}%
              </Text>
            </View>

            {/* Progress Bar */}
            <View className="w-full bg-border-light h-2 rounded-full overflow-hidden mb-2">
              <View
                style={{ width: `${syncProgress.percent}%` }}
                className="bg-primary-dark h-full rounded-full"
              />
            </View>

            <Text
              style={{ fontFamily: "PlusJakartaSans-Medium" }}
              className="text-xs text-dark-muted"
            >
              {syncProgress.step}
            </Text>
          </View>
        )}

        {/* Gmail Connection Card */}
        <Text
          style={{ fontFamily: "PlusJakartaSans-Bold" }}
          className="text-sm text-dark uppercase tracking-wider mb-3 ml-1"
        >
          Gmail Mailbox
        </Text>

        <View className="bg-white rounded-2xl p-5 mb-5 border border-border-light shadow-sm">
          <View className="flex-row items-center justify-between mb-4">
            <View className="flex-row items-center">
              <View className="w-12 h-12 rounded-2xl bg-red-50 items-center justify-center mr-3 border border-red-100">
                <Text className="text-2xl">✉️</Text>
              </View>
              <View>
                <Text
                  style={{ fontFamily: "PlusJakartaSans-Bold" }}
                  className="text-base text-dark"
                >
                  Google Gmail
                </Text>
                <Text
                  style={{ fontFamily: "PlusJakartaSans-Regular" }}
                  className="text-xs text-dark-muted"
                >
                  {gmailAccount ? gmailAccount.email : "Connect your primary Gmail inbox"}
                </Text>
              </View>
            </View>

            {gmailAccount ? (
              <View className="bg-emerald-50 px-2.5 py-1 rounded-full flex-row items-center border border-emerald-200">
                <CheckCircle2 size={12} color="#059669" className="mr-1" />
                <Text
                  style={{ fontFamily: "PlusJakartaSans-Bold" }}
                  className="text-[10px] text-emerald-700 ml-1"
                >
                  Connected
                </Text>
              </View>
            ) : (
              <View className="bg-gray-100 px-2.5 py-1 rounded-full">
                <Text
                  style={{ fontFamily: "PlusJakartaSans-Medium" }}
                  className="text-[10px] text-dark-muted"
                >
                  Ready
                </Text>
              </View>
            )}
          </View>

          {gmailAccount && (
            <View className="bg-light-bg p-3.5 rounded-xl mb-4 flex-row items-center justify-between">
              <Text
                style={{ fontFamily: "PlusJakartaSans-Medium" }}
                className="text-xs text-dark-muted"
              >
                Extracted Programs
              </Text>
              <Text
                style={{ fontFamily: "PlusJakartaSans-Bold" }}
                className="text-xs text-dark"
              >
                {gmailAccount.programsFound} Active Programs
              </Text>
            </View>
          )}

          <TouchableOpacity
            onPress={() =>
              handleStartSync(
                gmailAccount?.email || user?.email || "user@gmail.com"
              )
            }
            disabled={isSyncing}
            className="w-full bg-primary-dark py-3.5 rounded-xl items-center flex-row justify-center shadow-sm"
          >
            {isSyncing ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <RefreshCw size={16} color="#FFFFFF" className="mr-2" />
                <Text
                  style={{ fontFamily: "PlusJakartaSans-Bold" }}
                  className="text-white text-sm ml-2"
                >
                  {gmailAccount ? "Rescan Gmail Statements Now" : "Connect & Extract from Gmail"}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Security / Privacy details */}
        <View className="bg-white rounded-2xl p-4 border border-border-light">
          <View className="flex-row items-center mb-2">
            <ShieldCheck size={18} color="#059669" className="mr-2" />
            <Text
              style={{ fontFamily: "PlusJakartaSans-Bold" }}
              className="text-sm text-dark ml-2"
            >
              How PointzPlus Protects Your Privacy
            </Text>
          </View>

          <Text
            style={{ fontFamily: "PlusJakartaSans-Regular" }}
            className="text-xs text-dark-muted leading-5 mb-1"
          >
            • PointzPlus uses Google OAuth with restricted read-only permissions.
            {"\n"}• Filtered exclusively for verified statement senders (e.g. airlines, hotels, banks).
            {"\n"}• Manual entries and unverified sources are completely omitted.
            {"\n"}• All extracted data is stored securely and processed locally.
          </Text>
        </View>
      </ScrollView>

      {/* Success Modal */}
      <Modal visible={syncSuccessModal} transparent animationType="fade">
        <View className="flex-1 bg-black/60 items-center justify-center px-6">
          <View className="bg-white w-full rounded-3xl p-6 items-center shadow-xl">
            <View className="w-16 h-16 rounded-full bg-emerald-100 items-center justify-center mb-4">
              <CheckCircle2 size={36} color="#059669" />
            </View>

            <Text
              style={{ fontFamily: "PlusJakartaSans-Bold" }}
              className="text-xl text-dark mb-1 text-center"
            >
              Gmail Sync Complete!
            </Text>

            <Text
              style={{ fontFamily: "PlusJakartaSans-Regular" }}
              className="text-xs text-dark-muted text-center mb-5"
            >
              Successfully scanned your Gmail statements and updated {syncedCount} loyalty programs.
              Extracted {couponCount} coupon tokens for quick redemption.
            </Text>

            <TouchableOpacity
              onPress={() => {
                setSyncSuccessModal(false);
                router.replace("/(tabs)/home");
              }}
              className="w-full bg-primary-dark py-3.5 rounded-2xl items-center shadow-sm"
            >
              <Text
                style={{ fontFamily: "PlusJakartaSans-Bold" }}
                className="text-white text-sm"
              >
                View Updated Dashboard
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
