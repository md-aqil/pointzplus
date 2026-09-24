// app/(tabs)/deals.tsx – Deals & Extracted Coupons
import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Sparkles, ArrowRight } from "lucide-react-native";
import { ScreenHeader } from "../../components/ui/ScreenHeader";
import { Button } from "../../components/ui/Button";
import { usePoints } from "../../hooks/usePoints";
import { CouponCard } from "../../components/cards/CouponCard";

export default function DealsScreen() {
  const { activeCoupons, expiringCoupons, refreshAll, isSyncing } = usePoints();
  const [loadingLocal, setLoadingLocal] = useState(false);

  const onRefresh = async () => {
    setLoadingLocal(true);
    try {
      await refreshAll();
    } finally {
      setLoadingLocal(false);
    }
  };

  useEffect(() => {
    // ensure coupons are fetched when entering tab
    refreshAll().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const hasAny = activeCoupons.length > 0 || expiringCoupons.length > 0;

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-light-bg">
      <ScreenHeader title="Deals" showBack={false} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
        className="px-5 pt-2"
      >
        <LinearGradient
          colors={["#070617", "#1A1836"]}
          className="w-full rounded-3xl p-6 border border-dark-surface mb-5 shadow-lg"
        >
          <View className="flex-row items-center justify-between mb-3">
            <View className="bg-primary/20 px-3 py-1 rounded-full border border-primary/40">
              <Text style={{ fontFamily: "PlusJakartaSans-Bold" }} className="text-[10px] text-primary">
                YOUR EXTRACTED COUPONS
              </Text>
            </View>
            <Sparkles size={18} color="#02EFF4" />
          </View>

          <Text style={{ fontFamily: "PlusJakartaSans-Bold" }} className="text-xl text-white mb-2 leading-tight">
            Copy codes instantly & redeem before expiry
          </Text>

          <Text style={{ fontFamily: "PlusJakartaSans-Regular" }} className="text-xs text-muted mb-4 leading-relaxed">
            PointzPlus automatically extracts promo codes from your Gmail statements.
          </Text>

          <Button
            title={loadingLocal ? "Refreshing..." : "Refresh"}
            onPress={onRefresh}
            variant="primary"
            size="md"
            rightIcon={<ArrowRight size={16} color="#070617" />}
            disabled={isSyncing || loadingLocal}
          />
        </LinearGradient>

        {!hasAny ? (
          <View className="bg-white p-8 rounded-3xl border border-border-light items-center justify-center my-6">
            <Text style={{ fontFamily: "PlusJakartaSans-Bold" }} className="text-sm text-dark mb-1">
              No coupons found yet
            </Text>
            <Text style={{ fontFamily: "PlusJakartaSans-Regular" }} className="text-xs text-dark-muted text-center">
              Connect Gmail and run sync to extract discount codes and vouchers.
            </Text>
          </View>
        ) : (
          <>
            {expiringCoupons.length > 0 && (
              <View className="mb-6">
                <Text style={{ fontFamily: "PlusJakartaSans-Bold" }} className="text-xs text-dark-muted uppercase tracking-wider mb-3 ml-1">
                  Expiring soon (next 14 days)
                </Text>
                {expiringCoupons.map((c) => (
                  <CouponCard key={c.id} coupon={c} />
                ))}
              </View>
            )}

            {activeCoupons.length > 0 && (
              <View className="mb-6">
                <Text style={{ fontFamily: "PlusJakartaSans-Bold" }} className="text-xs text-dark-muted uppercase tracking-wider mb-3 ml-1">
                  All valid coupons
                </Text>
                {activeCoupons.map((c) => (
                  <CouponCard key={c.id} coupon={c} />
                ))}
              </View>
            )}
          </>
        )}

        {isSyncing && (
          <View className="py-6 items-center">
            <ActivityIndicator size="small" color="#01A2FB" />
          </View>
        )}

        <View className="pb-20" />
      </ScrollView>
    </SafeAreaView>
  );
}
