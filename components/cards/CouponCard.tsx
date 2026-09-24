// components/cards/CouponCard.tsx – Extracted promo token / coupon
import React from "react";
import { View, Text, TouchableOpacity, Alert } from "react-native";
import { Copy, CheckCircle2, Clock, Ticket } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { ExtractedCoupon } from "../../types/loyalty";

interface CouponCardProps {
  coupon: ExtractedCoupon;
  onMarkUsed?: (id: string) => void;
}

export const CouponCard: React.FC<CouponCardProps> = ({ coupon, onMarkUsed }) => {
  const copyCode = async () => {
    try {
      const Clipboard = await import("expo-clipboard").catch(() => null);
      if (Clipboard?.setStringAsync) {
        await Clipboard.setStringAsync(coupon.couponCode);
      }
    } catch {
      // clipboard module optional
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert("Copied", `${coupon.couponCode} copied to clipboard`);
  };

  const expiryLabel = coupon.expiryDate
    ? new Date(coupon.expiryDate).toString() !== "Invalid Date"
      ? new Date(coupon.expiryDate).toLocaleDateString("en-IN", {
          day: "numeric",
          month: "short",
          year: "numeric",
        })
      : coupon.expiryDate
    : "No expiry";

  return (
    <View
      className={`w-full bg-white rounded-2xl p-4 border mb-3 shadow-sm ${
        coupon.isUsed ? "border-border-light opacity-60" : "border-border-light"
      }`}
    >
      <View className="flex-row items-start justify-between mb-3">
        <View className="flex-row items-center flex-1 mr-2">
          <View className="w-10 h-10 rounded-xl bg-ice items-center justify-center mr-3 border border-border-blue">
            <Ticket size={18} color="#01A2FB" />
          </View>
          <View className="flex-1">
            <Text style={{ fontFamily: "PlusJakartaSans-Bold" }} className="text-sm text-dark">
              {coupon.merchantName}
            </Text>
            <Text
              style={{ fontFamily: "PlusJakartaSans-Regular" }}
              className="text-xs text-dark-muted"
              numberOfLines={2}
            >
              {coupon.title}
            </Text>
          </View>
        </View>
        <View className="bg-ice px-2.5 py-1 rounded-lg border border-border-blue">
          <Text style={{ fontFamily: "PlusJakartaSans-Bold" }} className="text-[10px] text-primary-dark">
            {coupon.discountValue}
          </Text>
        </View>
      </View>

      <TouchableOpacity
        onPress={copyCode}
        activeOpacity={0.8}
        className="flex-row items-center justify-between bg-light-bg rounded-xl px-3 py-2.5 border border-dashed border-primary-dark/30 mb-2"
      >
        <Text
          style={{ fontFamily: "PlusJakartaSans-Bold" }}
          className="text-sm text-dark tracking-widest"
        >
          {coupon.couponCode}
        </Text>
        <Copy size={14} color="#01A2FB" />
      </TouchableOpacity>

      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center">
          <Clock size={12} color="#6A6A74" />
          <Text style={{ fontFamily: "PlusJakartaSans-Medium" }} className="text-[11px] text-dark-muted ml-1.5">
            {coupon.isUsed ? "Redeemed" : `Valid till ${expiryLabel}`}
          </Text>
        </View>
        {!coupon.isUsed && onMarkUsed ? (
          <TouchableOpacity
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onMarkUsed(coupon.id);
            }}
            className="flex-row items-center"
          >
            <CheckCircle2 size={12} color="#059669" />
            <Text style={{ fontFamily: "PlusJakartaSans-Bold" }} className="text-[11px] text-emerald-700 ml-1">
              Mark used
            </Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
};
