// app/(auth)/otp-verification.tsx – 6-digit OTP verification matching Penpot Design
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { AlertCircle, ArrowRight, HelpCircle } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { OtpInput } from "../../components/ui/OtpInput";
import { Button } from "../../components/ui/Button";
import { ScreenHeader } from "../../components/ui/ScreenHeader";

export default function OtpVerificationScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const email = (params.email as string) || "davinder2038@gmail.com";

  const [otp, setOtp] = useState("");
  const [countdown, setCountdown] = useState(20);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [attempts, setAttempts] = useState(0);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleVerifyOtp = () => {
    if (otp.length < 6) {
      setError(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    setLoading(true);
    setError(false);

    setTimeout(() => {
      setLoading(false);
      // Demo: code 123456 or any 6 digits succeeds
      if (otp === "000000") {
        setError(true);
        setAttempts((prev) => prev + 1);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        router.push("/(auth)/reset-password");
      }
    }, 800);
  };

  const handleResend = () => {
    if (countdown === 0) {
      setCountdown(20);
      setError(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
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
          {/* Header Title & Subtitle */}
          <View className="my-4">
            <Text
              style={{ fontFamily: "PlusJakartaSans-Bold" }}
              className="text-2xl text-dark tracking-tight mb-2"
            >
              Check your email
            </Text>
            <Text
              style={{ fontFamily: "PlusJakartaSans-Regular" }}
              className="text-sm text-dark-muted leading-relaxed"
            >
              We sent a 6-digit code to{"\n"}
              <Text
                style={{ fontFamily: "PlusJakartaSans-Bold" }}
                className="text-dark"
              >
                {email}
              </Text>
              . It expires in 10 minutes.
            </Text>
          </View>

          {/* 6-Digit OTP Box */}
          <OtpInput
            length={6}
            value={otp}
            onChange={(val) => {
              setOtp(val);
              if (error) setError(false);
            }}
            error={error}
          />

          {/* Error Message Box from Penpot Design */}
          {error && (
            <View className="bg-alert-bg border border-alert/30 p-3.5 rounded-2xl mb-4">
              <View className="flex-row items-center mb-1">
                <AlertCircle size={16} color="#FF4343" className="mr-2" />
                <Text
                  style={{ fontFamily: "PlusJakartaSans-Bold" }}
                  className="text-xs text-alert ml-1.5"
                >
                  Oops that did not match
                </Text>
              </View>
              <Text
                style={{ fontFamily: "PlusJakartaSans-Regular" }}
                className="text-xs text-alert leading-relaxed"
              >
                Incorrect code. Please try again (Attempt {attempts + 1} of 5).
              </Text>
            </View>
          )}

          {/* Resend Timer Row */}
          <View className="flex-row items-center justify-between my-2">
            <Text
              style={{ fontFamily: "PlusJakartaSans-Regular" }}
              className="text-xs text-dark-muted"
            >
              Didn't receive the code?
            </Text>
            {countdown > 0 ? (
              <Text
                style={{ fontFamily: "PlusJakartaSans-SemiBold" }}
                className="text-xs text-muted"
              >
                Resend OTP in {countdown}s
              </Text>
            ) : (
              <TouchableOpacity onPress={handleResend}>
                <Text
                  style={{ fontFamily: "PlusJakartaSans-Bold" }}
                  className="text-xs text-primary-dark underline"
                >
                  Resend OTP
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Spam Hint Banner */}
          <View className="flex-row items-center bg-white p-3 rounded-2xl border border-border-light my-4">
            <HelpCircle size={16} color="#9C9BA2" className="mr-2" />
            <Text
              style={{ fontFamily: "PlusJakartaSans-Regular" }}
              className="text-xs text-dark-muted ml-2 flex-1"
            >
              Check your spam folder or tap Resend if you don't see it.
            </Text>
          </View>

          {/* Continue CTA */}
          <View className="mt-4 mb-6">
            <Button
              title={error ? "Try Again" : "Continue"}
              onPress={handleVerifyOtp}
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
