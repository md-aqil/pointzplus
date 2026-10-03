import React, { useEffect, useState, useMemo, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Bell,
  ChevronRight,
  Mail,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
  AlertTriangle,
  Zap,
  CheckCircle2,
} from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { DashboardTopBg } from "../../components/ui/DashboardTopBg";
import { PointsDonutChart, ChartSegment } from "../../components/charts/PointsDonutChart";
import { AuthRequiredView } from "../../components/ui/AuthRequiredView";
import { usePoints } from "../../hooks/usePoints";
import { useAuth } from "../../hooks/useAuth";
import { getCategoryIconComponent } from "../../constants/popularPrograms";

interface CategoryMeta {
  color: string;
  bg: string;
  iconColor: string;
  icon: React.ReactNode;
}

/** Screen-local palette (Penpot variant) for the overview legend/donut segments. */
const getCategoryPalette = (catId: string): Omit<CategoryMeta, "icon"> => {
  switch (catId) {
    case "airlines":
      return { color: "#9C4EBD", bg: "#FAF5FF", iconColor: "#9C4EBD" };
    case "banking":
      return { color: "#00A3FF", bg: "#E6F6FF", iconColor: "#00A3FF" };
    case "shopping":
    case "retail":
      return { color: "#02EFF4", bg: "#E6FFFF", iconColor: "#01A2FB" };
    case "hotels":
      return { color: "#F59E0B", bg: "#FFFBEB", iconColor: "#D97706" };
    case "dining":
    case "food_delivery":
      return { color: "#EF4444", bg: "#FFF1F2", iconColor: "#DC2626" };
    case "fuel":
      return { color: "#F97316", bg: "#FFF7ED", iconColor: "#EA580C" };
    case "entertainment":
      return { color: "#EC4899", bg: "#FDF2F8", iconColor: "#DB2777" };
    case "health":
    case "wellness":
      return { color: "#8B5CF6", bg: "#F5F3FF", iconColor: "#7C3AED" };
    case "telecom":
      return { color: "#10B981", bg: "#ECFDF5", iconColor: "#059669" };
    case "groceries":
    case "supermarket":
      return { color: "#10B981", bg: "#ECFDF5", iconColor: "#059669" };
    case "travel":
      return { color: "#3B82F6", bg: "#EFF6FF", iconColor: "#2563EB" };
    default:
      return { color: "#9C4EBD", bg: "#FAF5FF", iconColor: "#9C4EBD" };
  }
};

/**
 * Meta = screen palette + icon from the ONE shared icon map
 * (guardrails §3 — no screen-local icon switch).
 */
const getCategoryMeta = (catId: string): CategoryMeta => {
  const palette = getCategoryPalette(catId);
  const Icon = getCategoryIconComponent(catId);
  return { ...palette, icon: <Icon size={16} color={palette.iconColor} /> };
};

type FilterTab = "all" | "highest" | "expiring";

