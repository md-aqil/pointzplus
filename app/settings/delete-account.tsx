// app/settings/delete-account.tsx – Delete Account screen matching Penpot Design
import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Trash2,
  Check,
  AlertCircle,
} from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { ScreenHeader } from "../../components/ui/ScreenHeader";
import { Button } from "../../components/ui/Button";
import { useAuth } from "../../hooks/useAuth";
import { apiClient } from "../../lib/apiClient";

const REASONS = [
  "I no longer use the app",
  "I couldn't find the value I expected",
  "Missing programs or features I need",
  "Too many emails or notifications",
  "Privacy or security concerns",
  "Other (please specify)",
];

export default function DeleteAccountScreen() {
  const router = useRouter();
  const { signOut } = useAuth();

  const [selectedReasons, setSelectedReasons] = useState<string[]>([]);
  const [feedback, setFeedback] = useState("");
  const [loading, setLoading] = useState(false);

  const toggleReason = (reason: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedReasons((prev) =>
      prev.includes(reason)
        ? prev.filter((r) => r !== reason)
        : [...prev, reason]
    );
  };

  const handleDelete = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);

    Alert.alert(
      "Permanent Deletion",
      "Are you absolutely sure you want to delete your account? All your linked loyalty accounts, tracked points, and history will be permanently wiped.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete My Account",
          style: "destructive",
          onPress: async () => {
            setLoading(true);
            try {
              await apiClient.deleteCurrentUser();
            } catch (err) {
              setLoading(false);
              Alert.alert(
                "Deletion Failed",
                "We couldn't delete your account right now. Please check your connection and try again."
              );
              return;
            }
            setLoading(false);
            await signOut();
            router.replace("/(auth)/sign-in");
          },
        },
      ]
    );
  };

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/(tabs)/profile");
    }
  };

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-[#F8FAFC]">
      <ScreenHeader
        title="Delete Account"
        onBack={handleBack}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        className="flex-1"
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 120 }}
          className="px-5 pt-4"
        >
          {/* Warning Hero Card */}
          <View className="bg-[#FFF1F2] border border-[#FFE4E6] rounded-3xl p-5 mb-5">
            <View className="flex-row items-center mb-3">
              <View className="w-10 h-10 rounded-2xl bg-[#FFE4E6] items-center justify-center mr-3">
                <Trash2 size={20} color="#E11D48" />
              </View>
              <View className="flex-1">
                <Text
                  style={{ fontFamily: "PlusJakartaSans-Bold" }}
                  className="text-[16px] text-[#881337] leading-tight"
                >
                  Are you sure you want to delete your account?
                </Text>
              </View>
            </View>
            <Text
              style={{ fontFamily: "PlusJakartaSans-Regular" }}
              className="text-[13px] text-[#9F1239] leading-relaxed"
            >
              This action is permanent and cannot be undone. You will lose access to all your tracked loyalty programs, points balance, and expiry alerts.
            </Text>
          </View>

          {/* Survey Card Container */}
          <View className="bg-white rounded-3xl border border-[#E2E8F0] shadow-sm p-5 mb-6">
            <Text
              style={{ fontFamily: "PlusJakartaSans-Bold" }}
              className="text-[15px] text-[#070617] mb-1"
            >
              Help us understand why you're leaving
            </Text>
            <Text
              style={{ fontFamily: "PlusJakartaSans-Regular" }}
              className="text-[13px] text-[#6A6A74] mb-4"
            >
              Your feedback helps us improve PointzPlus for everyone.
            </Text>

            {/* Checkbox Options */}
            <View className="space-y-3">
              {REASONS.map((reason) => {
                const isSelected = selectedReasons.includes(reason);
                return (
                  <TouchableOpacity
                    key={reason}
                    onPress={() => toggleReason(reason)}
                    activeOpacity={0.7}
                    className={`flex-row items-center p-3.5 rounded-2xl border ${
                      isSelected
                        ? "bg-[#FFF5F5] border-[#FF4343]/40"
                        : "bg-[#FAFAFA] border-[#F0F1F5]"
                    }`}
                  >
                    <View
                      className={`w-5 h-5 rounded-md items-center justify-center mr-3 border ${
                        isSelected
                          ? "bg-[#FF4343] border-[#FF4343]"
                          : "bg-white border-[#D1D5DB]"
                      }`}
                    >
                      {isSelected && <Check size={14} color="#FFFFFF" strokeWidth={3} />}
                    </View>
                    <Text
                      style={{
                        fontFamily: isSelected
                          ? "PlusJakartaSans-SemiBold"
                          : "PlusJakartaSans-Medium",
                      }}
                      className={`text-[13.5px] flex-1 ${
                        isSelected ? "text-[#070617]" : "text-[#393845]"
                      }`}
                    >
                      {reason}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Additional Feedback */}
            <View className="mt-5">
              <Text
                style={{ fontFamily: "PlusJakartaSans-SemiBold" }}
                className="text-[13px] text-[#070617] mb-2"
              >
                Tell us more (optional)
              </Text>
              <TextInput
                style={{
                  fontFamily: "PlusJakartaSans-Regular",
                  fontSize: 13.5,
                  color: "#070617",
                  minHeight: 90,
                  textAlignVertical: "top",
                }}
                className="bg-[#FAFAFA] border border-[#E2E8F0] rounded-2xl p-3.5"
                placeholder="Share any additional feedback..."
                placeholderTextColor="#9C9BA2"
                value={feedback}
                onChangeText={setFeedback}
                multiline
              />
            </View>
          </View>

          {/* Action Buttons */}
          <View className="mb-6 space-y-3">
            <TouchableOpacity
              onPress={handleDelete}
              disabled={loading}
              activeOpacity={0.85}
              style={{
                borderRadius: 8,
                backgroundColor: "#FF4343",
                shadowColor: "#01A2FB",
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.16,
                shadowRadius: 12,
                elevation: 4,
              }}
              className="w-full flex-row items-center justify-center py-3.5 px-6"
            >
              {loading ? (
                <Text
                  style={{ fontFamily: "PlusJakartaSans-Bold" }}
                  className="text-white text-[15px]"
                >
                  Deleting...
                </Text>
              ) : (
                <View className="flex-row items-center justify-center" style={{ gap: 10 }}>
                  <Text
                    style={{ fontFamily: "PlusJakartaSans-Bold" }}
                    className="text-white text-[15px] font-bold text-center"
                  >
                    Delete Account
                  </Text>
                  <Trash2 size={18} color="#FFFFFF" />
                </View>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleBack}
              activeOpacity={0.8}
              style={{ borderRadius: 8 }}
              className="w-full py-3.5 bg-white border border-[#E2E8F0] items-center justify-center"
            >
              <Text
                style={{ fontFamily: "PlusJakartaSans-SemiBold" }}
                className="text-[15px] text-[#070617]"
              >
                Keep My Account
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}


