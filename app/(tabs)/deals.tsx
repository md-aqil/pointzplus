// app/(tabs)/deals.tsx – Deals & Partner Offers screen
import React from "react";
import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Tag, Sparkles, ArrowRight, ExternalLink } from "lucide-react-native";
import { ScreenHeader } from "../../components/ui/ScreenHeader";
import { Button } from "../../components/ui/Button";

const DEALS = [
  {
    id: "deal_1",
    title: "Double Points on Indian Airline",
    partner: "Indian Airline",
    discount: "2X Multiplier",
    expiresIn: "Expires in 3 days",
    description: "Book domestic or international flights and earn 2X points on economy seats.",
    accent: ["#02EFF4", "#01A2FB"] as const,
  },
  {
    id: "deal_2",
    title: "20% Bonus Points on Marriott Bonvoy",
    partner: "Marriott Bonvoy",
    discount: "+20% Bonus",
    expiresIn: "Expires in 5 days",
    description: "Transfer your credit card points to Marriott Bonvoy and get 20% bonus points.",
    accent: ["#9C4EBD", "#3F0059"] as const,
  },
  {
    id: "deal_3",
    title: "Cult.fit Wellness Pass Reward",
    partner: "Cult.fit Health",
    discount: "Free 1 Month",
    expiresIn: "Valid this month",
    description: "Redeem 1,000 health points for a complimentary 1-month Cultpass elite.",
    accent: ["#070617", "#393845"] as const,
  },
];

export default function DealsScreen() {
  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-light-bg">
      <ScreenHeader title="Explore Deals" showBack={false} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
        className="px-5 pt-2"
      >
        {/* Hero Featured Deal */}
        <LinearGradient
          colors={["#070617", "#1A1836"]}
          className="w-full rounded-3xl p-6 border border-dark-surface mb-5 shadow-lg"
        >
          <View className="flex-row items-center justify-between mb-3">
            <View className="bg-primary/20 px-3 py-1 rounded-full border border-primary/40">
              <Text
                style={{ fontFamily: "PlusJakartaSans-Bold" }}
                className="text-[10px] text-primary"
              >
                FEATURED OFFER
              </Text>
            </View>
            <Sparkles size={18} color="#02EFF4" />
          </View>

          <Text
            style={{ fontFamily: "PlusJakartaSans-Bold" }}
            className="text-xl text-white mb-2 leading-tight"
          >
            Transfer points and get 25% extra on InterMiles
          </Text>

          <Text
            style={{ fontFamily: "PlusJakartaSans-Regular" }}
            className="text-xs text-muted mb-4 leading-relaxed"
          >
            Exclusive offer for PointzPlus verified members. Valid until 31 Aug 2026.
          </Text>

          <Button
            title="Claim Offer"
            onPress={() => {}}
            variant="primary"
            size="md"
            rightIcon={<ArrowRight size={16} color="#070617" />}
          />
        </LinearGradient>

        <Text
          style={{ fontFamily: "PlusJakartaSans-Bold" }}
          className="text-base text-dark mb-3"
        >
          Partner Deals
        </Text>

        {DEALS.map((deal) => (
          <View
            key={deal.id}
            className="w-full bg-white p-5 rounded-2xl border border-border-light mb-3 shadow-sm"
          >
            <View className="flex-row items-start justify-between mb-2">
              <View className="flex-1 mr-2">
                <Text
                  style={{ fontFamily: "PlusJakartaSans-Regular" }}
                  className="text-xs text-dark-muted mb-0.5"
                >
                  {deal.partner}
                </Text>
                <Text
                  style={{ fontFamily: "PlusJakartaSans-Bold" }}
                  className="text-base text-dark"
                >
                  {deal.title}
                </Text>
              </View>

              <View className="bg-ice px-2.5 py-1 rounded-xl border border-border-blue">
                <Text
                  style={{ fontFamily: "PlusJakartaSans-Bold" }}
                  className="text-xs text-primary-dark"
                >
                  {deal.discount}
                </Text>
              </View>
            </View>

            <Text
              style={{ fontFamily: "PlusJakartaSans-Regular" }}
              className="text-xs text-dark-muted leading-relaxed mb-3"
            >
              {deal.description}
            </Text>

            <View className="flex-row items-center justify-between pt-3 border-t border-border-light/60">
              <Text
                style={{ fontFamily: "PlusJakartaSans-Medium" }}
                className="text-[11px] text-muted"
              >
                {deal.expiresIn}
              </Text>

              <TouchableOpacity
                activeOpacity={0.8}
                className="flex-row items-center space-x-1"
              >
                <Text
                  style={{ fontFamily: "PlusJakartaSans-Bold" }}
                  className="text-xs text-primary-dark mr-1"
                >
                  View Details
                </Text>
                <ExternalLink size={12} color="#01A2FB" />
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
