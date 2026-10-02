// app/(tabs)/home.tsx – Pixel-perfect Home Dashboard with exact Penpot SVG background
import React, { useState } from "react";
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
  CreditCard,
  Plane,
  ShoppingBag,
  Building2,
  Layers,
  Utensils,
  Fuel,
  Sparkles,
  ArrowRight,
} from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { DashboardTopBg } from "../../components/ui/DashboardTopBg";
import { usePoints } from "../../hooks/usePoints";
import { useAuth } from "../../hooks/useAuth";

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { summary, categories, expiringAccounts, accounts, refreshAll, isSyncing } = usePoints();
  const [refreshing, setRefreshing] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);

  React.useEffect(() => {
    refreshAll();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await refreshAll(true);
    setRefreshing(false);
  };

  const displayName =
    user?.name || (user?.email ? user.email.split("@")[0] : "Guest");
  const avatarUrl = user?.avatarUrl;
  const avatarInitial = displayName.charAt(0).toUpperCase();

  // Accounts whose points expire within the 30-day dashboard window
  const soonExpiring = expiringAccounts.filter((acc) => {
    if (!acc.expiryDate) return true;
    const t = new Date(acc.expiryDate).getTime();
    return !isNaN(t) && t <= Date.now() + 30 * 24 * 60 * 60 * 1000;
  });

  // Recently discovered/updated loyalty accounts (newest first)
  const latestDiscovered = [...accounts]
    .sort((a, b) => new Date(b.lastSyncedAt || 0).getTime() - new Date(a.lastSyncedAt || 0).getTime())
    .slice(0, 3);

  // Real brand counts per category for the quick-nav cards
  const categoryBrandCounts: Record<string, number> = {};
  categories.forEach((c) => {
    categoryBrandCounts[c.categoryId] = c.brandCount;
  });

  const getCategoryMeta = (catId: string) => {
    switch (catId) {
      case "airlines":
        return {
          name: "Airlines",
          bgColor: "#FAF5FF",
          borderColor: "#F3E8FF",
          iconBg: "#A855F7",
          icon: <Plane size={20} color="#FFFFFF" />,
        };
      case "other":
        return {
          name: "Growth & Other",
          bgColor: "#FDF4FF",
          borderColor: "#FAE8FF",
          iconBg: "#9C4EBD",
          icon: <Layers size={20} color="#FFFFFF" />,
        };
      case "shopping":
      case "retail":
        return {
          name: "Shopping",
          bgColor: "#F0FDFA",
          borderColor: "#CCFBF1",
          iconBg: "#2DD4BF",
          icon: <ShoppingBag size={20} color="#FFFFFF" />,
        };
      case "banking":
        return {
          name: "Banking & Cards",
          bgColor: "#F0FDFE",
          borderColor: "#D8F3F8",
          iconBg: "#38BDF8",
          icon: <CreditCard size={20} color="#FFFFFF" />,
        };
      case "hotels":
        return {
          name: "Hotels",
          bgColor: "#FFFBEB",
          borderColor: "#FEF3C7",
          iconBg: "#F59E0B",
          icon: <Building2 size={20} color="#FFFFFF" />,
        };
      case "dining":
        return {
          name: "Dining Out",
          bgColor: "#FFF1F2",
          borderColor: "#FFE4E6",
          iconBg: "#EF4444",
          icon: <Utensils size={20} color="#FFFFFF" />,
        };
      case "fuel":
        return {
          name: "Fuel & Mobility",
          bgColor: "#FFF7ED",
          borderColor: "#FFEDD5",
          iconBg: "#F97316",
          icon: <Fuel size={20} color="#FFFFFF" />,
        };
      default:
        return {
          name: catId.charAt(0).toUpperCase() + catId.slice(1),
          bgColor: "#F0FAFE",
          borderColor: "#DCF0FA",
          iconBg: "#01A2FB",
          icon: <Layers size={20} color="#FFFFFF" />,
        };
    }
  };

  // Build ordered dynamic categories list: prioritize active categories with points
  const activeCategoryIds = categories
    .filter((c) => (c.brandCount || 0) > 0)
    .map((c) => c.categoryId);

  const fallbackCategoryIds = ["airlines", "other", "shopping", "banking", "hotels", "dining", "fuel"];
  const orderedCategoryIds = Array.from(new Set([...activeCategoryIds, ...fallbackCategoryIds]));

  const categoriesList = orderedCategoryIds.map((catId) => {
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
  });

  return (
    <View className="flex-1 bg-[#F8FAFC]">
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
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
                  <TouchableOpacity
                    key={acc.id}
                    onPress={() => router.push(`/category/${acc.program.category}`)}
                    activeOpacity={0.85}
                    className="bg-white rounded-2xl p-4 mb-3 border border-slate-200/60 shadow-sm flex-row items-center justify-between"
                  >
                    <View className="flex-row items-center flex-1 mr-2">
                      <View
                        style={{ backgroundColor: `${acc.program.accentColor}22` }}
                        className="w-11 h-11 rounded-xl items-center justify-center mr-3 border border-slate-100"
                      >
                        <Text className="text-lg">{acc.program.logoInitial}</Text>
                      </View>
                      <View className="flex-1">
                        <Text
                          style={{ fontFamily: "PlusJakartaSans-Bold" }}
                          className="text-[15px] text-slate-900"
                        >
                          {acc.program.name}
                        </Text>
                        <Text
                          style={{ fontFamily: "PlusJakartaSans-Regular" }}
                          className="text-[12.5px] text-slate-500 mt-0.5"
                        >
                          {acc.expiringPoints.toLocaleString()} pts expire{" "}
                          {acc.expiryDate && !isNaN(new Date(acc.expiryDate).getTime())
                            ? new Date(acc.expiryDate).toLocaleDateString("en-GB", {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              })
                            : "soon"}
                        </Text>
                      </View>
                    </View>

                    <Text
                      style={{ fontFamily: "PlusJakartaSans-Bold" }}
                      className="text-[17px] text-slate-900"
                    >
                      {acc.currentBalance.toLocaleString()}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          ) : (
            <>
              {/* Live Discovery Stream (Latest Points Found) */}
              <View className="flex-row items-center justify-between mb-4">
                <View className="flex-row items-center">
                  <Text
                    style={{ fontFamily: "PlusJakartaSans-Bold" }}
                    className="text-[18px] text-slate-900 mr-2"
                  >
                    Live Discovery Stream
                  </Text>
                  <View className="bg-emerald-50 border border-emerald-200/70 px-2 py-0.5 rounded-full flex-row items-center">
                    <View className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5" />
                    <Text
                      style={{ fontFamily: "PlusJakartaSans-Bold" }}
                      className="text-[10.5px] text-emerald-700"
                    >
                      LIVE
                    </Text>
                  </View>
                </View>

                <TouchableOpacity
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    router.push("/email-sync");
                  }}
                  className="flex-row items-center"
                >
                  <Text
                    style={{ fontFamily: "PlusJakartaSans-SemiBold" }}
                    className="text-sm text-[#00A3FF] mr-1"
                  >
                    Auto-Sync
                  </Text>
                  <Sparkles size={14} color="#00A3FF" />
                </TouchableOpacity>
              </View>

              {/* Latest Discovered Cards */}
              <View className="mb-6">
                {latestDiscovered.length > 0 ? (
                  latestDiscovered.map((acc) => (
                    <TouchableOpacity
                      key={acc.id}
                      onPress={() => router.push(`/category/${acc.program.category}`)}
                      activeOpacity={0.85}
                      className="bg-white rounded-2xl p-4 mb-3 border border-slate-200/60 shadow-sm flex-row items-center justify-between"
                    >
                      <View className="flex-row items-center flex-1 mr-2">
                        <View
                          style={{ backgroundColor: `${acc.program.accentColor}18` }}
                          className="w-11 h-11 rounded-xl items-center justify-center mr-3 border border-slate-100"
                        >
                          <Text className="text-lg">{acc.program.logoInitial}</Text>
                        </View>
                        <View className="flex-1">
                          <Text
                            style={{ fontFamily: "PlusJakartaSans-Bold" }}
                            className="text-[15px] text-slate-900"
                          >
                            {acc.program.name}
                          </Text>
                          <Text
                            style={{ fontFamily: "PlusJakartaSans-Regular" }}
                            className="text-[12px] text-slate-500 mt-0.5"
                          >
                            {acc.accountNumberMasked && acc.accountNumberMasked !== "MEMBER-***"
                              ? `${acc.accountNumberMasked} • `
                              : ""}
                            Discovered from Gmail
                          </Text>
                        </View>
                      </View>

                      <View className="bg-[#EAFBF3] border border-emerald-100 px-3 py-1.5 rounded-xl items-center justify-center">
                        <Text
                          style={{ fontFamily: "PlusJakartaSans-Bold" }}
                          className="text-[15px] text-emerald-600"
                        >
                          +{acc.currentBalance.toLocaleString()}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ))
                ) : (
                  <TouchableOpacity
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                      router.push("/email-sync");
                    }}
                    activeOpacity={0.9}
                    className="bg-sky-50/80 rounded-2xl p-5 border border-sky-200/60 shadow-sm flex-row items-center justify-between"
                  >
                    <View className="flex-row items-center flex-1 mr-3">
                      <View className="w-12 h-12 rounded-2xl bg-white shadow-sm border border-sky-100 items-center justify-center mr-3.5">
                        <Sparkles size={22} color="#01A2FB" />
                      </View>
                      <View className="flex-1">
                        <Text
                          style={{ fontFamily: "PlusJakartaSans-Bold" }}
                          className="text-[15px] text-slate-900"
                        >
                          Auto-Discover Your Points
                        </Text>
                        <Text
                          style={{ fontFamily: "PlusJakartaSans-Regular" }}
                          className="text-[12.5px] text-slate-600 mt-0.5 leading-4"
                        >
                          Sync Gmail to extract all your loyalty points & miles live.
                        </Text>
                      </View>
                    </View>

                    <View className="w-9 h-9 rounded-full bg-[#01A2FB] items-center justify-center">
                      <ArrowRight size={18} color="#FFFFFF" strokeWidth={2.4} />
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
