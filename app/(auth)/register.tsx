// app/(auth)/register.tsx – 100% exact match to reference screen design
import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Eye, EyeOff, Check } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { PointzPlusLogo } from "../../components/ui/PointzPlusLogo";
import { useAuthStore } from "../../store/authStore";

export default function RegisterScreen() {
  const router = useRouter();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const passwordRules = [
    { label: "Use 8+ characters", valid: password.length >= 8 },
    { label: "At least one number", valid: /[0-9]/.test(password) },
    { label: "At least one uppercase letter", valid: /[A-Z]/.test(password) },
    {
      label: "At least one special character",
      valid: /[^A-Za-z0-9]/.test(password),
    },
  ];

  const isPasswordValid = passwordRules.every((r) => r.valid);

  const handleRegister = async () => {
    if (!firstName.trim()) {
      setError("Please enter your first name");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }

    if (!email.trim() || !email.includes("@")) {
      setError("Please enter a valid email address");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }

    if (!isPasswordValid) {
      setError("Password must fulfill all requirements below");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();
      await useAuthStore.getState().register(email.trim(), password, fullName);
      setLoading(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace("/(tabs)/home");
    } catch (err) {
      setLoading(false);
      // Surface the real reason (duplicate email, weak password, unreachable
      // API) instead of a generic message that hides the actual cause.
      setError(
        err instanceof Error && err.message
          ? err.message
          : "Registration failed. Please try again."
      );
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#FFFFFF" }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            paddingHorizontal: 24,
            paddingTop: 12,
            paddingBottom: Platform.OS === "web" ? 44 : 24,
            justifyContent: "space-between",
          }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View>
            {/* Top Logo */}
            <View style={{ alignItems: "center", marginTop: 8, marginBottom: 16 }}>
              <PointzPlusLogo width={170} height={116} />
            </View>

            {/* Title & Subtitle */}
            <View style={{ alignItems: "center", marginBottom: 24 }}>
              <Text
                style={{
                  fontFamily: "PlusJakartaSans-Bold",
                  fontSize: 22,
                  color: "#1E1D2E",
                  textAlign: "center",
                  marginBottom: 6,
                }}
              >
                Create Account
              </Text>
              <Text
                style={{
                  fontFamily: "PlusJakartaSans-Regular",
                  fontSize: 13,
                  color: "#6A6A74",
                  textAlign: "center",
                }}
              >
                Fill in the details to get started
              </Text>
            </View>

            {/* First Name & Last Name (2 Column Row) */}
            <View
              style={{
                flexDirection: "row",
                gap: 12,
                marginBottom: 16,
              }}
            >
              {/* First Name */}
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontFamily: "PlusJakartaSans-Medium",
                    fontSize: 14,
                    color: "#374151",
                    marginBottom: 8,
                  }}
                >
                  First name
                </Text>
                <View
                  style={{
                    height: 50,
                    backgroundColor: "#FFFFFF",
                    borderWidth: 1,
                    borderColor: "#E5E7EB",
                    borderRadius: 14,
                    paddingHorizontal: 14,
                    justifyContent: "center",
                  }}
                >
                  <TextInput
                    style={{
                      fontFamily: "PlusJakartaSans-Regular",
                      fontSize: 14,
                      color: "#070617",
                      padding: 0,
                    }}
                    value={firstName}
                    onChangeText={(text) => {
                      setFirstName(text);
                      setError("");
                    }}
                    placeholder="Enter first name"
                    placeholderTextColor="#9CA3AF"
                    autoCapitalize="words"
                  />
                </View>
              </View>

              {/* Last Name */}
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontFamily: "PlusJakartaSans-Medium",
                    fontSize: 14,
                    color: "#374151",
                    marginBottom: 8,
                  }}
                >
                  Last name
                </Text>
                <View
                  style={{
                    height: 50,
                    backgroundColor: "#FFFFFF",
                    borderWidth: 1,
                    borderColor: "#E5E7EB",
                    borderRadius: 14,
                    paddingHorizontal: 14,
                    justifyContent: "center",
                  }}
                >
                  <TextInput
                    style={{
                      fontFamily: "PlusJakartaSans-Regular",
                      fontSize: 14,
                      color: "#070617",
                      padding: 0,
                    }}
                    value={lastName}
                    onChangeText={(text) => {
                      setLastName(text);
                      setError("");
                    }}
                    placeholder="Enter Last name"
                    placeholderTextColor="#9CA3AF"
                    autoCapitalize="words"
                  />
                </View>
              </View>
            </View>

            {/* Email Field */}
            <View style={{ marginBottom: 16 }}>
              <Text
                style={{
                  fontFamily: "PlusJakartaSans-Medium",
                  fontSize: 14,
                  color: "#374151",
                  marginBottom: 8,
                }}
              >
                Email
              </Text>
              <View
                style={{
                  height: 50,
                  backgroundColor: "#FFFFFF",
                  borderWidth: 1,
                  borderColor: error && !email ? "#FF4343" : "#E5E7EB",
                  borderRadius: 14,
                  paddingHorizontal: 16,
                  justifyContent: "center",
                }}
              >
                <TextInput
                  style={{
                    fontFamily: "PlusJakartaSans-Regular",
                    fontSize: 14,
                    color: "#070617",
                    padding: 0,
                  }}
                  value={email}
                  onChangeText={(text) => {
                    setEmail(text);
                    setError("");
                  }}
                  placeholder="Enter your email"
                  placeholderTextColor="#9CA3AF"
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
              </View>
            </View>

            {/* Password Field */}
            <View style={{ marginBottom: 12 }}>
              <Text
                style={{
                  fontFamily: "PlusJakartaSans-Medium",
                  fontSize: 14,
                  color: "#374151",
                  marginBottom: 8,
                }}
              >
                Password
              </Text>
              <View
                style={{
                  height: 50,
                  backgroundColor: "#FFFFFF",
                  borderWidth: 1,
                  borderColor: "#E5E7EB",
                  borderRadius: 14,
                  paddingHorizontal: 16,
                  flexDirection: "row",
                  alignItems: "center",
                }}
              >
                <TextInput
                  style={{
                    fontFamily: "PlusJakartaSans-Regular",
                    fontSize: 14,
                    color: "#070617",
                    flex: 1,
                    padding: 0,
                  }}
                  value={password}
                  onChangeText={(text) => {
                    setPassword(text);
                    setError("");
                  }}
                  placeholder="Enter Password"
                  placeholderTextColor="#9CA3AF"
                  secureTextEntry={!showPassword}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  style={{ marginLeft: 8 }}
                >
                  {showPassword ? (
                    <Eye size={20} color="#6A6A74" />
                  ) : (
                    <EyeOff size={20} color="#6A6A74" />
                  )}
                </TouchableOpacity>
              </View>
            </View>

            {/* Password Requirements Checklist */}
            <View style={{ marginBottom: 18, paddingLeft: 2 }}>
              {passwordRules.map((rule, idx) => (
                <View
                  key={idx}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    marginVertical: 4,
                  }}
                >
                  <View
                    style={{
                      width: 18,
                      height: 18,
                      borderRadius: 9,
                      borderWidth: 1.5,
                      borderColor: rule.valid ? "#10B981" : "#6A6A74",
                      backgroundColor: rule.valid ? "#10B981" : "transparent",
                      alignItems: "center",
                      justifyContent: "center",
                      marginRight: 10,
                    }}
                  >
                    {rule.valid && (
                      <Check size={11} color="#FFFFFF" strokeWidth={3} />
                    )}
                  </View>
                  <Text
                    style={{
                      fontFamily: rule.valid
                        ? "PlusJakartaSans-Medium"
                        : "PlusJakartaSans-Regular",
                      fontSize: 13,
                      color: rule.valid ? "#111827" : "#6A6A74",
                    }}
                  >
                    {rule.label}
                  </Text>
                </View>
              ))}
            </View>

            {/* Confirm Password Field */}
            <View style={{ marginBottom: 24 }}>
              <Text
                style={{
                  fontFamily: "PlusJakartaSans-Medium",
                  fontSize: 14,
                  color: "#374151",
                  marginBottom: 8,
                }}
              >
                Confirm Password
              </Text>
              <View
                style={{
                  height: 50,
                  backgroundColor: "#FFFFFF",
                  borderWidth: 1,
                  borderColor:
                    confirmPassword && password !== confirmPassword
                      ? "#FF4343"
                      : "#E5E7EB",
                  borderRadius: 14,
                  paddingHorizontal: 16,
                  flexDirection: "row",
                  alignItems: "center",
                }}
              >
                <TextInput
                  style={{
                    fontFamily: "PlusJakartaSans-Regular",
                    fontSize: 14,
                    color: "#070617",
                    flex: 1,
                    padding: 0,
                  }}
                  value={confirmPassword}
                  onChangeText={(text) => {
                    setConfirmPassword(text);
                    setError("");
                  }}
                  placeholder="Enter confirm Password"
                  placeholderTextColor="#9CA3AF"
                  secureTextEntry={!showConfirmPassword}
                />
                <TouchableOpacity
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  style={{ marginLeft: 8 }}
                >
                  {showConfirmPassword ? (
                    <Eye size={20} color="#6A6A74" />
                  ) : (
                    <EyeOff size={20} color="#6A6A74" />
                  )}
                </TouchableOpacity>
              </View>
            </View>

            {/* Error Message */}
            {error ? (
              <Text
                style={{
                  fontFamily: "PlusJakartaSans-Medium",
                  fontSize: 13,
                  color: "#FF4343",
                  marginBottom: 14,
                  textAlign: "center",
                }}
              >
                {error}
              </Text>
            ) : null}

            {/* Create Account CTA Button */}
            <TouchableOpacity
              onPress={handleRegister}
              disabled={loading}
              activeOpacity={0.85}
              style={{
                height: 52,
                backgroundColor: "#00A3FF",
                borderRadius: 14,
                alignItems: "center",
                justifyContent: "center",
                shadowColor: "#00A3FF",
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.25,
                shadowRadius: 8,
                elevation: 3,
                marginBottom: 20,
              }}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text
                  style={{
                    fontFamily: "PlusJakartaSans-Bold",
                    fontSize: 16,
                    color: "#FFFFFF",
                  }}
                >
                  Create Account
                </Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Footer: Already have an account? Sign in */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              paddingVertical: 12,
            }}
          >
            <Text
              style={{
                fontFamily: "PlusJakartaSans-Regular",
                fontSize: 14,
                color: "#6A6A74",
              }}
            >
              Already have an account?{" "}
            </Text>
            <TouchableOpacity
              onPress={() => router.push("/(auth)/sign-in")}
              activeOpacity={0.7}
            >
              <Text
                style={{
                  fontFamily: "PlusJakartaSans-SemiBold",
                  fontSize: 14,
                  color: "#00A3FF",
                }}
              >
                Sign in
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
