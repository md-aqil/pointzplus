// app/(tabs)/home.tsx – Pixel-perfect Home Dashboard with exact Penpot SVG background
import React, { useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  RefreshControl,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import {
  Bell,
  X,
  Sparkles,
  ArrowRight,
} from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { DashboardTopBg } from "../../components/ui/DashboardTopBg";
import { AuthRequiredView } from "../../components/ui/AuthRequiredView";
import { BrandPointCard } from "../../components/cards/BrandPointCard";
import { LiveDiscoveryCard } from "../../components/cards/LiveDiscoveryCard";
import { usePoints } from "../../hooks/usePoints";
import { useAuth } from "../../hooks/useAuth";
import { formatNameFromEmail } from "../../store/authStore";
import {
  CATEGORY_LABELS,
  getCategoryIconComponent,
} from "../../constants/popularPrograms";

/** Category ids always shown in the home quick-nav, even with zero linked brands. */
const FALLBACK_CATEGORY_IDS = [
  "airlines",
  "other",
  "shopping",
  "banking",
  "hotels",
  "dining",
  "fuel",
];

/** Screen-local *palette* for the home quick-nav cards (Penpot variant). */
function getQuickNavPalette(catId: string) {
  switch (catId) {
    case "airlines":
      return { bgColor: "#FAF5FF", borderColor: "#F3E8FF", iconBg: "#A855F7" };
    case "other":
      return { bgColor: "#FDF4FF", borderColor: "#FAE8FF", iconBg: "#9C4EBD" };
    case "shopping":
    case "retail":
      return { bgColor: "#F0FDFA", borderColor: "#CCFBF1", iconBg: "#2DD4BF" };
    case "banking":
      return { bgColor: "#F0FDFE", borderColor: "#D8F3F8", iconBg: "#38BDF8" };
    case "hotels":
      return { bgColor: "#FFFBEB", borderColor: "#FEF3C7", iconBg: "#F59E0B" };
    case "dining":
      return { bgColor: "#FFF1F2", borderColor: "#FFE4E6", iconBg: "#EF4444" };
    case "fuel":
      return { bgColor: "#FFF7ED", borderColor: "#FFEDD5", iconBg: "#F97316" };
    default:
      return { bgColor: "#F0FAFE", borderColor: "#DCF0FA", iconBg: "#01A2FB" };
  }
}

/**
 * Home quick-nav meta. Name comes from the canonical CATEGORY_LABELS and the
 * glyph from the ONE shared icon map; only the Penpot palette stays local
 * (guardrails §3 — no screen-local name/icon switches).
 */
function getCategoryMeta(catId: string) {
  const Icon = getCategoryIconComponent(catId);
  return {
    name:
      CATEGORY_LABELS[catId]?.name ||
      catId.charAt(0).toUpperCase() + catId.slice(1),
    ...getQuickNavPalette(catId),
    icon: <Icon size={20} color="#FFFFFF" />,
  };
}

export default function HomeScreen() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const {
    summary,
    categories,
    expiringAccounts,
    accounts,
    refreshAll,
    isSyncing,
    isBackfillRunning,
    activeJobDetails,
  } = usePoints();
  const [refreshing, setRefreshing] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);

  React.useEffect(() => {
    if (isAuthenticated) {
      refreshAll();
    }
  }, [isAuthenticated]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await refreshAll(true);
    } finally {
      setRefreshing(false);
    }
  }, [refreshAll]);

  const displayName =
    user?.name || (user?.email ? formatNameFromEmail(user.email) : "Guest");
  const avatarUrl = user?.avatarUrl;
  const avatarInitial = displayName.charAt(0).toUpperCase();

  // Accounts whose points expire within the 30-day dashboard window
  const soonExpiring = useMemo(
    () =>
      expiringAccounts.filter((acc) => {
        if (!acc.expiryDate) return true;
        const t = new Date(acc.expiryDate).getTime();
        return !isNaN(t) && t <= Date.now() + 30 * 24 * 60 * 60 * 1000;
      }),
    [expiringAccounts]
  );

  // Recently discovered/updated loyalty accounts (newest first)
  const latestDiscovered = useMemo(
    () =>
      [...accounts]
        .sort(
          (a, b) =>
            new Date(b.lastSyncedAt || 0).getTime() -
            new Date(a.lastSyncedAt || 0).getTime()
        )
        .slice(0, 3),
    [accounts]
  );

  // Real brand counts per category for the quick-nav cards
  const categoryBrandCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    categories.forEach((c) => {
      counts[c.categoryId] = c.brandCount;
    });
    return counts;
  }, [categories]);

  // Ordered dynamic categories: active-with-points first, then the static fallback set.
  const orderedCategoryIds = useMemo(() => {
    const activeCategoryIds = categories
      .filter((c) => (c.brandCount || 0) > 0)
      .map((c) => c.categoryId);
    return Array.from(new Set([...activeCategoryIds, ...FALLBACK_CATEGORY_IDS]));
  }, [categories]);

  const categoriesList = useMemo(
    () =>
      orderedCategoryIds.map((catId) => {
        const meta = getCategoryMeta(catId);
        const count = categoryBrandCounts[catId] ?? 0;
        return {
          id: catId,
          name: meta.name,
          subtext: `${count} ${count === 1 ? "brand" : "brands"}`,
          bgColor: meta.bgColor,
          borderColor: meta.borderColor,
          iconBg: meta.iconBg,
          icon: meta.icon,
          route: `/category/${catId}`,
        };
      }),
    [orderedCategoryIds, categoryBrandCounts]
  );

  if (!isAuthenticated) {
    return (
      <AuthRequiredView
        title="Welcome to PointzPlus"
        subtitle="Sign in to track balances across 20+ airline, hotel, and shopping loyalty programs in one unified dashboard."
      />
    );
  }

  return (
    <View className="flex-1 bg-[#F8FAFC]">
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 28 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing || isSyncing}
            onRefresh={onRefresh}
            tintColor="#02EFF4"
            colors={["#00A3FF", "#1845C8"]}
          />
        }
      >
        {/* ─── Hero Exact SVG Background Top Section ─────────────────── */}
        <View
          style={{
            backgroundColor: "#01A2FB",
            padding: 20,
            paddingTop: 20,
            paddingBottom: 20,
            paddingLeft: 20,
            paddingRight: 20,
          }}
          className="relative overflow-hidden"
        >
          {/* Exact Penpot Dashboard Top Background SVG */}
          <DashboardTopBg />

          <SafeAreaView edges={["top"]}>
            {/* User Greeting & Bell Header */}
            <View className="flex-row items-center justify-between mb-8 pt-2">
              <View className="flex-row items-center">
                {/* User Avatar */}
                <View className="w-12 h-12 rounded-full overflow-hidden border-2 border-white/30 mr-3 shadow-sm bg-slate-700 items-center justify-center">
                  {avatarUrl ? (
                    <Image
                      source={{ uri: avatarUrl }}
                      className="w-full h-full"
                      resizeMode="cover"
                    />
                  ) : (
                    <Text
                      style={{ fontFamily: "PlusJakartaSans-Bold" }}
                      className="text-white text-lg"
                    >
                      {avatarInitial}
                    </Text>
                  )}
                </View>

                <View>
                  <Text
                    style={{ fontFamily: "PlusJakartaSans-Bold" }}
                    className="text-[17px] text-white tracking-tight"
                  >
                    Welcome Back
                  </Text>
                  <Text
                    style={{ fontFamily: "PlusJakartaSans-Medium" }}
                    className="text-[13.5px] text-white/85 mt-0.5"
                  >
                    {displayName}
                  </Text>
                </View>
              </View>

              {/* Notification Bell */}
              <TouchableOpacity
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  router.push("/notifications");
                }}
                className="w-11 h-11 rounded-2xl bg-white/20 border border-white/25 items-center justify-center shadow-sm"
              >
                <Bell size={19} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            {/* Total Points & Tooltip */}
            <View className="items-center justify-center mt-3 mb-2">
              {/* Big Points Number */}
              <Text
                style={{ fontFamily: "PlusJakartaSans-Bold" }}
                className="text-[44px] text-white tracking-tight leading-none mb-2 text-center"
              >
                {summary.totalPoints.toLocaleString()}
              </Text>

              {/* Label row with ⓘ anchor & perfectly aligned tooltip */}
              <View className="flex-row items-center justify-center relative">
                <Text
                  style={{ fontFamily: "PlusJakartaSans-Medium" }}
                  className="text-sm text-white/90 mr-1.5"
                >
                  Total across programs
                </Text>

                {/* ⓘ Icon with anchored Tooltip */}
                <View className="relative items-center">
                  <TouchableOpacity
                    onPress={() => setShowTooltip(!showTooltip)}
                    activeOpacity={0.8}
                    className="w-4 h-4 rounded-full border border-white/80 items-center justify-center"
                  >
                    <Text
                      style={{ fontFamily: "PlusJakartaSans-Bold" }}
                      className="text-[10px] text-white leading-none"
                    >
                      i
                    </Text>
                  </TouchableOpacity>

                  {/* Tooltip speech bubble - mathematically aligned with ⓘ */}
                  {showTooltip && (
                    <View
                      style={{
                        position: "absolute",
                        bottom: 22,
                        right: -42,
                        zIndex: 50,
                        alignItems: "flex-end",
                      }}
                    >
                      <View className="bg-white rounded-xl px-3.5 py-3 shadow-2xl flex-row items-start justify-between border border-gray-100 min-w-[215px]">
                        <Text
                          style={{ fontFamily: "PlusJakartaSans-Regular" }}
                          className="text-xs text-slate-700 leading-4 pr-3 flex-1"
                        >
                          Total rewards across all{"\n"}loyalty programs.
                        </Text>
                        <TouchableOpacity
                          onPress={() => setShowTooltip(false)}
                          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                          className="pt-0.5 pl-1"
                        >
                          <X size={14} color="#64748B" />
                        </TouchableOpacity>
                      </View>
                      {/* Downward pointer notch centered directly above ⓘ */}
                      <View
                        style={{
                          width: 0,
                          height: 0,
                          borderLeftWidth: 6,
                          borderRightWidth: 6,
                          borderTopWidth: 6,
                          borderLeftColor: "transparent",
                          borderRightColor: "transparent",
                          borderTopColor: "#FFFFFF",
                          marginRight: 44,
                        }}
                      />
                    </View>
                  )}
                </View>
              </View>
            </View>

            {/* Monthly Earned & Expiring Glass Container */}
            <View
              style={{
                padding: 20,
                paddingTop: 20,
                paddingBottom: 20,
                paddingLeft: 20,
                paddingRight: 20,
                marginBottom: 20,
              }}
              className="bg-white/15 border border-white/25 rounded-2xl mt-7 p-5 flex-row items-center justify-between shadow-sm"
            >
              {/* Earned Column */}
              <View className="flex-1 items-center">
                <Text
                  style={{ fontFamily: "PlusJakartaSans-Bold" }}
                  className="text-2xl text-white tracking-tight"
                >
                  {summary.monthlyEarned.toLocaleString()}
                </Text>
                <Text
                  style={{ fontFamily: "PlusJakartaSans-Regular" }}
                  className="text-[12.5px] text-white/80 mt-1"
                >
                  Earned this month
                </Text>
              </View>

              {/* Center Divider */}
              <View className="w-[1px] h-9 bg-white/30 mx-2" />

              {/* Expiring Column */}
              <View className="flex-1 items-center">
                <Text
                  style={{ fontFamily: "PlusJakartaSans-Bold" }}
                  className="text-2xl text-white tracking-tight"
                >
                  {summary.expiringThisMonth.toLocaleString()}
                </Text>
                <Text
                  style={{ fontFamily: "PlusJakartaSans-Regular" }}
                  className="text-[12.5px] text-white/80 mt-1"
                >
                  Expiring this month
                </Text>
              </View>
            </View>
          </SafeAreaView>
        </View>

        {/* ─── White Rounded Body Container ──────────────────────────── */}
        <View className="bg-[#F8FAFC] rounded-t-[32px] -mt-6 pt-6 px-5 flex-1">
          {/* ─── Section 1: Pts Expire in 30 days OR Live Discovery Stream ─── */}
          {soonExpiring.length > 0 ? (
            <>
              <View className="flex-row items-center justify-between mb-4">
                <Text
                  style={{ fontFamily: "PlusJakartaSans-Bold" }}
                  className="text-[18px] text-slate-900"
                >
                  Pts Expire in 30 days
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    router.push("/(tabs)/overview");
                  }}
                >
                  <Text
                    style={{ fontFamily: "PlusJakartaSans-SemiBold" }}
                    className="text-sm text-[#00A3FF]"
                  >
                    View All
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Expiry Cards List */}
              <View className="mb-6">
                {soonExpiring.slice(0, 3).map((acc) => (
                  <BrandPointCard
                    key={acc.id}
                    account={acc}
                    onPress={() => router.push(`/category/${acc.program.category}`)}
                  />
                ))}
              </View>
            </>
          ) : (
            <>
              {/* Background Scan Notification Pill if deep backfill is scanning */}
              {isBackfillRunning && (
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    router.push("/sync-rejected");
                  }}
                  className="bg-white border border-sky-200/80 rounded-2xl p-3 mb-3.5 flex-row items-center justify-between shadow-xs"
                >
                  <View className="flex-row items-center flex-1 mr-2">
                    <View className="w-2 h-2 rounded-full bg-[#00A3FF] mr-2" />
                    <View className="flex-1">
                      <Text
                        style={{ fontFamily: "PlusJakartaSans-Bold" }}
                        className="text-[12px] text-slate-900"
                      >
                        Analyzing Inbox in Background
                      </Text>
                      <Text
                        style={{ fontFamily: "PlusJakartaSans-Regular" }}
                        className="text-[10.5px] text-slate-500"
                      >
                        {activeJobDetails?.messages_processed !== null && activeJobDetails?.messages_processed !== undefined
                          ? `Processed ${activeJobDetails.messages_processed} of ${activeJobDetails.total_messages_found || "..."} statements`
                          : "AI scanner is evaluating past reward emails"}
                      </Text>
                    </View>
                  </View>
                  <View className="bg-sky-50 border border-sky-100 px-2 py-0.5 rounded-full">
                    <Text
                      style={{ fontFamily: "PlusJakartaSans-Bold" }}
                      className="text-[10px] text-[#00A3FF]"
                    >
                      Inspect
                    </Text>
                  </View>
                </TouchableOpacity>
              )}

              {/* Live Discovery Stream (Latest Points Found) */}
              <View className="flex-row items-center justify-between mb-3">
                <Text
                  style={{ fontFamily: "PlusJakartaSans-Bold" }}
                  className="text-[12px] text-[#7E8B9B] uppercase tracking-wider"
                >
                  LIVE DISCOVERY STREAM
                </Text>

                <TouchableOpacity
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    router.push("/email-sync");
                  }}
                  activeOpacity={0.8}
                  className="flex-row items-center bg-[#E6F8FF] border border-[#BAE6FD] px-2.5 py-1 rounded-xl"
                >
                  <Sparkles size={12} color="#01A2FB" className="mr-1" />
                  <Text
                    style={{ fontFamily: "PlusJakartaSans-Bold" }}
                    className="text-[11px] text-[#01A2FB]"
                  >
                    Auto-Sync
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Latest Discovered Cards */}
              <View className="mb-5">
                {latestDiscovered.length > 0 ? (
                  latestDiscovered.map((acc) => (
                    <LiveDiscoveryCard
                      key={acc.id}
                      programName={acc.program.name}
                      category={acc.program.category}
                      logoInitial={acc.program.logoInitial}
                      accountNumber={acc.accountNumberMasked}
                      balance={acc.currentBalance}
                      onPress={() => router.push(`/category/${acc.program.category}`)}
                    />
                  ))
                ) : (
                  <TouchableOpacity
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                      router.push("/email-sync");
                    }}
                    activeOpacity={0.88}
                    className="bg-white rounded-2xl p-3.5 border border-[#DCF0FA] shadow-sm flex-row items-center justify-between"
                  >
                    <View className="flex-row items-center flex-1 mr-3">
                      <View className="w-10 h-10 rounded-xl bg-[#E6F8FF] border border-[#BAE6FD] items-center justify-center mr-3">
                        <Sparkles size={18} color="#01A2FB" />
                      </View>
                      <View className="flex-1">
                        <Text
                          style={{ fontFamily: "PlusJakartaSans-Bold" }}
                          className="text-[13.5px] text-slate-900"
                        >
                          Auto-Discover Points
                        </Text>
                        <Text
                          style={{ fontFamily: "PlusJakartaSans-Regular" }}
                          className="text-[11.5px] text-slate-500 mt-0.5"
                          numberOfLines={1}
                        >
                          Sync Gmail to extract your rewards live
                        </Text>
                      </View>
                    </View>

                    <View className="bg-[#01A2FB] px-3 py-1.5 rounded-xl flex-row items-center">
                      <Text
                        style={{ fontFamily: "PlusJakartaSans-Bold" }}
                        className="text-xs text-white mr-1"
                      >
                        Sync
                      </Text>
                      <ArrowRight size={12} color="#FFFFFF" />
                    </View>
                  </TouchableOpacity>
                )}
              </View>
            </>
          )}

          {/* ─── Section 2: Points by category ────────────────────────── */}
          <View className="flex-row items-center justify-between mb-4 mt-2">
            <Text
              style={{ fontFamily: "PlusJakartaSans-Bold" }}
              className="text-[18px] text-slate-900"
            >
              Points by category
            </Text>
            <TouchableOpacity
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push("/category");
              }}
            >
              <Text
                style={{ fontFamily: "PlusJakartaSans-SemiBold" }}
                className="text-sm text-[#00A3FF]"
              >
                View All
              </Text>
            </TouchableOpacity>
          </View>

          {/* Horizontal Category Cards */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingRight: 20 }}
            className="py-1"
          >
            {categoriesList.map((cat) => (
              <TouchableOpacity
                key={cat.id}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  router.push(cat.route as any);
                }}
                activeOpacity={0.85}
                style={{
                  backgroundColor: cat.bgColor,
                  borderColor: cat.borderColor,
                }}
                className="w-[124px] h-[134px] rounded-2xl p-3.5 mr-3 border justify-between shadow-sm"
              >
                {/* Category Icon */}
                <View
                  style={{ backgroundColor: cat.iconBg }}
                  className="w-11 h-11 rounded-2xl items-center justify-center shadow-sm"
                >
                  {cat.icon}
                </View>

                {/* Category Info */}
                <View>
                  <Text
                    style={{ fontFamily: "PlusJakartaSans-Bold" }}
                    className="text-[13.5px] text-slate-900 leading-4 mb-0.5"
                    numberOfLines={2}
                  >
                    {cat.name}
                  </Text>
                  <Text
                    style={{ fontFamily: "PlusJakartaSans-Regular" }}
                    className="text-[11px] text-slate-500"
                  >
                    {cat.subtext}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* End of categories */}
        </View>
      </ScrollView>
    </View>
  );
}
