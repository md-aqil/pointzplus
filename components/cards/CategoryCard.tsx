// components/cards/CategoryCard.tsx – Works with CategorySummary from pointsStore
import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import * as Haptics from "expo-haptics";
import { CategorySummary } from "../../types/loyalty";

interface CategoryCardProps {
  category: CategorySummary;
  variant?: "compact" | "full";
  onPress?: () => void;
}

export const CategoryCard: React.FC<CategoryCardProps> = ({
  category,
  variant = "compact",
  onPress,
}) => {
  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress?.();
  };

  if (variant === "compact") {
    return (
      <TouchableOpacity
        onPress={handlePress}
        activeOpacity={0.8}
        className="mr-3 mb-2"
      >
        <View
          style={{ backgroundColor: category.bgColor, borderColor: category.accentColor }}
          className="px-4 py-3 rounded-xl border shadow-sm"
        >
          <Text
            style={{ fontFamily: "PlusJakartaSans-Bold", color: category.accentColor }}
            className="text-xs mb-1"
          >
            {category.categoryName}
          </Text>
          <View className="flex-row items-baseline">
            <Text
              style={{ fontFamily: "PlusJakartaSans-Bold", color: category.accentColor }}
              className="text-base"
            >
              {category.totalPoints.toLocaleString()}
            </Text>
            <Text
              style={{ fontFamily: "PlusJakartaSans-Medium", color: category.accentColor }}
              className="text-[10px] ml-1 opacity-70"
            >
              pts
            </Text>
          </View>
          {category.expiringPoints > 0 && (
            <Text
              style={{ fontFamily: "PlusJakartaSans-Medium" }}
              className="text-[9px] text-alert mt-1"
            >
              {category.expiringPoints.toLocaleString()} expiring
            </Text>
          )}
        </View>
      </TouchableOpacity>
    );
  }

  // Full variant for list view
  return (
    <TouchableOpacity
      onPress={handlePress}
      activeOpacity={0.85}
      className="w-full bg-white rounded-2xl p-4 border border-border-light mb-3 shadow-sm"
    >
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center flex-1 mr-2">
          <View
            style={{ backgroundColor: category.bgColor }}
            className="w-12 h-12 rounded-xl items-center justify-center mr-3 border"
          >
            <View
              style={{ backgroundColor: category.accentColor }}
              className="w-5 h-5 rounded-full"
            />
          </View>

          <View className="flex-1">
            <Text
              style={{ fontFamily: "PlusJakartaSans-Bold" }}
              className="text-sm text-dark"
            >
              {category.categoryName}
            </Text>
            <Text
              style={{ fontFamily: "PlusJakartaSans-Regular" }}
              className="text-xs text-dark-muted"
            >
              {category.brandCount} {category.brandCount === 1 ? "brand" : "brands"}
            </Text>
          </View>
        </View>

        <View className="items-end">
          <Text
            style={{ fontFamily: "PlusJakartaSans-Bold" }}
            className="text-lg text-dark"
          >
            {category.totalPoints.toLocaleString()}
          </Text>
          <Text
            style={{ fontFamily: "PlusJakartaSans-Medium" }}
            className="text-[10px] text-primary-dark"
          >
            pts
          </Text>
        </View>
      </View>

      {category.expiringPoints > 0 && (
        <View className="mt-2.5 pt-2.5 border-t border-border-light/60">
          <Text
            style={{ fontFamily: "PlusJakartaSans-Medium" }}
            className="text-xs text-alert"
          >
            {category.expiringPoints.toLocaleString()} points expiring soon
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
};
