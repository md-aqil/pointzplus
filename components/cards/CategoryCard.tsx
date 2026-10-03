// components/cards/CategoryCard.tsx – Matches Penpot All Category design
import React, { memo } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import * as Haptics from "expo-haptics";
import { CategorySummary } from "../../types/loyalty";
import { getCategoryIconComponent } from "../../constants/popularPrograms";

interface CategoryCardProps {
  category: CategorySummary;
  variant?: "compact" | "full";
  onPress?: () => void;
}

/** Icon resolves through the ONE shared map (guardrails §3 — no screen-local switch). */
const getCategoryIcon = (categoryId: string) => {
  const Icon = getCategoryIconComponent(categoryId);
  return <Icon size={17} color="#01A2FB" />;
};

// Memoized: rendered in category lists (guardrails §2).
export const CategoryCard: React.FC<CategoryCardProps> = memo(({
  category,
  variant = "full",
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
          style={{ backgroundColor: "#F5FEFF", borderColor: "#E6F6FF" }}
          className="px-4 py-3 rounded-xl border shadow-sm"
        >
          <Text
            style={{ fontFamily: "PlusJakartaSans-Bold" }}
            className="text-xs text-[#070617] mb-1"
          >
            {category.categoryName}
          </Text>
          <View className="flex-row items-baseline">
            <Text
              style={{ fontFamily: "PlusJakartaSans-Bold" }}
              className="text-base text-[#070617]"
            >
              {category.totalPoints.toLocaleString()}
            </Text>
            <Text
              style={{ fontFamily: "PlusJakartaSans-Medium" }}
              className="text-[10px] ml-1 text-[#6A6A74]"
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

  // Full variant matching Penpot Frame 2087327267
  return (
    <TouchableOpacity
      onPress={handlePress}
      activeOpacity={0.85}
      style={{
        borderRadius: 8,
        backgroundColor: "#F5FEFF",
        borderColor: "#E6F6FF",
        shadowColor: "#01A7FB",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.06,
        shadowRadius: 12,
        elevation: 2,
      }}
      className="w-full border p-3.5 mb-3 flex-row items-center justify-between"
    >
      <View className="flex-row items-center flex-1 mr-3">
        {/* Soft cyan square icon badge */}
        <View className="w-8 h-8 rounded-xl bg-[#E6F6FF] items-center justify-center mr-3">
          {getCategoryIcon(category.categoryId)}
        </View>

        <View className="flex-1">
          <Text
            style={{ fontFamily: "PlusJakartaSans-SemiBold" }}
            className="text-[13px] text-[#070617] leading-tight mb-0.5"
            numberOfLines={1}
          >
            {category.categoryName}
          </Text>
          <Text
            style={{ fontFamily: "PlusJakartaSans-Regular" }}
            className="text-[11px] text-[#393845]"
            numberOfLines={1}
          >
            {category.expiringPoints > 0
              ? `${category.expiringPoints.toLocaleString()} pts expiring soon`
              : `${category.brandCount} ${category.brandCount === 1 ? "program" : "programs"} tracked`}
          </Text>
        </View>
      </View>

      <Text
        style={{ fontFamily: "PlusJakartaSans-Bold" }}
        className="text-[16px] text-[#070617] text-right"
      >
        {category.totalPoints.toLocaleString()}
      </Text>
    </TouchableOpacity>
  );
});

CategoryCard.displayName = "CategoryCard";

