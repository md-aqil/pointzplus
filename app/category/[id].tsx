// app/category/[id].tsx – Dynamic Category Details matching Penpot Design
import React from "react";
import { View, Text, ScrollView } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Clock, Layers, ArrowUpRight } from "lucide-react-native";
import { ScreenHeader } from "../../components/ui/ScreenHeader";
import { BrandPointCard } from "../../components/cards/BrandPointCard";
import { CATEGORIES, BRANDS } from "../../constants/categories";

export default function CategoryDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();

  const category =
    CATEGORIES.find((c) => c.id === id) || CATEGORIES[0]; // fallback to airlines

  const brands = BRANDS.filter(
    (b) => b.category.toLowerCase() === category.id.toLowerCase()
  );

  const expiringTotal = brands.reduce(
    (acc, cur) => acc + (cur.expiringPoints || 0),
    0
  );

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-light-bg">
      <ScreenHeader
        title={category.name}
        subtitle={`${brands.length} linked programs`}
        onBack={() => router.back()}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 60 }}
        className="px-5 pt-2"
      >
        {/* Category Hero Summary Card matching Penpot */}
        <LinearGradient
          colors={["#070617", "#1A1836"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          className="w-full rounded-3xl p-5 border border-dark-surface shadow-lg mb-5"
        >
          <View className="flex-row items-center justify-between mb-4">
            <View>
              <Text
                style={{ fontFamily: "PlusJakartaSans-Medium" }}
                className="text-xs text-muted uppercase tracking-wider mb-1"
              >
                Total Points
              </Text>
              <Text
                style={{ fontFamily: "PlusJakartaSans-Bold" }}
                className="text-3xl text-white tracking-tight"
              >
                {category.totalPoints.toLocaleString()}{" "}
                <Text
                  style={{ fontFamily: "PlusJakartaSans-SemiBold" }}
                  className="text-primary text-sm"
                >
                  pts
                </Text>
              </Text>
            </View>

            <View className="w-12 h-12 rounded-2xl bg-white/10 items-center justify-center border border-white/10">
              <Layers size={22} color="#02EFF4" />
            </View>
          </View>

          {/* Expired Soon row from Penpot */}
          <View className="flex-row items-center justify-between pt-3 border-t border-white/10">
            <View className="flex-row items-center">
              <Clock size={14} color="#FF4343" className="mr-1.5" />
              <Text
                style={{ fontFamily: "PlusJakartaSans-Regular" }}
                className="text-xs text-muted ml-1.5"
              >
                Expired soon
              </Text>
            </View>
            <Text
              style={{ fontFamily: "PlusJakartaSans-Bold" }}
              className="text-xs text-alert"
            >
              {expiringTotal > 0 ? `${expiringTotal.toLocaleString()} pts` : "None"}
            </Text>
          </View>
        </LinearGradient>

        {/* Linked Brands Header */}
        <Text
          style={{ fontFamily: "PlusJakartaSans-Bold" }}
          className="text-base text-dark mb-3"
        >
          Programs in {category.name}
        </Text>

        {brands.length > 0 ? (
          brands.map((brand) => (
            <BrandPointCard key={brand.id} brand={brand} />
          ))
        ) : (
          <View className="bg-white p-6 rounded-2xl border border-border-light items-center justify-center">
            <Text
              style={{ fontFamily: "PlusJakartaSans-Regular" }}
              className="text-xs text-dark-muted text-center"
            >
              No programs linked yet in {category.name}.
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
