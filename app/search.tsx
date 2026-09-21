// app/search.tsx – Search screen matching Penpot Design
import React, { useState } from "react";
import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Search, X } from "lucide-react-native";
import { ScreenHeader } from "../components/ui/ScreenHeader";
import { Input } from "../components/ui/Input";
import { CategoryCard } from "../components/cards/CategoryCard";
import { BrandPointCard } from "../components/cards/BrandPointCard";
import { CATEGORIES, BRANDS } from "../constants/categories";

export default function SearchScreen() {
  const router = useRouter();
  const [query, setQuery] = useState("");

  const filteredCategories = CATEGORIES.filter((c) =>
    c.name.toLowerCase().includes(query.toLowerCase())
  );

  const filteredBrands = BRANDS.filter((b) =>
    b.name.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-light-bg">
      <ScreenHeader title="Search" onBack={() => router.back()} />

      <View className="px-5 pt-2">
        <Input
          placeholder="Search categories and programs..."
          value={query}
          onChangeText={setQuery}
          autoFocus
          leftIcon={<Search size={18} color="#9C9BA2" />}
          rightAction={
            query ? (
              <TouchableOpacity onPress={() => setQuery("")}>
                <X size={16} color="#9C9BA2" />
              </TouchableOpacity>
            ) : null
          }
        />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 60 }}
        className="px-5 pt-2"
      >
        {/* Categories Results */}
        {filteredCategories.length > 0 && (
          <View className="mb-4">
            <Text
              style={{ fontFamily: "PlusJakartaSans-Bold" }}
              className="text-xs text-dark-muted uppercase tracking-wider mb-3"
            >
              Categories
            </Text>
            {filteredCategories.map((category) => (
              <CategoryCard
                key={category.id}
                category={category}
                onPress={() => router.push(`/category/${category.id}`)}
              />
            ))}
          </View>
        )}

        {/* Brands Results */}
        {filteredBrands.length > 0 && (
          <View className="mb-4">
            <Text
              style={{ fontFamily: "PlusJakartaSans-Bold" }}
              className="text-xs text-dark-muted uppercase tracking-wider mb-3"
            >
              Programs
            </Text>
            {filteredBrands.map((brand) => (
              <BrandPointCard
                key={brand.id}
                brand={brand}
                onPress={() => router.push(`/category/${brand.category}`)}
              />
            ))}
          </View>
        )}

        {filteredCategories.length === 0 && filteredBrands.length === 0 && (
          <View className="bg-white p-8 rounded-3xl border border-border-light items-center justify-center my-6">
            <Search size={32} color="#9C9BA2" className="mb-3" />
            <Text
              style={{ fontFamily: "PlusJakartaSans-Bold" }}
              className="text-sm text-dark mb-1"
            >
              No results found
            </Text>
            <Text
              style={{ fontFamily: "PlusJakartaSans-Regular" }}
              className="text-xs text-dark-muted text-center"
            >
              Try searching for "Airlines", "Hotels", or specific brand names.
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
