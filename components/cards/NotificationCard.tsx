// components/cards/NotificationCard.tsx
import React, { memo } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Gift, AlertTriangle, ArrowDownLeft } from "lucide-react-native";
import { NotificationItem } from "../../types/models";

/** Stable point-count formatter (module scope: never allocate in render). */
function formatPointsDelta(pointsDelta: number): string {
  if (pointsDelta === 0) return "0 points";
  const formatted = Math.abs(pointsDelta).toLocaleString();
  return pointsDelta > 0 ? `+${formatted} points` : `-${formatted} points`;
}

interface NotificationCardProps {
  notification: NotificationItem;
  onPress?: () => void;
}

/** Pure, module-scope icon/colour config (no allocation per render). */
function notificationIconConfig(type: NotificationItem["type"]) {
  switch (type) {
    case "credit":
      return {
        icon: <ArrowDownLeft size={18} color="#01A2FB" />,
        bgColor: "#E6F6FF",
        deltaColor: "text-primary-dark",
      };
    case "expiry":
      return {
        icon: <AlertTriangle size={18} color="#FF4343" />,
        bgColor: "#FFF6F6",
        deltaColor: "text-alert",
      };
    case "offer":
      return {
        icon: <Gift size={18} color="#9C4EBD" />,
        bgColor: "#FDF4FF",
        deltaColor: "text-violet",
      };
    default:
      return {
        icon: <Gift size={18} color="#9C4EBD" />,
        bgColor: "#FDF4FF",
        deltaColor: "text-violet",
      };
  }
}

// Memoized: rendered inside unbounded notification groups (guardrails §2).
export const NotificationCard: React.FC<NotificationCardProps> = memo(({
  notification,
  onPress,
}) => {
  const config = notificationIconConfig(notification.type);

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      className={`w-full p-4 rounded-2xl border mb-3 flex-row items-start ${
        notification.isRead
          ? "bg-white border-border-light"
          : "bg-white border-primary/40 shadow-sm"
      }`}
    >
      <View
        style={{ backgroundColor: config.bgColor }}
        className="w-10 h-10 rounded-xl items-center justify-center mr-3 mt-0.5"
      >
        {config.icon}
      </View>

      <View className="flex-1 mr-2">
        <View className="flex-row items-center justify-between mb-1">
          <Text
            style={{ fontFamily: "PlusJakartaSans-Bold" }}
            className="text-sm text-dark flex-1 mr-2"
          >
            {notification.title}
          </Text>
          <Text
            style={{ fontFamily: "PlusJakartaSans-Regular" }}
            className="text-[11px] text-muted"
          >
            {notification.timestamp}
          </Text>
        </View>

        <Text
          style={{ fontFamily: "PlusJakartaSans-Regular" }}
          className="text-xs text-dark-muted leading-relaxed"
        >
          {notification.description}
        </Text>

        {notification.pointsDelta != null && notification.pointsDelta !== 0 && (
          <View className="mt-2 flex-row items-center">
            <Text
              style={{ fontFamily: "PlusJakartaSans-Bold" }}
              className={`text-xs ${config.deltaColor}`}
            >
              {formatPointsDelta(notification.pointsDelta)}
            </Text>
          </View>
        )}
      </View>

      {!notification.isRead && (
        <View className="w-2 h-2 rounded-full bg-primary mt-1" />
      )}
    </TouchableOpacity>
  );
});

NotificationCard.displayName = "NotificationCard";
