// app/(auth)/forgot-password.tsx – Forgot Password / Enter Email matching Penpot Design
import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Mail, ArrowRight } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { Input } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";
import { ScreenHeader } from "../../components/ui/ScreenHeader";

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSendCode = () => {
    if (!email.trim() || !email.includes("@")) {
      setError("Please enter a valid email address");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }

    // The OTP email flow is simulated end-to-end (no mail backend yet).
    // Never present a fake success to production users.
    if (!__DEV__) {
      setError(
        "Password reset by email isn't available yet. Please contact support to reset your password."
      );
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }

    setLoading(true);
    setError("");

    setTimeout(() => {
      setLoading(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.push({
        pathname: "/(auth)/otp-verification",
        params: { email },
      });
    }, 800);
  };

  return (
    <SafeAreaView className="flex-1 bg-light-bg">
      <ScreenHeader onBack={() => router.back()} />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          showsVerticalScrollIndicator={false}
          className="px-6 py-4"
        >
          {/* Header Title & Subtitle from Penpot */}
          <View className="my-6">
            <Text
              style={{ fontFamily: "PlusJakartaSans-Bold" }}
              className="text-2xl text-dark tracking-tight mb-2"
            >
              Let's confirm your email
            </Text>
            <Text
              style={{ fontFamily: "PlusJakartaSans-Regular" }}
              className="text-sm text-dark-muted leading-relaxed"
            >
              Enter your email address and we'll send a 6-digit verification code.
            </Text>
          </View>

          {/* Email input */}
          <Input
            label="Email address"
            placeholder="Enter your email address"
            value={email}
            onChangeText={(t) => {
              setEmail(t);
              setError("");
            }}
            keyboardType="email-address"
            autoCapitalize="none"
            error={error}
            leftIcon={<Mail size={18} color="#9C9BA2" />}
          />

          {/* Send Verification Code CTA */}
          <View className="mt-4 mb-6">
            <Button
              title="Send Verification Code"
              onPress={handleSendCode}
              loading={loading}
              variant="primary"
              size="lg"
              rightIcon={<ArrowRight size={18} color="#070617" />}
            />
          </View>

          {/* Back to Sign In Link */}
          <View className="flex-row items-center justify-center mt-auto pb-4">
            <TouchableOpacity onPress={() => router.push("/(auth)/sign-in")}>
              <Text
                style={{ fontFamily: "PlusJakartaSans-SemiBold" }}
                className="text-xs text-dark"
              >
                Back to Sign in
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
