// app/notifications.tsx – All & Unread Notifications matching Penpot Design
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Bell, CheckCheck } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { ScreenHeader } from "../components/ui/ScreenHeader";
import { NotificationCard } from "../components/cards/NotificationCard";
import { AuthRequiredView } from "../components/ui/AuthRequiredView";
import { usePoints } from "../hooks/usePoints";
import { useAuth } from "../hooks/useAuth";

export default function NotificationsScreen() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const {
    notifications,
    fetchNotificationsFromBackend,
    acknowledgeNotification,
    acknowledgeAllNotifications,
  } = usePoints();
  const [tab, setTab] = useState<"all" | "unread">("all");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) return;
    let active = true;
    fetchNotificationsFromBackend().finally(() => {
      if (active) setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [isAuthenticated, fetchNotificationsFromBackend]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchNotificationsFromBackend();
    setRefreshing(false);
  }, [fetchNotificationsFromBackend]);

  // Single batch round-trip (guardrails §2: no Promise.all N×acknowledge).
  const markAllRead = useCallback(async () => {
    const marked = await acknowledgeAllNotifications();
    if (marked > 0) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  }, [acknowledgeAllNotifications]);

  // Stable per-id press handlers so the memo'd NotificationCard isn't invalidated
  // by a fresh lambda on every parent render.
  const acknowledgeRef = useRef(acknowledgeNotification);
  acknowledgeRef.current = acknowledgeNotification;
  const pressHandlersRef = useRef(new Map<string, () => void>());

  // Evict removed notification IDs and clear the map on unmount to prevent memory leaks.
  useEffect(() => {
    const validIds = new Set(notifications.map((n) => n.id));
    for (const key of pressHandlersRef.current.keys()) {
      if (!validIds.has(key)) {
        pressHandlersRef.current.delete(key);
      }
    }
  }, [notifications]);

  useEffect(() => {
    return () => {
      pressHandlersRef.current.clear();
    };
  }, []);

  const getPressHandler = useCallback((id: string) => {
    let handler = pressHandlersRef.current.get(id);
    if (!handler) {
      handler = () => void acknowledgeRef.current(id);
      pressHandlersRef.current.set(id, handler);
    }
    return handler;
  }, []);

  const unreadCount = useMemo(
    () => notifications.filter((notification) => !notification.isRead).length,
    [notifications]
  );
  const displayedNotifications = useMemo(
    () =>
      tab === "all"
        ? notifications
        : notifications.filter((notification) => !notification.isRead),
    [notifications, tab]
  );
  const groups = useMemo(() => {
    const acc: Record<string, typeof notifications> = {};
    displayedNotifications.forEach((notification) => {
      if (!acc[notification.dateGroup]) acc[notification.dateGroup] = [];
      acc[notification.dateGroup].push(notification);
    });
    return acc;
  }, [displayedNotifications]);

  if (!isAuthenticated) {
    return (
      <AuthRequiredView
        title="Expiry & Sync Alerts"
        subtitle="Sign in to receive instant alerts when your loyalty points are close to expiring."
        showBack={true}
      />
    );
  }

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
                        : getPressHandler(notification.id)
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
