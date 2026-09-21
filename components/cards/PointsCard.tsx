// components/cards/PointsCard.tsx – Real data from pointsStore
import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { TrendingUp, Zap } from "lucide-react-native";
import * as Haptics from "expo-haptics";

interface PointsCardProps {
  totalPoints: number;
  monthlyEarned: number;
  expiringPoints: number;
  portfolioValueINR: number;
  onViewOverview: () => void;
}

export const PointsCard: React.FC<PointsCardProps> = ({
  totalPoints,
  monthlyEarned,
  expiringPoints,
  portfolioValueINR,
  onViewOverview,
}) => {
  return (
    <TouchableOpacity
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onViewOverview();
      }}
      activeOpacity={0.85}
      className="w-full bg-dark rounded-3xl p-5 mb-5 overflow-hidden shadow-lg"
    >
      {/* Gradient Overlay Effect */}
      <View className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent opacity-40" />

      <View className="relative z-10">
        {/* Header */}
        <View className="flex-row items-center justify-between mb-4">
          <View>
            <Text
              style={{ fontFamily: "PlusJakartaSans-Regular" }}
              className="text-xs text-white/70 mb-1"
            >
              Total Points Portfolio
            </Text>
            <Text
              style={{ fontFamily: "PlusJakartaSans-Bold" }}
              className="text-4xl text-primary tracking-tight"
            >
              {totalPoints.toLocaleString()}
            </Text>
          </View>

          <View className="w-12 h-12 rounded-full bg-primary/20 items-center justify-center">
            <TrendingUp size={24} color="#02EFF4" />
          </View>
        </View>

        {/* Estimated Value */}
        <View className="bg-white/10 backdrop-blur-md rounded-2xl px-3.5 py-2.5 mb-4 border border-white/20">
          <Text
            style={{ fontFamily: "PlusJakartaSans-Regular" }}
            className="text-xs text-white/70 mb-0.5"
          >
            Estimated Cash Value
          </Text>
          <Text
            style={{ fontFamily: "PlusJakartaSans-Bold" }}
            className="text-2xl text-primary"
          >
            ₹{portfolioValueINR.toLocaleString()}
          </Text>
        </View>

        {/* 3-Column Stats */}
        <View className="flex-row justify-between gap-2">
          {/* Monthly Earned */}
          <View className="flex-1 bg-white/5 rounded-2xl p-3 border border-white/10">
            <Text
              style={{ fontFamily: "PlusJakartaSans-Medium" }}
              className="text-[10px] text-white/60 mb-1"
            >
              Earned This Month
            </Text>
            <Text
              style={{ fontFamily: "PlusJakartaSans-Bold" }}
              className="text-lg text-white"
            >
              +{monthlyEarned.toLocaleString()}
            </Text>
          </View>

          {/* Expiring Soon */}
          <View className="flex-1 bg-alert/10 rounded-2xl p-3 border border-alert/30">
            <Text
              style={{ fontFamily: "PlusJakartaSans-Medium" }}
              className="text-[10px] text-alert/70 mb-1"
            >
              Expiring Soon
            </Text>
            <Text
              style={{ fontFamily: "PlusJakartaSans-Bold" }}
              className="text-lg text-alert"
            >
              {expiringPoints.toLocaleString()}
            </Text>
          </View>

          {/* View Breakdown Button */}
          <View className="flex-1 bg-primary/20 rounded-2xl p-3 border border-primary/40 items-center justify-center">
            <View className="flex-row items-center">
              <Zap size={14} color="#02EFF4" />
              <Text
                style={{ fontFamily: "PlusJakartaSans-Bold" }}
                className="text-[10px] text-primary ml-1"
              >
                View Chart
              </Text>
            </View>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};
