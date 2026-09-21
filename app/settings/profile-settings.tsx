// app/settings/profile-settings.tsx – Profile Settings matching Penpot Design
import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { User, Phone, Mail, Lock, Check } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { ScreenHeader } from "../../components/ui/ScreenHeader";
import { Input } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";
import { useAuth } from "../../hooks/useAuth";

export default function ProfileSettingsScreen() {
  const router = useRouter();
  const { user, updateProfile } = useAuth();

  const [name, setName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSave = () => {
    setSaving(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    setTimeout(() => {
      updateProfile({ name, phone });
      setSaving(false);
      Alert.alert("Success", "Profile updated successfully!", [
        { text: "OK", onPress: () => router.back() },
      ]);
    }, 600);
  };

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-light-bg">
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
          {/* Personal Info Header */}
          <Text
            style={{ fontFamily: "PlusJakartaSans-Bold" }}
            className="text-xs text-dark-muted uppercase tracking-wider mb-3 ml-1"
          >
            Personal Information
          </Text>

          <View className="bg-white p-4 rounded-3xl border border-border-light shadow-sm mb-5 space-y-1">
            <Input
              label="Full Name"
              value={name}
              onChangeText={setName}
              leftIcon={<User size={18} color="#9C9BA2" />}
            />

            <Input
              label="Email Address"
              value={email}
              editable={false}
              leftIcon={<Mail size={18} color="#9C9BA2" />}
            />

            <Input
              label="Phone"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              leftIcon={<Phone size={18} color="#9C9BA2" />}
            />
          </View>

          {/* Password Change Section from Penpot */}
          <Text
            style={{ fontFamily: "PlusJakartaSans-Bold" }}
            className="text-xs text-dark-muted uppercase tracking-wider mb-3 ml-1"
          >
            Password Change
          </Text>

          <View className="bg-white p-4 rounded-3xl border border-border-light shadow-sm mb-6 space-y-1">
            <Input
              label="New Password"
              placeholder="Enter new password"
              value={password}
              onChangeText={setPassword}
              isPassword
              leftIcon={<Lock size={18} color="#9C9BA2" />}
            />

            <Input
              label="Confirm Password"
              placeholder="Confirm new password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              isPassword
              leftIcon={<Lock size={18} color="#9C9BA2" />}
            />
          </View>

          <Button
            title="Save Changes"
            onPress={handleSave}
            loading={saving}
            variant="primary"
            size="lg"
            rightIcon={<Check size={18} color="#070617" />}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
