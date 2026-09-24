// app/(tabs)/overview.tsx – Points Overview & Analytics with REAL data
import React from "react";
import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { ArrowLeft, TrendingUp, Calendar, PieChart as PieChartIcon, IndianRupee } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { usePoints } from "../../hooks/usePoints";
import { useAuth } from "../../hooks/useAuth";

export default function OverviewScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { summary, categories, accounts, expiringAccounts } = usePoints();

  const displayName = user?.name || "Guest";

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-light-bg">
      {/* Header */}
      <View className="px-5 py-3 flex-row items-center justify-between border-b border-border-light bg-white">
        <TouchableOpacity
          onPress={() => router.back()}
          className="w-10 h-10 rounded-full bg-light-bg items-center justify-center"
        >
          <ArrowLeft size={20} color="#070617" />
        </TouchableOpacity>

        <Text style={{ fontFamily: "PlusJakartaSans-Bold" }} className="text-lg text-dark">
          Points Overview
        </Text>

        <View className="w-10" />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} className="px-5 pt-4">
        {/* Portfolio Value Hero */}
        <View className="bg-dark rounded-3xl p-6 mb-5 shadow-lg">
          <View className="flex-row items-center justify-between mb-3">
            <View>
              <Text style={{ fontFamily: "PlusJakartaSans-Regular" }} className="text-xs text-white/70 mb-1">
                Total Rewards Value
              </Text>
              <View className="flex-row items-baseline">
                <IndianRupee size={20} color="#02EFF4" />
                <Text style={{ fontFamily: "PlusJakartaSans-Bold" }} className="text-3xl text-primary ml-1">
                  {summary.portfolioValueINR.toLocaleString()}
                </Text>
              </View>
            </View>
            <View className="w-12 h-12 rounded-full bg-primary/20 items-center justify-center">
              <PieChartIcon size={24} color="#02EFF4" />
            </View>
          </View>

          <Text style={{ fontFamily: "PlusJakartaSans-Regular" }} className="text-xs text-white/60">
            Across {summary.linkedAccountsCount} loyalty programs
          </Text>
        </View>

        {/* 3 Stat Cards */}
        <View className="flex-row justify-between gap-3 mb-5">
          <View className="flex-1 bg-white rounded-2xl p-4 border border-border-light shadow-sm">
            <View className="w-8 h-8 rounded-full bg-emerald-100 items-center justify-center mb-2">
              <TrendingUp size={16} color="#059669" />
            </View>
            <Text style={{ fontFamily: "PlusJakartaSans-Regular" }} className="text-xs text-dark-muted mb-1">
              Earned This Month
            </Text>
            <Text style={{ fontFamily: "PlusJakartaSans-Bold" }} className="text-lg text-dark">
              +{summary.monthlyEarned.toLocaleString()}
            </Text>
          </View>

          <View className="flex-1 bg-white rounded-2xl p-4 border border-border-light shadow-sm">
            <View className="w-8 h-8 rounded-full bg-red-100 items-center justify-center mb-2">
              <Calendar size={16} color="#DC2626" />
            </View>
            <Text style={{ fontFamily: "PlusJakartaSans-Regular" }} className="text-xs text-dark-muted mb-1">
              Expiring Soon
            </Text>
            <Text style={{ fontFamily: "PlusJakartaSans-Bold" }} className="text-lg text-alert">
              {summary.expiringThisMonth.toLocaleString()}
            </Text>
          </View>

          <View className="flex-1 bg-white rounded-2xl p-4 border border-border-light shadow-sm">
            <View className="w-8 h-8 rounded-full bg-violet-100 items-center justify-center mb-2">
              <PieChartIcon size={16} color="#9C4EBD" />
            </View>
            <Text style={{ fontFamily: "PlusJakartaSans-Regular" }} className="text-xs text-dark-muted mb-1">
              Categories
            </Text>
            <Text style={{ fontFamily: "PlusJakartaSans-Bold" }} className="text-lg text-dark">
              {categories.length}
            </Text>
          </View>
        </View>

        {/* Category Breakdown List */}
        <Text style={{ fontFamily: "PlusJakartaSans-Bold" }} className="text-base text-dark mb-3">
          Points by Category
        </Text>

        {categories.length === 0 ? (
          <View className="bg-white rounded-2xl p-6 border border-dashed border-border-light items-center mb-6">
            <Text style={{ fontFamily: "PlusJakartaSans-Regular" }} className="text-xs text-dark-muted text-center">
              No categories yet. Add loyalty programs to see your breakdown.
            </Text>
          </View>
        ) : (
          categories.map((cat) => {
            const percentage = summary.totalPoints > 0 
              ? ((cat.totalPoints / summary.totalPoints) * 100).toFixed(0) 
              : 0;

            return (
              <View key={cat.categoryId} className="bg-white rounded-2xl p-4 border border-border-light mb-3 shadow-sm">
                <View className="flex-row items-center justify-between mb-2">
                  <View className="flex-row items-center flex-1 mr-3">
                    <View
                      style={{ backgroundColor: cat.accentColor }}
                      className="w-3 h-3 rounded-full mr-3"
                    />
                    <View className="flex-1">
                      <Text style={{ fontFamily: "PlusJakartaSans-Bold" }} className="text-sm text-dark">
                        {cat.categoryName}
                      </Text>
                      <Text style={{ fontFamily: "PlusJakartaSans-Regular" }} className="text-xs text-dark-muted">
                        {cat.brandCount} {cat.brandCount === 1 ? "brand" : "brands"}
                      </Text>
                    </View>
                  </View>

                  <View className="items-end">
                    <Text style={{ fontFamily: "PlusJakartaSans-Bold" }} className="text-base text-dark">
                      {cat.totalPoints.toLocaleString()}
                    </Text>
                    <Text style={{ fontFamily: "PlusJakartaSans-Medium" }} className="text-xs text-dark-muted">
                      {percentage}%
                    </Text>
                  </View>
                </View>

                {/* Progress Bar */}
                <View className="w-full bg-border-light h-2 rounded-full overflow-hidden">
                  <View
                    style={{ 
                      width: `${percentage}%` as any, 
                      backgroundColor: cat.accentColor 
                    }}
                    className="h-full rounded-full"
                  />
                </View>

                {cat.expiringPoints > 0 && (
                  <Text style={{ fontFamily: "PlusJakartaSans-Medium" }} className="text-xs text-alert mt-2">
                    {cat.expiringPoints.toLocaleString()} pts expiring
                  </Text>
                )}
              </View>
            );
          })
        )}

        {/* Expiring Soon Section */}
        {expiringAccounts.length > 0 && (
          <View className="mt-4 mb-6">
            <Text style={{ fontFamily: "PlusJakartaSans-Bold" }} className="text-base text-dark mb-3">
              Points Expiring Soon
            </Text>

            {expiringAccounts.map((acc) => (
              <View 
                key={acc.id} 
                className="bg-alert/5 rounded-2xl p-4 border border-alert/20 mb-2"
              >
                <View className="flex-row items-center justify-between">
                  <View className="flex-row items-center flex-1 mr-2">
                    <Text className="text-base mr-2">{acc.program.logoInitial}</Text>
                    <View className="flex-1">
                      <Text style={{ fontFamily: "PlusJakartaSans-Bold" }} className="text-sm text-dark">
                        {acc.program.name}
                      </Text>
                      <Text style={{ fontFamily: "PlusJakartaSans-Regular" }} className="text-xs text-dark-muted">
                        Expires: {acc.expiryDate}
                      </Text>
                    </View>
                  </View>

                  <Text style={{ fontFamily: "PlusJakartaSans-Bold" }} className="text-base text-alert">
                    {acc.expiringPoints.toLocaleString()}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

        <View className="pb-20" />
      </ScrollView>
    </SafeAreaView>
  );
}
