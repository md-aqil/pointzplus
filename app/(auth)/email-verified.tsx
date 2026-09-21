// app/(auth)/email-verified.tsx – Email Verified Success screen
import React from "react";
import { View, Text } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { CheckCircle2, ArrowRight } from "lucide-react-native";
import { Button } from "../../components/ui/Button";

export default function EmailVerifiedScreen() {
  const router = useRouter();

  return (
    <SafeAreaView className="flex-1 bg-light-bg justify-between px-6 py-6">
      <View className="flex-1 items-center justify-center px-4">
        {/* Success Icon Container */}
        <View className="w-32 h-32 rounded-full bg-ice-dark items-center justify-center mb-8 border border-border-blue">
          <LinearGradient
            colors={["#02EFF4", "#01A2FB"]}
            className="w-20 h-20 rounded-full items-center justify-center shadow-lg"
          >
            <CheckCircle2 size={44} color="#070617" strokeWidth={2.5} />
          </LinearGradient>
        </View>

        {/* Title & Description from Penpot */}
        <Text
          style={{ fontFamily: "PlusJakartaSans-ExtraBold" }}
          className="text-3xl text-dark text-center mb-3 tracking-tight"
        >
          Email Verified!
        </Text>

        <Text
          style={{ fontFamily: "PlusJakartaSans-Regular" }}
          className="text-sm text-dark-muted text-center leading-relaxed max-w-[280px]"
        >
          Your email has been verified. Let's take you to your dashboard!
        </Text>
      </View>

      <View className="w-full pb-4">
        <Button
          title="Dashboard"
          onPress={() => router.replace("/(tabs)/home")}
          variant="primary"
          size="lg"
          rightIcon={<ArrowRight size={18} color="#070617" />}
        />
      </View>
    </SafeAreaView>
  );
}
