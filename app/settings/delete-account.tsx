// app/settings/delete-account.tsx – Delete Account survey and confirmation matching Penpot Design
import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  AlertTriangle,
  CheckSquare,
  Square,
  Trash2,
} from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { ScreenHeader } from "../../components/ui/ScreenHeader";
import { Button } from "../../components/ui/Button";
import { useAuth } from "../../hooks/useAuth";

const REASONS = [
  "Missing programs or features I need",
  "Too many emails or notifications",
  "Privacy or security concerns",
  "Other (please specify)",
];

export default function DeleteAccountScreen() {
  const router = useRouter();
  const { signOut } = useAuth();

  const [selectedReason, setSelectedReason] = useState<string | null>(null);
  const [feedback, setFeedback] = useState("");
  const [loading, setLoading] = useState(false);

  const handleDelete = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);

    Alert.alert(
      "Permanent Deletion",
      "Are you absolutely sure? All your linked programs and point tracking data will be permanently wiped.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete My Account",
          style: "destructive",
          onPress: async () => {
            setLoading(true);
            setTimeout(async () => {
              setLoading(false);
              await signOut();
              router.replace("/(auth)/sign-in");
            }, 1000);
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-light-bg">
      <ScreenHeader
        title="Delete Account"
        onBack={() => router.back()}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 60 }}
        className="px-5 pt-2"
      >
        {/* Warning Banner matching Penpot */}
        <View className="bg-alert-bg border border-alert/30 p-5 rounded-3xl mb-6">
          <View className="flex-row items-center mb-2">
            <AlertTriangle size={20} color="#FF4343" className="mr-2" />
            <Text
              style={{ fontFamily: "PlusJakartaSans-Bold" }}
              className="text-sm text-alert ml-1.5"
            >
              Are you sure you want to delete your account?
            </Text>
          </View>
          <Text
            style={{ fontFamily: "PlusJakartaSans-Regular" }}
            className="text-xs text-alert leading-relaxed"
          >
            This action is permanent and cannot be undone. You will lose access
            to all your points data, program links, and alert history.
          </Text>
        </View>

        {/* Survey Reasons from Penpot */}
        <Text
          style={{ fontFamily: "PlusJakartaSans-Bold" }}
          className="text-xs text-dark-muted uppercase tracking-wider mb-3 ml-1"
        >
          Why are you leaving?
        </Text>

        <View className="bg-white rounded-3xl border border-border-light shadow-sm p-4 mb-5 space-y-3">
          {REASONS.map((reason) => {
            const isSelected = selectedReason === reason;
            return (
              <TouchableOpacity
                key={reason}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setSelectedReason(reason);
                }}
                activeOpacity={0.8}
                className="flex-row items-center py-2 space-x-3"
              >
                {isSelected ? (
                  <CheckSquare size={20} color="#FF4343" />
                ) : (
                  <Square size={20} color="#9C9BA2" />
                )}
                <Text
                  style={{
                    fontFamily: isSelected
                      ? "PlusJakartaSans-SemiBold"
                      : "PlusJakartaSans-Regular",
                  }}
                  className={`text-xs ml-2 flex-1 ${
                    isSelected ? "text-dark" : "text-dark-muted"
                  }`}
                >
                  {reason}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Optional Feedback Input */}
        <Text
          style={{ fontFamily: "PlusJakartaSans-Bold" }}
          className="text-xs text-dark-muted uppercase tracking-wider mb-3 ml-1"
        >
          Tell us more (optional)
        </Text>

        <View className="bg-white rounded-3xl border border-border-light shadow-sm p-4 mb-6">
          <TextInput
            style={{
              fontFamily: "PlusJakartaSans-Regular",
              fontSize: 13,
              color: "#070617",
              minHeight: 80,
              textAlignVertical: "top",
            }}
            placeholder="Share any additional feedback..."
            placeholderTextColor="#9C9BA2"
            value={feedback}
            onChangeText={setFeedback}
            multiline
          />
        </View>

        {/* Actions */}
        <Button
          title="Delete Account"
          onPress={handleDelete}
          loading={loading}
          variant="alert"
          size="lg"
          leftIcon={<Trash2 size={18} color="#FFFFFF" />}
        />

        <View className="mt-3">
          <Button
            title="Cancel"
            onPress={() => router.back()}
            variant="outline"
            size="md"
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
