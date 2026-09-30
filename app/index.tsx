// app/index.tsx – Exact Penpot Splash Screen (`393x852`)
import React, { useEffect } from "react";
import { View, StyleSheet, Dimensions } from "react-native";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import Svg, { Defs, RadialGradient, LinearGradient, Stop, Rect, Circle, Path } from "react-native-svg";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withSequence,
} from "react-native-reanimated";
import { PointzPlusLogo } from "../components/ui/PointzPlusLogo";
import { useAuthStore } from "../store/authStore";
import { apiClient } from "../lib/apiClient";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

export default function SplashScreen() {
  const router = useRouter();
  const logoScale = useSharedValue(0.85);
  const opacity = useSharedValue(0);

  useEffect(() => {
    logoScale.value = withSpring(1, { damping: 14, stiffness: 120 });
    opacity.value = withTiming(1, { duration: 700 });

    const checkAuthAndNavigate = async () => {
      const token = await apiClient.restoreToken();
      const isAuth = useAuthStore.getState().isAuthenticated || Boolean(token);

      const timer = setTimeout(() => {
        if (isAuth) {
          router.replace("/(tabs)/home");
        } else {
          router.replace("/onboarding");
        }
      }, 1500);

      return () => clearTimeout(timer);
    };

    checkAuthAndNavigate();
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: logoScale.value }],
    opacity: opacity.value,
  }), []);

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />

      {/* Exact Penpot Background Gradients and Ambient Glows */}
      <Svg
        style={StyleSheet.absoluteFill}
        width={SCREEN_WIDTH}
        height={SCREEN_HEIGHT}
        viewBox="0 0 393 852"
        preserveAspectRatio="xMidYMid slice"
      >
        <Defs>
          {/* Base Background subtle tint */}
          <LinearGradient id="bgBase" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor="#FFFFFF" stopOpacity="1" />
            <Stop offset="100%" stopColor="#F5FEFF" stopOpacity="1" />
          </LinearGradient>

          {/* Top-Left Cyan Glow */}
          <RadialGradient
            id="topLeftGlow"
            cx="20%"
            cy="10%"
            r="50%"
            fx="20%"
            fy="10%"
          >
            <Stop offset="0%" stopColor="#01A2FB" stopOpacity="0.22" />
            <Stop offset="60%" stopColor="#02EFF4" stopOpacity="0.08" />
            <Stop offset="100%" stopColor="#01A2FB" stopOpacity="0" />
          </RadialGradient>

          {/* Center-Right Ambient Glow */}
          <RadialGradient
            id="centerRightGlow"
            cx="85%"
            cy="45%"
            r="45%"
            fx="85%"
            fy="45%"
          >
            <Stop offset="0%" stopColor="#9C4EBD" stopOpacity="0.10" />
            <Stop offset="70%" stopColor="#02EFF4" stopOpacity="0.05" />
            <Stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
          </RadialGradient>

          {/* Bottom-Right Soft Purple Glow */}
          <RadialGradient
            id="bottomRightGlow"
            cx="80%"
            cy="85%"
            r="50%"
            fx="80%"
            fy="85%"
          >
            <Stop offset="0%" stopColor="#3F0059" stopOpacity="0.11" />
            <Stop offset="100%" stopColor="#3F0059" stopOpacity="0" />
          </RadialGradient>
        </Defs>

        {/* Base Background Fill */}
        <Rect width="393" height="852" fill="url(#bgBase)" />

        {/* Top-Left Ambient Orb */}
        <Circle cx="100" cy="110" r="200" fill="url(#topLeftGlow)" />

        {/* Center-Right Ambient Orb */}
        <Circle cx="320" cy="380" r="180" fill="url(#centerRightGlow)" />

        {/* Bottom-Right Ambient Orb */}
        <Circle cx="300" cy="740" r="200" fill="url(#bottomRightGlow)" />

        {/* Subtle Ambient Sparkle Star from Penpot */}
        <Path
          d="M 196 346 C 196 350 200 352 204 352 C 200 352 196 354 196 358 C 196 354 192 352 188 352 C 192 352 196 350 196 346 Z"
          fill="#5AC5F2"
          opacity="0.3"
        />
      </Svg>

      {/* Centered Exact PointzPlus Logo (Vector) */}
      <Animated.View style={[styles.logoContainer, animatedStyle]}>
        <PointzPlusLogo width={215} height={148} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  logoContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
});
