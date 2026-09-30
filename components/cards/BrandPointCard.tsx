// components/cards/BrandPointCard.tsx – Works with LinkedAccount from pointsStore
import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Clock } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { LinkedAccount } from "../../types/loyalty";

interface BrandPointCardProps {
  account: LinkedAccount;
  onPress?: () => void;
}

export const BrandPointCard: React.FC<BrandPointCardProps> = ({
  account,
  onPress,
}) => {
  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress?.();
  };

  const subtitleText =
    account.expiringPoints > 0 && account.expiryDate
      ? `${account.expiringPoints.toLocaleString()} expire ${account.expiryDate}`
      : account.accountNumberMasked && account.accountNumberMasked !== "MEMBER-***"
      ? `Member: ${account.accountNumberMasked}`
      : account.sourceSender
      ? `Extracted from ${account.sourceSender.split("@")[1] || account.sourceSender}`
      : "Synced via Gmail";

  return (
    <TouchableOpacity
      onPress={handlePress}
      activeOpacity={0.85}
      className="w-full bg-white rounded-2xl p-4 border border-[#E6F6FF] mb-3 shadow-sm flex-row items-center justify-between"
    >
      <View className="flex-row items-center flex-1 mr-3">
        {/* Brand Logo Circle */}
        <View
          style={{ backgroundColor: `${account.program.accentColor || "#01A2FB"}15` }}
          className="w-11 h-11 rounded-full items-center justify-center mr-3 border border-[#E6F6FF]"
        >
          <Text className="text-base">{account.program.logoInitial || "✈️"}</Text>
        </View>

        {/* Brand Details */}
        <View className="flex-1">
          <Text
            style={{ fontFamily: "PlusJakartaSans-Bold" }}
            className="text-sm text-dark"
            numberOfLines={1}
          >
            {account.program.name}
          </Text>
          <Text
            style={{ fontFamily: "PlusJakartaSans-Regular" }}
            className="text-xs text-muted mt-0.5"
            numberOfLines={1}
          >
            {subtitleText}
          </Text>
        </View>
      </View>

      {/* Points Balance */}
      <View className="items-end">
        <Text
          style={{ fontFamily: "PlusJakartaSans-Bold" }}
          className="text-base text-dark"
        >
          {account.currentBalance.toLocaleString()}
        </Text>
      </View>
    </TouchableOpacity>
  );
};