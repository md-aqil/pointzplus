// app/category/index.tsx – All Categories screen matching Penpot Design
import React from "react";
import { View, Text, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { ScreenHeader } from "../../components/ui/ScreenHeader";
import { CategoryCard } from "../../components/cards/CategoryCard";
import { CATEGORIES } from "../../constants/categories";

export default function AllCategoriesScreen() {
  const router = useRouter();

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
        {CATEGORIES.map((category) => (
          <CategoryCard
            key={category.id}
            category={category}
            variant="detailed"
            onPress={() => router.push(`/category/${category.id}`)}
          />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
