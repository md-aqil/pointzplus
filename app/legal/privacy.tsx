// app/legal/privacy.tsx – Privacy Policy and Terms & Conditions matching Penpot Design
import React from "react";
import { View, Text, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { ShieldCheck, Lock } from "lucide-react-native";
import { ScreenHeader } from "../../components/ui/ScreenHeader";

export default function PrivacyPolicyScreen() {
  const router = useRouter();

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-light-bg">
      <ScreenHeader
        title="Privacy & Policy"
        onBack={() => router.back()}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 60 }}
        className="px-5 pt-2"
      >
        {/* Last updated badge */}
        <View className="flex-row items-center mb-4">
          <View className="bg-ice px-3 py-1 rounded-full border border-border-blue">
            <Text
              style={{ fontFamily: "PlusJakartaSans-SemiBold" }}
              className="text-[11px] text-primary-dark"
            >
              Last Update: 10/06/2026
            </Text>
          </View>
        </View>

        {/* Card 1: Terms & Conditions */}
        <View className="bg-white p-5 rounded-3xl border border-border-light shadow-sm mb-4">
          <View className="flex-row items-center mb-3">
            <View className="w-8 h-8 rounded-xl bg-ice items-center justify-center mr-2.5 border border-border-blue">
              <ShieldCheck size={16} color="#01A2FB" />
            </View>
            <Text
              style={{ fontFamily: "PlusJakartaSans-Bold" }}
              className="text-base text-dark"
            >
              Terms & Conditions
            </Text>
          </View>

          <Text
            style={{ fontFamily: "PlusJakartaSans-Regular" }}
            className="text-xs text-dark-muted leading-relaxed mb-3"
          >
            By creating an account or accessing PointzPlus, you agree to comply with
            these terms of service. PointzPlus acts as a multi-program rewards aggregator
            allowing you to track, monitor, and optimize points earned across third-party
            loyalty accounts.
          </Text>

          <Text
            style={{ fontFamily: "PlusJakartaSans-Regular" }}
            className="text-xs text-dark-muted leading-relaxed"
          >
            All loyalty program marks, balances, and redemption terms remain under the
            exclusive governance of their respective issuing brands (airlines, hotel
            chains, telecom providers).
          </Text>
        </View>

        {/* Card 2: Privacy & Data Security */}
        <View className="bg-white p-5 rounded-3xl border border-border-light shadow-sm mb-4">
          <View className="flex-row items-center mb-3">
            <View className="w-8 h-8 rounded-xl bg-ice items-center justify-center mr-2.5 border border-border-blue">
              <Lock size={16} color="#02EFF4" />
            </View>
            <Text
              style={{ fontFamily: "PlusJakartaSans-Bold" }}
              className="text-base text-dark"
            >
              Privacy Policy & Encryption
            </Text>
          </View>

          <Text
            style={{ fontFamily: "PlusJakartaSans-Regular" }}
            className="text-xs text-dark-muted leading-relaxed mb-3"
          >
            We take your privacy seriously. Your personal information, account
            identifiers, and loyalty credentials are encrypted in transit with TLS 1.3
            and stored securely in our private database with zero third-party data sharing.
          </Text>

          <Text
            style={{ fontFamily: "PlusJakartaSans-Regular" }}
            className="text-xs text-dark-muted leading-relaxed"
          >
            You can request complete data export or immediate permanent deletion of
            your account and associated historical points data directly from Profile
            Settings.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
