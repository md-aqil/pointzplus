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
        activeOpacity={0.9}
        style={[animatedStyle]}
        className={`w-full overflow-hidden rounded-2xl ${disabled ? "opacity-50" : ""} ${className}`}
      >
        <LinearGradient
          colors={["#02EFF4", "#01A2FB"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          className={`flex-row items-center justify-center ${sizeClasses[size]}`}
        >
          {loading ? (
            <ActivityIndicator color="#070617" size="small" />
          ) : (
            <View className="flex-row items-center justify-center space-x-2">
              {leftIcon && <View className="mr-2">{leftIcon}</View>}
              <Text
                style={{ fontFamily: "PlusJakartaSans-Bold" }}
                className={`text-dark text-center ${textSizeClasses[size]}`}
              >
                {title}
              </Text>
              {rightIcon && <View className="ml-2">{rightIcon}</View>}
            </View>
          )}
        </LinearGradient>
      </AnimatedTouchableOpacity>
    );
  }

  const getVariantStyles = () => {
    switch (variant) {
      case "dark":
        return {
          container: "bg-dark",
          text: "text-white font-bold",
          loader: "#FFFFFF",
        };
      case "secondary":
        return {
          container: "bg-ice-dark border border-border-blue",
          text: "text-dark font-semibold",
          loader: "#070617",
        };
      case "alert":
        return {
          container: "bg-alert",
          text: "text-white font-bold",
          loader: "#FFFFFF",
        };
      case "outline":
        return {
          container: "bg-white border border-border-light",
          text: "text-dark font-semibold",
          loader: "#070617",
        };
      case "ghost":
        return {
          container: "bg-transparent",
          text: "text-dark font-semibold",
          loader: "#070617",
        };
      default:
        return {
          container: "bg-white border border-border-light",
          text: "text-dark font-semibold",
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
      className={`flex-row items-center justify-center ${vStyle.container} ${sizeClasses[size]} ${
        disabled ? "opacity-50" : ""
      } ${className}`}
    >
      {loading ? (
        <ActivityIndicator color={vStyle.loader} size="small" />
      ) : (
        <View className="flex-row items-center justify-center">
          {leftIcon && <View className="mr-2">{leftIcon}</View>}
          <Text
            style={{ fontFamily: "PlusJakartaSans-SemiBold" }}
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
