// components/ui/AuthGateModal.tsx – High-conversion bottom sheet prompting login / account creation
import React from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  StyleSheet,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { X, Sparkles, ShieldCheck, Zap, ArrowRight, Lock } from "lucide-react-native";
import * as Haptics from "expo-haptics";

export type AuthGateContext = "home" | "overview" | "deals" | "profile" | "search" | "sync" | "general";

interface AuthGateModalProps {
  visible: boolean;
  onClose: () => void;
  context?: AuthGateContext;
}

const CONTEXT_DETAILS: Record<
  AuthGateContext,
  { title: string; subtitle: string; icon: React.ReactNode; perk: string }
> = {
  home: {
    title: "Unlock Your Points Dashboard",
    subtitle:
      "Sign in to track your balances across 20+ airlines, hotels, cards, and shopping programs in one place.",
    icon: <Sparkles size={24} color="#01A2FB" />,
    perk: "Live portfolio & automatic email detection",
  },
  overview: {
    title: "Access Portfolio Analytics",
    subtitle:
      "Sign in to view real-time point valuations in INR, interactive breakdown charts, and expiry countdowns.",
    icon: <Zap size={24} color="#02EFF4" />,
    perk: "Smart expiry alerts & value estimator",
  },
  deals: {
    title: "Unlock Exclusive Multipliers",
    subtitle:
      "Sign in to activate partner bonuses, redeem high-value reward coupons, and maximize your points earnings.",
    icon: <Sparkles size={24} color="#01A2FB" />,
    perk: "Exclusive 2x–10x bonus points multipliers",
  },
  profile: {
    title: "Manage Your Account",
    subtitle:
      "Sign in to connect Gmail mailboxes, manage alert notifications, and customize your loyalty preferences.",
    icon: <ShieldCheck size={24} color="#01A2FB" />,
    perk: "Secure multi-mailbox synchronization",
  },
  search: {
    title: "Search & Add Programs",
    subtitle:
      "Sign in to search all 20+ supported loyalty brands and link accounts to your portfolio.",
    icon: <Sparkles size={24} color="#01A2FB" />,
    perk: "Instant access to all brand catalogues",
  },
  sync: {
    title: "Automated Email Sync",
    subtitle:
      "Sign in to connect your Gmail and automatically parse reward statement emails.",
    icon: <Zap size={24} color="#02EFF4" />,
    perk: "Zero-effort AI statement extraction",
  },
  general: {
    title: "Sign in to PointzPlus",
    subtitle:
      "Create a free account or log in to track your points, discover multipliers, and never let points expire.",
    icon: <Lock size={24} color="#01A2FB" />,
    perk: "Free forever for smart points management",
  },
};

export const AuthGateModal: React.FC<AuthGateModalProps> = ({
  visible,
  onClose,
  context = "general",
}) => {
  const router = useRouter();
  const details = CONTEXT_DETAILS[context] || CONTEXT_DETAILS.general;

  const handleRegister = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onClose();
    router.push("/(auth)/register");
  };

  const handleSignIn = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onClose();
    router.push("/(auth)/sign-in");
  };

  const handleDismiss = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={handleDismiss}>
        <View style={styles.backdrop}>
          <TouchableWithoutFeedback>
            <View style={styles.modalCard}>
              {/* Close Button */}
              <TouchableOpacity
                onPress={handleDismiss}
                activeOpacity={0.7}
                style={styles.closeButton}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <X size={18} color="#6A6A74" />
              </TouchableOpacity>

              {/* Icon Container */}
              <View style={styles.iconContainer}>{details.icon}</View>

              {/* Title & Subtitle */}
              <Text style={styles.title}>{details.title}</Text>
              <Text style={styles.subtitle}>{details.subtitle}</Text>

              {/* Highlight Perk Pill */}
              <View style={styles.perkPill}>
                <Sparkles size={13} color="#01A2FB" />
                <Text style={styles.perkText}>{details.perk}</Text>
              </View>

              {/* Action Buttons */}
              <View style={styles.actionColumn}>
                {/* Primary Button: Create Account */}
                <TouchableOpacity
                  onPress={handleRegister}
                  activeOpacity={0.88}
                  style={styles.primaryButton}
                >
                  <Text style={styles.primaryButtonText}>Create Free Account</Text>
                  <ArrowRight size={16} color="#FFFFFF" style={{ marginLeft: 6 }} />
                </TouchableOpacity>

                {/* Secondary Button: Sign In */}
                <TouchableOpacity
                  onPress={handleSignIn}
                  activeOpacity={0.8}
                  style={styles.secondaryButton}
                >
                  <Text style={styles.secondaryButtonText}>Already have an account? Sign In</Text>
                </TouchableOpacity>

                {/* Tertiary: Continue as guest */}
                <TouchableOpacity
                  onPress={handleDismiss}
                  activeOpacity={0.7}
                  style={styles.guestButton}
                >
                  <Text style={styles.guestButtonText}>Continue browsing deals as guest</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(7, 6, 23, 0.65)",
    justifyContent: "flex-end",
  },
  modalCard: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: Platform.OS === "ios" ? 40 : 28,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.15,
    shadowRadius: 18,
    elevation: 10,
    borderTopWidth: 1,
    borderTopColor: "rgba(225, 243, 252, 0.8)",
  },
  closeButton: {
    position: "absolute",
    top: 20,
    right: 20,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#F4F9FC",
    alignItems: "center",
    justifyContent: "center",
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 22,
    backgroundColor: "#E6F8FF",
    borderWidth: 1,
    borderColor: "#BAE6FD",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
    shadowColor: "#01A2FB",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 2,
  },
  title: {
    fontFamily: "PlusJakartaSans-Bold",
    fontSize: 20,
    color: "#070617",
    textAlign: "center",
    letterSpacing: -0.4,
    marginBottom: 8,
    paddingHorizontal: 12,
  },
  subtitle: {
    fontFamily: "PlusJakartaSans-Regular",
    fontSize: 13.5,
    color: "#6A6A74",
    textAlign: "center",
    lineHeight: 20,
    paddingHorizontal: 10,
    marginBottom: 16,
  },
  perkPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0FAFF",
    borderWidth: 1,
    borderColor: "#BAE3F8",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 24,
  },
  perkText: {
    fontFamily: "PlusJakartaSans-SemiBold",
    fontSize: 12,
    color: "#01A2FB",
    marginLeft: 6,
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
    shadowOpacity: 0.28,
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
  guestButton: {
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  guestButtonText: {
    fontFamily: "PlusJakartaSans-Medium",
    fontSize: 12.5,
    color: "#9C9BA2",
  },
});
