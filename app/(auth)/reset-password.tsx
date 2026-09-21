// app/(auth)/reset-password.tsx – Set New Password screen matching Penpot Design
import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Lock, ShieldCheck, ArrowRight } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { Input } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";
import { PasswordChecklist } from "../../components/ui/PasswordChecklist";
import { ScreenHeader } from "../../components/ui/ScreenHeader";

export default function ResetPasswordScreen() {
  const router = useRouter();

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const isPasswordValid =
    newPassword.length >= 8 &&
    /[0-9]/.test(newPassword) &&
    /[A-Z]/.test(newPassword) &&
    /[^A-Za-z0-9]/.test(newPassword);

  const handleUpdatePassword = () => {
    if (!isPasswordValid) {
      setError("Please fulfill all password security rules below");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    setLoading(true);
    setError("");

    setTimeout(() => {
      setLoading(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.push("/(auth)/password-success");
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
          className="px-6 py-2"
        >
          {/* Header Title & Subtitle from Penpot */}
          <View className="mb-4">
            <Text
              style={{ fontFamily: "PlusJakartaSans-Bold" }}
              className="text-2xl text-dark tracking-tight mb-2"
            >
              Set new Password
            </Text>
            <Text
              style={{ fontFamily: "PlusJakartaSans-Regular" }}
              className="text-sm text-dark-muted leading-relaxed"
            >
              Use at least 8 characters, with numbers and special characters.
            </Text>
          </View>

          {/* Form Inputs */}
          <View className="space-y-1 mb-2">
            <Input
              label="Password"
              placeholder="Enter new password"
              value={newPassword}
              onChangeText={(t) => {
                setNewPassword(t);
                setError("");
              }}
              isPassword
              leftIcon={<Lock size={18} color="#9C9BA2" />}
            />

            <Input
              label="Confirm Password"
              placeholder="Enter new password again"
              value={confirmPassword}
              onChangeText={(t) => {
                setConfirmPassword(t);
                setError("");
              }}
              isPassword
              leftIcon={<Lock size={18} color="#9C9BA2" />}
            />
          </View>

          {/* Real-time Checklist */}
          <PasswordChecklist password={newPassword} />

          {/* Security Guarantee Note from Penpot */}
          <View className="flex-row items-center bg-ice p-3 rounded-2xl border border-border-blue my-2">
            <ShieldCheck size={16} color="#01A2FB" className="mr-2" />
            <Text
              style={{ fontFamily: "PlusJakartaSans-Regular" }}
              className="text-xs text-dark-muted ml-2 flex-1"
            >
              Your password is encrypted and stored securely.
            </Text>
          </View>

          {error ? (
            <Text
              style={{ fontFamily: "PlusJakartaSans-Medium" }}
              className="text-xs text-alert my-2 text-center"
            >
              {error}
            </Text>
          ) : null}

          {/* Update Password CTA */}
          <View className="mt-4 mb-6">
            <Button
              title="Update Password"
              onPress={handleUpdatePassword}
              loading={loading}
              variant="primary"
              size="lg"
              rightIcon={<ArrowRight size={18} color="#070617" />}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
