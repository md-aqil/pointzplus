// app/add-account.tsx – Redirected to Gmail Auto-Sync
import React, { useEffect } from "react";
import { View, Text, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";

export default function AddAccountScreen() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/email-sync");
  }, []);

  return (
    <View className="flex-1 bg-light-bg items-center justify-center">
      <ActivityIndicator size="small" color="#01A2FB" />
      <Text
        style={{ fontFamily: "PlusJakartaSans-Medium" }}
        className="text-xs text-dark-muted mt-2"
      >
        Redirecting to Gmail Auto-Sync...
      </Text>
    </View>
  );
}
