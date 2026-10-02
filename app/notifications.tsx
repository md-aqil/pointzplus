// app/notifications.tsx – All & Unread Notifications matching Penpot Design
import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Bell, CheckCheck } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { ScreenHeader } from "../components/ui/ScreenHeader";
import { NotificationCard } from "../components/cards/NotificationCard";
import { usePoints } from "../hooks/usePoints";

export default function NotificationsScreen() {
  const router = useRouter();
  const {
    notifications,
    fetchNotificationsFromBackend,
    acknowledgeNotification,
  } = usePoints();
  const [tab, setTab] = useState<"all" | "unread">("all");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    let active = true;
    fetchNotificationsFromBackend().finally(() => {
      if (active) setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [fetchNotificationsFromBackend]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchNotificationsFromBackend();
    setRefreshing(false);
  };

  const markAllRead = async () => {
    const unread = notifications.filter((notification) => !notification.isRead);
    await Promise.all(
      unread.map((notification) => acknowledgeNotification(notification.id))
    );
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const unreadCount = notifications.filter((notification) => !notification.isRead).length;
  const displayedNotifications =
    tab === "all" ? notifications : notifications.filter((notification) => !notification.isRead);
  const groups: Record<string, typeof notifications> = {};
  displayedNotifications.forEach((notification) => {
    if (!groups[notification.dateGroup]) groups[notification.dateGroup] = [];
    groups[notification.dateGroup].push(notification);
  });

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-light-bg">
      <ScreenHeader
        title="Notifications"
        fallbackRoute="/(tabs)/home"
        rightAction={
          unreadCount > 0 ? (
            <TouchableOpacity
              onPress={markAllRead}
              accessibilityLabel="Mark all notifications as read"
              className="p-1.5"
            >
              <CheckCheck size={18} color="#01A2FB" />
            </TouchableOpacity>
          ) : null
        }
      />

      {/* Tab Switcher: All vs Unread */}
      <View className="px-5 pt-2 pb-3">
        <View className="flex-row bg-white p-1 rounded-2xl border border-border-light">
          <TouchableOpacity
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setTab("all");
            }}
            className={`flex-1 py-2 rounded-xl items-center justify-center ${
              tab === "all" ? "bg-dark shadow-sm" : ""
            }`}
          >
            <Text
              style={{ fontFamily: "PlusJakartaSans-Bold" }}
              className={`text-xs ${tab === "all" ? "text-white" : "text-dark-muted"}`}
            >
              All Notifications
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setTab("unread");
            }}
            className={`flex-1 py-2 rounded-xl items-center justify-center flex-row ${
              tab === "unread" ? "bg-dark shadow-sm" : ""
            }`}
          >
            <Text
              style={{ fontFamily: "PlusJakartaSans-Bold" }}
              className={`text-xs ${tab === "unread" ? "text-white" : "text-dark-muted"}`}
            >
              Unread
            </Text>
            {unreadCount > 0 && (
              <View
                className={`ml-1.5 px-1.5 py-0.5 rounded-full ${
                  tab === "unread" ? "bg-primary" : "bg-primary/20"
                }`}
              >
                <Text
                  style={{ fontFamily: "PlusJakartaSans-Bold" }}
                  className="text-[10px] text-dark"
                >
                  {unreadCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 60 }}
        className="px-5 pt-1"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#02EFF4"
          />
        }
      >
        {loading ? (
          <ActivityIndicator size="small" color="#01A2FB" style={{ marginTop: 48 }} />
        ) : (
          <>
            {Object.keys(groups).map((groupTitle) => (
              <View key={groupTitle} className="mb-4">
                <Text
                  style={{ fontFamily: "PlusJakartaSans-Bold" }}
                  className="text-xs text-dark-muted uppercase tracking-wider mb-2.5 ml-1"
                >
                  {groupTitle}
                </Text>

                {groups[groupTitle].map((notification) => (
                  <NotificationCard
                    key={notification.id}
                    notification={notification}
                    onPress={
                      notification.isRead
                        ? undefined
                        : () => void acknowledgeNotification(notification.id)
                    }
                  />
                ))}
              </View>
            ))}

            {displayedNotifications.length === 0 && (
              <View className="bg-white p-8 rounded-3xl border border-border-light items-center justify-center my-8">
                <Bell size={32} color="#9C9BA2" className="mb-3" />
                <Text
                  style={{ fontFamily: "PlusJakartaSans-Bold" }}
                  className="text-sm text-dark mb-1"
                >
                  {tab === "unread" ? "No unread notifications" : "No notifications yet"}
                </Text>
                <Text
                  style={{ fontFamily: "PlusJakartaSans-Regular" }}
                  className="text-xs text-dark-muted text-center"
                >
                  {tab === "unread"
                    ? "You're completely caught up with your points alerts."
                    : "Your points alerts will appear here."}
                </Text>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
