// app/(auth)/sign-in.tsx – 100% exact match to reference screen design
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
import { GoogleIcon, AppleIcon } from "../../components/ui/SocialIcons";
import { useAuth } from "../../hooks/useAuth";

export default function SignInScreen() {
  const router = useRouter();
  const { signIn, rememberMe, setRememberMe } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSignIn = async () => {
    if (!email.trim()) {
      setError("Please enter your email address");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }

    setLoading(true);
    setError("");

    try {
      await signIn(email.trim(), password);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace("/(tabs)/home");
    } catch (err) {
      setError("Invalid credentials. Please try again.");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
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
            paddingBottom: 24,
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
            <View style={{ alignItems: "center", marginBottom: 28 }}>
              <Text
                style={{
                  fontFamily: "PlusJakartaSans-Bold",
                  fontSize: 22,
                  color: "#1E1D2E",
                  textAlign: "center",
                  marginBottom: 6,
                }}
              >
                Sign in
              </Text>
              <Text
                style={{
                  fontFamily: "PlusJakartaSans-Regular",
                  fontSize: 13,
                  color: "#6A6A74",
                  textAlign: "center",
                  lineHeight: 19,
                }}
              >
                {"Sign in to your account to keep track of your\npoints and rewards"}
              </Text>
            </View>

            {/* Email Field */}
            <View style={{ marginBottom: 18 }}>
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
                  height: 52,
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
                    fontSize: 15,
                    color: "#070617",
                    padding: 0,
                  }}
                  value={email}
                  onChangeText={(text) => {
                    setEmail(text);
                    setError("");
                  }}
                  placeholder=""
                  placeholderTextColor="#9CA3AF"
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
              </View>
            </View>

            {/* Password Field */}
            <View style={{ marginBottom: 14 }}>
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
                  height: 52,
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
                    fontSize: 15,
                    color: "#070617",
                    flex: 1,
                    padding: 0,
                  }}
                  value={password}
                  onChangeText={(text) => {
                    setPassword(text);
                    setError("");
                  }}
                  placeholder=""
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

            {/* Remember Me & Forgot Password Row */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 14,
              }}
            >
              <TouchableOpacity
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setRememberMe(!rememberMe);
                }}
                activeOpacity={0.7}
                style={{ flexDirection: "row", alignItems: "center" }}
              >
                <View
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: 6,
                    borderWidth: 1.5,
                    borderColor: rememberMe ? "#00A3FF" : "#9CA3AF",
                    backgroundColor: rememberMe ? "#00A3FF" : "transparent",
                    alignItems: "center",
                    justifyContent: "center",
                    marginRight: 8,
                  }}
                >
                  {rememberMe && <Check size={13} color="#FFFFFF" strokeWidth={3} />}
                </View>
                <Text
                  style={{
                    fontFamily: "PlusJakartaSans-Regular",
                    fontSize: 13,
                    color: "#4B5563",
                  }}
                >
                  Remember me
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => router.push("/(auth)/forgot-password")}
                activeOpacity={0.7}
              >
                <Text
                  style={{
                    fontFamily: "PlusJakartaSans-Medium",
                    fontSize: 13,
                    color: "#00A3FF",
                  }}
                >
                  Forgot Password?
                </Text>
              </TouchableOpacity>
            </View>

            {/* Terms & Conditions Checkbox Row */}
            <TouchableOpacity
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setTermsAccepted(!termsAccepted);
              }}
              activeOpacity={0.7}
              style={{
                flexDirection: "row",
                alignItems: "flex-start",
                marginBottom: 22,
              }}
            >
              <View
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: 6,
                  borderWidth: 1.5,
                  borderColor: termsAccepted ? "#00A3FF" : "#9CA3AF",
                  backgroundColor: termsAccepted ? "#00A3FF" : "transparent",
                  alignItems: "center",
                  justifyContent: "center",
                  marginRight: 8,
                  marginTop: 1,
                }}
              >
                {termsAccepted && <Check size={13} color="#FFFFFF" strokeWidth={3} />}
              </View>
              <Text
                style={{
                  fontFamily: "PlusJakartaSans-Regular",
                  fontSize: 13,
                  color: "#6A6A74",
                  flex: 1,
                  lineHeight: 18,
                }}
              >
                I accept to{" "}
                <Text
                  onPress={(e) => {
                    e.stopPropagation();
                    router.push("/legal/privacy");
                  }}
                  style={{
                    fontFamily: "PlusJakartaSans-Medium",
                    color: "#00A3FF",
                  }}
                >
                  Terms & Conditions
                </Text>{" "}
                and{" "}
                <Text
                  onPress={(e) => {
                    e.stopPropagation();
                    router.push("/legal/privacy");
                  }}
                  style={{
                    fontFamily: "PlusJakartaSans-Medium",
                    color: "#00A3FF",
                  }}
                >
                  Privacy Policy
                </Text>
              </Text>
            </TouchableOpacity>

            {/* Error Message */}
            {error ? (
              <Text
                style={{
                  fontFamily: "PlusJakartaSans-Medium",
                  fontSize: 13,
                  color: "#FF4343",
                  marginBottom: 12,
                  textAlign: "center",
                }}
              >
                {error}
              </Text>
            ) : null}

            {/* Sign in CTA Button */}
            <TouchableOpacity
              onPress={handleSignIn}
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
                  Sign in
                </Text>
              )}
            </TouchableOpacity>

            {/* OR Divider */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginVertical: 20,
              }}
            >
              <View style={{ flex: 1, height: 1, backgroundColor: "#E5E7EB" }} />
              <Text
                style={{
                  fontFamily: "PlusJakartaSans-Regular",
                  fontSize: 13,
                  color: "#6A6A74",
                  paddingHorizontal: 16,
                }}
              >
                OR
              </Text>
              <View style={{ flex: 1, height: 1, backgroundColor: "#E5E7EB" }} />
            </View>

            {/* Social SSO: Continue with Google */}
            <TouchableOpacity
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.replace("/(tabs)/home");
              }}
              activeOpacity={0.8}
              style={{
                height: 50,
                backgroundColor: "#FFFFFF",
                borderWidth: 1,
                borderColor: "#E5E7EB",
                borderRadius: 14,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 12,
              }}
            >
              <GoogleIcon size={20} />
              <Text
                style={{
                  fontFamily: "PlusJakartaSans-Medium",
                  fontSize: 14,
                  color: "#374151",
                  marginLeft: 10,
                }}
              >
                Continue with Google
              </Text>
            </TouchableOpacity>

            {/* Social SSO: Continue with Apple */}
            <TouchableOpacity
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.replace("/(tabs)/home");
              }}
              activeOpacity={0.8}
              style={{
                height: 50,
                backgroundColor: "#FFFFFF",
                borderWidth: 1,
                borderColor: "#E5E7EB",
                borderRadius: 14,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 20,
              }}
            >
              <AppleIcon size={20} color="#000000" />
              <Text
                style={{
                  fontFamily: "PlusJakartaSans-Medium",
                  fontSize: 14,
                  color: "#374151",
                  marginLeft: 10,
                }}
              >
                Continue with Apple
              </Text>
            </TouchableOpacity>
          </View>

          {/* Footer: New to PointzPlus? Register */}
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
              New to PointzPlus?{" "}
            </Text>
            <TouchableOpacity
              onPress={() => router.push("/(auth)/register")}
              activeOpacity={0.7}
            >
              <Text
                style={{
                  fontFamily: "PlusJakartaSans-SemiBold",
                  fontSize: 14,
                  color: "#00A3FF",
                }}
              >
                Register
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
