// app/category/index.tsx – All Categories screen matching Penpot Design
import React from "react";
import { View, Text, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { ScreenHeader } from "../../components/ui/ScreenHeader";
import { CategoryCard } from "../../components/cards/CategoryCard";
import { usePoints } from "../../hooks/usePoints";

export default function AllCategoriesScreen() {
  const router = useRouter();
  const { categories } = usePoints();

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-light-bg">
      <ScreenHeader
        title="All Category"
        subtitle="Points by category"
        onBack={() => router.back()}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 60 }}
        className="px-5 pt-3"
      >
        {categories.length > 0 ? (
          categories.map((category) => (
            <CategoryCard
              key={category.categoryId}
              category={category}
              variant="full"
              onPress={() => router.push(`/category/${category.categoryId}`)}
            />
          ))
        ) : (
          <View className="bg-white p-6 rounded-2xl border border-border-light items-center justify-center mt-4">
            <Text
              style={{ fontFamily: "PlusJakartaSans-Regular" }}
              className="text-xs text-dark-muted text-center"
            >
              No category points extracted yet. Connect your Gmail to auto-sync.
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
