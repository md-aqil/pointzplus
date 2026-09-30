import React, { useEffect } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Dimensions,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { TrendingUp, Star, Gift } from "lucide-react-native";
import { PointzPlusLogo } from "../components/ui/PointzPlusLogo";
import { useAuthStore } from "../store/authStore";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

export default function OnboardingScreen() {
  const router = useRouter();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  useEffect(() => {
    if (isAuthenticated) {
      router.replace("/(tabs)/home");
    }
  }, [isAuthenticated]);

  const features = [
    {
      id: "track",
      title: "Track all your Points",
      subtitle: "See your points from every program, in one place.",
      icon: <TrendingUp size={20} color="#01A2FB" strokeWidth={2.2} />,
    },
    {
      id: "discover",
      title: "Discover & Earn More",
      subtitle: "Explore exclusive offers and earn more points effortlessly.",
      icon: <Star size={20} color="#01A2FB" strokeWidth={2.2} />,
    },
    {
      id: "redeem",
      title: "Redeem & Enjoy",
      subtitle: "Redeem your points for amazing rewards and Experiences",
      icon: <Gift size={20} color="#01A2FB" strokeWidth={2.2} />,
    },
  ];

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {/* Top Logo */}
        <View style={styles.logoContainer}>
          <PointzPlusLogo width={150} height={100} />
        </View>

        {/* Heading & Subtitle */}
        <View style={styles.headingContainer}>
          <Text style={styles.title}>Welcome to PointzPlus!</Text>
          <Text style={styles.subtitle}>Discover a world of Rewards</Text>
        </View>

        {/* 3D Rewards Hero Illustration */}
        <View style={styles.heroImageContainer}>
          <Image
            source={require("../assets/onboarding-hero.png")}
            style={styles.heroImage}
            resizeMode="contain"
          />
        </View>

        {/* Features Floating Card */}
        <View style={styles.featuresCard}>
          {features.map((item, index) => (
            <View
              key={item.id}
              style={[
                styles.featureRow,
                index !== features.length - 1 && styles.featureRowDivider,
              ]}
            >
              {/* Icon Badge */}
              <View style={styles.iconBadge}>{item.icon}</View>

              {/* Text Info */}
              <View style={styles.featureTextContainer}>
                <Text style={styles.featureTitle}>{item.title}</Text>
                <Text style={styles.featureSubtitle}>{item.subtitle}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Bottom Actions */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => router.push("/(auth)/register")}
            activeOpacity={0.88}
          >
            <Text style={styles.primaryButtonText}>Create an Account</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => router.push("/(tabs)/deals")}
            activeOpacity={0.7}
          >
            <Text style={styles.secondaryButtonText}>Explore deals</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F7FCFF",
  },
  scrollContainer: {
    flexGrow: 1,
    paddingHorizontal: 22,
    paddingTop: 8,
    paddingBottom: 24,
    justifyContent: "space-between",
  },
  logoContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  headingContainer: {
    alignItems: "center",
    marginTop: 10,
  },
  title: {
    fontFamily: "PlusJakartaSans-Bold",
    fontSize: 22,
    color: "#1E1D2E",
    textAlign: "center",
    letterSpacing: -0.3,
  },
  subtitle: {
    fontFamily: "PlusJakartaSans-Regular",
    fontSize: 14,
    color: "#6A6A74",
    textAlign: "center",
    marginTop: 4,
  },
  heroImageContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 4,
  },
  heroImage: {
    width: "100%",
    height: Math.min(220, SCREEN_HEIGHT * 0.26),
  },
  featuresCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: "rgba(225, 238, 248, 0.8)",
    shadowColor: "#01A2FB",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 3,
    marginBottom: 16,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
  },
  featureRowDivider: {
    marginBottom: 6,
  },
  iconBadge: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#EAF7FF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  featureTextContainer: {
    flex: 1,
  },
  featureTitle: {
    fontFamily: "PlusJakartaSans-Bold",
    fontSize: 14,
    color: "#1E1D2E",
    letterSpacing: -0.2,
  },
  featureSubtitle: {
    fontFamily: "PlusJakartaSans-Regular",
    fontSize: 12,
    color: "#6A6A74",
    marginTop: 2,
    lineHeight: 16,
  },
  actionsContainer: {
    width: "100%",
    gap: 8,
  },
  primaryButton: {
    backgroundColor: "#01A2FB",
    height: 52,
    borderRadius: 14,
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
    fontSize: 16,
    color: "#FFFFFF",
  },
  secondaryButton: {
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryButtonText: {
    fontFamily: "PlusJakartaSans-SemiBold",
    fontSize: 15,
    color: "#01A2FB",
  },
});
