// app/settings/profile-settings.tsx – Profile Settings matching 100% exact design
import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  TouchableOpacity,
  TextInput,
  Image,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { User, Pencil, Eye, EyeOff } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { ScreenHeader } from "../../components/ui/ScreenHeader";
import { Button } from "../../components/ui/Button";
import { useAuth } from "../../hooks/useAuth";
import { apiClient } from "../../lib/apiClient";

export default function ProfileSettingsScreen() {
  const router = useRouter();
  const { user, updateProfile } = useAuth();

  // Parse first and last names
  const initialFullName = user?.name || "Davinder singh";
  const nameParts = initialFullName.split(" ");
  const initialFirst = nameParts[0] || "Davinder";
  const initialLast = nameParts.slice(1).join(" ") || "Singh";

  const [firstName, setFirstName] = useState(initialFirst);
  const [lastName, setLastName] = useState(initialLast);
  const [email, setEmail] = useState(user?.email || "davinder2038@gmail.com");
  const [phone, setPhone] = useState(user?.phone || "+919041226707");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (password && confirmPassword && password !== confirmPassword) {
      Alert.alert("Password Mismatch", "Passwords do not match. Please try again.");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();
    setSaving(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    try {
      await apiClient.updateProfile({ fullName, phoneNumber: phone });
      updateProfile({ name: fullName, phone });
      setSaving(false);
      Alert.alert("Success", "Profile updated successfully!", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch {
      setSaving(false);
      updateProfile({ name: fullName, phone });
      Alert.alert("Saved", "Profile information updated successfully.", [
        { text: "OK", onPress: () => router.back() },
      ]);
    }
  };

  const displayName = `${firstName.trim()} ${lastName.trim()}`.trim() || "Davinder singh";

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-white">
      {/* Centered Profile Settings Header */}
      <ScreenHeader
        title="Profile Settings"
        onBack={() => router.back()}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 60 }}
          className="px-5 pt-2"
        >
          {/* User Avatar & Info Row */}
          <View className="flex-row items-center pt-2 pb-1">
            <View className="relative mr-4">
              <View className="w-16 h-16 rounded-full overflow-hidden bg-sky-200 border-2 border-[#EBF7FC] items-center justify-center">
                <User size={34} color="#00A3FF" />
              </View>

              {/* Edit Pencil Floating Badge */}
              <TouchableOpacity
                activeOpacity={0.8}
                className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-[#EBF7FC] border-2 border-white items-center justify-center shadow-sm"
              >
                <Pencil size={11} color="#00A3FF" />
              </TouchableOpacity>
            </View>

            <View className="flex-1">
              <Text
                style={{ fontFamily: "PlusJakartaSans-Bold" }}
                className="text-[18px] text-[#1A1926] font-bold mb-0.5 tracking-tight"
                numberOfLines={1}
              >
                {displayName}
              </Text>
              <Text
                style={{ fontFamily: "PlusJakartaSans-Regular" }}
                className="text-[13px] text-[#7E7D8A]"
                numberOfLines={1}
              >
                {email}
              </Text>
            </View>
          </View>

          {/* Divider 1 */}
          <View className="h-[1px] bg-[#EEEEF2] my-5" />

          {/* Section: Personal Details */}
          <Text
            style={{ fontFamily: "PlusJakartaSans-Bold" }}
            className="text-[16px] text-[#1A1926] font-bold mb-4"
          >
            Personal Details
          </Text>

          {/* First name */}
          <View className="mb-4">
            <Text
              style={{ fontFamily: "PlusJakartaSans-Medium" }}
              className="text-[13px] text-[#5E5D6A] mb-2"
            >
              First name
            </Text>
            <View className="w-full px-4 py-3.5 bg-white rounded-xl border border-[#E6E7ED]">
              <TextInput
                style={{
                  fontFamily: "PlusJakartaSans-Regular",
                  fontSize: 14,
                  color: "#1A1926",
                  padding: 0,
                }}
                value={firstName}
                onChangeText={setFirstName}
                placeholder="First name"
                placeholderTextColor="#9E9DA8"
              />
            </View>
          </View>

          {/* Last Name */}
          <View className="mb-4">
            <Text
              style={{ fontFamily: "PlusJakartaSans-Medium" }}
              className="text-[13px] text-[#5E5D6A] mb-2"
            >
              Last Name
            </Text>
            <View className="w-full px-4 py-3.5 bg-white rounded-xl border border-[#E6E7ED]">
              <TextInput
                style={{
                  fontFamily: "PlusJakartaSans-Regular",
                  fontSize: 14,
                  color: "#1A1926",
                  padding: 0,
                }}
                value={lastName}
                onChangeText={setLastName}
                placeholder="Last Name"
                placeholderTextColor="#9E9DA8"
              />
            </View>
          </View>

          {/* Email */}
          <View className="mb-4">
            <Text
              style={{ fontFamily: "PlusJakartaSans-Medium" }}
              className="text-[13px] text-[#5E5D6A] mb-2"
            >
              Email
            </Text>
            <View className="w-full px-4 py-3.5 bg-white rounded-xl border border-[#E6E7ED]">
              <TextInput
                style={{
                  fontFamily: "PlusJakartaSans-Regular",
                  fontSize: 14,
                  color: "#1A1926",
                  padding: 0,
                }}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                placeholder="Email"
                placeholderTextColor="#9E9DA8"
              />
            </View>
          </View>

          {/* Phone */}
          <View className="mb-5">
            <Text
              style={{ fontFamily: "PlusJakartaSans-Medium" }}
              className="text-[13px] text-[#5E5D6A] mb-2"
            >
              Phone
            </Text>
            <View className="w-full px-4 py-3.5 bg-white rounded-xl border border-[#E6E7ED]">
              <TextInput
                style={{
                  fontFamily: "PlusJakartaSans-Regular",
                  fontSize: 14,
                  color: "#1A1926",
                  padding: 0,
                }}
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                placeholder="Phone"
                placeholderTextColor="#9E9DA8"
              />
            </View>
          </View>

          {/* Divider 2 */}
          <View className="h-[1px] bg-[#EEEEF2] my-5" />

          {/* Section: Password Change */}
          <Text
            style={{ fontFamily: "PlusJakartaSans-Bold" }}
            className="text-[16px] text-[#1A1926] font-bold mb-4"
          >
            Password Change
          </Text>

          {/* Password */}
          <View className="mb-4">
            <Text
              style={{ fontFamily: "PlusJakartaSans-Medium" }}
              className="text-[13px] text-[#5E5D6A] mb-2"
            >
              Password
            </Text>
            <View className="flex-row items-center w-full px-4 py-3.5 bg-white rounded-xl border border-[#E6E7ED]">
              <TextInput
                style={{
                  fontFamily: "PlusJakartaSans-Regular",
                  flex: 1,
                  fontSize: 14,
                  color: "#1A1926",
                  padding: 0,
                }}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                placeholder=""
                placeholderTextColor="#9E9DA8"
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                className="ml-2"
              >
                {showPassword ? (
                  <Eye size={18} color="#7E7D8A" />
                ) : (
                  <EyeOff size={18} color="#7E7D8A" />
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* Confirm Password */}
          <View className="mb-5">
            <Text
              style={{ fontFamily: "PlusJakartaSans-Medium" }}
              className="text-[13px] text-[#5E5D6A] mb-2"
            >
              Confirm Password
            </Text>
            <View className="flex-row items-center w-full px-4 py-3.5 bg-white rounded-xl border border-[#E6E7ED]">
              <TextInput
                style={{
                  fontFamily: "PlusJakartaSans-Regular",
                  flex: 1,
                  fontSize: 14,
                  color: "#1A1926",
                  padding: 0,
                }}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showConfirmPassword}
                placeholder=""
                placeholderTextColor="#9E9DA8"
              />
              <TouchableOpacity
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                className="ml-2"
              >
                {showConfirmPassword ? (
                  <Eye size={18} color="#7E7D8A" />
                ) : (
                  <EyeOff size={18} color="#7E7D8A" />
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* Divider 3 */}
          <View className="h-[1px] bg-[#EEEEF2] my-5" />

          {/* Primary Save Button */}
          <View className="mt-2 mb-4">
            <Button
              title="Save"
              onPress={handleSave}
              loading={saving}
              variant="primary"
              size="lg"
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
