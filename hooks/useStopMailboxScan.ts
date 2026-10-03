import { useState, useCallback } from "react";
import { Alert, Platform } from "react-native";
import * as Haptics from "expo-haptics";
import { usePointsStore } from "../store/pointsStore";

/**
 * Shared hook encapsulating mailbox scan cancellation logic, confirmation prompts,
 * haptic feedback, and stopping state across screens (Home, EmailSync, Diagnostics).
 */
export function useStopMailboxScan() {
  const [isStoppingScan, setIsStoppingScan] = useState(false);

  const isSyncing = usePointsStore((state) => state.isSyncing);
  const isBackfillRunning = usePointsStore((state) => state.isBackfillRunning);
  const activeJobDetails = usePointsStore((state) => state.activeJobDetails);
  const cancelSyncJob = usePointsStore((state) => state.cancelSyncJob);

  const canStop = Boolean(isSyncing || isBackfillRunning || activeJobDetails?.id);

  const handleStopScan = useCallback(async () => {
    if (!isSyncing && !isBackfillRunning && !activeJobDetails?.id) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const performStop = async () => {
      try {
        setIsStoppingScan(true);
        const success = await cancelSyncJob(activeJobDetails?.id);
        if (success) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } else {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        }
      } catch {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      } finally {
        setIsStoppingScan(false);
      }
    };

    if (Platform.OS === "web") {
      if (
        typeof window !== "undefined" &&
        window.confirm(
          "Stop Mailbox Scan?\n\nAny points and programs discovered so far will stay saved in your portfolio. You can resume scanning anytime."
        )
      ) {
        performStop();
      }
    } else {
      Alert.alert(
        "Stop Mailbox Scan?",
        "Any points and programs discovered so far will stay saved in your portfolio. You can resume scanning anytime.",
        [
          { text: "Keep Scanning", style: "cancel" },
          {
            text: "Stop Scan",
            style: "destructive",
            onPress: performStop,
          },
        ]
      );
    }
  }, [cancelSyncJob, activeJobDetails?.id, isSyncing, isBackfillRunning]);

  return {
    isStoppingScan,
    handleStopScan,
    canStop,
  };
}
