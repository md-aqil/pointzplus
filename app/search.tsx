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
import { AccountStatementModal } from "../components/ui/AccountStatementModal";
import { LinkedAccount } from "../types/loyalty";
import { usePoints } from "../hooks/usePoints";

export default function SearchScreen() {
  const router = useRouter();
  const { accounts, categories } = usePoints();
  const [query, setQuery] = useState("");
  const [selectedAccount, setSelectedAccount] = useState<LinkedAccount | null>(null);

  const filteredCategories = categories.filter((c) =>
    c.categoryName.toLowerCase().includes(query.toLowerCase())
  );

  const filteredAccounts = accounts.filter(
    (a) =>
      a.isActive &&
      (a.program.name.toLowerCase().includes(query.toLowerCase()) ||
        a.program.category.toLowerCase().includes(query.toLowerCase()))
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
                key={category.categoryId}
                category={category}
                onPress={() => router.push(`/category/${category.categoryId}`)}
              />
            ))}
          </View>
        )}

        {/* Programs Results */}
        {filteredAccounts.length > 0 && (
          <View className="mb-4">
            <Text
              style={{ fontFamily: "PlusJakartaSans-Bold" }}
              className="text-xs text-dark-muted uppercase tracking-wider mb-3"
            >
              Linked Programs
            </Text>
            {filteredAccounts.map((account) => (
              <BrandPointCard
                key={account.id}
                account={account}
                onPress={() => setSelectedAccount(account)}
              />
            ))}
          </View>
        )}

        {filteredCategories.length === 0 && filteredAccounts.length === 0 && (
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
              {query ? `No matches for "${query}"` : "Search across all extracted loyalty programs"}
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Statement Details & Proof Modal */}
      <AccountStatementModal
        visible={Boolean(selectedAccount)}
        account={selectedAccount}
        onClose={() => setSelectedAccount(null)}
      />
    </SafeAreaView>
  );
}
