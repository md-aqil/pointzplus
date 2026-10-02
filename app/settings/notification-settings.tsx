// app/settings/notification-settings.tsx – Notification & Sync Settings matching exact design
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Switch,
  TouchableOpacity,
  Modal,
  Pressable,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  RefreshCw,
  HelpCircle,
  ChevronRight,
  X,
  Check,
  AlertCircle,
} from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { ScreenHeader } from "../../components/ui/ScreenHeader";
import { Button } from "../../components/ui/Button";
import {
  getNotificationSettings,
  updateNotificationSettings,
} from "../../services/pushNotifications";
import * as SecureStore from "expo-secure-store";

const AUTO_SYNC_KEY = "pointzplus_auto_sync";
const EXPIRY_DAYS_KEY = "pointzplus_expiry_days";

export default function NotificationSettingsScreen() {
  const router = useRouter();

  const [expiryWarnings, setExpiryWarnings] = useState(true);
  const [earningNotif, setEarningNotif] = useState(true);
  const [dealsNotif, setDealsNotif] = useState(true);
  const [selectedDays, setSelectedDays] = useState(30);
  const [tempDays, setTempDays] = useState(30);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [autoSync, setAutoSync] = useState(true);

  useEffect(() => {
    let active = true;
    Promise.all([
      getNotificationSettings(),
      SecureStore.getItemAsync(AUTO_SYNC_KEY),
      SecureStore.getItemAsync(EXPIRY_DAYS_KEY),
    ])
      .then(([settings, storedAutoSync, storedDays]) => {
        if (!active) return;
        setExpiryWarnings(settings.expiryAlertsEnabled);
        setEarningNotif(settings.earningAlertsEnabled);
        setDealsNotif(settings.offerAlertsEnabled);
        if (storedAutoSync !== null) setAutoSync(storedAutoSync === "true");
        if (storedDays !== null) {
          const daysNum = parseInt(storedDays, 10);
          if (!isNaN(daysNum)) {
            setSelectedDays(daysNum);
            setTempDays(daysNum);
          }
        }
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, []);

  const toggleExpiry = async (value: boolean) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setExpiryWarnings(value);
    try {
      await updateNotificationSettings({ expiryAlertsEnabled: value });
    } catch {
      setExpiryWarnings(!value);
    }
  };

  const toggleEarning = async (value: boolean) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setEarningNotif(value);
    try {
      await updateNotificationSettings({ earningAlertsEnabled: value });
    } catch {
      setEarningNotif(!value);
    }
  };

  const toggleDeals = async (value: boolean) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setDealsNotif(value);
    try {
      await updateNotificationSettings({ offerAlertsEnabled: value });
    } catch {
      setDealsNotif(!value);
    }
  };

  const handleOpenModal = () => {
    setTempDays(selectedDays);
    setIsModalVisible(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleConfirmDays = async () => {
    setSelectedDays(tempDays);
    setIsModalVisible(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await SecureStore.setItemAsync(EXPIRY_DAYS_KEY, String(tempDays));
  };

  const dayOptions = [15, 30, 45, 90];

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-[#F7F9FB]">
      <ScreenHeader
        title="Notification & Sync Settings"
        fallbackRoute="/(tabs)/profile"
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 60 }}
        className="px-5 pt-3"
      >
        {/* Card 1: Expiry warnings */}
        <View className="bg-white rounded-3xl p-5 border border-[#E6E8EC] shadow-sm mb-4">
          <View className="flex-row items-center justify-between mb-1">
            <Text
              style={{ fontFamily: "PlusJakartaSans-Bold" }}
              className="text-base text-[#070617] font-bold"
            >
              Expiry warnings
            </Text>
            <Switch
              value={expiryWarnings}
              onValueChange={toggleExpiry}
              trackColor={{ false: "#E6E6E8", true: "#00A3FF" }}
              thumbColor={expiryWarnings ? "#FFFFFF" : "#FFFFFF"}
            />
          </View>

          <TouchableOpacity
            onPress={handleOpenModal}
            activeOpacity={0.7}
            className="mt-0.5 mb-3"
          >
            <Text
              style={{ fontFamily: "PlusJakartaSans-Regular" }}
              className="text-xs text-[#6A6A74] leading-relaxed"
            >
              Tell me {selectedDays} days before any points expire.
            </Text>
          </TouchableOpacity>

          {/* Info Notes inside card */}
          <View className="bg-[#F6F7F9] p-3.5 rounded-2xl mt-1 space-y-2">
            <View className="flex-row items-center">
              <AlertCircle size={15} color="#6A6A74" className="mr-2" />
              <Text
                style={{ fontFamily: "PlusJakartaSans-Regular" }}
                className="text-xs text-[#6A6A74] ml-2 flex-1"
              >
                You'll never miss expiring points again.
              </Text>
            </View>
            <View className="flex-row items-center mt-1">
              <AlertCircle size={15} color="#6A6A74" className="mr-2" />
              <Text
                style={{ fontFamily: "PlusJakartaSans-Regular" }}
                className="text-xs text-[#6A6A74] ml-2 flex-1"
              >
                We'll send only the best offers, not spam.
              </Text>
            </View>
          </View>
        </View>

        {/* Earning Updates */}
        <View className="bg-white rounded-3xl p-5 border border-[#E6E8EC] shadow-sm mb-4">
          <View className="flex-row items-center justify-between">
            <View className="flex-1 mr-3">
              <Text
                style={{ fontFamily: "PlusJakartaSans-Bold" }}
                className="text-base text-[#070617] font-bold mb-1"
              >
                Earning updates
              </Text>
              <Text
                style={{ fontFamily: "PlusJakartaSans-Regular" }}
                className="text-xs text-[#6A6A74] leading-relaxed"
              >
                Tell me when a program credits new points.
              </Text>
            </View>
            <Switch
              value={earningNotif}
              onValueChange={toggleEarning}
              trackColor={{ false: "#E6E6E8", true: "#00A3FF" }}
              thumbColor={earningNotif ? "#FFFFFF" : "#FFFFFF"}
            />
          </View>
        </View>

        {/* Deals & Offers */}
        <View className="bg-white rounded-3xl p-5 border border-[#E6E8EC] shadow-sm mb-4">
          <View className="flex-row items-center justify-between">
            <View className="flex-1 mr-3">
              <Text
                style={{ fontFamily: "PlusJakartaSans-Bold" }}
                className="text-base text-[#070617] font-bold mb-1"
              >
                Deals & Offers
              </Text>
              <Text
                style={{ fontFamily: "PlusJakartaSans-Regular" }}
                className="text-xs text-[#6A6A74] leading-relaxed"
              >
                Exclusive discount codes and partner vouchers.
              </Text>
            </View>
            <Switch
              value={dealsNotif}
              onValueChange={toggleDeals}
              trackColor={{ false: "#E6E6E8", true: "#00A3FF" }}
              thumbColor={dealsNotif ? "#FFFFFF" : "#FFFFFF"}
            />
          </View>
        </View>

        {/* Card 2: Automatic sync */}
        <View className="bg-[#F0FAFE] border border-[#DCF0FA] rounded-2xl p-4 flex-row items-center justify-between mb-4 shadow-sm">
          <View className="w-10 h-10 rounded-full bg-[#D6F0FA] items-center justify-center mr-3">
            <RefreshCw size={18} color="#00A3FF" />
          </View>

          <View className="flex-1 mr-2">
            <Text
              style={{ fontFamily: "PlusJakartaSans-Bold" }}
              className="text-sm text-[#070617] font-bold"
            >
              Automatic sync
            </Text>
            <Text
              style={{ fontFamily: "PlusJakartaSans-Regular" }}
              className="text-xs text-[#7E8494] mt-0.5"
            >
              We keep your balances updated in the background.
            </Text>
          </View>

          <View className="bg-[#DCFCE7] px-3 py-1.5 rounded-full flex-row items-center">
            <Check size={12} color="#16A34A" />
            <Text
              style={{ fontFamily: "PlusJakartaSans-Bold" }}
              className="text-xs text-[#16A34A] font-bold ml-1"
            >
              Active
            </Text>
          </View>
        </View>

        {/* Card 3: Need help? */}
        <TouchableOpacity
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push("/legal/privacy");
          }}
          activeOpacity={0.7}
          className="bg-[#F0FAFE] border border-[#DCF0FA] rounded-2xl p-4 flex-row items-center justify-between shadow-sm"
        >
          <View className="w-10 h-10 rounded-full bg-[#D6F0FA] items-center justify-center mr-3">
            <HelpCircle size={18} color="#00A3FF" />
          </View>

          <View className="flex-1">
            <Text
              style={{ fontFamily: "PlusJakartaSans-Bold" }}
              className="text-sm text-[#070617] font-bold"
            >
              Need help?
            </Text>
            <Text
              style={{ fontFamily: "PlusJakartaSans-Regular" }}
              className="text-xs text-[#7E8494] mt-0.5"
            >
              Learn more about alerts and data sync.
            </Text>
          </View>

          <ChevronRight size={18} color="#8E95A5" />
        </TouchableOpacity>
      </ScrollView>

      {/* Expiry warnings Modal Sheet */}
      <Modal
        visible={isModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsModalVisible(false)}
      >
        <Pressable
          onPress={() => setIsModalVisible(false)}
          className="flex-1 bg-black/40 items-center justify-center px-5"
        >
          <Pressable
            onPress={(e) => e.stopPropagation()}
            className="w-full bg-white rounded-3xl p-6 shadow-2xl"
          >
            {/* Modal Header */}
            <View className="flex-row items-start justify-between">
              <View className="flex-1 mr-2">
                <Text
                  style={{ fontFamily: "PlusJakartaSans-Bold" }}
                  className="text-lg text-[#070617] font-bold"
                >
                  Expiry warnings
                </Text>
                <Text
                  style={{ fontFamily: "PlusJakartaSans-Regular" }}
                  className="text-xs text-[#6A6A74] mt-1"
                >
                  Tell me {tempDays} days before any points expire.
                </Text>
              </View>

              <TouchableOpacity
                onPress={() => setIsModalVisible(false)}
                className="p-1"
              >
                <X size={20} color="#6B7280" />
              </TouchableOpacity>
            </View>

            {/* Choose days Header */}
            <View className="bg-[#F8FAFC] rounded-2xl p-4 mt-5 mb-5 border border-[#F0F1F5]">
              <Text
                style={{ fontFamily: "PlusJakartaSans-Bold" }}
                className="text-sm text-[#070617] font-bold mb-3.5"
              >
                Choose days
              </Text>

              {/* Radio options */}
              <View className="space-y-3.5">
                {dayOptions.map((days) => {
                  const isSelected = tempDays === days;
                  return (
                    <TouchableOpacity
                      key={days}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setTempDays(days);
                      }}
                      activeOpacity={0.7}
                      className="flex-row items-center py-1"
                    >
                      <View
                        className={`w-5 h-5 rounded-full border-2 items-center justify-center mr-3 ${
                          isSelected
                            ? "border-[#00A3FF]"
                            : "border-[#8E95A5]"
                        }`}
                      >
                        {isSelected && (
                          <View className="w-2.5 h-2.5 rounded-full bg-[#00A3FF]" />
                        )}
                      </View>

                      <Text
                        style={{
                          fontFamily: isSelected
                            ? "PlusJakartaSans-SemiBold"
                            : "PlusJakartaSans-Regular",
                        }}
                        className={`text-sm ${
                          isSelected ? "text-[#070617]" : "text-[#4A5060]"
                        }`}
                      >
                        {days} days
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Primary Continue Button */}
            <Button
              title="Continue"
              onPress={handleConfirmDays}
              variant="primary"
              size="md"
            />
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}
