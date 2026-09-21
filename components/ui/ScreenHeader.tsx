// components/ui/ScreenHeader.tsx
import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { ChevronLeft } from "lucide-react-native";
import * as Haptics from "expo-haptics";

interface ScreenHeaderProps {
  title?: string;
  subtitle?: string;
  showBack?: boolean;
  onBack?: () => void;
  rightAction?: React.ReactNode;
  transparent?: boolean;
}

export const ScreenHeader: React.FC<ScreenHeaderProps> = ({
  title,
  subtitle,
  showBack = true,
  onBack,
  rightAction,
  transparent = false,
}) => {
  const router = useRouter();

  const handleBack = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (onBack) {
      onBack();
    } else {
      router.back();
    }
  };

  return (
    <View
      className={`w-full flex-row items-center justify-between px-4 py-3 ${
        transparent ? "bg-transparent" : "bg-light-bg"
      }`}
    >
      <View className="flex-row items-center flex-1">
        {showBack && (
          <TouchableOpacity
            onPress={handleBack}
            activeOpacity={0.8}
            className="w-10 h-10 rounded-full bg-white border border-border-light items-center justify-center mr-3 shadow-sm"
          >
            <ChevronLeft size={20} color="#070617" />
          </TouchableOpacity>
        )}

        {title && (
          <View className="flex-1">
            <Text
              style={{ fontFamily: "PlusJakartaSans-Bold" }}
              className="text-lg text-dark tracking-tight"
              numberOfLines={1}
            >
              {title}
            </Text>
            {subtitle && (
              <Text
                style={{ fontFamily: "PlusJakartaSans-Regular" }}
                className="text-xs text-dark-muted mt-0.5"
                numberOfLines={1}
              >
                {subtitle}
              </Text>
            )}
          </View>
        )}
      </View>

      {rightAction && <View className="ml-2">{rightAction}</View>}
    </View>
  );
};
