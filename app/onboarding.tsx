import React, { useEffect } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Dimensions,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { TrendingUp, Star, Gift } from "lucide-react-native";
import { PointzPlusLogo } from "../components/ui/PointzPlusLogo";
import { useAuth } from "../hooks/useAuth";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

export default function OnboardingScreen() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();

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
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: Platform.OS === "web" ? 48 : 28,
    justifyContent: "space-between",
  },
  logoContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  headingContainer: {
    alignItems: "center",
    marginTop: 6,
  },
  title: {
    fontFamily: "PlusJakartaSans-Bold",
    fontSize: 21,
    color: "#1E1D2E",
    textAlign: "center",
    letterSpacing: -0.3,
  },
  subtitle: {
    fontFamily: "PlusJakartaSans-Regular",
    fontSize: 13,
    color: "#6A6A74",
    textAlign: "center",
    marginTop: 3,
  },
  heroImageContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 4,
  },
  heroImage: {
    width: "100%",
    height: Math.min(170, SCREEN_HEIGHT * 0.22),
  },
  featuresCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "rgba(225, 238, 248, 0.8)",
    shadowColor: "#01A2FB",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 14,
    elevation: 2,
    marginBottom: 12,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
  },
  featureRowDivider: {
    marginBottom: 4,
  },
  iconBadge: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: "#EAF7FF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  featureTextContainer: {
    flex: 1,
  },
  featureTitle: {
    fontFamily: "PlusJakartaSans-Bold",
    fontSize: 13.5,
    color: "#1E1D2E",
    letterSpacing: -0.2,
  },
  featureSubtitle: {
    fontFamily: "PlusJakartaSans-Regular",
    fontSize: 11.5,
    color: "#6A6A74",
    marginTop: 1,
    lineHeight: 15,
  },
  actionsContainer: {
    width: "100%",
    gap: 8,
    paddingBottom: 8,
  },
  primaryButton: {
    backgroundColor: "#01A2FB",
    height: 50,
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
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryButtonText: {
    fontFamily: "PlusJakartaSans-SemiBold",
    fontSize: 15,
    color: "#01A2FB",
  },
});