export default function OverviewScreen() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const {
    summary,
    categories,
    expiringAccounts,
    notifications,
    isSyncing,
    refreshAll,
  } = usePoints();

  const [refreshing, setRefreshing] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<FilterTab>("all");

  useEffect(() => {
    if (isAuthenticated) {
      refreshAll();
    }
  }, [isAuthenticated, refreshAll]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await refreshAll(true);
    } finally {
      setRefreshing(false);
    }
  }, [refreshAll]);

  const unreadCount = useMemo(
    () => (notifications || []).filter((n) => !n.isRead).length,
    [notifications]
  );

  // Filter categories with points
  const activeCategories = useMemo(
    () => categories.filter((cat) => (cat.totalPoints || 0) > 0),
    [categories]
  );

  // Chart segments calculation
  const segments: ChartSegment[] = useMemo(() => {
    return activeCategories.map((cat) => {
      const meta = getCategoryMeta(cat.categoryId);
      const percentage =
        summary.totalPoints > 0
          ? Math.round((cat.totalPoints / summary.totalPoints) * 100)
          : 0;

      return {
        id: cat.categoryId,
        label: cat.categoryName,
        value: cat.totalPoints,
        percentage,
        color: meta.color,
      };
    });
  }, [activeCategories, summary.totalPoints]);

  // Tab-filtered categories
  const displayedCategories = useMemo(() => {
    let list = [...activeCategories];
    if (activeTab === "highest") {
      list.sort((a, b) => b.totalPoints - a.totalPoints);
    } else if (activeTab === "expiring") {
      list = list.filter((c) => (c.expiringPoints || 0) > 0);
      list.sort((a, b) => (b.expiringPoints || 0) - (a.expiringPoints || 0));
    }
    return list;
  }, [activeCategories, activeTab]);

  const totalDisplay = summary.totalPoints || 0;
  const portfolioINR = summary.portfolioValueINR || 0;
  const monthlyEarned = summary.monthlyEarned || 0;
  const monthlyRedeemed = summary.monthlyRedeemed || 0;
  const expiringThisMonth = summary.expiringThisMonth || 0;
  const linkedCount = summary.linkedAccountsCount || 0;

  if (!isAuthenticated) {
    return (
      <AuthRequiredView
        title="Portfolio Analytics"
        subtitle="Sign in to view your complete points breakdown, INR portfolio valuation, and interactive distribution charts."
      />
    );
  }

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-[#F5FEFF]">
      {/* Signature Penpot Top Gradient Banner */}
      <View style={styles.topBgContainer}>
        <DashboardTopBg />
      </View>

      {/* App Header */}
      <View className="px-4 pt-3 pb-3 flex-row items-center justify-between">
        <View>
          <View className="flex-row items-center space-x-1.5">
            <Text
              style={{ fontFamily: "PlusJakartaSans-Bold" }}
              className="text-2xl text-white tracking-tight"
            >
              Point Overview
            </Text>
            {isSyncing && (
              <ActivityIndicator size="small" color="#02EFF4" className="ml-2" />
            )}
          </View>
          <Text
            style={{ fontFamily: "PlusJakartaSans-Medium" }}
            className="text-xs text-white/80 mt-0.5"
          >
            Live portfolio analytics & breakdown
          </Text>
        </View>

        {/* Notifications Button */}
        <TouchableOpacity
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push("/notifications");
          }}
          activeOpacity={0.7}
          className="w-11 h-11 rounded-2xl bg-white/15 border border-white/30 items-center justify-center relative backdrop-blur-md"
        >
          <Bell size={19} color="#FFFFFF" />
          {unreadCount > 0 && (
            <View className="absolute top-2 right-2 w-2.5 h-2.5 rounded-full bg-[#FF4343] border-2 border-[#070617]" />
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 32 }}
        className="px-3.5 pt-1"
        refreshControl={
          <RefreshControl
            refreshing={refreshing || isSyncing}
            onRefresh={onRefresh}
            tintColor="#02EFF4"
            colors={["#02EFF4", "#01A2FB", "#9C4EBD"]}
          />
        }
      >
        {/* ─── Hero Portfolio Metric Card ─────────────────────────── */}
        <View style={styles.heroCard} className="w-full bg-white rounded-3xl p-4 mb-3.5 border border-[#DCF0FA]">
          {/* Top Label & Sparkle */}
          <View className="flex-row items-center justify-between mb-1.5">
            <View className="flex-row items-center space-x-1.5">
              <Sparkles size={14} color="#01A2FB" />
              <Text
                style={{ fontFamily: "PlusJakartaSans-Bold" }}
                className="text-[11px] uppercase tracking-wider text-[#01A2FB]"
              >
                Total Portfolio Balance
              </Text>
            </View>
            <View className="bg-[#E6F8FF] border border-[#CBEBFC] px-2.5 py-0.5 rounded-full">
              <Text
                style={{ fontFamily: "PlusJakartaSans-Bold" }}
                className="text-[11px] text-[#01A2FB]"
              >
                {linkedCount} {linkedCount === 1 ? "Program" : "Programs"}
              </Text>
            </View>
          </View>

          {/* Large Point Value & Currency Valuation */}
          <View className="flex-row items-baseline justify-between mt-1 mb-4">
            <View className="flex-row items-baseline">
              <Text
                style={{ fontFamily: "PlusJakartaSans-Bold" }}
                className="text-3xl text-[#070617] tracking-tight"
              >
                {totalDisplay.toLocaleString()}
              </Text>
              <Text
                style={{ fontFamily: "PlusJakartaSans-Bold" }}
                className="text-sm text-[#01A2FB] ml-1.5 uppercase"
              >
                pts
              </Text>
            </View>

            {portfolioINR > 0 ? (
              <View className="bg-[#F0FDF4] border border-[#DCFCE7] px-3 py-1 rounded-xl items-end">
                <Text
                  style={{ fontFamily: "PlusJakartaSans-Bold" }}
                  className="text-xs text-[#16A34A]"
                >
                  ≈ ₹{Math.round(portfolioINR).toLocaleString()}
                </Text>
                <Text
                  style={{ fontFamily: "PlusJakartaSans-Regular" }}
                  className="text-[9px] text-[#65A30D]"
                >
                  Est. Rupee Value
                </Text>
              </View>
            ) : null}
          </View>

          {/* Divider */}
          <View className="h-[1px] bg-[#EAF2F6] mb-3.5" />

          {/* 3-Column Sub Metrics */}
          <View className="flex-row items-center justify-between space-x-2">
            {/* Monthly Earned */}
            <View className="flex-1 bg-[#F0FDF4] border border-[#DCFCE7] rounded-2xl p-2.5 items-center">
              <View className="flex-row items-center mb-0.5">
                <ArrowUpRight size={13} color="#16A34A" />
                <Text
                  style={{ fontFamily: "PlusJakartaSans-Bold" }}
                  className="text-[13px] text-[#16A34A] ml-0.5"
                >
                  +{monthlyEarned.toLocaleString()}
                </Text>
              </View>
              <Text
                style={{ fontFamily: "PlusJakartaSans-Medium" }}
                className="text-[10px] text-[#15803D]"
              >
                Earned (30d)
              </Text>
            </View>

            {/* Monthly Redeemed */}
            <View className="flex-1 bg-[#FAF5FF] border border-[#F3E8FF] rounded-2xl p-2.5 items-center">
              <View className="flex-row items-center mb-0.5">
                <ArrowDownRight size={13} color="#9C4EBD" />
                <Text
                  style={{ fontFamily: "PlusJakartaSans-Bold" }}
                  className="text-[13px] text-[#9C4EBD] ml-0.5"
                >
                  -{monthlyRedeemed.toLocaleString()}
                </Text>
              </View>
              <Text
                style={{ fontFamily: "PlusJakartaSans-Medium" }}
                className="text-[10px] text-[#7E22CE]"
              >
                Redeemed (30d)
              </Text>
            </View>

            {/* Expiring Soon */}
            <View
              className={`flex-1 rounded-2xl p-2.5 items-center border ${
                expiringThisMonth > 0
                  ? "bg-[#FFF5F5] border-[#FED7D7]"
                  : "bg-[#F8FAFC] border-[#E2E8F0]"
              }`}
            >
              <View className="flex-row items-center mb-0.5">
                {expiringThisMonth > 0 ? (
                  <AlertTriangle size={13} color="#FF4343" />
                ) : (
                  <CheckCircle2 size={13} color="#10B981" />
                )}
                <Text
                  style={{ fontFamily: "PlusJakartaSans-Bold" }}
                  className={`text-[13px] ml-0.5 ${
                    expiringThisMonth > 0 ? "text-[#FF4343]" : "text-[#10B981]"
                  }`}
                >
                  {expiringThisMonth > 0
                    ? expiringThisMonth.toLocaleString()
                    : "0"}
                </Text>
              </View>
              <Text
                style={{ fontFamily: "PlusJakartaSans-Medium" }}
                className={`text-[10px] ${
                  expiringThisMonth > 0 ? "text-[#C53030]" : "text-[#64748B]"
                }`}
              >
                {expiringThisMonth > 0 ? "Expiring (30d)" : "All Safe"}
              </Text>
            </View>
          </View>
        </View>

        {/* ─── Category Distribution Card ─────────────────────────── */}
        <View style={styles.card} className="w-full bg-white rounded-3xl p-4 mb-3.5 border border-[#E0F3FA]">
          <View className="flex-row items-center justify-between mb-1">
            <View>
              <Text
                style={{ fontFamily: "PlusJakartaSans-Bold" }}
                className="text-[17px] text-[#070617]"
              >
                Portfolio Distribution
              </Text>
              <Text
                style={{ fontFamily: "PlusJakartaSans-Regular" }}
                className="text-[11.5px] text-[#6A6A74] mt-0.5"
              >
                {segments.length > 0
                  ? "Tap a segment or category to inspect"
                  : "No loyalty accounts linked yet"}
              </Text>
            </View>

            {selectedCategoryId && (
              <TouchableOpacity
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setSelectedCategoryId(null);
                }}
                className="bg-[#E6F8FF] px-2.5 py-1 rounded-lg border border-[#CBEBFC]"
              >
                <Text
                  style={{ fontFamily: "PlusJakartaSans-Bold" }}
                  className="text-[10px] text-[#01A2FB]"
                >
                  Reset View
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Interactive Donut Chart */}
          <View className="items-center justify-center my-3">
            <PointsDonutChart
              segments={segments}
              totalPoints={totalDisplay}
              size={245}
              selectedId={selectedCategoryId}
              onSelectSegment={(id) => setSelectedCategoryId(id)}
            />
          </View>

          {/* Segmented Horizontal Proportion Bar */}
          {segments.length > 0 && totalDisplay > 0 && (
            <View className="w-full mt-2 mb-4">
              <View className="w-full h-2.5 bg-[#F1F5F9] rounded-full flex-row overflow-hidden">
                {segments.map((s) => (
                  <View
                    key={s.id}
                    style={{
                      flex: Math.max(s.value, 1),
                      backgroundColor: s.color,
                      opacity:
                        selectedCategoryId && selectedCategoryId !== s.id
                          ? 0.35
                          : 1,
                    }}
                    className="h-full"
                  />
                ))}
              </View>
            </View>
          )}

          {/* Filter Pills */}
          {activeCategories.length > 1 && (
            <View className="flex-row items-center space-x-1.5 mb-3 mt-1">
              <TouchableOpacity
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setActiveTab("all");
                }}
                activeOpacity={0.7}
                className={`px-3 py-1.5 rounded-full border ${
                  activeTab === "all"
                    ? "bg-[#070617] border-[#070617]"
                    : "bg-[#F8FAFC] border-[#E2E8F0]"
                }`}
              >
                <Text
                  style={{ fontFamily: "PlusJakartaSans-Bold" }}
                  className={`text-[11px] ${
                    activeTab === "all" ? "text-[#02EFF4]" : "text-[#64748B]"
                  }`}
                >
                  All ({activeCategories.length})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setActiveTab("highest");
                }}
                activeOpacity={0.7}
                className={`px-3 py-1.5 rounded-full border ${
                  activeTab === "highest"
                    ? "bg-[#070617] border-[#070617]"
                    : "bg-[#F8FAFC] border-[#E2E8F0]"
                }`}
              >
                <Text
                  style={{ fontFamily: "PlusJakartaSans-Bold" }}
                  className={`text-[11px] ${
                    activeTab === "highest" ? "text-[#02EFF4]" : "text-[#64748B]"
                  }`}
                >
                  Highest Balance
                </Text>
              </TouchableOpacity>

              {(expiringAccounts?.length ?? 0) > 0 && (
                <TouchableOpacity
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setActiveTab("expiring");
                  }}
                  activeOpacity={0.7}
                  className={`px-3 py-1.5 rounded-full border ${
                    activeTab === "expiring"
                      ? "bg-[#070617] border-[#070617]"
                      : "bg-[#FFF5F5] border-[#FED7D7]"
                  }`}
                >
                  <Text
                    style={{ fontFamily: "PlusJakartaSans-Bold" }}
                    className={`text-[11px] ${
                      activeTab === "expiring" ? "text-[#FF4343]" : "text-[#E53E3E]"
                    }`}
                  >
                    Expiring Soon
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Category List */}
          {displayedCategories.length > 0 ? (
            <View className="divide-y divide-[#EAF4FA]">
              {displayedCategories.map((cat) => {
                const meta = getCategoryMeta(cat.categoryId);
                const isSelected = selectedCategoryId === cat.categoryId;
                const percentage =
                  totalDisplay > 0
                    ? Math.round((cat.totalPoints / totalDisplay) * 100)
                    : 0;

                return (
                  <TouchableOpacity
                    key={cat.categoryId}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setSelectedCategoryId((prev) =>
                        prev === cat.categoryId ? null : cat.categoryId
                      );
                    }}
                    activeOpacity={0.7}
                    className={`py-3 px-1.5 rounded-2xl transition-all ${
                      isSelected ? "bg-[#F0FAFE] border border-[#BAE6FD]" : ""
                    }`}
                  >
                    <View className="flex-row items-center justify-between">
                      {/* Left: Icon & Names */}
                      <View className="flex-row items-center flex-1 pr-3">
                        <View
                          style={{ backgroundColor: meta.bg }}
                          className="w-10 h-10 rounded-xl items-center justify-center mr-3 border border-black/5"
                        >
                          {meta.icon}
                        </View>

                        <View className="flex-1">
                          <View className="flex-row items-center">
                            <Text
                              style={{ fontFamily: "PlusJakartaSans-Bold" }}
                              className="text-[14px] text-[#070617] mr-2"
                              numberOfLines={1}
                            >
                              {cat.categoryName}
                            </Text>
                            <View className="bg-[#EBF7FC] px-1.5 py-0.5 rounded-md">
                              <Text
                                style={{ fontFamily: "PlusJakartaSans-Bold" }}
                                className="text-[10px] text-[#01A2FB]"
                              >
                                {percentage}%
                              </Text>
                            </View>
                          </View>

                          <Text
                            style={{ fontFamily: "PlusJakartaSans-Regular" }}
                            className="text-[11px] text-[#6A6A74] mt-0.5"
                          >
                            {cat.brandCount} {cat.brandCount === 1 ? "account" : "accounts"}
                            {cat.expiringPoints > 0 ? (
                              <Text className="text-[#FF4343] font-bold">
                                {" "}• {cat.expiringPoints.toLocaleString()} expiring
                              </Text>
                            ) : null}
                          </Text>
                        </View>
                      </View>

                      {/* Right: Point Value & Navigation */}
                      <View className="flex-row items-center">
                        <View className="items-end mr-2.5">
                          <Text
                            style={{ fontFamily: "PlusJakartaSans-Bold" }}
                            className="text-[15px] text-[#070617]"
                          >
                            {cat.totalPoints.toLocaleString()}
                          </Text>
                          <Text
                            style={{ fontFamily: "PlusJakartaSans-Regular" }}
                            className="text-[10px] text-[#9C9BA2]"
                          >
                            pts
                          </Text>
                        </View>

                        <TouchableOpacity
                          onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            router.push(`/category/${cat.categoryId}`);
                          }}
                          className="w-8 h-8 rounded-full bg-[#F5FEFF] border border-[#DCF0FA] items-center justify-center"
                        >
                          <ChevronRight size={15} color="#01A2FB" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          ) : (
            <View className="mt-4 pt-3 items-center text-center">
              <View className="w-14 h-14 rounded-2xl bg-[#E6F8FF] items-center justify-center mb-3">
                <Mail size={24} color="#01A2FB" />
              </View>
              <Text
                style={{ fontFamily: "PlusJakartaSans-Bold" }}
                className="text-[15px] text-[#070617] mb-1"
              >
                No Statements Scanned Yet
              </Text>
              <Text
                style={{ fontFamily: "PlusJakartaSans-Regular" }}
                className="text-xs text-[#6A6A74] text-center px-4 mb-4"
              >
                Connect your Gmail to automatically scan loyalty statements and compute real-time point balances.
              </Text>
              <TouchableOpacity
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  router.push("/email-sync");
                }}
                activeOpacity={0.88}
                className="bg-[#070617] border border-[#02EFF4] px-6 py-3 rounded-2xl flex-row items-center shadow-md"
              >
                <Zap size={15} color="#02EFF4" />
                <Text
                  style={{ fontFamily: "PlusJakartaSans-Bold" }}
                  className="text-xs text-[#02EFF4] ml-2"
                >
                  Start Automated Sync
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* ─── Quick Discovery & Multipliers Banner ──────────────── */}
        <TouchableOpacity
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push("/deals");
          }}
          activeOpacity={0.88}
          className="w-full bg-[#070617] border border-[#393845] rounded-3xl p-4 flex-row items-center justify-between shadow-md mb-3"
        >
          <View className="flex-row items-center flex-1 mr-3">
            <View className="w-11 h-11 rounded-2xl bg-[#02EFF4]/15 border border-[#02EFF4]/30 items-center justify-center mr-3.5">
              <Zap size={20} color="#02EFF4" />
            </View>
            <View className="flex-1">
              <View className="flex-row items-center">
                <Text
                  style={{ fontFamily: "PlusJakartaSans-Bold" }}
                  className="text-sm text-white"
                >
                  Maximize Point Values
                </Text>
                <View className="bg-[#9C4EBD] px-1.5 py-0.2 rounded-md ml-2">
                  <Text
                    style={{ fontFamily: "PlusJakartaSans-Bold" }}
                    className="text-[9px] text-white"
                  >
                    HOT
                  </Text>
                </View>
              </View>
              <Text
                style={{ fontFamily: "PlusJakartaSans-Regular" }}
                className="text-xs text-[#9C9BA2] mt-0.5"
                numberOfLines={1}
              >
                Explore partner redemption deals & multipliers
              </Text>
            </View>
          </View>
          <ChevronRight size={18} color="#02EFF4" />
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  topBgContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 220,
    overflow: "hidden",
  },
  heroCard: {
    shadowColor: "#01A2FB",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 14,
    elevation: 4,
  },
  card: {
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
});
