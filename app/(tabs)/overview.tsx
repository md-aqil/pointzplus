// app/(tabs)/overview.tsx – Point Overview & Breakdown with 100% Dynamic Real Data
import React, { useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Bell, ChevronRight, Mail, RefreshCw } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { ScreenHeader } from "../../components/ui/ScreenHeader";
import { PointsDonutChart, ChartSegment } from "../../components/charts/PointsDonutChart";
import { usePoints } from "../../hooks/usePoints";

const CATEGORY_PALETTE: Record<string, string> = {
  banking: "#00A3FF", // Electric Azure Blue
  airlines: "#9C4EBD", // Purple / Violet
  shopping: "#02EFF4", // Vivid Cyan
  hotels: "#30004C", // Deep Midnight Indigo
  fuel: "#F59E0B", // Amber Gold
  dining: "#EF4444", // Crimson Coral
  telecom: "#10B981", // Emerald Green
  entertainment: "#EC4899", // Magenta Pink
  health: "#8B5CF6", // Violet
};

export default function OverviewScreen() {
  const router = useRouter();
  const { summary, categories, isSyncing, refreshAll } = usePoints();

  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  // Compute dynamic segments from real categories
  const segments: ChartSegment[] = categories
    .filter((cat) => (cat.totalPoints || 0) > 0)
    .map((cat, idx) => {
      const catColor =
        CATEGORY_PALETTE[cat.categoryId] ||
        cat.accentColor ||
        ["#00A3FF", "#9C4EBD", "#02EFF4", "#30004C"][idx % 4];

      const percentage =
        summary.totalPoints > 0
          ? Math.round((cat.totalPoints / summary.totalPoints) * 100)
          : 0;

      return {
        id: cat.categoryId,
        label: cat.categoryName,
        value: cat.totalPoints,
        percentage,
        color: catColor,
      };
    });

  const totalDisplay = summary.totalPoints;
  const redeemedDisplay = summary.monthlyRedeemed || 0;

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-white">
      {/* Centered Header with Notification Bell */}
      <ScreenHeader
        title="Point Overview"
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
        contentContainerStyle={{ paddingBottom: 110 }}
        className="px-5 pt-2"
      >
        {/* Section Heading: Points Overview */}
        <Text
          style={{ fontFamily: "PlusJakartaSans-Bold" }}
          className="text-[16px] text-[#111019] font-bold mb-3 ml-0.5"
        >
          Points Overview
        </Text>

        {/* Top Summary Card (Total number & Redeem this month) */}
        <View className="w-full bg-[#F0FAFE] border border-[#DCF0FA] rounded-2xl p-4.5 flex-row justify-between mb-5 shadow-sm">
          <View>
            <Text
              style={{ fontFamily: "PlusJakartaSans-Bold" }}
              className="text-[22px] text-[#111019] font-bold tracking-tight mb-0.5"
            >
              {totalDisplay.toLocaleString()}
            </Text>
            <Text
              style={{ fontFamily: "PlusJakartaSans-Regular" }}
              className="text-[12.5px] text-[#7E7D8A]"
            >
              Total number
            </Text>
          </View>

          <View className="items-end">
            <Text
              style={{ fontFamily: "PlusJakartaSans-Bold" }}
              className="text-[22px] text-[#111019] font-bold tracking-tight mb-0.5"
            >
              {redeemedDisplay.toLocaleString()}
            </Text>
            <Text
              style={{ fontFamily: "PlusJakartaSans-Regular" }}
              className="text-[12.5px] text-[#7E7D8A]"
            >
              Redeem this month
            </Text>
          </View>
        </View>

        {/* Breakdown Card */}
        <View className="w-full bg-[#F4FBFE] border border-[#E0F3FB] rounded-3xl p-5 mb-6 shadow-sm">
          <View className="flex-row items-center justify-between mb-2">
            <Text
              style={{ fontFamily: "PlusJakartaSans-Bold" }}
              className="text-[16px] text-[#111019] font-bold"
            >
              Breakdown
            </Text>
            {isSyncing && <ActivityIndicator size="small" color="#00A3FF" />}
          </View>

          {/* SVG Donut Chart with Floating Badges & Center Count */}
          <View className="items-center justify-center my-3">
            <PointsDonutChart
              segments={segments}
              totalPoints={totalDisplay}
              size={270}
            />
          </View>

          {/* Category Rows Legend or Empty State */}
          {segments.length > 0 ? (
            <View className="mt-4 pt-2">
              {segments.map((item, idx) => (
                <TouchableOpacity
                  key={item.id}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    router.push(`/category/${item.id}`);
                  }}
                  activeOpacity={0.7}
                  className={`flex-row items-center justify-between py-3.5 ${
                    idx !== segments.length - 1 ? "border-b border-[#E8F4FA]" : ""
                  }`}
                >
                  {/* Left side: color dot, title, percentage */}
                  <View className="flex-row items-center flex-1 pr-2">
                    <View
                      style={{ backgroundColor: item.color }}
                      className="w-2.5 h-2.5 rounded-full mr-3"
                    />
                    <Text
                      style={{ fontFamily: "PlusJakartaSans-Medium" }}
                      className="text-[14px] text-[#35343E]"
                    >
                      {item.label}
                    </Text>
                    <Text
                      style={{ fontFamily: "PlusJakartaSans-Regular" }}
                      className="text-[13px] text-[#7E7D8A] ml-2.5"
                    >
                      {item.percentage}%
                    </Text>
                  </View>

                  {/* Right side: points count & chevron */}
                  <View className="flex-row items-center">
                    <Text
                      style={{ fontFamily: "PlusJakartaSans-Bold" }}
                      className="text-[15.5px] text-[#111019] font-bold mr-2"
                    >
                      {item.value.toLocaleString()}
                    </Text>
                    <ChevronRight size={16} strokeWidth={1.8} color="#5E5D6A" />
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <View className="mt-4 pt-2 items-center text-center">
              <Text
                style={{ fontFamily: "PlusJakartaSans-Regular" }}
                className="text-xs text-[#7E7D8A] text-center mb-3"
              >
                No loyalty statements scanned yet. Sync your email to automatically extract reward points.
              </Text>
              <TouchableOpacity
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  router.push("/email-sync");
                }}
                activeOpacity={0.88}
                className="bg-[#00A3FF] px-5 py-2.5 rounded-xl flex-row items-center shadow-sm"
              >
                <Mail size={14} color="#FFFFFF" className="mr-1.5" />
                <Text
                  style={{ fontFamily: "PlusJakartaSans-Bold" }}
                  className="text-xs text-white font-bold ml-1"
                >
                  Sync Gmail Statements
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
