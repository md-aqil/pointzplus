// app/settings/notification-settings.tsx – Notification & Sync Settings matching Penpot Design
import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, Switch } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Gift, TrendingUp, Clock, RefreshCw } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { ScreenHeader } from "../../components/ui/ScreenHeader";
import {
  getNotificationSettings,
  updateNotificationSettings,
} from "../../services/pushNotifications";
import * as SecureStore from "expo-secure-store";

const AUTO_SYNC_KEY = "pointzplus_auto_sync";

export default function NotificationSettingsScreen() {
  const router = useRouter();

  const [dealsNotif, setDealsNotif] = useState(true);
  const [earningNotif, setEarningNotif] = useState(true);
  const [expiryNotif, setExpiryNotif] = useState(true);
  const [autoSync, setAutoSync] = useState(true);

  useEffect(() => {
    let active = true;
    Promise.all([
      getNotificationSettings(),
      SecureStore.getItemAsync(AUTO_SYNC_KEY),
    ]).then(([settings, storedAutoSync]) => {
      if (!active) return;
      setExpiryNotif(settings.expiryAlertsEnabled);
      setEarningNotif(settings.earningAlertsEnabled);
      setDealsNotif(settings.offerAlertsEnabled);
      if (storedAutoSync !== null) setAutoSync(storedAutoSync === "true");
    }).catch(() => {
      // Keep safe defaults when settings cannot be loaded.
    });
    return () => {
      active = false;
    };
  }, []);

  const toggleSetting = async (
    key: "expiryAlertsEnabled" | "earningAlertsEnabled" | "offerAlertsEnabled",
    value: boolean,
    setValue: (value: boolean) => void,
    currentValue: boolean
  ) => {
    setValue(value);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await updateNotificationSettings({ [key]: value });
    } catch {
      setValue(currentValue);
    }
  };

  const saveAutoSync = async (value: boolean) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setAutoSync(value);
    await SecureStore.setItemAsync(AUTO_SYNC_KEY, String(value));
  };

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-light-bg">
      <ScreenHeader
        title="Notification & Sync"
        subtitle="Configure your alert preferences"
        onBack={() => router.back()}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 60 }}
        className="px-5 pt-2"
      >
        <Text
          style={{ fontFamily: "PlusJakartaSans-Bold" }}
          className="text-xs text-dark-muted uppercase tracking-wider mb-3 ml-1"
        >
          Push Notifications
        </Text>

        <View className="bg-white rounded-3xl border border-border-light shadow-sm mb-6 overflow-hidden">
          {/* Expiry Alerts from Penpot */}
          <View className="flex-row items-center justify-between p-4 border-b border-border-light/60">
            <View className="flex-row items-start flex-1 mr-3">
              <View className="w-10 h-10 rounded-xl bg-alert-bg items-center justify-center mr-3 mt-0.5 border border-alert/20">
                <Clock size={18} color="#FF4343" />
              </View>
              <View className="flex-1">
                <Text
                  style={{ fontFamily: "PlusJakartaSans-Bold" }}
                  className="text-sm text-dark mb-0.5"
                >
                  Tell me 30 days before any points expire.
                </Text>
                <Text
                  style={{ fontFamily: "PlusJakartaSans-Regular" }}
                  className="text-xs text-dark-muted leading-relaxed"
                >
                  You'll never miss expiring points again.
                </Text>
              </View>
            </View>

            <Switch
              value={expiryNotif}
              onValueChange={(value) =>
                void toggleSetting(
                  "expiryAlertsEnabled",
                  value,
                  setExpiryNotif,
                  expiryNotif
                )
              }
              trackColor={{ false: "#E6E6E8", true: "#02EFF4" }}
              thumbColor={expiryNotif ? "#070617" : "#FFFFFF"}
            />
          </View>

          {/* Earning Updates from Penpot */}
          <View className="flex-row items-center justify-between p-4 border-b border-border-light/60">
            <View className="flex-row items-start flex-1 mr-3">
              <View className="w-10 h-10 rounded-xl bg-ice items-center justify-center mr-3 mt-0.5 border border-border-blue">
                <TrendingUp size={18} color="#01A2FB" />
              </View>
              <View className="flex-1">
                <Text
                  style={{ fontFamily: "PlusJakartaSans-Bold" }}
                  className="text-sm text-dark mb-0.5"
                >
                  Tell me when a program credits new points.
                </Text>
                <Text
                  style={{ fontFamily: "PlusJakartaSans-Regular" }}
                  className="text-xs text-dark-muted leading-relaxed"
                >
                  Get notified as soon as your points increase.
                </Text>
              </View>
            </View>

            <Switch
              value={earningNotif}
              onValueChange={(value) =>
                void toggleSetting(
                  "earningAlertsEnabled",
                  value,
                  setEarningNotif,
                  earningNotif
                )
              }
              trackColor={{ false: "#E6E6E8", true: "#02EFF4" }}
              thumbColor={earningNotif ? "#070617" : "#FFFFFF"}
            />
          </View>

          {/* Deals and offers from Penpot */}
          <View className="flex-row items-center justify-between p-4">
            <View className="flex-row items-start flex-1 mr-3">
              <View className="w-10 h-10 rounded-xl bg-ice items-center justify-center mr-3 mt-0.5 border border-border-blue">
                <Gift size={18} color="#9C4EBD" />
              </View>
              <View className="flex-1">
                <Text
                  style={{ fontFamily: "PlusJakartaSans-Bold" }}
                  className="text-sm text-dark mb-0.5"
                >
                  An exclusive Deals & offer just for you
                </Text>
                <Text
                  style={{ fontFamily: "PlusJakartaSans-Regular" }}
                  className="text-xs text-dark-muted leading-relaxed"
                >
                  We'll send only the best offers, not spam.
                </Text>
              </View>
            </View>

            <Switch
              value={dealsNotif}
              onValueChange={(value) =>
                void toggleSetting(
                  "offerAlertsEnabled",
                  value,
                  setDealsNotif,
                  dealsNotif
                )
              }
              trackColor={{ false: "#E6E6E8", true: "#02EFF4" }}
              thumbColor={dealsNotif ? "#070617" : "#FFFFFF"}
            />
          </View>
        </View>

        {/* Sync Settings */}
        <Text
          style={{ fontFamily: "PlusJakartaSans-Bold" }}
          className="text-xs text-dark-muted uppercase tracking-wider mb-3 ml-1"
        >
          Background Sync
        </Text>

        <View className="bg-white rounded-3xl border border-border-light shadow-sm p-4 flex-row items-center justify-between">
          <View className="flex-row items-start flex-1 mr-3">
            <View className="w-10 h-10 rounded-xl bg-gray-50 items-center justify-center mr-3 mt-0.5 border border-border-light">
              <RefreshCw size={18} color="#070617" />
            </View>
            <View className="flex-1">
              <Text
                style={{ fontFamily: "PlusJakartaSans-Bold" }}
                className="text-sm text-dark mb-0.5"
              >
                Auto-sync balances
              </Text>
              <Text
                style={{ fontFamily: "PlusJakartaSans-Regular" }}
                className="text-xs text-dark-muted leading-relaxed"
              >
                Automatically check for updated balances in the background.
              </Text>
            </View>
          </View>

          <Switch
            value={autoSync}
            onValueChange={(value) => void saveAutoSync(value)}
            trackColor={{ false: "#E6E6E8", true: "#02EFF4" }}
            thumbColor={autoSync ? "#070617" : "#FFFFFF"}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
