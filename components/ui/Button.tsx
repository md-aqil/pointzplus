// components/ui/Button.tsx
import React from "react";
import {
  Text,
  TouchableOpacity,
  ActivityIndicator,
  View,
  StyleSheet,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "outline" | "ghost" | "dark" | "alert";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  disabled?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  className?: string;
  enableHaptics?: boolean;
}

const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = "primary",
  size = "md",
  loading = false,
  disabled = false,
  leftIcon,
  rightIcon,
  className = "",
  enableHaptics = true,
}) => {
  const scale = useSharedValue(1);

  const handlePressIn = () => {
    if (!disabled && !loading) {
      scale.value = withSpring(0.97, { damping: 15, stiffness: 300 });
      if (enableHaptics) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    }
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 300 });
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }), []);

  const sizeClasses = {
    sm: "py-2.5 px-4 rounded-xl",
    md: "py-3.5 px-6 rounded-2xl",
    lg: "py-4 px-8 rounded-2xl",
  };

  const textSizeClasses = {
    sm: "text-xs font-semibold",
    md: "text-sm font-semibold",
    lg: "text-base font-bold",
  };

  if (variant === "primary") {
    return (
      <AnimatedTouchableOpacity
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled || loading}
        activeOpacity={0.88}
        style={[animatedStyle]}
        className={`w-full overflow-hidden rounded-2xl bg-[#00A3FF] items-center justify-center ${sizeClasses[size]} ${
          disabled ? "opacity-50" : ""
        } ${className}`}
      >
        {loading ? (
          <ActivityIndicator color="#FFFFFF" size="small" />
        ) : (
          <View className="flex-row items-center justify-center space-x-2">
            {leftIcon && <View className="mr-2">{leftIcon}</View>}
            <Text
              style={{ fontFamily: "PlusJakartaSans-Bold" }}
              className={`text-white text-center font-bold tracking-tight ${textSizeClasses[size]}`}
            >
              {title}
            </Text>
            {rightIcon && <View className="ml-2">{rightIcon}</View>}
          </View>
        )}
      </AnimatedTouchableOpacity>
    );
  }

  const getVariantStyles = () => {
    switch (variant) {
      case "dark":
        return {
          container: "bg-[#070617]",
          text: "text-white font-bold",
          loader: "#FFFFFF",
        };
      case "secondary":
        return {
          container: "bg-[#E6F6FF] border border-[#BCE3FF]",
          text: "text-[#070617] font-semibold",
          loader: "#070617",
        };
      case "alert":
        return {
          container: "bg-[#FF4343]",
          text: "text-white font-bold",
          loader: "#FFFFFF",
        };
      case "outline":
        return {
          container: "bg-white border border-[#E6E6E8]",
          text: "text-[#070617] font-semibold",
          loader: "#070617",
        };
      case "ghost":
        return {
          container: "bg-transparent",
          text: "text-[#070617] font-semibold",
          loader: "#070617",
        };
      default:
        return {
          container: "bg-white border border-[#E6E6E8]",
          text: "text-[#070617] font-semibold",
          loader: "#070617",
        };
    }
  };

  const vStyle = getVariantStyles();

  return (
    <AnimatedTouchableOpacity
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled || loading}
      activeOpacity={0.85}
      style={[animatedStyle]}
      className={`w-full flex-row items-center justify-center rounded-2xl ${vStyle.container} ${sizeClasses[size]} ${
        disabled ? "opacity-50" : ""
      } ${className}`}
    >
      {loading ? (
        <ActivityIndicator color={vStyle.loader} size="small" />
      ) : (
        <View className="flex-row items-center justify-center">
          {leftIcon && <View className="mr-2">{leftIcon}</View>}
          <Text
            style={{ fontFamily: "PlusJakartaSans-Bold" }}
            className={`text-center ${vStyle.text} ${textSizeClasses[size]}`}
          >
            {title}
          </Text>
          {rightIcon && <View className="ml-2">{rightIcon}</View>}
        </View>
      )}
    </AnimatedTouchableOpacity>
  );
};
