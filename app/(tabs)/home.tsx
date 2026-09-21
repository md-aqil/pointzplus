// app/(tabs)/home.tsx – Home Dashboard using REAL pointsStore data
import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Bell, Search, ChevronRight, Plus, Mail } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { PointsCard } from "../../components/cards/PointsCard";
import { CategoryCard } from "../../components/cards/CategoryCard";
import { BrandPointCard } from "../../components/cards/BrandPointCard";
import { useAuth } from "../../hooks/useAuth";
import { usePoints } from "../../hooks/usePoints";

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const {
    summary,
    accounts,
    categories,
    expiringAccounts,
    refreshAll,
    isSyncing,
    emailAccounts,
  } = usePoints();

  const [refreshing, setRefreshing] = useState(false);

  React.useEffect(() => {
    refreshAll();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await refreshAll();
    setTimeout(() => setRefreshing(false), 600);
  };

  const displayName = user?.name || (user?.email ? user.email.split("@")[0] : "Welcome");
  const activeAccounts = accounts.filter((a) => a.isActive);
  const hasEmailSync = emailAccounts.length > 0;

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-light-bg">
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing || isSyncing}
            onRefresh={onRefresh}
            tintColor="#02EFF4"
            colors={["#02EFF4", "#01A2FB"]}
          />
        }
        className="px-5 pt-2"
      >
        {/* Top Header: User Greeting & Actions */}
        <View className="flex-row items-center justify-between mb-4">
          <View>
            <Text
              style={{ fontFamily: "PlusJakartaSans-Regular" }}
              className="text-xs text-dark-muted"
            >
              Welcome Back
            </Text>
            <Text
              style={{ fontFamily: "PlusJakartaSans-Bold" }}
              className="text-xl text-dark tracking-tight"
            >
              {displayName}
            </Text>
          </View>

          <View className="flex-row items-center space-x-2">
            {/* Search Icon */}
            <TouchableOpacity
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push("/search");
              }}
              className="w-10 h-10 rounded-full bg-white border border-border-light items-center justify-center shadow-sm mr-2"
            >
              <Search size={18} color="#070617" />
            </TouchableOpacity>

            {/* Notification Bell */}
            <TouchableOpacity
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push("/notifications");
              }}
              className="w-10 h-10 rounded-full bg-white border border-border-light items-center justify-center shadow-sm relative"
            >
              <Bell size={18} color="#070617" />
              {expiringAccounts.length > 0 && (
                <View className="absolute -top-1 -right-1 bg-alert px-1.5 py-0.5 rounded-full border border-white">
                  <Text
                    style={{ fontFamily: "PlusJakartaSans-Bold" }}
                    className="text-[9px] text-white"
                  >
                    {expiringAccounts.length}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Core Points Dashboard Card */}
        <PointsCard
          totalPoints={summary.totalPoints}
          monthlyEarned={summary.monthlyEarned}
          expiringPoints={summary.expiringThisMonth}
          portfolioValueINR={summary.portfolioValueINR}
          onViewOverview={() => router.push("/(tabs)/overview")}
        />

        {/* Empty State: No Accounts Yet */}
        {activeAccounts.length === 0 && (
          <View className="bg-white rounded-2xl p-6 mt-4 mb-5 border border-dashed border-primary/40 items-center">
            <View className="w-16 h-16 rounded-full bg-primary/20 items-center justify-center mb-3">
              <Plus size={28} color="#01A2FB" />
            </View>
            <Text
              style={{ fontFamily: "PlusJakartaSans-Bold" }}
              className="text-base text-dark mb-1 text-center"
            >
              No Loyalty Programs Yet
            </Text>
            <Text
              style={{ fontFamily: "PlusJakartaSans-Regular" }}
              className="text-xs text-dark-muted text-center mb-4"
            >
              Add your first program via Email Sync or Manual Entry to start tracking points.
            </Text>

            <View className="flex-row gap-2">
              <TouchableOpacity
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  router.push("/email-sync");
                }}
                className="bg-primary-dark px-4 py-2.5 rounded-xl flex-row items-center"
              >
                <Mail size={16} color="#FFFFFF" className="mr-2" />
                <Text
                  style={{ fontFamily: "PlusJakartaSans-Bold" }}
                  className="text-white text-xs ml-2"
                >
                  Email Sync
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  router.push("/add-account");
                }}
                className="bg-white border border-border-light px-4 py-2.5 rounded-xl flex-row items-center"
              >
                <Plus size={16} color="#070617" className="mr-2" />
                <Text
                  style={{ fontFamily: "PlusJakartaSans-Bold" }}
                  className="text-dark text-xs ml-2"
                >
                  Manual Add
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Categories Section (only show if accounts exist) */}
        {categories.length > 0 && (
          <View className="mt-4 mb-2">
            <View className="flex-row items-center justify-between mb-3">
              <Text
                style={{ fontFamily: "PlusJakartaSans-Bold" }}
                className="text-base text-dark"
              >
                Points by category
              </Text>

              <TouchableOpacity
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  router.push("/category");
                }}
                className="flex-row items-center"
              >
                <Text
                  style={{ fontFamily: "PlusJakartaSans-Bold" }}
                  className="text-xs text-primary-dark mr-1"
                >
                  All Category
                </Text>
                <ChevronRight size={14} color="#01A2FB" />
              </TouchableOpacity>
            </View>

            {/* Category Pills Horizontal Scroll */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              className="py-1"
            >
              {categories.map((cat) => (
                <CategoryCard
                  key={cat.categoryId}
                  category={cat}
                  variant="compact"
                  onPress={() => router.push(`/category/${cat.categoryId}`)}
                />
              ))}
            </ScrollView>
          </View>
        )}

        {/* Active Loyalty Programs List */}
        {activeAccounts.length > 0 && (
          <View className="mt-5">
            <View className="flex-row items-center justify-between mb-3">
              <Text
                style={{ fontFamily: "PlusJakartaSans-Bold" }}
                className="text-base text-dark"
              >
                Linked Programs
              </Text>
              <Text
                style={{ fontFamily: "PlusJakartaSans-Medium" }}
                className="text-xs text-dark-muted"
              >
                {activeAccounts.length} Active
              </Text>
            </View>

            {activeAccounts.map((account) => (
              <BrandPointCard
                key={account.id}
                account={account}
                onPress={() => router.push(`/category/${account.program.category}`)}
              />
            ))}
          </View>
        )}

        {/* Quick Actions Footer (if accounts exist but no email sync) */}
        {activeAccounts.length > 0 && !hasEmailSync && (
          <View className="bg-white rounded-2xl p-4 mt-5 border border-primary/30">
            <View className="flex-row items-center mb-2">
              <Mail size={18} color="#01A2FB" className="mr-2" />
              <Text
                style={{ fontFamily: "PlusJakartaSans-Bold" }}
                className="text-sm text-dark ml-2"
              >
                Enable Auto-Sync for Effortless Updates
              </Text>
            </View>
            <Text
              style={{ fontFamily: "PlusJakartaSans-Regular" }}
              className="text-xs text-dark-muted mb-3"
            >
              Connect Gmail or Outlook to automatically scan e-statements and keep all balances fresh.
            </Text>
            <TouchableOpacity
              onPress={() => router.push("/email-sync")}
              className="bg-primary-dark py-2.5 rounded-xl items-center"
            >
              <Text
                style={{ fontFamily: "PlusJakartaSans-Bold" }}
                className="text-white text-xs"
              >
                Connect Email Now
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Floating Add Button (always visible) */}
      <View className="absolute bottom-6 right-5">
        <TouchableOpacity
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            router.push("/add-account");
          }}
          className="w-14 h-14 rounded-full bg-primary-dark items-center justify-center shadow-lg"
          style={{
            shadowColor: "#01A2FB",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
            elevation: 8,
          }}
        >
          <Plus size={26} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
