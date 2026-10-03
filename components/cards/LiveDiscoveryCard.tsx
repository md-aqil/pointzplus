// components/cards/LiveDiscoveryCard.tsx – Exact Live Discovery Stream pill card matching UI design
import React, { memo } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import * as Haptics from "expo-haptics";

interface LiveDiscoveryCardProps {
  programName: string;
  category?: string;
  logoInitial?: string | null;
  accountNumber?: string | null;
  balance: number | string;
  onPress?: () => void;
}

const getCategoryEmoji = (category?: string, logoInitial?: string | null) => {
  if (logoInitial && logoInitial.length <= 4) return logoInitial;
  switch (category?.toLowerCase()) {
    case "airlines":
      return "✈️";
    case "banking":
      return "💳";
    case "hotels":
      return "🏨";
    case "dining":
      return "🍽️";
    case "fuel":
      return "⛽";
    case "shopping":
    case "retail":
    default:
      return "🛍️";
  }
};

export const LiveDiscoveryCard: React.FC<LiveDiscoveryCardProps> = memo(({
  programName,
  category,
  logoInitial,
  accountNumber,
  balance,
  onPress,
}) => {
  const handlePress = () => {
    if (onPress) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onPress();
    }
  };

  const emoji = getCategoryEmoji(category, logoInitial);
  const formattedBalance = typeof balance === "number" ? balance.toLocaleString() : Number(balance || 0).toLocaleString();
  const maskedAcc = accountNumber && accountNumber !== "MEMBER-***" ? accountNumber : "MEMBER-***";

  return (
    <TouchableOpacity
      onPress={onPress ? handlePress : undefined}
      activeOpacity={onPress ? 0.85 : 1}
      className="w-full bg-white border border-[#E9F1F7] rounded-full px-4 py-3 flex-row items-center justify-between mb-3 shadow-none"
      style={{
        shadowColor: "#000000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.03,
        shadowRadius: 4,
        elevation: 1,
      }}
    >
      {/* Left: Soft Blue Circle with Emoji */}
      <View className="flex-row items-center flex-1 mr-2.5">
        <View className="w-12 h-12 rounded-full bg-[#EBF6FE] items-center justify-center mr-3.5 border border-[#E2EEF8]">
          <Text className="text-xl">{emoji}</Text>
        </View>

        {/* Center: Program Name & Subtitle */}
        <View className="flex-1 justify-center">
          <Text
            style={{ fontFamily: "PlusJakartaSans-Bold" }}
            className="text-[15px] text-[#0B1320] leading-tight"
            numberOfLines={1}
          >
            {programName}
          </Text>
          <Text
            style={{ fontFamily: "PlusJakartaSans-Medium" }}
            className="text-[12px] text-[#8A97A6] mt-0.5"
            numberOfLines={1}
          >
            {maskedAcc} · Discovered
          </Text>
        </View>
      </View>

      {/* Right: Soft Green Badge with +Balance */}
      <View className="bg-[#EDFAF4] border border-[#C6F2DE] px-3.5 py-1.5 rounded-full items-center justify-center min-w-[52px]">
        <Text
          style={{ fontFamily: "PlusJakartaSans-Bold" }}
          className="text-[14.5px] text-[#00A86B]"
        >
          +{formattedBalance}
        </Text>
      </View>
    </TouchableOpacity>
  );
});

LiveDiscoveryCard.displayName = "LiveDiscoveryCard";
