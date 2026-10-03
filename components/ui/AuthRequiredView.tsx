// components/ui/AuthRequiredView.tsx – Full-screen guest protection view with PointzPlus theme
import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Lock,
  Sparkles,
  TrendingUp,
  Tag,
  ArrowRight,
  ShieldCheck,
  ChevronLeft,
} from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { DashboardTopBg } from "./DashboardTopBg";
import { PointzPlusLogo } from "./PointzPlusLogo";

interface AuthRequiredViewProps {
  title?: string;
  subtitle?: string;
  showBack?: boolean;
}

export const AuthRequiredView: React.FC<AuthRequiredViewProps> = ({
  title = "Sign In Required",
  subtitle = "This page contains personalized points data and requires an active PointzPlus account.",
  showBack = false,
}) => {
  const router = useRouter();

  const handleRegister = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push("/(auth)/register");
  };

  const handleSignIn = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push("/(auth)/sign-in");
  };

  const handleGoToDeals = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.replace("/(tabs)/deals");
  };

  return (
    <SafeAreaView edges={["top"]} style={styles.container}>
      {/* Top Background Gradient */}
      <View style={styles.topBgContainer}>
        <DashboardTopBg />
      </View>

      {/* Header with Back button (if requested) */}
      <View style={styles.header}>
        {showBack ? (
          <TouchableOpacity
            onPress={() => router.back()}
            activeOpacity={0.7}
            style={styles.backButton}
          >
            <ChevronLeft size={20} color="#FFFFFF" />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 40 }} />
        )}
        <View style={styles.logoBadge}>
          <PointzPlusLogo width={110} height={55} />
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Main Card */}
        <View style={styles.card}>
          {/* Lock / Sparkle Icon */}
          <View style={styles.iconCircle}>
            <Lock size={26} color="#01A2FB" />
          </View>

          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>

          {/* Benefits List */}
          <View style={styles.perksContainer}>
            <View style={styles.perkRow}>
              <View style={styles.perkIconBadge}>
                <TrendingUp size={15} color="#01A2FB" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.perkTitle}>Unified Points Tracking</Text>
                <Text style={styles.perkSubtitle}>
                  View all 20+ loyalty programs & balances in one dashboard.
                </Text>
              </View>
            </View>

            <View style={styles.perkRow}>
              <View style={styles.perkIconBadge}>
                <ShieldCheck size={15} color="#10B981" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.perkTitle}>Smart Expiry Shield</Text>
                <Text style={styles.perkSubtitle}>
                  Get timely alerts before your hard-earned points expire.
                </Text>
              </View>
            </View>

            <View style={styles.perkRow}>
              <View style={styles.perkIconBadge}>
                <Sparkles size={15} color="#9C4EBD" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.perkTitle}>AI Email Parsing</Text>
                <Text style={styles.perkSubtitle}>
                  Automatically extract statements and balances from Gmail.
                </Text>
              </View>
            </View>
          </View>

          {/* Primary & Secondary Action Buttons */}
          <View style={styles.actionColumn}>
            <TouchableOpacity
              onPress={handleRegister}
              activeOpacity={0.88}
              style={styles.primaryButton}
            >
              <Text style={styles.primaryButtonText}>Create Free Account</Text>
              <ArrowRight size={16} color="#FFFFFF" style={{ marginLeft: 6 }} />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleSignIn}
              activeOpacity={0.8}
              style={styles.secondaryButton}
            >
              <Text style={styles.secondaryButtonText}>Log In to Existing Account</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleGoToDeals}
              activeOpacity={0.7}
              style={styles.dealsButton}
            >
              <Tag size={14} color="#01A2FB" style={{ marginRight: 6 }} />
              <Text style={styles.dealsButtonText}>Explore Deals as Guest</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5FEFF",
  },
  topBgContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 240,
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  logoBadge: {
    alignItems: "center",
    justifyContent: "center",
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 28,
    padding: 24,
    borderWidth: 1,
    borderColor: "#DCF0FA",
    alignItems: "center",
    shadowColor: "#01A2FB",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 4,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 24,
    backgroundColor: "#E6F8FF",
    borderWidth: 1.5,
    borderColor: "#BAE6FD",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
    shadowColor: "#01A2FB",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  title: {
    fontFamily: "PlusJakartaSans-Bold",
    fontSize: 22,
    color: "#070617",
    textAlign: "center",
    letterSpacing: -0.4,
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: "PlusJakartaSans-Regular",
    fontSize: 13.5,
    color: "#6A6A74",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 20,
    paddingHorizontal: 8,
  },
  perksContainer: {
    width: "100%",
    backgroundColor: "#F8FDFF",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E2EEF5",
    padding: 16,
    marginBottom: 24,
    gap: 12,
  },
  perkRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  perkIconBadge: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2EEF5",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
    marginTop: 2,
  },
  perkTitle: {
    fontFamily: "PlusJakartaSans-Bold",
    fontSize: 13,
    color: "#070617",
  },
  perkSubtitle: {
    fontFamily: "PlusJakartaSans-Regular",
    fontSize: 11.5,
    color: "#6A6A74",
    marginTop: 1,
    lineHeight: 16,
  },
  actionColumn: {
    width: "100%",
    gap: 10,
  },
  primaryButton: {
    backgroundColor: "#01A2FB",
    height: 52,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#01A2FB",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 3,
  },
  primaryButtonText: {
    fontFamily: "PlusJakartaSans-Bold",
    fontSize: 15.5,
    color: "#FFFFFF",
  },
  secondaryButton: {
    backgroundColor: "#F5FEFF",
    borderWidth: 1.5,
    borderColor: "#CBEBFC",
    height: 48,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryButtonText: {
    fontFamily: "PlusJakartaSans-Bold",
    fontSize: 14,
    color: "#01A2FB",
  },
  dealsButton: {
    height: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  dealsButtonText: {
    fontFamily: "PlusJakartaSans-SemiBold",
    fontSize: 13,
    color: "#01A2FB",
  },
});
