// app/category/[id].tsx – Dynamic Category Details matching Penpot Design
import React, { useState } from "react";
import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  ArrowLeft,
  Search,
  Plane,
  Building2,
  ShoppingBag,
  Utensils,
  CreditCard,
  Fuel,
  Film,
  HeartPulse,
  Radio,
  Layers,
  Sparkles,
} from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { BrandPointCard } from "../../components/cards/BrandPointCard";
import { AccountStatementModal } from "../../components/ui/AccountStatementModal";
import { CATEGORIES } from "../../constants/categories";
import { usePoints } from "../../hooks/usePoints";
import { LinkedAccount } from "../../types/loyalty";

export default function CategoryDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { accounts, categories } = usePoints();
  const [selectedAccount, setSelectedAccount] = useState<LinkedAccount | null>(null);

  const categoryId = (typeof id === "string" ? id : "airlines").toLowerCase();
  const staticCategory =
    CATEGORIES.find((c) => c.id.toLowerCase() === categoryId) || {
      id: categoryId,
      name: categoryId.charAt(0).toUpperCase() + categoryId.slice(1),
      iconName: "Layers",
      brandCount: 0,
      totalPoints: 0,
      accentColor: "#9C4EBD",
      bgColor: "#FDF4FF",
    };

  const summaryCategory = categories.find((c) => c.categoryId.toLowerCase() === categoryId);

  // Filter linked accounts matching this category
  const categoryAccounts = accounts.filter(
    (a) => a.isActive && a.program.category.toLowerCase() === categoryId
  );

  const totalPoints = categoryAccounts.reduce((sum, a) => sum + (a.currentBalance || 0), 0) || (summaryCategory ? summaryCategory.totalPoints : 0);
  const expiringTotal = categoryAccounts.reduce((sum, a) => sum + (a.expiringPoints || 0), 0) || (summaryCategory ? summaryCategory.expiringPoints : 0);

  const renderCategoryIcon = () => {
    const iconSize = 22;
    const iconColor = "#FFFFFF";
    switch (categoryId) {
      case "airlines":
        return <Plane size={iconSize} color={iconColor} />;
      case "hotels":
        return <Building2 size={iconSize} color={iconColor} />;
      case "shopping":
      case "retail":
        return <ShoppingBag size={iconSize} color={iconColor} />;
      case "dining":
        return <Utensils size={iconSize} color={iconColor} />;
      case "banking":
        return <CreditCard size={iconSize} color={iconColor} />;
      case "fuel":
        return <Fuel size={iconSize} color={iconColor} />;
      case "entertainment":
        return <Film size={iconSize} color={iconColor} />;
      case "health":
        return <HeartPulse size={iconSize} color={iconColor} />;
      case "telecom":
        return <Radio size={iconSize} color={iconColor} />;
      default:
        return <Layers size={iconSize} color={iconColor} />;
    }
  };

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-white">
      {/* Top Navigation Bar matching UI mockup */}
      <View className="px-5 py-3 flex-row items-center justify-between border-b border-border-light/40 bg-white">
        <TouchableOpacity
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.back();
          }}
          className="w-11 h-11 rounded-2xl bg-[#E6F6FF] items-center justify-center border border-[#E6F6FF]"
          activeOpacity={0.8}
        >
          <ArrowLeft size={20} color="#070617" strokeWidth={2.2} />
        </TouchableOpacity>

        <Text
          style={{ fontFamily: "PlusJakartaSans-Bold" }}
          className="text-lg text-dark capitalize"
        >
          {staticCategory.name}
        </Text>

        <TouchableOpacity
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push("/search");
          }}
          className="w-11 h-11 rounded-2xl bg-[#E6F6FF] items-center justify-center border border-[#E6F6FF]"
          activeOpacity={0.8}
        >
          <Search size={20} color="#070617" strokeWidth={2.2} />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 60 }}
        className="px-5 pt-4 bg-[#F8FDFF]"
      >
        {/* Category Hero Summary Card */}
        <View className="w-full bg-white rounded-3xl p-5 border border-[#E6F6FF] shadow-sm mb-6 flex-row items-center justify-between">
          <View className="flex-row items-center flex-1 mr-2">
            {/* Category Icon Badge */}
            <View className="w-13 h-13 rounded-2xl bg-[#9C4EBD] items-center justify-center mr-3.5 shadow-sm p-3">
              {renderCategoryIcon()}
            </View>

            {/* Total Points */}
            <View>
              <Text
                style={{ fontFamily: "PlusJakartaSans-Bold" }}
                className="text-2xl text-dark tracking-tight"
              >
                {totalPoints.toLocaleString()}
              </Text>
              <Text
                style={{ fontFamily: "PlusJakartaSans-Medium" }}
                className="text-xs text-muted mt-0.5"
              >
                Total Points
              </Text>
            </View>
          </View>

          {/* Expired Soon */}
          <View className="items-end pl-2">
            <Text
              style={{ fontFamily: "PlusJakartaSans-Medium" }}
              className="text-xs text-muted"
            >
              Expired soon
            </Text>
            <Text
              style={{ fontFamily: "PlusJakartaSans-Bold" }}
              className="text-sm text-alert mt-0.5"
            >
              {expiringTotal > 0 ? expiringTotal.toLocaleString() : "None"}
            </Text>
          </View>
        </View>

        {/* Brands Section Header */}
        <View className="flex-row items-center justify-between mb-3">
          <Text
            style={{ fontFamily: "PlusJakartaSans-Bold" }}
            className="text-base text-dark"
          >
            Brands
          </Text>
          <Text
            style={{ fontFamily: "PlusJakartaSans-Medium" }}
            className="text-xs text-muted"
          >
            {categoryAccounts.length} {categoryAccounts.length === 1 ? "Program" : "Programs"}
          </Text>
        </View>

        {/* Brand Cards List */}
        {categoryAccounts.length > 0 ? (
          categoryAccounts.map((account) => (
            <BrandPointCard
              key={account.id}
              account={account}
              onPress={() => setSelectedAccount(account)}
            />
          ))
        ) : (
          <View className="bg-white p-7 rounded-3xl border border-[#E6F6FF] items-center justify-center my-2 shadow-sm">
            <View className="w-12 h-12 rounded-2xl bg-primary/10 items-center justify-center mb-3">
              <Sparkles size={22} color="#01A2FB" />
            </View>
            <Text
              style={{ fontFamily: "PlusJakartaSans-Bold" }}
              className="text-sm text-dark mb-1 text-center"
            >
              No {staticCategory.name} Programs Found Yet
            </Text>
            <Text
              style={{ fontFamily: "PlusJakartaSans-Regular" }}
              className="text-xs text-muted text-center mb-4 leading-5"
            >
              Sync your emails to automatically discover and extract rewards from {staticCategory.name}.
            </Text>
            <TouchableOpacity
              onPress={() => router.push("/email-sync")}
              className="bg-dark px-5 py-2.5 rounded-xl active:opacity-85"
            >
              <Text
                style={{ fontFamily: "PlusJakartaSans-Bold" }}
                className="text-xs text-white"
              >
                Scan Gmail Inbox
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Full Statement Details & Proof Modal */}
      <AccountStatementModal
        visible={Boolean(selectedAccount)}
        account={selectedAccount}
        onClose={() => setSelectedAccount(null)}
      />
    </SafeAreaView>
  );
}
