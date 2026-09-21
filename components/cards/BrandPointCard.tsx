// components/cards/BrandPointCard.tsx – Works with LinkedAccount from pointsStore
import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { ChevronRight, Clock, ShieldCheck } from "lucide-react-native";
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

  return (
    <TouchableOpacity
      onPress={handlePress}
      activeOpacity={0.85}
      className="w-full bg-white rounded-2xl p-4 border border-border-light mb-3 shadow-sm"
    >
      <View className="flex-row items-center justify-between mb-3">
        <View className="flex-row items-center flex-1 mr-2">
          <View
            style={{ backgroundColor: `${account.program.accentColor}15` }}
            className="w-10 h-10 rounded-xl items-center justify-center mr-3 border"
          >
            <Text className="text-base">{account.program.logoInitial}</Text>
          </View>

          <View className="flex-1">
            <Text
              style={{ fontFamily: "PlusJakartaSans-Bold" }}
              className="text-sm text-dark"
            >
              {account.program.name}
            </Text>
            <Text
              style={{ fontFamily: "PlusJakartaSans-Regular" }}
              className="text-xs text-dark-muted capitalize"
            >
              {account.program.category} • {account.accountNumberMasked}
            </Text>
          </View>
        </View>

        <View className="items-end">
          <Text
            style={{ fontFamily: "PlusJakartaSans-Bold" }}
            className="text-base text-dark"
          >
            {account.currentBalance.toLocaleString()}
          </Text>
          <Text
            style={{ fontFamily: "PlusJakartaSans-SemiBold" }}
            className="text-[10px] text-primary-dark"
          >
            pts
          </Text>
        </View>
      </View>

      {account.expiringPoints > 0 && (
        <View className="flex-row items-center justify-between pt-2.5 border-t border-border-light/60">
          <View className="flex-row items-center">
            <Clock size={12} color="#FF4343" className="mr-1.5" />
            <Text
              style={{ fontFamily: "PlusJakartaSans-Medium" }}
              className="text-xs text-alert ml-1.5"
            >
              {account.expiringPoints.toLocaleString()} pts expire {account.expiryDate}
            </Text>
          </View>

          <Text
            style={{ fontFamily: "PlusJakartaSans-Bold" }}
            className="text-xs text-dark-muted"
          >
            Details →
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
};