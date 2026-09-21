// app/(auth)/password-success.tsx – Password Reset Success screen matching Penpot Design
import React from "react";
import { View, Text } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Check, ArrowRight } from "lucide-react-native";
import { Button } from "../../components/ui/Button";

export default function PasswordSuccessScreen() {
  const router = useRouter();

  return (
    <SafeAreaView className="flex-1 bg-light-bg justify-between px-6 py-6">
      <View className="flex-1 items-center justify-center px-4">
        {/* Success Check Badge */}
        <View className="w-32 h-32 rounded-full bg-ice-dark items-center justify-center mb-8 border border-border-blue">
          <LinearGradient
            colors={["#02EFF4", "#01A2FB"]}
            className="w-20 h-20 rounded-full items-center justify-center shadow-lg"
          >
            <Check size={40} color="#070617" strokeWidth={3} />
          </LinearGradient>
        </View>

        {/* Title from Penpot */}
        <Text
          style={{ fontFamily: "PlusJakartaSans-ExtraBold" }}
          className="text-2xl text-dark text-center mb-3 tracking-tight"
        >
          Password Created Successfully!
        </Text>

        <Text
          style={{ fontFamily: "PlusJakartaSans-Regular" }}
          className="text-sm text-dark-muted text-center leading-relaxed max-w-[290px] mb-4"
        >
          Great job! Your password has been set and your account is ready.
        </Text>

        <View className="bg-white p-4 rounded-2xl border border-border-light w-full">
          <Text
            style={{ fontFamily: "PlusJakartaSans-Medium" }}
            className="text-xs text-dark-muted text-center leading-relaxed"
          >
            You can now sign in to PointzPlus using your email & new password.
          </Text>
        </View>
      </View>

      <View className="w-full pb-4">
        <Button
          title="Go to Sign In"
          onPress={() => router.replace("/(auth)/sign-in")}
          variant="primary"
          size="lg"
          rightIcon={<ArrowRight size={18} color="#070617" />}
        />
      </View>
    </SafeAreaView>
  );
}
