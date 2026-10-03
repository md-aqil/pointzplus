// app/email-sync.tsx – Google Gmail OAuth Auto-Sync Screen
import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  Linking,
  AppState,
  Alert,
  Platform,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  ArrowLeft,
  Mail,
  ShieldCheck,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Lock,
  Zap,
  MailX,
  ChevronRight,
  Sparkles,
} from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { usePoints } from "../hooks/usePoints";
import { usePointsStore } from "../store/pointsStore";
import { useAuth } from "../hooks/useAuth";
import { apiClient } from "../lib/apiClient";
import { logger } from "../lib/logger";
import { MailboxCard } from "../components/ui/MailboxCard";
import { AuthRequiredView } from "../components/ui/AuthRequiredView";

export default function EmailSyncScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ connected?: string }>();
  const { user, isAuthenticated } = useAuth();
  const {
    emailAccounts,
    syncEmail,
    isSyncing,
    syncProgress,
    disconnectEmail,
    isBackfillRunning,
    activeJobDetails,
    checkActiveSyncStatus,
  } = usePoints();
  const fetchAccountsFromBackend = usePointsStore((s) => s.fetchAccountsFromBackend);
  const lastSyncRejectedEmails = usePointsStore((s) => s.lastSyncRejectedEmails);
  const [syncSuccessModal, setSyncSuccessModal] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [syncedCount, setSyncedCount] = useState(0);
  const [isConnecting, setIsConnecting] = useState(false);
  const autoScannedAccountsRef = useRef<Set<string>>(new Set());
  const lastDetectionsCountRef = useRef(0);

  // Check background scan job status on mount & adaptively poll while active
  useEffect(() => {
    if (!isAuthenticated) return;
    checkActiveSyncStatus();

    if (!isBackfillRunning && !isSyncing) return;

    const interval = setInterval(() => {
      checkActiveSyncStatus();
    }, 4000);
    return () => clearInterval(interval);
  }, [isAuthenticated, isBackfillRunning, isSyncing, checkActiveSyncStatus]);

  if (!isAuthenticated) {
    return (
      <AuthRequiredView
        title="Email Auto-Sync"
        subtitle="Sign in to connect your Gmail mailbox and automatically scan loyalty statements."
        showBack={true}
      />
    );
  }

  // Trigger micro-haptics when new loyalty programs are discovered in real time
  useEffect(() => {
    const currentCount = syncProgress.liveDetections?.length || 0;
    if (currentCount > lastDetectionsCountRef.current) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      lastDetectionsCountRef.current = currentCount;
    }
    if (!isSyncing) {
      lastDetectionsCountRef.current = 0;
    }
  }, [syncProgress.liveDetections, isSyncing]);

  // A user may link several mailboxes, so the UI works with a list.
  const gmailAccounts = emailAccounts.filter(
    (e) => e.provider === "gmail" && e.status === "connected"
  );
  const gmailAccount = gmailAccounts[0] ?? null;

  // Refresh connected accounts on mount and when app returns to foreground
  useEffect(() => {
    fetchAccountsFromBackend();

    const sub = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active") {
        fetchAccountsFromBackend();
      }
    });
    return () => sub.remove();
  }, [fetchAccountsFromBackend]);

  // Automatically start scan on newly connected mailboxes that haven't been scanned yet
  useEffect(() => {
    if (isSyncing || gmailAccounts.length === 0) return;

    for (const account of gmailAccounts) {
      if (!account.lastSyncAt && !autoScannedAccountsRef.current.has(account.id)) {
        autoScannedAccountsRef.current.add(account.id);
        logger.log("[EmailSync] Auto-starting scan for newly connected mailbox:", account.email);
        handleStartSync(account.email);
        break;
      }
    }
  }, [gmailAccounts, isSyncing]);

  const handleConnectGmail = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsConnecting(true);
    setSyncError(null);
    try {
      const res = await apiClient.getEmailAuthUrl("google");
      if (res?.url) {
        await Linking.openURL(res.url);
      } else {
        const msg = "Google OAuth credentials must be set in server/.env (GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET).";
        setSyncError(msg);
        Alert.alert("OAuth Configuration Required", msg);
      }
    } catch (err: any) {
      const msg = err?.message || "Could not retrieve Google Sign-In URL. Please verify server connectivity.";
      setSyncError(msg);
      Alert.alert("Connection Error", msg);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleStartSync = async (email: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSyncError(null);
    logger.log("[EmailSync] Starting Gmail scan for:", email);
    try {
      const results = await syncEmail("gmail", email);
      logger.log("[EmailSync] Scan finished successfully with results count:", results.length);
      setSyncedCount(results.length);
      setSyncSuccessModal(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e: any) {
      logger.error("[EmailSync] Scan failed:", e);
      const errMsg = e?.message || "Failed to extract data from Gmail. Please reconnect your account and try again.";
      setSyncError(errMsg);
    }
  };

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-light-bg">
      {/* Header */}
      <View className="px-5 py-3 flex-row items-center justify-between border-b border-border-light bg-white">
        <TouchableOpacity
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace("/(tabs)/home");
            }
          }}
          className="w-10 h-10 rounded-full bg-light-bg items-center justify-center"
        >
          <ArrowLeft size={20} color="#070617" />
        </TouchableOpacity>

        <Text
          style={{ fontFamily: "PlusJakartaSans-Bold" }}
          className="text-lg text-dark"
        >
          Gmail Auto-Sync
        </Text>

        <View className="w-10" />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 60 }}
        className="px-5 pt-4"
      >
        {/* Subtle, Low-Profile Info Bar */}
        <View className="bg-sky-50/60 border border-sky-100 rounded-2xl p-3.5 mb-4 flex-row items-center justify-between">
          <View className="flex-row items-center flex-1 mr-2">
            <View className="w-8 h-8 rounded-xl bg-[#00A3FF]/10 items-center justify-center mr-2.5">
              <Zap size={15} color="#00A3FF" />
            </View>
            <View className="flex-1">
              <Text
                style={{ fontFamily: "PlusJakartaSans-Bold" }}
                className="text-[12px] text-slate-800"
              >
                Auto-Statement Detection
              </Text>
              <Text
                style={{ fontFamily: "PlusJakartaSans-Regular" }}
                className="text-[11px] text-slate-500 leading-4"
              >
                Scans official reward e-statements via secure read-only access.
              </Text>
            </View>
          </View>
          <View className="flex-row items-center bg-white px-2 py-1 rounded-lg border border-slate-200/60 shadow-2xs">
            <Lock size={11} color="#059669" />
            <Text
              style={{ fontFamily: "PlusJakartaSans-Bold" }}
              className="text-[10px] text-emerald-700 ml-1"
            >
              Secure
            </Text>
          </View>
        </View>

        {/* Live Dopamine Sync & Discovery Stream */}
        {isSyncing && (
          <View className="bg-white rounded-3xl p-5 mb-5 border-2 border-[#00A3FF]/30 shadow-md">
            {/* Header: Status & Live Percentage */}
            <View className="flex-row items-center justify-between mb-3">
              <View className="flex-row items-center">
                <ActivityIndicator size="small" color="#00A3FF" className="mr-2" />
                <Text
                  style={{ fontFamily: "PlusJakartaSans-Bold" }}
                  className="text-sm text-slate-900"
                >
                  Scanning Statements...
                </Text>
              </View>
              <View className="bg-sky-50 px-2.5 py-1 rounded-full border border-sky-200">
                <Text
                  style={{ fontFamily: "PlusJakartaSans-Bold" }}
                  className="text-xs text-[#00A3FF]"
                >
                  {syncProgress.percent}%
                </Text>
              </View>
            </View>

            {/* Progress Bar */}
            <View className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden mb-2.5">
              <View
                style={{ width: `${Math.max(5, syncProgress.percent)}%` }}
                className="bg-[#00A3FF] h-full rounded-full"
              />
            </View>

            <Text
              style={{ fontFamily: "PlusJakartaSans-Medium" }}
              className="text-xs text-slate-500 mb-3.5"
            >
              {syncProgress.step}
            </Text>

            {/* Live Rolling Total Points Counter */}
            {(syncProgress.totalPointsDiscovered ?? 0) > 0 && (
              <View className="bg-[#00A3FF] rounded-2xl p-3.5 mb-3 flex-row items-center justify-between shadow-sm">
                <View className="flex-row items-center">
                  <Text className="text-xl mr-2.5">✨</Text>
                  <View>
                    <Text
                      style={{ fontFamily: "PlusJakartaSans-Medium" }}
                      className="text-[11px] text-white/80 uppercase tracking-wider"
                    >
                      Found So Far
                    </Text>
                    <Text
                      style={{ fontFamily: "PlusJakartaSans-Bold" }}
                      className="text-lg text-white"
                    >
                      +{(syncProgress.totalPointsDiscovered ?? 0).toLocaleString()} points
                    </Text>
                  </View>
                </View>
                <View className="bg-white/20 px-2.5 py-1 rounded-full border border-white/30">
                  <Text
                    style={{ fontFamily: "PlusJakartaSans-Bold" }}
                    className="text-[11px] text-white"
                  >
                    {syncProgress.liveDetections?.length ?? 0} programs
                  </Text>
                </View>
              </View>
            )}

            {/* Live Discovery Feed */}
            {syncProgress.liveDetections && syncProgress.liveDetections.length > 0 && (
              <View className="mt-1">
                <Text
                  style={{ fontFamily: "PlusJakartaSans-Bold" }}
                  className="text-[11px] text-slate-400 uppercase tracking-wider mb-2 ml-1"
                >
                  Live Discovery Stream
                </Text>
                {syncProgress.liveDetections.slice(-5).reverse().map((item, idx) => (
                  <View
                    key={`${item.programName}-${idx}`}
                    className="bg-white border border-slate-100 rounded-[22px] px-4 py-3 flex-row items-center justify-between mb-2.5"
                  >
                    <View className="flex-row items-center flex-1 mr-2">
                      <View className="w-11 h-11 rounded-full bg-slate-50 items-center justify-center mr-3 border border-slate-100">
                        <Text className="text-lg">
                          {item.category === "airlines"
                            ? "✈️"
                            : item.category === "banking"
                            ? "💳"
                            : item.category === "hotels"
                            ? "🏨"
                            : "🛍️"}
                        </Text>
                      </View>
                      <View className="flex-1">
                        <Text
                          style={{ fontFamily: "PlusJakartaSans-Bold" }}
                          className="text-[14.5px] text-slate-900"
                          numberOfLines={1}
                        >
                          {item.programName}
                        </Text>
                        <Text
                          style={{ fontFamily: "PlusJakartaSans-Regular" }}
                          className="text-[11.5px] text-slate-400 mt-0.5"
                        >
                          {item.accountNumber || "MEMBER-***"} · Discovered
                        </Text>
                      </View>
                    </View>
                    <View className="bg-[#E8FAF3] border border-[#D1F7E5] px-3.5 py-1.5 rounded-full items-center justify-center">
                      <Text
                        style={{ fontFamily: "PlusJakartaSans-Bold" }}
                        className="text-[13.5px] text-[#00A86B]"
                      >
                        +{Number(item.balance).toLocaleString()}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {/* Background Deep Backfill Progress Banner */}
        {isBackfillRunning && !isSyncing && (
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push("/sync-rejected");
            }}
            className="bg-white rounded-3xl p-4 mb-5 border border-sky-200 shadow-sm"
          >
            <View className="flex-row items-center justify-between mb-2">
              <View className="flex-row items-center flex-1 mr-2">
                <ActivityIndicator size="small" color="#00A3FF" className="mr-2.5" />
                <View className="flex-1">
                  <Text
                    style={{ fontFamily: "PlusJakartaSans-Bold" }}
                    className="text-xs text-slate-900"
                  >
                    Deep Mailbox Scan in Background
                  </Text>
                  <Text
                    style={{ fontFamily: "PlusJakartaSans-Regular" }}
                    className="text-[11px] text-slate-500 mt-0.5"
                  >
                    {activeJobDetails?.messages_processed !== null && activeJobDetails?.messages_processed !== undefined
                      ? `Evaluated ${activeJobDetails.messages_processed} of ${activeJobDetails.total_messages_found || "..."} statements`
                      : "AI is analyzing historical statements..."}
                  </Text>
                </View>
              </View>
              <View className="bg-sky-50 border border-sky-200 px-2.5 py-1 rounded-full">
                <Text
                  style={{ fontFamily: "PlusJakartaSans-Bold" }}
                  className="text-[10px] text-[#00A3FF]"
                >
                  LIVE SCAN
                </Text>
              </View>
            </View>

            {activeJobDetails?.total_messages_found && activeJobDetails.total_messages_found > 0 ? (
              <View className="w-full bg-slate-100 h-2 rounded-full overflow-hidden mt-1">
                <View
                  style={{
                    width: `${Math.min(
                      100,
                      Math.max(
                        8,
                        Math.round(
                          ((activeJobDetails.messages_processed || 0) /
                            activeJobDetails.total_messages_found) *
                            100
                        )
                      )
                    )}%`,
                  }}
                  className="bg-[#00A3FF] h-full rounded-full"
                />
              </View>
            ) : null}
          </TouchableOpacity>
        )}

        {/* Connected Mailboxes — a user may link several (personal + work). */}
        <Text
          style={{ fontFamily: "PlusJakartaSans-Bold" }}
          className="text-sm text-dark uppercase tracking-wider mb-3 ml-1"
        >
          Mailboxes
          {gmailAccounts.length > 0 ? ` (${gmailAccounts.length})` : ""}
        </Text>

        {gmailAccounts.map((account) => (
          <MailboxCard
            key={account.id}
            email={account.email}
            programsFound={account.programsFound}
            lastSyncAt={account.lastSyncAt}
            busy={isSyncing || isConnecting}
            onScan={() => handleStartSync(account.email)}
            onRemove={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              const doDisconnect = async () => {
                await disconnectEmail(account.id);
                await fetchAccountsFromBackend();
              };

              if (Platform.OS === "web") {
                if (
                  typeof window !== "undefined" &&
                  window.confirm(
                    `Disconnect mailbox?\n${account.email} will be removed. Points already tracked are kept.`
                  )
                ) {
                  doDisconnect();
                }
                return;
              }

              Alert.alert(
                "Disconnect mailbox?",
                `${account.email} will be removed. Points already tracked are kept.`,
                [
                  { text: "Cancel", style: "cancel" },
                  {
                    text: "Disconnect",
                    style: "destructive",
                    onPress: doDisconnect,
                  },
                ]
              );
            }}
          />
        ))}

        <View className="bg-white rounded-2xl p-5 mb-5 border border-border-light shadow-sm">
          <View className="flex-row items-center justify-between mb-4">
            <View className="flex-row items-center">
              <View className="w-12 h-12 rounded-2xl bg-red-50 items-center justify-center mr-3 border border-red-100">
                <Text className="text-2xl">✉️</Text>
              </View>
              <View>
                <Text
                  style={{ fontFamily: "PlusJakartaSans-Bold" }}
                  className="text-base text-dark"
                >
                  {gmailAccounts.length > 0 ? "Add another mailbox" : "Google Gmail"}
                </Text>
                <Text
                  style={{ fontFamily: "PlusJakartaSans-Regular" }}
                  className="text-xs text-dark-muted"
                >
                  {gmailAccounts.length > 0
                    ? "Link a second inbox (e.g. work)"
                    : "Connect your primary Gmail inbox"}
                </Text>
              </View>
            </View>

            {gmailAccounts.length === 0 && (
              <View className="bg-gray-100 px-2.5 py-1 rounded-full">
                <Text
                  style={{ fontFamily: "PlusJakartaSans-Medium" }}
                  className="text-[10px] text-dark-muted"
                >
                  Ready
                </Text>
              </View>
            )}
          </View>

          <TouchableOpacity
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              handleConnectGmail();
            }}
            disabled={isSyncing || isConnecting}
            className="w-full bg-[#00A3FF] py-3.5 rounded-2xl items-center flex-row justify-center shadow-sm"
          >
            {isSyncing || isConnecting ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Mail size={16} color="#FFFFFF" className="mr-2" />
                <Text
                  style={{ fontFamily: "PlusJakartaSans-Bold" }}
                  className="text-white text-sm font-bold"
                >
                  {gmailAccounts.length > 0 ? "Connect Another Account" : "Connect Google Account"}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Skipped & Rejected Emails & Parsed Inspector */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push("/sync-rejected");
          }}
          className="bg-white rounded-2xl p-4 mb-4 border border-border-light flex-row items-center justify-between shadow-sm"
        >
          <View className="flex-row items-center flex-1 mr-2">
            <View className="w-10 h-10 rounded-xl bg-sky-50 border border-sky-100 items-center justify-center mr-3">
              <Sparkles size={18} color="#00A3FF" />
            </View>
            <View className="flex-1">
              <View className="flex-row items-center">
                <Text
                  style={{ fontFamily: "PlusJakartaSans-Bold" }}
                  className="text-xs text-dark"
                >
                  Email Diagnostics & Statements
                </Text>
                {(lastSyncRejectedEmails.length > 0 || (syncProgress.rejectedEmails?.length ?? 0) > 0) && (
                  <View className="ml-2 px-1.5 py-0.5 bg-amber-100 rounded-full">
                    <Text
                      style={{ fontFamily: "PlusJakartaSans-Bold" }}
                      className="text-[10px] text-amber-800"
                    >
                      {syncProgress.rejectedEmails?.length ?? lastSyncRejectedEmails.length}
                    </Text>
                  </View>
                )}
              </View>
              <Text
                style={{ fontFamily: "PlusJakartaSans-Regular" }}
                className="text-[11px] text-dark-muted mt-0.5"
              >
                Inspect parsed loyalty statements & skipped emails
              </Text>
            </View>
          </View>
          <ChevronRight size={18} color="#9C9BA2" />
        </TouchableOpacity>

        {/* Security / Privacy details */}
        <View className="bg-white rounded-2xl p-4 border border-border-light">
          <View className="flex-row items-center mb-2">
            <ShieldCheck size={18} color="#059669" className="mr-2" />
            <Text
              style={{ fontFamily: "PlusJakartaSans-Bold" }}
              className="text-sm text-dark ml-2"
            >
              How PointzPlus Protects Your Privacy
            </Text>
          </View>

          <Text
            style={{ fontFamily: "PlusJakartaSans-Regular" }}
            className="text-xs text-dark-muted leading-5 mb-1"
          >
            • PointzPlus uses Google OAuth with restricted read-only permissions.
            {"\n"}• Filtered exclusively for verified statement senders (e.g. airlines, hotels, banks).
            {"\n"}• Manual entries and unverified sources are completely omitted.
            {"\n"}• All extracted data is stored securely and processed locally.
          </Text>
        </View>
      </ScrollView>

      {/* Success Modal */}
      <Modal visible={syncSuccessModal} transparent animationType="fade">
        <View className="flex-1 bg-black/60 items-center justify-center px-6">
          <View className="bg-white w-full max-w-sm rounded-3xl p-6 items-center shadow-xl">
            <View className="w-16 h-16 rounded-full bg-emerald-100 items-center justify-center mb-4">
              <CheckCircle2 size={36} color="#059669" />
            </View>

            <Text
              style={{ fontFamily: "PlusJakartaSans-Bold" }}
              className="text-xl text-dark mb-1 text-center"
            >
              Gmail Sync Complete!
            </Text>

            <Text
              style={{ fontFamily: "PlusJakartaSans-Regular" }}
              className="text-xs text-dark-muted text-center mb-5"
            >
              Successfully scanned your Gmail statements and updated {syncedCount} loyalty programs.
            </Text>

            <TouchableOpacity
              onPress={() => {
                setSyncSuccessModal(false);
                router.replace("/(tabs)/home");
              }}
              className="w-full bg-[#00A3FF] py-3.5 rounded-2xl items-center shadow-sm"
            >
              <Text
                style={{ fontFamily: "PlusJakartaSans-Bold" }}
                className="text-white text-sm font-bold"
              >
                View Updated Dashboard
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                setSyncSuccessModal(false);
                router.push("/sync-rejected");
              }}
              className="w-full bg-slate-100 py-3 rounded-2xl items-center mt-2.5"
            >
              <Text
                style={{ fontFamily: "PlusJakartaSans-Bold" }}
                className="text-slate-700 text-xs"
              >
                Inspect Skipped Emails ({(lastSyncRejectedEmails.length || syncProgress.rejectedEmails?.length || 0)})
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Error Modal */}
      <Modal visible={Boolean(syncError)} transparent animationType="fade">
        <View className="flex-1 bg-black/60 items-center justify-center px-6">
          <View className="bg-white w-full max-w-sm rounded-3xl p-6 items-center shadow-xl">
            <View className="w-16 h-16 rounded-full bg-red-100 items-center justify-center mb-4">
              <AlertCircle size={36} color="#EF4444" />
            </View>

            <Text
              style={{ fontFamily: "PlusJakartaSans-Bold" }}
              className="text-xl text-dark mb-2 text-center"
            >
              Gmail Sync Failed
            </Text>

            <Text
              style={{ fontFamily: "PlusJakartaSans-Regular" }}
              className="text-xs text-slate-600 text-center mb-4 leading-5"
            >
              {syncError}
            </Text>

            {syncError?.toLowerCase().includes("permission") && (
              <View className="bg-sky-50 border border-sky-200 rounded-2xl p-3.5 mb-5 w-full">
                <Text
                  style={{ fontFamily: "PlusJakartaSans-Bold" }}
                  className="text-xs text-sky-900 mb-1"
                >
                  💡 How to resolve:
                </Text>
                <Text
                  style={{ fontFamily: "PlusJakartaSans-Regular" }}
                  className="text-[11px] text-sky-800 leading-4"
                >
                  During Google Sign-In, make sure to <Text style={{ fontFamily: "PlusJakartaSans-Bold" }}>check the box</Text> for <Text style={{ fontStyle: "italic" }}>"View your email messages and settings"</Text> so PointzPlus can read statement emails.
                </Text>
              </View>
            )}

            <View className="flex-row w-full space-x-2.5">
              <TouchableOpacity
                onPress={() => setSyncError(null)}
                className="flex-1 bg-slate-100 py-3.5 rounded-2xl items-center mr-2"
              >
                <Text
                  style={{ fontFamily: "PlusJakartaSans-Bold" }}
                  className="text-slate-700 text-xs"
                >
                  Dismiss
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  setSyncError(null);
                  handleConnectGmail();
                }}
                className="flex-1 bg-[#00A3FF] py-3.5 rounded-2xl items-center"
              >
                <Text
                  style={{ fontFamily: "PlusJakartaSans-Bold" }}
                  className="text-white text-xs"
                >
                  Reconnect
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
