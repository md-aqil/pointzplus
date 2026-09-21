// app/add-account.tsx – Manual Loyalty Tracker & Receipt Add Screen
import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Modal,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  ArrowLeft,
  CheckCircle2,
  Calendar,
  Sparkles,
  Camera,
  Shield,
  FileText,
  ChevronDown,
} from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { POPULAR_PROGRAMS, CATEGORY_LABELS } from "../constants/popularPrograms";
import { usePoints } from "../hooks/usePoints";
import { LoyaltyCategory } from "../types/loyalty";

export default function AddAccountScreen() {
  const router = useRouter();
  const { addManualAccount } = usePoints();

  // Form State
  const [selectedCategory, setSelectedCategory] = useState<LoyaltyCategory>("airlines");
  const [selectedProgramId, setSelectedProgramId] = useState<string>("air_india");
  const [isCustomProgram, setIsCustomProgram] = useState<boolean>(false);
  const [customProgramName, setCustomProgramName] = useState<string>("");
  const [accountNumber, setAccountNumber] = useState<string>("");
  const [pointsBalance, setPointsBalance] = useState<string>("");
  const [expiringPoints, setExpiringPoints] = useState<string>("");
  const [expiryTag, setExpiryTag] = useState<string>("30 Days");
  const [customExpiryDate, setCustomExpiryDate] = useState<string>("");
  const [receiptAttached, setReceiptAttached] = useState<boolean>(false);
  const [isScanningReceipt, setIsScanningReceipt] = useState<boolean>(false);
  const [showSuccessModal, setShowSuccessModal] = useState<boolean>(false);

  // Filter programs by selected category
  const filteredPrograms = POPULAR_PROGRAMS.filter(
    (p) => p.category === selectedCategory
  );

  const selectedProgram = POPULAR_PROGRAMS.find((p) => p.id === selectedProgramId);

  const handleAttachReceipt = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsScanningReceipt(true);

    // Simulate OCR Extraction from statement/receipt
    setTimeout(() => {
      setIsScanningReceipt(false);
      setReceiptAttached(true);
      setAccountNumber("AI-***7829");
      setPointsBalance("5400");
      setExpiringPoints("600");
      setExpiryTag("30 Days");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(
        "Receipt Scanned Successfully!",
        "Extracted 5,400 points and account # AI-***7829 from your e-receipt."
      );
    }, 1200);
  };

  const handleSaveAccount = () => {
    if (!pointsBalance || isNaN(Number(pointsBalance.replace(/,/g, "")))) {
      Alert.alert("Invalid Points", "Please enter a valid points balance number.");
      return;
    }

    if (!accountNumber) {
      Alert.alert("Account Number Required", "Please enter your member or card number.");
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const balanceNum = parseInt(pointsBalance.replace(/,/g, ""), 10);
    const expNum = expiringPoints ? parseInt(expiringPoints.replace(/,/g, ""), 10) : 0;
    const finalExpiry = expiryTag === "Custom" ? customExpiryDate : expiryTag;

    addManualAccount({
      programId: isCustomProgram ? `custom_${Date.now()}` : selectedProgramId,
      customName: isCustomProgram ? customProgramName : undefined,
      category: selectedCategory,
      accountNumber,
      currentBalance: balanceNum,
      expiringPoints: expNum,
      expiryDate: finalExpiry,
    });

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setShowSuccessModal(true);
  };

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-light-bg">
      {/* Top Header */}
      <View className="px-5 py-3 flex-row items-center justify-between border-b border-border-light bg-white">
        <TouchableOpacity
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.back();
          }}
          className="w-10 h-10 rounded-full bg-light-bg items-center justify-center"
        >
          <ArrowLeft size={20} color="#070617" />
        </TouchableOpacity>

        <Text
          style={{ fontFamily: "PlusJakartaSans-Bold" }}
          className="text-lg text-dark"
        >
          Add Loyalty Program
        </Text>

        <View className="w-10" />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
        className="px-5 pt-4"
      >
        {/* Receipt / Statement Instant Scan Box */}
        <TouchableOpacity
          onPress={handleAttachReceipt}
          activeOpacity={0.85}
          className="bg-white rounded-2xl p-4 mb-5 border border-dashed border-primary-dark/50 flex-row items-center justify-between shadow-sm"
        >
          <View className="flex-row items-center flex-1 mr-3">
            <View className="w-11 h-11 rounded-xl bg-primary/20 items-center justify-center mr-3">
              <Camera size={22} color="#01A2FB" />
            </View>
            <View className="flex-1">
              <Text
                style={{ fontFamily: "PlusJakartaSans-Bold" }}
                className="text-sm text-dark"
              >
                {receiptAttached ? "Receipt Attached & Verified" : "Scan Statement or Receipt"}
              </Text>
              <Text
                style={{ fontFamily: "PlusJakartaSans-Regular" }}
                className="text-xs text-dark-muted"
              >
                {isScanningReceipt
                  ? "AI extracting points & dates..."
                  : receiptAttached
                  ? "Points auto-filled from document"
                  : "Upload photo/PDF to auto-fill details"}
              </Text>
            </View>
          </View>

          {receiptAttached ? (
            <CheckCircle2 size={22} color="#059669" />
          ) : (
            <View className="bg-primary/20 px-3 py-1.5 rounded-lg">
              <Text
                style={{ fontFamily: "PlusJakartaSans-Bold" }}
                className="text-xs text-primary-dark"
              >
                Auto-Fill
              </Text>
            </View>
          )}
        </TouchableOpacity>

        {/* 1. Category Selector */}
        <Text
          style={{ fontFamily: "PlusJakartaSans-Bold" }}
          className="text-sm text-dark uppercase tracking-wider mb-2 ml-1"
        >
          1. Select Category
        </Text>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="mb-5 py-1"
        >
          {Object.entries(CATEGORY_LABELS).map(([catKey, label]) => {
            const isSelected = selectedCategory === catKey;
            return (
              <TouchableOpacity
                key={catKey}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setSelectedCategory(catKey as LoyaltyCategory);
                  setIsCustomProgram(false);
                  const firstInCat = POPULAR_PROGRAMS.find((p) => p.category === catKey);
                  if (firstInCat) setSelectedProgramId(firstInCat.id);
                }}
                style={{
                  backgroundColor: isSelected ? "#070617" : "#FFFFFF",
                }}
                className="px-4 py-2.5 rounded-xl mr-2 border border-border-light shadow-sm"
              >
                <Text
                  style={{
                    fontFamily: isSelected ? "PlusJakartaSans-Bold" : "PlusJakartaSans-Medium",
                    color: isSelected ? "#02EFF4" : "#070617",
                  }}
                  className="text-xs"
                >
                  {label.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* 2. Program Selector */}
        <Text
          style={{ fontFamily: "PlusJakartaSans-Bold" }}
          className="text-sm text-dark uppercase tracking-wider mb-2 ml-1"
        >
          2. Select Brand / Program
        </Text>

        <View className="bg-white rounded-2xl p-2 mb-5 border border-border-light shadow-sm">
          {filteredPrograms.map((prog) => {
            const isSelected = !isCustomProgram && selectedProgramId === prog.id;
            return (
              <TouchableOpacity
                key={prog.id}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setSelectedProgramId(prog.id);
                  setIsCustomProgram(false);
                }}
                className={`p-3 rounded-xl flex-row items-center justify-between mb-1 ${
                  isSelected ? "bg-primary/10 border border-primary-dark/30" : ""
                }`}
              >
                <View className="flex-row items-center flex-1 mr-2">
                  <View
                    style={{ backgroundColor: prog.accentColor + "20" }}
                    className="w-8 h-8 rounded-lg items-center justify-center mr-2.5"
                  >
                    <Text className="text-sm">{prog.logoInitial}</Text>
                  </View>
                  <Text
                    style={{ fontFamily: "PlusJakartaSans-Bold" }}
                    className="text-sm text-dark"
                  >
                    {prog.name}
                  </Text>
                </View>

                {isSelected && <CheckCircle2 size={18} color="#01A2FB" />}
              </TouchableOpacity>
            );
          })}

          {/* Custom Program Button */}
          <TouchableOpacity
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setIsCustomProgram(true);
            }}
            className={`p-3 rounded-xl flex-row items-center justify-between mt-1 border-t border-border-light ${
              isCustomProgram ? "bg-primary/10 border border-primary-dark/30" : ""
            }`}
          >
            <View className="flex-row items-center">
              <View className="w-8 h-8 rounded-lg bg-gray-100 items-center justify-center mr-2.5">
                <Sparkles size={16} color="#070617" />
              </View>
              <Text
                style={{ fontFamily: "PlusJakartaSans-Bold" }}
                className="text-sm text-dark"
              >
                + Other Custom Program
              </Text>
            </View>

            {isCustomProgram && <CheckCircle2 size={18} color="#01A2FB" />}
          </TouchableOpacity>
        </View>

        {isCustomProgram && (
          <View className="mb-4">
            <Text
              style={{ fontFamily: "PlusJakartaSans-Bold" }}
              className="text-xs text-dark mb-1.5 ml-1"
            >
              Custom Program Name
            </Text>
            <TextInput
              placeholder="e.g. Starbucks Rewards, Taj Club..."
              value={customProgramName}
              onChangeText={setCustomProgramName}
              className="bg-white border border-border-light rounded-xl px-4 py-3 text-sm text-dark"
              placeholderTextColor="#9C9BA2"
            />
          </View>
        )}

        {/* 3. Account Details */}
        <Text
          style={{ fontFamily: "PlusJakartaSans-Bold" }}
          className="text-sm text-dark uppercase tracking-wider mb-2 ml-1"
        >
          3. Account Details
        </Text>

        <View className="bg-white rounded-2xl p-4 mb-5 border border-border-light shadow-sm">
          {/* Account Number */}
          <View className="mb-4">
            <Text
              style={{ fontFamily: "PlusJakartaSans-Bold" }}
              className="text-xs text-dark mb-1.5"
            >
              Membership / Account Number
            </Text>
            <TextInput
              placeholder="e.g. AI-8930492 or Card ending 4092"
              value={accountNumber}
              onChangeText={setAccountNumber}
              className="bg-light-bg border border-border-light rounded-xl px-4 py-3 text-sm text-dark"
              placeholderTextColor="#9C9BA2"
              autoCapitalize="characters"
            />
          </View>

          {/* Points Balance */}
          <View className="mb-4">
            <Text
              style={{ fontFamily: "PlusJakartaSans-Bold" }}
              className="text-xs text-dark mb-1.5"
            >
              Current Available Points Balance
            </Text>
            <TextInput
              placeholder="e.g. 15,450"
              value={pointsBalance}
              onChangeText={setPointsBalance}
              keyboardType="numeric"
              className="bg-light-bg border border-border-light rounded-xl px-4 py-3 text-base text-dark font-bold"
              placeholderTextColor="#9C9BA2"
            />
          </View>

          {/* Expiring Points */}
          <View className="mb-4">
            <Text
              style={{ fontFamily: "PlusJakartaSans-Bold" }}
              className="text-xs text-dark mb-1.5"
            >
              Points Expiring Soon (Optional)
            </Text>
            <TextInput
              placeholder="e.g. 2,500"
              value={expiringPoints}
              onChangeText={setExpiringPoints}
              keyboardType="numeric"
              className="bg-light-bg border border-border-light rounded-xl px-4 py-3 text-sm text-dark"
              placeholderTextColor="#9C9BA2"
            />
          </View>

          {/* Expiry Period Quick Select */}
          <View>
            <Text
              style={{ fontFamily: "PlusJakartaSans-Bold" }}
              className="text-xs text-dark mb-2"
            >
              Expiry Window
            </Text>
            <View className="flex-row flex-wrap gap-2">
              {["15 Days", "30 Days", "45 Days", "90 Days", "No Expiry", "Custom"].map(
                (tag) => {
                  const isSelected = expiryTag === tag;
                  return (
                    <TouchableOpacity
                      key={tag}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setExpiryTag(tag);
                      }}
                      className={`px-3 py-2 rounded-xl border ${
                        isSelected
                          ? "bg-primary-dark border-primary-dark"
                          : "bg-light-bg border-border-light"
                      }`}
                    >
                      <Text
                        style={{
                          fontFamily: "PlusJakartaSans-Bold",
                          color: isSelected ? "#FFFFFF" : "#070617",
                        }}
                        className="text-xs"
                      >
                        {tag}
                      </Text>
                    </TouchableOpacity>
                  );
                }
              )}
            </View>

            {expiryTag === "Custom" && (
              <TextInput
                placeholder="e.g. 31 Dec 2026"
                value={customExpiryDate}
                onChangeText={setCustomExpiryDate}
                className="bg-light-bg border border-border-light rounded-xl px-4 py-2.5 text-xs text-dark mt-3"
                placeholderTextColor="#9C9BA2"
              />
            )}
          </View>
        </View>

        {/* Save Button */}
        <TouchableOpacity
          onPress={handleSaveAccount}
          className="w-full bg-primary-dark py-4 rounded-2xl items-center shadow-md mb-6"
        >
          <Text
            style={{ fontFamily: "PlusJakartaSans-Bold" }}
            className="text-white text-base"
          >
            Save to PointzPlus Wallet
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Success Confirmation Modal */}
      <Modal visible={showSuccessModal} transparent animationType="fade">
        <View className="flex-1 bg-black/60 items-center justify-center px-6">
          <View className="bg-white w-full rounded-3xl p-6 items-center shadow-xl">
            <View className="w-16 h-16 rounded-full bg-emerald-100 items-center justify-center mb-4">
              <CheckCircle2 size={36} color="#059669" />
            </View>

            <Text
              style={{ fontFamily: "PlusJakartaSans-Bold" }}
              className="text-xl text-dark mb-1 text-center"
            >
              Account Added!
            </Text>

            <Text
              style={{ fontFamily: "PlusJakartaSans-Regular" }}
              className="text-xs text-dark-muted text-center mb-5"
            >
              {isCustomProgram ? customProgramName : selectedProgram?.name} has been added to your loyalty portfolio with {pointsBalance} points.
            </Text>

            <TouchableOpacity
              onPress={() => {
                setShowSuccessModal(false);
                router.replace("/(tabs)/home");
              }}
              className="w-full bg-primary-dark py-3.5 rounded-2xl items-center shadow-sm"
            >
              <Text
                style={{ fontFamily: "PlusJakartaSans-Bold" }}
                className="text-white text-sm"
              >
                Back to Dashboard
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
