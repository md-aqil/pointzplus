// app/category/index.tsx – All Categories screen matching Penpot Design
import React from "react";
import { View, Text, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { ScreenHeader } from "../../components/ui/ScreenHeader";
import { CategoryCard } from "../../components/cards/CategoryCard";
import { AuthRequiredView } from "../../components/ui/AuthRequiredView";
import { usePoints } from "../../hooks/usePoints";
import { useAuth } from "../../hooks/useAuth";

export default function AllCategoriesScreen() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const { categories } = usePoints();

  if (!isAuthenticated) {
    return (
      <AuthRequiredView
        title="Explore Categories"
        subtitle="Sign in to view your category points breakdown across airline, hotel, banking, and shopping programs."
        showBack={true}
      />
    );
  }

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-light-bg">
      <ScreenHeader
        title="All Category"
        subtitle="Points by category"
        fallbackRoute="/(tabs)/home"
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
