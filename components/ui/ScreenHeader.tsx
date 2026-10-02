// components/ui/ScreenHeader.tsx
import React from "react";
import { View, Text, TouchableOpacity, Platform } from "react-native";
import { useRouter, Href } from "expo-router";
import { ChevronLeft } from "lucide-react-native";
import * as Haptics from "expo-haptics";

interface ScreenHeaderProps {
  title?: string;
  subtitle?: string;
  showBack?: boolean;
  onBack?: () => void;
  fallbackRoute?: Href;
  rightAction?: React.ReactNode;
  transparent?: boolean;
}

export const ScreenHeader: React.FC<ScreenHeaderProps> = ({
  title,
  subtitle,
  showBack = true,
  onBack,
  fallbackRoute = "/(tabs)/home",
  rightAction,
  transparent = false,
}) => {
  const router = useRouter();

  const handleBack = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}

    if (onBack) {
      onBack();
    } else if (router.canGoBack()) {
      router.back();
    } else {
      router.replace(fallbackRoute);
    }
  };

  return (
    <View
      className={`w-full flex-row items-center justify-between px-5 py-3.5 z-10 ${
        transparent ? "bg-transparent" : "bg-white"
      }`}
    >
      <View className="w-10 z-20">
        {showBack && (
          <TouchableOpacity
            onPress={handleBack}
            activeOpacity={0.7}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            className="w-10 h-10 rounded-2xl bg-[#EBF7FC] items-center justify-center"
          >
            <ChevronLeft size={22} color="#070617" />
          </TouchableOpacity>
        )}
      </View>

      <View className="flex-1 items-center justify-center px-2">
        {title && (
          <Text
            style={{ fontFamily: "PlusJakartaSans-Bold" }}
            className="text-[17px] text-[#070617] text-center font-bold"
            numberOfLines={1}
          >
            {title}
          </Text>
        )}
        {subtitle && (
          <Text
            style={{ fontFamily: "PlusJakartaSans-Regular" }}
            className="text-xs text-dark-muted text-center mt-0.5"
            numberOfLines={1}
          >
            {subtitle}
          </Text>
        )}
      </View>

      <View className="w-10 items-end justify-center z-20">
        {rightAction}
      </View>
    </View>
  );
};

