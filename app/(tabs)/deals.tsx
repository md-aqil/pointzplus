// app/(tabs)/deals.tsx – Live Partner Deals, Coupons & Multiplier Offers
import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  Linking,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import {
  Search,
  X,
  Copy,
  Check,
  ExternalLink,
  Sparkles,
  Tag,
  Gift,
  Plane,
  Building2,
  ShoppingBag,
  Utensils,
  CreditCard,
  ChevronDown,
  ChevronUp,
  Zap,
} from "lucide-react-native";
import * as Haptics from "expo-haptics";
import * as Clipboard from "expo-clipboard";
import { ScreenHeader } from "../../components/ui/ScreenHeader";
import { apiClient } from "../../lib/apiClient";

export interface DealItem {
  id: string;
  title: string;
  description: string;
  code: string;
  type: "coupon" | "deal";
  discount: string;
  store: string;
  storeSlug: string;
  category: string;
  url: string;
  imageUrl?: string | null;
  expiryDate?: string | null;
  featured?: boolean;
  multiplier?: string | null;
  terms?: string | null;
}

export default function DealsScreen() {
  const [deals, setDeals] = useState<DealItem[]>([]);
  const [categories, setCategories] = useState<{ id: string; name: string; icon: string }[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [searchInput, setSearchInput] = useState("");
  // Debounced query: every keystroke must NOT hit the network.
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [copiedCodeId, setCopiedCodeId] = useState<string | null>(null);
  const [expandedTermsId, setExpandedTermsId] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setSearchQuery(searchInput.trim()), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  // Categories load once — NOT on every deals refetch (avoids the refetch loop).
  useEffect(() => {
    let active = true;
    apiClient
      .getDealCategories()
      .then((cats) => {
        if (active && Array.isArray(cats)) setCategories(cats);
      })
      .catch((err) => {
        if (__DEV__) {
          console.warn("[DealsScreen] Failed to load deal categories:", err?.message);
        }
      });
    return () => {
      active = false;
    };
  }, []);

  const fetchDeals = useCallback(async () => {
    try {
      const dealsRes = await apiClient.getDeals({
        category: selectedCategory,
        q: searchQuery,
      });

      if (dealsRes?.deals) {
        setDeals(dealsRes.deals);
      }
    } catch (err) {
      if (__DEV__) console.warn("Failed to fetch deals:", err);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [selectedCategory, searchQuery]);

  useEffect(() => {
    setIsLoading(true);
    fetchDeals();
  }, [fetchDeals]);

  const onRefresh = async () => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await fetchDeals();
  };

  const handleCopyCode = async (deal: DealItem) => {
    if (!deal.code) return;
    await Clipboard.setStringAsync(deal.code);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setCopiedCodeId(deal.id);
    setTimeout(() => {
      setCopiedCodeId(null);
    }, 2500);
  };

  const handleOpenDeal = (url: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (url && url !== "#") {
      Linking.openURL(url).catch((err) =>
        console.warn("Could not open merchant URL:", err)
      );
    }
  };

  const renderCategoryIcon = (iconName: string, isSelected: boolean) => {
    const color = isSelected ? "#FFFFFF" : "#6A6A74";
    const size = 15;
    switch (iconName) {
      case "Plane":
        return <Plane size={size} color={color} />;
      case "ShoppingBag":
        return <ShoppingBag size={size} color={color} />;
      case "Building2":
        return <Building2 size={size} color={color} />;
      case "Utensils":
        return <Utensils size={size} color={color} />;
      case "CreditCard":
        return <CreditCard size={size} color={color} />;
      default:
        return <Sparkles size={size} color={color} />;
    }
  };

  const featuredDeals = deals.filter((d) => d.featured);

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-white">
      <ScreenHeader title="Deals & Offers" showBack={false} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 170 }}
        className="flex-1 bg-white"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#01A2FB"
            colors={["#01A2FB", "#9C4EBD"]}
          />
        }
      >
        {/* Search Input – Clean, spacious & rounded */}
        <View className="px-5 pt-2 pb-3">
          <View className="flex-row items-center bg-[#F4F9FC] rounded-2xl px-4 py-3 border border-[#E2EEF5]">
            <Search size={18} color="#6A6A74" className="mr-2.5" />
            <TextInput
              placeholder="Search stores, coupons or deals..."
              placeholderTextColor="#9C9BA2"
              value={searchInput}
              onChangeText={(text) => setSearchInput(text)}
              style={{ fontFamily: "PlusJakartaSans-Regular" }}
              className="flex-1 text-[14px] text-dark py-0"
            />
            {searchInput ? (
              <TouchableOpacity
                onPress={() => setSearchInput("")}
                className="p-1"
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <X size={16} color="#6A6A74" />
              </TouchableOpacity>
            ) : null}
          </View>
        </View>

        {/* Categories Filter Tabs – Light, premium active pill style */}
        <View className="pb-3.5 border-b border-[#E6F3FA]/70">
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 20 }}
          >
            {categories.map((cat) => {
              const isSelected = selectedCategory === cat.id;
              return (
                <TouchableOpacity
                  key={cat.id}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setSelectedCategory(cat.id);
                  }}
                  activeOpacity={0.8}
                  className={`flex-row items-center px-4 py-2.5 rounded-xl mr-2.5 border ${
                    isSelected
                      ? "bg-[#01A2FB] border-[#01A2FB]"
                      : "bg-[#F8FDFF] border-[#E2EEF5]"
                  }`}
                >
                  {renderCategoryIcon(cat.icon, isSelected)}
                  <Text
                    style={{
                      fontFamily: isSelected
                        ? "PlusJakartaSans-Bold"
                        : "PlusJakartaSans-Medium",
                    }}
                    className={`text-xs ml-1.5 ${
                      isSelected ? "text-white" : "text-dark"
                    }`}
                  >
                    {cat.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Featured Multipliers Section – Light, VIP Glowing Card Style with matching structure */}
        {featuredDeals.length > 0 && !searchQuery && selectedCategory === "all" && (
          <View className="pt-4 pb-3">
            <View className="px-5 flex-row items-center justify-between mb-3.5">
              <View className="flex-row items-center">
                <View className="w-6 h-6 rounded-lg bg-[#01A2FB]/10 items-center justify-center mr-2">
                  <Sparkles size={14} color="#01A2FB" />
                </View>
                <Text
                  style={{ fontFamily: "PlusJakartaSans-Bold" }}
                  className="text-sm text-dark tracking-wide uppercase"
                >
                  Featured Multipliers
                </Text>
              </View>
              <View className="bg-[#E6F8FF] px-2.5 py-1 rounded-full border border-[#01A2FB]/30">
                <Text
                  style={{ fontFamily: "PlusJakartaSans-Bold" }}
                  className="text-[11px] text-[#01A2FB]"
                >
                  Bonus Points
                </Text>
              </View>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 20 }}
              className="py-1"
            >
              {featuredDeals.slice(0, 4).map((deal) => {
                const isCopied = copiedCodeId === deal.id;
                return (
                  <View
                    key={deal.id}
                    className="w-[325px] mr-3.5 bg-white rounded-3xl p-5 border border-[#BCE7FC] shadow-sm justify-between"
                    style={{
                      backgroundColor: "#FFFFFF",
                      shadowColor: "#01A2FB",
                      shadowOffset: { width: 0, height: 3 },
                      shadowOpacity: 0.08,
                      shadowRadius: 10,
                      elevation: 2,
                    }}
                  >
                    <LinearGradient
                      colors={["#F0FAFF", "#FAF6FF", "#FFFFFF"]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      className="absolute inset-0 rounded-3xl opacity-60"
                    />

                    <View className="relative z-10">
                      {/* Top Header: Store & Multiplier Badge */}
                      <View className="flex-row items-center justify-between mb-3">
                        <View className="flex-row items-center flex-1 mr-2">
                          <View className="w-9 h-9 rounded-2xl bg-white border border-[#D5EBF8] items-center justify-center mr-2.5 shadow-xs">
                            <Gift size={16} color="#01A2FB" />
                          </View>
                          <View className="flex-1">
                            <Text
                              style={{ fontFamily: "PlusJakartaSans-Bold" }}
                              className="text-[13px] text-dark"
                              numberOfLines={1}
                            >
                              {deal.store}
                            </Text>
                            <Text
                              style={{ fontFamily: "PlusJakartaSans-Regular" }}
                              className="text-[11px] text-muted capitalize"
                            >
                              {deal.category} • Top Bonus
                            </Text>
                          </View>
                        </View>

                        <View className="bg-[#01A2FB]/10 border border-[#01A2FB]/25 px-2.5 py-1 rounded-xl flex-row items-center">
                          <Zap size={11} color="#01A2FB" className="mr-1" />
                          <Text
                            style={{ fontFamily: "PlusJakartaSans-Bold" }}
                            className="text-[11px] text-[#01A2FB]"
                          >
                            {deal.discount}
                          </Text>
                        </View>
                      </View>

                      {/* Title */}
                      <Text
                        style={{ fontFamily: "PlusJakartaSans-Bold" }}
                        className="text-[14.5px] text-dark leading-snug mb-1.5"
                        numberOfLines={2}
                      >
                        {deal.title}
                      </Text>

                      {/* Description */}
                      <Text
                        style={{ fontFamily: "PlusJakartaSans-Regular" }}
                        className="text-[12px] text-[#6A6A74] leading-4.5 mb-3.5"
                        numberOfLines={2}
                      >
                        {deal.description}
                      </Text>
                    </View>

                    {/* Bottom Actions */}
                    <View className="relative z-10 flex-row items-center justify-between pt-3.5 border-t border-[#E8F3FA]">
                      {deal.code ? (
                        <TouchableOpacity
                          onPress={() => handleCopyCode(deal)}
                          activeOpacity={0.8}
                          className={`flex-1 mr-2.5 flex-row items-center justify-center px-3 py-2.5 rounded-xl border ${
                            isCopied
                              ? "bg-emerald-50 border-emerald-300"
                              : "bg-[#F0FAFF] border-[#BAE3F8]"
                          }`}
                        >
                          {isCopied ? (
                            <Check size={13} color="#10B981" className="mr-1.5" />
                          ) : (
                            <Copy size={13} color="#01A2FB" className="mr-1.5" />
                          )}
                          <Text
                            style={{ fontFamily: "PlusJakartaSans-Bold" }}
                            className={`text-xs ${
                              isCopied ? "text-emerald-700" : "text-[#01A2FB]"
                            }`}
                            numberOfLines={1}
                          >
                            {isCopied ? "COPIED" : deal.code}
                          </Text>
                        </TouchableOpacity>
                      ) : (
                        <View className="flex-1 mr-2.5 bg-[#F0FAFF] px-3 py-2.5 rounded-xl border border-[#BAE3F8] items-center justify-center">
                          <Text
                            style={{ fontFamily: "PlusJakartaSans-SemiBold" }}
                            className="text-xs text-[#01A2FB]"
                            numberOfLines={1}
                          >
                            Instant Multiplier
                          </Text>
                        </View>
                      )}

                      <TouchableOpacity
                        onPress={() => handleOpenDeal(deal.url)}
                        activeOpacity={0.85}
                        className="bg-[#01A2FB] min-w-[115px] px-4 py-2.5 rounded-xl flex-row items-center justify-center shadow-xs"
                      >
                        <Text
                          style={{ fontFamily: "PlusJakartaSans-Bold" }}
                          className="text-xs text-white mr-1.5"
                        >
                          Shop Now
                        </Text>
                        <ExternalLink size={12} color="#FFFFFF" />
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* All Available Offers Section – Light, Generous Padding */}
        <View className="px-5 pt-2">
          <View className="flex-row items-center justify-between mb-3.5">
            <Text
              style={{ fontFamily: "PlusJakartaSans-Bold" }}
              className="text-base text-dark"
            >
              {selectedCategory === "all" ? "All Coupons & Deals" : "Partner Offers"}
            </Text>
            <Text
              style={{ fontFamily: "PlusJakartaSans-Medium" }}
              className="text-xs text-muted"
            >
              {deals.length} {deals.length === 1 ? "Offer" : "Offers"}
            </Text>
          </View>

          {/* Loading Spinner */}
          {isLoading ? (
            <View className="py-12 items-center justify-center">
              <ActivityIndicator size="small" color="#01A2FB" />
              <Text
                style={{ fontFamily: "PlusJakartaSans-Medium" }}
                className="text-xs text-muted mt-2.5"
              >
                Fetching latest verified deals...
              </Text>
            </View>
          ) : deals.length > 0 ? (
            deals.map((deal) => {
              const isCopied = copiedCodeId === deal.id;
              const isTermsExpanded = expandedTermsId === deal.id;

              return (
                <View
                  key={deal.id}
                  className="w-full bg-white rounded-3xl p-5 border border-[#E6F3FA] mb-4 shadow-sm"
                  style={{
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.04,
                    shadowRadius: 8,
                    elevation: 1,
                  }}
                >
                  {/* Store Header & Discount Tag */}
                  <View className="flex-row items-center justify-between mb-3">
                    <View className="flex-row items-center flex-1 mr-2">
                      <View className="w-9 h-9 rounded-2xl bg-[#F0FAFE] border border-[#E2EEF5] items-center justify-center mr-2.5">
                        <Tag size={16} color="#01A2FB" />
                      </View>
                      <View className="flex-1">
                        <Text
                          style={{ fontFamily: "PlusJakartaSans-Bold" }}
                          className="text-[13px] text-dark"
                          numberOfLines={1}
                        >
                          {deal.store}
                        </Text>
                        <Text
                          style={{ fontFamily: "PlusJakartaSans-Regular" }}
                          className="text-[11px] text-muted capitalize"
                        >
                          {deal.category} • Verified Offer
                        </Text>
                      </View>
                    </View>

                    <View className="bg-emerald-50 border border-emerald-200/80 px-2.5 py-1 rounded-xl">
                      <Text
                        style={{ fontFamily: "PlusJakartaSans-Bold" }}
                        className="text-xs text-emerald-700 font-bold"
                      >
                        {deal.discount}
                      </Text>
                    </View>
                  </View>

                  {/* Offer Title */}
                  <Text
                    style={{ fontFamily: "PlusJakartaSans-Bold" }}
                    className="text-[14.5px] text-dark leading-snug mb-1.5"
                  >
                    {deal.title}
                  </Text>

                  {/* Offer Description */}
                  {deal.description ? (
                    <Text
                      style={{ fontFamily: "PlusJakartaSans-Regular" }}
                      className="text-[12px] text-[#6A6A74] leading-4.5 mb-3.5"
                    >
                      {deal.description}
                    </Text>
                  ) : null}

                  {/* Action Row */}
                  <View className="flex-row items-center justify-between pt-3.5 border-t border-[#EEF5F9]">
                    {/* Coupon Code / Deal Type */}
                    {deal.code ? (
                      <TouchableOpacity
                        onPress={() => handleCopyCode(deal)}
                        activeOpacity={0.8}
                        className={`flex-1 mr-3 flex-row items-center justify-center px-3.5 py-2.5 rounded-xl border ${
                          isCopied
                            ? "bg-emerald-50 border-emerald-300"
                            : "bg-[#F8FDFF] border-[#D0EEFA]"
                        }`}
                      >
                        {isCopied ? (
                          <Check size={14} color="#10B981" className="mr-1.5" />
                        ) : (
                          <Copy size={14} color="#01A2FB" className="mr-1.5" />
                        )}
                        <Text
                          style={{ fontFamily: "PlusJakartaSans-Bold" }}
                          className={`text-xs ${
                            isCopied ? "text-emerald-700" : "text-[#01A2FB]"
                          }`}
                          numberOfLines={1}
                        >
                          {isCopied ? "COPIED" : deal.code}
                        </Text>
                      </TouchableOpacity>
                    ) : (
                      <View className="flex-1 mr-3 bg-[#F0FAFE] px-3.5 py-2.5 rounded-xl border border-[#E6F3FA] items-center justify-center">
                        <Text
                          style={{ fontFamily: "PlusJakartaSans-SemiBold" }}
                          className="text-xs text-muted"
                          numberOfLines={1}
                        >
                          Direct Deal
                        </Text>
                      </View>
                    )}

                    {/* Redeem Button – Clean primary blue button with ample side width */}
                    <TouchableOpacity
                      onPress={() => handleOpenDeal(deal.url)}
                      activeOpacity={0.85}
                      className="bg-[#01A2FB] min-w-[125px] px-4.5 py-2.5 rounded-xl flex-row items-center justify-center shadow-xs"
                    >
                      <Text
                        style={{ fontFamily: "PlusJakartaSans-Bold" }}
                        className="text-xs text-white mr-1.5"
                      >
                        Shop & Earn
                      </Text>
                      <ExternalLink size={12} color="#FFFFFF" />
                    </TouchableOpacity>
                  </View>

                  {/* Terms Accordion (if available) */}
                  {deal.terms && (
                    <View className="mt-3 pt-2.5 border-t border-[#EEF5F9]">
                      <TouchableOpacity
                        onPress={() =>
                          setExpandedTermsId(isTermsExpanded ? null : deal.id)
                        }
                        className="flex-row items-center justify-between"
                      >
                        <Text
                          style={{ fontFamily: "PlusJakartaSans-Medium" }}
                          className="text-[11px] text-muted"
                        >
                          Terms & Conditions
                        </Text>
                        {isTermsExpanded ? (
                          <ChevronUp size={13} color="#9C9BA2" />
                        ) : (
                          <ChevronDown size={13} color="#9C9BA2" />
                        )}
                      </TouchableOpacity>

                      {isTermsExpanded && (
                        <Text
                          style={{ fontFamily: "PlusJakartaSans-Regular" }}
                          className="text-[11px] text-muted mt-1 leading-4"
                        >
                          {deal.terms}
                        </Text>
                      )}
                    </View>
                  )}
                </View>
              );
            })
          ) : (
            <View className="bg-white p-8 rounded-3xl border border-[#E6F3FA] items-center justify-center my-6 shadow-sm">
              <Tag size={32} color="#9C9BA2" className="mb-3" />
              <Text
                style={{ fontFamily: "PlusJakartaSans-Bold" }}
                className="text-sm text-dark mb-1"
              >
                No deals found
              </Text>
              <Text
                style={{ fontFamily: "PlusJakartaSans-Regular" }}
                className="text-xs text-muted text-center leading-5"
              >
                {searchQuery
                  ? `No offers matched "${searchQuery}". Try a different store or category.`
                  : "Check back soon for new partner deals & point booster coupons."}
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
