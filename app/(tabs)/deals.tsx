// app/(tabs)/deals.tsx – Deals & Offers (Coming Soon placeholder)
//
// The coupon wallet was removed outright: the extractor persisted bank account
// numbers and shipment tracking IDs as "coupon codes", so the feature was
// withdrawn rather than patched. Deals may return with a stricter extractor.
import React from "react";
import { View, Text, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Sparkles, Clock3 } from "lucide-react-native";
import { ScreenHeader } from "../../components/ui/ScreenHeader";

export default function DealsScreen() {
  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-[#F8FAFC]">
      <ScreenHeader title="Deals & Offers" showBack={false} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120, flexGrow: 1 }}
        className="px-5 pt-3"
      >
        <View className="flex-1 items-center justify-center py-16">
          {/* Icon */}
          <View className="w-20 h-20 rounded-3xl bg-[#EBF7FC] items-center justify-center mb-5 border border-[#D8F1FD]">
            <Sparkles size={34} color="#00A3FF" strokeWidth={1.8} />
          </View>

          {/* Badge */}
          <View className="bg-[#EBF7FC] px-3.5 py-1.5 rounded-full border border-[#D8F1FD] flex-row items-center mb-4">
            <Clock3 size={12} color="#01A2FB" strokeWidth={2.2} />
            <Text
              style={{ fontFamily: "PlusJakartaSans-Bold" }}
              className="text-[11.5px] text-[#01A2FB] ml-1.5"
            >
              COMING SOON
            </Text>
          </View>

          <Text
            style={{ fontFamily: "PlusJakartaSans-Bold" }}
            className="text-[20px] text-[#070617] text-center mb-2"
          >
            Deals are on the way
          </Text>

          <Text
            style={{ fontFamily: "PlusJakartaSans-Regular" }}
            className="text-[13px] text-[#6A6A74] text-center leading-relaxed px-6"
          >
            PointzPlus is currently a points tracker. Partner offers and discounts
            are being rebuilt so only genuine promo codes are ever shown.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

